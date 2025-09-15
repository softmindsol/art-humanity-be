import Contribution from '../models/contributor.model.js'; // Humara naya, unified model
import { ApiError, ApiResponse } from "../utils/api.utils.js";

import Project from "../models/project.model.js";
import drawingLogModel from '../models/drawingLog.model.js';
import { generateThumbnail } from '../utils/generateThumbnail.utils.js';
import { io } from '../../server.js';

const TILE_SIZE = 512;


// 1. Nayi Contribution Save Karne ke liye
export const createContribution = async (req, res, next) => {
    try {
        const { projectId, strokes, userId } = req.body;

        // Step 1: Thumbnail generate karein
        const thumbnailUrl = await generateThumbnail(strokes);
        if (!projectId || !strokes || !Array.isArray(strokes) || strokes.length === 0) {
            throw new ApiError(400, "Project ID and a non-empty strokes array are required.");
        }

        // Naya contribution document banayein
        const newContribution = new Contribution({
            projectId,
            userId,
            strokes: strokes, // Frontend se poora strokes ka array yahan save hoga
            thumbnailUrl
        });

        const savedContribution = await newContribution.save();

        const project = await Project.findById(projectId);
        if (project) {
            // Step 3: Is nayi contribution mein "pixels" (segments) ki tadaad calculate karein
            const pixelsInThisContribution = strokes.reduce((total, stroke) => {
                return total + (stroke.strokePath?.length || 0);
            }, 0);

            // Step 4: Project ke stats ko update karein
            project.stats.pixelCount = (project.stats.pixelCount || 0) + pixelsInThisContribution;

            // Contributor count pehle se hi 'joinProject' mein handle ho raha hai,
            // lekin hum yahan se bhi usay sync mein rakh sakte hain.
            project.stats.contributorCount = project.contributors.length;

            // Step 5: Percentage complete calculate karein
            const totalCanvasPixels = project.width * project.height; // Farz karein har pixel 1 unit hai
            if (totalCanvasPixels > 0) {
                const percentage = (project.stats.pixelCount / totalCanvasPixels) * 100;
                project.stats.percentComplete = Math.min(100, percentage); // 100 se zyada na ho
            }

            // Step 6: Updated project ko database mein save karein
            await project.save();
            // Step 4: Populate user data before sending response
            const populatedContribution = await Contribution.findById(savedContribution._id)
                .populate('userId', 'fullName email')
                .lean();

            // Step 5: Response
            res.status(201).json(
                new ApiResponse(201, populatedContribution, "Contribution saved successfully.")
            );
        }


    } catch (err) {
        next(err);
    }
};

export const getProjectContributions = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        // --- STEP 1: Tamam Query Parameters ko Log Karein ---
        console.log("Received Query Parameters:", req.query);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { sortBy = 'newest', userId } = req.query;

        // --- STEP 2: Filter Object ko Banayein aur Log Karein ---
        // Ek base filter object banayein jo hamesha project ko filter karega
        const filter = { projectId: projectId };

        // Agar `userId` query parameter mojood hai aur khali nahi hai,
        // to usay filter mein shamil karein.
        if (userId && userId !== 'undefined' && userId !== 'null') {
            filter.userId = userId;
            console.log(`Filtering by userId: ${userId}`);
        } else {
            console.log("No userId provided, fetching for all users.");
        }

        console.log("Final Mongoose Filter Object:", filter);

        // --- STEP 3: Sorting Logic (waisi hi rahegi) ---
        let sortOptions = {};
        switch (sortBy) {
            case 'most-upvoted': sortOptions = { upvotes: -1 }; break;
            case 'most-downvoted': sortOptions = { downvotes: -1 }; break;
            case 'oldest': sortOptions = { createdAt: 1 }; break;
            case 'newest': default: sortOptions = { createdAt: -1 }; break;
        }

        // --- STEP 4: Database Query ---
        const contributions = await Contribution.find(filter)
            .populate('userId', 'fullName email')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        const totalContributions = await Contribution.countDocuments(filter);

        console.log(`Found ${contributions.length} contributions out of ${totalContributions} total.`);

        res.status(200).json(new ApiResponse(200, {
            contributions,
            currentPage: page,
            totalPages: Math.ceil(totalContributions / limit),
            totalContributions
        }, "Contributions fetched successfully."));

    } catch (err) {
        next(err);
    }
};


