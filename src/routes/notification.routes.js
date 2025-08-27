import express from 'express';
import { getUserNotifications, markAsRead, markSingleNotificationAsRead } from '../controllers/notification.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/all').post(getUserNotifications);
router.route('/mark-as-read').patch(markAsRead);
router.route('/:notificationId/read').patch(markSingleNotificationAsRead);

export default router;