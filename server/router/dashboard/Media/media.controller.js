import MediaLibrary from "../../../database/db/media.db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory for storing media files
const MEDIA_DIR = path.join(__dirname, "../../../../public/media/library");

// Ensure media directory exists
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Multer destination called for file:", file.originalname);
    cb(null, MEDIA_DIR);
  },
  filename: function (req, file, cb) {
    console.log("Multer filename called for file:", file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/\s+/g, "_"));
  },
});

const fileFilter = (req, file, cb) => {
  console.log(
    "Multer fileFilter called for file:",
    file.originalname,
    "mimetype:",
    file.mimetype
  );
  // Accept images, videos, and documents
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype === "application/pdf" ||
    file.mimetype.includes("document")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter,
});

const isAjaxRequest = (req) => {
  return (
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes("application/json")) ||
    (req.headers["content-type"] &&
      req.headers["content-type"].includes("application/json")) ||
    (req.headers["x-requested-with"] &&
      req.headers["x-requested-with"] === "XMLHttpRequest")
  );
};

export default class MediaController {
  constructor() {
    this.mediaLibrary = new MediaLibrary();
    this.multerUpload = upload.single("file");
  }

  // Handle file uploads with multer middleware
  uploadMedia = (req, res) => {
    console.log("Upload request received", {
      headers: req.headers,
      contentType: req.get("Content-Type"),
      body: req.body,
    });

    this.multerUpload(req, res, async (err) => {
      if (err) {
        console.error("Multer upload error:", err);

        // Check request type
        if (isAjaxRequest(req)) {
          return res.status(400).json({
            success: false,
            message: err.message || "File upload failed",
          });
        } else {
          req.flash("error_msg", err.message || "File upload failed");
          return res.redirect("/dashboard/media-library");
        }
      }

      try {
        if (!req.file) {
          console.error("No file received");

          if (isAjaxRequest(req)) {
            return res.status(400).json({
              success: false,
              message: "No file uploaded",
            });
          } else {
            req.flash("error_msg", "No file uploaded");
            return res.redirect("/dashboard/media-library");
          }
        }

        console.log("File received:", {
          originalName: req.file.originalname,
          filename: req.file.filename,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
        });

        const { name, description } = req.body;
        if (!name) {
          console.error("No media name provided in request body:", req.body);

          if (isAjaxRequest(req)) {
            return res.status(400).json({
              success: false,
              message: "Media name is required",
            });
          } else {
            req.flash("error_msg", "Media name is required");
            return res.redirect("/dashboard/media-library");
          }
        }

        // File is already saved by multer, just need to save to database
        const relativePath = `/media/library/${req.file.filename}`;

        try {
          console.log("Saving to database with:", {
            name,
            filename: req.file.filename,
            path: relativePath,
            mimetype: req.file.mimetype,
            size: req.file.size,
            description,
          });

          const result = await this.mediaLibrary.addMedia(
            name,
            req.file.filename,
            relativePath,
            req.file.mimetype,
            req.file.size,
            description
          );

          console.log("Database result:", result);

          if (result.success) {
            // Check if client expects JSON (AJAX) or HTML (form submission)
            if (isAjaxRequest(req)) {
              return res.status(200).json({
                success: true,
                message: "Media uploaded successfully",
                data: result.data,
                redirect: "/dashboard/media-library", // Include redirect URL in JSON response
              });
            } else {
              // For regular form submissions, redirect back to the media library
              req.flash("success_msg", "Media uploaded successfully");
              return res.redirect("/dashboard/media-library");
            }
          } else {
            console.error("Database save failed:", result.error);
            // If database save fails, delete the uploaded file
            const filePath = path.join(MEDIA_DIR, req.file.filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log("Cleaned up file after database error:", filePath);
            }

            if (isAjaxRequest(req)) {
              return res.status(500).json({
                success: false,
                message: "Failed to save media information",
                error: result.error,
              });
            } else {
              req.flash("error_msg", "Failed to save media information");
              return res.redirect("/dashboard/media-library");
            }
          }
        } catch (dbError) {
          console.error("Database error:", dbError);

          // Clean up uploaded file on database error
          const filePath = path.join(MEDIA_DIR, req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Cleaned up file after database error:", filePath);
          }

          if (isAjaxRequest(req)) {
            return res.status(500).json({
              success: false,
              message: "Database error occurred",
              error: dbError.message,
            });
          } else {
            req.flash(
              "error_msg",
              "Database error occurred: " + dbError.message
            );
            return res.redirect("/dashboard/media-library");
          }
        }
      } catch (error) {
        console.error("General error:", error);
        if (req.file) {
          const filePath = path.join(MEDIA_DIR, req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Cleaned up file after general error:", filePath);
          }
        }

        if (isAjaxRequest(req)) {
          return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
          });
        } else {
          req.flash("error_msg", "Internal server error: " + error.message);
          return res.redirect("/dashboard/media-library");
        }
      }
    });
  };

  // Get all media for API
  getAllMedia = async (req, res) => {
    try {
      const result = await this.mediaLibrary.getAllMedia();

      if (result.success) {
        return res.status(200).json({
          success: true,
          mediaItems: result.data,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch media",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in getAllMedia:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  // Get media by ID for API
  getMediaById = async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: 400,
          message: "Media ID is required",
        });
      }

      const result = await this.mediaLibrary.getMediaById(id);

      if (result.success) {
        return res.status(200).json({
          status: 200,
          data: result.data,
        });
      } else {
        return res.status(404).json({
          status: 404,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("Error in getMediaById:", error);
      return res.status(500).json({
        status: 500,
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  // Update media
  updateMedia = (req, res) => {
    this.multerUpload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: "File upload error",
          error: err.message,
        });
      }

      try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!id) {
          return res.status(400).json({
            success: false,
            status: 400,
            message: "Media ID is required",
          });
        }

        // Get the existing media first
        const mediaResult = await this.mediaLibrary.getMediaById(id);

        if (!mediaResult.success) {
          return res.status(404).json({
            success: false,
            status: 404,
            message: mediaResult.error,
          });
        }

        const updateData = {};

        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        // Handle file update if a new file is uploaded
        if (req.file) {
          const file = req.file;

          // Generate a new filename - but we don't need to save the file
          // as multer has already saved it with this filename
          const filename = file.filename;

          // Update media info
          updateData.file_name = filename;
          updateData.file_path = `/media/library/${filename}`;
          updateData.mime_type = file.mimetype;
          updateData.size = file.size;

          // Delete the old file
          const oldMedia = mediaResult.data;
          const oldFilePath = path.join(
            __dirname,
            "../../../../public",
            oldMedia.file_path
          );

          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

        const result = await this.mediaLibrary.updateMedia(id, updateData);

        if (result.success) {
          return res.status(200).json({
            success: true,
            status: 200,
            message: "Media updated successfully",
            data: result.data,
          });
        } else {
          return res.status(500).json({
            success: false,
            status: 500,
            message: "Failed to update media",
            error: result.error,
          });
        }
      } catch (error) {
        console.error("Error in updateMedia:", error);
        // Log more detailed information about the error
        if (req.file) {
          console.log("File details:", {
            filename: req.file.filename,
            originalname: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
          });
        } else {
          console.log("No file was uploaded with the request");
        }
        return res.status(500).json({
          success: false,
          status: 500,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
  };

  // Delete media
  deleteMedia = async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: "Media ID is required",
        });
      }

      // Get the media first to get file path
      const mediaResult = await this.mediaLibrary.getMediaById(id);

      if (!mediaResult.success) {
        return res.status(404).json({
          success: false,
          status: 404,
          message: mediaResult.error,
        });
      }

      // Delete the file
      const media = mediaResult.data;
      const filePath = path.join(
        __dirname,
        "../../../../public",
        media.file_path
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      const result = await this.mediaLibrary.deleteMedia(id);

      if (result.success) {
        return res.status(200).json({
          success: true,
          status: 200,
          message: "Media deleted successfully",
        });
      } else {
        return res.status(500).json({
          success: false,
          status: 500,
          message: "Failed to delete media",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in deleteMedia:", error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  // Render media library page
  renderMediaLibrary = async (req, res) => {
    try {
      const result = await this.mediaLibrary.getAllMedia();
      const baseUrl = req.protocol + "://" + req.get("host");

      if (result.success) {
        res.render("dashboard/mediaLibrary", {
          title: "Media Library",
          mediaItems: result.data,
          baseUrl,
          layout: "layouts/main",
        });
      } else {
        req.flash("error_msg", "Failed to fetch media library");
        res.redirect("/dashboard");
      }
    } catch (error) {
      console.error("Error in renderMediaLibrary:", error);
      req.flash("error_msg", "Internal server error");
      res.redirect("/dashboard");
    }
  };
}
