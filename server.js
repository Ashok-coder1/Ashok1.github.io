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
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

mongoose.connect("mongodb+srv://ashokpokhrel25_db_user:dDwjmkdD4zfzYN0M@cluster1.ydjxy7x.mongodb.net/chatApp")
.then(() => console.log("MongoDB connected"));

const userSchema = new mongoose.Schema({
  username: String, email: String, password: String,
  photo: { type: String, default: "/uploads/profile.jpg" },
  lastSeen: { type: Date, default: null }
});
const User = mongoose.model("User", userSchema);

const messageSchema = new mongoose.Schema({
  from: String, to: String, message: String,
  timestamp: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false }
});
const Message = mongoose.model("Message", messageSchema);

// AUTH ROUTES (Unchanged)
app.post("/signup", async (req, res) => {
  let { username, email, password } = req.body;
  if (!username.startsWith("+")) return res.status(400).json({ success: false });
  username = username.slice(1);
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  await user.save();
  res.json({ success: true });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ success: false });
  res.json({ success: true, username: "+" + user.username, userId: user._id, photo: user.photo });
});

app.get("/users", async (req, res) => {
  const { search = "", exclude } = req.query;
  let query = {};
  if (search) query.username = { $regex: search, $options: "i" };
  if (exclude) query._id = { $ne: exclude };
  const users = await User.find(query).select("_id username photo lastSeen");
  res.json(users);
});

app.get("/user", async (req, res) => {
  const user = await User.findById(req.query.id).select("_id username photo lastSeen");
  res.json(user);
});

app.get("/messages", async (req, res) => {
  const { userId, chatWith } = req.query;
  const messages = await Message.find({
    $or: [{ from: userId, to: chatWith }, { from: chatWith, to: userId }]
  }).sort({ timestamp: 1 });
  res.json(messages);
});

// SOCKET LOGIC
let onlineUsers = {}; 
let socketToUser = {};

io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    onlineUsers[userId] = socket.id;
    socketToUser[socket.id] = userId;
    io.emit("online-users", Object.keys(onlineUsers));
  });

  socket.on("send-message", async ({ to, message }) => {
    const from = socketToUser[socket.id];
    if (!from) return;
    const msg = new Message({ from, to, message });
    await msg.save();
    if (onlineUsers[to]) {
      const sender = await User.findById(from);
      io.to(onlineUsers[to]).emit("private message", {
        message: msg.message, from, fromName: "+" + sender.username, timestamp: msg.timestamp
      });
    }
  });

  socket.on("messageSeen", async ({ from, to }) => {
    await Message.updateMany({ from, to, seen: false }, { seen: true });
    if (onlineUsers[from]) io.to(onlineUsers[from]).emit("messageSeen", { from: to });
  });

  socket.on("disconnect", () => {
    const userId = socketToUser[socket.id];
    if (userId) {
      delete onlineUsers[userId];
      io.emit("online-users", Object.keys(onlineUsers));
    }
    delete socketToUser[socket.id];
  });
});

server.listen(3000, () => console.log("Server running"));
