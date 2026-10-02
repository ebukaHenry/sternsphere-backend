const express = require('express');
const router = express.Router();
const { 
  register, 
  verifyEmail, 
  login, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/authController');

const passport = require('passport');
const jwt = require('jsonwebtoken');

// Ensure your passport configuration execution file runs
require('../config/passport');

//Core Registration & Validation Pipelines
router.post('/register', register);
router.post('/verify-email', verifyEmail);

//Authentication Handling
router.post('/login', login);

//Password Recovery Pipelines
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// 1. Route to trigger the Google Login Window sequence
router.get(
  '/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false // Disable session storage for stateless JWT handling
  })
);

// 2. Callback URL where Google securely routes users after successful validation
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: false 
  }), // Disable session storage for stateless JWT handling
  (req, res) => {
    // Generate a secure JWT session token for the authenticated user
    const token = jwt.sign({ 
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || 'user' // Default role assignment if not specified
     }, 
     process.env.JWT_SECRET, 
     { expiresIn: '7d' }
    );

    // Convert user object details to URI encoding strings safely
    const userData = encodeURIComponent(JSON.stringify({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || 'user'
    }));

    // Redirect back to your React app with parameters inside URL queries
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${userData}`);
  }
);


module.exports = router;
