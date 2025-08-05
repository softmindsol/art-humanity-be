import express from 'express';
import authRoute from './auth.route.js';
import paintPixelRoute from './painPixel.route.js'
const router = express.Router();

router.use('/auth', authRoute)
router.use('/', paintPixelRoute)

export default router;
