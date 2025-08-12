// src/utils/multer.js
import path from "path";
import fs from "fs";
import multer from "multer";

const uploadDir = path.resolve(process.cwd(), "public", "uploads", "projects");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/\s+/g, "-");
        cb(null, `${Date.now()}-${safe}`);
    },
});

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
