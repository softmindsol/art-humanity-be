import Contribution from '../models/contributor.model.js'; // Humara naya, unified model
import { ApiError, ApiResponse } from "../utils/api.utils.js";
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import Project from "../models/project.model.js";

const generateThumbnail = async (strokes) => {
    const THUMB_SIZE = 100; // Thumbnail ka size (100x100 pixels)
    const canvas = createCanvas(THUMB_SIZE, THUMB_SIZE);
    const ctx = canvas.getContext('2d');

    // Background ko transparent ya safed rakhein
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);

    // Tamam strokes ke coordinates dhoondein taake drawing ko center kar sakein
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach(stroke => {
        stroke.strokePath.forEach(p => {
            minX = Math.min(minX, p.fromX, p.toX);
            minY = Math.min(minY, p.fromY, p.toY);
            maxX = Math.max(maxX, p.fromX, p.toX);
            maxY = Math.max(maxY, p.fromY, p.toY);
        });
    });

    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;

    if (drawingWidth === 0 || drawingHeight === 0) { // Agar sirf ek dot hai
        // Is case ko handle karein ya default image return karein
        return null;
    }

    // Scale aur offset calculate karein taake drawing thumbnail ke andar fit ho jaye
    const scale = Math.min(THUMB_SIZE / drawingWidth, THUMB_SIZE / drawingHeight) * 0.9; // 90% size
    const offsetX = (THUMB_SIZE - drawingWidth * scale) / 2 - minX * scale;
    const offsetY = (THUMB_SIZE - drawingHeight * scale) / 2 - minY * scale;

    // Har stroke ko chotay canvas par draw karein
    strokes.forEach(stroke => {
        const { r, g, b, a } = stroke.color;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a || 1})`;
        ctx.lineWidth = stroke.brushSize * scale; // Brush size ko bhi scale karein
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        stroke.strokePath.forEach((pathSegment, index) => {
            const fromX = pathSegment.fromX * scale + offsetX;
            const fromY = pathSegment.fromY * scale + offsetY;
            const toX = pathSegment.toX * scale + offsetX;
            const toY = pathSegment.toY * scale + offsetY;

            if (index === 0) ctx.moveTo(fromX, fromY);
            else ctx.lineTo(toX, toY);
        });
        ctx.stroke();
    });

    // Image ko save karein
    const fileName = `thumb_${Date.now()}.png`;
    const filePath = path.resolve(process.cwd(), 'public', 'thumbnails', fileName);
    const buffer = canvas.toBuffer('image/png');

    // Sunischit karein ke directory mojood hai
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    // File ka public URL wapas bhejein
    return `/thumbnails/${fileName}`;
};

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

// 2. Project ki Tamam Contributions Load Karne ke liye
export const getProjectContributions = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        // Step 1: Frontend se 'sortBy' query parameter hasil karein.
        // Agar nahi milta, to default 'newest' set karein.
        const { sortBy = 'newest' } = req.query;

        // Step 2: Mongoose ke liye sort options ka object banayein.
        let sortOptions = {};

        // Step 3: 'sortBy' ki value ke hisab se sort options set karein.
        switch (sortBy) {
            case 'most-upvoted':
                sortOptions = { upvotes: -1 }; // -1 for descending order (zyada se kam)
                break;
            case 'most-downvoted':
                sortOptions = { downvotes: -1 };
                break;
            case 'oldest':
                sortOptions = { createdAt: 1 }; // 1 for ascending order (kam se zyada)
                break;
            case 'newest':
            default:
                sortOptions = { createdAt: -1 }; // Default sorting
                break;
        }

        // Step 4: Database query mein .sort() method ka istemal karein.
        const contributions = await Contribution.find({ projectId })
            .populate('userId', 'fullName email') // populate waisa hi rahega
            .sort(sortOptions); // Yahan sorting apply hogi

        if (!contributions) {
            return res.status(200).json(new ApiResponse(200, [], "No contributions found."));
        }

        res.status(200).json(new ApiResponse(200, contributions, "Contributions fetched successfully."));

    } catch (err) {
        next(err);
    }
};

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

        // --- THE FIX IS HERE: `equals()` method istemal karein ---
        // Yeh Mongoose ObjectIDs ko sahi tareeqe se compare karta hai
        const existingVoteIndex = contribution.voters.findIndex(voter => voter.userId.equals(userId));

        // Case 1: User ne pehle se vote kiya hua hai
        if (existingVoteIndex > -1) {
            const existingVote = contribution.voters[existingVoteIndex];

            // Sub-Case A: User apna vote badal raha hai (up -> down or down -> up)
            if (existingVote.voteType !== voteType) {
                // Purana vote count kam karein
                contribution[existingVote.voteType + 'votes'] -= 1;
                // Naya vote count barhayein
                contribution[voteType + 'votes'] += 1;
                // Voter list mein vote type update karein
                existingVote.voteType = voteType;
            }
            // Sub-Case B: User apna vote cancel kar raha hai (dobara same button dabaya)
            else {
                // Purana vote count kam karein
                contribution[voteType + 'votes'] -= 1;
                // Voter ko list se nikaal dein
                contribution.voters.splice(existingVoteIndex, 1);
            }
        }
        // Case 2: User pehli baar vote kar raha hai
        else {
            contribution[voteType + 'votes'] += 1;
            contribution.voters.push({ userId, voteType });
        }

        const updatedContribution = await contribution.save();
        // --- NAYI AUTOMATIC DELETION LOGIC ---
        const { upvotes, downvotes, _id } = updatedContribution;
        const totalVotes = upvotes + downvotes;
        const DELETION_THRESHOLD_PERCENT = 0.5; // 50%
        const MINIMUM_VOTES_FOR_DELETION = 5;   // Kam se kam 5 votes hone chahiye delete karne ke liye

        // Condition: Agar total votes minimum hadd se zyada hain AUR downvotes 50% se zyada hain
        if (totalVotes >= MINIMUM_VOTES_FOR_DELETION && (downvotes / totalVotes) > DELETION_THRESHOLD_PERCENT) {

            console.log(`[Moderation] Auto-deleting contribution ${_id} due to high downvotes.`);
            await Contribution.findByIdAndDelete(_id);

            // Frontend ko ek khaas response bhejein taake usay pata chal jaye ke contribution delete ho gaya hai
            return res.status(200).json(new ApiResponse(200,
                { wasDeleted: true, contributionId: _id },
                "Contribution auto-deleted due to high downvotes."
            ));
        }

        // Agar delete nahi hua, to normal updated contribution wapas bhejein
        res.status(200).json(new ApiResponse(200, updatedContribution, "Vote registered successfully."));

    } catch (err) {
        next(err);
    }
}

// Naya controller function add karein
export const deleteContribution = async (req, res, next) => {
    try {
        const { id: contributionId } = req.params;

        const deletedContribution = await Contribution.findByIdAndDelete(contributionId);

        if (!deletedContribution) {
            throw new ApiError(404, "Contribution not found.");
        }

        res.status(200).json(new ApiResponse(200,
            { contributionId: deletedContribution._id },
            "Contribution deleted successfully by admin."
        ));
    } catch (err) {
        next(err);
    }
};

export const batchCreateContributions = async (req, res, next) => {
    try {
        // Frontend se poora contribution objects ka array aayega
        const { projectId, contributions } = req.body;
        console.log("Received contributions on backend:", JSON.stringify(contributions, null, 2));

        if (!projectId || !contributions || !Array.isArray(contributions) || contributions.length === 0) {
            throw new ApiError(400, "Project ID and a non-empty contributions array are required.");
        }

        // Mongoose `insertMany` ka istemal karein. Yeh bohat teiz hai.
        const savedContributions = await Contribution.insertMany(contributions);

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