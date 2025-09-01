import express from 'express';
import { userController } from '../controllers/auth.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
const router = express.Router();

// Auth routes
router.route('/register').post(userController.createUser);
router.route('/login').post(userController.loginUser);
router.route('/get-all-users').get(userController.getAllRegisteredUsers);

router.route('/verify-email').post(userController.verifyEmail);
// router.route('/logout').post(userController.logoutUser);
router.route('/refresh-token').get(userController.refreshToken);
router.route('/forgot-password').post(userController.forgotPassword);
router.route("/update-profile/:id").put(upload.single("profileImage"), userController.updateUser);
router.route('/change-email').post(userController.requestEmailChange);

router.route('/reset-password/:token').post(userController.resetPassword);
router.route("/firebase-login").post(userController.firebaseLogin);
router.route('/logout').post(userController.logoutUser)
// ✅ Protected route
router.route('/:id').get(userController.getUser);

export default router;