if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Dependencies
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const multer = require('multer');

// Services
const UserManager = require('./services/UserManager');
const TranscriptionManager = require('./services/TranscriptionManager');
const initializePassport = require('./passport-config');

// Definitions
const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // Aparently windows doesn't accept ':' in files (thanks alot error message which said absolutely nothing about that)
    const filename = new Date().toISOString().replace(/:/g, '-');

    let suffix = '';
    if (file.mimetype == 'image/png') {
      suffix = '.png';
    } else if (file.mimetype == 'image/jpeg') {
      suffix = '.jpg';
    } else if (file.mimetype == 'application/pdf') {
      suffix = '.pdf';
    }
    cb(null, filename + suffix);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 6000000
  }
}).single('file');

// Passport config
initializePassport(
  passport,
  async (username) => {
      return await UserManager.findUserByUsername(username);
    },
    async (id) => {
      return await UserManager.findUserById(id);
    }
);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET_KEY,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
// GET home page
app.get('/', async (req, res) => {
  let recentTranscriptions = [];
  recentTranscriptions = await TranscriptionManager.getRecentTranscriptions(20);

  res.render('home', {
    title: `Welcome ${(req.user) ? req.user.username : ''}`,
    user: req.user,
    recentTranscriptions: recentTranscriptions
  });
});

app.get('/upload', checkAuthenticated, (req, res) => {
  res.render('upload', {
    user: req.user
  });
});

// GET serach page
app.get('/search', (req, res) => {
  res.render('search', {
    user: req.user
  });
});

// GET explore page
app.get('/explore', (req, res) => {
  res.render('explore', {
    user: req.user
  });
});

// GET login page
app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login', {
    user: req.user
  });
});

// GET register page
app.get('/register', (req, res) => {
  res.render('register', {
    user: req.user
  });
});

// Users profile
app.get('/user/:id', async (req, res) => {
  // TODO refactor this system to pass user to browser and route directly to id
  if (req.params.id === 'USER_PROFILE') {
    if (!req.isAuthenticated() || !req.user) {
      res.redirect('/login');
      return;
    }
    res.redirect(`/user/${req.user.id}`);
    return;
  }

  const id = req.params.id;

  const user = await UserManager.findUserById(id);
  if (user === null) {
    res.render('profile', {
      notFound: true,
      user: req.user
    });
    return;
  }

  const transcriptions = await TranscriptionManager.findTranscriptionsByUsername(user.username);

  /**
   *  Sort from most recent to least recent  
   *  Dates are greater if more recent
   */
  transcriptions.sort((a, b) => {
    return (new Date(a.dateCreated) <= new Date(b.dateCreated)) ? 1 : -1;
  });

  let authenticated = false;
  // TODO Fix potential security risk
  if (req.user) {
    if (req.isAuthenticated() && req.user.id === req.params.id) {
      authenticated = true;
    }
  }

  res.render('profile', {
    targetUser: user,
    user: req.user,
    notFound: false,
    authenticated: authenticated,
    transcriptions: transcriptions
  });
});

app.get('/transcription/:id', async (req, res) => {
  const id = req.params.id;
  const transcription = await TranscriptionManager.findTranscriptionById(id);

  // console.log(transcription);

  res.render('transcription', {
    user: req.user,
    transcription: transcription
  });
});

app.get('/settings', checkAuthenticated, (req, res) => {
  res.render('userSettings', {
    user: req.user
  });
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.logOut();
  res.redirect('/login');
});

// POST new users
app.post('/auth/register', async (req, res) => {
  const result = await UserManager.createUser(req.body.username, req.body.password);
  if (result === 0) {
    res.redirect('/login');
  } else if (result === 1) {
    req.flash('error', 'user already exists');
    res.redirect('/register');
  } else if (result === 2) {
    req.flash('error', 'invalid username (usernames must consist of alphanumeric characters only, and be between 3 and 20 characters long');
    res.redirect('/register');
  } else if (result === 3) {
    req.flash('error', 'invalid password (passwords must be between 6 and 20 characters long)');
    res.redirect('/register');
  } else if (result === -1) {
    req.flash('error', 'internal server error');
    res.redirect('/register');
  }
});

app.post('/auth/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true,
}));

app.post('/settings', async (req, res) => {
  let user = await UserManager.findUserById(req.user.id);
  if (req.body.bio != user.bio) {
    user.bio = req.body.bio;

    if (!user.updateSettings()) {
      res.status(500);
    }
  }
  res.redirect(`/user/${user.id}`);
});

app.post('/upload', async (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect('/login');
  }

  upload(req, res, async (err) => {
    if (err) {
      if (err.message == 'File too large') {
        req.flash('error', 'File exceeds maximum file size (6MB)');
        res.redirect('/upload');
        return;
      }

      req.flash('error', err.message);
      res.redirect('/upload');
    } else {
      if (!req.file) {
        req.flash('error', 'Internal Server Error');
        res.redirect('/upload');
      }

      const error = await TranscriptionManager.createTranscription(req.body.title, req.file, req.user.username, ["tag", "tag1"]);
      if (!error) {
        res.redirect('/user/' + req.user.id);
      } else {
        req.flash('error', error);
        res.redirect('/upload');
      }
    }
  });

  return;
});

app.post('/transcription/like', checkAuthenticated, async (req, res) => {
  const result = await TranscriptionManager.likeTranscription(req.body.transcriptionId, req.user.id);

  res.json(result).status((result == null) ? 200 : 500);
});


app.post('/transcription/dislike', checkAuthenticated, async (req, res) => {
  const result = await TranscriptionManager.dislikeTranscription(req.body.transcriptionId, req.user.id);

  res.json(result).status((result == null) ? 200 : 500);
});

app.post('/transcription/comment', checkAuthenticated, async (req, res) => {
  const result = await TranscriptionManager.createComment(req.body.transcriptionId, req.body.commentInput, req.user.username);

  // res.json({redirected: false}).status((result == null) ? 201 : 500);
  res.json({redirected: false, status: 201});
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }

  next();
}

module.exports = app;