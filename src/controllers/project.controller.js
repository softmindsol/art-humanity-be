import mongoose from "mongoose";
import { io } from "../../server.js";
import { User } from "../models/auth.model.js";
import Notification from "../models/notification.model.js";
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
        // --- Step 1: Frontend se anay walay तमाम Query Parameters ko hasil karein ---
        const page = parseInt(req.query.page) || 1;       // Page number, default 1
        const limit = parseInt(req.query.limit) || 9;      // Kitne items per page, default 9
        const status = req.query.status;                 // 'active' ya 'paused'
        const searchQuery = req.query.search;            // User ka search text

        // --- Step 2: Mongoose ke liye ek dynamic 'filter' object banayein ---
        const filter = {
            isClosed: false // Hum gallery wale projects (isClosed: true) nahi chahte
        };

        // Agar frontend se status ka filter aaya hai
        if (status === 'active') {
            filter.isPaused = false;
        } else if (status === 'paused') {
            filter.isPaused = true;
        }
        // Agar 'status' undefined ya 'all' hai, to hum is filter ko nahi lagayenge

        // Agar frontend se search query aayi hai
        if (searchQuery) {
            // Hum 'title' field par ek case-insensitive search lagayenge
            filter.title = { $regex: searchQuery, $options: 'i' };
        }

        // --- Step 3: Database se data fetch karein (Pagination ke saath) ---
        const skip = (page - 1) * limit;

        const projects = await Project.find(filter)
            .sort({ createdAt: -1 }) // Hamesha naye projects pehle dikhayein
            .skip(skip)
            .limit(limit)
            .select("-contributors"); // List page par contributors ki zaroorat nahi

        // --- Step 4: Is filter ke mutabiq total projects ki tadaad hasil karein ---
        // Yeh pagination ke liye bohat zaroori hai
        const totalProjects = await Project.countDocuments(filter);

        // --- Step 5: Frontend ke liye ek behtareen response banayein ---
        res.status(200).json(new ApiResponse(200, {
            projects,
            currentPage: page,
            totalPages: Math.ceil(totalProjects / limit),
            totalProjects: totalProjects
        }, "Fetched active projects successfully"));

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

export const getProjectContributors = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId)
            .populate('contributors', 'fullName email avatar')
            .select('contributors ownerId'); // <-- Hum 'ownerId' ko bhi select karenge

        if (!project) {
            throw new ApiError(404, "Project not found.");
        }

        // --- YEH HAI ASAL FIX ---
        // 'contributors' array ko filter karein taake ismein owner shamil na ho
        const contributorsWithoutOwner = project.contributors.filter(contributor => {
            // Har contributor ki ID ko project ki ownerId se compare karein
            // .equals() method Mongoose ObjectIDs ko sahi se compare karta hai
            return !contributor._id.equals(project.ownerId);

            // Agar aap IDs ko string mein convert karke compare karna chahte hain (yeh bhi theek hai):
            // return contributor._id.toString() !== project.ownerId.toString();
        });

        // Response mein filtered list bhejein
        res.status(200).json(new ApiResponse(
            200,
            contributorsWithoutOwner, // <-- Filtered array
            "Contributors fetched successfully."
        ));

    } catch (err) {
        next(err);
    }
};


export const joinProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            throw new ApiError(400, "User ID is required to join the project.");
        }
   
        const user = await User.findById(userId).select('role');
        if (!user) {
            throw new ApiError(404, "User not found.");
        }
        // if (user.role !== 'admin') {

        //     // --- YEH HAI ASAL FIX ---
        //     // Step 1: Frontend se aane wali string ID ko ObjectId mein convert karein
        //     const userObjectId = new mongoose.Types.ObjectId(userId);
        //     // Step 2: Ab query mein is converted ObjectId ko istemal karein
        //     const projectsCount = await Project.countDocuments({
        //         contributors: userObjectId, // <-- Converted ObjectId istemal karein
        //         isClosed: false,
        //         isPaused: false            });

        //     console.log(`[Debug] User ${userId} is in ${projectsCount} active projects.`); // Debugging ke liye

        //     const MAX_PROJECTS_LIMIT = 10;

        //     if (projectsCount >= MAX_PROJECTS_LIMIT) {
        //         throw new ApiError(403, `You have reached the maximum limit of ${MAX_PROJECTS_LIMIT} active projects.`);
        //     }
        // }

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { $addToSet: { contributors: userId } },
            { new: true }
        ).populate('ownerId contributors');

        if (!updatedProject) {
            throw new ApiError(404, "Project not found.");
        }

        const joiningUser = await User.findById(userId).lean();
        if (!joiningUser) {
            return res.status(200).json(new ApiResponse(200, updatedProject, "Successfully joined project (user not found for notification)."));
        }


        // (1) Tamam potential recipients ko ek Set mein daalein taake duplicates na aayein
        const recipientSet = new Set();

        // (2) Owner ko add karein
        recipientSet.add(updatedProject.ownerId._id.toString());

        // (3) Tamam contributors ko add karein
        updatedProject.contributors.forEach(c => recipientSet.add(c._id.toString()));

        // (4) Ab is Set mein se join karne wale user ko nikaal dein
        recipientSet.delete(joiningUser._id.toString());

        // (5) Set ko wapas ek array mein tabdeel kar dein
        const finalRecipients = [...recipientSet];

        console.log("Final Recipients for Notification:", finalRecipients);
        // --- NOTIFICATION LOGIC KHATM ---

        const notificationMessage = `${joiningUser.fullName} has joined the project "${updatedProject.title}".`;

        // Agar recipients hain, tab hi notifications banayein
        if (finalRecipients.length > 0) {
            const notificationsToCreate = finalRecipients.map(id => ({
                recipient: id,
                sender: joiningUser._id,
                type: 'NEW_CONTRIBUTOR',
                message: notificationMessage,
                project: updatedProject._id
            }));

            const newNotifications = await Notification.insertMany(notificationsToCreate);

            newNotifications.forEach(notification => {
                io.to(notification.recipient.toString()).emit('new_notification', notification);
            });
            console.log(`Sent ${newNotifications.length} real-time notifications.`);
        } else {
            console.log("No recipients to notify.");
        }

        res.status(200).json(new ApiResponse(200, updatedProject, "Successfully joined project."));

    } catch (err) {
        next(err);
    }
};

