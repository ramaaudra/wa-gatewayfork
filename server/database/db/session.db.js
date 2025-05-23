import Session from "../models/session.model.js";

class SessionDatabase {
  constructor() {
    this.session = Session;
  }

  async createSessionDB(session_name, session_number) {
    console.log(session_name, session_number);
    await this.session.create({
      session_name,
      session_number,
      status: "CONNECTED",
    });
  }

  async deleteSessionDB(session_name) {
    const sesi = await this.session.findOne({ where: { session_name } });
    if (sesi) {
      sesi.destroy();
    }
  }

  async findOneSessionDB(session_name) {
    const sesi = await this.session.findOne({ where: { session_name } });
    if (sesi) {
      return sesi;
    } else {
      return false;
    }
  }

  async findAllSessionDB() {
    const array = await this.session.findAll();
    if (Array.isArray(array) && array.length !== 0) {
      return array;
    }
  }

  async updateStatusSessionDB(session_name, status) {
    const sesi = await this.session.findOne({ where: { session_name } });
    if (sesi) {
      await sesi.update({ status });
    }
  }

  async startProgram() {
    const array = await this.session.findAll();
    if (Array.isArray(array) && array.length !== 0) {
      array.map(async (value) => {
        value.status = "STOPPED";
        await this.session.update(
          { status: "STOPPED" },
          {
            where: {
              session_name: value.session_name,
            },
          }
        );
      });
    }
  }

  async deleteInactiveSessions() {
    try {
      const sessions = await this.session.findAll({
        where: {
          status: "STOPPED",
        },
      });

      if (Array.isArray(sessions) && sessions.length > 0) {
        console.log(`Found ${sessions.length} inactive sessions to delete`);

        for (const session of sessions) {
          console.log(`Deleting inactive session: ${session.session_name}`);
          await this.deleteSessionDB(session.session_name);
        }

        return {
          success: true,
          message: `Successfully deleted ${sessions.length} inactive sessions`,
          count: sessions.length,
        };
      } else {
        return {
          success: true,
          message: "No inactive sessions found",
          count: 0,
        };
      }
    } catch (error) {
      console.error("Error deleting inactive sessions:", error);
      return {
        success: false,
        message: `Error deleting inactive sessions: ${error.message}`,
        error,
      };
    }
  }
}

export default SessionDatabase;
