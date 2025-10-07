import mongoose from "mongoose";
import { io } from "../../server.js";
import { User } from "../models/auth.model.js";
import Notification from "../models/notification.model.js";
import Project from "../models/project.model.js";
import { ApiError, ApiResponse } from "../utils/api.utils.js";
import Contribution from '../models/contributor.model.js'; // Humara naya, unified model
import DrawingLog from '../models/drawingLog.model.js';
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

        // Check for duplicate canvasId
        const existingProject = await Project.findOne({ canvasId });
        if (existingProject) {
            throw new ApiError(400, "A project with this Title already exists.");
        }

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
            width: 2560,
            height: 2560,
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


// export const getActiveProjects = async (req, res, next) => {
//     try {
//         // --- Step 1: Frontend se anay walay तमाम Query Parameters ko hasil karein ---
//         const page = parseInt(req.query.page) || 1;       // Page number, default 1
//         const limit = parseInt(req.query.limit) || 9;      // Kitne items per page, default 9
//         const status = req.query.status;                 // 'active' ya 'paused'
//         const searchQuery = req.query.search;            // User ka search text

//         // --- Step 2: Mongoose ke liye ek dynamic 'filter' object banayein ---
//         const filter = {
//             status: { $in: ['Active', 'Paused'] } // 'Active' ya 'Paused' dono dikhayein
//         };

//         if (statusFilter === 'active') {
//             filter.status = 'Active';
//         } else if (statusFilter === 'paused') {
//             filter.status = 'Paused';
//         }

//         // Agar 'status' undefined ya 'all' hai, to hum is filter ko nahi lagayenge

//         // Agar frontend se search query aayi hai
//         if (searchQuery) {
//             // Hum 'title' field par ek case-insensitive search lagayenge
//             filter.title = { $regex: searchQuery, $options: 'i' };
//         }

//         // --- Step 3: Database se data fetch karein (Pagination ke saath) ---
//         const skip = (page - 1) * limit;

//         const projects = await Project.find(filter)
//             .sort({ createdAt: -1 }) // Hamesha naye projects pehle dikhayein
//             .skip(skip)
//             .limit(limit)
//         // .select("-contributors"); // List page par contributors ki zaroorat nahi

//         // --- Step 4: Is filter ke mutabiq total projects ki tadaad hasil karein ---
//         // Yeh pagination ke liye bohat zaroori hai
//         const totalProjects = await Project.countDocuments(filter);
//         // --- Step 5: Frontend ke liye ek behtareen response banayein ---
//         res.status(200).json(new ApiResponse(200, {
//             projects,
//             currentPage: page,
//             totalPages: Math.ceil(totalProjects / limit),
//             totalProjects: totalProjects
//         }, "Fetched active projects successfully"));

//     } catch (err) {
//         next(err);
//     }
// };
export const getActiveProjects = async (req, res, next) => {
    try {
        // --- Step 1: Frontend se anay walay तमाम Query Parameters ko hasil karein ---
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const statusFilter = req.query.status; // <-- Variable ka naam 'statusFilter' rakhein
        const searchQuery = req.query.search;

        // --- Step 2: Mongoose ke liye ek dynamic 'filter' object banayein ---
        const filter = {}; // <-- Shuru mein khali object rakhein

        // --- YEH NAYI, BEHTAR LOGIC HAI ---
        // Ab hum filter ko dynamically banayenge
        if (statusFilter === 'active') {
            filter.status = 'Active';
        } else if (statusFilter === 'paused') {
            filter.status = 'Paused';
        } else {
            // Agar status 'all' hai ya nahi bheja gaya, to 'Active' aur 'Paused' dono dhoondein
            filter.status = { $in: ['Active', 'Paused'] };
        }

        // Agar frontend se search query aayi hai
        if (searchQuery) {
            filter.title = { $regex: searchQuery, $options: 'i' };
        }

        // --- Baaki ka code bilkul theek hai (No Change) ---

        // Step 3: Database se data fetch karein
        const skip = (page - 1) * limit;
        const projects = await Project.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Step 4: Total projects ki tadaad hasil karein
        const totalProjects = await Project.countDocuments(filter);

        // Step 5: Response bhejein
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
        const project = await Project.findOne({ canvasId });

        if (!project) {
            throw new ApiError(404, "Project not found");
        }

        res.status(200).json(new ApiResponse(200, project, "Project found"));
    } catch (err) {
        next(err);
    }
};


