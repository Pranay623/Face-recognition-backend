import express from 'express';
import jwt from 'jsonwebtoken'; // Import JWT
const router = express.Router();
import us from '../models/Model.js';
import bcrypt from 'bcrypt';
import User from '../models/Model.js';
import multer from 'multer';
import path from 'path';
import { authenticateUser } from '../middleware/authentication.js';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { v2 as cloudinary } from 'cloudinary'; // Import Cloudinary
import 'dotenv/config';

import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Cloudinary storage engine

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Your cloud name
    api_key: process.env.CLOUDINARY_API_KEY, // Your API key
    api_secret: process.env.CLOUDINARY_API_SECRET // Your API secret
  });



  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'uploads', // Optional: folder name in Cloudinary
      allowedFormats: ['jpg', 'png', 'jpeg'],
      public_id: (req, file) => file.originalname, // Use the original file name
    },
  });
const upload = multer({ storage: storage }).single('file');

const attendanceStorage =  multer.memoryStorage();
const uploadAttendance = multer({ attendanceStorage });

const JWT_SECRET = process.env.JWT_SECRET;


// Signup route
router.post('/signup', upload, async (req, res) => {
    let { name, email, password } = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();

    
    // Validation checks
    if (name === "" || email === "" || password === "") {
        return res.json({
            status: "Failed",
            message: "Empty fields, including image",
        });
    }

    if (!req.file) {
        return res.json({
            status: "Failed",
            message: "Image is required"
        });
    }

    if (!/^[a-zA-Z ]*$/.test(name)) {
        return res.json({
            status: "Failed",
            message: "Invalid name",
        });
    }

    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        return res.json({
            status: "Failed",
            message: "Invalid e-mail",
        });
    }

    if (password.length < 8) {
        return res.json({
            status: "Failed",
            message: "Password is too short",
        });
    }

    try {
        const existingUser = await User.find({ email });

        if (existingUser.length) {
            return res.json({
                status: "Failed",
                message: "User with this email already exists",
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            image: req.file.path // Save the uploaded image filename
        });

        const result = await newUser.save();
        res.json({
            status: "SUCCESS",
            message: "Signup successful",
            data: {
                result }});

    } catch (err) {
        console.error(err);
        res.json({
            status: "Failed",
            message: "An error occurred while processing your request",
        });
    }
});

// Signin route
router.post('/signin',upload, async (req, res) => {
    let { email, password } = req.body;

    if (!email || !password) {
        return res.json({
            status: "Failed",
            message: "Empty credentials",
        });
    }

    email = email.trim();
    password = password.trim();

    try {
        const user = await User.find({ email });

        if (user.length > 0) {
            const hashedPassword = user[0].password;

            const isMatch = await bcrypt.compare(password, hashedPassword);

            if (isMatch) {

                const token = jwt.sign({ id: user[0]._id }, JWT_SECRET, { expiresIn: '1h' });

                res.cookie("token", token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'None',
                });      

                return res.json({
                    status: "SUCCESS",
                    message: "Sign in successful",
                    data: user[0],
                    // cookieSave
                });
            } else {
                return res.json({
                    status: "Failed",
                    message: "Invalid password",
                });
            }
        } else {
            return res.json({
                status: "Failed",
                message: "Invalid credentials entered",
            });
        }

    } catch (err) {
        console.error(err);
        return res.json({
            status: "Failed",
            message: "An error occurred while checking credentials",
        });
    }
});


// router.post('/attendance', authenticateUser, async (req, res) => {
//     try {
//         const { userID } = req; // Extract userID from the request (set by the middleware)
//         // Fetch user details from the database using userID

//         console.log(userID)
//         const user = await User.findById({_id:userID});



//         // console.log(token)
//         console.log("first")

//         if (!user) {
//             return res.status(404).json({ status: "FAIL", message: "User not found" });
//         }

//         // Respond with the user's name
//         res.json({ status: "SUCCESS", message: "Attendance marked successfully", userName: user.name });
//     } catch (error) {
//         console.error("Error marking attendance:", error);
//         res.status(500).json({ status: "FAIL", message: "Could not mark attendance" });
//     }
// });
  

// router.post('/attendance', uploadAttendance.single('file'), async (req, res) => {
//     try {
//         const { userID } = req.body; // Manually pass userID in request body
//         const user = await User.findById(userID);
//         const image = req.file;

//         // Call the ML model API
//         // const mlResponse = await axios.post('https://face-recognition-coahmkg42-abhishek-rajdhar-dubeys-projects.vercel.app', { image });
        
//         if (!user || !image) {
//             return res.status(404).json({ status: "FAIL", message: "User not found" });
//         }
//         res.json({ status: "SUCCESS", message: "Attendance marked successfully", userName: user.name });
//     } 
    
//     catch (error) {
//         console.error("Error marking attendance:", error);
//         res.status(500).json({ status: "FAIL", message: "Could not mark attendance" });
//     }
// });

router.post('/attendance', uploadAttendance.single('file'), async (req, res) => {
    try {
        const { userID } = req.body; // Manually pass userID in request body
        const user = await User.findById(userID);

        // Check if user and image file are present
        if (!user || !req.file) {
            return res.status(404).json({ status: "FAIL", message: "User not found or image not provided" });
        }

        // Upload the image to Cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { resource_type: 'image', public_id: `attendance/${userID}_attendance` },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            ).end(req.file.buffer); // Pipe the file buffer directly to the Cloudinary uploader
        });

        // Successfully uploaded to Cloudinary
        res.status(200).json({
            status: 'SUCCESS',
            userName: user.name, // Retrieved user name from the database
            imageUrl: result.secure_url, // Cloudinary URL of the uploaded image
            message: "Attendance marked successfully"
        });
    } catch (error) {
        console.error('Error uploading attendance:', error);
        res.status(500).json({ message: 'Attendance marking failed.' });
    }
});

router.get('/profile/:id', async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (user) {
        res.json({ userName: user.name, image: user.image, userEmail: user.email });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  

  

  export default router;