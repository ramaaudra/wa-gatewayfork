import path from "path";
import fs from "fs";

import { helpers, modules } from "../../../lib/index.js";
import Client from "../../session/Client/handler/Client.js";
import ConnectionSession from "../../session/Session.js";
import {
  ButtonResponse,
  ListResponse,
} from "../../database/db/messageRespon.db.js";
import HistoryMessage from "../../database/db/history.db.js";
import History from "../../database/models/history.model.js";
import MediaModel from "../../database/models/media.model.js";

class ControllerApi extends ConnectionSession {
  constructor() {
    super();
    this.history = new HistoryMessage();
  }

  async clientValidator(req, res, sessions, target) {
    try {
      const toTarget = helpers.phoneNumber(target);
      const client = this.getClient(sessions);
      if (!client) {
        res.send({ status: 403, message: `Session ${sessions} not Found` });
        return { toTarget: null, client: null };
      } else if (client && client.isStop == true) {
        res.send({ status: 403, message: `Session ${sessions} is Stopped` });
        return { toTarget: null, client: null };
      }

      if (toTarget.includes("@g.us")) {
        var checkPhone = await client
          .groupMetadata(toTarget)
          .catch((err) => console.log(err));
      } else {
        var checkPhone = await client.onWhatsApp(toTarget);
      }
      if (
        !toTarget.includes("@g.us") &&
        Array.isArray(checkPhone) &&
        checkPhone.length
      ) {
        return { toTarget, client };
      } else if (toTarget.includes("@g.us") && checkPhone?.id) {
        return { toTarget, client };
      } else {
        res.send({
          status: 403,
          message: `The Number/Group (${target}) is not Registered on WhatsApp`,
        });
        return { toTarget: null, client: null };
      }
    } catch (error) {
      console.log(error);
      return res.send({ status: 500, message: "Internal Server Error" });
    }
  }

  async sendText(req, res) {
    try {
      let { sessions, target, message } = req.body;
      if (!sessions || !target || !message) {
        return res.send({ status: 400, message: "Input All Data!" });
      }
      sessions = sessions.includes("(") ? sessions.split(" (")[0] : sessions;
      const { client, toTarget } = await this.clientValidator(
        req,
        res,
        sessions,
        target
      );
      if (!client || !toTarget) return;
      const userId = req.session.user ? req.session.user.id : null; // Get userId from session
      await new Client(client, toTarget).sendText(message);
      await this.history.pushNewMessage(sessions, "TEXT", toTarget, message, userId); // Pass userId
      return res.send({
        status: 200,
        message: `Success Send Message to ${target}!`,
      });
    } catch (error) {
      console.log(error);
      return res.send({ status: 500, message: "Internal Server Error" });
    }
  }

  async sendLocation(req, res) {
    try {
      let { sessions, target, long, lat } = req.body;
      if (!sessions || !target || !long || !lat) {
        return res.send({ status: 400, message: "Input All Data!" });
      }
      sessions = sessions.includes("(") ? sessions.split(" (")[0] : sessions;
      const { client, toTarget } = await this.clientValidator(
        req,
        res,
        sessions,
        target
      );
      if (!client || !toTarget) return;
      await new Client(client, toTarget).sendLocation(lat, long);
      const userId = req.session.user ? req.session.user.id : null; // Get userId from session
      await this.history.pushNewMessage(
        sessions,
        "LOCATION",
        toTarget,
        `Long : ${long} - Lat : ${lat}`,
        userId // Pass userId
      );
      return res.send({
        status: 200,
        message: `Success Send Message to ${target}!`,
      });
    } catch (error) {
      console.log(error);
      return res.send({ status: 500, message: "Internal Server Error" });
    }
  }