export const updateProjectTitle = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { payload } = req.body;
        const { title, userId } = payload || {};
        // --- Validation ---
        if (!title || title.trim() === '') {
            throw new ApiError(400, "Title cannot be empty.");
        }

        // Project ko database se find karein
        const project = await Project.findById(projectId);
        if (!project) {
            throw new ApiError(404, "Project not found.");
        }


        // Title ko update karein
        project.title = title.trim();
        const updatedProject = await project.save();

        res.status(200).json(new ApiResponse(200, updatedProject, "Project title updated successfully."));

    } catch (err) {
        next(err);
    }
};
export const updateProjectStatus = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { status } = req.body; // Frontend se ab 'status' aayega

        // Check karein ke frontend se aane wala status valid hai ya nahi
        if (!['Active', 'Paused', 'Completed'].includes(status)) {
            throw new ApiError(400, "Invalid status provided. Must be 'Active', 'Paused', or 'Completed'.");
        }

        const projectBeforeUpdate = await Project.findById(projectId).select('status title');

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { $set: { status: status } }, // Sirf 'status' field ko update karein
            { new: true }
        );

        if (!updatedProject) {
            throw new ApiError(404, "Project not found.");
        }

        // --- REAL-TIME LOGIC ---
        let eventName = '';
        let notificationMessage = '';

        if (status === 'Paused') {
            eventName = 'project_paused';
            notificationMessage = `The project "${updatedProject.title}" has been paused.`;
        } else if (status === 'Completed') {
            eventName = 'project_completed';
            notificationMessage = `The project "${updatedProject.title}" is now complete!`;
        } else if (status === 'Active' && projectBeforeUpdate?.status === 'Paused') {
            eventName = 'project_resumed';
            notificationMessage = `The project "${updatedProject.title}" has been resumed.`;
        }

        if (eventName) {

            console.log(`-----------------------------------------`);
            console.log(`[Backend] Preparing to emit event...`);
            console.log(`[Backend] Event Name: ${eventName}`);
            console.log(`[Backend] Project ID (Room): ${projectId.toString()}`);
            console.log(`[Backend] Is io defined?`, !!io); // Yeh 'true' hona chahiye


            io.to(projectId.toString()).emit(eventName, {
                projectId: projectId,
                message: notificationMessage
            });


            console.log(`[Backend] Event emitted successfully.`);
            console.log(`-----------------------------------------`);
        }

        res.status(200).json(new ApiResponse(200, updatedProject, `Project status updated to ${status}.`));

    } catch (err) { next(err); }
};

