import express from 'express';
import { generateHighResImage } from '../controllers/image.controller.js';
// Yahan aap auth middleware laga sakte hain taake sirf login users download kar sakein
// import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Route: /api/v1/image/download/PROJECT_ID
router.route('/download/:projectId').get(/* authMiddleware, */ generateHighResImage);

export default router;