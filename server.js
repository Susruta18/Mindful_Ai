require('dotenv').config();

// Force the use of Google DNS to bypass local ISP/Network SRV resolution issues
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);


// Ensure Node.js version is at least 18 (for native fetch support)
if (parseInt(process.versions.node.split('.')[0]) < 18) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️ Warning: Node.js 18 or higher is recommended for native fetch support.');
  console.warn('\x1b[33m%s\x1b[0m', 'If you encounter "fetch is not defined" errors, please upgrade Node.js.');
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// NOTE: OTP/email sending was removed to simplify signup to email+password and Google Sign-In.

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// MongoDB Atlas URI from environment variables
const MONGO_URI = process.env.MONGO_URI;

// Initialize Connection with a more robust retry mechanism
const dbOptions = {
  serverSelectionTimeoutMS: 15000, // Increase timeout to 15s
  connectTimeoutMS: 15000,        // Add connect timeout
  family: 4,                      // Force IPv4
  heartbeatFrequencyMS: 10000,    // Check connection every 10s
};

async function connectWithRetry() {
  console.log('⏳ Attempting to connect to MongoDB Atlas...');
  try {
    await mongoose.connect(MONGO_URI, dbOptions);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:');
    console.error(err.message);
    
    if (err.message.includes('ETIMEDOUT') || err.message.includes('selection timed out')) {
      console.log('\x1b[33m%s\x1b[0m', '👉 TIP: This is likely a network/firewall issue. Retrying in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log('\x1b[31m%s\x1b[0m', '👉 Check your MongoDB Atlas IP Whitelist and MONGO_URI credentials.');
    }
  }
}

connectWithRetry();

/* ─────────────────────────────────────────────
   MONGOOSE SCHEMAS
───────────────────────────────────────────── */
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  chatHistory: { type: Array, default: [] },
  moodLogs: { type: Array, default: [] },
  journalEntries: { type: Array, default: [] },
  currentMood: { type: String, default: 'neutral' }
});

const User = mongoose.model('User', UserSchema);

/* ─────────────────────────────────────────────
   API ROUTES
───────────────────────────────────────────── */

// 1. Database Connection Middleware
app.use('/api', (req, res, next) => {
  // 0 = disconnected, 3 = disconnecting
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    connectWithRetry();
  }
  // Mongoose will automatically buffer queries if readyState === 2 (connecting)
  next();
});

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access denied, token missing" });

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// 1. Authentication
// OTP endpoint removed. Signup now uses direct email+password and Google Sign-In.

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    // Validate Password: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const pwdRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!pwdRegex.test(password)) {
      return res.status(400).json({ error: "Invalid password format" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ email: newUser.email, id: newUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

    res.status(201).json({ message: "User registered successfully", user: { email: newUser.email, chatHistory: newUser.chatHistory, moodLogs: newUser.moodLogs, journalEntries: newUser.journalEntries, currentMood: newUser.currentMood }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ email: user.email, id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

    res.status(200).json({ message: "Login successful", user: { email: user.email, chatHistory: user.chatHistory, moodLogs: user.moodLogs, journalEntries: user.journalEntries, currentMood: user.currentMood }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google Sign-In / Register: verifies Google's ID token and creates or returns a user
app.post('/api/auth/google-signin', async (req, res) => {
  try {
    const { googleToken } = req.body;
    if (!googleToken) return res.status(400).json({ error: "Google token missing" });

    // Verify token with Google's tokeninfo endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`);
    if (!verifyRes.ok) {
      const txt = await verifyRes.text();
      return res.status(400).json({ error: `Invalid Google token: ${txt}` });
    }

    const info = await verifyRes.json();
    const email = info.email;
    if (!email) return res.status(400).json({ error: "Google token did not contain email" });

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      // Create a random password for Google-only users (hashed)
      const randomPass = Math.random().toString(36).slice(-12);
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(randomPass, salt);
      user = new User({ email, password: hashed });
      await user.save();
    }

    const token = jwt.sign({ email: user.email, id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

    res.json({ message: "Google sign-in successful", token, user: { email: user.email, chatHistory: user.chatHistory, moodLogs: user.moodLogs, journalEntries: user.journalEntries, currentMood: user.currentMood } });
  } catch (err) {
    console.error('Google signin error', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Data Sync
// Get User Data
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync User Data (Save State)
app.post('/api/user/sync', authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    const { chatHistory, moodLogs, journalEntries, currentMood } = req.body;

    const updateFields = {};
    if (chatHistory) updateFields.chatHistory = chatHistory;
    if (moodLogs) updateFields.moodLogs = moodLogs;
    if (journalEntries) updateFields.journalEntries = journalEntries;
    if (currentMood) updateFields.currentMood = currentMood;

    const user = await User.findOneAndUpdate(
      { email },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "State synced to DB" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Secure AI Chat Proxy
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array required" });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
      console.log("Mocking AI response (No API Key)");
      return res.json({
        choices: [{
          message: { content: "I'm currently in Demo Mode because no GROQ API key was found in the `.env` file! But I am still listening and here for you 🌿" }
        }]
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messages,
        temperature: 0.6,
        max_tokens: 250,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API Error:", errText);
      return res.status(response.status).json({ error: "AI service error" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Chat Proxy Error:", err);
    res.status(500).json({ error: "Failed to communicate with AI" });
  }
});

const PORT = process.env.PORT || 3000;
// Always listen when running locally
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌿 Press Ctrl+C to stop the server`);
});

// Export for Vercel
module.exports = app;
