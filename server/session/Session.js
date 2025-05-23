import pkg from "@whiskeysockets/baileys";
const {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  default: makeWASocket,
  Browsers,
} = pkg;
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode";
import fs from "fs";
import { modules } from "../../lib/index.js";
import { socket, moment } from "../config/index.js";
import SessionDatabase from "../database/db/session.db.js";
import Message from "./Client/handler/Message.js";

const { SESSION_PATH, LOG_PATH, MULTI_SESSION } = process.env;
let sessions = {};

class ConnectionSession extends SessionDatabase {
  constructor() {
    super();
    this.sessionPath = SESSION_PATH;
    this.logPath = LOG_PATH;
    this.count = 0;
    this.history = new HistoryMessage(); // Instantiate HistoryMessage

    // Create necessary directories if they don't exist
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }

    if (!fs.existsSync(`${this.sessionPath}/store`)) {
      fs.mkdirSync(`${this.sessionPath}/store`, { recursive: true });
    }

    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  getClient(session_name = null) {
    if (session_name) {
      return sessions[session_name] || null;
    }
    return sessions ?? {};
  }

  async deleteSession(session_name) {
    try {
      // Hentikan sesi terlebih dahulu jika masih berjalan
      const client = this.getClient(session_name);
      if (client && client.isStop === false) {
        try {
          client.isStop = true;
          if (client.ws && client.ws.readyState === 1) {
            await client.ws.close();
          }
        } catch (error) {
          console.log(
            `Error stopping session ${session_name}: ${error.message}`
          );
        }
      }

      // Hapus file-file sesi
      if (fs.existsSync(`${this.sessionPath}/${session_name}`))
        fs.rmSync(`${this.sessionPath}/${session_name}`, {
          force: true,
          recursive: true,
        });
      if (fs.existsSync(`${this.sessionPath}/store/${session_name}.json`))
        fs.unlinkSync(`${this.sessionPath}/store/${session_name}.json`);
      if (fs.existsSync(`${this.logPath}/${session_name}.txt`))
        fs.unlinkSync(`${this.logPath}/${session_name}.txt`);

      // Hapus dari database
      await this.deleteSessionDB(session_name);

      // Hapus dari objek sessions
      if (sessions[session_name]) {
        delete sessions[session_name];
      }
    } catch (error) {
      console.error(
        `Error in deleteSession for ${session_name}: ${error.message}`
      );
      throw error; // Re-throw error untuk penanganan di level atas
    }
  }

  async generateQr(input, session_name) {
    let rawData = await qrcode.toDataURL(input, { scale: 8 });
    let dataBase64 = rawData.replace(/^data:image\/png;base64,/, "");
    await modules.sleep(3000);
    socket.emit(`update-qr`, { buffer: dataBase64, session_name });
    this.count++;
    console.log(
      modules.color("[SYS]", "#EB6112"),
      modules.color(
        `[Session: ${session_name}] Open the browser, a qr has appeared on the website, scan it now!`,
        "#E6B0AA"
      )
    );
    console.log(this.count);
  }

