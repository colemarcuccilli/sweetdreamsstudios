import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe
const stripeKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('Stripe secret key not found in config or environment');
}

const stripe = new Stripe(stripeKey || '', {
  apiVersion: '2023-10-16',
});

const db = admin.firestore();

// Submit booking request with immediate deposit payment
export const submitBookingRequest = functions.https.onCall(async (data, context) => {
  console.log('submitBookingRequest called');
  console.log('context.auth:', context.auth);
  
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    console.log('Received data:', JSON.stringify(data, null, 2));
    
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
      returnUrl
    } = data;

    // Validate required fields
    if (!resourceId || !requestedStartTime || !requestedEndTime || !serviceType || !clientName || !clientEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Calculate costs based on service type and duration
    let totalCost = 0;
    let depositAmount = 0;

    try {
      const pricingRulesDoc = await db.collection('pricingRules').doc(serviceType).get();
      
      if (pricingRulesDoc.exists) {
        const pricingData = pricingRulesDoc.data();
        
        if (pricingData?.pricePerHour) {
          totalCost = pricingData.pricePerHour * durationHours;
        } else if (pricingData?.fixedPrice) {
          totalCost = pricingData.fixedPrice;
        }
        depositAmount = totalCost * (pricingData?.depositPercentage || 0.5);
      } else {
        // Default pricing if no rules found
        totalCost = 100; // Default $100
        depositAmount = 50; // Default $50 deposit
      }
    } catch (pricingError) {
      console.error('Error fetching pricing rules:', pricingError);
      totalCost = 100;
      depositAmount = 50;
    }

    // Get or create Stripe customer
    let stripeCustomerId = '';
    const customerDoc = await db.collection('customers').doc(context.auth.uid).get();
    
    if (customerDoc.exists && customerDoc.data()?.stripeId) {
      stripeCustomerId = customerDoc.data()!.stripeId;
    } else {
      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: clientEmail,
        name: clientName,
        metadata: {
          firebaseUID: context.auth.uid
        }
      });
      stripeCustomerId = stripeCustomer.id;

      // Save to Firestore
      await db.collection('customers').doc(context.auth.uid).set({
        stripeId: stripeCustomerId,
        email: clientEmail
      }, { merge: true });
    }

    // Create booking request FIRST (before payment)
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
      status: 'pending_payment', // Different status - waiting for payment
      totalCost,
      depositAmount,
      remainingBalance: totalCost - depositAmount,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const bookingRequestRef = await db.collection('booking_requests').add(bookingRequestData);
    console.log('Booking request created with ID:', bookingRequestRef.id);

    // Create Stripe Checkout Session for IMMEDIATE deposit payment
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Studio Booking Deposit - ${serviceType}`,
            description: `Deposit for ${serviceType} session on ${new Date(requestedStartTime).toLocaleDateString()}`
          },
          unit_amount: Math.round(depositAmount * 100) // Convert to cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&booking_request_id=${bookingRequestRef.id}&success=true`,
      cancel_url: `${returnUrl}?booking_request_id=${bookingRequestRef.id}&cancelled=true`,
      client_reference_id: bookingRequestRef.id,
      metadata: {
        bookingRequestId: bookingRequestRef.id,
        serviceType: serviceType,
        clientId: context.auth.uid,
        type: 'deposit_payment'
      }
    });

    // Update booking request with session ID
    await db.collection('booking_requests').doc(bookingRequestRef.id).update({
      stripeCheckoutSessionId: session.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      bookingRequestId: bookingRequestRef.id,
      sessionId: session.id,
      checkoutUrl: session.url,
      totalCost,
      depositAmount,
      remainingBalance: totalCost - depositAmount
    };
  } catch (error) {
    console.error('ERROR in submitBookingRequest:', error);
    throw new functions.https.HttpsError('internal', `Failed to submit booking request: ${error.message}`);
  }
});

