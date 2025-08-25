// src/controllers/timelapse.controller.js
import DrawingLog from '../models/drawingLog.model.js';
import Project from '../models/project.model.js';
import { createCanvas } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

export const generateTimelapse = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId);
        if (!project) throw new ApiError(404, "Project not found.");

        const logs = await DrawingLog.find({ projectId }).sort({ createdAt: 'asc' });
        if (logs.length === 0) throw new ApiError(404, "No drawings found to generate timelapse.");

        const canvas = createCanvas(project.width, project.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, project.width, project.height);

        const tempFramesDir = path.resolve(process.cwd(), 'public', 'temp_frames', projectId);
        if (fs.existsSync(tempFramesDir)) fs.rmSync(tempFramesDir, { recursive: true, force: true });
        fs.mkdirSync(tempFramesDir, { recursive: true });

        // Har stroke ko ek frame ke tor par draw karein
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            const { strokePath, brushSize, color, mode } = log.stroke;
            // ... (Yahan 'KonvaCanvas' jaisi drawing logic likhni hogi)
            // ... (Har stroke ko ctx par draw karein)

            const framePath = path.join(tempFramesDir, `frame-${String(i).padStart(5, '0')}.png`);
            fs.writeFileSync(framePath, canvas.toBuffer('image/png'));
        }

        const outputPath = path.resolve(process.cwd(), 'public', 'timelapses', `${projectId}.mp4`);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        // FFmpeg se video banayein
        ffmpeg(path.join(tempFramesDir, 'frame-%05d.png'))
            .inputFPS(10) // 10 frames per second
            .output(outputPath)
            .on('end', () => {
                fs.rmSync(tempFramesDir, { recursive: true, force: true }); // Temp frames delete karein
                res.status(200).json({ videoUrl: `/timelapses/${projectId}.mp4` });
            })
            .on('error', (err) => {
                console.error("FFmpeg error:", err);
                next(new ApiError(500, "Failed to generate video."));
            })
            .run();

    } catch (err) {
        next(err);
    }
};