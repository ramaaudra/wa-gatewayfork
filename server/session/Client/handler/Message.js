import {
  AutoReply,
  ButtonResponse,
  ListResponse,
} from "../../../database/db/messageRespon.db.js";
import Client from "./Client.js";
import Serialize from "./Serialize.js";

export default class Message extends Serialize {
  constructor(client, msg, session_name, userId = null) { // Add userId, default to null for safety
    super();
    this.session = session_name;
    this.client = client;
    this.msg = msg.messages;
    this.type = msg.type;
    this.userId = userId; // Store the userId
  }

  async mainHandler() {
    try {
      if (!this.msg) return;
      const message = this.msg[0];
      if (message.key && message.key.remoteJid === "status@broadcast") return;
      if (!message.message) return;
      const m = await this.serial(this.client, message);

      const bot = new Client(this.client, m.from);
      const CMD = m.command ? m.command : null;
      if (!CMD) return this.messageHandler(m, bot);
    } catch (error) {
      console.log(error);
    }
  }

  async messageHandler(m, bot) {
    const buttonResponse = new ButtonResponse();
    const listResponse = new ListResponse();
    const replyResponse = new AutoReply();

    // Pass userId to these check methods
    // Note: m.botNumber is the session_number. The userId is the owner of this session.
    const keywordReply = await replyResponse.checkMessageUser(
      m.botNumber, // session_number
      m.body,
      this.userId // Pass the stored userId
    );
    // For button and list responses, they are typically tied to a specific interaction (target_number)
    // and might not be directly user-specific in the same way as auto-replies.
    // If checkKeyword in ButtonResponse/ListResponse was made user-specific, pass this.userId.
    // For now, assuming their existing logic is sufficient based on previous changes.
    // If they store user_id, it should be passed:
    // const keywordButton = await buttonResponse.checkKeyword(m.body, m.from, this.userId);
    // const keywordList = await listResponse.checkKeyword(m.body, m.from, this.userId);
    const keywordButton = await buttonResponse.checkKeyword(m.body, m.from); // Assuming not user-specific for now for this check
    const keywordList = await listResponse.checkKeyword(m.body, m.from);   // Assuming not user-specific for now for this check


    if (keywordButton) {
      await bot.reply(keywordButton.response, m.msg);
      // If deleteKeyword was made user-specific, pass this.userId
      return await buttonResponse.deleteKeyword(
        keywordButton.msg_id,
        keywordButton.keyword
        // this.userId // if needed
      );
    } else if (keywordList) {
      await bot.reply(keywordList.response, m.msg);
    } else if (keywordReply) { // keywordReply is now user-specific
      if (keywordReply.media_url && keywordReply.media_type) {
        const mediaPathOrUrl = keywordReply.media_url.startsWith("http")
          ? keywordReply.media_url
          : `./public${keywordReply.media_url}`; // Assuming media_url is like /media/library/file.jpg

        const mediaName = keywordReply.media_url.split("/").pop();
        const options = {
          file: {
            mimetype: keywordReply.media_type,
            name: mediaName,
          },
        };
        await bot.sendMedia(
          mediaPathOrUrl,
          keywordReply.response,
          options,
          m.msg
        );
      } else {
        await bot.reply(keywordReply.response, m.msg);
      }
    }
    if (m.body == "Bot") {
      return bot.reply(`Yes Sir..`, m.msg);
    } else if (m.body == "Test") {
      await bot.reply("Okee", m.msg);
    }
  }
}