  async sendMedia(req, res) {
    try {
      let { sessions, target, message, url, mediaLibraryId } = req.body;
      if (!sessions || !target) {
        return res.send({ status: 400, message: "Input Session & Target!" });
      }
      const text = message ? message : "";
      sessions = sessions.includes("(") ? sessions.split(" (")[0] : sessions;
      const { client, toTarget } = await this.clientValidator(
        req,
        res,
        sessions,
        target
      );
      if (!client || !toTarget) return;
      let nameRandom = helpers.randomText(10);

      if (mediaLibraryId) {
        const media = await MediaModel.findByPk(mediaLibraryId);
        if (!media) {
          return res
            .status(404)
            .send({ message: "Media not found in library." });
        }
        const mediaPath = `./public/media/library/${media.filename}`;
        const opts = {
          file: {
            name: media.filename,
            mimetype: media.mimetype,
          },
        };
        const userId = req.session.user ? req.session.user.id : null;
        await new Client(client, toTarget).sendMedia(mediaPath, text, opts);
        await this.history.pushNewMessage(
          sessions,
          "MEDIA",
          toTarget,
          `File : ${media.filename} (from Library), Caption : ${text}`,
          userId // Pass userId
        );
        return res.send({
          status: 200,
          message: `Success Send Message to ${target}!`,
        });
      } else if (req.files && Object.keys(req.files).length !== 0) {
        const file = req.files.file;
        const dest = `./public/temp/${nameRandom}${path.extname(file.name)}`;
        await file.mv(dest);
        const userId = req.session.user ? req.session.user.id : null;
        await new Client(client, toTarget).sendMedia(dest, text, { file });
        await this.history.pushNewMessage(
          sessions,
          "MEDIA",
          toTarget,
          `File : ${file.name}, Caption : ${text}`,
          userId // Pass userId
        );
        res.send({
          status: 200,
          message: `Success Send Message to ${target}!`,
        });
        return await modules.sleep(3000).then(fs.unlinkSync(dest));
      } else if (url && (!req.files || Object.keys(req.files).length === 0)) {
        if (
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi.test(
            url
          )
        ) {
          const buffer = await helpers.downloadAxios(url);
          const dest = `./public/temp/${nameRandom}`;
          fs.writeFileSync(dest, buffer.data);
          var opts = {
            file: {
              name: nameRandom,
              mimetype: buffer.headers["content-type"],
            },
          };
          const userId = req.session.user ? req.session.user.id : null;
          await new Client(client, toTarget).sendMedia(dest, text, opts);
          await this.history.pushNewMessage(
            sessions,
            "MEDIA",
            toTarget,
            `File : ${url}, Caption : ${text}`,
            userId // Pass userId
          );
          res.send({
            status: 200,
            message: `Success Send Message to ${target}!`,
          });
          return await modules.sleep(3000).then(fs.unlinkSync(dest));
        } else {
          return res.send({ status: 400, message: "Invalid URL!" });
        }
      } else {
        return res.send({
          status: 400,
          message:
            "No files were uploaded, no URL, or no mediaLibraryId provided!",
        });
      }
    } catch (error) {
      console.log(error);
      return res.send({ status: 500, message: "Internal Server Error" });
    }
  }

  async sendSticker(req, res) {
    try {
      let { sessions, target, packname, author, url } = req.body;
      if (!sessions || !target) {
        return res.send({ status: 400, message: "Input Session & Target!" });
      }
      sessions = sessions.includes("(") ? sessions.split(" (")[0] : sessions;
      const { client, toTarget } = await this.clientValidator(
        req,
        res,
        sessions,
        target
      );
      if (!client || !toTarget) return;
      let nameRandom = helpers.randomText(10);
      if (req.files && Object.keys(req.files).length !== 0) {
        const file = req.files.file;
        const dest = `./public/temp/${nameRandom}${path.extname(file.name)}`;
        await file.mv(dest);
        await new Client(client, toTarget).sendSticker(
          true,
          file.mimetype.split("/")[0],
          dest,
          packname,
          author,
          true
        );
        const userId = req.session.user ? req.session.user.id : null;
        await this.history.pushNewMessage(
          sessions,
          "STICKER",
          toTarget,
          file.name,
          userId // Pass userId
        );
        return res.send({
          status: 200,
          message: `Success Send Message to ${target}!`,
        });
      } else if (url && (!req.files || Object.keys(req.files).length === 0)) {
        if (
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi.test(
            url
          )
        ) {
          const buffer = await helpers.downloadAxios(url);
          const dest = `./public/temp/${nameRandom}`;
          fs.writeFileSync(dest, buffer.data);
          await new Client(client, toTarget).sendSticker(
            true,
            buffer.headers["content-type"].split("/")[0],
            dest,
            packname,
            author,
            true
          );
          const userId = req.session.user ? req.session.user.id : null;
          await this.history.pushNewMessage(sessions, "STICKER", toTarget, url, userId); // Pass userId
          return res.send({
            status: 200,
            message: `Success Send Message to ${target}!`,
          });
        } else {
          return res.send({ status: 400, message: "Invalid URL!" });
        }
      } else {
        return res.send({
          status: 400,
          message: "No files were uploaded or no URL!",
        });
      }
    } catch (error) {
      console.log(error);
      return res.send({ status: 500, message: "Internal Server Error" });
    }
  }