  async createSession(session_name, userId = null) { // Add userId parameter
    if (!userId) {
      // This case should ideally be prevented by the controller
      // but as a safeguard:
      console.error(modules.color("[ERROR]", "#FF0000"), modules.color(`Attempted to create session '${session_name}' without a userId.`, "#E6B0AA"));
      // Optionally, emit an error to the specific client if possible, or handle as appropriate
      // For now, we'll prevent session creation if no userId is provided at this stage
      socket.emit("connection-status", {
        session_name,
        result: "Error: User not identified. Cannot create session.",
      });
      return; // Stop session creation
    }

    const sessionDir = `${this.sessionPath}/${session_name}`;
    // Potentially, prefix sessionDir with userId to ensure filesystem isolation if session_names can overlap between users
    // e.g., const sessionDir = `${this.sessionPath}/${userId}_${session_name}`;
    // This would also require changes to how session_name is used elsewhere (e.g., getClient, deleteSession)
    // For now, assuming session_name is globally unique on the filesystem as per original logic.

    let { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const options = {
      printQRInTerminal: false,
      auth: state,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Safari"),
      version,
    };

    const client = makeWASocket(options);

    sessions[session_name] = { ...client, isStop: false };

    client.ev.on("creds.update", saveCreds);
    client.ev.on("connection.update", async (update) => {
      if (this.count >= 3) {
        this.deleteSession(session_name);
        socket.emit("connection-status", {
          session_name,
          result: "No Response, QR Scan Canceled",
        });
        console.log(`Count : ${this.count}, QR Stopped!`);
        client.ev.removeAllListeners("connection.update");
        return;
      }

      if (update.qr) this.generateQr(update.qr, session_name);

      if (update.isNewLogin) {
        // Pass userId to createSessionDB
        await this.createSessionDB(
          session_name,
          client.authState.creds.me.id.split(":")[0],
          userId // Pass userId here
        );
        let files = `${this.logPath}/${session_name}.txt`;
        try {
          // Ensure log directory exists
          if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
          }

          if (fs.existsSync(files)) {
            var readLog = fs.readFileSync(files, "utf8");
          } else {
            fs.writeFileSync(
              files,
              `Success Create new Session : ${session_name}, ${
                client.authState.creds.me.id.split(":")[0]
              }\n`
            );
            var readLog = fs.readFileSync(files, "utf8");
          }
        } catch (error) {
          console.error(`Error handling log file: ${error.message}`);
          var readLog = `Success Create new Session : ${session_name}, ${
            client.authState.creds.me.id.split(":")[0]
          }\n`;
        }
        return socket.emit("logger", {
          session_name,
          result: readLog,
          files,
          session_number: client.authState.creds.me.id.split(":")[0],
          status: "CONNECTED",
        });
      }

      const { lastDisconnect, connection } = update;
      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (reason === DisconnectReason.badSession) {
          console.log(
            modules.color("[SYS]", "#EB6112"),
            modules.color(
              `Bad Session File, Please Delete [Session: ${session_name}] and Scan Again`,
              "#E6B0AA"
            )
          );
          this.deleteSession(session_name);
          client.logout();
          return socket.emit("connection-status", {
            session_name,
            result: "Bad Session File, Please Create QR Again",
          });
        } else if (reason === DisconnectReason.connectionClosed) {
          const checked = this.getClient(session_name);
          if (checked && checked.isStop == false) {
            console.log(
              modules.color("[SYS]", "#EB6112"),
              modules.color(
                `[Session: ${session_name}] Connection closed, reconnecting.... UserId: ${userId}`,
                "#E6B0AA"
              )
            );
            // Pass userId when attempting to reconnect
            this.createSession(session_name, userId);
          } else if (checked && checked.isStop == true) {
            // Ensure this update is also user-aware if necessary, though status updates might be global for a session_name
            await this.updateStatusSessionDB(session_name, "STOPPED", userId);
            console.log(
              modules.color("[SYS]", "#EB6112"),
              modules.color(
                `[Session: ${session_name}] Connection close Success`,
                "#E6B0AA"
              )
            );
            socket.emit("session-status", { session_name, status: "STOPPED" });
          }
        } else if (reason === DisconnectReason.connectionLost) {
          console.log(
            modules.color("[SYS]", "#EB6112"),
            modules.color(
              `[Session: ${session_name}] Connection Lost from Server, reconnecting... UserId: ${userId}`,
              "#E6B0AA"
            )
          );
          this.createSession(session_name, userId); // Pass userId
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log(
            modules.color("[SYS]", "#EB6112"),
            modules.color(
              `[Session: ${session_name}] Connection Replaced, Another New Session Opened, Please Close Current Session First`,
              "#E6B0AA"
            )
          );
          try {
            // Pastikan client masih terhubung sebelum mencoba logout
            if (client.ws && client.ws.readyState === 1) {
              await client.logout();
            }
          } catch (logoutError) {
            console.log(
              modules.color("[SYS]", "#EB6112"),
              modules.color(
                `[Session: ${session_name}] Error during logout: ${logoutError.message}`,
                "#E6B0AA"
              )
            );
          }
          return socket.emit("connection-status", {
            session_name,
            result: `[Session: ${session_name}] Connection Replaced, Another New Session Opened, Please Create QR Again`,
          });
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(
            modules.color("[SYS]", "#EB6112"),
            modules.color(
              `Device Logged Out, Please Delete [Session: ${session_name}] and Scan Again.`,
              "#E6B0AA"
            )
          );
          try {
            // Pastikan client masih terhubung sebelum mencoba logout
            if (client.ws && client.ws.readyState === 1) {
              await client.logout();
            }
          } catch (logoutError) {
            console.log(
              modules.color("[SYS]", "#EB6112"),
              modules.color(
                `[Session: ${session_name}] Error during logout: ${logoutError.message}`,
                "#E6B0AA"
              )
            );
          }
          return socket.emit("connection-status", {
            session_name,
            result: `[Session: ${session_name}] Device Logged Out, Please Create QR Again`,
          });
        } else if (reason === DisconnectReason.restartRequired) {
          console.log(
            modules.color("[SYS]", "#EB6112"),
            modules.color(
              `[Session: ${session_name}] Restart Required, Restarting... UserId: ${userId}`,
              "#E6B0AA"
            )
          );
          this.createSession(session_name, userId); // Pass userId
        } else if (reason === DisconnectReason.timedOut) {
          console.log(
            modules.color("[SYS]", "#EB6112"),
            modules.color(
              `[Session: ${session_name}] Connection TimedOut, Reconnecting... UserId: ${userId}`,
              "#E6B0AA"
            )
          );
          this.createSession(session_name, userId); // Pass userId
        } else {
          client.end(
            `Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`
          );
        }
      } else if (connection == "open") {
        await this.updateStatusSessionDB(session_name, "CONNECTED");
        socket.emit("session-status", { session_name, status: "CONNECTED" });
        console.log(
          modules.color("[SYS]", "#EB6112"),
          modules.color(moment().format("DD/MM/YY HH:mm:ss"), "#F8C471"),
          modules.color(
            `[Session: ${session_name}] Session is Now Connected - Baileys Version ${version}, isLatest : ${isLatest}`,
            "#82E0AA"
          )
        );
      }
    });

    client.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      // Pass userId to Message handler if it needs to associate history with user
      // This requires Message class to be updated as well.
      const msgInstance = new Message(client, { messages, type }, session_name, userId);
      await msgInstance.mainHandler(); // Ensure mainHandler completes

      // Log incoming message to history
      const incomingMessage = messages[0];
      if (incomingMessage && incomingMessage.message) {
        const m = await msgInstance.serial(client, incomingMessage); // Use the serial method from instance
        if (m.body) { // Only log if there's content
          await this.history.pushNewMessage(
            session_name,
            m.type, // e.g., "text", "image"
            m.from, // Sender JID
            m.body, // Message content or caption
            userId  // The user ID associated with this session
          );
        }
      }
    });
  }
}

export default ConnectionSession;
