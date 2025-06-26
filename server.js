import connectDB from "./src/config/db.config.js";
import { PORT } from "./src/config/env.config.js";
import { app } from './app.js';

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            // eslint-disable-next-line
            console.log(`⚙️ Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        // eslint-disable-next-line
        console.log('MongoDB connection failed!', err);
    });
