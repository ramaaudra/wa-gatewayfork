// filepath: /Users/mbam1/Local Document/Project/whatsapp-gateway/server/database/db/media.db.js
import MediaModel from "../models/media.model.js";
import { moment } from "../../config/index.js";
import { Op } from "sequelize";

class MediaLibrary {
  constructor() {
    this.media = MediaModel;
  }

  async addMedia(
    name,
    file_name,
    file_path,
    mime_type,
    size,
    description = null
  ) {
    try {
      console.log("MediaLibrary.addMedia called with:", {
        name,
        file_name,
        file_path,
        mime_type,
        size,
        description,
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

  async getAllMedia() {
    try {
      const media = await this.media.findAll({
        order: [["createdAt", "DESC"]],
      });
      return { success: true, data: media };
    } catch (error) {
      console.error("Error getting all media:", error);
      return { success: false, error: error.message };
    }
  }

  // Added a new alias method to avoid name collision in the controller
  async fetchAllMedia() {
    return this.getAllMedia();
  }

  async getMediaById(id) {
    try {
      const media = await this.media.findByPk(id);
      if (!media) {
        return { success: false, error: "Media not found" };
      }
      return { success: true, data: media };
    } catch (error) {
      console.error("Error getting media by ID:", error);
      return { success: false, error: error.message };
    }
  }

  async getMediaByType(mime_type) {
    try {
      const media = await this.media.findAll({
        where: {
          mime_type: {
            [Op.like]: `${mime_type}%`,
          },
        },
        order: [["createdAt", "DESC"]],
      });
      return { success: true, data: media };
    } catch (error) {
      console.error("Error getting media by type:", error);
      return { success: false, error: error.message };
    }
  }

  async updateMedia(id, updateData) {
    try {
      const media = await this.media.findByPk(id);
      if (!media) {
        return { success: false, error: "Media not found" };
      }

      await media.update(updateData);
      return { success: true, data: media };
    } catch (error) {
      console.error("Error updating media:", error);
      return { success: false, error: error.message };
    }
  }

  async deleteMedia(id) {
    try {
      const media = await this.media.findByPk(id);
      if (!media) {
        return { success: false, error: "Media not found" };
      }

      await media.destroy();
      return { success: true, message: "Media deleted successfully" };
    } catch (error) {
      console.error("Error deleting media:", error);
      return { success: false, error: error.message };
    }
  }
}

export default MediaLibrary;
