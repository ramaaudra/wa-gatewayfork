import fs from "fs";
import ConnectionSession from "../../session/Session.js";

class ControllerUser extends ConnectionSession {
  constructor() {
    super();
  }

  async createOneSession(req, res) {
    let endpoint = `/dashboard`;
    try {
      let { session_name } = req.body;
      if (session_name) {
        if (!fs.existsSync(`${this.sessionPath}/${session_name}`)) {
          this.createSession(session_name);
          req.flash("side", "Success Create Session, Scan QR Now!");
          return res.redirect(endpoint);
        } else {
          req.flash(
            "error_msg",
            `Can't Create a Session With the Name ${session_name}, Because that Name Already Exists`
          );
          return res.redirect(endpoint);
        }
      }
    } catch (error) {
      console.log(error);
      req.flash("error_msg", `Something Wrong`);
      return res.redirect(endpoint);
    }
  }

  async startOneSession(req, res) {
    try {
      let { session } = req.query;
      if (session) {
        const client = this.getClient(session);
        if (!client || client.isStop == true) {
          if (fs.existsSync(`${this.sessionPath}/${session}`)) {
            await this.createSession(session);
            return res.send({
              status: 200,
              message: `Success Start Session ${session}`,
            });
          } else {
            return res.send({
              status: 404,
              message: `Session ${session} Folder Not Found!`,
            });
          }
        } else {
          return res.send({
            status: 403,
            message: `Session is already active before!`,
          });
        }
      } else {
        res.send({ status: 400, message: "Input Data!" });
      }
    } catch (error) {
      console.log(error);
      res.send({ status: 500, message: "Something Wrong" });
    }
  }

  async stopOneSession(req, res) {
    try {
      let { session } = req.query;
      if (session) {
        const client = this.getClient(session);
        if (client && client.isStop == false) {
          if (fs.existsSync(`${this.sessionPath}/${session}`)) {
            client.isStop = true;
            await client.ws.close();
            return res.send({
              status: 200,
              message: `Success Stopped Session ${session}`,
            });
          } else {
            return res.send({
              status: 404,
              message: `Session ${session} Folder Not Found!`,
            });
          }
        } else {
          return res.send({
            status: 403,
            message: `Session is already stopped before!`,
          });
        }
      } else {
        res.send({ status: 400, message: "Input Data!" });
      }
    } catch (error) {
      console.log(error);
      res.send({ status: 500, message: "Something Wrong" });
    }
  }

  async deleteUserSession(req, res) {
    let endpoint = "/dashboard";
    try {
      let { session } = req.params;
      if (session) {
        try {
          await this.deleteSession(session);
          req.flash("success_msg", `Success Delete Session ${session}!`);
        } catch (deleteError) {
          console.error(`Error deleting session: ${deleteError.message}`);
          // Pastikan sesi tetap terhapus dari database meskipun ada error
          await this.deleteSessionDB(session);
          req.flash(
            "success_msg",
            `Session ${session} deleted from database. Some files may not be removed completely.`
          );
        }
        return res.redirect(endpoint);
      } else {
        req.flash("error_msg", `Input Data`);
        return res.redirect(endpoint);
      }
    } catch (error) {
      console.log(error);
      req.flash("error_msg", `Something Wrong`);
      return res.redirect(endpoint);
    }
  }

  async deleteInactiveSessionsHandler(req, res) {
    try {
      const result = await this.deleteInactiveSessions();

      if (result.success) {
        if (req.query.redirect === "dashboard") {
          req.flash("success_msg", result.message);
          return res.redirect("/dashboard");
        }

        return res.status(200).json({
          status: 200,
          message: result.message,
          count: result.count,
        });
      } else {
        if (req.query.redirect === "dashboard") {
          req.flash("error_msg", result.message);
          return res.redirect("/dashboard");
        }

        return res.status(500).json({
          status: 500,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in deleteInactiveSessionsHandler:", error);

      if (req.query.redirect === "dashboard") {
        req.flash("error_msg", "Failed to delete inactive sessions");
        return res.redirect("/dashboard");
      }

      return res.status(500).json({
        status: 500,
        message: "Failed to delete inactive sessions",
        error: error.message,
      });
    }
  }
}

export default ControllerUser;
