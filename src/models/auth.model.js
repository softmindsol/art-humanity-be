import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String,
        default: null
    },
    resetToken: {           // ✅ Add this
        type: String,
        default: null
    },
    resetTokenExpiry: {     // ✅ Add this
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


const User = mongoose.model('User', userSchema);

export { User };