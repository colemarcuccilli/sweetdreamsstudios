# Stripe Integration Setup Guide

This guide will help you set up Stripe payments for the Sweet Dreams Studios booking system.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Firebase project with Cloud Functions enabled
3. Environment variables configured

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

## Cloud Functions Setup

1. **Install dependencies in the functions directory:**
   ```bash
   cd functions
   npm install
   ```

2. **Set Stripe secret key in Firebase Functions config:**
   ```bash
   firebase functions:config:set stripe.secret_key="sk_test_your_stripe_secret_key"
   ```

3. **Deploy Cloud Functions:**
   ```bash
   firebase deploy --only functions
   ```

## How It Works

### Booking Flow
1. User selects a service and time slot
2. System creates a booking in Firestore
3. For paid services, a PaymentIntent is created via Cloud Function
4. Stripe Elements renders the payment form
5. User completes payment
6. Admin can capture deposits or process refunds

### Admin Actions
- **Capture Deposit**: Captures the authorized payment
- **Refund Deposit**: Issues a refund for the deposit
- **Charge Final Payment**: Creates a new PaymentIntent for final payment
- **Capture Final Payment**: Captures the final payment

## Testing

1. Use Stripe test cards for testing:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

2. Test the complete flow:
   - Create a booking
   - Process payment
   - Admin captures deposit
   - Admin processes refund (if needed)

## Security

- All payment processing happens server-side in Cloud Functions
- Client only handles payment form rendering
- Firestore rules restrict access to booking data
- Admin checks are performed both client and server-side

## Troubleshooting

1. **Payment Intent creation fails**: Check Stripe secret key configuration
2. **Cloud Functions not found**: Ensure functions are deployed
3. **Permission denied**: Verify Firestore rules and admin status
4. **Environment variables not loading**: Restart development server after changes 