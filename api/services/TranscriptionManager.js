/**
 * Instead of class based approach to storing transcriptions, I'm going to try to use facotry functions/Object Literals
 * Then I can use helper functions on in the TranscriptionManager struct to solve all functionality
 */

const { v4: uuidv4 } = require("uuid");
const database = require("./Database");

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

async function updateTranscription(transcription) {
	let res = null;
	await database.updateTranscription(transcription).catch((err) => {
		res = err;
	});

	return res;
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
			likes: [], // Will be stored as an array of user_ids
			dislikes: [],
			comments: [],
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
	likeTranscription: async (transcriptionId, userId) => {
		// Get transcription by id
		let transcription = await TranscriptionManager.findTranscriptionById(
			transcriptionId
		).catch((err) => {
			console.error(err);
			return err;
		});

		// Parse likes and dislikes into arrays
		transcription.likes = JSON.parse(transcription.likes);
		transcription.dislikes = JSON.parse(transcription.dislikes);

		// Make sure that user hasn't already liked the post
		if (transcription.likes.includes(userId)) {
			return null;
		}

		// Remove user from dislikes so that they cant both like and dislike the post at the same time
		const i = transcription.dislikes.indexOf(userId);
		if (i != -1) {
			transcription.dislikes.splice(i, 1);
		}

		// Add userId to likes array
		transcription.likes.push(userId);

		// Update transcription in database
		updateTranscription(transcription);
	},
	dislikeTranscription: async (transcriptionId, userId) => {
		// Get transcription by id
		let transcription = await TranscriptionManager.findTranscriptionById(
			transcriptionId
		).catch((err) => {
			console.error(err);
			return err;
		});

		// Turn likes and dislikes into an object
		transcription.likes = JSON.parse(transcription.likes);
		transcription.dislikes = JSON.parse(transcription.dislikes);

		// Make sure post isn't already disliked
		if (transcription.dislikes.includes(userId)) {
			return null;
		}

		// Make it so that the user cant like and dislike at the same time
		const i = transcription.likes.indexOf(userId);
		if (i != -1) {
			transcription.likes.splice(i, 1);
		}

		// Add users id to dislike array
		transcription.dislikes.push(userId);

		// Update transcription in the database
		updateTranscription(transcription);
	},
	createComment: async (transcriptionId, comment, username) => {
		// Get transription by id
		let transcription = await TranscriptionManager.findTranscriptionById(
			transcriptionId
		).catch((err) => {
			console.error(err);
			return err;
		});

		// Parse comments into object
		transcription.comments = JSON.parse(transcription.comments);

		// Create new comment object
		const newComment = {
			comment,
			username,
			dateCreated: new Date().toISOString(),
		};

		// Add comments to array
		transcription.comments.push(newComment);

		// Update transcription
		updateTranscription(transcription);
	},
	search: async (term) => {
		const keywords = term.split(' ');

		let results = await database
			.searchForTranscriptions(keywords)
			.catch((err) => {
				console.error(err);
				results = [];
			});

		return results;
	},
	getRecentTranscriptions: async (num) => {
		let recentTranscriptions = await database
			.getRecentTranscriptions(num)
			.catch((err) => {
				console.error(err);
				recentTranscriptions = [];
			});

		return recentTranscriptions;
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