// export const getProjectContributions = async (req, res, next) => {
//     try {
//         const { projectId } = req.params;
//         const { tiles } = req.query; // e.g., "0-0,0-1,1-0"

//         if (!tiles) {
//             // Agar tiles nahi hain, to khali array bhejein taake ghalti se poora canvas na load ho
//             return res.status(200).json(new ApiResponse(200, { contributions: [] }));
//         }

//         const tileCoords = tiles.split(',').map(t => {
//             const [x, y] = t.split('-').map(Number);
//             return { tileX: x, tileY: y };
//         });

//         // Mongoose ke liye ek '$or' query banayein
//         const orConditions = tileCoords.map(coord => ({
//             'strokes.startX': { $gte: coord.tileX * TILE_SIZE, $lt: (coord.tileX + 1) * TILE_SIZE },
//             'strokes.startY': { $gte: coord.tileY * TILE_SIZE, $lt: (coord.tileY + 1) * TILE_SIZE }
//         }));

//         const filter = {
//             projectId: projectId,
//             ...(orConditions.length > 0 && { $or: orConditions })
//         };

//         const contributions = await Contribution.find(filter).populate('userId', 'fullName email');

//         res.status(200).json(new ApiResponse(200, { contributions }));

//     } catch (err) { next(err); }
// };





export const voteOnContribution = async (req, res, next) => {
    try {
        const { id: contributionId } = req.params;
        const { voteType, userId } = req.body;

        if (!userId) {
            throw new ApiError(401, "User not authenticated.");
        }
        if (!['up', 'down'].includes(voteType)) {
            throw new ApiError(400, "Invalid vote type.");
        }

        const contribution = await Contribution.findById(contributionId);
        if (!contribution) {
            throw new ApiError(404, "Contribution not found.");
        }

        // --- VOTE LOGIC (Bilkul Theek hai - No Change) ---
        const existingVoteIndex = contribution.voters.findIndex(voter => voter.userId.equals(userId));
        if (existingVoteIndex > -1) {
            const existingVote = contribution.voters[existingVoteIndex];
            if (existingVote.voteType !== voteType) {
                contribution[existingVote.voteType + 'votes'] -= 1;
                contribution[voteType + 'votes'] += 1;
                existingVote.voteType = voteType;
            } else {
                contribution[voteType + 'votes'] -= 1;
                contribution.voters.splice(existingVoteIndex, 1);
            }
        } else {
            contribution[voteType + 'votes'] += 1;
            contribution.voters.push({ userId, voteType });
        }

        const updatedContribution = await contribution.save();

        // --- Step 2: REAL-TIME LOGIC ---
        // Vote save hone ke foran baad, data ko populate karein aur event bhejein
        const populatedContributionForSocket = await Contribution.findById(updatedContribution._id)
            .populate('userId', 'fullName email'); // User details populate karein

        if (populatedContributionForSocket) {
            io.to(populatedContributionForSocket.projectId.toString()).emit('vote_updated', {
                contribution: populatedContributionForSocket
            });
            console.log(`[Socket] Emitted 'vote_updated' for contribution ${contributionId}`);
        }
        // --- REAL-TIME LOGIC MUKAMMAL ---


        // --- AUTO-DELETION LOGIC (Bilkul Theek hai - No Change) ---
        const { downvotes, _id, projectId } = updatedContribution;
        const project = await Project.findById(projectId).select('contributors');
        if (project) {
            const totalProjectContributors = project.contributors.length;
            if (totalProjectContributors > 0 && (downvotes / totalProjectContributors) > 0.5) {
                console.log(`[Moderation] Auto-deleting contribution ${_id}.`);
                await Contribution.findByIdAndDelete(_id);

                // Auto-delete hone par bhi real-time event bhejein
                io.to(projectId.toString()).emit('contribution_deleted', { contributionId: _id, projectId });

                return res.status(200).json(new ApiResponse(200,
                    { wasDeleted: true, contributionId: _id },
                    "Contribution auto-deleted due to high downvotes."
                ));
            }
        }

        // Agar delete nahi hua, to normal HTTP response bhejein
        // Hum yahan bhi populated data bhejenge taake voter ka UI foran update ho
        res.status(200).json(new ApiResponse(200, populatedContributionForSocket, "Vote registered successfully."));

    } catch (err) {
        next(err);
    }
};
// export const voteOnContribution = async (req, res, next) => {
//     try {
//         const { id: contributionId } = req.params;
//         const { voteType, userId } = req.body;

