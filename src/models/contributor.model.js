// models/Contribution.js (Naya aur Behtar Schema)

import mongoose from 'mongoose';
const { Schema } = mongoose;

// Yeh schema har line/stroke ka data store karega
const StrokeSchema = new Schema({
    strokePath: { type: Schema.Types.Mixed, required: true },
    brushSize: { type: Number, required: true },
    color: { type: Schema.Types.Mixed, required: true },
    mode: { type: String, enum: ['brush', 'eraser'], required: true }
}, { _id: false }); // Strokes ki alag ID ki zaroorat nahi

// Yeh hamara main model hoga
const ContributionSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // --- EMBEDDING ---
    // Yahan hum poora stroke ka array save karenge
    // Yeh paintPixelSchema ki 'strokePath' aur contributionSchema ke 'grouping' ko milata hai
    strokes: [StrokeSchema],

    // Future ke liye
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 }
}, {
    timestamps: true // `createdAt` aur `updatedAt` khud add ho jayenge
});

export default mongoose.model('Contribution', ContributionSchema);