  async sendProduct(req, res) {
    try {
      let {
        sessions,
        target,
        title,
        message,
        footer,
        owner,
        currency,
        price,
        salePrice,
        url,
      } = req.body;
      if (!sessions || !target) {
        return res.send({ status: 400, message: "Input Session & Target!" });
      }
      sessions = sessions.includes("(") ? sessions.split(" (")[0] : sessions;
      const { client, toTarget } = await this.clientValidator(
        req,
        res,
        sessions,
        target
      );
      if (!client || !toTarget) return;
      let nameRandom = helpers.randomText(10);
      if (req.files && Object.keys(req.files).length !== 0) {
        const file = req.files.file;
        const dest = `./public/temp/${nameRandom}${path.extname(file.name)}`;
        await file.mv(dest);
        var opts = { title, currencyCode: currency, price, salePrice };
        await new Client(client, toTarget).sendProduct(
          dest,
          message,
          footer,
          owner,
          opts
        );
        await this.history.pushNewMessage(
          sessions,
          "PRODUCT",
          toTarget,
          `${title}, ${price} - ${salePrice}`,
          userId // Pass userId
          `${title}, ${price} - ${salePrice}`,
          userId // Pass userId
        );
        res.send({
          status: 200,
          message: `Success Send Message to ${target}!`,
        });
        return await modules.sleep(3000).then(fs.unlinkSync(dest));
      } else if (url && (!req.files || Object.keys(req.files).length === 0)) {
        if (
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi.test(
            url
          )
        ) {
          const buffer = await helpers.downloadAxios(url);
          const dest = `./public/temp/${nameRandom}`;
          fs.writeFileSync(dest, buffer.data);
          var opts = { title, currencyCode: currency, price, salePrice };
          await new Client(client, toTarget).sendProduct(
            dest,
            message,
            footer,
            owner,
            opts
          );
          await this.history.pushNewMessage(
            sessions,
            "PRODUCT",
            toTarget,
            `${title}, ${price} - ${salePrice}`
          );
          res.send({
            status: 200,
            message: `Success Send Message to ${target}!`,
          });
          return await modules.sleep(3000).then(fs.unlinkSync(dest));
        } else {
          return res.send({ status: 400, message: "Invalid URL!" });
        }
      } else {
        return res.send({
          status: 400,
          message: "No files were uploaded or no URL!",
        });
      }
    } catch (error) {
      console.log(error);
      return res.send({ status: 500, message: "Internal Server Error" });
    }
  }

  async sendContact(req, res) {
    try {
      let { sessions, target, contact, contactName, anotherContact } = req.body;
      if (!sessions || !target) {
        return res.send({ status: 400, message: "Input Session & Target!" });
      }
      if (anotherContact) {
        let arr = anotherContact.split(",");
        let arr2 = arr?.map((value, i) => {
          if (!value.includes("-")) return { err: "strip" };
          let number = value.split("-")[0].trim();
          let name = value.split("-")[1].trim();
          return { number, name };
        });
        for (let j = 0; j < arr2.length; j++) {
          if (arr2[j].err) {
            return res.send({
              status: 400,
              message: `Wrong Number. Separate contact number and name by using - (min), And separate the second contact with , (comma). (e.g. 628111111111 - Baba, 62822222222 - Caca)`,
            });
          }
        }
        var listNumber = arr2.map((value) => value.number);
        var listName = arr2.map((value) => value.name);
        listNumber.splice(0, 0, contact);
        listName.splice(0, 0, contactName);
      } else {
        var listNumber = [contact];
        var listName = [contactName];
      }
      sessions = sessions.includes("(") ? sessions.split(" (")[0] : sessions;
      const { client, toTarget } = await this.clientValidator(
        req,
        res,
        sessions,
        target
      );
      if (!client || !toTarget) return;
      let stats;
      for (let i = 0; i < listNumber.length; i++) {
        const checking = await client.onWhatsApp(`${listNumber[i]}`);
        if (checking.length === 0) {
          console.log("ini gada array");
          stats = listNumber[i];
        }
      }
      if (stats) {
        return res.send({
          status: 403,
          message: `The Number (${stats}) is not Registered on WhatsApp`,
        });
      } else {
        await new Client(client, toTarget).sendContact(listNumber, listName);
        await this.history.pushNewMessage(
          sessions,
          "CONTACT",
          toTarget,
          `${contact} - ${contactName}, ${anotherContact}`,
          userId // Pass userId
        );
        return res.send({
          status: 200,
          message: `Success Send Message to ${target}!`,
        });
      }
    } catch (error) {
      console.log(error);
      return res.send({ status: 500, message: "Internal Server Error" });
    }
  }

