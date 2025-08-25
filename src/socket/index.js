const initializeSocketIO = (io) => {
    
    return io.on("connection", (socket) => {
        console.log(`✅ User connected: ${socket.id}`);

        // --- MOJOODA EVENTS (Waisay hi rahenge) ---
        socket.on('join_project', (projectId) => {
            socket.join(projectId);
            // console.log(`User ${socket.id} joined room: ${projectId}`);
        });

        socket.on('new_drawing', (data) => {
            const { projectId, contribution } = data;
            socket.to(projectId).emit('drawing_received', contribution);
        });

        // === YAHAN NAYE EVENTS ADD KAREIN ===

        // Event: Jab ek user apna cursor move karta hai
        socket.on('cursor_move', (data) => {
            const { projectId, user, position } = data;
            // Doosre users ko is user ki cursor position broadcast karein
            // Hum 'user' object bhi bhej rahe hain taake naam aur color dikha sakein
            // Hum 'socket.id' bhi bhej rahe hain taake har cursor ko uniquely identify kar sakein
            socket.to(projectId).emit('cursor_update', {
                socketId: socket.id, 
                user: user,
                position: position
            });
        });

        // Event: Jab user connection band karta hai
        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${socket.id}`);
            // Sab clients ko batayein ke yeh user chala gaya hai taake woh iska cursor hata dein
            // Hum 'io.emit' istemal kar sakte hain ya har room ko alag se bhej sakte hain
            io.emit('user_left', socket.id);
        });
    });
};

export { initializeSocketIO };