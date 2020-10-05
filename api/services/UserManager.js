const {
  v4: uuidv4
} = require('uuid');

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
    console.log(`Saving user ${this} to database`);
    users.push(this);
  }

  /* Compares password hash associated with user with the password submitted
     (has to be asynchronus because of bcrypt) */
  async authenticate(password) {
    // Order of arguments in bcrypt.compare is very important
    return await bcrypt.compare(password, this._passwordHash);
  }

  get username() {
    return this._username;
  }

  get id() {
    return this._id;
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
  findUser: async (username) => {
    // Return first occurance of user with same username
    return users.find(user => user.username == username);
  },
  findUserById: async (id) => {
    return users.find(user => user.id == id);
  }
}

module.exports = UserManager;