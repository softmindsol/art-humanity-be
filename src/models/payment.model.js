// models/payment.model.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const paymentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    projectId: { // Only for project purchases, will be null for donations
        type: Schema.Types.ObjectId,
        ref: 'Project',
        index: true,
    },
    stripePaymentIntentId: { // The ID from Stripe (e.g., 'pi_...')
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    amount: { // The amount in a standard unit, e.g., 2.99 for USD
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        required: true,
        default: 'usd',
    },
    status: { // The final status from Stripe
        type: String,
        required: true,
        enum: ['succeeded', 'processing', 'requires_payment_method', 'failed'],
        default: 'processing',
    },
    paymentType: {
        type: String,
        required: true,
        enum: ['project_purchase', 'donation'],
    },
    receiptUrl: { // Stripe provides a URL for the customer's receipt
        type: String,
    }
}, {
    timestamps: true,
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;