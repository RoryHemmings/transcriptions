if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}

// Dependencies
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const logger = require("morgan");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const multer = require("multer");

// Services
const utils = require("./utils");
const UserManager = require("./services/UserManager");
const TranscriptionManager = require("./services/TranscriptionManager");
const initializePassport = require("./passport-config");

// Definitions
const app = express();

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, "../uploads"));
	},
	filename: (req, file, cb) => {
		// Aparently windows doesn't accept ':' in files (thanks alot error message which said absolutely nothing about that)
		const filename = new Date().toISOString().replace(/:/g, "-");

		let suffix = "";
		if (file.mimetype == "image/png") {
			suffix = ".png";
		} else if (file.mimetype == "image/jpeg") {
			suffix = ".jpg";
		} else if (file.mimetype == "application/pdf") {
			suffix = ".pdf";
		}

		cb(null, filename + suffix);
	},
});

const upload = multer({
	storage: storage,
	fileFilter: (req, file, cb) => {
		let ext = path.extname(file.originalname);
		if (ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".pdf") {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Invalid file type, Only file types pdf, png, jpg, and jpeg are accepted"
				)
			);
		}
	},
	limits: {
		fileSize: 6000000,
	},
}).single("file");

// Passport config
initializePassport(
	passport,
	async (email) => {
		return await UserManager.findUserByEmail(email);
	},
	async (id) => {
		return await UserManager.findUserById(id);
	}
);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(
	express.urlencoded({
		extended: false,
	})
);
app.use(flash());
app.use(
	session({
		secret: process.env.SESSION_SECRET_KEY,
		resave: false,
		saveUninitialized: false,
	})
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/static", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
// GET home page
app.get("/", async (req, res) => {
	// recentTranscriptions = await TranscriptionManager.getRecentTranscriptions(20);

	res.render("home", {
		title: `Welcome ${req.user ? req.user.username : ""}`,
		user: req.user,
	});
});

app.get("/upload", checkAuthenticated, (req, res) => {
	res.render("upload", {
		user: req.user,
	});
});

// app.get("/", async (req, res) => {
// 	let recentTranscriptions = [];
// 	recentTranscriptions = await TranscriptionManager.getRecentTranscriptions(20);

// 	res.render("home", {
// 		title: `Welcome ${req.user ? req.user.username : ""}`,
// 		user: req.user,
// 		recentTranscriptions: recentTranscriptions,
// 	});
// });

// app.get("/upload", checkAuthenticated, (req, res) => {
// 	res.render("upload", {
// 		user: req.user,
// 	});
// });

// GET serach page
app.get("/search", async (req, res) => {
	let term = req.query.term;
	let results = [];

	let pageNumber = req.query.pageNumber || 1;

	if (term && term.length > 0) {
		results = await TranscriptionManager.search(term, pageNumber);
	}

	res.render("search", {
		user: req.user,
		pageNumber: pageNumber,
		searchTerm: term,
		results,
	});
});

// GET explore page
app.get("/explore", (req, res) => {
	res.render("explore", {
		user: req.user,
	});
});

// GET login page
app.get("/login", checkNotAuthenticated, (req, res) => {
	res.render("login", {
		user: req.user,
	});
});

// GET register page
app.get("/register", (req, res) => {
	res.render("register", {
		user: req.user,
	});
});

// Users profile
app.get("/user/:username", async (req, res) => {
	// TODO refactor this system to pass user to browser and route directly to id
	if (req.params.username === "USER_PROFILE") {
		if (!req.isAuthenticated() || !req.user) {
			res.redirect("/login");
			return;
		}
		res.redirect(`/user/${req.user.username}`);
		return;
	}

	const username = req.params.username;

	const user = await UserManager.findUserByUsername(username);
	if (user === null) {
		res.render("profile", {
			notFound: true,
			user: req.user,
		});
		return;
	}

	const transcriptions = await TranscriptionManager.findTranscriptionsByUsername(
		user.username
	);

	/**
	 *  Sort from most recent to least recent
	 *  Dates are greater if more recent
	 */
	transcriptions.sort((a, b) => {
		return new Date(a.dateCreated) <= new Date(b.dateCreated) ? 1 : -1;
	});

	let authenticated = false;
	if (req.user) {
		if (req.isAuthenticated() && req.user.username === req.params.username) {
			authenticated = true;
		}
	}

	res.render("profile", {
		targetUser: user,
		user: req.user,
		notFound: false,
		transcriptions: transcriptions,
		authenticated,
	});
});

app.get("/transcription/:id", async (req, res) => {
	const id = req.params.id;
	const transcription = await TranscriptionManager.findTranscriptionById(id);

	let authenticated = false;

	// console.log(transcription);

	if (req.user) {
		if (req.isAuthenticated() && req.user.id === transcription.authorId) {
			authenticated = true;
		}
	}

	res.render("transcription", {
		user: req.user,
		transcription: transcription,
		authenticated,
	});
});

/**
 * Returns recent transcriptions in json form
 */
app.get("/recentTranscriptions", async (req, res) => {
	const transcriptions = await TranscriptionManager.getRecentTranscriptions(
		Number(req.query.pageNumber)
	);

	res.json({
		transcriptions,
		status: 200,
		success: true,
	});
});

app.get("/settings", checkAuthenticated, (req, res) => {
	res.render("userSettings", {
		user: req.user,
	});
});

// Logout
app.get("/auth/logout", (req, res) => {
	req.logOut();
	res.redirect("/login");
});

/**
	User will get email with link to /activate/(their userid)
	When clicked on, this link will activate the user
	Since there is no other way to have the userId before activation, 
	this can't be exploited by anyone else. It can only be activated 
	by the person who gets the email unless they either have access 
	to the database or guess the user id which is mathematically impossible.
*/
app.get("/activate/:id", async (req, res) => {
	const id = req.params.id;
	const user = await UserManager.findUserById(id);

	if (user === null) {
		res.send('Invalid Activation Id');
		return;
	}
	user.activate();

	req.flash("success", "Your account has been activated, you may now log in.");
	res.redirect("/login");
});

app.get("/forgotPassword", (req, res) => {
	res.render("forgotPassword", {
		user: req.user,
	});
});

app.get("/resetPassword", async (req, res) => {
	const FPK = req.query.FPK;
	const email = req.query.email;

	const ret = await UserManager.verifyFPK(FPK, email);	

	if (ret.error) {
		res.send(ret.message);
	} else {
		res.render('resetPassword', {
			user: req.user,
			email,
		})
	}
});

// POST new user
app.post("/auth/register", async (req, res) => {
	const ret = await UserManager.createUser(
		req.body.email,
		req.body.username,
		req.body.password,
		req.body.confirmPassword
	);

	if (!ret.error) {
		const user = ret.data;
		utils.sendEmail(
			user.email,
			"Account Verification",
			`Click this link in order to activate your account.\nhttp://localhost/activate/${user.id}`
		);
		res.render("activationLimbo", {
			user: req.user,
			email: user.email,
		});
	} else {
		req.flash("error", ret.message);
		res.redirect("/register");
	}
});

app.post(
	"/auth/login",
	passport.authenticate("local", {
		successRedirect: "/",
		failureRedirect: "/login",
		failureFlash: true,
	})
);

app.post("/auth/resendVerification/", async (req, res) => {
	const email = req.body.email;
	const user = await UserManager.findUserByEmail(email);

	let success = false;
	if (!user.isActive()) {
		success = await utils.sendEmail(
			user.email,
			"Account Verification",
			`Click this link in order to activate your account.\nhttp://localhost/activate/${user.id}`
		);
	}

	res.json({ success: success });
});

app.post("/settings", async (req, res) => {
	let user = await UserManager.findUserById(req.user.id);
	if (req.body.bio != user.bio) {
		user.bio = req.body.bio;

		if (!user.updateSettings()) {
			res.status(500);
		}
	}
	res.redirect(`/user/${user.username}`);
});

app.post("/upload", async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect("/login");
	}

	upload(req, res, async (err) => {
		if (err) {
			if (err.message == "File too large") {
				req.flash("error", "File exceeds maximum file size (6MB)");
				res.redirect("/upload");
				return;
			}

			req.flash("error", err.message);
			res.redirect("/upload");
		} else {
			if (!req.file) {
				req.flash("error", "No file was provided");
				res.redirect("/upload");
			}

			const ret = await TranscriptionManager.createTranscription(
				req.body.title,
				req.file,
				req.user,
				req.body.description,
				req.body.tags
			);

			if (!ret.error) {
				res.redirect("/user/" + req.user.username);
			} else {
				req.flash("error", ret.message);
				res.redirect("/upload");
			}
		}
	});

	return;
});

