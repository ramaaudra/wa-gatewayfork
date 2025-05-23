import express from "express";
import { ensureAuthenticated } from "../../middleware/auth.middleware.js"; // Import middleware
const router = express.Router();

import ControllerUser from "./session.controller.js";

const controller = new ControllerUser();

// Apply ensureAuthenticated to all session management routes
router.use(ensureAuthenticated);

router.post("/create-session", controller.createOneSession.bind(controller));
router.get("/start-session", controller.startOneSession.bind(controller));
router.get("/stop-session", controller.stopOneSession.bind(controller));
router.get(
  "/delete-session/:session",
  controller.deleteUserSession.bind(controller)
);
router.get(
  "/delete-inactive-sessions",
  controller.deleteInactiveSessionsHandler.bind(controller)
);

export default router;
