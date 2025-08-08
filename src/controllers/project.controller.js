import Project from "../models/project.model.js";
import { ApiError, ApiResponse } from "../utils/api.utils.js";

// Create a new project
export const createProject = async (req, res, next) => {
    try {
        const {
            title,
            description,
            width,
            height,
            palette,
            targetCompletionDate,
            thumbnailUrl,
            baseImageUrl,
            userId
        } = req.body;


        
        if (!userId) {
            throw new ApiError(401, "Unauthorized user");
        }

        const project = new Project({
            title,
            description,
            width,
            height,
            palette,
            targetCompletionDate,
            thumbnailUrl,
            baseImageUrl,
            ownerId: userId,
            contributors: [
                {
                    userId,
                    role: "project_owner", // default role of the creator
                    joinedAt: new Date()
                }
            ]
        });

        await project.save();

        res
            .status(201)
            .json(new ApiResponse(201, project, "Project created successfully"));
    } catch (err) {
        next(err);
    }
};

// Get all active projects
export const getActiveProjects = async (req, res, next) => {
    try {
        const projects = await Project.find({ isClosed: false })
            .select("-contributors") // optional: exclude large fields
            .sort({ createdAt: -1 });

        res
            .status(200)
            .json(new ApiResponse(200, projects, "Fetched active projects"));
    } catch (err) {
        next(err);
    }
};

// Get single project by ID
export const getProjectById = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId).populate(
            "contributors.userId",
            "fullName email"
        );

        if (!project) {
            throw new ApiError(404, "Project not found");
        }

        res.status(200).json(new ApiResponse(200, project, "Project found"));
    } catch (err) {
        next(err);
    }
};

