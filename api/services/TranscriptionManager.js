/**
 * Instead of class based approach to storing transcriptions, I'm going to try to use facotry functions/Object Literals
 * Then I can use helper functions on in the TranscriptionManager struct to solve all functionality
 */

const { v4: uuidv4 } = require("uuid");
const database = require("./Database");

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
		return "Invalid file type, Only file types pdf, png, jpg, and jpeg are accepted";
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
	return await database.updateTranscription(transcription).catch((err) => {
		console.error(err);
		res = err;
	});
}

const TranscriptionManager = {
	createTranscription: async (title, fileInfo, author, tags) => {
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

		tags = tags.split(",");
		for (let i = 0; i < tags.length; i++) {
			if (tags[i][0] == " ") {
				tags[i] = tags[i].substring(1);
			}
			if (tags[i][tags[i].length - 1] == " ") {
				tags[i] = tags[i].substring(0, tags[i].length - 1);
			}
		}

		if (tags.length == 1 && tags[0] == "") {
			tags = [];
		}

		const transcription = {
			id,
			title,
			dateCreated,
			tags,
			author: author.username,
			authorId: author.id,
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
	createComment: async (transcriptionId, comment, username, userId) => {
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
			userId,
			dateCreated: new Date().toISOString(),
		};

		// Add comments to array
		transcription.comments.push(newComment);

		// Update transcription
		updateTranscription(transcription);
	},
	search: async (term, pageNumber) => {
		let resultMap = new Map();

		// Tag search
		if (term.includes('tag=')) {
			let tag = term.split('=')[1];
			let ret = await database.searchForTranscriptionsByTag(tag);

			return ret;
		}

		const keywords = term.split(" ");

		/**
		 * Search Algorithm Outline
		 * 0. Create result map
		 * 1. Split search term into keywords
		 * 2. Search database for terms one at a time (get results as just the ID)
		 * 3. Iterate through the results
		 * 	3-1. Increment the result map by 1 at key of each result ID
		 * 4. Create array that is sorted based on ids with the highest number of times seen first
		 * 5. Search database for top 20 results or something
		 * 	5-1. Change result page number based on page number sent in request
		 */

		for (let keyword of keywords) {
			let searchResults = await database
				// Search for individual keywords
				.searchForTranscriptions(keyword)
				.catch((err) => {
					console.error(err);
				});

			for (let result of searchResults) {
				// Get id out of result obect
				result = result.id;
				let popularity = resultMap.get(result);
				popularity = popularity + 1 || 1; // Will set initial popularity if result doesnt exist yet
				resultMap.set(result, popularity);
			}
		}

		// Sort map into array with an order determined by descending values
		let results = [...resultMap].sort((a, b) => {
			// For some reason comparing with > operator doesn't work
			// Instead you are supposed to subtract them
			// I understand why but it makes very little sense for javascript to break convention for no reason
			return b[1] - a[1];
		});

		// filters so that transcriptions are ordered based on page number
		let maxTranscriptionsPerPage = 20;
		results = results.slice(
			(pageNumber - 1) * maxTranscriptionsPerPage,
			pageNumber * maxTranscriptionsPerPage
		);

		// Returns to 20 results
		let ret = [];
		for (let result of results) {
			let transcription = await database
				.findTranscriptionById(result[0])
				.catch((err) => {
					console.error(err);
				});

			ret.push(transcription);
		}

		return ret;
	},
	getRecentTranscriptions: async (pageNumber) => {
		const numTranscriptionsPerPage = 3;	
		let begin = (pageNumber - 1) * numTranscriptionsPerPage;	
		let end = (begin + numTranscriptionsPerPage);

		let recentTranscriptions = await database
			.getRecentTranscriptions(begin, end)
			.catch((err) => {
				console.error(err);
				recentTranscriptions = [];
			});
		
		return recentTranscriptions;
	},
	deleteTranscription: async (transcription) => {
		let path = __dirname + "/../../uploads/" + transcription.filename;

		/**
		 * I debated adding a file manager, but it
		 * would literally only serve one purpose so
		 * I decided against it
		 */
		fs.unlink(path, (err) => {
			if (err) {
				console.error("Couldn't delete file: " + err);
			}
		});

		return await database.deleteTranscription(transcription.id).catch((err) => {
			console.error(err);
			return err;
		});
	},
	deleteComment: async (transcription, commentIndex) => {
		let comments = JSON.parse(transcription.comments);

		comments.splice(commentIndex, 1);

		/**
		 * No need to stringify the comment array before setting it
		 * because database.updateTranscription handles that
		 */
		transcription.comments = comments;

		return await updateTranscription(transcription);
	},
};

module.exports = TranscriptionManager;

// class Transcription {
//   constructor(id, title, encoding, mimetype, size, filename, author, dateCreated, tags) {
//     this._id = id;
//     this._title = title;
//     this._author = author;
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

//   get author() {
//     return this._author;
//   }

//   get dateCreated() {
//     return this._dateCreated;
//   }

//   get tags() {
//     return this._tags;
//   }

//   toString() {
//     return `(${this._id}, ${this._title}, ${this._encoding}, ${this._mimetype}, ${this._size}, ${this._filename}, ${this._author}, ${this._dateCreated}, [${this._tags}])`;
//   }
// }
