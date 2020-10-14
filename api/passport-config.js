const LocalStrategy = require('passport-local').Strategy

async function initialize(passport, getUserByUsername, getUserById) {
  const authenticateUser = async (username, password, done) => {
    const user = await getUserByUsername(username);
    if (user == null) {
      return done(null, false, {
        message: 'No user with that username'
      });
    }

    try {
      if (await user.authenticate(password)) {
        return done(null, user.getShorthandVersion());
      } else {
        return done(null, false, {
          message: 'Password incorrect'
        })
      }
    } catch (e) {
      return done(e);
    }
  }

  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, authenticateUser));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    getUserById(id).then(user => {
      return done(null, user.getShorthandVersion());
    });
  });
}

module.exports = initialize;