// Accept booking request (admin only) - deposit already paid
export const acceptBookingRequest = functions.https.onCall(async (data, context) => {
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

    // Verify deposit was paid
    if (!bookingData.depositPaid || bookingData.status !== 'paid_pending_admin_review') {
      throw new functions.https.HttpsError('failed-precondition', 'Booking request deposit not paid');
    }

    // Update booking request status to confirmed
    await db.collection('booking_requests').doc(bookingRequestId).update({
      status: 'confirmed',
      acceptedByAdminId: context.auth.uid,
      assignedEngineerId: assignedEngineerId || null,
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      bookingStatus: 'confirmed',
      serviceType: bookingData.serviceType,
      serviceDetailsInput: bookingData.serviceDetailsInput,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Booking request confirmed - session scheduled!'
    };
  } catch (error) {
    console.error('Error accepting booking request:', error);
    throw new functions.https.HttpsError('internal', 'Failed to accept booking request');
  }
});

// Create checkout session for booking payment
export const createBookingCheckoutSession = functions.https.onCall(async (data, context) => {
  try {
    const { bookingRequestId, paymentLinkToken, returnUrl } = data;

    if (!bookingRequestId || !paymentLinkToken) {
      throw new functions.https.HttpsError('invalid-argument', 'Booking request ID and payment token are required');
    }

    // Verify payment link token
    const bookingRequestDoc = await db.collection('booking_requests').doc(bookingRequestId).get();
    if (!bookingRequestDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking request not found');
    }

    const bookingData = bookingRequestDoc.data()!;
    if (bookingData.paymentLinkToken !== paymentLinkToken) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid payment token');
    }

    if (bookingData.status !== 'accepted_pending_payment') {
      throw new functions.https.HttpsError('failed-precondition', 'Booking request is not ready for payment');
    }

    // Get or create Stripe customer
    let stripeCustomerId = '';
    const customerDoc = await db.collection('customers').doc(bookingData.clientId).get();
    
    if (customerDoc.exists && customerDoc.data()?.stripeId) {
      stripeCustomerId = customerDoc.data()!.stripeId;
    } else {
      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: bookingData.clientEmail,
        name: bookingData.clientName,
        metadata: {
          firebaseUID: bookingData.clientId
        }
      });
      stripeCustomerId = stripeCustomer.id;

      // Save to Firestore
      await db.collection('customers').doc(bookingData.clientId).set({
        stripeId: stripeCustomerId,
        email: bookingData.clientEmail
      }, { merge: true });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Studio Booking Deposit - ${bookingData.serviceType}`,
            description: `Deposit for ${bookingData.serviceType} session`
          },
          unit_amount: Math.round(bookingData.finalDepositAmount * 100) // Convert to cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&booking_request_id=${bookingRequestId}&success=true`,
      cancel_url: `${returnUrl}?booking_request_id=${bookingRequestId}&cancelled=true`,
      client_reference_id: bookingRequestId,
      metadata: {
        bookingRequestId,
        serviceType: bookingData.serviceType,
        clientId: bookingData.clientId
      }
    });

    // Update booking request with session ID
    await db.collection('booking_requests').doc(bookingRequestId).update({
      stripeCheckoutSessionId: session.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create checkout session');
  }
});

