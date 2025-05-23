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
      let { session, keyword, respon, mediaLibraryId } = req.body; // Added mediaLibraryId
      if (!session || !keyword || !respon) {
        return res
          .status(400)
          .send({ status: 400, message: `Input Data Keyword & Response` });
      }

      let session_number = session.split(" (")[1].replace(")", "").trim();
      let session_name = session.split(" (")[0];
      let check = await this.checkExistAutoReply(session_number, keyword);

      if (check) {
        return res
          .status(403)
          .send({
            status: 403,
            message: `Cannot Create Auto Reply With Keyword ${keyword} Again in Same Session ${session_number}`,
          });
      } else {
        let media_type = null;
        let media_url = null;

        if (mediaLibraryId) {
          const mediaItem = await MediaModel.findByPk(mediaLibraryId);
          if (mediaItem) {
            media_type = mediaItem.mime_type;
            // mediaItem.file_path is like /public/media/library/filename.ext
            // We need the URL part: /media/library/filename.ext
            media_url = mediaItem.file_path.replace(/^\/public/, "");
          } else {
            console.warn(`Media item with ID ${mediaLibraryId} not found.`);
            // Optionally, return an error if media library item is specified but not found
            // return res.status(404).send({ status: 404, message: `Media item not found in library.` });
          }
        } else if (req.file) {
          // Check if file was uploaded directly
          const file = req.file;
          const filename = `${Date.now()}-${file.originalname.replace(
            /\s+/g,
            "_"
          )}`;
          const filepath = path.join(AUTOREPLY_MEDIA_DIR, filename);
          fs.writeFileSync(filepath, file.buffer);
          media_type = file.mimetype;
          media_url = `/media/autoreply/${filename}`; // Store URL relative to public
        }

        await this.createAutoReply(
          session_name,
          session_number,
          keyword,
          respon,
          media_type,
          media_url
        );
        return res
          .status(200)
          .send({
            status: 200,
            message: `Success Add Auto Reply With Keyword ${keyword}`,
          });
      }
    } catch (error) {
      console.log("Error in createReply:", error);
      res.status(500).send({ status: 500, message: "Internal Server Error!" });
    }
  }

  async editReply(req, res) {
    try {
      let {
        session,
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
          .send({ status: 400, message: `Input Data Keyword & Response` });
      }

      let final_media_type = null;
      let final_media_url = null;

      const existingReply = await this.checkMessageUser(session, keyword);

      // Function to delete old media if it exists
      const deleteOldMediaIfNeeded = (currentReply) => {
        if (currentReply && currentReply.media_url) {
          // Determine if the media_url is from autoreply or library
          const publicPath = path.join(__dirname, "../../../../public");
          const oldMediaPath = path.join(publicPath, currentReply.media_url);
          if (fs.existsSync(oldMediaPath)) {
            try {
              fs.unlinkSync(oldMediaPath);
              console.log("Deleted old media:", oldMediaPath);
            } catch (delError) {
              console.error("Error deleting old media:", delError);
            }
          }
        }
      };

      if (mediaLibraryId) {
        // Media selected from library
        const mediaItem = await MediaModel.findByPk(mediaLibraryId);
        if (mediaItem) {
          final_media_type = mediaItem.mime_type;
          final_media_url = mediaItem.file_path.replace(/^\/public/, ""); // URL relative to public
          deleteOldMediaIfNeeded(existingReply); // Delete old if new one is from library
        } else {
          console.warn(
            `Media item with ID ${mediaLibraryId} not found for edit.`
          );
          // If library item not found, decide if we keep old or remove
          if (shouldKeepOldMedia && existingReply) {
            final_media_type = existingReply.media_type;
            final_media_url = existingReply.media_url;
          } else {
            deleteOldMediaIfNeeded(existingReply); // Remove if not keeping
            // final_media_type and final_media_url remain null
          }
        }
      } else if (req.file) {
        // New file uploaded directly
        const file = req.file;
        const filename = `${Date.now()}-${file.originalname.replace(
          /\s+/g,
          "_"
        )}`;
        const filepath = path.join(AUTOREPLY_MEDIA_DIR, filename);
        fs.writeFileSync(filepath, file.buffer);
        final_media_type = file.mimetype;
        final_media_url = `/media/autoreply/${filename}`; // URL relative to public
        deleteOldMediaIfNeeded(existingReply); // Delete old if new one is uploaded
      } else {
        // No new media provided (neither library nor upload)
        if (shouldKeepOldMedia && existingReply) {
          final_media_type = existingReply.media_type;
          final_media_url = existingReply.media_url;
        } else {
          // Not keeping old media, and no new media provided
          deleteOldMediaIfNeeded(existingReply);
          // final_media_type and final_media_url remain null
        }
      }

      await this.editReplyMessage(
        session,
        keyword,
        newKeyword,
        newRespon,
        final_media_type,
        final_media_url
      );
      return res
        .status(200)
        .send({
          status: 200,
          message: `Success Edit Auto Reply ${keyword} With Keyword ${newKeyword}`,
        });
    } catch (error) {
      console.log("Error in editReply:", error);
      res.status(500).send({ status: 500, message: "Internal Server Error!" });
    }
  }

  async deleteReply(req, res) {
    try {
      let { session, keyword } = req.query;
      if (!session || !keyword) {
        return res.status(400).send({ status: 400, message: `Input Data!` });
      }

      const existingReply = await this.checkMessageUser(session, keyword);
      if (existingReply && existingReply.media_url) {
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

      await this.deleteReplyMessage(session, keyword);
      return res
        .status(200)
        .send({
          status: 200,
          message: `Success Delete Auto Reply With Keyword ${keyword}`,
        });
    } catch (error) {
      console.log("Error in deleteReply:", error);
      res.status(500).send({ status: 500, message: "Internal Server Error!" });
    }
  }

  async deleteAllReply(req, res) {
    try {
      // Fetch all replies to delete their media files first
      const allReplies = await this.getAllKeyword(); // Assuming this method exists and returns all replies
      if (allReplies && allReplies.length > 0) {
        const publicPath = path.join(__dirname, "../../../../public");
        for (const reply of allReplies) {
          if (reply.media_url) {
            const mediaPath = path.join(publicPath, reply.media_url);
            if (fs.existsSync(mediaPath)) {
              try {
                fs.unlinkSync(mediaPath);
                console.log("Deleted media on deleteAllReply:", mediaPath);
              } catch (delError) {
                console.error(
                  "Error deleting media on deleteAllReply:",
                  delError
                );
              }
            }
          }
        }
      }
      await this.deleteAllKeyword(); // This deletes records from DB
      return res
        .status(200)
        .send({
          status: 200,
          message: `Success Delete All Keyword Auto Reply`,
        });
    } catch (error) {
      console.log("Error in deleteAllReply:", error);
      res.status(500).send({ status: 500, message: "Internal Server Error!" });
    }
  }
}
