import { User } from '../models/auth.model.js';
import { validateUser } from '../validation/user.validation.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Token from '../models/token.model.js';
import nodemailer from 'nodemailer';
import { JWT_ACCESS_TOKEN_SECRET_KEY, CLIENT_URL } from '../config/env.config.js';
import { ApiError, ApiResponse } from '../utils/api.utils.js'
import admin from '../config/firebase.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { sendEmail } from '../config/email.config.js';
const SALT_ROUNDS = 10;

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

export const userController = {
    createUser: async (req, res) => {
        try {
            const { error } = validateUser(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message });
            }

            const existingUser = await User.findOne({
                $or: [{ email: req.body.email }, { username: req.body.fullName }]
            });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'User with this email or username already exists' });
            }

            // Check if fullName already exists
            const existingFullNameUser = await User.findOne({ fullName: req.body.fullName });
            if (existingFullNameUser) {
                return res.status(400).json({ success: false, message: 'User with this full name already exists' });
            }

            const hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS);
            const verificationToken = jwt.sign(
                { email: req.body.email },
                JWT_ACCESS_TOKEN_SECRET_KEY,
                { expiresIn: '24h' }
            );

            const user = new User({
                fullName: req.body.fullName,
                email: req.body.email,
                password: hashedPassword,
                verificationToken
            });

            const savedUser = await user.save();

            const verificationLink = `${req.headers.origin}/verify-email/${verificationToken}`;
            await sendEmail({
                recipient: savedUser.email,
                subject: 'Verify Your Email for MurArt',
                html: `
                <p>Welcome to MurArt! Please verify your email by clicking the link below:</p>
                <a href="${verificationLink}">Verify Email</a>
                <p>This link will expire in 24 hours.</p>
            `,
                text: `Please verify your email by visiting this link: ${verificationLink}`,
               
            });

            res.status(201).json({
                success: true,
                message: 'User created successfully. Please check your email to verify.',
                data: {
                    id: savedUser._id,
                    fullName: savedUser.fullName,
                    email: savedUser.email,

                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
            console.log(error);
        }
    },

    verifyEmail: async (req, res) => {
        try {
            const { token } = req.body;
            if (!token) return res.status(400).json({ success: false, message: "Missing token" });

            const decoded = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET_KEY);

            // New flow: token may include { id, newEmail }
            // Old flow: token may include { email }
            let user = null;

            if (decoded.id) {
                user = await User.findOne({ _id: decoded.id, verificationToken: token });
            } else if (decoded.email) {
                user = await User.findOne({ email: decoded.email, verificationToken: token });
            }

            if (!user) {
                return res.status(400).json({ success: false, message: "Invalid or expired verification token" });
            }

            user.isVerified = true;
            user.verificationToken = null;
            await user.save();

            return res.status(200).json({ success: true, message: "Email verified successfully. You can now login." });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: "Server error", error: error.message });
        }
    },

    loginUser: async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            if (!user.isVerified) {
                const verificationToken = jwt.sign(
                    { email: user.email },
                    JWT_ACCESS_TOKEN_SECRET_KEY,
                    { expiresIn: '24h' }
                );

                user.verificationToken = verificationToken;
                await user.save();

                const verificationLink = `${req.headers.origin}/verify-email/${verificationToken}`;
                await sendEmail({
                    recipient: user.email,
                    subject: 'Verify Your Email to Login',
                    html: `<p>You need to verify your email to login. Click the link below:</p>
                       <a href="${verificationLink}">Verify Email</a>
                       <p>This link will expire in 24 hours.</p>`,
                    text: `Please verify your email to login by visiting this link: ${verificationLink}`,
                });

                return res.status(403).json({
                    success: false,
                    message: 'Please verify your email before logging in. A new verification link has been sent to your email.'
                });
            }

            const isPasswordMatch = await bcrypt.compare(password, user.password);
            if (!isPasswordMatch) {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            }
            // --- YEH HAI ASAL FIX ---
            // Login kamyab hone ke baad, user ka poora data payment history ke sath populate karein
            const populatedUser = await User.findById(user._id)
                .select('-password -verificationToken -resetToken -resetTokenExpiry') // sensitive data na bhejein
                .populate({
                    path: 'paymentHistory',
                    // Payment ke andar projectId ko bhi populate karein taake frontend par kaam aaye
                    populate: {
                        path: 'projectId',
                        select: 'title canvasId' // Sirf zaroori fields
                    }
                });
            const accessToken = jwt.sign(
                { id: user._id, email: user.email },
                JWT_ACCESS_TOKEN_SECRET_KEY,
                { expiresIn: '15m' } // Access token expiration (1 minute for demo)
            );
            const refreshToken = jwt.sign(
                { id: user._id, email: user.email },
                JWT_ACCESS_TOKEN_SECRET_KEY,
                { expiresIn: '7d' } // Refresh token expiration (7 days)
            );

            // Save the refreshToken in the database
            const tokenDoc = new Token({
                userId: user._id,
                token: refreshToken // Save the refresh token in the database
            });
            await tokenDoc.save();

            // Set tokens in cookies
            res.cookie('accessToken', accessToken, {
                httpOnly: false, // Security: Prevent JavaScript access
                secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
                maxAge: 15 * 60 * 1000 // 1 minute in milliseconds
            });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: false, // Security: Prevent JavaScript access
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
            });

            // res.status(200).json({
            //     success: true,
            //     data: {
            //         id: user._id,
            //         username: user.username,
            //         email: user.email,
            //         fullName: user.fullName,
            //         token: accessToken,
            //         role: user.role 
            //     }
            // });
            res.status(200).json({
                success: true,
                // Frontend ko ab poora, populated user object bhejein
                data: {
                    ...populatedUser.toObject(), // Mongoose document ko plain object mein convert karein
                    token: accessToken
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    },

    refreshToken: async (req, res) => {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) return res.status(400).json({ message: 'No refresh token' });

        try {
            // Verify the refresh token
            const decoded = jwt.verify(refreshToken, JWT_ACCESS_TOKEN_SECRET_KEY);
            const tokenDoc = await Token.findOne({ token: refreshToken, userId: decoded.id });

            if (!tokenDoc) {
                return res.status(403).json({ message: 'Invalid refresh token' });
            }

            // Generate new access token
            const newAccessToken = jwt.sign(
                { id: decoded.id, email: decoded.email },
                JWT_ACCESS_TOKEN_SECRET_KEY,
                { expiresIn: '24h' } // Access token expiration (1 minute for demo)
            );

            res.cookie('accessToken', newAccessToken, {
                httpOnly: false, // Security: Prevent JavaScript access
                secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
                maxAge: 15 * 60 * 1000 // 1 minute in milliseconds
            });

            res.json({ success: true, message: 'Token refreshed' });
        } catch (error) {
            console.error("Error refreshing token:", error);
            res.status(403).json({ message: 'Invalid refresh token', error: error.message });
        }
    },

    getUser: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await User.findById(id)
                .select('-password -verificationToken -resetToken -resetTokenExpiry')
                .populate({
                    path: 'paymentHistory',
                    populate: {
                        path: 'projectId',
                        select: 'title canvasId'
                    }
                });
            // --- FIX KHATAM ---
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    },

    logoutUser: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(400).json({ success: false, message: 'No refresh token provided' });
            }
            await Token.deleteOne({ refreshToken });

            // Clear cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            res.status(200).json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    },

    verifyPassword: async (req, res) => {
        const { password, user } = req.body;
        console.log(user);

        const newUser = await User.findById({ _id: user.id }); // use req.user from authMiddleware
        console.log(newUser);
        const isMatch = await bcrypt.compare(password, newUser.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        res.json({ success: true, message: "Password verified" });
    },

    // updateUser: async (req, res) => {
    //     try {
    //         const { fullName, password, newEmail } = req.body;
    //         const { id } = req.params;

    //         // Build update object
    //         const updateData = {};
    //         if (fullName) {
    //             updateData.fullName = fullName;
    //         }

    //         if (password) {
    //             updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    //         }

    //         // 3) Check duplicate email (exclude the same user)
    //         const exists = await User.findOne({ email: newEmail, _id: { $ne: id } }).select("_id");
    //         if (exists) return res.status(409).json({ success: false, message: "Email already in use" });


    //         if (req.file?.path) {
    //             const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
    //             if (cloudinaryResponse?.url) {
    //                 updateData.avatar = cloudinaryResponse.url; // ✅ Save to avatar
    //                 //  deleteLocalFile(req.file.path);
    //             }
    //         }


    //         const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true })
    //             .select("-password -verificationToken"); // exclude sensitive fields

    //         if (!updatedUser) {
    //             return res.status(404).json({ success: false, message: "User not found" });
    //         }

    //         res.status(200).json({ success: true, message: "User updated successfully", data: updatedUser });
    //     } catch (err) {
    //         console.error("Update user error:", err);
    //         res.status(500).json({ success: false, message: "Server error", error: err.message });
    //     }
    // },

    updateProfile: async (req, res) => {
        try {
            const { fullName } = req.body;
            const { id } = req.params;

            const updateData = { fullName };

            if (req.file?.path) {
                const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
                if (cloudinaryResponse?.url) {
                    updateData.avatar = cloudinaryResponse.url;
                }
            }

            const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true })
                .select("-password -verificationToken");

            if (!updatedUser) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
        } catch (err) {
            console.error("Update profile error:", err);
            res.status(500).json({ success: false, message: "Server error", error: err.message });
        }
    },

    // Naya Controller: Password verify karne ke liye
    verifyOldPassword: async (req, res) => {
        try {
            const { oldPassword } = req.body;
            const { id } = req.params; // ya req.user.id agar auth middleware se aa raha hai

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: "Incorrect password" });
            }

            res.status(200).json({ success: true, message: "Password verified" });
        } catch (err) {
            res.status(500).json({ success: false, message: "Server error" });
        }
    },

    // Naya Controller: Password change karne ke liye
    changePassword: async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: "Incorrect old password" });
            }

            if (oldPassword === newPassword) {
                return res.status(400).json({ success: false, message: "New password cannot be the same as the old password" });
            }

            user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
            await user.save();

            res.status(200).json({ success: true, message: "Password updated successfully" });

        } catch (err) {
            console.error("Change password error:", err);
            res.status(500).json({ success: false, message: "Server error", error: err.message });
        }
    },

    requestEmailChange: async (req, res) => {
        try {
            const { userId, newEmail, currentPassword } = req.body;
            if (!userId || !newEmail || !currentPassword) {
                return res.status(400).json({ success: false, message: "userId, newEmail aur currentPassword required hain" });
            }

            // 1) User load
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ success: false, message: "User not found" });

            // 2) Password verify (agar passwordless/Firebase account ho to error)
            if (!user.password) {
                return res.status(400).json({ success: false, message: "Password login is not enabled for this account" });
            }
            const ok = await bcrypt.compare(currentPassword, user.password);
            if (!ok) return res.status(401).json({ success: false, message: "Invalid current password" });

            // 3) Duplicate email check (kisi aur ka na ho)
            const exists = await User.findOne({ email: newEmail.toLowerCase().trim(), _id: { $ne: userId } }).select("_id");
            if (exists) return res.status(409).json({ success: false, message: "Email already in use" });

            // 4) Token banao (id + newEmail store), 24h expiry
            const verificationToken = jwt.sign(
                { id: user._id, newEmail: newEmail.toLowerCase().trim() },
                JWT_ACCESS_TOKEN_SECRET_KEY,
                { expiresIn: "24h" }
            );

            // 5) Email turant change + un-verify + token save
            user.email = newEmail.toLowerCase().trim();
            user.isVerified = false;                 // <<<<<<<<<< as per requirement
            user.verificationToken = verificationToken;
            await user.save();

            // 6) New email par verification bhejo
            const baseUrl = req.headers.origin || CLIENT_URL; // fallback if origin missing
            const verificationLink = `${baseUrl}/verify-email/${verificationToken}`;

            await sendEmail({
                recipient: newEmail,
                subject: 'Verify your new email',
                html: `
        <p>You requested to change your email.</p>
        <p>Click below to verify:</p>
        <a href="${verificationLink}">Verify New Email</a>
        <p>Expires in 24 hours.</p>
      `,
                text: `Verify your new email: ${verificationLink}`,
            });

            return res.status(200).json({
                success: true,
                message: "Email change requested. Verification link sent to the new email."
            });
        } catch (err) {
            console.error("requestEmailChange error:", err);
            return res.status(500).json({ success: false, message: "Server error", error: err.message });
        }
    },


    forgotPassword: async (req, res) => {
        const { email } = req.body;
        if (!email) throw new ApiError(400, "Email is required");

        const user = await User.findOne({ email });
        if (!user) throw new ApiError(404, "No user found with this email");


        const resetToken = jwt.sign({ id: user._id }, JWT_ACCESS_TOKEN_SECRET_KEY, { expiresIn: "15m" });

        const resetLink = `${req.headers.origin}/reset-password/${resetToken}`;

        await sendEmail({
            recipient: email,
            subject: 'Password Reset Request',
            html: `
        <p>You requested to reset your password.</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>Link expires in 15 minutes.</p>
      `,
            text: `Reset your password: ${resetLink}`,
        });

        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
        await user.save();

        res.status(200).json(200, null, "Reset link sent to email.");
    },

    resetPassword: async (req, res) => {
        const { token } = req.params;
        const { password } = req.body;

        let newPassword = password;
        if (!newPassword) throw new ApiError(400, "New password is required");

        const decoded = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET_KEY);

        const user = await User.findOne({
            _id: decoded.id,
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() },
        });

        if (!user) throw new ApiError(400, "Invalid or expired token");

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    },

    getAllRegisteredUsers: async (req, res, next) => {
        try {
            // Hum sirf zaroori data wapas bhejenge, password nahi.
            const users = await User.find({ role: { $ne: 'admin' } })
                .select('_id fullName email avatar');
            res.status(200).json(new ApiResponse(
                200,
                users,
                "All registered users fetched successfully."
            ));
        } catch (err) {
            next(err);
        }
    },


    firebaseLogin: async (req, res) => {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: "Token is required" });
        }

        try {
            const decoded = await admin.auth().verifyIdToken(token);

            let user = await User.findOne({ firebaseUid: decoded.uid });

            if (!user) {
                user = await User.create({
                    firebaseUid: decoded.uid,
                    email: decoded.email,
                    fullName: decoded.name,
                    avatar: decoded.picture,
                    isVerified: true,

                    createdAt: new Date(),
                });
            } else if (!user.isVerified) {
                user.isVerified = true;
                await user.save();
            }

            // ✅ Generate tokens using same secret and logic
            const accessToken = jwt.sign(
                { id: user._id, email: user.email },
                JWT_ACCESS_TOKEN_SECRET_KEY,
                { expiresIn: '15m' }
            );
            const refreshToken = jwt.sign(
                { id: user._id, email: user.email },
                JWT_ACCESS_TOKEN_SECRET_KEY,
                { expiresIn: '7d' }
            );

            // ✅ Save refresh token to DB
            await Token.create({ userId: user._id, token: refreshToken });

            // ✅ Set cookies (same config as loginUser)
            res.cookie('accessToken', accessToken, {
                httpOnly: false, // Same as your existing logic (but consider true in prod)
                secure: process.env.NODE_ENV === 'production',
                maxAge: 15 * 60 * 1000
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            // ✅ Return same user info structure
            res.status(200).json({
                success: true,
                data: {
                    _id: user._id,
                    email: user.email,
                    fullName: decoded.name,
                    avatar: user.avatar,
                    isVerified: user.isVerified,

                    token: accessToken
                }
            });

        } catch (err) {
            console.error("Firebase Auth Error:", err);
            res.status(401).json({ success: false, message: "Invalid Firebase token" });
        }
    }

};