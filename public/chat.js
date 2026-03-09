const socket = io();

const userId = localStorage.getItem("userId");
let username = localStorage.getItem("username") || "User";

// If user not logged in, redirect to login
if (!userId) window.location.href = "index.html";

// Get target user info from URL
const params = new URLSearchParams(window.location.search);
const otherUserId = params.get("user");
const otherUsername = params.get("name");

// DOM elements
const chatHeaderName = document.getElementById("chatUserName");
const chatHeaderStatus = document.getElementById("chatUserStatus");
const chatUserPhoto = document.getElementById("chatUserPhoto");
const backBtn = document.getElementById("backBtn");
const messagesContainer = document.getElementById("messages");
const inputBox = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// Show target username and default status
if (chatHeaderName) chatHeaderName.textContent = otherUsername || "User";
if (chatHeaderStatus) chatHeaderStatus.textContent = "⚫ Offline";

// Back button to dashboard
backBtn.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

// Connect user to server
socket.emit("register", userId);

// Track online users
let onlineUsers = [];

// Track unread messages
let unreadMessages = {};

// ================= ONLINE STATUS =================
socket.on("online-users", (users) => {
  onlineUsers = users;

  if (chatHeaderStatus) {
    if (onlineUsers.includes(otherUserId)) {
      chatHeaderStatus.textContent = "🟢 Online";
    } else {
      chatHeaderStatus.textContent = "⚫ Offline";
    }
  }
});

// ================= SEND MESSAGE =================
sendBtn.addEventListener("click", sendMessage);
inputBox.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const message = inputBox.value.trim();
  if (!message) return;

  // Send to server
  socket.emit("send-message", {
    from: userId,
    to: otherUserId,
    message,
    fromUsername: username
  });

  // Append locally
  appendMessage(message, "sent");
  inputBox.value = "";
}

// ================= RECEIVE MESSAGE =================
socket.on("receive-message", (data) => {
  if (data.from === otherUserId) {
    appendMessage(data.message, "received");
  } else {
    // Increment unread count
    unreadMessages[data.from] = (unreadMessages[data.from] || 0) + 1;
    const badge = document.getElementById(`badge-${data.from}`);
    if (badge) badge.textContent = `+${unreadMessages[data.from]}`;

    // Notification
    if (Notification.permission === "granted") {
      new Notification(data.fromUsername, { body: data.message });
    }

    // Sound
    const audio = new Audio("/notification.mp3");
    audio.play();
  }
});

// ================= APPEND MESSAGE =================
function appendMessage(msg, type) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", type);

  const textSpan = document.createElement("span");
  textSpan.classList.add("message-text");
  textSpan.textContent = msg;

  const timeSpan = document.createElement("span");
  timeSpan.classList.add("time");
  timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Add space between text and time
  msgDiv.appendChild(textSpan);
  msgDiv.appendChild(document.createTextNode("  "));
  msgDiv.appendChild(timeSpan);

  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ================= NOTIFICATIONS =================
if (Notification.permission !== "granted") {
  Notification.requestPermission();
}
