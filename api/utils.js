const utils = {
	createError: (message) => {
		return {
			error: true,
			message,
		};
	},

	createSuccess: (data) => {
		return {
			error: false,
			message: "",
			data,
		};
	},
	sendEmail: (adress, content) => {
		console.log(adress, content);
	}
};

module.exports = utils;
