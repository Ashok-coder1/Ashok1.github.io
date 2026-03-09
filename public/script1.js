const socket = io();
const userId = localStorage.getItem("userId");
const username = localStorage.getItem("username");

if (!userId) window.location.href = "index.html";

socket.emit("register", userId);
let currentChatUserId = null;

// ===== LOAD USERS =====
async function loadUsers(search = "") {
  const res = await fetch(`/users?search=${search}`);
  const users = await res.json();
  const userList = document.getElementById("userList");
  userList.innerHTML = "";

  users.forEach(user => {
    if (user._id === userId) return;

    const div = document.createElement("div");
    div.classList.add("user");
    const userPhoto = user.profilePhoto || "https://i.imgur.com/4Z7Z8.png";
    div.innerHTML = `<img src="${userPhoto}"><span>${user.username}</span>`;

    div.addEventListener("click", async () => {
      currentChatUserId = user._id;
      document.getElementById("messages").innerHTML = "";

      // Load past messages from DB
      const msgRes = await fetch(`/messages?userId=${userId}&chatWith=${currentChatUserId}`);
      const messages = await msgRes.json();
      messages.forEach(m => addMessage(m.message, m.from === userId ? "sent" : "received"));

      // Update chat header
      const chatHeader = document.getElementById("chatWith");
      chatHeader.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${userPhoto}" style="width:45px;height:45px;border-radius:50%;border:2px solid #2563eb;object-fit:cover;">
          <div>
            <p style="margin:0;font-weight:bold;color:white;">${user.username}</p>
            <p style="margin:0;font-size:12px;color:#10b981;">Online</p>
          </div>
        </div>
      `;
    });

    userList.appendChild(div);
  });
}

// ===== SEND MESSAGE =====
document.getElementById("sendBtn").addEventListener("click", async () => {
  const msgInput = document.getElementById("messageInput");
  const message = msgInput.value.trim();
  if (!message || !currentChatUserId) return;

  socket.emit("private message", { to: currentChatUserId, message });
  addMessage(message, "sent");
  msgInput.value = "";
});

// ===== RECEIVE MESSAGE =====
socket.off("private message");
socket.on("private message", ({ message, from }) => {
  if (from === currentChatUserId) addMessage(message, "received");
});

function addMessage(text, type) {
  const messagesContainer = document.getElementById("messages");
  const div = document.createElement("div");
  div.classList.add("message", type);
  div.innerText = text;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ===== SEARCH USERS =====
document.getElementById("searchUser").addEventListener("input", e => loadUsers(e.target.value));

// ===== PROFILE FUNCTIONS =====
document.getElementById("photoUpload").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("photo", file);
  formData.append("userId", userId);

  const res = await fetch("/upload-photo", { method: "POST", body: formData });
  const data = await res.json();
  if (data.success) {
    document.getElementById("profilePhoto").src = data.url;
    document.getElementById("profilePreview").src = data.url;
    alert("Profile photo updated!");
  }
});

document.getElementById("changeUsername").addEventListener("click", async () => {
  const newName = prompt("Enter new username:");
  if (!newName) return;
  await fetch("/change-username", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId, newUsername: newName }) });
  localStorage.setItem("username", newName);
  alert("Username updated!");
  location.reload();
});

document.getElementById("changeEmail").addEventListener("click", async () => {
  const newEmail = prompt("Enter new email:");
  if (!newEmail) return;
  await fetch("/change-email", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId, newEmail }) });
  alert("Email updated!");
});

document.getElementById("changePassword").addEventListener("click", async () => {
  const newPass = prompt("Enter new password:");
  if (!newPass) return;
  await fetch("/change-password", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId, newPassword: newPass }) });
  alert("Password updated!");
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// ===== INITIALIZE =====
loadUsers();
