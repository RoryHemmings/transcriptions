/** TODO
 * Look into JWT
 */

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

// Services
const UserManager = require('./services/UserManager');
const initializePassport = require('./passport-config')

// Definitions
const app = express();

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

// Routes
// GET home page
app.get('/', (req, res) => {
  res.render('home', {
    title: `Welcome ${(req.user) ? req.user.username : ''}`,
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

  const transcriptions = {
    num: 1
  };

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

app.get('/settings', checkAuthenticated, (req, res) => {
  console.log("settings")
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

  res.redirect('login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }

  next();
}

module.exports = app;

// app.get('/checkAuthenticated', (req, res) => {
//   const user = req.session.user;
//   if (user != undefined) {
//     res.json({user: user});
//   }
//   else res.json({user: false});
// });

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

// app.post('/auth/login', (req, res, next) => {
//   passport.authenticate('local', (err, user, info) => {
//     if (err) {
//       return res.status(500).send(err);
//     }

//     if (user) {
//       user = user.getShorthandVersion();
//       req.session.user = user;
//       return res.json({user: user, message: ''});
//     } else {
//       return res.json({user: user, message: info.message});
//     }
//   })(req, res, next);
// });

//   try {
//     if (await user.authenticate(req.body.password)) {

//     } else {

//     }
//   } catch {
//     res.status(500).send();
//   }
// });