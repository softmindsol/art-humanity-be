import express from 'express';
import { createContribution, getProjectContributions } from '../controllers/contributor.controller.js';

const router = express.Router();

router.route('/').post(createContribution);

// Route to get all contributions for a specific project
router.route('/project/:projectId').get(getProjectContributions);

export default router;
