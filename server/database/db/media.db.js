// filepath: /Users/mbam1/Local Document/Project/whatsapp-gateway/server/database/db/media.db.js
import { db } from "../../config/Database.js";
import { moment } from "../../config/index.js";
import { Op } from "sequelize";

class MediaLibrary {
  constructor() {
    this.media = db.MediaModel;
  }

  async addMedia(
    name,
    file_name,
    file_path,
    mime_type,
    size,
    description = null,
    userId = null
  ) {
    try {
      if (!userId) {
        console.error("MediaLibrary.addMedia error: userId is required.");
        return { success: false, error: "User ID is required to add media." };
      }
      console.log("MediaLibrary.addMedia called with:", {
        name,
        file_name,
        file_path,
        mime_type,
        size,
        description,
        userId,
      });

      const upload_date = moment().format("DD/MM/YY HH:mm:ss");
      console.log("Creating media record with upload_date:", upload_date);

      console.log("Attempting database insert...");
      const newMedia = await this.media.create({
        name,
        file_name,
        file_path,
        mime_type,
        size,
        description,
        upload_date,
        user_id: userId, // Save user_id
      });

      console.log("Database insert successful:", newMedia.toJSON());
      return { success: true, data: newMedia };
    } catch (error) {
      console.error("Error adding media with details:", {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        sqlError: error.parent
          ? {
              code: error.parent.code,
              sqlMessage: error.parent.sqlMessage,
            }
          : null,
      });
      return { success: false, error: error.message };
    }
  }

  async getAllMedia(userId = null) {
    try {
      if (!userId) {
        console.error("MediaLibrary.getAllMedia error: userId is required.");
        return { success: false, error: "User ID is required to get media." };
      }
      const media = await this.media.findAll({
        where: { user_id: userId }, // Filter by user_id
        order: [["createdAt", "DESC"]],
      });
      return { success: true, data: media };
    } catch (error) {
      console.error("Error getting all media for user:", userId, error);
      return { success: false, error: error.message };
    }
  }

  // Added a new alias method to avoid name collision in the controller
  // This also needs to be user-aware if it's used by user-facing features
  async fetchAllMedia(userId = null) {
    if (!userId) {
      // Decide behavior: return all media (admin) or error out/return empty (user context)
      // For now, let's assume if no userId, it's an error or should return empty for non-admins
      console.warn(
        "MediaLibrary.fetchAllMedia called without userId. Returning empty array."
      );
      return { success: true, data: [] };
    }
    return this.getAllMedia(userId);
  }

  async getMediaById(id, userId = null) {
    try {
      if (!userId) {
        console.error("MediaLibrary.getMediaById error: userId is required.");
        return {
          success: false,
          error: "User ID is required to get media by ID.",
        };
      }
      const media = await this.media.findOne({
        where: { id: id, user_id: userId }, // Ensure media belongs to user
      });
      if (!media) {
        return { success: false, error: "Media not found or access denied." };
      }
      return { success: true, data: media };
    } catch (error) {
      console.error("Error getting media by ID for user:", userId, error);
      return { success: false, error: error.message };
    }
  }

  async getMediaByType(mime_type, userId = null) {
    try {
      if (!userId) {
        console.error("MediaLibrary.getMediaByType error: userId is required.");
        return {
          success: false,
          error: "User ID is required to get media by type.",
        };
      }
      const media = await this.media.findAll({
        where: {
          mime_type: {
            [Op.like]: `${mime_type}%`,
          },
          user_id: userId, // Filter by user_id
        },
        order: [["createdAt", "DESC"]],
      });
      return { success: true, data: media };
    } catch (error) {
      console.error("Error getting media by type for user:", userId, error);
      return { success: false, error: error.message };
    }
  }

  async updateMedia(id, updateData, userId = null) {
    try {
      if (!userId) {
        console.error("MediaLibrary.updateMedia error: userId is required.");
        return {
          success: false,
          error: "User ID is required to update media.",
        };
      }
      const media = await this.media.findOne({
        where: { id: id, user_id: userId },
      });
      if (!media) {
        return { success: false, error: "Media not found or access denied." };
      }

      await media.update(updateData);
      return { success: true, data: media };
    } catch (error) {
      console.error("Error updating media for user:", userId, error);
      return { success: false, error: error.message };
    }
  }

  async deleteMedia(id, userId = null) {
    try {
      if (!userId) {
        console.error("MediaLibrary.deleteMedia error: userId is required.");
        return {
          success: false,
          error: "User ID is required to delete media.",
        };
      }
      const media = await this.media.findOne({
        where: { id: id, user_id: userId },
      });
      if (!media) {
        return { success: false, error: "Media not found or access denied." };
      }

      await media.destroy();
      return { success: true, message: "Media deleted successfully" };
    } catch (error) {
      console.error("Error deleting media for user:", userId, error);
      return { success: false, error: error.message };
    }
  }
}

export default MediaLibrary;
