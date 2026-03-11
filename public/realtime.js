const userId = localStorage.getItem("userId") || "";

async function fetchAndRefreshUsers() {
  const search = document.getElementById("searchUser")?.value || "";
  try {
    const res = await fetch(`/users?search=${search}&exclude=${userId}`);
    const users = await res.json();
    renderUserList(users);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

function renderUserList(users) {
  const list = document.getElementById("userList");
  if (!list) return;
  list.innerHTML = "";

  // Sort online first
  users.sort((a, b) => {
    const aOn = onlineUsers.includes(a._id);
    const bOn = onlineUsers.includes(b._id);
    return (aOn === bOn) ? 0 : aOn ? -1 : 1;
  });

  users.forEach(u => {
    const isOnline = onlineUsers.includes(u._id);
    const count = unreadMessages[u._id] || 0;

    const div = document.createElement("div");
    div.className = "user";
    div.innerHTML = `
      <img src="uploads/profile.webp" class="user-photo">
      <div class="user-info">
        <span class="username">${u.username}</span>
        <span class="status">${isOnline ? "🟢 Online" : "⚫ Offline"}</span>
      </div>
      <span class="badge" style="display:${count > 0 ? 'block' : 'none'}">${count}</span>
    `;
    div.onclick = () => {
      window.location.href = `chat.html?user=${u._id}&name=${u.username}`;
    };
    list.appendChild(div);
  });
}

setInterval(fetchAndRefreshUsers, 10000);
fetchAndRefreshUsers();
