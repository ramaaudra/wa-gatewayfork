import express from "express";
import multer from "multer"; // Import multer
const router = express.Router();

import ControllerAutoReply from "./autoReply.controller.js";

// Multer setup for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

const controller = new ControllerAutoReply();

router.post(
  "/create-reply",
  upload.single("mediaFile"),
  controller.createReply.bind(controller)
); // Added multer middleware for single file upload with field name 'mediaFile'
router.post(
  "/edit-reply",
  upload.single("mediaFile"),
  controller.editReply.bind(controller)
); // Added multer middleware for single file upload with field name 'mediaFile'
router.get("/delete-reply", controller.deleteReply.bind(controller));
router.get("/deleteall-reply", controller.deleteAllReply.bind(controller));

export default router;
