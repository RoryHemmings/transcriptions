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
    return await UserManager.findUser(username);
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
app.get('/login', (req, res) => {
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

app.get('/auth/logout', (req, res) => {
  req.logOut();
  res.redirect('/');
});

// GET users listing.
app.get('/users', async (req, res) => {
  const users = await UserManager.getUsers();
  res.json(users);
});

// POST new users
app.post('/auth/register', async (req, res) => {
  if (await UserManager.createUser(req.body.username, req.body.password) != false) {
    res.redirect('/');
  } else {
    res.redirect('/register');
  }
});

app.post('/auth/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true,
}));

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