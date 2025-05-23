import History from "../models/history.model.js";
import { moment } from "../../config/index.js";

class HistoryMessage {
	constructor() {
		this.history = History;
	}

	async pushNewMessage(session_name, type, target, caption, userId = null) {
		if (!userId) {
			console.error("HistoryMessage.pushNewMessage error: userId is required.");
			return; // Or throw error
		}
		let date = moment().format("DD/MM/YY HH:mm:ss");
		await this.history.create({ session_name, target, type, date, caption, user_id: userId });
	}

	async getAllMessage(userId = null) {
		if (!userId) {
			console.error("HistoryMessage.getAllMessage error: userId is required.");
			return []; // Return empty array if no user ID
		}
		const result = await this.history.findAll({ where: { user_id: userId }, order: [['createdAt', 'DESC']] });
		return result;
	}

	async deleteHistory(id, userId = null) {
		if (!userId) {
			console.error("HistoryMessage.deleteHistory error: userId is required.");
			return false;
		}
		const find = await this.history.findOne({ where: { id, user_id: userId } });
		if (find) {
			await find.destroy();
			return true;
		}
		return false;
	}

	async deleteAllHistory(userId = null) {
		if (!userId) {
			console.error("HistoryMessage.deleteAllHistory error: userId is required.");
			return false;
		}
		const result = await this.history.destroy({ where: { user_id: userId } });
		return result > 0; // Returns true if any rows were deleted
	}
}

export default HistoryMessage;
