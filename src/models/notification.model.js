import mongoose from 'mongoose';
const { Schema } = mongoose;

const NotificationSchema = new Schema({
    // Yeh notification kis ke liye hai
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Notification kisne bheji (optional, e.g., system ya doosra user)
    sender: { type: Schema.Types.ObjectId, ref: 'User' },

    // Notification ka type taake frontend par alag icon dikha sakein
    type: {
        type: String,
        enum: ['NEW_CONTRIBUTOR', 'ADDED_TO_PROJECT','CONTRIBUTOR_REMOVED', 'PROJECT_COMPLETED', 'VOTE_THRESHOLD'],
        required: true
    },

    // Notification ka message
    message: { type: String, required: true },

    // Notification kis project se mutalliq hai (taake click karke wahan ja sakein)
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    canvasId: { type: String },

    // Kya user ne isay parh liya hai?
    isRead: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model('Notification', NotificationSchema);