import express from "express";
import { createProject, getActiveProjects, getProjectById, joinProject, updateProjectStatus, getGalleryProjects, removeContributor, getProjectContributors, addContributorsToProject } from "../controllers/project.controller.js";
import { upload } from './../middlewares/multer.middleware.js';
import { projectOwnerMiddleware } from "../middlewares/projectOwner.middleware.js";

const router = express.Router();

router.route("/create").post(upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "baseImage", maxCount: 1 },
]), createProject);

router.route("/:projectId/join").post(joinProject);
router.route("/:projectId/contributors").get( getProjectContributors);

router.route("/all-active-project").get(getActiveProjects);
router.route("/:canvasId").get(getProjectById);
router.route("/:projectId/status").patch(updateProjectStatus);
router.route("/view/gallery").get(getGalleryProjects);
router.route('/remove-contributor').patch(
        // Step 1: Check karein ke user logged-in hai
    projectOwnerMiddleware, // Step 2: Check karein ke user is project ka owner hai
    removeContributor       // Step 3: Agar dono check pass hon to hi controller chalega
);
router.route("/:projectId/contributors").post(
    addContributorsToProject
);

export default router;
