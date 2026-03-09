const socket = io();

const userId = localStorage.getItem("userId");
const username = localStorage.getItem("username");

let currentChatUserId = null;

if (!userId) window.location.href = "index.html";

// ----- REGISTER USER SOCKET -----
socket.emit("register", userId);

/* ===== LOGOUT ===== */
document.getElementById("logoutBtn").onclick = () => {
    localStorage.clear();
    window.location.href = "index.html";
};

/* ===== LOAD USERS & SEARCH ===== */
const userListDiv = document.getElementById("userList");
const searchInput = document.getElementById("searchUser");

async function loadUsers(search = "") {
    try {
        const res = await fetch(`/users?search=${search}&exclude=${userId}`);
        const users = await res.json();

        userListDiv.innerHTML = "";

        users.forEach(u => {
            const div = document.createElement("div");
            div.classList.add("user");

            // Create image element for profile photo
            const img = document.createElement("img");
            img.classList.add("user-photo");
            img.src = u.photo || "default-avatar.png"; // fallback avatar if no photo
            img.alt = u.username;

            const span = document.createElement("span");
            span.textContent = u.username;

            div.appendChild(img);
            div.appendChild(span);

            div.onclick = () => {
                currentChatUserId = u._id;
                document.getElementById("chatWith").innerText = "Chat with " + u.username;
                document.getElementById("messages").innerHTML = "";
            };

            userListDiv.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading users:", err);
    }
}

searchInput.oninput = () => loadUsers(searchInput.value);
loadUsers();

/* ===== SEND MESSAGE ===== */
document.getElementById("sendBtn").onclick = () => {
    if (!currentChatUserId) return alert("Select a user to chat!");
    const msg = document.getElementById("messageInput").value.trim();
    if (!msg) return;

    socket.emit("private message", { to: currentChatUserId, message: msg });
    addMessage(msg, "sent");
    document.getElementById("messageInput").value = "";
};

/* ===== RECEIVE MESSAGE ===== */
socket.on("private message", ({ message, from }) => {
    if (from === currentChatUserId) addMessage(message, "received");
});

function addMessage(msg, type) {
    const div = document.createElement("div");
    div.classList.add("message", type);
    div.textContent = msg;
    const messages = document.getElementById("messages");
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

/* ===== PROFILE MENU TOGGLE ===== */
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Toggles between showing the menu as a flex column or hiding it
    if (profileMenu.style.display === "flex") {
        profileMenu.style.display = "none";
    } else {
        profileMenu.style.display = "flex";
    }
});

// Close menu if user clicks anywhere else on the screen
window.addEventListener("click", (e) => {
    if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
        profileMenu.style.display = "none";
    }
});

/* ===== UPLOAD PROFILE PHOTO ===== */
document.getElementById("photoUpload").onchange = function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById("profilePreview").src = e.target.result;
        document.getElementById("profilePhoto").src = e.target.result;
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("photo", file);
    formData.append("userId", userId);

    fetch("/upload-photo", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
            console.log("Photo uploaded:", data);
            // Reload users to update photo in chat list
            loadUsers(searchInput.value);
        })
        .catch(err => console.error("Upload error:", err));
};

/* ===== CHANGE USERNAME ===== */
document.getElementById("changeUsername").onclick = async () => {
    const name = prompt("Enter new username");
    if (!name) return;

    try {
        await fetch("/change-username", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, username: name })
        });
        alert("Username updated");
        loadUsers(searchInput.value); // refresh list
    } catch (err) {
        console.error("Username update error:", err);
    }
};

/* ===== CHANGE EMAIL ===== */
document.getElementById("changeEmail").onclick = async () => {
    const email = prompt("Enter new email");
    if (!email) return;

    try {
        await fetch("/change-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, email })
        });
        alert("Email updated");
    } catch (err) {
        console.error("Email update error:", err);
    }
};

/* ===== CHANGE PASSWORD ===== */
document.getElementById("changePassword").onclick = async () => {
    const password = prompt("Enter new password");
    if (!password) return;

    try {
        await fetch("/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, password })
        });
        alert("Password updated");
    } catch (err) {
        console.error("Password update error:", err);
    }
};