export const getGalleryProjects = async (req, res, next) => {
    try {
        // --- Step 1: Frontend se pagination ke parameters hasil karein ---
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9; // Aap page par kitne project dikhana chahte hain
        const skip = (page - 1) * limit;

        // --- Step 2: Filter object banayein (sirf 'Completed' projects) ---
        // Hum 'isClosed' ke bajaye naye 'status' field ko istemal karenge
        const filter = { status: 'Completed' };

        // --- Step 3: Database se data fetch karein (Pagination ke saath) ---
        const projects = await Project.find(filter)
            .sort({ updatedAt: -1 }) // Sab se naye completed projects pehle
            .skip(skip)
            .limit(limit)
            .select("-contributors"); // Gallery list par contributors ki zaroorat nahi

        // --- Step 4: Is filter ke mutabiq total projects ki tadaad hasil karein ---
        const totalProjects = await Project.countDocuments(filter);

        // --- Step 5: Frontend ke liye mukammal response banayein ---
        res.status(200).json(new ApiResponse(200, {
            projects,
            currentPage: page,
            totalPages: Math.ceil(totalProjects / limit),
            totalProjects: totalProjects
        }, "Fetched gallery projects successfully."));

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

        // --- Step 1: Tamam zaroori data pehle hasil karein ---
        const project = await Project.findById(projectId).select('bannedUsers title ownerId'); // bannedUsers ko select karein
        if (!project) {
            throw new ApiError(404, "Project not found.");
        }

        const joiningUser = await User.findById(userId).select('fullName email avatar _id role');
        if (!joiningUser) {
            throw new ApiError(404, "User not found.");
        }

        // --- NAYA LOGIC: Step 2 - Check karein ke user banned to nahi hai ---
        const isBanned = project.bannedUsers.some(bannedId => bannedId.equals(userId));
        if (isBanned) {
            // Agar user banned hai, to usay project join na karne dein
            throw new ApiError(403, "You have been removed from this project and cannot rejoin.");
        }
        // --- BAN CHECK MUKAMMAL ---


        // (Commented out) 10 project wala limit check yahan tha, jo hum ne hata diya hai
        // if (joiningUser.role !== 'admin') { ... }


        // --- Step 3: Database ko Update Karein ---
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { $addToSet: { contributors: userId } },
            { new: true } // Hamein updated document wapas do
        ).populate('ownerId contributors', 'fullName email avatar _id'); // Owner aur contributors dono ko populate karein


        if (!updatedProject) {
            throw new ApiError(404, "Project not found or could not be updated.");
        }

        // --- Step 4: Real-time Events aur Notifications ---

        // Event 1: Naye contributor ki khabar
        io.to(projectId.toString()).emit('contributor_joined', {
            projectId: projectId,
            newContributor: joiningUser // Hum ne 'joiningUser' pehle hi hasil kar liya tha
        });

        // Event 2: Purane members ko notification bhejna
        // (Aapka notification logic bilkul theek hai, usay waisa hi rakhein)
        const recipientSet = new Set();
        recipientSet.add(updatedProject.ownerId._id.toString());
        updatedProject.contributors.forEach(c => recipientSet.add(c._id.toString()));
        recipientSet.delete(joiningUser._id.toString());
        const finalRecipients = [...recipientSet];

        const notificationMessage = `${joiningUser.fullName} has joined the project "${updatedProject.title}".`;

        if (finalRecipients.length > 0) {
            const notificationsToCreate = finalRecipients.map(id => ({
                recipient: id,
                sender: joiningUser._id,
                type: 'NEW_CONTRIBUTOR',
                message: notificationMessage,
                project: updatedProject._id
            }));
            const newNotifications = await Notification.insertMany(notificationsToCreate);

            const projectInfoForSocket = {
                _id: updatedProject._id,
                canvasId: updatedProject.canvasId, // canvasId zaroori hai
                title: updatedProject.title
            };

            newNotifications.forEach(notification => {
                const notificationToSend = notification.toObject();
                notificationToSend.project = projectInfoForSocket;
                io.to(notification.recipient.toString()).emit('new_notification', notificationToSend);
            });
        }

        // --- Step 5: Aakhir mein HTTP Response ---
        res.status(200).json(new ApiResponse(200, updatedProject, "Successfully joined project."));

    } catch (err) {
        next(err);
    }
};
export const addContributorsToProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { userIdsToAdd, ownerId } = req.body; // Frontend se user IDs ka array aayega


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
                project: projectId,
                canvasId: project.canvasId
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
                    project: projectId,
                    canvasId: project.canvasId

                });
            }
        });

        // Tamam notifications ko database mein daalein aur socket par emit karein
        if (notificationsToCreate.length > 0) {
            const createdNotifications = await Notification.insertMany(notificationsToCreate);
            for (const notification of createdNotifications) {
                // Ek naya object banayein jo frontend ke liye tayar ho
                const populatedNotification = {
                    ...notification.toObject(),
                    project: { // 'project' field ko replace karein
                        _id: project._id,
                        canvasId: project.canvasId, // <-- canvasId add karein
                        title: project.title
                    }
                };
                io.to(notification.recipient.toString()).emit('new_notification', populatedNotification);
            }
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
        const { projectId, userIdToRemove, userId } = req.body;
        // Hum 'req.user' se admin ki details lenge, na ke 'req.body.userId' se
        const removedByAdmin = userId;

        if (!removedByAdmin) {
            throw new ApiError(401, "Admin user not authenticated.");
        }

        // Step 1: Frontend se anay wali string IDs ko ObjectId mein convert karein
        const projectObjectId = new mongoose.Types.ObjectId(projectId);
        const userObjectIdToRemove = new mongoose.Types.ObjectId(userIdToRemove);

        // --- NAYA LOGIC: Step 1 - User ki tamam contributions ko delete karein ---
        // Pehle dhoondein taake hum stats update kar sakein (optional)
        const contributionsToDelete = await Contribution.find({
            projectId: projectObjectId,
            userId: userObjectIdToRemove
        }).select('_id');

        const contributionIdsToDelete = contributionsToDelete.map(c => c._id);


        if (contributionsToDelete.length > 0) {


            // Drawing logs ko delete karein
            const contributionResult = await Contribution.deleteMany({
                projectId: projectObjectId,
                userId: userObjectIdToRemove
            });
            console.log(`[Purge] Deleted ${contributionResult.deletedCount} timelapse logs for user ${userIdToRemove}`);

            // Ab asal contributions ko delete karein

            // Drawing logs ko delete karein
            const logResult = await DrawingLog.deleteMany({
                projectId: projectObjectId,
                userId: userObjectIdToRemove
            });

            console.log(`[Purge] Deleted ${logResult.deletedCount} timelapse logs for user ${userIdToRemove}`);
        }
        // --- DELETION LOGIC MUKAMMAL ---


        // --- NAYA LOGIC: Step 2 - User ko 'contributors' se nikaalein aur 'bannedUsers' mein daalein ---
        const project = await Project.findByIdAndUpdate(
            projectId,
            {
                $pull: { contributors: userIdToRemove },
                $addToSet: { bannedUsers: userIdToRemove } // <-- User ko ban list mein daalein
            },
            { new: true }
        );

        if (!project) {
            throw new ApiError(404, "Project not found.");
        }

        // --- REAL-TIME EVENTS (Bilkul Theek hain - No Change) ---
        // Event 1: Tamam members ko batayein
        io.to(projectId.toString()).emit('contributor_removed', {
            projectId: projectId,
            removedUserId: userIdToRemove
        });

        // Event 2: Sirf remove kiye gaye user ko batayein
        io.to(userIdToRemove.toString()).emit('permissions_revoked', {
            projectId: projectId,
            message: `You have been removed from the project "${project.title}" by ${removedByAdmin.fullName}. All your contributions have been deleted.` // <-- Message update karein
        });

        // Event 3: Tamam members ko batayein ke kaun si contributions delete hui hain
        if (contributionIdsToDelete.length > 0) {
            io.to(projectId.toString()).emit('contributions_purged', {
                projectId: projectId,
                deletedContributionIds: contributionIdsToDelete // Deleted IDs ka array bhejein
            });
            console.log(`[Socket] Emitted 'contributions_purged' for ${contributionIdsToDelete.length} contributions.`);
        }


        // --- NOTIFICATION (Bilkul Theek hai - No Change, lekin message behtar banayein) ---
        const notification = await Notification.create({
            recipient: userIdToRemove,
            sender: removedByAdmin._id,
            type: 'CONTRIBUTOR_REMOVED',
            message: `You and all of your contributions have been removed from the project "${project.title}".`,
            project: projectId
        });
        io.to(userIdToRemove.toString()).emit('new_notification', notification);


        res.status(200).json(new ApiResponse(
            200,
            { userIdToRemove: userIdToRemove }, // <-- Response format theek hai
            "Contributor and all their contributions have been successfully purged." // <-- Response message update karein
        ));

    } catch (err) {
        next(err);
    }
};


export const deleteProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        await Contribution.deleteMany({ projectId: projectId });
        await DrawingLog.deleteMany({ projectId: projectId }); // Timelapse data bhi delete karein

        const deletedProject = await Project.findByIdAndDelete(projectId);

        if (!deletedProject) throw new ApiError(404, "Project not found.");

        // --- REAL-TIME EVENT ADD KAREIN ---
        io.emit('project_deleted', {
            projectId: projectId,
            message: `The project "${deletedProject.title}" has been deleted.`
        });

        res.status(200).json(new ApiResponse(200, { projectId }, "Project deleted successfully."));
    } catch (err) { next(err); }
};



