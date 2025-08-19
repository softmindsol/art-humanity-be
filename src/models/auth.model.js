import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema({
    fullName: {
        type: String,
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
    firebaseUid: {
        type: String,
        unique: true,
        sparse: true // Allow some users to not have firebaseUid (for local users)
    },
    avatar: {
        type: String
    },

    password: {
        type: String,
        // required: true,
        minlength: 6
    },
    // --- ADD THIS NEW FIELD ---
    role: {
        type: String,
        enum: ['user', 'admin'], // Only these two values are allowed
        default: 'user'         // By default, every new user is a 'user'
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