//         if (!userId) {
//             throw new ApiError(401, "User not authenticated.");
//         }
//         if (!['up', 'down'].includes(voteType)) {
//             throw new ApiError(400, "Invalid vote type.");
//         }

//         const contribution = await Contribution.findById(contributionId);
//         if (!contribution) {
//             throw new ApiError(404, "Contribution not found.");
//         }

//         // --- THE FIX IS HERE: `equals()` method istemal karein ---
//         // Yeh Mongoose ObjectIDs ko sahi tareeqe se compare karta hai
//         const existingVoteIndex = contribution.voters.findIndex(voter => voter.userId.equals(userId));

//         // Case 1: User ne pehle se vote kiya hua hai
//         if (existingVoteIndex > -1) {
//             const existingVote = contribution.voters[existingVoteIndex];

//             // Sub-Case A: User apna vote badal raha hai (up -> down or down -> up)
//             if (existingVote.voteType !== voteType) {
//                 // Purana vote count kam karein
//                 contribution[existingVote.voteType + 'votes'] -= 1;
//                 // Naya vote count barhayein
//                 contribution[voteType + 'votes'] += 1;
//                 // Voter list mein vote type update karein
//                 existingVote.voteType = voteType;
//             }
//             // Sub-Case B: User apna vote cancel kar raha hai (dobara same button dabaya)
//             else {
//                 // Purana vote count kam karein
//                 contribution[voteType + 'votes'] -= 1;
//                 // Voter ko list se nikaal dein
//                 contribution.voters.splice(existingVoteIndex, 1);
//             }
//         }
//         // Case 2: User pehli baar vote kar raha hai
//         else {
//             contribution[voteType + 'votes'] += 1;
//             contribution.voters.push({ userId, voteType });
//         }

//         const updatedContribution = await contribution.save();

//         // --- YAHAN PAR NAYI DELETION LOGIC HAI ---
//         const { downvotes, _id, projectId } = updatedContribution;

//         // Step 1: Is contribution ke project ke total contributors ki tadaad hasil karein.
//         const project = await Project.findById(projectId).select('contributors');
//         if (!project) {
//             // Agar project nahi milta to aage na barhein
//             return res.status(200).json(new ApiResponse(200, updatedContribution, "Vote registered successfully."));
//         }

//         const totalProjectContributors = project.contributors.length;

//         // Step 2: Client ki di hui condition ko check karein.
//         // Yaqeeni banayein ke kam se kam 1 contributor ho taake zero se divide na ho.
//         if (totalProjectContributors > 0 && (downvotes / totalProjectContributors) > 0.5) {

//             console.log(`[Moderation] Auto-deleting contribution ${_id}. Downvotes (${downvotes}) exceeded 50% of total contributors (${totalProjectContributors}).`);
//             await Contribution.findByIdAndDelete(_id);

//             // Frontend ko batayein ke contribution delete ho gaya hai
//             return res.status(200).json(new ApiResponse(200,
//                 { wasDeleted: true, contributionId: _id },
//                 "Contribution auto-deleted due to high downvotes from project contributors."
//             ));
//         }

//         // Agar delete nahi hua, to normal response bhejein
//         res.status(200).json(new ApiResponse(200, updatedContribution, "Vote registered successfully."));

//     } catch (err) {
//         next(err);
//     }
// }

// Naya controller function add karein
// export const deleteContribution = async (req, res, next) => {
//     try {
//         const { id: contributionId } = req.params;

//         const deletedContribution = await Contribution.findByIdAndDelete(contributionId);

//         if (!deletedContribution) {
//             throw new ApiError(404, "Contribution not found.");
//         }

//         res.status(200).json(new ApiResponse(200,
//             { contributionId: deletedContribution._id },
//             "Contribution deleted successfully by admin."
//         ));
//     } catch (err) {
//         next(err);
//     }
// };

