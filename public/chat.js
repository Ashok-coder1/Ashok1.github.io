// ================= SOCKET INIT =================
const socket = io();

// ================= USER INFO =================
const userId = localStorage.getItem("userId");
if (!userId) window.location.href = "index.html";

socket.emit("register", userId);

// ================= GET RECEIVER INFO FROM URL =================
const params = new URLSearchParams(window.location.search);
const receiverId = params.get("user");
const receiverName = params.get("name");

const chatNameEl = document.getElementById("chatName");
const chatPhotoEl = document.getElementById("chatPhoto");
const statusEl = document.getElementById("status");

chatNameEl.innerText = receiverName;

// ================= MESSAGE SOUND =================
const messageSound = new Audio("/sounds/message.mp3");

// ================= LOAD RECEIVER INFO =================
async function loadReceiverInfo() {
  try {
    const res = await fetch(`/user-info?id=${receiverId}`);
    const data = await res.json();

    const photoUrl = data.photo && data.photo.trim() !== "" ? data.photo : "uploads/profile.jpg";
    chatPhotoEl.src = photoUrl;

    chatPhotoEl.style.width = "32px";
    chatPhotoEl.style.height = "32px";
    chatPhotoEl.style.borderRadius = "50%";
    chatPhotoEl.style.objectFit = "cover";

    // Online status dot
    statusEl.innerHTML = data.online
      ? '<span style="color:green">●</span> Online'
      : '<span style="color:gray">●</span> Offline';
  } catch (err) {
    console.error("Failed to load receiver info:", err);
    chatPhotoEl.src = "uploads/profile.jpg";
  }
}
loadReceiverInfo();

// ================= BACK BUTTON =================
document.getElementById("backBtn").onclick = () => {
  window.location.href = "dashboard.html";
};

// ================= LOAD MESSAGES =================
async function loadMessages() {
  try {
    const res = await fetch(`/messages?userId=${userId}&chatWith=${receiverId}`);
    const messages = await res.json();
    messages.forEach(m =>
      addMessage(
        m.message,
        m.from === userId ? "sent" : "received",
        m.timestamp,
        m.seen && m.from === userId // show tick for sent messages if seen
      )
    );
  } catch (err) {
    console.error("Failed to load messages:", err);
  }
}
loadMessages();

// ================= SEND MESSAGE =================
function sendMessage() {
  const input = document.getElementById("messageInput");
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit("private message", { to: receiverId, message: msg });
  addMessage(msg, "sent", new Date());
  input.value = "";
}

document.getElementById("sendBtn").onclick = sendMessage;

// Send on Enter key
document.getElementById("messageInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ================= RECEIVE MESSAGE =================
socket.on("private message", ({ message, from, timestamp }) => {
  if (from === receiverId) {
    addMessage(message, "received", timestamp || new Date());
    messageSound.play(); // Play sound

    // ===== Push Notification =====
    if (Notification.permission === "granted") {
      new Notification(receiverName, {
        body: message,
        icon: chatPhotoEl.src
      });
    }

    // Mark messages as seen
    markMessagesSeen();
  }
});

// ================= ADD MESSAGE UI =================
function addMessage(text, type, time, seen = false) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.classList.add("message", type);

  const timeStr = new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  let tick = "";
  if (type === "sent") {
    tick = seen
      ? '<span class="tick">✔✔</span>'   // seen
      : '<span class="tick">✔</span>';   // delivered
  }

  div.innerHTML = `<p>${text} ${tick}</p><span class="time">${timeStr}</span>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// ================= MARK MESSAGES AS SEEN =================
async function markMessagesSeen() {
  try {
    await fetch("/mark-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: receiverId, to: userId })
    });

    // Update ticks for sent messages
    const messages = document.querySelectorAll(".message.sent .tick");
    messages.forEach(t => t.innerText = "✔✔");
  } catch (err) {
    console.error("Failed to mark messages as seen:", err);
  }
}

// Request notification permission if not granted
if (Notification.permission !== "granted") {
  Notification.requestPermission();
}
