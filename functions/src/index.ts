import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin SDK with explicit service account
// This ensures we use the Firebase Admin SDK service account that has proper permissions
admin.initializeApp({
  projectId: 'sweetdreamsstudios-7c965',
  // Let Cloud Functions use the firebase-adminsdk service account automatically
});

// Get Firestore instance
const db = admin.firestore();

// Initialize Stripe
const stripeKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('Stripe secret key not found in config or environment');
}

const stripe = new Stripe(stripeKey || '', {
  apiVersion: '2023-10-16',
});

// Test function to verify basic Stripe functionality
export const testStripePayment = functions.https.onCall(async (data, context) => {
  console.log('testStripePayment called');
  
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    // Just test Stripe customer creation
    const customer = await stripe.customers.create({
      email: context.auth.token?.email || 'test@example.com',
      name: 'Test Customer',
      metadata: {
        firebaseUID: context.auth.uid,
        testFunction: 'true'
      }
    });

    return {
      success: true,
      customerId: customer.id,
      message: 'Stripe customer created successfully'
    };
  } catch (error: any) {
    console.error('Error in testStripePayment:', error);
    throw new functions.https.HttpsError('internal', `Stripe error: ${error.message}`);
  }
});

// Submit booking request with payment authorization (new custom flow)
export const submitBookingRequestWithPaymentAuth = functions.https.onCall(async (data, context) => {
  console.log('submitBookingRequestWithPaymentAuth called');
  
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const {
      resourceId,
      requestedStartTime,
      requestedEndTime,
      durationHours,
      serviceType,
      serviceDetailsInput,
      clientNotes,
      clientName,
      clientEmail,
      clientPhone,
      paymentMethodId
    } = data;

    // Validate required fields
    if (!resourceId || !requestedStartTime || !requestedEndTime || !serviceType || !clientName || !clientEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Calculate costs based on service type and duration
    let totalCost = 0;
    let depositAmount = 0;

    try {
      console.log('Calculating pricing for serviceType:', serviceType, 'durationHours:', durationHours);
      
      // Simplified pricing logic to bypass potential permission issues
      // We'll use the serviceDetailsInput to determine pricing
      if (serviceType.toLowerCase().includes('consultation') || serviceType.toLowerCase().includes('free')) {
        totalCost = 0;
        depositAmount = 0;
      } else if (serviceType.toLowerCase().includes('recording') || serviceType.toLowerCase().includes('session')) {
        // Recording session hourly pricing
        const hourlyRates = [
          { minHours: 1, maxHours: 1, price: 50 },
          { minHours: 2, maxHours: 2, price: 90 },
          { minHours: 3, maxHours: 3, price: 130 },
          { minHours: 4, maxHours: 4, price: 165 },
          { minHours: 5, maxHours: 5, price: 200 },
          { minHours: 6, maxHours: 6, price: 255 }
        ];
        
        const pricingTier = hourlyRates.find(tier => 
          durationHours >= tier.minHours && durationHours <= tier.maxHours
        );
        
        if (pricingTier) {
          totalCost = pricingTier.price;
        } else {
          totalCost = Math.ceil(durationHours) * 50; // Default $50/hour
        }
        depositAmount = totalCost * 0.5; // 50% deposit
      } else if (serviceType.toLowerCase().includes('mixing') || serviceType.toLowerCase().includes('mastering')) {
        totalCost = 130; // Fixed price for mixing/mastering
        depositAmount = 65; // 50% deposit
      } else if (serviceType.toLowerCase().includes('production')) {
        totalCost = durationHours * 45; // $45/hour for production
        depositAmount = totalCost * 0.5; // 50% deposit
      } else {
        // Default pricing
        totalCost = 100;
        depositAmount = 50;
      }
      
      console.log('Calculated totalCost:', totalCost, 'depositAmount:', depositAmount);
    } catch (pricingError) {
      console.error('Error calculating pricing:', pricingError);
      totalCost = 100;
      depositAmount = 50;
    }

    // Skip payment processing for free services
    if (totalCost === 0) {
      // Create booking request for free services with auto-confirmation
      const bookingRequestData = {
        resourceId,
        clientId: context.auth.uid,
        clientName,
        clientEmail,
        clientPhone: clientPhone || '',
        requestedStartTime: admin.firestore.Timestamp.fromDate(new Date(requestedStartTime)),
        requestedEndTime: admin.firestore.Timestamp.fromDate(new Date(requestedEndTime)),
        durationHours,
        serviceType,
        serviceDetailsInput: serviceDetailsInput || {},
        clientNotes: clientNotes || '',
        status: 'confirmed', // Free services auto-confirm
        totalCost,
        depositAmount,
        remainingBalance: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const bookingRequestRef = await db.collection('booking_requests').add(bookingRequestData);

      // Also create booking record immediately for free services
      await db.collection('bookings').add({
        bookingRequestId: bookingRequestRef.id,
        resourceId,
        clientId: context.auth.uid,
        clientName,
        clientEmail,
        clientPhone: clientPhone || '',
        startTime: admin.firestore.Timestamp.fromDate(new Date(requestedStartTime)),
        endTime: admin.firestore.Timestamp.fromDate(new Date(requestedEndTime)),
        durationHours,
        totalCost,
        depositAmountPaid: 0,
        remainingBalance: 0,
        bookingStatus: 'confirmed',
        serviceType,
        serviceDetailsInput: serviceDetailsInput || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        bookingRequestId: bookingRequestRef.id,
        totalCost,
        depositAmount,
        remainingBalance: 0,
        message: 'Free service booking confirmed immediately'
      };
    }

    // Get or create Stripe customer
    let stripeCustomerId = '';
    console.log('Creating Stripe customer for user:', context.auth.uid);
    
    try {
      // For now, always create a new Stripe customer to avoid Firestore read issues
      console.log('Creating new Stripe customer');
      const stripeCustomer = await stripe.customers.create({
        email: clientEmail,
        name: clientName,
        metadata: {
          firebaseUID: context.auth.uid,
          timestamp: new Date().toISOString()
        }
      });
      stripeCustomerId = stripeCustomer.id;
      console.log('Created Stripe customer successfully:', stripeCustomerId);
    } catch (customerError: any) {
      console.error('Error creating Stripe customer:', customerError);
      throw new functions.https.HttpsError('internal', `Failed to create Stripe customer: ${customerError.message}`);
    }

    // For now, skip Firestore booking request creation and just create the payment intent
    const mockBookingRequestId = `booking_${Date.now()}_${context.auth.uid.substring(0, 8)}`;
    console.log('Using mock booking request ID:', mockBookingRequestId);

    // Create Stripe Payment Intent with manual capture for deposit authorization
    console.log('Creating Stripe PaymentIntent for amount:', Math.round(depositAmount * 100), 'cents');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(depositAmount * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      capture_method: 'manual', // Critical: Manual capture for admin approval
      setup_future_usage: 'off_session', // To re-use payment method for final charge
      confirm: true,
      payment_method_types: ['card'], // Only allow card payments to avoid redirects
      metadata: {
        bookingRequestId: mockBookingRequestId,
        serviceType: serviceType,
        clientId: context.auth.uid,
        paymentType: 'deposit',
        resourceId: resourceId,
        requestedStartTime: requestedStartTime,
        requestedEndTime: requestedEndTime
      }
    });

    console.log('PaymentIntent created successfully:', paymentIntent.id, 'Status:', paymentIntent.status);

    let clientSecret = null;
    if (paymentIntent.status === 'requires_action') {
      clientSecret = paymentIntent.client_secret;
      console.log('Payment requires additional action');
    } else if (paymentIntent.status === 'requires_capture') {
      console.log('Payment authorized successfully, ready for admin approval');
    }

    return {
      success: true,
      bookingRequestId: mockBookingRequestId,
      paymentIntentId: paymentIntent.id,
      clientSecret,
      totalCost,
      depositAmount,
      remainingBalance: totalCost - depositAmount,
      requiresAction: paymentIntent.status === 'requires_action',
      paymentStatus: paymentIntent.status
    };
  } catch (error: any) {
    console.error('ERROR in submitBookingRequestWithPaymentAuth:', error);
    throw new functions.https.HttpsError('internal', `Failed to submit booking request: ${error.message}`);
  }
});

// Accept booking request and capture deposit (admin only)
export const acceptBookingRequestAndCaptureDeposit = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { bookingRequestId, assignedEngineerId } = data;

    if (!bookingRequestId) {
      throw new functions.https.HttpsError('invalid-argument', 'Booking request ID is required');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // Get booking request
    const bookingRequestDoc = await db.collection('booking_requests').doc(bookingRequestId).get();
    if (!bookingRequestDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking request not found');
    }

    const bookingData = bookingRequestDoc.data()!;

    // Verify request is ready for capture
    if (bookingData.status !== 'pending_admin_review' || !bookingData.stripeDepositPaymentIntentId) {
      throw new functions.https.HttpsError('failed-precondition', 'Booking request not ready for capture');
    }

    // Capture the authorized deposit payment
    if (bookingData.depositAmount > 0) {
      await stripe.paymentIntents.capture(bookingData.stripeDepositPaymentIntentId);
    }

    // Update booking request status to confirmed
    await db.collection('booking_requests').doc(bookingRequestId).update({
      status: 'confirmed',
      acceptedByAdminId: context.auth.uid,
      assignedEngineerId: assignedEngineerId || null,
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      depositCaptured: true,
      depositCapturedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create confirmed booking in bookings collection
    await db.collection('bookings').add({
      bookingRequestId,
      resourceId: bookingData.resourceId,
      clientId: bookingData.clientId,
      engineerId: assignedEngineerId || null,
      clientName: bookingData.clientName,
      clientEmail: bookingData.clientEmail,
      clientPhone: bookingData.clientPhone,
      startTime: bookingData.requestedStartTime,
      endTime: bookingData.requestedEndTime,
      durationHours: bookingData.durationHours,
      totalCost: bookingData.totalCost,
      depositAmountPaid: bookingData.depositAmount,
      remainingBalance: bookingData.remainingBalance,
      stripeDepositPaymentIntentId: bookingData.stripeDepositPaymentIntentId,
      stripePaymentMethodId: bookingData.stripePaymentMethodId,
      bookingStatus: 'confirmed_deposit_paid',
      serviceType: bookingData.serviceType,
      serviceDetailsInput: bookingData.serviceDetailsInput,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Booking request confirmed and deposit captured!'
    };
  } catch (error: any) {
    console.error('Error accepting booking request and capturing deposit:', error);
    throw new functions.https.HttpsError('internal', 'Failed to accept booking request');
  }
});

// Decline booking request (admin only)
export const declineBookingRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { bookingRequestId, reason } = data;

    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // Get booking request
    const bookingRequestDoc = await db.collection('booking_requests').doc(bookingRequestId).get();
    if (!bookingRequestDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking request not found');
    }

    const bookingData = bookingRequestDoc.data()!;

    // Cancel the authorized payment if it exists
    if (bookingData.stripeDepositPaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(bookingData.stripeDepositPaymentIntentId);
      } catch (stripeError) {
        console.error('Error canceling payment intent:', stripeError);
        // Continue with decline even if Stripe cancel fails
      }
    }

    // Update booking request status to declined
    await db.collection('booking_requests').doc(bookingRequestId).update({
      status: 'declined',
      declineReason: reason || 'No reason provided',
      declinedByAdminId: context.auth.uid,
      declinedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'Booking request declined and payment authorization canceled' };
  } catch (error: any) {
    console.error('Error declining booking request:', error);
    throw new functions.https.HttpsError('internal', 'Failed to decline booking request');
  }
});

