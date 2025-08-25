import mongoose from 'mongoose';
const { Schema } = mongoose;

// Yeh schema 'Contribution' ke 'StrokeSchema' jaisa hi hoga, 
// lekin ismein timestamp zaroori hai.
const DrawingLogSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true // Is par index zaroori hai
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Stroke ka poora data yahan aayega
    stroke: {
        strokePath: { type: Schema.Types.Mixed, required: true },
        brushSize: { type: Number, required: true },
        color: { type: Schema.Types.Mixed, required: true },
        mode: { type: String, enum: ['brush', 'eraser'], required: true }
    },
}, {
    // Har log ka apna timestamp hona bohat zaroori hai
    timestamps: { createdAt: true, updatedAt: false } // Humein sirf createdAt chahiye
});

export default mongoose.model('DrawingLog', DrawingLogSchema);