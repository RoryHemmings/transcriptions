const {
  v4: uuidv4
} = require('uuid');
const database = require('./Database');

class Transcription {
  constructor(id, title, fileInfo, cbUsername, tags) {
    this._id = id;
    this._title = title;
    this._cbUsername = cbUsername;
    this._tags = tags;

    this._encoding = fileInfo.encoding;
    this._mimetype = fileInfo.mimetype;
    this._size = fileInfo.size;
    this._path = fileInfo.path;
  }

  async saveToDB() {
    // Save transcription metadata to database
    // Save actual file to the file system
    database.insertTranscription(this)
      .then(res => {
        console.log(`Saved transcription ${this} to database: ${res}`);
      }).catch(err => {
        console.error(`Failed to save transcription ${this} to database: ${err}`);
      });
  }

  get id() {
    return this._id;
  }

  get title() {
    return this._title;
  }

  get encoding() {
    return this._encoding;
  }

  get mimetype() {
    return this._mimetype;
  }

  get size() {
    return this._size;
  }

  get path() {
    return this._path;
  }

  get cbUsername() {
    return this._cbUsername;
  }

  get tags() {
    return this._tags;
  }

  toString() {
    return `(${this._id}, ${this._title}, ${this._encoding}, ${this._mimetype}, ${this._size}, ${this._path}, ${this._cbUsername}, [${this._tags}])`;
  }
}

function checkValidTitle(title) {
  // If title is undefined or has a length of more than 100 characters
  return !(!title || title.length > 100 || title.length < 1);
}

function checkValidFileInfo(fileInfo) {
  if (!fileInfo || !fileInfo.size) {
    return false;
  }

  if (fileInfo.size > 6000000) {
    return false;
  }

  if (!(fileInfo.mimetype == 'image/png' || fileInfo.mimetype == 'image/jpeg' || fileInfo.mimetype == 'application/pdf')) {
    return false;
  }

  return true;
}

const TranscriptionManager = {
  createTranscription: async (title, fileInfo, cbUsername, tags) => {
    if (!checkValidTitle(title)) {
      return 2;
    }

    if (!checkValidFileInfo(fileInfo)) {
      return 3;
    }

    const id = uuidv4();
    const transcription = new Transcription(id, title, fileInfo, cbUsername, tags);

    await transcription.saveToDB();

    return 0;
  },
  findTranscriptionById: async (id) => {
    const res = await database.findTranscriptionById(id)
      .catch(err => {
        console.error(err);
        return undefined;
      });
      
    return res;
  },
  findTranscriptionsByUsername: async (username) => {
    // TODO fix possible security risk of having to much info sent to browser
    // QUESTION does this code work as intended, because its much more elegant than writing an if statement to see if the promise rejected
    const res = await database.findTranscriptionsByUsername(username)
      .catch(err => {
        console.error(err);
        return [];
      });
    return res;
  }
};

module.exports = TranscriptionManager;