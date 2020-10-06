if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Dependencies
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');

// Services
const UserManager = require('./services/UserManager');
const initializePassport = require('./passport-config')

// Definitions
const app = express();

// Passport config
initializePassport(
  passport,
  async username => {
      return await UserManager.findUser(username);
    },
    async id => {
      return await UserManager.findUserById(id);
    }
);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(session({
  secret: process.env.SESSION_SECRET_KEY,
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
// GET home page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Transcriptions api'
  });
});

// GET users listing.
app.get('/users', async (req, res) => {
  const users = await UserManager.getUsers();
  res.json(users);
});

// POST new users
app.post('/register', async (req, res) => {
  if (await UserManager.createUser(req.body.username, req.body.password) != false) {
    res.status(201).send();
  } else {
    res.status(500).send();
  }
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (user) {
      return res.json({successful: true, message: ''});
    } else {
      return res.json({successful: false, message: info.message});
    }
  })(req, res, next);
});

// app.post('/login', passport.authenticate('local', (err, user, info) => {

//   console.log(err, user, info);
// }));

// app.post('/login', passport.authenticate('local', {
//   successRedirect: '/',
//   failureRedirect: '/login',
//   failureFlash: true,
//   successFlash: true
// }))

// app.post('/login', async (req, res) => {
//   const user = UserManager.findUser(req.body.username);
//   if (user == null) {
//     return res.status(400).send('User not found');
//   }

//   try {
//     // returns false if password doesn't match that of the hash of the associated user
//     if (await user.authenticate(req.body.password)) {

//     } else {

//     }
//   } catch {
//     res.status(500).send();
//   }
// });

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

module.exports = app;