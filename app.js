const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// ===== Middleware =====
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== Serve frontend =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== MongoDB connection via environment variable =====
const mongoURI = process.env.MONGO_URI; 

if (mongoURI) {
  mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.log("No MongoDB URI provided, skipping database connection");
}

// ===== User schema =====
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});
const User = mongoose.model('User', userSchema);

// ===== Signup route =====
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ message: "Email and password required" });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.json({ message: "Email already exists" });

    const newUser = new User({ email, password });
    await newUser.save();
    res.json({ message: "Signup successful" });
  } catch (err) {
    res.json({ message: "Error during signup" });
  }
});

// ===== Login route =====
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ message: "Email and password required" });

  try {
    const user = await User.findOne({ email, password });
    if (!user) return res.json({ message: "Invalid email or password" });

    res.json({ message: "Login successful" });
  } catch (err) {
    res.json({ message: "Error during login" });
  }
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
