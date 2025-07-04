"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureFinalPayment = exports.chargeFinalPayment = exports.refundDeposit = exports.captureDeposit = exports.createPaymentIntent = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe_1 = require("stripe");
// Initialize Firebase Admin
admin.initializeApp();
// Initialize Stripe
const stripe = new stripe_1.default(functions.config().stripe.secret_key, {
    apiVersion: '2023-10-16',
});
const db = admin.firestore();
// Create PaymentIntent for booking deposit
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const { amount, bookingId, currency = 'usd' } = data;
        if (!amount || !bookingId) {
            throw new functions.https.HttpsError('invalid-argument', 'Amount and bookingId are required');
        }
        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            metadata: {
                bookingId,
                userId: context.auth.uid,
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
    }
    catch (error) {
        console.error('Error creating PaymentIntent:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create payment intent');
    }
});
// Capture deposit payment
exports.captureDeposit = functions.https.onCall(async (data, context) => {
    var _a;
    // Check if user is authenticated and is admin
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
        if (!userDoc.exists || !((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }
        // Get booking
        const bookingDoc = await db.collection('bookings').doc(bookingId).get();
        if (!bookingDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Booking not found');
        }
        const bookingData = bookingDoc.data();
        const paymentIntentId = bookingData === null || bookingData === void 0 ? void 0 : bookingData.paymentIntentId;
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
        }
        else {
            throw new functions.https.HttpsError('internal', 'Payment capture failed');
        }
    }
    catch (error) {
        console.error('Error capturing deposit:', error);
        throw new functions.https.HttpsError('internal', 'Failed to capture deposit');
    }
});
// Refund deposit payment
exports.refundDeposit = functions.https.onCall(async (data, context) => {
    var _a;
    // Check if user is authenticated and is admin
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
        if (!userDoc.exists || !((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }
        // Get booking
        const bookingDoc = await db.collection('bookings').doc(bookingId).get();
        if (!bookingDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Booking not found');
        }
        const bookingData = bookingDoc.data();
        const paymentIntentId = bookingData === null || bookingData === void 0 ? void 0 : bookingData.paymentIntentId;
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
            charge: paymentIntent.latest_charge,
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
        }
        else {
            throw new functions.https.HttpsError('internal', 'Refund failed');
        }
    }
    catch (error) {
        console.error('Error refunding deposit:', error);
        throw new functions.https.HttpsError('internal', 'Failed to refund deposit');
    }
});
// Charge final payment
exports.chargeFinalPayment = functions.https.onCall(async (data, context) => {
    var _a;
    // Check if user is authenticated and is admin
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const { bookingId, amount, currency = 'usd' } = data;
        if (!bookingId || !amount) {
            throw new functions.https.HttpsError('invalid-argument', 'Booking ID and amount are required');
        }
        // Check if user is admin
        const userDoc = await db.collection('users').doc(context.auth.uid).get();
        if (!userDoc.exists || !((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }
        // Get booking
        const bookingDoc = await db.collection('bookings').doc(bookingId).get();
        if (!bookingDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Booking not found');
        }
        const bookingData = bookingDoc.data();
        const customerEmail = bookingData === null || bookingData === void 0 ? void 0 : bookingData.customerEmail;
        if (!customerEmail) {
            throw new functions.https.HttpsError('failed-precondition', 'No customer email found for booking');
        }
        // Create PaymentIntent for final payment
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            metadata: {
                bookingId,
                type: 'final_payment',
                adminId: context.auth.uid,
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
    }
    catch (error) {
        console.error('Error creating final payment intent:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create final payment intent');
    }
});
// Capture final payment
exports.captureFinalPayment = functions.https.onCall(async (data, context) => {
    var _a;
    // Check if user is authenticated and is admin
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
        if (!userDoc.exists || !((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }
        // Get booking
        const bookingDoc = await db.collection('bookings').doc(bookingId).get();
        if (!bookingDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Booking not found');
        }
        const bookingData = bookingDoc.data();
        const finalPaymentIntentId = bookingData === null || bookingData === void 0 ? void 0 : bookingData.finalPaymentIntentId;
        if (!finalPaymentIntentId) {
            throw new functions.https.HttpsError('failed-precondition', 'No final payment intent found for booking');
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
        }
        else {
            throw new functions.https.HttpsError('internal', 'Final payment capture failed');
        }
    }
    catch (error) {
        console.error('Error capturing final payment:', error);
        throw new functions.https.HttpsError('internal', 'Failed to capture final payment');
    }
});
//# sourceMappingURL=index.js.map