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

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); // Serve uploaded photos

// ===== MongoDB connection =====
mongoose.connect(
  "mongodb+srv://ashokpokhrel25_db_user:dDwjmkdD4zfzYN0M@cluster1.ydjxy7x.mongodb.net/chatApp",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("MongoDB error:", err));

// ===== USER SCHEMA =====
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  photo: { type: String, default: "/uploads/profile.jpg" }, // default profile photo
  lastSeen: { type: Date, default: null }
});

const User = mongoose.model("User", userSchema);

// ===== MESSAGE SCHEMA =====
const messageSchema = new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false }
});

const Message = mongoose.model("Message", messageSchema);

// ================= SIGNUP =================
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username.startsWith("+"))
      return res.status(400).json({ success: false, message: "Username must start with +" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Invalid credentials" });

    res.json({
      success: true,
      username: user.username,
      userId: user._id,
      photo: user.photo
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// ================= USER SEARCH =================
app.get("/users", async (req, res) => {
  try {
    const { search = "", exclude } = req.query;
    let query = {};

    if (search) query.username = { $regex: search, $options: "i" };
    if (exclude && mongoose.isValidObjectId(exclude)) query._id = { $ne: exclude };

    const users = await User.find(query).select("_id username photo");

    res.json(users);

  } catch (err) {
    console.log(err);
    res.status(500).json([]);
  }
});

// ================= GET CHAT MESSAGES =================
app.get("/messages", async (req, res) => {
  try {
    const { userId, chatWith } = req.query;

    const messages = await Message.find({
      $or: [
        { from: userId, to: chatWith },
        { from: chatWith, to: userId }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);

  } catch (err) {
    console.log(err);
    res.status(500).json([]);
  }
});

// ================= DELETE MESSAGE =================
app.delete("/delete-message/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// ================= MARK MESSAGE SEEN =================
app.post("/mark-seen", async (req, res) => {
  try {
    const { from, to } = req.body;

    await Message.updateMany(
      { from, to, seen: false },
      { seen: true }
    );

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// ================= PROFILE UPDATE =================

// multer upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "public/uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// change username
app.post("/change-username", async (req, res) => {
  const { userId, username } = req.body;
  await User.findByIdAndUpdate(userId, { username });
  res.json({ success: true });
});

// change email
app.post("/change-email", async (req, res) => {
  const { userId, email } = req.body;

  const exists = await User.findOne({ email, _id: { $ne: userId } }); // exclude current user
  if (exists) return res.status(400).json({ success: false });

  await User.findByIdAndUpdate(userId, { email });
  res.json({ success: true });
});

// change password
app.post("/change-password", async (req, res) => {
  const { userId, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(userId, { password: hashed });
  res.json({ success: true });
});

// upload photo
app.post("/upload-photo", upload.single("photo"), async (req, res) => {
  const { userId } = req.body;
  const filePath = "/uploads/" + req.file.filename;

  await User.findByIdAndUpdate(userId, { photo: filePath });

  res.json({ success: true, url: filePath });
});

// ================= SOCKET.IO =================
let onlineUsers = {};
let socketToUser = {};

io.on("connection", (socket) => {
  // register
  socket.on("register", (userId) => {
    onlineUsers[userId] = socket.id;
    socketToUser[socket.id] = userId;

    io.emit("online-users", Object.keys(onlineUsers));
  });

  // private message
  socket.on("private message", async ({ to, message }) => {
    const from = socketToUser[socket.id];
    if (!from) return;

    const msg = new Message({ from, to, message });
    await msg.save();

    const receiverSocket = onlineUsers[to];
    if (receiverSocket) {
      io.to(receiverSocket).emit("private message", {
        _id: msg._id,
        message,
        from,
        timestamp: msg.timestamp
      });
    }
  });

  // typing indicator
  socket.on("typing", (to) => {
    const receiverSocket = onlineUsers[to];
    if (receiverSocket) io.to(receiverSocket).emit("typing");
  });

  // disconnect
  socket.on("disconnect", async () => {
    const userId = socketToUser[socket.id];
    if (userId) {
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      delete onlineUsers[userId];
      io.emit("online-users", Object.keys(onlineUsers));
    }
    delete socketToUser[socket.id];
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
