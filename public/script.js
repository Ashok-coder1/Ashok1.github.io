const card = document.getElementById("card");

// ----- CARD FLIP -----
document.getElementById("showSignup").onclick = () => {
  card.classList.add("flip");
};

document.getElementById("showLogin").onclick = () => {
  card.classList.remove("flip");
};

// ----- SIGN UP -----
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  let username = document.getElementById("username").value.trim();
  const email = e.target[1].value.trim();
  const password = e.target[2].value.trim();

  if (!username || !email || !password) {
    return alert("Please fill all fields");
  }

  // Ensure only **one '+'**
  if (!username.startsWith("+")) {
    username = "+" + username;
  } else if (username.startsWith("++")) {
    username = username.replace(/^(\++)/, "+");
  }

  try {
    const res = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    alert(data.message || (data.success ? "Account created!" : "Signup failed"));

    if (data.success) {
      document.getElementById("signupForm").reset();
      card.classList.remove("flip"); // go back to login
    }

  } catch (error) {
    console.error("Signup error:", error);
    alert("Server error. Please try again.");
  }
});

// ----- LOGIN -----
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = e.target[0].value.trim();
  const password = e.target[1].value.trim();

  if (!email || !password) return alert("Please fill all fields");

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success) {
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("username", data.username); // already correct +Ashok
      window.location.href = "dashboard.html";
    } else {
      alert(data.message || "Invalid credentials");
    }

  } catch (error) {
    console.error("Login error:", error);
    alert("Server error. Please try again.");
  }
});