app.post("/transcription/like", checkAuthenticated, async (req, res) => {
	const error = await TranscriptionManager.likeTranscription(
		req.body.transcriptionId,
		req.user.id
	);

	res.json(error).status(error == null ? 200 : 500);
});

app.post("/transcription/dislike", checkAuthenticated, async (req, res) => {
	const result = await TranscriptionManager.dislikeTranscription(
		req.body.transcriptionId,
		req.user.id
	);

	res.json(result).status(result == null ? 200 : 500);
});

app.post("/transcription/comment", checkAuthenticated, async (req, res) => {
	const result = await TranscriptionManager.createComment(
		req.body.transcriptionId,
		req.body.commentInput,
		req.user.username,
		req.user.id
	);

	// res.json({redirected: false}).status((result == null) ? 201 : 500);
	res.json({
		redirected: false,
		status: 201,
	});
});

app.post("/forgotPassword", async (req, res) => {
	const email = req.body.email;
	if ((await UserManager.findUserByEmail(email)) != null) {
		const FPK = await UserManager.createFPKEmailPair(email);

		if (FPK === undefined) {
			res.json({ success: false, message: "internal server error" });
			return;
		}

		if (
			await utils.sendEmail(
				email,
				"Password Reset",
				`Please click on this link to reset your account\nhttp://localhost/resetPassword?FPK=${FPK}&email=${email}`
			)
		) {
			// If email is sent successfully
			res.json({
				success: true,
				message: `Succesfully sent recovery email to ${email}. It may take a few minutes to show up in your inbox. If you still don't see it, check that the email is correct, and if so then try rentering it to resend`,
			});
		} else {
			res.json({ success: false, message: "Recovery email failed to send" });
		}
	} else {
		console.log(`Email Reset for ${email} not found`);
		res.json({ success: false, message: "No user with that email exists" });
	}
});

