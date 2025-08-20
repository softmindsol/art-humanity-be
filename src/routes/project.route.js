import express from "express";
import { createProject, getActiveProjects, getProjectById, joinProject, updateProjectStatus, getGalleryProjects } from "../controllers/project.controller.js";
import { upload } from './../middlewares/multer.middleware.js';

const router = express.Router();

router.route("/create").post(upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "baseImage", maxCount: 1 },
]), createProject);

router.route("/:projectId/join").post(joinProject);

router.route("/all-active-project").get(getActiveProjects);
router.route("/:canvasId").get(getProjectById);
router.route("/:projectId/status").patch(updateProjectStatus);
router.route("/view/gallery").get(getGalleryProjects);

export default router;
