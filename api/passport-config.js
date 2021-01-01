const LocalStrategy = require('passport-local').Strategy

async function initialize(passport, getUserByEmail, getUserById) {
  const authenticateUser = async (email, password, done) => {
    const user = await getUserByEmail(email);
    if (user == null) {
      return done(null, false, {
        message: 'No user with that email'
      });
    }

    try {
      // Prevents user from logging in if they have not verified their email
      if (!user.isActive()) {
        return done(null, false, {
          message: 'Account is not activated (please check email for activation link)'
        });
      }

      if (await user.authenticate(password)) {
        return done(null, user.getShorthandVersion());
      } else {
        return done(null, false, {
          message: 'Password incorrect'
        });
      }
    } catch (e) {
      return done(e);
    }
  }

  passport.use(new LocalStrategy({
    usernameField: 'email',
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