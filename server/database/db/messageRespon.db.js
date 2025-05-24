import { db } from "../../config/Database.js";
import { moment } from "../../config/index.js";
import { Op } from "sequelize";

class ButtonResponse {
  constructor() {
    this.button = db.ButtonResponseModel;
  }

  async createButtonResponse(
    session_name,
    target_number,
    msg_id,
    button,
    btnMessage,
    userId = null
  ) {
    if (!userId) {
      console.error(
        "ButtonResponse.createButtonResponse error: userId is required."
      );
      return; // Or throw error
    }
    for (let j = 0; j < button.filter((x) => x != "").length; j++) {
      await this.button.create({
        session_name,
        target_number,
        msg_id,
        keyword: button.filter((x) => x != "")[j],
        response: btnMessage.filter((x) => x != "")[j],
        user_id: userId,
      });
    }
  }

  async checkKeyword(keyword, target_number, userId = null) {
    // This method seems to be used for checking if a response exists for a given keyword and target.
    // It might not need userId if target_number is unique enough for the context it's used in.
    // However, if button responses are user-specific, userId is needed.
    // For now, assuming original logic might be for a specific interaction flow.
    // If these are user-specific configurations, add userId to where clause.
    const whereClause = { target_number };
    if (userId) whereClause.user_id = userId; // Add if these are user-specific
    const array = await this.button.findAll({ where: whereClause });

    if (Array.isArray(array) && array.length) {
      const index = array.findIndex((x) => x.keyword == keyword);
      if (index === -1) return false;
      return array[index];
    }
    return false;
  }

  async deleteKeyword(msg_id, keyword, userId = null) {
    // Similar to checkKeyword, if these are user-specific, userId is important.
    const whereClause = { msg_id };
    // if (userId) whereClause.user_id = userId; // Add if these are user-specific for deletion by id and keyword.

    // This logic is a bit complex. It finds all by msg_id, then finds index, then finds by primary key.
    // A more direct approach if deleting a specific keyword for a msg_id (and potentially user):
    const itemToDelete = await this.button.findOne({
      where: { msg_id, keyword, ...(userId && { user_id: userId }) },
    });
    if (itemToDelete) {
      await itemToDelete.destroy();
      return true;
    }
    return false;
  }
}

class ListResponse {
  constructor() {
    this.list = db.ListResponseModel;
  }

  async createListResponse(
    session_name,
    target_number,
    msg_id,
    list,
    responList,
    userId = null
  ) {
    if (!userId) {
      console.error(
        "ListResponse.createListResponse error: userId is required."
      );
      return; // Or throw error
    }
    for (let j = 0; j < list.filter((x) => x != "").length; j++) {
      await this.list.create({
        session_name,
        target_number,
        msg_id,
        keyword: list.filter((x) => x != "")[j],
        response: responList.filter((x) => x != "")[j],
        user_id: userId,
      });
    }
  }

  async checkKeyword(keyword, target_number, userId = null) {
    // Similar to ButtonResponse.checkKeyword, consider if userId is needed.
    const whereClause = { target_number };
    if (userId) whereClause.user_id = userId;
    const array = await this.list.findAll({ where: whereClause });

    if (Array.isArray(array) && array.length) {
      const index = array.findIndex((x) => x.keyword == keyword);
      if (index === -1) return false;
      return array[index];
    }
    return false;
  }
}

class AutoReply {
  constructor() {
    this.reply = db.AutoReplyModel;
  }

  async createAutoReply(
    session_name,
    session_number,
    keyword,
    response,
    media_type,
    media_url,
    userId = null
  ) {
    if (!userId) {
      console.error("AutoReply.createAutoReply error: userId is required.");
      return; // Or throw error
    }
    let date = moment().format("DD/MM/YY HH:mm:ss");
    await this.reply.create({
      session_name,
      session_number,
      keyword,
      date,
      response,
      media_type,
      media_url,
      user_id: userId,
    });
  }

  async checkExistAutoReply(session_number, keyword, userId = null) {
    if (!userId) {
      console.error(
        "AutoReply.checkExistAutoReply error: userId is required for this check."
      );
      return true; // Default to true to prevent accidental overwrites if user is not identified
    }
    const existing = await this.reply.findOne({
      where: { session_number, keyword, user_id: userId },
    });
    return !!existing; // Returns true if 'existing' is not null, false otherwise
  }

  async checkReplyMessage(userId = null) {
    if (!userId) {
      console.error("AutoReply.checkReplyMessage error: userId is required.");
      return []; // Return empty array if no user ID
    }
    const array = await this.reply.findAll({ where: { user_id: userId } });
    // The original check `Array.isArray(array) && array.length` is fine.
    // findAll returns empty array if no records, which is valid.
    return array;
  }

  async editReplyMessage(
    session_number, // This seems to be used as a primary part of the key along with keyword
    keyword,
    newKeyword,
    newRespon,
    new_media_type,
    new_media_url,
    userId = null
  ) {
    if (!userId) {
      console.error("AutoReply.editReplyMessage error: userId is required.");
      return false;
    }
    // Assuming session_number and keyword together identify the reply for a specific user
    const result = await this.reply.update(
      {
        keyword: newKeyword,
        response: newRespon,
        media_type: new_media_type,
        media_url: new_media_url,
      },
      {
        where: {
          session_number, // Or session_name, depending on what `session` variable from controller represents
          keyword,
          user_id: userId,
        },
      }
    );
    return result[0] > 0; // Returns true if at least one row was updated
  }

  async deleteReplyMessage(session_number, keyword, userId = null) {
    if (!userId) {
      console.error("AutoReply.deleteReplyMessage error: userId is required.");
      return false;
    }
    const result = await this.reply.destroy({
      where: {
        session_number, // Or session_name
        keyword,
        user_id: userId,
      },
    });
    return result > 0; // Returns true if at least one row was deleted
  }

  async checkMessageUser(session_number, keyword, userId = null) {
    // This method is used by Baileys message handler to find a reply.
    // If the bot's auto-replies are user-specific, then the session that received the message
    // must be linked to a user to fetch that user's specific auto-replies.
    // The `userId` here would be the ID of the user who owns the session `session_number`.
    if (!userId) {
      // If no userId, it means the session itself is not tied to a user, or the user context wasn't passed.
      // In this case, perhaps it should look for global auto-replies (user_id is NULL).
      // For now, let's assume if no userId, no user-specific reply can be found.
      console.warn(
        `AutoReply.checkMessageUser: No userId provided for session ${session_number}, keyword ${keyword}. Cannot find user-specific auto-reply.`
      );
      return false;
    }

    return await this.reply.findOne({
      where: {
        // session_number: session_number.split("@")[0], // Original logic for session_number format
        session_number, // Assuming session_number is passed correctly
        keyword: { [Op.iLike]: keyword }, // Case-insensitive keyword match
        user_id: userId,
      },
    });
  }

  async getAllKeyword(userId = null) {
    // For fetching all keywords for a user (e.g. for deleteAllReply)
    if (!userId) {
      console.error("AutoReply.getAllKeyword error: userId is required.");
      return [];
    }
    return await this.reply.findAll({
      where: { user_id: userId },
      attributes: ["media_url"],
    });
  }

  async deleteAllKeyword(userId = null) {
    if (!userId) {
      console.error("AutoReply.deleteAllKeyword error: userId is required.");
      return false;
    }
    const result = await this.reply.destroy({ where: { user_id: userId } });
    return result > 0; // Returns true if any rows were deleted
  }
}

export { ButtonResponse, ListResponse, AutoReply };
