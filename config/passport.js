const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      // Extract profile details sent back securely by Google
      const email = profile.emails[0].value.toLowerCase();
      const name = profile.displayName;

      try {
        // 1. Check if user already exists in your PostgreSQL database
        const userQuery = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userQuery.rows.length > 0) {
          const user = userQuery.rows[0];
          return done(null, user);
        }

        // 2. If user doesn't exist, create a new record (automatically verified)
        const newUserQuery = await db.query(
          'INSERT INTO users (name, email, is_verified) VALUES ($1, $2, true) RETURNING *',
          [name, email]
        );
        
        const newUser = newUserQuery.rows[0];
        return done(null, newUser);

      } catch (error) {
        console.error('Error during Google authentication strategy processing:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize user into the session cookies
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session cookies to fetch user details
passport.deserializeUser(async (id, done) => {
  try {
    const userQuery = await db.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
    done(null, userQuery.rows[0]);
  } catch (error) {
    done(error, null);
  }
});
