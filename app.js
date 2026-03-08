

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve frontend files from Public folder
app.use(express.static(path.join(__dirname, "Public")));

// MongoDB connection
mongoose.connect("mongodb+srv://ashokpokhrel25_db_user:dDwjmkdD4zfzYN0M@cluster1.ydjxy7x.mongodb.net/?appName=Cluster1")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// User schema
const UserSchema = new mongoose.Schema({
  email: String,
  password: String
});

const User = mongoose.model("User", UserSchema);

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "Indexx.html"));
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.json({ message: "User already exists" });

  const user = new User({ email, password });
  await user.save();

  res.json({ message: "Signup successful" });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.json({ message: "User not found" });
  if (user.password !== password) return res.json({ message: "Wrong password" });

  res.json({ message: "Login successful" });
});

// Start server
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