// export const deleteContribution = async (req, res, next) => {
//     try {
//         const { id: contributionId } = req.params;
//         const deletedContribution = await Contribution.findByIdAndDelete(contributionId);

//         if (!deletedContribution) {
//             throw new ApiError(404, "Contribution not found.");
//         }

//         // --- YEH NAYA LOGIC HAI ---
//         // Tamam clients ko jo is project room mein hain, batayein ke yeh contribution delete ho gayi hai
//         io.to(deletedContribution.projectId.toString()).emit('contribution_deleted', {
//             contributionId: deletedContribution._id
//         });

//         res.status(200).json(new ApiResponse(200,
//             { contributionId: deletedContribution._id },
//             "Contribution deleted successfully."
//         ));
//     } catch (err) {
//         next(err);
//     }
// };

export const deleteContribution = async (req, res, next) => {
    try {
        const { id: contributionId } = req.params;

        // Hum pehle contribution ko dhoondenge taake hamein projectId mil jaye
        const contributionToDelete = await Contribution.findById(contributionId);

        if (!contributionToDelete) {
            throw new ApiError(404, "Contribution not found.");
        }

        const { projectId } = contributionToDelete;

        // Ab contribution ko delete karein
        await Contribution.findByIdAndDelete(contributionId);

        // --- YEH NAYA, REAL-TIME LOGIC HAI ---
        // Tamam clients ko jo is project room mein hain, batayein ke yeh contribution delete ho gayi hai
        io.to(projectId.toString()).emit('contribution_deleted', {
            contributionId: contributionId,
            projectId: projectId
        });
        console.log(`[Socket] Emitted 'contribution_deleted' for contribution ${contributionId} to room ${projectId}`);

        res.status(200).json(new ApiResponse(200,
            { contributionId: contributionId },
            "Contribution deleted successfully."
        ));
    } catch (err) {
        next(err);
    }
};

export const batchCreateContributions = async (req, res, next) => {
    try {
        // Frontend se poora contribution objects ka array aayega
        const { projectId, contributions } = req.body;

        if (!projectId || !contributions || !Array.isArray(contributions) || contributions.length === 0) {
            throw new ApiError(400, "Project ID and a non-empty contributions array are required.");
        }


        // --- YEH NAYA AUR SAHI LOGIC HAI ---
        // Step 1: Request se userId hasil karein (batch ki pehli contribution se)
        const userId = contributions[0].userId;

        // Step 2: Database mein is user ki is project ke liye mojooda contributions gino.
        const contributionCount = await Contribution.countDocuments({
            projectId: projectId,
            userId: userId
        });

        // Step 2: Is naye batch ka size hasil karo
        const batchSize = contributions.length;
        const MAX_CONTRIBUTIONS_PER_PROJECT = 10;

        // Step 3: Agar user apni limit tak pohnch chuka hai, to error bhejein.
        // Step 3: Naya check: Kya mojooda count + is batch ka size limit se barh jayega?
        if ((contributionCount + batchSize) > MAX_CONTRIBUTIONS_PER_PROJECT) {
            // User ko ek behtar error message do
            const slotsAvailable = MAX_CONTRIBUTIONS_PER_PROJECT - contributionCount;

            // Agar koi slot baaki nahi, to alag message
            if (slotsAvailable <= 0) {
                throw new ApiError(403, `You have already reached the maximum of ${MAX_CONTRIBUTIONS_PER_PROJECT} contributions.`);
            }

            // Agar kuch slots baaki hain, to batao kitne
            throw new ApiError(403, `This action would exceed your contribution limit. You only have ${slotsAvailable} contribution slots remaining.`);
        }

        for (const contrib of contributions) {
            // Hum sirf strokes ka data bhejenge, jo generateThumbnail expect karta hai
            const thumbnailUrl = await generateThumbnail(contrib.strokes);
            contrib.thumbnailUrl = thumbnailUrl; // URL ko contribution object mein add karein
        }
        
        // Mongoose `insertMany` ka istemal karein. Yeh bohat teiz hai.
        const savedContributions = await Contribution.insertMany(contributions);

        const logsToSave = [];

        // Har nayi contribution ke har stroke ke liye ek log entry banayein
        contributions.forEach(contrib => {
            // Yaqeeni banayein ke `strokes` array mojood hai
            if (contrib && Array.isArray(contrib.strokes)) {
                contrib.strokes.forEach(stroke => {
                    // Yaqeeni banayein ke `stroke` object null nahi hai
                    if (stroke) {
                        logsToSave.push({
                            projectId: projectId,
                            userId: contrib.userId,
                            stroke: stroke // Poora stroke object
                        });
                    }
                });
            }
        });

        // Agar save karne ke liye logs hain, to unhe database mein daalein
        if (logsToSave.length > 0) {
            // `insertMany` ko call karein lekin `await` na karein.
            // Yeh ek "fire-and-forget" operation hai. Hum user ko response dene ke liye iska intezar nahi karenge.
            drawingLogModel.insertMany(logsToSave).catch(err => {
                // Agar logging fail ho, to sirf server par error dikhayein.
                // User ke experience par iska koi asar nahi parna chahiye.
                console.error("CRITICAL: Failed to save drawing logs to database.", err);
            });
        }

        // --- Stats Update (Optimized) ---
        const project = await Project.findById(projectId);
        if (project) {
            const totalPixelsInBatch = contributions.reduce((sum, contrib) => {
                // Check karein ke `strokes` array mojood hai
                if (contrib && Array.isArray(contrib.strokes)) {
                    const pixelsInContrib = contrib.strokes.reduce((strokeSum, stroke) => {
                        // Check karein ke `stroke` aur `stroke.strokePath` mojood hain
                        if (stroke && Array.isArray(stroke.strokePath)) {
                            return strokeSum + stroke.strokePath.length;
                        }
                        return strokeSum;
                    }, 0);
                    return sum + pixelsInContrib;
                }
                return sum;
            }, 0);


            // Project ke stats ko ek hi baar update karein
            project.stats.pixelCount += totalPixelsInBatch;
            const totalCanvasPixels = project.width * project.height;
            if (totalCanvasPixels > 0) {
                project.stats.percentComplete = Math.min(100, (project.stats.pixelCount / totalCanvasPixels) * 100);
            }
            await project.save();
        }

        // Response mein save hue tamam contributions wapas bhejein
        res.status(201).json(
            new ApiResponse(201, savedContributions, "Contributions batched and saved successfully.")
        );

    } catch (err) {
        next(err);
    }
};


