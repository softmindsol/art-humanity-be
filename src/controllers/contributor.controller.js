import Contribution from '../models/contributor.model.js'; // Humara naya, unified model
import { ApiError, ApiResponse } from "../utils/api.utils.js";

// 1. Nayi Contribution Save Karne ke liye
export const createContribution = async (req, res, next) => {
    try {
        const { projectId, strokes, userId } = req.body;


        if (!projectId || !strokes || !Array.isArray(strokes) || strokes.length === 0) {
            throw new ApiError(400, "Project ID and a non-empty strokes array are required.");
        }

        // Naya contribution document banayein
        const newContribution = new Contribution({
            projectId,
            userId,
            strokes: strokes // Frontend se poora strokes ka array yahan save hoga
        });

        const savedContribution = await newContribution.save();

        res.status(201).json(new ApiResponse(201, savedContribution, "Contribution saved successfully."));

    } catch (err) {
        next(err);
    }
};

// 2. Project ki Tamam Contributions Load Karne ke liye
export const getProjectContributions = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        // Sirf ek query se tamam data mil jayega
        const contributions = await Contribution.find({ projectId }).sort({ createdAt: 'asc' });

        if (!contributions) {
            // Khaali array bhejna behtar hai 404 se
            return res.status(200).json(new ApiResponse(200, [], "No contributions found for this project."));
        }

        res.status(200).json(new ApiResponse(200, contributions, "Contributions fetched successfully."));

    } catch (err) {
        next(err);
    }
};