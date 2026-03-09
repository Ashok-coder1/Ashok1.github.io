const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ----- MongoDB connection -----
mongoose.connect(
  "mongodb+srv://ashokpokhrel25_db_user:dDwjmkdD4zfzYN0M@cluster1.ydjxy7x.mongodb.net/?appName=Cluster1",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// ----- User Schema -----
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  photo: { type: String, default: "" } // store file path
});

const User = mongoose.model("User", userSchema);

// ----- SIGN UP -----
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username.startsWith("+"))
      return res.status(400).json({ success: false, message: "Username must start with +" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ----- LOGIN -----
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Invalid credentials" });

    res.json({ success: true, username: user.username, userId: user._id, photo: user.photo });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ----- GET USERS (search) -----
app.get("/users", async (req, res) => {
  try {
    const { search = "", exclude } = req.query;
    let query = { username: { $regex: search, $options: "i" } };
    if (exclude && mongoose.isValidObjectId(exclude)) query._id = { $ne: exclude };

    const users = await User.find(query).select("_id username photo");
    res.json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json([]);
  }
});

// ===== PROFILE UPDATES =====

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "public/uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ----- CHANGE USERNAME -----
app.post("/change-username", async (req, res) => {
  try {
    const { userId, username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: "Username required" });
    await User.findByIdAndUpdate(userId, { username });
    res.json({ success: true, message: "Username updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ----- CHANGE EMAIL -----
app.post("/change-email", async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: "Email already used" });

    await User.findByIdAndUpdate(userId, { email });
    res.json({ success: true, message: "Email updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ----- CHANGE PASSWORD -----
app.post("/change-password", async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: "Password required" });
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ----- UPLOAD PROFILE PHOTO -----
app.post("/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const filePath = "/uploads/" + req.file.filename;
    await User.findByIdAndUpdate(userId, { photo: filePath });

    res.json({ success: true, message: "Photo uploaded", path: filePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ----- Socket.io private chat -----
let onlineUsers = {};    // userId => socket.id
let socketToUser = {};   // socket.id => userId

io.on("connection", (socket) => {

  // Register user
  socket.on("register", (userId) => {
    onlineUsers[userId] = socket.id;
    socketToUser[socket.id] = userId;
  });

  // Private message
  socket.on("private message", ({ to, message }) => {
    const socketId = onlineUsers[to];
    if (socketId) {
      const fromUserId = socketToUser[socket.id];
      io.to(socketId).emit("private message", { message, from: fromUserId });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    const userId = socketToUser[socket.id];
    if (userId) delete onlineUsers[userId];
    delete socketToUser[socket.id];
  });
});

// ----- Start server -----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));