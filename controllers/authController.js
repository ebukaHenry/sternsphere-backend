const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// NodeMailer Mail Transport configuration setup interface
const transporter = nodemailer.createTransport({
  //service: 'gmail', // Swap this configuration out with your primary mail carrier block if not using Gmail
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  family: 4, // Use IPv4 to avoid potential IPv6 issues
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to dynamically generate a clean 6-digit verification code string
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// --- 1. USER REGISTRATION LAYER ---
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if the user already exists in the system
    const userExist = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'Email address is already in use.' });
    }

    // Encrypt the plain text password for secure storage
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification parameters (Valid for 15 minutes)
    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    // Insert user record with unverified flags
    const newUser = await db.query(
      'INSERT INTO users (name, email, password, verification_code, verification_expires) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email',
      [name, email.toLowerCase(), hashedPassword, code, expiry]
    );

    // Deliver verification email containing the 6-digit code
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email.toLowerCase(),
      subject: 'Verify Your SternSphere Account',
      text: `Welcome to SternSphere, ${name}! Your registration verification code is: ${code}. It expires in 15 minutes.`,
    };
    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: 'Registration initiated successfully. Please check your inbox for your verification code.',
      userId: newUser.rows[0].id
    });

  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Internal Server Error processing user registration.' });
  }
};

// --- 2. EMAIL CODE VERIFICATION LAYER ---
exports.verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  try {
    const userQuery = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User matching input parameters not found.' });
    }

    const user = userQuery.rows[0];

    // Check if user is already verified
    if (user.is_verified) {
      return res.status(400).json({ message: 'This account has already been verified.' });
    }

    // Validate code and check expiration window
    if (user.verification_code !== code || new Date() > new Date(user.verification_expires)) {
      return res.status(400).json({ message: 'Invalid or expired registration code verification sequence.' });
    }

    // Activate user profile and clear verification code columns
    await db.query(
      'UPDATE users SET is_verified = true, verification_code = null, verification_expires = null WHERE id = $1',
      [user.id]
    );

    // Issue JWT token immediately to log the user in seamlessly
    const token = jwt.sign({ 
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user' // Default role assignment if not specified
     }, 
     process.env.JWT_SECRET, 
     { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Account successfully verified.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' }
    });

  } catch (error) {
    console.error('Error during email verification:', error);
    res.status(500).json({ message: 'Server verification processing error.' });
  }
};

// --- 3. LOGIN INTERACTION LAYER ---
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password credentials.' });
    }

    const user = userQuery.rows[0];

    // Block authentication attempts for unverified accounts
    if (!user.is_verified) {
      return res.status(401).json({ message: 'Account email has not been verified yet.' });
    }

    // Compare input password with the hashed database password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password credentials.' });
    }

    // Generate JWT access token
    const token = jwt.sign({ 
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user' // Default role assignment if not specified
     }, 
     process.env.JWT_SECRET, 
     { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' }
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server processing error during login configuration.' });
  }
};

// --- 4. FORGOT PASSWORD LAYER (Using verification code instead of bulky links) ---
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const userQuery = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userQuery.rows.length === 0) {
      // Return a general success message to prevent user enumeration security vulnerabilities
      return res.status(200).json({ message: 'If that email exists in our system, a code was sent.' });
    }

    const user = userQuery.rows[0];

    // Reuse verification code logic to generate a password reset code
    const resetCode = generateVerificationCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 Minute window

    // Update database fields with code variables
    await db.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetCode, expiry, user.id]
    );

    // Send code to the user's email address
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'SternSphere Password Reset Code',
      text: `Your password reset confirmation code is: ${resetCode}. It expires in 15 minutes.`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'If that email exists in our system, a code was sent.' });

  } catch (error) {
    console.error('Forgot password error processing:', error);
    res.status(500).json({ message: 'Server error processing password recovery.' });
  }
};

// --- 5. PASSWORD RESET SUBMISSION LAYER ---
exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const userQuery = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid code or password reset parameters.' });
    }

    const user = userQuery.rows[0];

    // Validate the recovery code and check expiration window
    if (user.reset_token !== code || new Date() > new Date(user.reset_expires)) {
      return res.status(400).json({ message: 'The reset code provided is invalid or has expired.' });
    }

    // Encrypt the user's new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset columns
    await db.query(
      'UPDATE users SET password = $1, reset_token = null, reset_expires = null WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.status(200).json({ message: 'Password has been updated successfully. You can now log in.' });

  } catch (error) {
    console.error('Reset password processing error:', error);
    res.status(500).json({ message: 'Server error processing password update.' });
  }
};
