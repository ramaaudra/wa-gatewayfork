import fs from "fs";
import express from "express";
import SessionDatabase from "../../database/db/session.db.js";
import { AutoReply } from "../../database/db/messageRespon.db.js";
import HistoryMessage from "../../database/db/history.db.js";
import mediaRouter from "./Media/media.router.js";
import * as authController from "./auth.controller.js"; // Import auth controller

const router = express.Router();

// Register media router
router.use("/media-library", mediaRouter);

// Auth routes
router.get("/register", authController.renderRegisterPage);
router.post("/register", authController.registerUser);
router.get("/login", authController.renderLoginPage);
router.post("/login", authController.loginUser);
router.get("/logout", authController.logoutUser);


const { SESSION_PATH, LOG_PATH } = process.env;

const db = new SessionDatabase();

// Import the ensureAuthenticated middleware
import { ensureAuthenticated } from "../../middleware/auth.middleware.js";

// Apply ensureAuthenticated to all routes below this point, except auth routes
// router.use((req, res, next) => {
//   if (["/register", "/login"].includes(req.path)) { // Add any other public auth paths
//     return next();
//   }
//   ensureAuthenticated(req, res, next);
// });

// Protect all dashboard routes below this point
router.use(ensureAuthenticated);

router.get("/", async (req, res) => {
  const userId = req.session.user.id;
  const allUserSessions = (await db.findAllSessionDB(userId)) || [];
  
  let session_name = null;
  let loggerPath = null;
  let activeSessionDetails = null;

  // Try to find the first connected session for this user to display on dashboard,
  // or just the first session if none are connected.
  let primarySession = allUserSessions.find(s => s.status === 'CONNECTED');
  if (!primarySession && allUserSessions.length > 0) {
    primarySession = allUserSessions[0];
  }

  if (primarySession) {
    session_name = primarySession.session_name;
    if (fs.existsSync(`${LOG_PATH}/${session_name}.txt`)) {
      loggerPath = `${LOG_PATH.replace("./public/", "")}/${session_name}.txt`;
    }
    activeSessionDetails = primarySession; // This is the full session object from DB
  }
  
  const baseUrl = req.protocol + "://" + req.get("host");

  res.render("dashboard/dashboard", {
    loggerPath, // For the specific session's log if found
    session: activeSessionDetails, // The specific session object for the top card
    session_name, // Name of that specific session
    allSessions: allUserSessions, // All sessions for this user for the table
    baseUrl,
    user: req.session.user,
    layout: "layouts/main",
  });
});

router.get("/send-message", async (req, res) => { // ensureAuthenticated is applied by router.use
  const userId = req.session.user.id;
  const userSessions = (await db.findAllSessionDB(userId)) || [];
  const baseUrl = req.protocol + "://" + req.get("host");
  res.render("dashboard/sendMessage", {
    session: userSessions, // Pass user's sessions to the view
    baseUrl,
    user: req.session.user,
    layout: "layouts/main",
  });
});

router.get("/auto-reply", async (req, res) => { // ensureAuthenticated is applied by router.use
  const userId = req.session.user.id;
  const userSessions = (await db.findAllSessionDB(userId)) || [];
  const replyList = (await new AutoReply().checkReplyMessage(userId)) || []; // Pass userId
  const baseUrl = req.protocol + "://" + req.get("host");
  res.render("dashboard/autoReply", {
    session: userSessions, // User's sessions for dropdown
    replyList, // User's auto-replies
    baseUrl,
    user: req.session.user,
    layout: "layouts/main",
  });
});

router.get("/api-doc", async (req, res) => { // ensureAuthenticated is applied by router.use
  res.render("dashboard/apidoc", {
    layout: "layouts/main",
    user: req.session.user,
  });
});

router.get("/history-message", async (req, res) => { // ensureAuthenticated is applied by router.use
  const userId = req.session.user.id;
  const userHistory = (await new HistoryMessage().getAllMessage(userId)) || []; // Pass userId
  res.render("dashboard/history", {
    layout: "layouts/main",
    db: userHistory, // User's message history
    user: req.session.user,
  });
});

export default router;
