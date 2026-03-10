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
const chatHeaderStatus = document.getElementById("chatStatus"); // Add this element in HTML for status
const messagesContainer = document.querySelector(".messages");
const inputBox = document.querySelector(".inputBox input");
const sendBtn = document.querySelector(".inputBox button");

// ===== ONLINE USERS =====
let onlineUsers = [];
let currentChatUserId = null;

// ===== UNREAD MESSAGES =====
let unreadMessages = {}; // { userId: count }

// ===== SOUND =====
const messageSound = new Audio("/sounds/message.mp3");

// ===== HELPER FUNCTIONS =====
function appendMessage(msg, seen = false) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(msg.from === userId ? "sent" : "received");

  const time = new Date(msg.timestamp);
  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");

  let tickHTML = "";
  if (msg.from === userId) {
    tickHTML = seen ? "✔✔" : "✔"; // single/double tick
  }

  div.innerHTML = `
    ${msg.message} <span class="time">${hours}:${minutes}</span> <span class="tick">${tickHTML}</span>
  `;

  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

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
        <span class="status">${isOnline ? "🟢 Online" : `⚫ Offline - last seen ${new Date(user.lastSeen).toLocaleString()}`}</span>
      </div>
      <span class="badge" id="badge-${user._id}">${unreadMessages[user._id] ? `+${unreadMessages[user._id]}` : ""}</span>
    `;

    div.addEventListener("click", async () => {
      currentChatUserId = user._id;
      chatHeaderName.textContent = user.username;
      chatHeaderPhoto.src = photo;
      chatHeaderStatus.textContent = isOnline ? "🟢 Online" : `⚫ Offline - last seen ${new Date(user.lastSeen).toLocaleString()}`;
      messagesContainer.innerHTML = "";

      // Reset unread badge
      unreadMessages[user._id] = 0;
      const badge = document.getElementById(`badge-${user._id}`);
      if (badge) badge.textContent = "";

      // Load messages
      const msgRes = await fetch(`/messages?userId=${userId}&chatWith=${user._id}`);
      const messages = await msgRes.json();
      messages.forEach(m => appendMessage(m, m.seen));

      // Mark messages as seen
      await fetch("/mark-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: user._id, to: userId })
      });

      // Emit messageSeen event for real-time double tick
      socket.emit("messageSeen", { from: user._id, to: userId });
    });

    userList.appendChild(div);
  });
}

// ===== URL PARAMS: OPEN CHAT DIRECTLY =====
const params = new URLSearchParams(window.location.search);
const receiverId = params.get("user");
const receiverName = params.get("name");

if (receiverId) {
  currentChatUserId = receiverId;
  chatHeaderName.textContent = receiverName || "+User";

  // Fetch user info for photo & status
  fetch(`/user?id=${receiverId}`)
    .then(res => res.json())
    .then(user => {
      chatHeaderPhoto.src = user.photo || "uploads/profile.jpg";
      chatHeaderStatus.textContent = onlineUsers.includes(user._id)
        ? "🟢 Online"
        : `⚫ Offline - last seen ${new Date(user.lastSeen).toLocaleString()}`;
    });

  // Load existing messages
  fetch(`/messages?userId=${userId}&chatWith=${receiverId}`)
    .then(res => res.json())
    .then(messages => messages.forEach(m => appendMessage(m, m.seen)));

  // Mark as seen
  fetch("/mark-seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: receiverId, to: userId })
  });

  // Emit messageSeen event
  socket.emit("messageSeen", { from: receiverId, to: userId });
}

// ===== SEND MESSAGE =====
sendBtn.addEventListener("click", sendMessage);
inputBox.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const msg = inputBox.value.trim();
  if (!msg || !currentChatUserId) return;

  socket.emit("send-message", { to: currentChatUserId, message: msg });
  appendMessage({ from: userId, message: msg, timestamp: new Date() }); // single tick by default
  inputBox.value = "";
}

// ===== RECEIVE MESSAGE =====
socket.on("private message", (msg) => {
  if (currentChatUserId === msg.from) {
    appendMessage(msg, msg.seen);
    messageSound.play();

    // Emit messageSeen event (server handles double tick)
    socket.emit("messageSeen", { from: msg.from, to: userId });
  } else {
    // Increment unread
    unreadMessages[msg.from] = (unreadMessages[msg.from] || 0) + 1;
    const badge = document.getElementById(`badge-${msg.from}`);
    if (badge) badge.textContent = `+${unreadMessages[msg.from]}`;

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

// ===== MESSAGE SEEN UPDATE =====
socket.on("messageSeen", ({ from }) => {
  if (currentChatUserId === from) {
    // Update last sent message tick to double
    const msgs = messagesContainer.querySelectorAll(".sent .tick");
    if (msgs.length) msgs[msgs.length - 1].textContent = "✔✔";
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
