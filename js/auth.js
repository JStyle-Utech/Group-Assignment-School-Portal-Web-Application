/*
  School Portal - auth.js
  Group Members: Name, ID#, Lab Day/Time (one line per member)
  Purpose: Handles login, logout and role-based page protection
  Note: storage.js must be loaded before this file
*/

// Pages each role is sent to after logging in
const ROLE_PAGES = {
  admin: "admin/dashboard.html",
  teacher: "teacher/dashboard.html",
  viewer: "viewer/search.html",
};

// Checks the typed details and saves the session if they match
function login(username, password) {
  const users = getData(STORAGE_KEYS.users);
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );

  if (user) {
    // Save only what other pages need, never the password
    saveData(STORAGE_KEYS.session, {
      username: user.username,
      role: user.role,
    });
    return user.role;
  }
  return null;
}

// Returns the logged-in user, or null if nobody is logged in
function getCurrentUser() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.session));
}

// Clears the session and goes back to the login page
function logout() {
  localStorage.removeItem(STORAGE_KEYS.session);
  window.location.href = getRootPath() + "login.html";
}

// Works out how far a page is from the main folder, so links work from any folder
function getRootPath() {
  const inSubfolder = /\/(admin|teacher|viewer)\//.test(
    window.location.pathname,
  );
  return inSubfolder ? "../" : "";
}

// Put at the top of protected pages; sends away anyone without an allowed role
function requireRole(...allowedRoles) {
  const user = getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    window.location.href = getRootPath() + "login.html";
  }
}

// Connects the login form on login.html, if it is on this page
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");

    const role = login(username, password);

    if (role) {
      window.location.href = ROLE_PAGES[role];
    } else {
      message.textContent = "Incorrect username or password.";
    }
  });
}
