import express from "express";
import { createProject, getActiveProjects, getProjectById, joinProject } from "../controllers/project.controller.js";
import {upload} from './../middlewares/multer.middleware.js';

const router = express.Router();

router.route("/create").post(upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "baseImage", maxCount: 1 },
]), createProject);

router.route("/:projectId/join").post(joinProject);

router.route("/").get(getActiveProjects);
router.route("/:projectId").get(getProjectById);

export default router;