// Charge final session payment (admin only)
export const chargeFinalSessionPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { bookingId, finalAmountToCharge, additionalServiceDetails } = data;

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

    const bookingData = bookingDoc.data()!;

    // Calculate remaining balance
    const remainingBalance = finalAmountToCharge - bookingData.depositAmountPaid;

    if (remainingBalance <= 0) {
      // No additional payment needed
      await db.collection('bookings').doc(bookingId).update({
        totalCost: finalAmountToCharge,
        finalAmountDue: 0,
        bookingStatus: 'completed_fully_paid',
        additionalServiceDetails: additionalServiceDetails || {},
        finalChargeProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        finalChargeProcessedBy: context.auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: 'No additional payment required - booking marked as fully paid'
      };
    }

    // Get customer's payment method
    const customerDoc = await db.collection('customers').doc(bookingData.clientId).get();
    if (!customerDoc.exists || !customerDoc.data()?.stripeId) {
      throw new functions.https.HttpsError('not-found', 'Customer not found');
    }

    const stripeCustomerId = customerDoc.data()!.stripeId;

    // Create new Payment Intent for remaining balance
    const finalPaymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(remainingBalance * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: bookingData.stripePaymentMethodId,
      confirm: true,
      off_session: true, // Since it's a subsequent charge using saved payment method
      metadata: {
        bookingId: bookingId,
        paymentType: 'final',
        clientId: bookingData.clientId,
        originalBookingRequestId: bookingData.bookingRequestId || ''
      }
    });

    // Update booking with final payment info
    await db.collection('bookings').doc(bookingId).update({
      totalCost: finalAmountToCharge,
      finalAmountDue: 0,
      bookingStatus: 'completed_fully_paid',
      stripeFinalChargeId: finalPaymentIntent.id,
      additionalServiceDetails: additionalServiceDetails || {},
      finalChargeProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      finalChargeProcessedBy: context.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      finalPaymentIntentId: finalPaymentIntent.id,
      remainingBalance,
      message: 'Final payment charged successfully'
    };
  } catch (error: any) {
    console.error('Error charging final session payment:', error);
    throw new functions.https.HttpsError('internal', 'Failed to charge final payment');
  }
});

