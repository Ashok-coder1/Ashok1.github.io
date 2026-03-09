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

// ================= LOAD RECEIVER INFO =================
async function loadReceiverInfo() {
  try {
    const res = await fetch(`/user-info?id=${receiverId}`);
    const data = await res.json();

    // Ensure a valid photo
    const photoUrl = data.photo && data.photo.trim() !== "" ? data.photo : "uploads/profile.jpg";

    chatPhotoEl.src = photoUrl;

    // Force size and circular shape
    chatPhotoEl.style.width = "32px";
    chatPhotoEl.style.height = "32px";
    chatPhotoEl.style.borderRadius = "50%";
    chatPhotoEl.style.objectFit = "cover";

    statusEl.innerText = data.online ? "🟢 Online" : "⚫ Offline";
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
      addMessage(m.message, m.from === userId ? "sent" : "received", m.timestamp)
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
  }
});

// ================= ADD MESSAGE UI =================
function addMessage(text, type, time) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.classList.add("message", type);

  const timeStr = new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  div.innerHTML = `<p>${text}</p><span class="time">${timeStr}</span>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}