// Process deposit payment (triggered by Stripe webhook via extension)
export const processConfirmedBookingPayment = functions.firestore
  .document('customers/{customerId}/payments/{paymentId}')
  .onCreate(async (snap, context) => {
    try {
      const paymentData = snap.data();
      
      if (!paymentData || paymentData.status !== 'succeeded') {
        console.log('Payment not succeeded, skipping processing');
        return;
      }

      // Get booking request ID from payment metadata
      const bookingRequestId = paymentData.metadata?.bookingRequestId || paymentData.client_reference_id;
      const paymentType = paymentData.metadata?.type || 'deposit_payment';
      
      if (!bookingRequestId) {
        console.log('No booking request ID found in payment data');
        return;
      }

      // Get booking request
      const bookingRequestDoc = await db.collection('booking_requests').doc(bookingRequestId).get();
      if (!bookingRequestDoc.exists) {
        console.error('Booking request not found:', bookingRequestId);
        return;
      }

      // const bookingData = bookingRequestDoc.data()!;

      if (paymentType === 'deposit_payment') {
        // This is the initial deposit payment - move to admin review
        await db.collection('booking_requests').doc(bookingRequestId).update({
          status: 'paid_pending_admin_review', // Now admin can see it
          depositPaid: true,
          stripeDepositPaymentIntentId: paymentData.payment_intent,
          depositPaidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Deposit paid for booking request ${bookingRequestId} - now visible to admin`);
        
      } else if (paymentType === 'final_payment') {
        // This is the final payment after the session
        await db.collection('booking_requests').doc(bookingRequestId).update({
          status: 'fully_paid_completed',
          finalPaymentPaid: true,
          stripeFinalPaymentIntentId: paymentData.payment_intent,
          finalPaidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update the booking record if it exists
        const bookingsQuery = await db.collection('bookings')
          .where('bookingRequestId', '==', bookingRequestId)
          .limit(1)
          .get();
          
        if (!bookingsQuery.empty) {
          const bookingDoc = bookingsQuery.docs[0];
          await bookingDoc.ref.update({
            bookingStatus: 'completed_paid',
            stripeFinalPaymentIntentId: paymentData.payment_intent,
            finalPaidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        console.log(`Final payment completed for booking request ${bookingRequestId}`);
      }

    } catch (error) {
      console.error('Error processing booking payment:', error);
    }
  });

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

// Custom portal link function (workaround for extension deployment issue)
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
  } catch (error) {
    console.error('Error creating portal link:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create portal link');
  }
});

// Charge final payment with custom invoice (admin only)
export const chargeFinalPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { bookingRequestId, customLineItems, totalAmount, description } = data;

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

    // Verify booking is confirmed
    if (bookingData.status !== 'confirmed') {
      throw new functions.https.HttpsError('failed-precondition', 'Booking must be confirmed first');
    }

    // Get customer
    const customerDoc = await db.collection('customers').doc(bookingData.clientId).get();
    if (!customerDoc.exists || !customerDoc.data()?.stripeId) {
      throw new functions.https.HttpsError('not-found', 'Customer not found');
    }

    const stripeCustomerId = customerDoc.data()!.stripeId;

    // Create line items for Stripe
    const lineItems = customLineItems.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || ''
        },
        unit_amount: Math.round(item.price * 100) // Convert to cents
      },
      quantity: item.quantity || 1
    }));

    // Create Stripe Checkout Session for final payment
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'https://sweetdreamsstudios-7c965.web.app'}/admin/bookings?payment_success=true&booking=${bookingRequestId}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://sweetdreamsstudios-7c965.web.app'}/admin/bookings?payment_cancelled=true&booking=${bookingRequestId}`,
      client_reference_id: bookingRequestId,
      metadata: {
        bookingRequestId,
        clientId: bookingData.clientId,
        type: 'final_payment',
        totalAmount: totalAmount.toString()
      }
    });

    // Update booking request with final payment session
    await db.collection('booking_requests').doc(bookingRequestId).update({
      finalPaymentSessionId: session.id,
      finalPaymentSessionUrl: session.url,
      customLineItems,
      finalPaymentAmount: totalAmount,
      finalPaymentDescription: description || '',
      finalPaymentInitiatedBy: context.auth.uid,
      finalPaymentInitiatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      totalAmount,
      message: 'Final payment session created'
    };
  } catch (error) {
    console.error('Error creating final payment:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create final payment');
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

    await db.collection('booking_requests').doc(bookingRequestId).update({
      status: 'declined',
      declineReason: reason || 'No reason provided',
      declinedByAdminId: context.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'Booking request declined' };
  } catch (error) {
    console.error('Error declining booking request:', error);
    throw new functions.https.HttpsError('internal', 'Failed to decline booking request');
  }
});