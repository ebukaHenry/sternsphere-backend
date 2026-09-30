const express = require('express');
const cors = require('cors');
const cookieSession = require('cookie-session');
const passport = require('passport');
require('dotenv').config();

const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const aiTutorRoutes = require ('./routes/aiTutors');


const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',          // Local Vite dev server
  'https://stern-sphere.vercel.app' // Live Vercel production frontend
];

// 1. Global Middleware Layers
app.use(cors({ 
  origin: function (origin, callback) {
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) return callback(null, true);
  if (allowedOrigins.indexOf(origin) !== -1) {
    callback(null, true); // Allow the request but you can log or handle it differently if needed
  } else {
   callback(new Error('Not allowed by CORS'));
}
},
credentials: true, // Allow cookies to be sent with requests
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json()); // Essential body parsing setup enabling JSON payload capture

//Configure the Session Cookies Storage pipeline
app.use(
  cookieSession({
    name: 'sternsphere_session',
    keys: [process.env.COOKIE_KEY],
    maxAge: 24 * 60 * 60 * 1000, // Valid for 24 hours
  })
);



async function testDatabase() {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testDatabase();

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
