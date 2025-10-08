import { User } from "../models/auth.model.js";
import Project from "../models/project.model.js";
import { sendEmailWithAttachment } from "../utils/email.utils.js";
import { generateInvoicePdf } from "../utils/pdf.utils.js";
import stripePackage from 'stripe';
import { ApiError, ApiResponse } from "../utils/api.utils.js";
import Payment from "../models/payment.model.js";

const stripe = stripePackage(process.env.STRIPE_SECRET_KEY);

export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    console.log('[Webhook] Chl Gai, Hurrrryyyyyyyyyyyyy!!!!!!!!:', req.body);
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET_KEY);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { projectId, userId, paymentType } = paymentIntent.metadata;

        // Ensure we have a user to associate the payment with
        if (!userId) {
            console.error('[Webhook] Error: Missing userId in paymentIntent metadata.');
            return res.status(400).send('Missing userId in metadata.');
        }

        try {
            const chargeId = paymentIntent.latest_charge;

            // Agar chargeId mojood nahi hai to aage na barhein
            if (!chargeId) {
                throw new Error(`Could not find charge ID on PaymentIntent ${paymentIntent.id}`);
            }

            // Is ID ka istemal karke Stripe se poora charge object haasil karein
            const charge = await stripe.charges.retrieve(chargeId);
            // --- CREATE THE PAYMENT RECORD ---
            const newPayment = new Payment({
                userId,
                projectId: paymentType === 'project_purchase' ? projectId : null,
                stripePaymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount / 100, // Convert from cents
                currency: paymentIntent.currency,
                status: 'succeeded',
                paymentType,
                receiptUrl: charge.receipt_url,
            });
            const savedPayment = await newPayment.save();

            // --- LINK PAYMENT TO USER ---
            await User.findByIdAndUpdate(userId, {
                $push: { paymentHistory: savedPayment._id }
            });

            // --- SEND EMAIL WITH PDF INVOICE ---
            const user = await User.findById(userId).lean();
            const project = projectId ? await Project.findById(projectId).lean() : null;

            if (user) {
                // Generate a PDF buffer
                const pdfBuffer = await generateInvoicePdf(savedPayment, user, project);

                // Send the email
                await sendEmailWithAttachment({
                    to: user.email,
                    subject: `Your receipt for ${project ? project.title : 'your donation'}`,
                    text: `Thank you for your purchase/donation! Your receipt is attached.`,
                    pdfBuffer: pdfBuffer,
                    filename: 'receipt.pdf'
                });
                console.log(`[Webhook] Receipt email sent successfully to ${user.email}`);
            }

            console.log(`[Webhook] Successfully recorded payment ${savedPayment._id} for user ${userId}.`);

        } catch (dbError) {
            console.error("[Webhook] Database or email error:", dbError);
            // In a real production app, you would have a retry mechanism here
        }
    }

    res.status(200).json({ received: true });
};

export const createPaymentIntent = async (req, res, next) => {
    try {
        const { projectId, userId } = req.body; // <-- Ab yahan se sirf projectId lein
        // const userId = req.user?._id; // <-- userId ko hamesha req.user se lein. Yeh secure hai.

        // Safety check
        if (!userId) {
            throw new ApiError(401, "User not authenticated.");
        }
        if (!projectId) {
            throw new ApiError(400, "Project ID is required.");
        }

        const project = await Project.findById(projectId);
        if (!project) {
            throw new ApiError(404, "Project not found.");
        }
        if (project.status !== 'Completed') {
            throw new ApiError(400, "This project is not yet available for purchase.");
        }

        const amountInCents = Math.round(project.price * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: {
                paymentType: 'project_purchase', // Yeh zaroori hai
                projectId: project._id.toString(),
                userId: userId.toString(), // Ab yeh hamesha defined hoga
                projectTitle: project.title,
            },
        });

        res.status(201).json(new ApiResponse(201, {
            clientSecret: paymentIntent.client_secret,
        }));

    } catch (err) {
        next(err);
    }
};;

export const createDonationIntent = async (req, res, next) => {
    try {
        // Frontend se 'amount' aayegi (e.g., 5 for $5.00)
        const { amount, userId } = req.body;

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
            metadata: {
                // --- YEH LINE ADD KARNA BOhat ZAROORI HAI ---
                paymentType: 'donation',
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