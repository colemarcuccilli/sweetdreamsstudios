/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import {CallableRequest} from "firebase-functions/v2/https";

admin.initializeApp();

// Initialize Stripe with the secret key from Firebase config
const stripe = new Stripe(functions.config().stripe.secretkey, {
  apiVersion: "2025-05-28.basil", // Use the latest API version
});

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

interface CreatePaymentIntentData {
  amount: number;
  bookingId: string;
}

interface CaptureDepositData {
  bookingId: string;
}

// Create a PaymentIntent for the deposit
export const createPaymentIntent = functions.https.onCall(
  async (request: CallableRequest<CreatePaymentIntentData>) => {
    // Ensure user is authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create a payment intent"
      );
    }

    const {amount, bookingId} = request.data;

    if (!amount || !bookingId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Amount and bookingId are required"
      );
    }

    try {
      // Create a PaymentIntent with the specified amount
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        capture_method: "manual", // Don't capture immediately
        metadata: {
          bookingId,
          userId: request.auth.uid,
        },
      });

      // Update the booking document with the PaymentIntent ID
      await admin.firestore()
        .collection("bookings")
        .doc(bookingId)
        .update({
          paymentIntentId: paymentIntent.id,
          depositAmount: amount,
        });

      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      console.error("Error creating payment intent:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Error creating payment intent"
      );
    }
  }
);

// Capture the deposit when an admin confirms a booking
export const captureDeposit = functions.https.onCall(
  async (request: CallableRequest<CaptureDepositData>) => {
    // Ensure user is authenticated and is an admin
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to capture a deposit"
      );
    }

    const {bookingId} = request.data;

    if (!bookingId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Booking ID is required"
      );
    }

    try {
      // Get the booking document
      const bookingDoc = await admin.firestore()
        .collection("bookings")
        .doc(bookingId)
        .get();

      if (!bookingDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Booking not found"
        );
      }

      const bookingData = bookingDoc.data();
      const paymentIntentId = bookingData?.paymentIntentId;

      if (!paymentIntentId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No payment intent found for this booking"
        );
      }

      // Capture the payment
      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

      // Update the booking status
      await bookingDoc.ref.update({
        status: "confirmed",
        depositCaptured: true,
        depositCapturedAt:
          admin.firestore
            .FieldValue
            .serverTimestamp(),
      });

      return {
        success: true,
        paymentIntent,
      };
    } catch (error) {
      console.error("Error capturing deposit:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Error capturing deposit"
      );
    }
  }
);