app.post("/resetPassword", async (req, res) => {
	const ret = await UserManager.updatePassword(req.body.password, req.body.confirmPassword, req.body.email);

	// Make sure that user isn't logged in already once they change their password
	req.logOut();

	if (ret.error) {
		res.json({success: false, message: ret.message});
	} else {
		res.json({success: true, message: `Success. Password for ${ret.data.email} has been reset. Click <a href="/login">Here</a> to log in.`});
	}	
});

/**
 * Make sure that user is authenticated so that somebody can't just send
 * a request to delete without login. Then check whether or not the userId
 * matches that of the post just to add an extra layer of secutrity.
 */
app.delete("/transcription/delete", checkAuthenticated, async (req, res) => {
	let transcription = await TranscriptionManager.findTranscriptionById(
		req.body.transcriptionId
	);

	// Make sure that user id matches that of the transcriptions author
	if (!(req.user.id == transcription.authorId)) {
		// Return unauthorized
		res.json({
			status: 401,
			success: false,
		});
	}

	const error = await TranscriptionManager.deleteTranscription(transcription);

	if (error) {
		res.json({
			// Return internal server error code
			status: 500,
			success: false,
		});
	} else {
		res.json({
			// Return success code
			status: 200,
			success: true,
		});
	}
});

app.delete(
	"/transcription/deleteComment",
	checkAuthenticated,
	async (req, res) => {
		let transcription = await TranscriptionManager.findTranscriptionById(
			req.body.transcriptionId
		);

		// Check that request wasn't just made by an authenticated user of a different user id
		// I wouldn't be surprised if there was a way around this but there shouldn't be, atleast to my knowledge
		if (
			req.user.id !=
			JSON.parse(transcription.comments)[req.body.commentIndex].userId
		) {
			res.json({
				status: 401,
				success: false,
			});
		}

		const error = await TranscriptionManager.deleteComment(
			transcription,
			req.body.commentIndex
		);

		if (error) {
			res.json({
				status: 500,
				success: false,
			});
		} else {
			res.json({
				status: 200,
				success: true,
			});
		}
	}
);

// catch 404 and forward to error handler
app.use((req, res, next) => {
	next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render("error");
});

function checkAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.redirect("/login");
}

function checkNotAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return res.redirect("/");
	}

	next();
}

module.exports = app;
