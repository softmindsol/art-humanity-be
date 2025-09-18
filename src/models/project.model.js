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
        unique: true,
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
        type: String
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }, 

    // --- YAHAN TABDEELI HAI ---
    // Yeh array un tamam users ki IDs store karega jinhon ne is project ko "join" kiya hai.
    contributors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Yeh 'User' model se link hai
    }],
    bannedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // isPaused: {
    //     type: Boolean,
    //     default: false
    // },
    // isClosed: {
    //     type: Boolean,
    //     default: false
    // },

    status: {
        type: String,
        enum: ['Active', 'Paused', 'Completed'], // Sirf yeh 3 values ho sakti hain
        default: 'Active', // Naya project hamesha 'Active' hoga
        index: true // Is par index lagana behtar hai
    },
    stats: {
        pixelCount: { type: Number, default: 0 },
        contributorCount: { type: Number, default: 0 },
        percentComplete: { type: Number, default: 0 }
    },
    price: {
        type: Number,
        default: 2.99 // Default price set kar dein
    },
}, {
    timestamps: true // Yeh `createdAt` aur `updatedAt` khud manage karega
});

export default mongoose.model('Project', projectSchema);