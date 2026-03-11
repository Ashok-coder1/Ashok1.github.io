// -------------------------------
// 0️⃣ Initialization
// -------------------------------
if (typeof unreadMessages === "undefined") {
    var unreadMessages = {}; 
}

// -------------------------------
// 1️⃣ Helpers: Time & Activity
// -------------------------------
function getLastActivity(user) {
    const lastMsg = user.lastMessageTime ? new Date(user.lastMessageTime) : new Date(0);
    const lastOn = user.lastSeen ? new Date(user.lastSeen) : new Date(0);
    return Math.max(lastMsg, lastOn);
}

function getLastSeen(user) {
    const isOnline = (typeof onlineUsers !== "undefined" && onlineUsers.includes(user._id));
    if (isOnline) return "Online";
    
    const lastSeenDate = user.lastSeen;
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
// 2️⃣ Sorting Logic
// -------------------------------
function sortByPriority(users) {
    return [...users].sort((a, b) => {
        const aOnline = (typeof onlineUsers !== "undefined" && onlineUsers.includes(a._id));
        const bOnline = (typeof onlineUsers !== "undefined" && onlineUsers.includes(b._id));

        if (aOnline !== bOnline) {
            return aOnline ? -1 : 1;
        }
        return getLastActivity(b) - getLastActivity(a);
    });
}

// -------------------------------
// 3️⃣ Render Logic
// -------------------------------
function renderUserList(users) {
    const list = document.getElementById("userList");
    if (!list) return;
    list.innerHTML = "";

    users.forEach(u => {
        const isOnline = (typeof onlineUsers !== "undefined" && onlineUsers.includes(u._id));
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
            unreadMessages[u._id] = 0;
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
// 5️⃣ Real-time Socket Events
// -------------------------------
if (typeof socket !== "undefined") {
    // Initial request for unread counts from DB
    socket.emit("getUnreadCount", userId);

    socket.on("online-users", (u) => {
        onlineUsers = u;
        fetchAndRefreshUsers();
    });

    // Handle incoming messages to update badges LIVE
    socket.on("private message", (data) => {
        const fromUser = data.from;
        if (!unreadMessages[fromUser]) unreadMessages[fromUser] = 0;
        unreadMessages[fromUser]++;

        const badge = document.getElementById(`badge-${fromUser}`);
        if (badge) {
            badge.innerText = unreadMessages[fromUser];
            badge.style.display = "inline-block";
        } else {
            // If the user isn't in view, refresh the list (handles sorting too)
            fetchAndRefreshUsers();
        }
    });

    // Handle the bulk unread count from server on page load
    socket.on("unreadCount", (data) => {
        unreadMessages = {}; 
        if (Array.isArray(data)) {
            data.forEach(item => {
                unreadMessages[item._id] = item.count;
            });
        }
        fetchAndRefreshUsers();
    });

    socket.on("userStatusChanged", fetchAndRefreshUsers);
    socket.on("newUser", fetchAndRefreshUsers);
}

// Refresh UI every 30 seconds for "Last Seen" updates
setInterval(fetchAndRefreshUsers, 30000);

// Initial Load
fetchAndRefreshUsers();
