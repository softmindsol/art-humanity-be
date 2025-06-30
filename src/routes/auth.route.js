import express from 'express';
import { userController } from '../controllers/user.controller.js';
const router = express.Router();

// Auth routes
router.route('/register').post(userController.createUser);
router.route('/login').post(userController.loginUser);
router.route('/verify-email').post(userController.verifyEmail);
// router.route('/logout').post(userController.logoutUser);
router.route('/refresh-token').get(userController.refreshToken);
router.route('/forgot-password').post(userController.forgotPassword);
router.route('/reset-password/:token').post( userController.resetPassword);
// ✅ Protected route
router.route('/:id').get(userController.getUser);

export default router;