const socket = io();

// ===== USER INFO =====
const userId = localStorage.getItem("userId");
let username = localStorage.getItem("username");

if (!userId) window.location.href = "index.html";

// ===== ELEMENTS =====
const userList = document.getElementById("userList");
const searchInput = document.getElementById("searchUser");
const chatHeaderName = document.getElementById("chatName");
const chatHeaderPhoto = document.getElementById("chatPhoto");
const messagesContainer = document.querySelector(".messages");
const inputBox = document.querySelector(".inputBox input");
const sendBtn = document.querySelector(".inputBox button");

// ===== ONLINE USERS =====
let onlineUsers = [];
let currentChatUserId = null;

// ===== SOUND =====
const messageSound = new Audio("/sounds/message.mp3");

// ===== LOAD USERS =====
async function loadUsers(search = "") {
  const res = await fetch(`/users?search=${search}&exclude=${userId}`);
  const users = await res.json();

  userList.innerHTML = "";

  users.forEach(user => {
    const div = document.createElement("div");
    div.classList.add("user");

    const photo = user.photo || "uploads/profile.jpg";
    const isOnline = onlineUsers.includes(user._id);

    div.innerHTML = `
      <img src="${photo}" class="user-photo">
      <div class="user-info">
        <span class="username">${user.username}</span>
        <span class="status">${isOnline ? "🟢 Online" : "⚫ Offline"}</span>
      </div>
      <span class="badge" id="badge-${user._id}"></span>
    `;

    div.addEventListener("click", async () => {
      currentChatUserId = user._id;
      chatHeaderName.textContent = user.username;
      chatHeaderPhoto.src = photo;
      messagesContainer.innerHTML = "";

      // Reset unread badge
      const badge = document.getElementById(`badge-${user._id}`);
      if (badge) badge.textContent = "";

      // Load messages
      const msgRes = await fetch(`/messages?userId=${userId}&chatWith=${user._id}`);
      const messages = await msgRes.json();
      messages.forEach(m => appendMessage(m));

      // Mark messages as seen
      await fetch("/mark-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: user._id, to: userId })
      });
    });

    userList.appendChild(div);
  });
}

// ===== APPEND MESSAGE =====
function appendMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(msg.from === userId ? "sent" : "received");

  const time = new Date(msg.timestamp);
  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");

  div.innerHTML = `
    ${msg.message} <span class="time">${hours}:${minutes}</span>
  `;

  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ===== SEND MESSAGE =====
sendBtn.addEventListener("click", sendMessage);
inputBox.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const msg = inputBox.value.trim();
  if (!msg || !currentChatUserId) return;

  socket.emit("private message", { to: currentChatUserId, message: msg });
  appendMessage({ from: userId, message: msg, timestamp: new Date() });
  inputBox.value = "";
}

// ===== RECEIVE MESSAGE =====
socket.on("private message", (msg) => {
  // If current chat user is same, append directly
  if (currentChatUserId === msg.from) {
    appendMessage(msg);
    messageSound.play();
  } else {
    // Show badge for unread messages
    const badge = document.getElementById(`badge-${msg.from}`);
    if (badge) {
      badge.textContent = badge.textContent ? +badge.textContent + 1 : 1;
    }

    // Notification
    if (Notification.permission === "granted") {
      new Notification("New Message", {
        body: msg.message,
        icon: "/uploads/profile.jpg"
      });
    }

    messageSound.play();
  }
});

// ===== ONLINE USERS UPDATE =====
socket.on("online-users", (users) => {
  onlineUsers = users;
  loadUsers(searchInput.value);
});

// ===== SEARCH =====
searchInput.addEventListener("input", (e) => loadUsers(e.target.value));

// ===== REQUEST NOTIFICATIONS =====
if (Notification.permission !== "granted") Notification.requestPermission();

// ===== INITIAL LOAD =====
loadUsers();