  async sendButton(req, res) {
    try {
      let {
        sessions,
        target,
        message,
        textFooter,
        button,
        btnMessage,
        urlButton,
        callButton,
        responUrl,
        responCall,
        url,
      } = req.body;
      if (!sessions || !target) {
        return res.send({ status: 400, message: "Input Session & Target!" });
      }
      const footer = textFooter ? textFooter : "";
      const text = message ? message : "";
      sessions = sessions.includes("(") ? sessions.split(" (")[0] : sessions;
      const { client, toTarget } = await this.clientValidator(
        req,
        res,
        sessions,
        target
      );
      if (!client || !toTarget) return;
      let nameRandom = helpers.randomText(10);
      if (req.files && Object.keys(req.files).length !== 0) {
        var file = req.files.file;
        var dest = `./public/temp/${nameRandom}${path.extname(file.name)}`;
        await file.mv(dest);
        var isFile = 1;
      } else if (url && (!req.files || Object.keys(req.files).length === 0)) {
        if (
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi.test(
            url
          )
        ) {
          var buffer = await helpers.downloadAxios(url);
          var dest = `./public/temp/${nameRandom}`;
          fs.writeFileSync(dest, buffer.data);
          var isFile = 2;
        } else {
          return res.send({ status: 400, message: "Invalid URL!" });
        }
      }
      const randomId = helpers.randomText(21);
      const buttonFilter =
        Array.isArray(button) && button.length
          ? button.filter((x) => x != "")
          : button;

      const buttons =
        Array.isArray(buttonFilter) && buttonFilter.length
          ? buttonFilter.map((value, index) => {
              let result = {
                index: 3 + index,
                quickReplyButton: {
                  displayText: value,
                  id: `${value}${randomId}`,
                },
              };
              return result;
            })
          : [
              {
                index: 3,
                quickReplyButton: {
                  displayText: buttonFilter,
                  id: `${buttonFilter}${randomId}`,
                },
              },
            ];
      if (urlButton) {
        if (
          !/^(http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm.test(
            responUrl
          )
        ) {
          return res.send({
            status: 400,
            message: `Make sure response url button is using http or https! Example: https://www.google.com/`,
          });
        } else {
          buttons.splice(0, 0, {
            index: 1,
            urlButton: { displayText: urlButton, url: responUrl },
          });
        }
      }
      if (callButton) {
        buttons.splice(1, 0, {
          index: 2,
          callButton: { displayText: callButton, phoneNumber: responCall },
        });
      }
      const buttDb =
        Array.isArray(buttonFilter) && buttonFilter.length
          ? buttonFilter.map((value, index) => {
              return `${value}${randomId}`;
            })
          : [`${buttonFilter}${randomId}`];
      btnMessage =
        Array.isArray(btnMessage) && btnMessage.length
          ? btnMessage
          : [btnMessage];
      await new ButtonResponse().createButtonResponse(
        sessions,
        toTarget,
        randomId,
        buttDb,
        btnMessage,
        req.session.user ? req.session.user.id : null // Pass userId
      );

      if (isFile == 1) {
        await new Client(client, toTarget).sendButton(
          text,
          footer,
          buttons,
          dest,
          file.mimetype
        );
      } else if (isFile == 2) {
        await new Client(client, toTarget).sendButton(
          text,
          footer,
          buttons,
          dest,
          buffer.headers["content-type"]
        );
      } else {
        await new Client(client, toTarget).sendButton(text, footer, buttons);
      }
      const userId = req.session.user ? req.session.user.id : null;
      await this.history.pushNewMessage(sessions, "BUTTON", toTarget, message, userId); // Pass userId
      return res.send({
        status: 200,
        message: `Success Send Message to ${target}!`,
      });
    } catch (error) {
      console.log(error);
      return res.send({ status: 500, message: "Internal Server Error" });
    }
  }

  async sendListMessage(req, res) {
    try {
      let {
        sessions,
        target,
        title,
        body,
        footer,
        button,
        titleRow,
        descRow,
        respRow,
      } = req.body;
      if (!sessions || !target) {
        return res.send({ status: 400, message: "Input Session & Target!" });
      }
      body = body ? body : "";
      sessions = sessions.includes("(") ? sessions.split(" (")[0] : sessions;
      const { client, toTarget } = await this.clientValidator(
        req,
        res,
        sessions,
        target
      );
      if (!client || !toTarget) return;
      const listFilter = titleRow.filter((x) => x != "");
      const descFilter = descRow.filter((x) => x != "");
      const randomId = helpers.randomText(21);
      let listRows = [];
      for (let i = 0; i < listFilter.length; i++) {
        listRows.push({
          title: listFilter[i],
          rowId: `${listFilter[i]}${randomId}`,
          description: descFilter[i],
        });
      }
      const sections = [{ title: "Choose One", rows: listRows }];
      const listDb = listFilter.map((value, index) => {
        return `${value}${randomId}`;
      });
      await new ListResponse().createListResponse(
        sessions,
        toTarget,
        randomId,
        listDb,
        respRow,
        req.session.user ? req.session.user.id : null // Pass userId
      );
      await new Client(client, toTarget).sendList(
        body,
        footer,
        title,
        button,
        sections
      );
      const userId = req.session.user ? req.session.user.id : null;
      await this.history.pushNewMessage(sessions, "LIST", toTarget, title, userId); // Pass userId
      return res.send({
        status: 200,
        message: `Success Send Message to ${target}!`,
      });
    } catch (error) {
      console.log(error);
      return res.send({ status: 500, message: "Internal Server Error" });
    }
  }

  async deleteHistory(req, res) {
    try {
      const userId = req.session.user ? req.session.user.id : null;
      if (!userId) {
        return res.status(401).send({ status: 401, message: "Unauthorized. Please log in." });
      }
      let { id } = req.query;
      if (id) {
        const success = await this.history.deleteHistory(id, userId); // Pass userId
        if (success) {
          return res.send({
            status: 200,
            message: `Success Delete History Send Message`,
          });
        } else {
          return res.status(404).send({ status: 404, message: `History item not found or not owned by user.` });
        }
      } else {
        return res.status(400).send({ status: 400, message: `History ID not provided.` });
      }
    } catch (error) {
      console.error("Error in deleteHistory:", error);
      return res.status(500).send({ status: 500, message: "Internal Server Error" });
    }
  }

  async deleteAllHistory(req, res) {
    try {
      const userId = req.session.user ? req.session.user.id : null;
      if (!userId) {
        return res.status(401).send({ status: 401, message: "Unauthorized. Please log in." });
      }
      await this.history.deleteAllHistory(userId); // Pass userId
      return res.send({
        status: 200,
        message: `Success Delete All History Send Message for your account.`,
      });
    } catch (error) {
      console.error("Error in deleteAllHistory:", error);
      return res.status(500).send({ status: 500, message: "Internal Server Error" });
    }
  }

  async getSessions(req, res) {
    // This should be filtered by user_id if it's not an admin endpoint
    // Assuming this is for the current user based on task context
    const userId = req.session.user ? req.session.user.id : null;
    if (!userId && !req.isAdmin) { // req.isAdmin would be a hypothetical flag for admin access
        return res.status(401).send({ status: 401, message: "Unauthorized." });
    }

    try {
      const data = await this.session.findAll({
        include: [
          {
            model: History,
            ...(userId && { where: { user_id: userId } }), // Filter history if user is not admin
            required: false // Use left join if not all sessions have history or for admin view
          },
        ],
        ...(userId && { where: { user_id: userId } }), // Filter sessions by user_id
      });
      return res.status(200).send({
        data,
      });
    } catch (error) {
      console.error("Error in getSessions:", error);
      return res.status(500).send({ status: 500, message: "Internal Server Error" });
    }
  }
}

export default ControllerApi;
