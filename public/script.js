const card = document.getElementById("card");
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

showSignup.onclick = ()=> card.classList.add("flip");
showLogin.onclick = ()=> card.classList.remove("flip");

/* SIGNUP */
signupForm.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("signupBtn");
  const error = document.getElementById("signupError");
  error.textContent="";
  let username = document.getElementById("username").value.trim();
  const email = signupForm.querySelector('input[type="email"]').value.trim();
  const password = signupForm.querySelector('input[type="password"]').value.trim();
  if(!username||!email||!password){ error.textContent="Please fill all fields"; return;}
  username = username.replace(/^\++/,"+"); if(!username.startsWith("+")) username="+"+username;
  btn.classList.add("loading"); btn.textContent="Creating...";
  try{
    const res = await fetch("/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,email,password})});
    const data = await res.json();
    if(data.success){ signupForm.reset(); card.classList.remove("flip"); }
    else error.textContent=data.message||"Signup failed";
  }catch{ error.textContent="Server error"; }
  btn.classList.remove("loading"); btn.textContent="Register";
});

/* LOGIN */
loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  const error = document.getElementById("loginError");
  error.textContent="";
  const email = loginForm.querySelector('input[type="email"]').value.trim();
  const password = loginForm.querySelector('input[type="password"]').value.trim();
  if(!email||!password){ error.textContent="Please fill all fields"; return; }
  btn.classList.add("loading"); btn.textContent="Logging in...";
  try{
    const res = await fetch("/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    const data = await res.json();
    if(data.success){ localStorage.setItem("userId",data.userId); localStorage.setItem("username",data.username); window.location.href="dashboard.html"; }
    else error.textContent=data.message||"Invalid email or password";
  }catch{ error.textContent="Server error"; }
  btn.classList.remove("loading"); btn.textContent="Login";
});
