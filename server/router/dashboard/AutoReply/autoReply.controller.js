import { AutoReply } from "../../../database/db/messageRespon.db.js";
import MediaModel from "../../../database/models/media.model.js"; // Changed to default import
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory for storing media files for auto-reply
const AUTOREPLY_MEDIA_DIR = path.join(
  __dirname,
  "../../../../public/media/autoreply"
);

// Ensure media directory exists
if (!fs.existsSync(AUTOREPLY_MEDIA_DIR)) {
  fs.mkdirSync(AUTOREPLY_MEDIA_DIR, { recursive: true });
}

export default class AutoReplyController extends AutoReply {
  constructor() {
    super();
  }

  async createReply(req, res) {
    try {
      const userId = req.session.user ? req.session.user.id : null;
      if (!userId) {
        return res.status(401).send({ status: 401, message: "Unauthorized. Please log in." });
      }

      let { session, keyword, respon, mediaLibraryId } = req.body;
      if (!session || !keyword || !respon) {
        return res
          .status(400)
          .send({ status: 400, message: "Input Data Keyword & Response." });
      }

      let session_number = session.split(" (")[1].replace(")", "").trim();
      let session_name = session.split(" (")[0];
      
      // Check if this session_name belongs to the user before proceeding
      // This requires a method like findOneSessionByNameAndUser from SessionDatabase
      // For now, assuming session parameter is valid and belongs to user or is admin-managed
      // Ideally: const userSession = await new SessionDatabase().findOneSessionByNameAndUser(session_name, userId);
      // if (!userSession) return res.status(403).send({ status: 403, message: "Forbidden: Session does not belong to you." });


      // checkExistAutoReply should also be user-aware
      let check = await this.checkExistAutoReply(session_number, keyword, userId);

      if (check) {
        return res
          .status(403)
          .send({
            status: 403,
            message: `Cannot Create Auto Reply With Keyword ${keyword} Again in Same Session ${session_number} for your account.`,
          });
      } else {
        let media_type = null;
        let media_url = null;

        if (mediaLibraryId) {
          // Ensure the media item from library belongs to the user
          const mediaItem = await MediaModel.findOne({ where: { id: mediaLibraryId, user_id: userId } });
          if (mediaItem) {
            media_type = mediaItem.mime_type;
            media_url = mediaItem.file_path.replace(/^\/public/, "");
          } else {
            console.warn(`Media item with ID ${mediaLibraryId} not found for user ${userId} or does not exist.`);
            return res.status(404).send({ status: 404, message: `Media item not found in your library.` });
          }
        } else if (req.file) {
          const file = req.file;
          const filename = `${Date.now()}-${file.originalname.replace(
            /\s+/g,
            "_"
          )}`;
          const filepath = path.join(AUTOREPLY_MEDIA_DIR, filename);
          fs.writeFileSync(filepath, file.buffer);
          media_type = file.mimetype;
          media_url = `/media/autoreply/${filename}`;
        }

        // Pass userId to createAutoReply
        await this.createAutoReply(
          session_name,
          session_number,
          keyword,
          respon,
          media_type,
          media_url,
          userId
        );
        return res
          .status(200)
          .send({
            status: 200,
            message: `Success Add Auto Reply With Keyword ${keyword}`,
          });
      }
    } catch (error) {
      console.error("Error in createReply:", error);
      res.status(500).send({ status: 500, message: "Internal Server Error!" });
    }
  }