// export const batchCreateContributions = async (req, res, next) => {
//     try {
//         // Frontend se poora contribution objects ka array aayega
//         const { projectId, contributions } = req.body;

//         if (!projectId || !contributions || !Array.isArray(contributions) || contributions.length === 0) {
//             throw new ApiError(400, "Project ID and a non-empty contributions array are required.");
//         }


//         // --- YEH NAYA AUR SAHI LOGIC HAI ---
//         // Step 1: Request se userId hasil karein (batch ki pehli contribution se)
//         const userId = contributions[0].userId;

//         // Step 2: Database mein is user ki is project ke liye mojooda contributions gino.
//         const contributionCount = await Contribution.countDocuments({
//             projectId: projectId,
//             userId: userId
//         });

//         // Step 2: Is naye batch ka size hasil karo
//         const batchSize = contributions.length;
//         const MAX_CONTRIBUTIONS_PER_PROJECT = 10;

//         // Step 3: Agar user apni limit tak pohnch chuka hai, to error bhejein.
//         // Step 3: Naya check: Kya mojooda count + is batch ka size limit se barh jayega?
//         if ((contributionCount + batchSize) > MAX_CONTRIBUTIONS_PER_PROJECT) {
//             // User ko ek behtar error message do
//             const slotsAvailable = MAX_CONTRIBUTIONS_PER_PROJECT - contributionCount;

//             // Agar koi slot baaki nahi, to alag message
//             if (slotsAvailable <= 0) {
//                 throw new ApiError(403, `You have already reached the maximum of ${MAX_CONTRIBUTIONS_PER_PROJECT} contributions.`);
//             }

//             // Agar kuch slots baaki hain, to batao kitne
//             throw new ApiError(403, `This action would exceed your contribution limit. You only have ${slotsAvailable} contribution slots remaining.`);
//         }

//         for (const contrib of contributions) {
//             // Hum sirf strokes ka data bhejenge, jo generateThumbnail expect karta hai
//             const thumbnailUrl = await generateThumbnail(contrib.strokes);
//             contrib.thumbnailUrl = thumbnailUrl; // URL ko contribution object mein add karein
//         }

