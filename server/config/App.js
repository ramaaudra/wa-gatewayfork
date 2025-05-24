import express from "express";
import expressLayout from "express-ejs-layouts";
import flash from "connect-flash";
import session from "express-session";
import fileUpload from "express-fileupload";

// import { connectDatabase } from "./Database.js";
import routerUser from "../router/session/session.router.js";
import routerDashboard from "../router/dashboard/dashboard.router.js";
import routerApi from "../router/api/api.router.js";
import routerAutoReply from "../router/dashboard/AutoReply/autoReply.router.js";
import * as authController from "../router/dashboard/auth.controller.js";
import { exposeEnvironment } from "../middleware/env.middleware.js";

class App {
  constructor() {
    this.app = express();
    this.plugins();
    this.route();
    this.PORT = process.env.PORT || 8080;
  }

  plugins() {
    // Trust proxy setup
    this.app.set("trust proxy", 1);

    // View engine and static files setup
    this.app.set("view engine", "ejs");
    this.app.use(expressLayout);
    this.app.set("layout", "layouts/main"); // Set default layout
    this.app.set("layout extractScripts", true);
    this.app.set("layout extractStyles", true);
    this.app.use(express.static("public/mazer"));
    this.app.use(express.static("public"));

    // Body parsers - for regular form submissions and JSON
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());

    // File upload removed to avoid conflict with multer

    // Session and flash message setup
    this.app.use(
      session({
        secret: "secret",
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 60000 },
      })
    );
    this.app.use(flash());

    // Expose environment to views
    this.app.use(exposeEnvironment);

    // Flash message locals middleware
    this.app.use(function (req, res, next) {
      res.locals.success_msg = req.flash("success_msg");
      res.locals.error_msg = req.flash("error_msg");
      res.locals.side = req.flash("side");
      res.locals.url = req.originalUrl;
      res.locals.user = req.session.user; // Make user available to all views
      next();
    });

    // connectDatabase();
  }

  route() {
    this.app.get("/", (req, res) => {
      res.redirect("/dashboard");
    });

    // Add root /login route
    this.app.get("/login", authController.handleRootLogin);

    this.app.use("/dashboard", routerDashboard);
    this.app.use("/session", routerUser);
    this.app.use("/api", routerApi);
    this.app.use("/reply", routerAutoReply);
  }
}

export default App;
