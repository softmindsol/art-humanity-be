import express from 'express';
import authRoute from './auth.route.js';
import paintPixelRoute from './paintPixel.route.js'
import projectRoute from './project.route.js'
import contributionRoute from './contributor.route.js'

const router = express.Router();

router.use('/auth', authRoute)
router.use('/', paintPixelRoute)
router.use('/contributions', contributionRoute)

router.use('/projects', projectRoute)

export default router;
