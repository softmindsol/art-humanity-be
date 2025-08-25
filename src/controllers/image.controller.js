import Contribution from '../models/contributor.model.js';
import Project from '../models/project.model.js';
import { createCanvas } from 'canvas';
import { ApiError } from '../utils/api.utils.js';

// === FUNCTION 1: drawStrokeOnCanvas (Updated with Detailed Logging) ===
const drawStrokeOnCanvas = (ctx, stroke) => {
    // Defensive check
    if (!stroke || !stroke.strokePath || !Array.isArray(stroke.strokePath) || stroke.strokePath.length === 0) {
        console.log('[DrawStroke-Debug] Skipping invalid or empty stroke.');
        return;
    }
    const { strokePath, brushSize, color, mode } = stroke;

    // Detailed Logging
    const strokeColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a || 1})`;
    console.log(`[DrawStroke-Debug] Details - Size: ${brushSize}, Color: ${strokeColor}, Mode: ${mode}, Segments: ${strokePath.length}`);

    // Set canvas properties
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    strokePath.forEach((segment, index) => {
        // Log the coordinates of the first segment to check
        if (index === 0) {
            console.log(`[DrawStroke-Debug] First segment coords: from(${segment.fromX}, ${segment.fromY}) to(${segment.toX}, ${segment.toY})`);
        }

        // Defensive check for coordinates
        if (segment && typeof segment.fromX === 'number' && typeof segment.fromY === 'number' && typeof segment.toX === 'number' && typeof segment.toY === 'number') {
            ctx.moveTo(segment.fromX, segment.fromY);
            ctx.lineTo(segment.toX, segment.toY);
        } else {
            console.log(`[DrawStroke-Debug] WARNING: Skipping a segment with invalid coords:`, segment);
        }
    });
    ctx.stroke();
};


// === FUNCTION 2: generateHighResImage (Updated to remove test drawing) ===
export const generateHighResImage = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId);
        if (!project) throw new ApiError(404, "Project not found.");
        const contributions = await Contribution.find({ projectId });

        console.log(`[ImageGen-Debug] Project: ${project.title}, Canvas Size: ${project.width}x${project.height}`);
        console.log(`[ImageGen-Debug] Found ${contributions.length} contributions to draw.`);

        const canvas = createCanvas(project.width, project.height);
        const ctx = canvas.getContext('2d');

        // Step 1: Set a white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, project.width, project.height);

        // Step 2: Draw all user contributions
        for (const contribution of contributions) {
            if (contribution.strokes && Array.isArray(contribution.strokes)) {
                for (const stroke of contribution.strokes) {
                    // drawStrokeOnCanvas ke andar pehle se hi check hai,
                    // lekin yahan bhi check karna acha hai.
                    if (stroke) {
                        drawStrokeOnCanvas(ctx, stroke);
                    }
                }
            }
        }

        console.log('[ImageGen-Debug] All strokes drawn. Sending image buffer...');
        const buffer = canvas.toBuffer('image/png');

        res.setHeader('Content-Type', 'image/png');
        // File ka naam wapas normal kar dein
        res.setHeader('Content-Disposition', `attachment; filename=${project.canvasId || 'artwork'}.png`);
        res.send(buffer);

    } catch (err) {
        console.error("[ImageGen-Debug] An error occurred during image generation:", err);
        next(err);
    }
};