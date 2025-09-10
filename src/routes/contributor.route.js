import express from 'express';
import { batchCreateContributions, createContribution, deleteContribution, getProjectContributions, voteOnContribution, clearCanvas } from '../controllers/contributor.controller.js';

const router = express.Router();

router.route('/').post(createContribution);
router.route('/batch').post(batchCreateContributions); 

// Route to get all contributions for a specific project
router.route('/project/:projectId').get(getProjectContributions);
// :id yahan contributionId hai
router.route('/:id/vote').post(/* authMiddleware, */ voteOnContribution);
router.route('/:id').delete(/* authMiddleware, adminMiddleware, */ deleteContribution);
router.route('/:projectId/clear-canvas').delete(/* authMiddleware, adminMiddleware, */ clearCanvas);

export default router;
