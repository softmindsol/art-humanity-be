import express from 'express';
import { createContribution } from '../controllers/contributor.controller.js';

const router = express.Router();

router.post('/', createContribution);

export default router;
