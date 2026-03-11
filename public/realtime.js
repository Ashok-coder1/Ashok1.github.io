
let unreadMessages = {};

// -------------------------------
// 1️⃣ Helpers: Time & Activity
// -------------------------------
function getLastActivity(user) {
  const lastMsg = user.lastMessageTime ? new Date(user.lastMessageTime) : new Date(0);
  const lastOn = user.lastOnlineTime ? new Date(user.lastOnlineTime) : new Date(0);
  return Math.max(lastMsg, lastOn);
}

function getLastSeen(user) {
  if (user.online || (typeof onlineUsers !== "undefined" && onlineUsers.includes(user._id))) return "Online";
  
  const lastSeenDate = user.lastSeen || user.lastOnlineTime;
  if (!lastSeenDate) return "";

  const lastSeen = new Date(lastSeenDate);
  const now = new Date();
  const diffMs = now - lastSeen;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? "s" : ""} ago`;

  return lastSeen.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// -------------------------------
// 2️⃣ Sorting Logic (The Fix)
// -------------------------------
function sortByPriority(users) {
  return [...users].sort((a, b) => {
    const aOnline = a.online || (typeof onlineUsers !== "undefined" && onlineUsers.includes(a._id));
    const bOnline = b.online || (typeof onlineUsers !== "undefined" && onlineUsers.includes(b._id));

    // Priority 1: Online users at the top
    if (aOnline !== bOnline) {
      return aOnline ? -1 : 1;
    }

    // Priority 2: Most recent activity (messages/online)
    return getLastActivity(b) - getLastActivity(a);
  });
}

// -------------------------------
// 3️⃣ Render Logic (Matching Dashboard CSS)
// -------------------------------
function renderUserList(users) {
  const list = document.getElementById("userList");
  if (!list) return;
  list.innerHTML = "";

  users.forEach(u => {
    const isOnline = u.online || (typeof onlineUsers !== "undefined" && onlineUsers.includes(u._id));
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
      <span class="badge" id="badge-${u._id}" style="${unreadMessages[u._id] > 0 ? "display:inline-block" : "display:none"}">
        ${unreadMessages[u._id] || ""}
      </span>
    `;

    div.addEventListener("click", () => {
      if (typeof unreadMessages !== "undefined") unreadMessages[u._id] = 0;
      window.location.href = `chat.html?user=${u._id}&name=${u.username}`;
    });

    list.appendChild(div);
  });
}

// -------------------------------
// 4️⃣ Data Fetching
// -------------------------------
async function fetchAndRefreshUsers() {
  const search = document.getElementById("searchUser")?.value || "";
  try {
    const res = await fetch(`/users?search=${search}&exclude=${userId}`);
    const data = await res.json();
    const sorted = sortByPriority(data);
    renderUserList(sorted);
  } catch (err) {
    console.error("Error fetching users:", err);
  }
}

// -------------------------------
// 5️⃣ Event Listeners & Intervals
// -------------------------------
if (typeof socket !== "undefined") {
  socket.on("online-users", (u) => {
    onlineUsers = u;
    fetchAndRefreshUsers();
  });
  socket.on("userStatusChanged", fetchAndRefreshUsers);
  socket.on("newUser", fetchAndRefreshUsers);
}


// Update UI every 30 seconds to refresh "minutes ago" text
setInterval(fetchAndRefreshUsers, 30000);

// Initial Load
fetchAndRefreshUsers();

// Ask for counts when dashboard opens
socket.emit("getUnreadCount", userId);

// When server sends the count, refresh the list to show the badges
socket.on("unreadCount", (data) => {

  unreadMessages = {};

  data.forEach(item => {
    unreadMessages[item._id] = item.count;
  });

  fetchAndRefreshUsers();

});
