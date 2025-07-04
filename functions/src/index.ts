import { onCall } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin
admin.initializeApp();

// Define Stripe secret key parameter
const stripeSecretKey = defineString('STRIPE_SECRET_KEY');

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey.value(), {
  apiVersion: '2023-10-16',
});

const db = admin.firestore();

// Create PaymentIntent for booking deposit
export const createPaymentIntent = onCall(async (request) => {
  const { data, auth } = request;
  
  // Check if user is authenticated
  if (!auth) {
    throw new Error('User must be authenticated');
  }

  try {
    const { amount, bookingId, currency = 'usd' } = data;

    if (!amount || !bookingId) {
      throw new Error('Amount and bookingId are required');
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        bookingId,
        userId: auth.uid,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update booking with payment intent ID
    await db.collection('bookings').doc(bookingId).update({
      paymentIntentId: paymentIntent.id,
      status: 'pending_payment',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    throw new Error('Failed to create payment intent');
  }
});

// Capture deposit payment
export const captureDeposit = onCall(async (request) => {
  const { data, auth } = request;
  
  // Check if user is authenticated and is admin
  if (!auth) {
    throw new Error('User must be authenticated');
  }

  try {
    const { bookingId } = data;

    if (!bookingId) {
      throw new Error('Booking ID is required');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(auth.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new Error('Admin access required');
    }

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();
    const paymentIntentId = bookingData?.paymentIntentId;

    if (!paymentIntentId) {
      throw new Error('No payment intent found for booking');
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
      throw new Error('Payment capture failed');
    }
  } catch (error) {
    console.error('Error capturing deposit:', error);
    throw new Error('Failed to capture deposit');
  }
});

// Refund deposit payment
export const refundDeposit = onCall(async (request) => {
  const { data, auth } = request;
  
  // Check if user is authenticated and is admin
  if (!auth) {
    throw new Error('User must be authenticated');
  }

  try {
    const { bookingId, reason = 'admin_cancellation' } = data;

    if (!bookingId) {
      throw new Error('Booking ID is required');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(auth.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new Error('Admin access required');
    }

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();
    const paymentIntentId = bookingData?.paymentIntentId;

    if (!paymentIntentId) {
      throw new Error('No payment intent found for booking');
    }

    // Get the payment intent to find the charge
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent.latest_charge) {
      throw new Error('No charge found for payment intent');
    }

    // Create refund
    const refund = await stripe.refunds.create({
      charge: paymentIntent.latest_charge as string,
      reason: 'requested_by_customer',
      metadata: {
        bookingId,
        reason,
        adminId: auth.uid,
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
      throw new Error('Refund failed');
    }
  } catch (error) {
    console.error('Error refunding deposit:', error);
    throw new Error('Failed to refund deposit');
  }
});

// Charge final payment
export const chargeFinalPayment = onCall(async (request) => {
  const { data, auth } = request;
  
  // Check if user is authenticated and is admin
  if (!auth) {
    throw new Error('User must be authenticated');
  }

  try {
    const { bookingId, amount, currency = 'usd' } = data;

    if (!bookingId || !amount) {
      throw new Error('Booking ID and amount are required');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(auth.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new Error('Admin access required');
    }

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();
    const customerEmail = bookingData?.customerEmail;

    if (!customerEmail) {
      throw new Error('No customer email found for booking');
    }

    // Create PaymentIntent for final payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        bookingId,
        type: 'final_payment',
        adminId: auth.uid,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update booking with final payment intent
    await db.collection('bookings').doc(bookingId).update({
      finalPaymentIntentId: paymentIntent.id,
      finalPaymentAmount: amount,
      finalPaymentStatus: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating final payment intent:', error);
    throw new Error('Failed to create final payment intent');
  }
});

// Capture final payment
export const captureFinalPayment = onCall(async (request) => {
  const { data, auth } = request;
  
  // Check if user is authenticated and is admin
  if (!auth) {
    throw new Error('User must be authenticated');
  }

  try {
    const { bookingId } = data;

    if (!bookingId) {
      throw new Error('Booking ID is required');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(auth.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new Error('Admin access required');
    }

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();
    const finalPaymentIntentId = bookingData?.finalPaymentIntentId;

    if (!finalPaymentIntentId) {
      throw new Error('No final payment intent found for booking');
    }

    // Capture the final payment
    const paymentIntent = await stripe.paymentIntents.capture(finalPaymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update booking status
      await db.collection('bookings').doc(bookingId).update({
        status: 'completed',
        finalPaymentCaptured: true,
        finalPaymentCapturedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: 'Final payment captured successfully' };
    } else {
      throw new Error('Final payment capture failed');
    }
  } catch (error) {
    console.error('Error capturing final payment:', error);
    throw new Error('Failed to capture final payment');
  }
}); 