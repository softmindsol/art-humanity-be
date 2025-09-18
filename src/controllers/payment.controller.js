// controllers/payment.controller.js

import stripePackage from 'stripe';
import { ApiError, ApiResponse } from "../utils/api.utils.js";
import Project from '../models/project.model.js';

// Stripe ko secret key ke sath initialize karein
const stripe = stripePackage(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req, res, next) => {
    try {
        const { projectId, userId } = req.body;
        // const userId = req.user._id; // Yeh authentication middleware se aayega

        if (!projectId) {
            throw new ApiError(400, "Project ID is required.");
        }

        // Project ko database se find karein taake uski price mil sake
        const project = await Project.findById(projectId);
        if (!project) {
            throw new ApiError(404, "Project not found.");
        }
        if (project.status !== 'Completed') {
            throw new ApiError(400, "This project is not yet available for purchase.");
        }

        // Stripe ko price hamesha 'cents' mein chahiye (e.g., $2.99 = 299 cents)
        const amountInCents = Math.round(project.price * 100);

        // Stripe se Payment Intent create karein
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            // Metadata mein zaroori information save karein
            metadata: {
                projectId: project._id.toString(),
                userId: userId.toString(),
                projectTitle: project.title,
            },
        });

        // Frontend ko sirf 'client_secret' bhejein
        res.status(201).json(new ApiResponse(201, {
            clientSecret: paymentIntent.client_secret,
        }));

    } catch (err) {
        next(err);
    }
};
// arfan
export const createDonationIntent = async (req, res, next) => {
    try {
        // Frontend se 'amount' aayegi (e.g., 5 for $5.00)
        const { amount, userId } = req.body;
        // const userId = req.user._id; // Auth middleware se

        // --- VALIDATION ---
        // Amount ko number mein convert karein
        const numericAmount = Number(amount);
        if (!numericAmount || isNaN(numericAmount) || numericAmount < 1) { // Minimum $1 donation
            throw new ApiError(400, "Please provide a valid donation amount of at least $1.");
        }

        // Stripe ko hamesha 'cents' mein chahiye
        const amountInCents = Math.round(numericAmount * 100);

        // Stripe se Payment Intent create karein
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            // Metadata mein 'type' add karna ek aala practice hai
            metadata: {
                type: 'donation',
                userId: userId.toString(),
            },
        });

        // Frontend ko 'client_secret' bhejein
        res.status(201).json(new ApiResponse(201, {
            clientSecret: paymentIntent.client_secret,
        }));

    } catch (err) {
        next(err);
    }
};