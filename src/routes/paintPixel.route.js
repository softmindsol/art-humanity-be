import express from 'express';
import {PaintPixelController} from '../controllers/paintPixel.controller.js';
const router = express.Router();



// Create a new paint stroke
router.route('/stroke')
    .post(PaintPixelController.createStroke);

// router.route('/timelapse/:projectId')
//     .get(PaintPixelController.generateTimelapse); // Hum yeh controller function abhi banayenge

    
// Batch create multiple strokes
router.route('/strokes/batch')
    .post(PaintPixelController.batchCreateStrokes);

// GET /api/v1/canvas/:canvasId -> Ek canvas ke saare strokes laana
router.route('/canvas/:canvasId')
    .get(PaintPixelController.getStrokesByCanvasId);
// Get canvas data for a session
router.route('/canvas/:sessionId')
    .get(PaintPixelController.getCanvasData);

// Clear canvas for a session
// router.route('/contributions/project/:projectId/clear')
//     .delete(PaintPixelController.clearCanvas);

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
