import express from "express";
import { createProject, getActiveProjects, getProjectById } from "../controllers/project.controller.js";

const router = express.Router();

router.post("/create", createProject);
router.get("/", getActiveProjects);
router.get("/:projectId", getProjectById);

export default router;
