import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe
const stripe = new Stripe(functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const db = admin.firestore();

// Create PaymentIntent for booking deposit or final payment
export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { amount, bookingId, currency = 'usd', paymentType = 'deposit', description, customerEmail } = data;

    if (!amount || !bookingId) {
      throw new functions.https.HttpsError('invalid-argument', 'Amount and bookingId are required');
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description: description || `Payment for booking ${bookingId}`,
      metadata: {
        bookingId,
        userId: context.auth.uid,
        paymentType,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update booking based on payment type
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (paymentType === 'deposit') {
      updateData.paymentIntentId = paymentIntent.id;
      updateData.status = 'pending_payment';
    } else if (paymentType === 'final') {
      updateData.finalPaymentIntentId = paymentIntent.id;
      updateData.finalPaymentStatus = 'pending';
      updateData.finalPaymentAmount = amount;
      
      // Send email notification to customer if email is provided
      if (customerEmail) {
        console.log(`Final payment invoice ready for ${customerEmail} - Payment Intent: ${paymentIntent.id}`);
        // Here you could integrate with an email service to send the payment link
      }
    }

    await db.collection('bookings').doc(bookingId).update(updateData);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create payment intent');
  }
});

// Capture deposit payment (admin only)
export const captureDeposit = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { bookingId } = data;

    if (!bookingId) {
      throw new functions.https.HttpsError('invalid-argument', 'Booking ID is required');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking not found');
    }

    const bookingData = bookingDoc.data();
    const paymentIntentId = bookingData?.paymentIntentId;

    if (!paymentIntentId) {
      throw new functions.https.HttpsError('failed-precondition', 'No payment intent found for booking');
    }

    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update booking status
      await db.collection('bookings').doc(bookingId).update({
        status: 'confirmed',
        depositCaptured: true,
        depositCapturedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: 'Deposit captured successfully' };
    } else {
      throw new functions.https.HttpsError('internal', 'Payment capture failed');
    }
  } catch (error) {
    console.error('Error capturing deposit:', error);
    throw new functions.https.HttpsError('internal', 'Failed to capture deposit');
  }
});

// Refund deposit payment (admin only)
export const refundDeposit = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { bookingId, reason = 'admin_cancellation' } = data;

    if (!bookingId) {
      throw new functions.https.HttpsError('invalid-argument', 'Booking ID is required');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking not found');
    }

    const bookingData = bookingDoc.data();
    const paymentIntentId = bookingData?.paymentIntentId;

    if (!paymentIntentId) {
      throw new functions.https.HttpsError('failed-precondition', 'No payment intent found for booking');
    }

    // Get the payment intent to find the charge
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent.latest_charge) {
      throw new functions.https.HttpsError('failed-precondition', 'No charge found for payment intent');
    }

    // Create refund
    const refund = await stripe.refunds.create({
      charge: paymentIntent.latest_charge as string,
      reason: 'requested_by_customer',
      metadata: {
        bookingId,
        reason,
        adminId: context.auth.uid,
      },
    });

    if (refund.status === 'succeeded') {
      // Update booking status
      await db.collection('bookings').doc(bookingId).update({
        status: 'cancelled',
        refunded: true,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        refundReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: 'Deposit refunded successfully' };
    } else {
      throw new functions.https.HttpsError('internal', 'Refund failed');
    }
  } catch (error) {
    console.error('Error refunding deposit:', error);
    throw new functions.https.HttpsError('internal', 'Failed to refund deposit');
  }
});

// Stripe webhook handler for automatic payment processing
export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const endpointSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    console.error('Stripe webhook secret not configured');
    res.status(400).send('Webhook secret not configured');
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.bookingId;
        const paymentType = paymentIntent.metadata.paymentType;

        if (bookingId) {
          const updateData: any = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (paymentType === 'deposit') {
            updateData.depositPaid = true;
            updateData.depositPaidAt = admin.firestore.FieldValue.serverTimestamp();
            updateData.status = 'pending_confirmation';
          } else if (paymentType === 'final') {
            updateData.finalPaid = true;
            updateData.finalPaidAt = admin.firestore.FieldValue.serverTimestamp();
            updateData.finalPaymentStatus = 'completed';
          }

          await db.collection('bookings').doc(bookingId).update(updateData);
          
          console.log(`Payment processed for booking ${bookingId}, type: ${paymentType}`);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        const failedBookingId = failedPayment.metadata.bookingId;
        const failedPaymentType = failedPayment.metadata.paymentType;

        if (failedBookingId) {
          const updateData: any = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (failedPaymentType === 'deposit') {
            updateData.status = 'payment_failed';
          } else if (failedPaymentType === 'final') {
            updateData.finalPaymentStatus = 'failed';
          }

          await db.collection('bookings').doc(failedBookingId).update(updateData);
          
          console.log(`Payment failed for booking ${failedBookingId}, type: ${failedPaymentType}`);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});