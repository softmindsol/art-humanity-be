import express from 'express';
import {PaintPixelController} from '../controllers/painPixel.controller.js';
const router = express.Router();

// Validation middleware
const validateStroke = (req, res, next) => {
    const { canvasResolution, canvasId, canvasSize, strokePath, brushSize, color, mode } = req.body;

    const errors = [];

    if (!canvasResolution || ![0.25, 0.5, 1, 2, 4].includes(canvasResolution)) {
        errors.push('Valid canvasResolution is required (0.25, 0.5, 1, 2, 4)');
    }

    if (!canvasSize || ![256, 512, 1024, 2048, 4096].includes(canvasSize)) {
        errors.push('Valid canvasSize is required (256, 512, 1024, 2048, 4096)');
    }

    if (!strokePath || !Array.isArray(strokePath) || strokePath.length === 0) {
        errors.push('strokePath array is required and must not be empty');
    }

    if (!brushSize || brushSize < 1 || brushSize > 50) {
        errors.push('brushSize must be between 1 and 50');
    }

    if (!color || typeof color !== 'object' ||
        typeof color.r !== 'number' || color.r < 0 || color.r > 255 ||
        typeof color.g !== 'number' || color.g < 0 || color.g > 255 ||
        typeof color.b !== 'number' || color.b < 0 || color.b > 255 ||
        typeof color.a !== 'number' || color.a < 0 || color.a > 1) {
        errors.push('Valid color object with r,g,b (0-255) and a (0-1) is required');
    }

    if (!mode || !['brush', 'eraser'].includes(mode)) {
        errors.push('mode must be either "brush" or "eraser"');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

// Create a new paint stroke
router.route('/stroke')
    .post(PaintPixelController.createStroke);

// Batch create multiple strokes
router.route('/strokes/batch')
    .post(PaintPixelController.batchCreateStrokes);

// Get canvas data for a session
router.route('/canvas/:sessionId')
    .get(PaintPixelController.getCanvasData);

// Clear canvas for a session
router.route('/canvas/:sessionId/clear')
    .delete(PaintPixelController.clearCanvas);

// Get tile data for efficient rendering
router.route('/tile/:sessionId/:tileX/:tileY')
    .get(PaintPixelController.getTileData);

// Get canvas statistics
router.route('/stats/:sessionId')
    .get(PaintPixelController.getCanvasStats);

// Export canvas data
router.route('/export/:sessionId')
    .get(PaintPixelController.exportCanvas);

// Import canvas data
router.route('/import')
    .post(PaintPixelController.importCanvas);
export default router;
