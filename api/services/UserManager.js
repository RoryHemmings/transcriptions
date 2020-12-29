const { v4: uuidv4 } = require("uuid");
const utils = require("./../utils");
const database = require("./Database");

const bcrypt = require("bcrypt");

class User {
	constructor(id, email, username, passwordHash, bio = "") {
    this._id = id;
    this._email = email;
		this._username = username;
		this._bio = bio;
		this._passwordHash = passwordHash;
	}

	// Save user to database
	async saveToDB() {
		// console.log(`Saving user ${this} to database`);
		// users.push(this);
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

	// String representation of User
	toString() {
		return `(id: ${this._id}, email: ${this._email}, username: ${this._username}, passwordHash: ${this._passwordHash})`;
	}
}

function checkValidEmail(email) {
  return email.includes('@');
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

			// Save new user
			const user = new User(id, email, username, hashedPassword);
			user.saveToDB();

			// Success
			return utils.createSuccess();
		} catch {
			return utils.createError("Internal Server Error");
		}
	},
	findUserByEmail: async (email) => {
		// Return first occurance of user with same username
		const res = await database.findUserByEmail(email);
		if (res == null) {
			return null;
		}

		return new User(res.id, res.email, res.username, res.passwordHash, res.bio);
	},
	findUserByUsername: async (username) => {
		// Return first occurance of user with same username
		const res = await database.findUserByUsername(username);
		if (res == null) {
			return null;
		}

		return new User(res.id, res.email, res.username, res.passwordHash, res.bio);
	},
	findUserById: async (id) => {
		// Return first occurance of user with same id
		const res = await database.findUserById(id);
		if (res == null) {
			return null;
		}

		return new User(res.id, res.email, res.username, res.passwordHash, res.bio);
	},
};

// Debug user
// UserManager.createUser('test', 'test');
module.exports = UserManager;
