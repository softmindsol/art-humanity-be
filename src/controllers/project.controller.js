import Project from "../models/project.model.js";
import { ApiError, ApiResponse } from "../utils/api.utils.js";

// Create a new project

// Create a new project
export const createProject = async (req, res, next) => {
    try {
        const {
            title,
            description,
            width,
            height,
            canvasId,
            targetCompletionDate,
            thumbnailUrl, // optional: if user pastes a URL instead of uploading
            baseImageUrl, // optional
            userId,
        } = req.body;

        if (!userId) throw new ApiError(401, "Unauthorized user");
        if (!title) throw new ApiError(400, "Title is required");

        // Build base for public URLs
        const publicBase = `${req.protocol}://${req.get("host")}/public/uploads/projects`;

        // If files were uploaded via multer, prefer those
        const uploadedThumb = req.files?.thumbnail?.[0];
        const uploadedBase = req.files?.baseImage?.[0];

        const finalThumbnailUrl = uploadedThumb
            ? `${publicBase}/${uploadedThumb.filename}`
            : (thumbnailUrl || ""); // fallback to provided URL

        const finalBaseImageUrl = uploadedBase
            ? `${publicBase}/${uploadedBase.filename}`
            : (baseImageUrl || "");


        const project = new Project({
            title,
            description,
            width: Number(width) || 0,
            height: Number(height) || 0,
            canvasId,
            targetCompletionDate: targetCompletionDate || null,
            thumbnailUrl: finalThumbnailUrl,
            baseImageUrl: finalBaseImageUrl,
            ownerId: userId,
            contributors: [

            ],
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
        const { canvasId } = req.params;
        console.log(canvasId)
        const project = await Project.findOne({canvasId});

        if (!project) {
            throw new ApiError(404, "Project not found");
        }

        res.status(200).json(new ApiResponse(200, project, "Project found"));
    } catch (err) {
        next(err);
    }
};

export const joinProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.body; // Auth middleware se user ki ID hasil karein

        if (!userId) {
            throw new ApiError(401, "Unauthorized. Please log in to join the project.");
        }

        // $addToSet operator ka istemal karein.
        // Yeh userId ko 'contributors' array mein sirf tab add karega agar woh pehle se mojood na ho.
        // Yeh race conditions se bachata hai aur code ko saaf rakhta hai.
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { $addToSet: { contributors: userId } },
            { new: true } // Yeh option zaroori hai taake Mongoose updated document wapas bheje
        );

        if (!updatedProject) {
            throw new ApiError(404, "Project not found.");
        }

        // Project ke stats mein contributor count ko bhi update karein.

        updatedProject.stats.contributorCount = updatedProject.contributors.length;
        await updatedProject.save();

        res.status(200).json(new ApiResponse(200, updatedProject, "Successfully joined the project as a contributor."));

    } catch (err) {
        next(err);
    }
};


// --- ADD THIS NEW CONTROLLER FUNCTION ---
export const updateProjectStatus = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        // We will only allow specific fields to be updated through this route
        const { isPaused, isClosed } = req.body;

        // Build an object with only the fields that were provided in the request
        const updateData = {};
        if (typeof isPaused !== 'undefined') {
            updateData.isPaused = isPaused;
        }
        if (typeof isClosed !== 'undefined') {
            updateData.isClosed = isClosed;
        }

        // Check if there is anything to update
        if (Object.keys(updateData).length === 0) {
            throw new ApiError(400, "No valid fields provided for update.");
        }

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { $set: updateData }, // Use $set to update only the provided fields
            { new: true }       // Return the updated document
        );

        if (!updatedProject) {
            throw new ApiError(404, "Project not found.");
        }

        res.status(200).json(new ApiResponse(200, updatedProject, "Project status updated successfully."));

    } catch (err) {
        next(err);
    }
};

export const getGalleryProjects = async (req, res, next) => {
    try {
        // Query database for projects where `isClosed` is true
        const projects = await Project.find({ isClosed: true })
            .select("-contributors") // We don't need the full contributor list on the gallery page
            .sort({ updatedAt: -1 }); // Show the most recently completed projects first

        res
            .status(200)
            .json(new ApiResponse(200, projects, "Fetched gallery projects successfully"));
    } catch (err) {
        next(err);
    }
};