  async editReply(req, res) {
    try {
      const userId = req.session.user ? req.session.user.id : null;
      if (!userId) {
        return res.status(401).send({ status: 401, message: "Unauthorized. Please log in." });
      }

      let {
        session, // This is session_name from the form
        keyword,
        newRespon,
        newKeyword,
        mediaLibraryId,
        keepOldMedia,
      } = req.body;
      const shouldKeepOldMedia = keepOldMedia === "true";

      if (!session || !keyword || !newRespon || !newKeyword) {
        return res
          .status(400)
          .send({ status: 400, message: "Input Data Keyword & Response." });
      }
      
      // session from body is session_name. We need session_number for checkMessageUser if it uses it.
      // Assuming session is session_name.
      // checkMessageUser needs to be user-aware.
      const existingReply = await this.checkMessageUser(session, keyword, userId);
      if (!existingReply) {
          return res.status(404).send({status: 404, message: "Auto-reply not found or you do not have permission."});
      }

      let final_media_type = existingReply.media_type; // Default to existing
      let final_media_url = existingReply.media_url;   // Default to existing

      const deleteOldMediaIfNeeded = (currentReply) => {
        if (currentReply && currentReply.media_url && currentReply.media_url.startsWith('/media/autoreply/')) { // Only delete if it's an autoreply media
          const publicPath = path.join(__dirname, "../../../../public");
          const oldMediaPath = path.join(publicPath, currentReply.media_url);
          if (fs.existsSync(oldMediaPath)) {
            try {
              fs.unlinkSync(oldMediaPath);
              console.log("Deleted old autoreply media:", oldMediaPath);
            } catch (delError) {
              console.error("Error deleting old autoreply media:", delError);
            }
          }
        }
      };

      if (mediaLibraryId) {
        const mediaItem = await MediaModel.findOne({ where: { id: mediaLibraryId, user_id: userId } });
        if (mediaItem) {
          deleteOldMediaIfNeeded(existingReply); // Delete old custom media if new one is from library
          final_media_type = mediaItem.mime_type;
          final_media_url = mediaItem.file_path.replace(/^\/public/, "");
        } else {
          // Media from library not found or not owned by user, keep old media if requested
          if (!shouldKeepOldMedia) {
            deleteOldMediaIfNeeded(existingReply);
            final_media_type = null;
            final_media_url = null;
          }
          // If shouldKeepOldMedia, final_media_type/url remain as existingReply's
        }
      } else if (req.file) {
        deleteOldMediaIfNeeded(existingReply); // Delete old custom media if new one is uploaded
        const file = req.file;
        const filename = `${Date.now()}-${file.originalname.replace(
          /\s+/g,
          "_"
        )}`;
        const filepath = path.join(AUTOREPLY_MEDIA_DIR, filename);
        fs.writeFileSync(filepath, file.buffer);
        final_media_type = file.mimetype;
        final_media_url = `/media/autoreply/${filename}`;
      } else {
        // No new media selected or uploaded
        if (!shouldKeepOldMedia) {
          deleteOldMediaIfNeeded(existingReply);
          final_media_type = null;
          final_media_url = null;
        }
        // If shouldKeepOldMedia, final_media_type/url remain as existingReply's (already set by default)
      }
      
      // Pass userId to editReplyMessage
      // Assuming session is session_name here. If editReplyMessage needs session_number, it needs to be derived.
      await this.editReplyMessage(
        session, // This is session_name
        keyword,
        newKeyword,
        newRespon,
        final_media_type,
        final_media_url,
        userId
      );
      return res
        .status(200)
        .send({
          status: 200,
          message: `Success Edit Auto Reply ${keyword} With Keyword ${newKeyword}`,
        });
    } catch (error) {
      console.error("Error in editReply:", error);
      res.status(500).send({ status: 500, message: "Internal Server Error!" });
    }
  }

  async deleteReply(req, res) {
    try {
      const userId = req.session.user ? req.session.user.id : null;
      if (!userId) {
        return res.status(401).send({ status: 401, message: "Unauthorized. Please log in." });
      }

      let { session, keyword } = req.query; // session is session_name
      if (!session || !keyword) {
        return res.status(400).send({ status: 400, message: "Input Data!" });
      }

      // checkMessageUser needs to be user-aware
      const existingReply = await this.checkMessageUser(session, keyword, userId);
      if (!existingReply) {
          return res.status(404).send({status: 404, message: "Auto-reply not found or you do not have permission."});
      }

      if (existingReply.media_url && existingReply.media_url.startsWith('/media/autoreply/')) {
        const publicPath = path.join(__dirname, "../../../../public");
        const mediaPath = path.join(publicPath, existingReply.media_url);
        if (fs.existsSync(mediaPath)) {
          try {
            fs.unlinkSync(mediaPath);
            console.log("Deleted media on reply deletion:", mediaPath);
          } catch (delError) {
            console.error("Error deleting media on reply deletion:", delError);
          }
        }
      }
      
      // Pass userId to deleteReplyMessage
      await this.deleteReplyMessage(session, keyword, userId);
      return res
        .status(200)
        .send({
          status: 200,
          message: `Success Delete Auto Reply With Keyword ${keyword}`,
        });
    } catch (error)      console.error("Error in deleteReply:", error);
      res.status(500).send({ status: 500, message: "Internal Server Error!" });
    }
  }

  async deleteAllReply(req, res) {
    try {
      const userId = req.session.user ? req.session.user.id : null;
      if (!userId) {
        return res.status(401).send({ status: 401, message: "Unauthorized. Please log in." });
      }
      
      // getAllKeyword needs to be user-aware
      const allReplies = await this.getAllKeyword(userId); 
      if (allReplies && allReplies.length > 0) {
        const publicPath = path.join(__dirname, "../../../../public");
        for (const reply of allReplies) {
          if (reply.media_url && reply.media_url.startsWith('/media/autoreply/')) {
            const mediaPath = path.join(publicPath, reply.media_url);
            if (fs.existsSync(mediaPath)) {
              try {
                fs.unlinkSync(mediaPath);
                console.log("Deleted media on deleteAllReply for user:", userId, mediaPath);
              } catch (delError) {
                console.error(
                  "Error deleting media on deleteAllReply for user:", userId, delError
                );
              }
            }
          }
        }
      }
      
      // Pass userId to deleteAllKeyword
      await this.deleteAllKeyword(userId); 
      return res
        .status(200)
        .send({
          status: 200,
          message: `Success Delete All Keyword Auto Reply for your account.`,
        });
    } catch (error) {
      console.error("Error in deleteAllReply:", error);
      res.status(500).send({ status: 500, message: "Internal Server Error!" });
    }
  }
}
