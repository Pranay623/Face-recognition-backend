import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('DB connected');
    })
    .catch((err) => console.log('DB connection error:', err));