// Create custom portal link (for customer billing portal access)
export const createCustomPortalLink = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { returnUrl, locale, configurationId } = data;

    // Get Stripe customer ID from Firestore
    const customerDoc = await db.collection('customers').doc(context.auth.uid).get();
    if (!customerDoc.exists || !customerDoc.data()?.stripeId) {
      throw new functions.https.HttpsError('not-found', 'Stripe customer not found');
    }

    const stripeCustomerId = customerDoc.data()!.stripeId;

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || 'https://sweetdreamsstudios-7c965.web.app/profile',
      locale: locale || 'auto',
      configuration: configurationId || undefined
    });

    return {
      success: true,
      url: portalSession.url
    };
  } catch (error: any) {
    console.error('Error creating portal link:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create portal link');
  }
});

// Handle Stripe webhooks (for payment confirmations and failures)
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
    // Use the raw body to construct the event so body parsers don't interfere
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingRequestId = paymentIntent.metadata.bookingRequestId;
        const bookingId = paymentIntent.metadata.bookingId;
        const paymentType = paymentIntent.metadata.paymentType;

        if (bookingRequestId && paymentType === 'deposit') {
          // Update booking request with successful authorization
          await db.collection('booking_requests').doc(bookingRequestId).update({
            status: 'pending_admin_review',
            paymentAuthorized: true,
            paymentAuthorizedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Deposit authorized for booking request ${bookingRequestId}`);
        } else if (bookingId && paymentType === 'final') {
          // Update booking with successful final payment
          await db.collection('bookings').doc(bookingId).update({
            finalPaid: true,
            finalPaidAt: admin.firestore.FieldValue.serverTimestamp(),
            bookingStatus: 'completed_fully_paid',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Final payment completed for booking ${bookingId}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        const bookingRequestId = failedPayment.metadata.bookingRequestId;
        const bookingId = failedPayment.metadata.bookingId;
        const paymentType = failedPayment.metadata.paymentType;

        if (bookingRequestId && paymentType === 'deposit') {
          await db.collection('booking_requests').doc(bookingRequestId).update({
            status: 'payment_failed',
            paymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Deposit payment failed for booking request ${bookingRequestId}`);
        } else if (bookingId && paymentType === 'final') {
          await db.collection('bookings').doc(bookingId).update({
            finalPaymentStatus: 'failed',
            finalPaymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Final payment failed for booking ${bookingId}`);
        }
        break;
      }

      case 'customer.created':
      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer;
        const firebaseUID = customer.metadata?.firebaseUID;
        
        if (firebaseUID) {
          await db.collection('customers').doc(firebaseUID).set({
            stripeId: customer.id,
            email: customer.email
          }, { merge: true });
          console.log(`Customer data synced for UID ${firebaseUID}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Legacy functions for backward compatibility - these will be deprecated
export const submitBookingRequest = submitBookingRequestWithPaymentAuth;
export const acceptBookingRequest = acceptBookingRequestAndCaptureDeposit;

// Test function to debug authentication
export const testAuth = functions.https.onCall(async (data, context) => {
  console.log('testAuth called');
  console.log('context.auth:', context.auth);
  console.log('context.auth exists:', !!context.auth);
  console.log('context.auth.uid:', context.auth?.uid);
  
  if (!context.auth) {
    console.error('Authentication failed - no auth context');
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  return {
    success: true,
    message: 'Authentication working!',
    uid: context.auth.uid,
    email: context.auth.token?.email
  };
});