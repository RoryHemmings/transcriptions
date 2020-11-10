/**
 * Instead of clas based approach to storing transcriptions, I'm going to try to use facotry functions/Object Literals
 * Then I can use helper functions on in the TranscriptionManager struct to solve all functionality
 */

const { v4: uuidv4 } = require("uuid");
const database = require("./Database");

// File System
const fs = require("fs");

function checkValidTitle(title) {
	// If title is undefined or has a length of more than 100 characters
	if (!title || title.length > 100 || title.length < 1) {
		return "Title must be between 1 and 100 characters long";
	}

	return undefined;
}

function checkValidFileInfo(fileInfo) {
	if (!fileInfo || !fileInfo.size) {
		return "Invalid File";
	}

	// Last ditch attempt to save if file somehow gets through the filter (hopefully I don't get ddos-ed)
	if (fileInfo.size > 6000000) {
		return "File exceeds maximum file size (6MB)";
	}

	if (
		!(
			fileInfo.mimetype == "image/png" ||
			fileInfo.mimetype == "image/jpeg" ||
			fileInfo.mimetype == "application/pdf"
		)
	) {
		return "Only file types pdf, png, and jpg are accepted";
	}

	return undefined;
}

async function saveToDB(transcription) {
	database
		.insertTranscription(transcription)
		.then((res) => {
			console.log(
				`Saved transcription ${JSON.stringify(
					transcription,
					undefined,
					2
				)} to database: ${res}`
			);
		})
		.catch((err) => {
			console.error(
				`Failed to save transcription ${JSON.stringify(
					transcription,
					undefined,
					2
				)} to database: ${err}`
			);
		});
}

const TranscriptionManager = {
	createTranscription: async (title, fileInfo, cbUsername, tags) => {
		const titleError = checkValidTitle(title);
		const fileInfoError = checkValidFileInfo(fileInfo);
		if (titleError) {
			return titleError;
		}

		if (fileInfoError) {
			return fileInfoError;
		}

		const id = uuidv4();
		const dateCreated = new Date().toISOString();

		const transcription = {
			id,
			title,
			cbUsername,
			dateCreated,
			tags,
			encoding: fileInfo.encoding,
			mimetype: fileInfo.mimetype,
			size: fileInfo.size,
			filename: fileInfo.filename,
		};

		saveToDB(transcription);
	},
	findTranscriptionById: async (id) => {
		const res = await database.findTranscriptionById(id).catch((err) => {
			console.error(err);
			return undefined;
		});

		return res;
	},
	findTranscriptionsByUsername: async (username) => {
		// QUESTION does this code work as intended, because its much more elegant than writing an if statement to see if the promise rejected
		const res = await database
			.findTranscriptionsByUsername(username)
			.catch((err) => {
				console.error(err);
				return [];
			});

		return res;
	},
};

module.exports = TranscriptionManager;

// class Transcription {
//   constructor(id, title, encoding, mimetype, size, filename, cbUsername, dateCreated, tags) {
//     this._id = id;
//     this._title = title;
//     this._cbUsername = cbUsername;
//     this._dateCreated = dateCreated;
//     this._tags = tags;

//     this._encoding = encoding;
//     this._mimetype = mimetype;
//     this._size = size;
//     this._filename = filename;
//   }

//   async saveToDB() {
//     // Save transcription metadata to database
//     // Save actual file to the file system
//     database.insertTranscription(this)
//       .then(res => {
//         console.log(`Saved transcription ${this} to database: ${res}`);
//       }).catch(err => {
//         console.error(`Failed to save transcription ${this} to database: ${err}`);
//       });
//   }

//   get id() {
//     return this._id;
//   }

//   get title() {
//     return this._title;
//   }

//   get encoding() {
//     return this._encoding;
//   }

//   get mimetype() {
//     return this._mimetype;
//   }

//   get size() {
//     return this._size;
//   }

//   get filename() {
//     return this._filename;
//   }

//   get cbUsername() {
//     return this._cbUsername;
//   }

//   get dateCreated() {
//     return this._dateCreated;
//   }

//   get tags() {
//     return this._tags;
//   }

//   toString() {
//     return `(${this._id}, ${this._title}, ${this._encoding}, ${this._mimetype}, ${this._size}, ${this._filename}, ${this._cbUsername}, ${this._dateCreated}, [${this._tags}])`;
//   }
// }
