import express from "express";
import { ensureAuthenticated } from "../../middleware/auth.middleware.js"; // Import middleware
const router = express.Router();

import ControllerApi from "./api.controller.js";

const controller = new ControllerApi();

// Public health check or root endpoint - does not require authentication
router.get("/", (req, res) => {
	res.send("okee API is operational");
});

// Apply ensureAuthenticated to all routes below this point
router.use(ensureAuthenticated);

router.get("/session", controller.getSessions.bind(controller));

router.post("/sendtext", controller.sendText.bind(controller));
router.post("/sendmedia", controller.sendMedia.bind(controller));
router.post("/sendsticker", controller.sendSticker.bind(controller));
router.post("/sendcontact", controller.sendContact.bind(controller));
router.post("/sendbutton", controller.sendButton.bind(controller));
router.post("/sendlist", controller.sendListMessage.bind(controller));
router.post("/sendlocation", controller.sendLocation.bind(controller));
router.post("/sendproduct", controller.sendProduct.bind(controller));

router.get("/del-history", controller.deleteHistory.bind(controller));
router.get("/delall-history", controller.deleteAllHistory.bind(controller));

export default router;
