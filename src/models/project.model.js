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
    width: {
        type: Number,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    palette: {
        type: [String], // list of hex codes
        default: []
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
