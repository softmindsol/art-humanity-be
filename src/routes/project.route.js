import express from "express";
import { createProject, getActiveProjects, getProjectById } from "../controllers/project.controller.js";
import {upload} from './../middlewares/multer.middleware.js';

const router = express.Router();

router.post("/create", upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "baseImage", maxCount: 1 },
]), createProject);
router.get("/", getActiveProjects);
router.get("/:projectId", getProjectById);

export default router;
