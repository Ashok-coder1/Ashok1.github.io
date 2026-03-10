const socket = io();

// ===== USER INFO =====
const userId = localStorage.getItem("userId");
let username = localStorage.getItem("username");
if (!userId) window.location.href = "index.html";

// ===== ELEMENTS =====
const chatHeaderName = document.getElementById("chatName");
const chatHeaderPhoto = document.getElementById("chatPhoto");
const chatHeaderStatus = document.getElementById("chatStatus");
const messagesContainer = document.querySelector(".messages");
const inputBox = document.querySelector(".inputBox input");
const sendBtn = document.querySelector(".inputBox button");

let onlineUsers = [];
let currentChatUserId = null;
let unreadMessages = {};
const messageSound = new Audio("/sounds/message.mp3");

// ===== HELPER =====
function appendMessage(msg, seen=false){
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(msg.from===userId?"sent":"received");

  const time = new Date(msg.timestamp);
  const hours = time.getHours().toString().padStart(2,"0");
  const minutes = time.getMinutes().toString().padStart(2,"0");

  let tickHTML = "";
  if(msg.from===userId) tickHTML = seen?"✔✔":"✔";

  div.innerHTML = `${msg.message} <span class="time">${hours}:${minutes}</span> <span class="tick">${tickHTML}</span>`;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ===== URL PARAMS =====
const params = new URLSearchParams(window.location.search);
const receiverId = params.get("user");
if(receiverId) currentChatUserId = receiverId;

// ===== LOAD CHAT HEADER INFO =====
if(receiverId){
  fetch(`/user?id=${receiverId}`)
    .then(res=>res.json())
    .then(user=>{
      chatHeaderName.textContent = "+"+user.username;
      chatHeaderPhoto.src = user.photo || "uploads/profile.jpg";
      chatHeaderStatus.textContent = "⚫ Offline";
    });

  // Load messages
  fetch(`/messages?userId=${userId}&chatWith=${receiverId}`)
    .then(res=>res.json())
    .then(messages=>messages.forEach(m=>appendMessage(m,m.seen)));

  // Mark as seen
  fetch("/mark-seen",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({from:receiverId,to:userId})
  });

  socket.emit("messageSeen",{from:receiverId,to:userId});
}

// ===== SEND MESSAGE =====
sendBtn.addEventListener("click",sendMessage);
inputBox.addEventListener("keypress",e=>{if(e.key==="Enter") sendMessage()});

function sendMessage(){
  const msg = inputBox.value.trim();
  if(!msg||!currentChatUserId) return;
  socket.emit("send-message",{to:currentChatUserId,message:msg});
  appendMessage({from:userId,message:msg,timestamp:new Date()});
  inputBox.value="";
}

// ===== RECEIVE MESSAGE =====
socket.on("receive-message",msg=>{
  if(currentChatUserId===msg.from){
    appendMessage(msg,msg.seen);
    messageSound.play();
    socket.emit("messageSeen",{from:msg.from,to:userId});
  } else {
    unreadMessages[msg.from] = (unreadMessages[msg.from]||0)+1;
    // badge update handled in dashboard.js
    messageSound.play();
  }
});

// ===== ONLINE USERS UPDATE =====
socket.on("online-users",users=>{
  onlineUsers = users;
});

// ===== MESSAGE SEEN UPDATE =====
socket.on("messageSeen",({from})=>{
  if(currentChatUserId===from){
    const ticks = messagesContainer.querySelectorAll(".sent .tick");
    if(ticks.length) ticks[ticks.length-1].textContent="✔✔";
  }
});
