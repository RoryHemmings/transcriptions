const {
  v4: uuidv4
} = require('uuid');
const database = require('./Database');

const bcrypt = require('bcrypt');

class _User {
  constructor(id, username, passwordHash, bio='') {
    this._id = id;
    this._username = username;
    this._bio = bio;
    this._passwordHash = passwordHash;
  }

  // Save user to database
  async saveToDB() {
    // console.log(`Saving user ${this} to database`);
    // users.push(this);
    if (!(await database.insertUser(this))) {
      console.log(`Saved user ${this} to database`);
    } else {
      console.error(`Error creating user ${this}`);
    }
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
      username: this._username,
      id: this._id,
      bio: this._bio
    }
  }
  
  get id() {
    return this._id;
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
    return `(id: ${this._id}, username: ${this._username}, passwordHash: ${this._passwordHash})`;
  }
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
  createUser: async (username, password) => {
    // If user with that username already exists
    if (!checkValidUsername(username)) {
      return 2;
    }

    if (!checkValidPassword(password)) {
      return 3;
    }

    if (await UserManager.findUserByUsername(username) != null) {
      return 1;
    }

    try {
      // Creates "unique" id for user (has an insanely low chance of ever being repeated)
      const id = uuidv4();

      // Hash users password to store in database
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);

      // Save new user
      const user = new _User(id, username, hashedPassword);
      user.saveToDB();

      // Success
      return 0;
    } 
    catch {
      return -1;
    }
  },
  findUserByUsername: async (username) => {
    // Return first occurance of user with same username
    const res = await database.findUserByUsername(username);
    if (res == null) {
      return null;
    }
    
    return new _User(res.id, res.username, res.passwordHash, res.bio);
  },
  findUserById: async (id) => {
    // Return first occurance of user with same id
    const res = await database.findUserById(id);
    if (res == null) {
      return null;
    }

    return new _User(res.id, res.username, res.passwordHash, res.bio);
  }
}

// Debug user
// UserManager.createUser('test', 'test');
module.exports = UserManager;