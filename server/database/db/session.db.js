import Session from "../models/session.model.js";

class SessionDatabase {
  constructor() {
    this.session = Session;
  }

  async createSessionDB(session_name, session_number, userId) {
    if (!userId) {
      console.error("Attempted to create session in DB without userId");
      // Or throw an error: throw new Error("User ID is required to create a session.");
      return null; 
    }
    console.log(session_name, session_number, userId);
    return await this.session.create({
      session_name,
      session_number,
      status: "CONNECTED",
      user_id: userId,
    });
  }

  async deleteSessionDB(session_name, userId = null) {
    const whereClause = { session_name };
    if (userId !== null) {
      whereClause.user_id = userId;
    }
    const sesi = await this.session.findOne({ where: whereClause });
    if (sesi) {
      await sesi.destroy(); // Use await here
      return true;
    }
    return false;
  }

  async findOneSessionDB(session_name, userId = null) {
    const whereClause = { session_name };
    // If userId is provided, we are checking if this session_name (potentially with this user) exists.
    // This is useful for the createOneSession check in the controller.
    if (userId !== null) {
        whereClause.user_id = userId;
    }
    const sesi = await this.session.findOne({ where: whereClause });
    return sesi || false; // Return the session object or false
  }
  
  async findOneSessionByNameAndUser(session_name, userId) {
    if (!userId) return false;
    return await this.session.findOne({
      where: { session_name, user_id: userId },
    });
  }

  async findAllSessionDB(userId = null) {
    const whereClause = {};
    if (userId !== null) {
      whereClause.user_id = userId;
    }
    const array = await this.session.findAll({ where: whereClause });
    // The original check `Array.isArray(array) && array.length !== 0` is fine,
    // but often findAll returns an empty array if nothing is found, which is a valid result.
    return array; 
  }

  async updateStatusSessionDB(session_name, status, userId = null) {
    // For status updates, we might not always have userId easily,
    // especially if called from deep within Baileys event handlers not directly tied to a user request.
    // If user_id is crucial for this update, the calling logic needs to ensure it's passed.
    // For now, updating status based on session_name primarily.
    // If userId is provided, it can be an additional check.
    const whereClause = { session_name };
    // if (userId) { // Optional: only allow user to update their own session's status
    //   whereClause.user_id = userId;
    // }
    const sesi = await this.session.findOne({ where: whereClause });
    if (sesi) {
      await sesi.update({ status });
      return true;
    }
    return false;
  }

  async startProgram() {
    // This method updates ALL sessions to STOPPED. 
    // This might need reconsideration in a multi-user context.
    // If each user's sessions should be independent, this global update might be problematic.
    // For now, retaining original behavior. If it needs to be user-specific, it would require a userId.
    const array = await this.session.findAll();
    if (Array.isArray(array) && array.length > 0) { // Corrected length check
      for (const value of array) { // Use for...of for async operations in loop
        // Original logic: value.status = "STOPPED"; // This doesn't save
        await this.session.update(
          { status: "STOPPED" },
          {
            where: {
              session_name: value.session_name,
              // user_id: value.user_id // if this should be user-specific for some reason
            },
          }
        );
      }
    }
  }

  async deleteInactiveSessions(userId = null) {
    // If userId is provided, only delete inactive sessions for that user.
    // Otherwise (userId is null), it deletes all inactive sessions globally (original behavior).
    // This might be an admin-only feature if userId is null.
    try {
      const whereClause = { status: "STOPPED" };
      if (userId !== null) {
        whereClause.user_id = userId;
      }

      const sessions = await this.session.findAll({ where: whereClause });

      if (Array.isArray(sessions) && sessions.length > 0) {
        console.log(`Found ${sessions.length} inactive sessions to delete for user_id: ${userId || 'all users'}.`);

        for (const session of sessions) {
          console.log(`Deleting inactive session: ${session.session_name} (User: ${session.user_id})`);
          // Assuming deleteSessionDB is now user-aware if userId is passed
          await this.deleteSessionDB(session.session_name, session.user_id); 
        }

        return {
          success: true,
          message: `Successfully deleted ${sessions.length} inactive sessions for user_id: ${userId || 'all users'}.`,
          count: sessions.length,
        };
      } else {
        return {
          success: true,
          message: `No inactive sessions found for user_id: ${userId || 'all users'}.`,
          count: 0,
        };
      }
    } catch (error) {
      console.error(`Error deleting inactive sessions for user_id ${userId || 'all users'}:`, error);
      return {
        success: false,
        message: `Error deleting inactive sessions: ${error.message}`,
        error,
      };
    }
  }
}

export default SessionDatabase;
