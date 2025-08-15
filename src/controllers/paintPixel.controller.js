import { createCanvas } from 'canvas';
import {PaintPixel} from '../models/paintPixel.model.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
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
                projectId,
                sessionId,
                zoomLevel,
                canvasOffset,
                strokeStartTime,
                strokeEndTime
            } = req.body;

            // Get or create session ID
         
            const paintPixel = new PaintPixel({
                canvasResolution,
                canvasSize,
                canvasId ,
                strokePath,
                brushSize,
                color,
                mode,
                projectId,
                sessionId,
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


    static async generateTimelapse(req, res) {
        try {
            const { sessionId } = req.params;
            const projectWidth = 1024;
            const projectHeight = 1024;

            console.log(`[Timelapse] Fetching strokes for session: ${sessionId}`);
            const strokes = await PaintPixel.find({ sessionId }).sort({ createdAt: 'asc' }).lean();

            if (strokes.length === 0) {
                return res.status(404).json({ success: false, message: "No strokes found for this session." });
            }

            console.log(`[Timelapse] Found ${strokes.length} strokes. Setting up virtual canvas.`);
            const canvas = createCanvas(projectWidth, projectHeight);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, projectWidth, projectHeight);

            const frameDir = `./temp_frames_${sessionId}`;
            if (!fs.existsSync(frameDir)) {
                fs.mkdirSync(frameDir);
            }

            console.log(`[Timelapse] Starting frame generation...`);
            for (let i = 0; i < strokes.length; i++) {
                const stroke = strokes[i];
                if (!stroke.strokePath || stroke.strokePath.length === 0) continue;

                const { r, g, b, a } = stroke.color;
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
                ctx.lineWidth = stroke.brushSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalCompositeOperation = stroke.mode === 'eraser' ? 'destination-out' : 'source-over';

                ctx.beginPath();
                stroke.strokePath.forEach((path, index) => {
                    if (index === 0) ctx.moveTo(path.fromX, path.fromY);
                    ctx.lineTo(path.toX, path.toY);
                });
                ctx.stroke();

                // Har stroke ke baad ek frame save karein
                const frameNumber = String(i).padStart(6, '0');
                const framePath = path.join(frameDir, `frame-${frameNumber}.png`);
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(framePath, buffer);
            }

            console.log(`[Timelapse] Frame generation complete. Stitching video with FFmpeg.`);
            const outputPath = path.resolve(process.cwd(), 'public', `timelapse_${sessionId}.mp4`);

            await new Promise((resolve, reject) => {
                ffmpeg(path.join(frameDir, 'frame-%06d.png'))
                    .inputFPS(25)
                    .videoCodec('libx264')
                    // ============================================
                    // ** THE FIX IS HERE **
                    // Sahi pixel format 'yuv420p' hai
                    // ============================================
                    .outputOptions('-pix_fmt yuv420p')

                    .output(outputPath)
                    .on('end', () => {
                        fs.rmSync(frameDir, { recursive: true, force: true });
                        console.log('[Timelapse] Video created successfully.');
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('[Timelapse] FFmpeg error:', err);
                        fs.rmSync(frameDir, { recursive: true, force: true });
                        reject(err);
                    })
                    .run();
            });

            res.status(200).json({
                success: true,
                message: "Timelapse generated successfully!",
                videoUrl: `/timelapse_${sessionId}.mp4`
            });

        } catch (error) {
            console.error('Error generating timelapse:', error);
            res.status(500).json({ success: false, error: 'Failed to generate timelapse' });
        }
    }

    // static async generateTimelapse(req, res) {
    //     try {
    //         const { sessionId } = req.params;
    //         const projectWidth = 1024;
    //         const projectHeight = 1024;

    //         const strokes = await PaintPixel.find({ sessionId }).sort({ createdAt: 'asc' }).lean();
    //         if (strokes.length === 0) {
    //             return res.status(404).json({ success: false, message: "No strokes found." });
    //         }

    //         const frameDir = `./temp_frames_${sessionId}`;
    //         if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir);

    //         const canvas = createCanvas(projectWidth, projectHeight);
    //         const ctx = canvas.getContext('2d');
    //         ctx.fillStyle = '#ffffff';
    //         ctx.fillRect(0, 0, projectWidth, projectHeight);

    //         console.log(`[Timelapse] Generating ${strokes.length} frames...`);
    //         for (let i = 0; i < strokes.length; i++) {
    //             const stroke = strokes[i];
    //             if (!stroke.strokePath || stroke.strokePath.length === 0) continue;

    //             const { r, g, b, a } = stroke.color;
    //             ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    //             ctx.lineWidth = stroke.brushSize;
    //             ctx.lineCap = 'round';
    //             ctx.lineJoin = 'round';
    //             ctx.globalCompositeOperation = stroke.mode === 'eraser' ? 'destination-out' : 'source-over';

    //             ctx.beginPath();
    //             stroke.strokePath.forEach((path, index) => {
    //                 if (index === 0) ctx.moveTo(path.fromX, path.fromY);
    //                 ctx.lineTo(path.toX, path.toY);
    //             });
    //             ctx.stroke();

    //             const frameNumber = String(i).padStart(6, '0');
    //             const framePath = path.join(frameDir, `frame-${frameNumber}.png`);
    //             fs.writeFileSync(framePath, canvas.toBuffer('image/png'));
    //         }

    //         console.log(`[Timelapse] Stitching video with FFmpeg.`);
    //         const outputPath = path.resolve(process.cwd(), 'public', `timelapse_${sessionId}.mp4`);

    //         await new Promise((resolve, reject) => {
    //             const command = ffmpeg(path.join(frameDir, 'frame-%06d.png'));

    //             // ==========================================================
    //             // ** THE FIX IS HERE **
    //             // ==========================================================
    //             // Step 1: FFmpeg ko batayein ke input images ko loop karna hai
    //             // Yeh option `-i` (input file) se pehle lagana zaroori hai
    //             command.inputOptions('-loop 1');

    //             command
    //                 .inputFPS(25)
    //                 .videoCodec('libx264')
    //                 .outputOptions('-pix_fmt yuv420p')

    //                 // Step 2: Video ki kam se kam duration set karein
    //                 .duration(3) // 3 seconds ki video banayega

    //                 .output(outputPath)
    //                 .on('end', () => {
    //                     fs.rmSync(frameDir, { recursive: true, force: true });
    //                     console.log('[Timelapse] Video created successfully.');
    //                     resolve();
    //                 })
    //                 .on('error', (err) => {
    //                     fs.rmSync(frameDir, { recursive: true, force: true });
    //                     console.error('[Timelapse] FFmpeg error:', err.message);
    //                     reject(err);
    //                 })
    //                 .run();
    //         });

    //         res.status(200).json({
    //             success: true,
    //             message: "Timelapse generated successfully!",
    //             videoUrl: `/timelapse_${sessionId}.mp4`
    //         });

    //     } catch (error) {
    //         console.error('Error generating timelapse:', error);
    //         res.status(500).json({ success: false, error: 'Failed to generate timelapse' });
    //     }
    // }

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
    
    static async getStrokesByCanvasId(req, res) {
        try {
            const { canvasId } = req.params;
            if (!canvasId) {
                return res.status(400).json({ success: false, message: "Canvas ID is required." });
            }

            // Database se saare strokes dhoondhein jo is canvasId se match karte hain
            // `sort({ createdAt: 'asc' })` bohot zaroori hai taaki strokes sahi order mein milen
            const strokes = await PaintPixel.find({ canvasId }).sort({ createdAt: 'asc' }).lean();

            res.status(200).json({
                success: true,
                data: strokes
            });

        } catch (error) {
            console.error('Error fetching strokes by canvasId:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch strokes' });
        }
    }

    // Clear canvas for a session
    static async clearCanvas(req, res) {
        try {
            // **CHANGE**: `req.params` se `sessionId` ke bajaye `canvasId` nikalein
            const { projectId } = req.params;

            if (!projectId) {
                return res.status(400).json({ success: false, message: "Canvas ID is required." });
            }

            // **CHANGE**: `PaintPixel.deleteMany` ko `canvasId` ke basis par call karein
            const result = await PaintPixel.deleteMany({ projectId: projectId });

            console.log(`[Clear Canvas] Deleted ${result.deletedCount} strokes for canvasId: ${projectId}`);

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