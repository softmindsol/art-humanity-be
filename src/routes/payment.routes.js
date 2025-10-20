// routes/payment.routes.js

import { Router } from 'express';
import { createPaymentIntent, createDonationIntent, handleStripeWebhook } from '../controllers/payment.controller.js';
// import { verifyJWT } from '../middleware/auth.middleware.js'; // Apne auth middleware ko import karein
import express from 'express';

const router = Router();

// Yeh route ab protected hai, sirf logged-in user hi isay access kar sakte hain
router.route('/create-payment-intent').post(/*verifyJWT ,*/ createPaymentIntent);
router.route('/create-donation-intent').post(/*verifyJWT ,*/ createDonationIntent);
// --- PUBLIC WEBHOOK ROUTE (STRIPE INITIATED) ---
// Ek naya router banayein jo is route ko alag se handle kare
const webhookRouter = Router();

webhookRouter.route('/webhook').post(express.raw({ type: 'application/json' }), handleStripeWebhook);
export { router as paymentRouter, webhookRouter };
