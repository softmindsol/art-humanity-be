import express from 'express';
import authRoute from './auth.route.js';
import paintPixelRoute from './paintPixel.route.js'
import projectRoute from './project.route.js'
import contributionRoute from './contributor.route.js'
import timelapseRouter from './timelapse.routes.js'; // Naye router ko import karein
import imageRouter from './image.routes.js'; // Naye router ko import karein
import notificationRouter from './notification.routes.js'; // Naye router ko import karein
import paymentRouter from './payment.routes.js'; // Naye router ko import karein

const router = express.Router();

router.use('/auth', authRoute)
router.use('/', paintPixelRoute)
router.use('/contributions', contributionRoute)
router.use('/timelapse', timelapseRouter);
router.use('/projects', projectRoute)
router.use('/image', imageRouter);
router.use('/notifications', notificationRouter);
router.use('/payments', paymentRouter);
export default router;
