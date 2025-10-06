// src/controllers/timelapse.controller.js
import DrawingLog from '../models/drawingLog.model.js';
import Project from '../models/project.model.js';
import { createCanvas } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

const drawStrokeOnCanvas = (ctx, stroke) => {
    const { strokePath, brushSize, color, mode } = stroke;

    ctx.lineWidth = brushSize;
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a || 1})`;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    strokePath.forEach((segment, index) => {
        if (index === 0) {
            ctx.moveTo(segment.fromX, segment.fromY);
            ctx.lineTo(segment.toX, segment.toY);
        } else {
            ctx.lineTo(segment.toX, segment.toY);
        }
    });
    ctx.stroke();
};

export const generateTimelapse = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        console.log(`[Timelapse] Starting generation for project: ${projectId}`);

        const project = await Project.findById(projectId);
        if (!project) throw new ApiError(404, "Project not found.");

        const logs = await DrawingLog.find({ projectId }).sort({ createdAt: 'asc' }).lean();
        if (logs.length === 0) throw new ApiError(404, "No drawings found to generate timelapse.");

        
        const contributions = await Contribution.find({ projectId }).sort({ createdAt: 'asc' }).select('strokes createdAt').lean();

       
        const allStrokes = contributions.flatMap(contrib =>
            contrib.strokes.map(stroke => ({
                ...stroke,
                timestamp: new Date(contrib.createdAt).getTime() // Sorting ke liye
            }))
        );

        // Step 3: Tamam strokes ko unke timestamp ke hisab se tarteeb dein
        allStrokes.sort((a, b) => a.timestamp - b.timestamp);

        if (allStrokes.length === 0) throw new ApiError(404, "No drawings found to generate timelapse.");

        const canvas = createCanvas(project.width, project.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, project.width, project.height);

        const tempFramesDir = path.resolve(process.cwd(), 'public', 'temp_frames', projectId);
        if (fs.existsSync(tempFramesDir)) fs.rmSync(tempFramesDir, { recursive: true, force: true });
        fs.mkdirSync(tempFramesDir, { recursive: true });

        console.log(`[Timelapse] Generating ${allStrokes.length} frames...`);
        // Har stroke ko ek frame ke tor par draw karein
        for (let i = 0; i < allStrokes.length; i++) {
            drawStrokeOnCanvas(ctx, allStrokes[i]); // Ab `allStrokes` array istemal karein
            const framePath = path.join(tempFramesDir, `frame-${String(i).padStart(6, '0')}.png`);
            fs.writeFileSync(framePath, canvas.toBuffer('image/png'));
        }

        const outputPath = path.resolve(process.cwd(), 'public', 'timelapses', `${projectId}.mp4`);
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      
        if (fs.existsSync(outputPath)) {
            console.log(`[Timelapse] Deleting existing video file: ${outputPath}`);
            fs.unlinkSync(outputPath);
        }
        console.log('[Timelapse] Compiling frames into video with FFmpeg...');
        // FFmpeg se video banayein
        ffmpeg(path.join(tempFramesDir, 'frame-%06d.png'))
            .inputFPS(25) // 25 frames per second
            .outputOptions('-c:v libx264') // Video codec
            .outputOptions('-pix_fmt yuv420p') // Pixel format for compatibility
            .output(outputPath)
            .on('end', () => {
                console.log('[Timelapse] Video generation finished.');
                fs.rmSync(tempFramesDir, { recursive: true, force: true }); // Temp frames delete karein

                const videoUrl = `/timelapses/${projectId}.mp4`;
                res.status(200).json(new ApiResponse(200, { videoUrl }, "Timelapse generated successfully."));
            })
            .on('error', (err) => {
                console.error("[Timelapse] FFmpeg error:", err);
                // Temp frames delete karein, bhale hi error aaye
                if (fs.existsSync(tempFramesDir)) {
                    fs.rmSync(tempFramesDir, { recursive: true, force: true });
                }
                return next(new ApiError(500, "Failed to generate video due to an FFmpeg error."));
            })
            .run();

    } catch (err) {
        next(err);
    }
};