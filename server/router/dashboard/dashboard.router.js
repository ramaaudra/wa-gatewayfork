import fs from "fs";
import express from "express";
import SessionDatabase from "../../database/db/session.db.js";
import { AutoReply } from "../../database/db/messageRespon.db.js";
import HistoryMessage from "../../database/db/history.db.js";
import mediaRouter from "./Media/media.router.js";
const router = express.Router();

// Register media router
router.use("/media-library", mediaRouter);

const { SESSION_PATH, LOG_PATH } = process.env;

const db = new SessionDatabase();

router.get("/", async (req, res) => {
  let sessionCheck = fs
    .readdirSync(SESSION_PATH)
    .filter((x) => x != "store")[0];
  let session_name = sessionCheck ? sessionCheck : null;
  let loggerPath = fs.existsSync(`${LOG_PATH}/${session_name}.txt`)
    ? `${LOG_PATH.replace("./public/", "")}/${session_name}.txt`
    : null;
  const session = session_name ? await db.findOneSessionDB(session_name) : null;

  // Mendapatkan semua sesi dari database
  const allSessions = (await db.findAllSessionDB()) || [];
  const baseUrl = req.protocol + "://" + req.get("host"); // Added baseUrl

  res.render("dashboard/dashboard", {
    loggerPath,
    session,
    session_name,
    allSessions,
    baseUrl, // Added baseUrl
    layout: "layouts/main",
  });
});

router.get("/send-message", async (req, res) => {
  const session = await db.findAllSessionDB();
  const baseUrl = req.protocol + "://" + req.get("host"); // Added baseUrl
  res.render("dashboard/sendMessage", {
    session,
    baseUrl, // Added baseUrl
    layout: "layouts/main",
  });
});

router.get("/auto-reply", async (req, res) => {
  const session = await db.findAllSessionDB();
  const replyList = await new AutoReply().checkReplyMessage();
  const baseUrl = req.protocol + "://" + req.get("host"); // Added baseUrl
  res.render("dashboard/autoReply", {
    session,
    replyList,
    baseUrl, // Added baseUrl
    layout: "layouts/main",
  });
});

router.get("/api-doc", async (req, res) => {
  res.render("dashboard/apidoc", {
    layout: "layouts/main",
  });
});

router.get("/history-message", async (req, res) => {
  let db = await new HistoryMessage().getAllMessage();
  res.render("dashboard/history", {
    layout: "layouts/main",
    db,
  });
});

export default router;
