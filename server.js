import connectDB from "./src/config/db.config.js";
import { PORT, CORS_ALLOWED_ORIGINS } from "./src/config/env.config.js"; // CORS_ALLOWED_ORIGINS ko import karein
import { app } from './app.js';
import http from 'http'; // (1) HTTP module import karein
import { Server } from 'socket.io'; // (2) Socket.IO Server class import karein
import { initializeSocketIO } from './src/socket/index.js'; // (3) Humari socket logic wali file (abhi banayenge)

// (4) Express app se ek standard HTTP server banayein
const httpServer = http.createServer(app);

// (5) Us HTTP server se Socket.IO server banayein
const io = new Server(httpServer, {
    pingTimeout: 60000,
    cors: {
        origin: CORS_ALLOWED_ORIGINS, // Aapki env config se frontend ka URL istemal karein
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// (6) Apni tamam socket logic ko alag function mein initialize karein
initializeSocketIO(io);
export { io }; // (7) Ab database connect karein aur app.listen() ke bajaye httpServer.listen() call karein
connectDB()
    .then(() => {
        httpServer.listen(PORT, () => {
            // eslint-disable-next-line
            console.log(`⚙️ Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        // eslint-disable-next-line
        console.log('MongoDB connection failed!', err);
    });