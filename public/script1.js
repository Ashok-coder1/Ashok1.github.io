const socket = io();

const userId = localStorage.getItem("userId");
let username = localStorage.getItem("username");
if(!userId) window.location.href="index.html";

socket.emit("register",userId);
let onlineUsers = [];
let unreadMessages = {}; // {userId:count}

// ===== ELEMENTS =====
const userList = document.getElementById("userList");
const searchInput = document.getElementById("searchUser");
const profilePhoto = document.getElementById("profilePhoto");
const usernameDisplay = document.getElementById("usernameDisplay");

// ===== LOAD USERS =====
async function loadUsers(search=""){
  const res = await fetch(`/users?search=${search}&exclude=${userId}`);
  const users = await res.json();

  userList.innerHTML="";

  users.forEach(user=>{
    const div = document.createElement("div");
    div.classList.add("user");

    const isOnline = onlineUsers.includes(user._id);
    const photo = user.photo || "uploads/profile.jpg";

    div.innerHTML = `
      <img src="${photo}" class="user-photo">
      <div class="user-info">
        <span class="username">+${user.username}</span>
        <span class="status">${isOnline?"🟢 Online":`⚫ Offline - last seen ${user.lastSeen?new Date(user.lastSeen).toLocaleString():"N/A"}`}</span>
      </div>
      <span class="badge" id="badge-${user._id}">${unreadMessages[user._id]?`+${unreadMessages[user._id]}`:""}</span>
    `;

    div.addEventListener("click",()=>{
      window.location.href=`chat.html?user=${user._id}&name=+${user.username}`;
    });

    userList.appendChild(div);
  });
}

// ===== ONLINE USERS UPDATE =====
socket.on("online-users",users=>{
  onlineUsers = users;
  loadUsers(searchInput.value);
});

// ===== SEARCH =====
searchInput.addEventListener("input",e=>{
  loadUsers(e.target.value);
});

// ===== PROFILE DISPLAY =====
profilePhoto.src = "uploads/profile.jpg"; // update if backend has user photo
usernameDisplay.textContent = username;

// ===== LOGOUT =====
document.getElementById("logoutBtn").addEventListener("click",()=>{
  localStorage.clear();
  window.location.href="index.html";
});

// ===== NOTIFICATIONS =====
if(Notification.permission!=="granted") Notification.requestPermission();

// ===== INITIAL LOAD =====
loadUsers();