//         const contributionsWithStartPoints = contributions.map(contrib => ({
//             ...contrib,
//             strokes: contrib.strokes.map(stroke => ({
//                 ...stroke,
//                 startX: stroke.strokePath[0]?.fromX,
//                 startY: stroke.strokePath[0]?.fromY,
//             }))
//         }));

//         // Mongoose `insertMany` ka istemal karein. Yeh bohat teiz hai.
//         const savedContributions = await Contribution.insertMany(contributionsWithStartPoints);

//         const logsToSave = [];

//         // Har nayi contribution ke har stroke ke liye ek log entry banayein
//         contributions.forEach(contrib => {
//             // Yaqeeni banayein ke `strokes` array mojood hai
//             if (contrib && Array.isArray(contrib.strokes)) {
//                 contrib.strokes.forEach(stroke => {
//                     // Yaqeeni banayein ke `stroke` object null nahi hai
//                     if (stroke) {
//                         logsToSave.push({
//                             projectId: projectId,
//                             userId: contrib.userId,
//                             stroke: stroke // Poora stroke object
//                         });
//                     }
//                 });
//             }
//         });

//         // Agar save karne ke liye logs hain, to unhe database mein daalein
//         if (logsToSave.length > 0) {
//             // `insertMany` ko call karein lekin `await` na karein.
//             // Yeh ek "fire-and-forget" operation hai. Hum user ko response dene ke liye iska intezar nahi karenge.
//             drawingLogModel.insertMany(logsToSave).catch(err => {
//                 // Agar logging fail ho, to sirf server par error dikhayein.
//                 // User ke experience par iska koi asar nahi parna chahiye.
//                 console.error("CRITICAL: Failed to save drawing logs to database.", err);
//             });
//         }

//         // --- Stats Update (Optimized) ---
//         const project = await Project.findById(projectId);
//         if (project) {
//             const totalPixelsInBatch = contributions.reduce((sum, contrib) => {
//                 // Check karein ke `strokes` array mojood hai
//                 if (contrib && Array.isArray(contrib.strokes)) {
//                     const pixelsInContrib = contrib.strokes.reduce((strokeSum, stroke) => {
//                         // Check karein ke `stroke` aur `stroke.strokePath` mojood hain
//                         if (stroke && Array.isArray(stroke.strokePath)) {
//                             return strokeSum + stroke.strokePath.length;
//                         }
//                         return strokeSum;
//                     }, 0);
//                     return sum + pixelsInContrib;
//                 }
//                 return sum;
//             }, 0);


//             // Project ke stats ko ek hi baar update karein
//             project.stats.pixelCount += totalPixelsInBatch;
//             const totalCanvasPixels = project.width * project.height;
//             if (totalCanvasPixels > 0) {
//                 project.stats.percentComplete = Math.min(100, (project.stats.pixelCount / totalCanvasPixels) * 100);
//             }
//             await project.save();
//         }

//         // Response mein save hue tamam contributions wapas bhejein
//         res.status(201).json(
//             new ApiResponse(201, savedContributions, "Contributions batched and saved successfully.")
//         );

//     } catch (err) {
//         next(err);
//     }
// };

export const clearCanvas = async (req, res, next) => {
    try {
        const { projectId } = req.params; // Ya req.params, jaisa bhi aapka route hai

        if (!projectId) {
            throw new ApiError(400, "Project ID is required.");
        }

        // Database se tamam contributions delete karein
        await Contribution.deleteMany({ projectId: projectId });

        // (Optional) Project ke stats ko reset karein
        await Project.findByIdAndUpdate(projectId, {
            $set: {
                'stats.pixelCount': 0,
                'stats.percentComplete': 0
            }
        });

        // --- YEH NAYA, REAL-TIME LOGIC HAI ---
        // Tamam clients ko jo is project room mein hain, batayein ke canvas clear ho gaya hai
        io.to(projectId.toString()).emit('canvas_cleared', {
            projectId: projectId
        });
        console.log(`[Socket] Emitted 'canvas_cleared' to room ${projectId}`);

        res.status(200).json(new ApiResponse(200, null, "Canvas cleared successfully."));

    } catch (err) {
        next(err);
    }
};