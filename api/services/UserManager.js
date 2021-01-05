const { v4: uuidv4 } = require("uuid");
const utils = require("./../utils");
const database = require("./Database");

const bcrypt = require("bcrypt");

class User {
	constructor(id, email, username, passwordHash, active = false, bio = "") {
		this._id = id;
		this._email = email;
		this._username = username;
		this._bio = bio;
		this._passwordHash = passwordHash;

		this._active = active;
	}

	// Save user to database
	async saveToDB() {
		database
			.insertUser(this)
			.then((res) => {
				console.log(`Saved user ${this} to database`);
			})
			.catch((err) => {
				console.error(`Error creating user ${this}`);
			});
	}

	/* Compares password hash associated with user with the password submitted
     (has to be asynchronus because of bcrypt) */
	async authenticate(password) {
		// Order of arguments in bcrypt.compare is very important
		return await bcrypt.compare(password, this._passwordHash);
	}

	async updateSettings() {
		return await database.updateSettings(this);
	}

	getShorthandVersion() {
		return {
			email: this._email,
			username: this._username,
			id: this._id,
			bio: this._bio,
		};
	}

	activate() {
		this._active = true;

		// Saves active state to database
		this.updateSettings();
	}

	isActive() {
		return this._active;
	}

	get id() {
		return this._id;
	}

	get email() {
		return this._email;
	}

	get username() {
		return this._username;
	}

	get bio() {
		return this._bio;
	}

	get passwordHash() {
		return this._passwordHash;
	}

	set bio(bio) {
		this._bio = bio;
	}

	set passwordHash(hash) {
		this._passwordHash = hash;
	}

	// String representation of User
	toString() {
		return `(id: ${this._id}, email: ${this._email}, username: ${this._username}, passwordHash: ${this._passwordHash})`;
	}
}

function createUserFromSettings(res) {
	return new User(
		res.id,
		res.email,
		res.username,
		res.passwordHash,
		res.active,
		res.bio
	);
}

function checkValidEmail(email) {
	return email.includes("@");
}

function checkValidUsername(username) {
	if (username.length < 3 || username.length > 20) {
		return false;
	}

	// Check if username is alphanumeric
	const regExp = /^[A-Za-z0-9]+$/;
	return username.match(regExp);
}

function checkValidPassword(password) {
	return password.length >= 6 && password.length < 20;
}

const UserManager = {
	createUser: async (email, username, password, confirmPassword) => {
		if (!checkValidEmail(email)) {
			return utils.createError("Invalid Email");
		}

		if (!checkValidUsername(username)) {
			return utils.createError(
				"Invalid username (usernames must consist of alphanumeric characters only, and be between 3 and 20 characters long"
			);
		}

		if (!checkValidPassword(password)) {
			return utils.createError(
				"Invalid password (passwords must be between 6 and 20 characters long)"
			);
		}

		if (password != confirmPassword) {
			return utils.createError("Passwords do not match");
		}

		if ((await UserManager.findUserByUsername(username)) != null) {
			return utils.createError("A user with that username already exists");
		}

		if ((await UserManager.findUserByEmail(email)) != null) {
			return utils.createError("A user with that email already exists");
		}

		try {
			// Creates "unique" id for user (has an insanely low chance of ever being repeated)
			const id = uuidv4();

			// Hash users password to store in database
			const salt = await bcrypt.genSalt();
			const hashedPassword = await bcrypt.hash(password, salt);

			// Save new user (not activated by default)
			const user = new User(id, email, username, hashedPassword);
			user.saveToDB();

			// Success
			return utils.createSuccess(user);
		} catch (err) {
			console.error(err);
			return utils.createError("Internal Server Error");
		}
	},
	findUserByEmail: async (email) => {
		// Return first occurance of user with same username
		const res = await database.findUserByEmail(email);
		if (res == null) {
			return null;
		}

		return createUserFromSettings(res);
	},
	findUserByUsername: async (username) => {
		// Return first occurance of user with same username
		const res = await database.findUserByUsername(username);
		if (res == null) {
			return null;
		}

		return createUserFromSettings(res);
	},
	findUserById: async (id) => {
		// Return first occurance of user with same id
		const res = await database.findUserById(id);
		if (res == null) {
			return null;
		}

		return createUserFromSettings(res);
	},
	// Create forgot password key email pair
	createFPKEmailPair: async (email) => {
		// Creates "unique" id that is 32 characters long
		const FPK = uuidv4();

		if (!(await database.saveFPKEmailPair(email, FPK))) {
			return undefined;
		}
		return FPK;
	},
	verifyFPK: async (FPK, email) => {
		const FPKEmailPair = await database.findFPKEmailPair(FPK);

		if (FPKEmailPair === undefined) {
			return utils.createError(
				"Invalid Link. Make sure that you check the most recent email with password reset instructions."
			);
		}

		// If the email that is associated with the FPK in the database matches the email given.
		/**
		 * In order for this to be broken someone would have to guess an FPK which is almost impossible
		 * and then they would also have to guess the corresponding email. This brings the possiblity
		 * of someone finding the link that can reset a users password to what is essentially 0
		 */
		if (FPKEmailPair.email === email) {
			return utils.createSuccess({ email: email });
		}

		return utils.createError(
			"Invalid Link. Make sure that you check the most recent email with password reset instructions."
		);
	},
	updatePassword: async (password, confirmPassword, email) => {
		if (!checkValidPassword(password)) {
			return utils.createError(
				"Invalid password (passwords must be between 6 and 20 characters long)"
			);
		}

		if (password != confirmPassword) {
			return utils.createError("Passwords do not match");
		}

		console.log("Updating Password for", email);
		let user = createUserFromSettings(await database.findUserByEmail(email));

		// Hash users password to store in database
		const salt = await bcrypt.genSalt();
		const hashedPassword = await bcrypt.hash(password, salt);

		user.passwordHash = hashedPassword;
		user.updateSettings();

		// Delete the FPK associated with the email so that the reset password link becomes invalid
		database.deleteFPKEmailPair(email);

		return utils.createSuccess({ email });
	},
};

module.exports = UserManager;
