if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_ADRESS,
		pass: process.env.EMAIL_PASSWORD,
	},
});

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
	sendEmail: async (adress, subject, content) => {
		return new Promise((resolve, reject) => {
			const settings = {
				from: process.env.EMAIL_ADRESS,
				to: adress,
				subject: subject,
				text: content,
			};

			transporter.sendMail(settings, (err, info) => {
				if (err) {
					console.error(err);
					reject(false);
				} else {
					console.log(
						`Email: ${subject} with content ${content} sent to ${adress}\nResponse: ${info.response}`
					);
					resolve(true);
				}
			});
		});
	},
};

module.exports = utils;
