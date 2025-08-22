const initializeSocketIO = (io) => {

    return io.on("connection", (socket) => {
        console.log(`✅ User connected: ${socket.id}`);

        // Event: Jab user kisi project page ko join karta hai
        socket.on('join_project', (projectId) => {
            socket.join(projectId);
            // console.log(`User ${socket.id} joined room: ${projectId}`);
        });

        // Event: Jab ek user nayi drawing banata hai
        socket.on('new_drawing', (data) => {
            // YEH LINE ADD KAREIN
            // console.log("Received 'new_drawing' on backend with data:", data);

            const { projectId, contribution } = data;
            socket.to(projectId).emit('drawing_received', contribution);
        });
        socket.on('cursor_move', (data) => {
            // YEH LINE ADD KAREIN
            // console.log("Cursor move event received on backend:", data);

            const { projectId, user, position } = data;
            socket.to(projectId).emit('cursor_update', {
                socketId: socket.id,
                user: user,
                position: position
            });
        });
        // Event: Jab user connection band karta hai
        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${socket.id}`);
        });
    });
};

export { initializeSocketIO };