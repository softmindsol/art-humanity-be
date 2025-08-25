import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

export const generateThumbnail = async (strokes) => {
    const THUMB_SIZE = 150; // Thumbnail ka size (150x150 pixels)
    const PADDING = 15;   // Drawing ke charon taraf thori si khali jaga (padding)
    const canvas = createCanvas(THUMB_SIZE, THUMB_SIZE);
    const ctx = canvas.getContext('2d');

    // Step 1: Background ko transparent rakhein ya safed (optional)
    // ctx.fillStyle = '#FFFFFF';
    // ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);

    // Agar koi stroke hi nahi, to khali image return karein
    if (!strokes || strokes.length === 0) {
        return canvas.toDataURL();
    }

    // Step 2: Tamam strokes ke coordinates dhoondein taake drawing ka size pata chal sake
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    strokes.forEach(stroke => {
        if (stroke && stroke.strokePath) {
            stroke.strokePath.forEach(p => {
                if (p) {
                    minX = Math.min(minX, p.fromX, p.toX);
                    minY = Math.min(minY, p.fromY, p.toY);
                    maxX = Math.max(maxX, p.fromX, p.toX);
                    maxY = Math.max(maxY, p.fromY, p.toY);
                }
            });
        }
    });

    // Agar coordinates theek nahi, to khali image return karein
    if (minX === Infinity) {
        return canvas.toDataURL();
    }

    // Step 3: Drawing ke asal dimensions nikalें
    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;

    // Step 4: Scale aur offset calculate karein taake drawing thumbnail ke andar padding ke saath fit ho jaye
    const canvasDrawableArea = THUMB_SIZE - (PADDING * 2);
    const scale = Math.min(canvasDrawableArea / drawingWidth, canvasDrawableArea / drawingHeight);

    // Drawing ko canvas ke center mein lane ke liye offset
    const offsetX = (THUMB_SIZE - drawingWidth * scale) / 2 - minX * scale;
    const offsetY = (THUMB_SIZE - drawingHeight * scale) / 2 - minY * scale;

    // Step 5: Har stroke ko chotay canvas par draw karein
    strokes.forEach(stroke => {
        if (stroke && stroke.strokePath) {
            const { strokePath, brushSize, color, mode } = stroke;

            ctx.lineWidth = brushSize * scale; // Brush size ko bhi scale karein
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a || 1})`;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';

            ctx.beginPath();
            strokePath.forEach((segment) => {
                if (segment) {
                    const fromX = segment.fromX * scale + offsetX;
                    const fromY = segment.fromY * scale + offsetY;
                    const toX = segment.toX * scale + offsetX;
                    const toY = segment.toY * scale + offsetY;

                    ctx.moveTo(fromX, fromY);
                    ctx.lineTo(toX, toY);
                }
            });
            ctx.stroke();
        }
    });

    // Step 6: Canvas ko Base64 Data URL mein tabdeel karke return karein
    return canvas.toDataURL('image/png');
};