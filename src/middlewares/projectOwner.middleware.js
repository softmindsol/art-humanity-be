// src/middlewares/projectOwner.middleware.js
import Project from '../models/project.model.js';
import { ApiError } from '../utils/api.utils.js';

export const projectOwnerMiddleware = async (req, res, next) => {
    try {
        // Hum projectId ko req.body ya req.params se le sakte hain
        const { projectId,userId } = req.body
        const loggedInUserId = userId;

        if (!projectId) {
            throw new ApiError(400, "Project ID is required.");
        }

        const project = await Project.findById(projectId);

        if (!project) {
            throw new ApiError(404, "Project not found.");
        }

        // --- YEH HAI ASAL CHECK ---
        // Project ke ownerId ko logged-in user ki ID se compare karein
        if (!project.ownerId.equals(loggedInUserId)) {
            // Agar IDs match nahi hotin, to permission deny kar dein
            throw new ApiError(403, "Forbidden: You are not the owner of this project.");
        }

        // Agar user owner hai, to request ko aage barhne dein
        next();

    } catch (error) {
        next(error);
    }
};