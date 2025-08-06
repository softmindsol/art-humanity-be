import {PaintPixel} from '../models/painPixel.model.js';

class PaintPixelController {

    // Create a new paint stroke
    static async createStroke(req, res) {
        try {
            const {
                canvasId,
                canvasResolution,
                canvasSize,
                strokePath,
                brushSize,
                color,
                mode,
                zoomLevel,
                canvasOffset,
                strokeStartTime,
                strokeEndTime
            } = req.body;

            // Get or create session ID
            // let sessionId = req.session?.id || req.headers['x-session-id'];
            // if (!sessionId) {
            //     sessionId = uuidv4();
            //     if (req.session) {
            //         req.session.id = sessionId;
            //     }
            // }

            const paintPixel = new PaintPixel({
                canvasResolution,
                canvasSize,
                canvasId ,
                strokePath,
                brushSize,
                color,
                mode,
                // sessionId,
                userId: req.user?.id || null,
                zoomLevel,
                canvasOffset,
                strokeStartTime: strokeStartTime ? new Date(strokeStartTime) : new Date(),
                strokeEndTime: strokeEndTime ? new Date(strokeEndTime) : new Date()
            });

            const savedStroke = await paintPixel.save();

            res.status(201).json({
                success: true,
                data: savedStroke,
                sessionId: sessionId
            });

        } catch (error) {
            console.error('Error creating paint stroke:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to save paint stroke',
                details: error.message
            });
        }
    }

    // Get canvas data for a session5
    static async getCanvasData(req, res) {
        try {
            const { sessionId } = req.params;
            const { canvasResolution = 1, limit = 1000, offset = 0 } = req.query;

            const strokes = await PaintPixel.getCanvasData(sessionId, Number(canvasResolution))
                .limit(Number(limit))
                .skip(Number(offset));

            res.status(200).json({
                success: true,
                data: strokes,
                count: strokes.length,
                pagination: {
                    limit: Number(limit),
                    offset: Number(offset)
                }
            });

        } catch (error) {
            console.error('Error fetching canvas data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch canvas data',
                details: error.message
            });
        }
    }

    // Clear canvas for a session
    static async clearCanvas(req, res) {
        try {
            const { sessionId } = req.params;
            const { canvasResolution = 1 } = req.body;

            const result = await PaintPixel.clearCanvas(sessionId, Number(canvasResolution));

            res.status(200).json({
                success: true,
                message: `Cleared ${result.deletedCount} strokes from canvas`,
                deletedCount: result.deletedCount
            });

        } catch (error) {
            console.error('Error clearing canvas:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear canvas',
                details: error.message
            });
        }
    }

    // Get tile data for efficient rendering
    static async getTileData(req, res) {
        try {
            const { sessionId, tileX, tileY } = req.params;
            const { tileSize = 64 } = req.query;

            const tileData = await PaintPixel.getTileData(
                sessionId,
                Number(tileX),
                Number(tileY),
                Number(tileSize)
            );

            res.status(200).json({
                success: true,
                data: tileData,
                tileInfo: {
                    tileX: Number(tileX),
                    tileY: Number(tileY),
                    tileSize: Number(tileSize),
                    strokeCount: tileData.length
                }
            });

        } catch (error) {
            console.error('Error fetching tile data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch tile data',
                details: error.message
            });
        }
    }

    // Batch create multiple strokes (for optimized drawing)
    static async batchCreateStrokes(req, res) {
        try {
            const { strokes } = req.body;

            if (!Array.isArray(strokes) || strokes.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Strokes array is required and must not be empty'
                });
            }

            // Get or create session ID
            let sessionId = req.session?.id || req.headers['x-session-id'];
            if (!sessionId) {
                sessionId = uuidv4();
                if (req.session) {
                    req.session.id = sessionId;
                }
            }

            // Add session and user info to all strokes
            const strokesWithSession = strokes.map(stroke => ({
                ...stroke,
                sessionId,
                userId: req.user?.id || null
            }));

            const savedStrokes = await PaintPixel.insertMany(strokesWithSession);

            res.status(201).json({
                success: true,
                data: savedStrokes,
                count: savedStrokes.length,
                sessionId: sessionId
            });

        } catch (error) {
            console.error('Error batch creating strokes:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to batch save strokes',
                details: error.message
            });
        }
    }

    // Get canvas statistics
    static async getCanvasStats(req, res) {
        try {
            const { sessionId } = req.params;

            const stats = await PaintPixel.aggregate([
                { $match: { sessionId } },
                {
                    $group: {
                        _id: '$canvasResolution',
                        strokeCount: { $sum: 1 },
                        totalPixels: { $sum: { $size: '$strokePath' } },
                        avgBrushSize: { $avg: '$brushSize' },
                        modes: { $addToSet: '$mode' },
                        firstStroke: { $min: '$createdAt' },
                        lastStroke: { $max: '$createdAt' }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            res.status(200).json({
                success: true,
                data: stats,
                sessionId
            });

        } catch (error) {
            console.error('Error fetching canvas stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch canvas statistics',
                details: error.message
            });
        }
    }

    // Export canvas data
    static async exportCanvas(req, res) {
        try {
            const { sessionId } = req.params;
            const { format = 'json' } = req.query;

            const canvasData = await PaintPixel.find({ sessionId })
                .sort({ createdAt: 1 })
                .lean();

            if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="canvas-${sessionId}.json"`);
                res.status(200).json({
                    success: true,
                    sessionId,
                    exportDate: new Date().toISOString(),
                    strokeCount: canvasData.length,
                    data: canvasData
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Unsupported export format. Use format=json'
                });
            }

        } catch (error) {
            console.error('Error exporting canvas:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export canvas data',
                details: error.message
            });
        }
    }

    // Import canvas data
    static async importCanvas(req, res) {
        try {
            const { data, overwrite = false } = req.body;

            if (!Array.isArray(data) || data.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Data array is required and must not be empty'
                });
            }

            // Get or create session ID
            let sessionId = req.session?.id || req.headers['x-session-id'];
            if (!sessionId) {
                sessionId = uuidv4();
                if (req.session) {
                    req.session.id = sessionId;
                }
            }

            // Clear existing data if overwrite is true
            if (overwrite) {
                await PaintPixel.deleteMany({ sessionId });
            }

            // Prepare data for import
            const importData = data.map(stroke => ({
                ...stroke,
                _id: undefined, // Remove old IDs
                sessionId,
                userId: req.user?.id || null,
                createdAt: undefined,
                updatedAt: undefined
            }));

            const importedStrokes = await PaintPixel.insertMany(importData);

            res.status(201).json({
                success: true,
                message: `Imported ${importedStrokes.length} strokes`,
                count: importedStrokes.length,
                sessionId
            });

        } catch (error) {
            console.error('Error importing canvas:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to import canvas data',
                details: error.message
            });
        }
    }
}

export {PaintPixelController};