const socket = io();

const userId = localStorage.getItem("userId");
const username = localStorage.getItem("username");

// If not logged in, redirect to login page
if (!userId) window.location.href = "index.html";

// Register user with the server
socket.emit("register", userId);

// ================= ONLINE USERS =================
let onlineUsers = [];

// Get the other user's ID from URL (chat target)
const params = new URLSearchParams(window.location.search);
const otherUserId = params.get("user");
const otherUsername = params.get("name");

// ================= DOM ELEMENTS =================
const chatHeaderName = document.getElementById("chatUserName");
const chatHeaderStatus = document.getElementById("chatUserStatus");
const messagesContainer = document.getElementById("messages");
const inputBox = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// ================= SET CHAT HEADER =================
if (chatHeaderName) chatHeaderName.textContent = otherUsername || "User";
if (chatHeaderStatus) chatHeaderStatus.textContent = "⚫ Offline";

// ================= LOAD ONLINE STATUS =================
socket.on("online-users", (users) => {
  onlineUsers = users;

  if (chatHeaderStatus) {
    if (onlineUsers.includes(otherUserId)) {
      chatHeaderStatus.textContent = "🟢 Online";
    } else {
      chatHeaderStatus.textContent = "⚫ Offline";
    }
  }

  // Optionally, refresh user list badge if you implement it
});

// ================= SEND MESSAGE =================
if (sendBtn && inputBox) {
  sendBtn.addEventListener("click", () => {
    const message = inputBox.value.trim();
    if (!message) return;

    socket.emit("send-message", {
      from: userId,
      to: otherUserId,
      message,
    });

    // Append message locally
    appendMessage(message, "sent");
    inputBox.value = "";
  });
}

// ================= RECEIVE MESSAGE =================
socket.on("receive-message", (data) => {
  if (data.from === otherUserId) {
    appendMessage(data.message, "received");
  }
});

// ================= APPEND MESSAGE =================
function appendMessage(msg, type) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", type);
  msgDiv.textContent = msg;

  const timeSpan = document.createElement("span");
  timeSpan.classList.add("time");
  timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msgDiv.appendChild(timeSpan);
  messagesContainer.appendChild(msgDiv);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ================= LOGOUT =================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

// ================= NOTIFICATIONS =================
if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

// ================= OPTIONAL: Enter key to send =================
if (inputBox) {
  inputBox.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
}
