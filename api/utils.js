const utils = {
	createError: (message) => {
		return {
			error: true,
			message,
		};
	},

	createSuccess: () => {
		return {
			error: false,
			message: "",
		};
	},
};

module.exports = utils;
