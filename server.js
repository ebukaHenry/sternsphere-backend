const express = require('express');
const cors = require('cors');
const cookieSession = require('cookie-session');
const passport = require('passport');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const aiTutorRoutes = require ('./routes/aiTutors');


const app = express();
const PORT = process.env.PORT || 5000;

// 1. Global Middleware Layers
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json()); // Essential body parsing setup enabling JSON payload capture

//Configure the Session Cookies Storage pipeline
app.use(
  cookieSession({
    name: 'sternsphere_session',
    keys: [process.env.COOKIE_KEY],
    maxAge: 24 * 60 * 60 * 1000, // Valid for 24 hours
  })
);

// 2. Initialize Passport and hook it up to session engines
app.use(passport.initialize());
app.use(passport.session());

// 2. Endpoint Application Groupings Mapping Injections
app.use('/api/auth', authRoutes);
app.use("/api/ai-tutor", aiTutorRoutes);

// 3. Fallback Health Ping Validation endpoint
app.get('/health', (req, res) => res.status(200).json({ status: 'Online and operating' }));

// 4. Activate System Listening Framework
app.listen(PORT, () => {
  console.log(`🚀 SternSphere Backend server running smoothly on port ${PORT}`);
});
