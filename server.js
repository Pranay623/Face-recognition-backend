import './config/db.js';
import express from 'express';
import cors from 'cors';
const app = express();
const port = 5001;

import UserRouter from './api/user.js';



app.use(express.json());
app.use(cors());
app.use('/user',UserRouter);

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static("uploads"));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}).on('error', (err) => {
    console.error("Failed to start server:", err);
});
