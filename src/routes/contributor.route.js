import express from 'express';
import { batchCreateContributions, createContribution, deleteContribution, getProjectContributions, voteOnContribution, clearCanvas, getEachContributions, createEmptyContribution, addStrokesToContribution } from '../controllers/contributor.controller.js';

const router = express.Router();

// router.route('/').post(createContribution);
router.route('/batch').post(batchCreateContributions); 

// Route to get all contributions for a specific project
router.route('/project/:projectId').get(getProjectContributions);
router.route('/:projectId').get(getEachContributions);


// :id yahan contributionId hai
router.route('/:id/vote').post(/* authMiddleware, */ voteOnContribution);
router.route('/:id').delete(/* authMiddleware, adminMiddleware, */ deleteContribution);
router.route('/:projectId/clear-canvas').delete(/* authMiddleware, adminMiddleware, */ clearCanvas);


// --- NEW ROUTES ---
// Route to create a new, empty contribution container
router.route('/').post(createEmptyContribution);

// Route to add strokes to an existing contribution
router.route('/:contributionId/strokes').patch(addStrokesToContribution);
export default router;
