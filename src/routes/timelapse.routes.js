import express from 'express';
import { generateTimelapse } from '../controllers/timelapse.controller.js';

const router = express.Router();

// Yeh route admin-only hona chahiye taake har koi isay call na kar sake
router.route('/:projectId').get(/* adminMiddleware, */ generateTimelapse);

export default router;