// routes/payment.routes.js

import { Router } from 'express';
import { createPaymentIntent, createDonationIntent } from '../controllers/payment.controller.js';
// import { verifyJWT } from '../middleware/auth.middleware.js'; // Apne auth middleware ko import karein

const router = Router();

// Yeh route ab protected hai, sirf logged-in user hi isay access kar sakte hain
router.route('/create-payment-intent').post(/*verifyJWT ,*/ createPaymentIntent);
router.route('/create-donation-intent').post(/*verifyJWT ,*/ createDonationIntent);

export default router;