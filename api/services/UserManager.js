const {
  v4: uuidv4
} = require('uuid');
const database = require('./Database');

const bcrypt = require('bcrypt');

const users = [];

class _User {
  constructor(id, username, passwordHash) {
    this._id = id;
    this._username = username;
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

  getShorthandVersion() {
    return {
      username: this._username,
      id: this._id
    }
  }
  
  get id() {
    return this._id;
  }

  get username() {
    return this._username;
  }

  get passwordHash() {
    return this._passwordHash;
  }

  // String representation of User
  toString() {
    return `(id: ${this._id}, username: ${this._username}, passwordHash: ${this._passwordHash})`;
  }
}

const UserManager = {
  createUser: async (username, password) => {
    try {
      // Creates "unique" id for user (has an insanely low chance of ever being repeated)
      const id = uuidv4();

      // Hash users password to store in database
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);

      // Save new user
      // @TODO make sure that users doesn't already exist
      const user = new _User(id, username, hashedPassword);
      user.saveToDB();

      return true;
    } 
    catch {
      return false;
    }
  },
  getUsers: async () => {
    // Return array of users
    return users;
  },
  findUserByUsername: async (username) => {
    // Return first occurance of user with same username
    const res = await database.findUserByUsername(username);
    if (res == null) {
      return null;
    }
    
    return new _User(res.id, res.username, res.passwordHash);
  },
  findUserById: async (id) => {
    // Return first occurance of user with same id
    const res = await database.findUserById(id);
    if (res == null) {
      return null;
    }

    return new _User(res.id, res.username, res.passwordHash);
  }
}

// Debug user
// UserManager.createUser('test', 'test');
module.exports = UserManager;