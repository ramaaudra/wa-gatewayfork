import express from "express";
import MediaController from "./media.controller.js"; // Added .js extension

const router = express.Router();
const mediaController = new MediaController();

// Route to render the media library page (which will also list media)
router.get("/", mediaController.renderMediaLibrary.bind(mediaController));

// Route to handle media upload (mounted at /dashboard/media-library/upload)
router.post("/upload", mediaController.uploadMedia.bind(mediaController));

// API endpoint to get all media
router.get("/api/list", mediaController.getAllMedia.bind(mediaController));

// API route to get a single media item by ID
router.get("/api/:id", mediaController.getMediaById.bind(mediaController));

// Route to update media metadata
router.post("/edit/:id", mediaController.updateMedia.bind(mediaController));

// Route to delete media
router.delete("/delete/:id", mediaController.deleteMedia.bind(mediaController));

export default router;
