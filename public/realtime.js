// 1. Get userId with a fallback to empty string
const userId = localStorage.getItem("userId") || ""; 

let unreadMessages = {};
let onlineUsers = []; // Initialized as array to prevent .includes() errors

// 2. Helpers: Time & Activity
function getLastActivity(user) {
  const lastMsg = user.lastMessageTime ? new Date(user.lastMessageTime) : new Date(0);
  const lastSeen = user.lastSeen ? new Date(user.lastSeen) : new Date(0);
  return Math.max(lastMsg, lastSeen);
}

function getLastSeen(user) {
  const isOnline = onlineUsers?.includes(user._id.toString());
  if (isOnline) return "Online";
  
  const lastSeenDate = user.lastSeen || user.lastMessageTime;
  if (!lastSeenDate) return "";

  const lastSeen = new Date(lastSeenDate);
  const now = new Date();
  const diffMin = Math.floor((now - lastSeen) / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? "s" : ""} ago`;

  return lastSeen.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// 3. Sorting Logic
function sortByPriority(users) {
  return [...users].sort((a, b) => {
    const aOnline = a.online || (onlineUsers?.includes(a._id.toString()));
const bOnline = b.online || (onlineUsers?.includes(b._id.toString()));
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    return getLastActivity(b) - getLastActivity(a);
  });
}

// 4. Render Logic (UI)
function renderUserList(users) {
  const list = document.getElementById("userList");
  if (!list) return;
  list.innerHTML = "";

  users.forEach(u => {
    const isOnline = onlineUsers?.includes(u._id.toString());
    const count = unreadMessages[u._id] || 0;
    
    const div = document.createElement("div");
    div.className = "user";
    div.id = `user-${u._id}`;
    div.innerHTML = `
      <img src="uploads/profile.webp" class="user-photo">
      <div class="user-info">
        <span class="username">${u.username.startsWith("+") ? u.username : "+" + u.username}</span>
        <span class="status ${isOnline ? "online" : "offline"}">
          ${isOnline ? "🟢 Online" : "⚫ Offline"}
        </span>
        <span class="last-seen">${!isOnline ? "Last seen: " + getLastSeen(u) : ""}</span>
      </div>
      <span class="badge" id="badge-${u._id}" style="${count > 0 ? "display:inline-block" : "display:none"}">
        ${count}
      </span>
    `;

    div.addEventListener("click", () => {
      // Clear badge in DB immediately
      if (userId) socket.emit("messageSeen", { from: u._id, to: userId });
      unreadMessages[u._id] = 0; 
      window.location.href = `chat.html?user=${u._id}&name=${u.username}`;
    });
    list.appendChild(div);
  });
}

async function fetchAndRefreshUsers() {
  try {
    const res = await fetch(`/users`);
    const data = await res.json();
    console.log("Fetched users:", data); // Check what comes back

    let users = [];
    if (Array.isArray(data)) users = data;
    else if (data.users) users = data.users;

    renderUserList(users);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
fetchAndRefreshUsers();

