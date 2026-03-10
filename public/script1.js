const socket = io();

const userId = localStorage.getItem("userId");
let username = localStorage.getItem("username"); // use let to allow update

if (!userId) window.location.href = "index.html";

socket.emit("register", userId);

let onlineUsers = [];

// ================= HELPER FUNCTION =================
function formatUsername(name) {
  return name.startsWith("+") ? name : "+" + name;
}

// ================= LOAD USERS =================
async function loadUsers(search = "") {
  const res = await fetch(`/users?search=${search}&exclude=${userId}`);
  const users = await res.json();

  const userList = document.getElementById("userList");
  userList.innerHTML = "";

  users.forEach(user => {
    const div = document.createElement("div");
    div.classList.add("user");

    const photo = user.photo || "uploads/profile.jpg";
    const isOnline = onlineUsers.includes(user._id);

    div.innerHTML = `
      <img src="${photo}" class="user-photo">
      <div class="user-info">
        <span class="username">${formatUsername(user.username)}</span>
        <span class="status">${isOnline ? "🟢 Online" : "⚫ Offline"}</span>
      </div>
      <span class="badge" id="badge-${user._id}"></span>
    `;

    div.addEventListener("click", () => {
      window.location.href = `chat.html?user=${user._id}&name=${formatUsername(user.username)}`;
    });

    userList.appendChild(div);
  });
}

// ================= ONLINE USERS =================
socket.on("online-users", (users) => {
  onlineUsers = users;
  loadUsers(document.getElementById("searchUser").value);
});

// ================= SEARCH USERS =================
document.getElementById("searchUser").addEventListener("input",(e)=>{
  loadUsers(e.target.value);
});

// ================= PROFILE PHOTO =================
document.getElementById("photoUpload").addEventListener("change",async(e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const formData = new FormData();
  formData.append("photo",file);
  formData.append("userId",userId);

  const res = await fetch("/upload-photo",{method:"POST",body:formData});
  const data = await res.json();

  if(data.success){
    document.getElementById("profilePhoto").src = data.url + "?t=" + new Date().getTime();
    document.getElementById("profilePreview").src = data.url + "?t=" + new Date().getTime();
    alert("Profile photo updated!");
  }
});

// ================= CHANGE USERNAME =================
document.getElementById("changeUsername").addEventListener("click",async()=>{
  const newName = prompt("Enter new username:");
  if(!newName) return;

  // Strip leading '+' before sending to backend
  const cleanName = newName.startsWith("+") ? newName.slice(1) : newName;

  await fetch("/change-username",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({userId,username: cleanName})
  });

  username = formatUsername(cleanName);
  localStorage.setItem("username", username);
  alert("Username updated");
  location.reload();
});

// ================= CHANGE EMAIL =================
document.getElementById("changeEmail").addEventListener("click",async()=>{
  const newEmail = prompt("Enter new email:");
  if(!newEmail) return;

  await fetch("/change-email",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({userId,email:newEmail})
  });

  alert("Email updated");
});

// ================= CHANGE PASSWORD =================
document.getElementById("changePassword").addEventListener("click",async()=>{
  const newPass = prompt("Enter new password");
  if(!newPass) return;

  await fetch("/change-password",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({userId,password:newPass})
  });

  alert("Password updated");
});

// ================= LOGOUT =================
document.getElementById("logoutBtn").addEventListener("click",()=>{
  localStorage.clear();
  window.location.href="index.html";
});

// ================= NOTIFICATIONS =================
if(Notification.permission!=="granted"){
  Notification.requestPermission();
}

// ================= INIT =================
loadUsers();