export const addContributorsToProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { userIdsToAdd,ownerId } = req.body; // Frontend se user IDs ka array aayega
        

        if (!userIdsToAdd || !Array.isArray(userIdsToAdd) || userIdsToAdd.length === 0) {
            throw new ApiError(400, "User IDs array is required.");
        }

        const project = await Project.findById(projectId);
        if (!project) {
            throw new ApiError(404, "Project not found.");
        }


        // Purane contributors ki list nikaal lein (notification ke liye)
        const oldContributors = project.contributors.map(id => id.toString());

        // Naye users ko project mein add karein ($addToSet duplicates ko rokta hai)
        await Project.findByIdAndUpdate(projectId, {
            $addToSet: { contributors: { $each: userIdsToAdd } }
        });

        // --- NOTIFICATION LOGIC ---
        const notificationsToCreate = [];

        // Notification 1: Naye add hone wale users ko bhejein
        userIdsToAdd.forEach(userId => {
            notificationsToCreate.push({
                recipient: userId,
                sender: ownerId,
                type: 'ADDED_TO_PROJECT', // Naya type
                message: `You have been added to the project "${project.title}" by Admin.`,
                project: projectId
            });
        });

        // Notification 2: Purane contributors ko bhejein
        const newUsers = await User.find({ _id: { $in: userIdsToAdd } }).select('fullName');
        const newUsersNames = newUsers.map(u => u.fullName).join(', ');

        oldContributors.forEach(userId => {
            // Sirf purane users ko notify karein, naye ko nahi
            if (!userIdsToAdd.includes(userId)) {
                notificationsToCreate.push({
                    recipient: userId,
                    sender: ownerId,
                    type: 'NEW_CONTRIBUTOR',
                    message: `${newUsersNames} has been added to the project "${project.title}".`,
                    project: projectId
                });
            }
        });

        // Tamam notifications ko database mein daalein aur socket par emit karein
        if (notificationsToCreate.length > 0) {
            const createdNotifications = await Notification.insertMany(notificationsToCreate);
            createdNotifications.forEach(notification => {
                io.to(notification.recipient.toString()).emit('new_notification', notification);
            });
        }

        // Kamyabi ka response
        const updatedProject = await Project.findById(projectId).populate('contributors', 'fullName email avatar');

        res.status(200).json(new ApiResponse(200, updatedProject, "Contributors added successfully."));

    } catch (err) {
        next(err);
    }
};

export const removeContributor = async (req, res, next) => {
    try {
        const { projectId, userIdToRemove,userId } = req.body;
        const removedBy = userId; // Admin/Owner

        const project = await Project.findByIdAndUpdate(
            projectId,
            { $pull: { contributors: userIdToRemove } },
            { new: true }
        );

        if (!project) throw new ApiError(404, "Project not found.");

        // Contributor ko notification bhejein
        const notification = await Notification.create({
            recipient: userIdToRemove,
            sender: removedBy._id,
            type: 'CONTRIBUTOR_REMOVED',
            message: `You have been removed from the project "${project.title}" by the owner.`,
            project: projectId
        });

        io.to(userIdToRemove.toString()).emit('new_notification', notification);

        res.status(200).json(new ApiResponse(200, { projectId, userIdToRemove }, "Contributor removed successfully."));
    } catch (err) { next(err); }
};