// models/project.model.js
import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    canvasId: {
        type: String,
        required: true,
        unique: true, // Har canvas ki ID unique honi chahiye
        index: true
    },
    width: {
        type: Number,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    targetCompletionDate: {
        type: Date
    },
    thumbnailUrl: {
        type: String,
        required: true
    },
    baseImageUrl: {
        type: String // optional
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // contributors: {
    //     type: [contributorSchema],
    //     default: []
    // },
    isPaused: {
        type: Boolean,
        default: false
    },
    isClosed: {
        type: Boolean,
        default: false
    },
    stats: {
        pixelCount: { type: Number, default: 0 },
        contributorCount: { type: Number, default: 0 },
        percentComplete: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Project', projectSchema);
