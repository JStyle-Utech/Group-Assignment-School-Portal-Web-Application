/*
  School Portal - auth.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Handles login, creating accounts, logout and role-based page protection
  Note: storage.js must be loaded before this file
*/

// Page each role is sent to after logging in
const ROLE_PAGES = {
  admin: "dashboard.html",
  teacher: "teacher/dashboard.html",
  viewer: "viewer/search.html",
};

/* ---------- Accounts ---------- */

// Accounts made with the "Create Admin Account" form live ONLY in this list.
// It is not saved to localStorage, so it is empty again when the page is refreshed.
const newAccounts = [];

// The starter accounts (admin, teacher, viewer) plus any new accounts from this page view
function getAllUsers() {
  const saved = getData(STORAGE_KEYS.users);
  const starters = saved.length > 0 ? saved : DEFAULT_USERS;
  return starters.concat(newAccounts);
}

// Removes old saved accounts, so only the starter accounts stay in localStorage
// (this cleans up accounts saved by earlier versions of this page)
function clearSavedAccounts() {
  saveData(STORAGE_KEYS.users, DEFAULT_USERS); // saveData does not crash if storage is blocked
}

/* ---------- Login, logout and session ---------- */

// Saves who is logged in. Only the name, username and role are kept, never the password.
// sessionStorage clears when the tab is closed.
function startSession(user) {
  sessionStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({
      username: user.username,
      fullName: user.fullName || user.username,
      role: user.role,
    }),
  );
}

// Checks the typed details and starts the session if they match
// Returns the role if the details are correct, or null if they are not
function login(username, password) {
  const user = getAllUsers().find(function (u) {
    return u.username.toLowerCase() === username.toLowerCase() && u.password === password;
  });

  if (user) {
    startSession(user);
    return user.role;
  }
  return null;
}

// Returns the logged-in user, or null if nobody is logged in
function getCurrentUser() {
  return JSON.parse(sessionStorage.getItem(STORAGE_KEYS.session));
}

// Clears the session and goes back to the login page
function logout() {
  sessionStorage.removeItem(STORAGE_KEYS.session);
  window.location.href = getRootPath() + "login.html";
}

// Works out how far a page is from the main folder, so links work from any folder
function getRootPath() {
  const inSubfolder = /\/(admin|teacher|viewer)\//.test(window.location.pathname);
  return inSubfolder ? "../" : "";
}

// Put at the top of protected pages; sends away anyone without an allowed role
function requireRole(...allowedRoles) {
  const user = getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    window.location.href = getRootPath() + "login.html";
  }
}

// Blocks anyone who does not have the role, shows who is signed in
// and connects the log out link
function protectPage(role) {
  requireRole(role);

  const user = getCurrentUser();
  const welcome = document.getElementById("adminWelcome");
  if (user && welcome) {
    welcome.textContent = "Signed in as " + user.fullName;
  }

  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", function (event) {
      event.preventDefault();
      logout();
    });
  }
}

// Call this at the bottom of every administrator page
function protectAdminPage() {
  protectPage("admin");
}

// Call this at the bottom of every teacher page
function protectTeacherPage() {
  protectPage("teacher");
}

/* ---------- Checking the create account form ---------- */

// Each check function looks at ONE field.
// It returns "" when the value is fine, or a message saying exactly what is wrong.

function checkFullName(value) {
  if (value === "") {
    return "Enter your full name.";
  }
  if (!/^[A-Za-z][A-Za-z .'\-]{1,49}$/.test(value)) {
    return "Use letters only (spaces, . ' and - are allowed), at least 2 letters.";
  }
  return "";
}

function checkUsername(value, users) {
  if (value === "") {
    return "Enter a username.";
  }
  if (/\s/.test(value)) {
    return "Username cannot contain spaces.";
  }

  // Find any characters that are not allowed, and show them to the user
  const badCharacters = value.replace(/[A-Za-z0-9_.\-]/g, "");
  if (badCharacters !== "") {
    const shown = Array.from(new Set(badCharacters.split(""))).join(" ");
    return 'Username cannot contain: ' + shown + '   (use letters, numbers, _ . or - only).';
  }

  if (value.length < 4) {
    return "Too short: " + value.length + " of at least 4 characters.";
  }
  if (value.length > 20) {
    return "Too long: " + value.length + " characters. The most allowed is 20.";
  }

  const taken = users.some(function (u) {
    return u.username.toLowerCase() === value.toLowerCase();
  });
  if (taken) {
    return 'The username "' + value + '" is already used. Choose a different one.';
  }
  return "";
}

function checkEmail(value) {
  if (value === "") {
    return "Enter your email address.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Use the format name@school.com.";
  }
  return "";
}

function checkRole(value) {
  if (value !== "admin" && value !== "teacher") {
    return "Choose Administrator or Teacher.";
  }
  return "";
}

function checkPassword(value) {
  const missing = [];
  if (value.length < 8) {
    missing.push("at least 8 characters (you have " + value.length + ")");
  }
  if (!/[A-Za-z]/.test(value)) {
    missing.push("a letter");
  }
  if (!/[0-9]/.test(value)) {
    missing.push("a number");
  }
  if (missing.length > 0) {
    return "Password needs " + missing.join(", ") + ".";
  }
  return "";
}

function checkConfirm(password, confirm) {
  if (confirm === "") {
    return "Type the password again.";
  }
  if (password !== confirm) {
    return "The two passwords do not match.";
  }
  return "";
}

// Checks every field. Returns an object with one message for each field.
// A message of "" means that field is fine.
function validateNewAccount(details, users) {
  return {
    fullName: checkFullName(details.fullName),
    username: checkUsername(details.username, users),
    email: checkEmail(details.email),
    role: checkRole(details.role),
    password: checkPassword(details.password),
    confirm: checkConfirm(details.password, details.confirm),
  };
}

/* ---------- Login page ---------- */

// Connects the forms and buttons on login.html
function setUpLoginPage() {
  const loginSection = document.getElementById("loginSection");
  const adminSection = document.getElementById("adminSection");
  const loginForm = document.getElementById("login-form");
  const adminForm = document.getElementById("admin-form");
  const showCreateAdmin = document.getElementById("showCreateAdmin");
  const showLogin = document.getElementById("showLogin");
  const roleSelect = document.getElementById("adminRole");

  // Only the starter accounts are kept. Old saved accounts are removed.
  clearSavedAccounts();

  // Empty both forms (browsers can refill them after a refresh)
  function clearForms() {
    loginForm.reset();
    document.getElementById("loginMessage").textContent = "";
    if (adminForm) {
      adminForm.reset();
      document.getElementById("adminMessage").textContent = "";
      for (let i = 0; i < ADMIN_FIELDS.length; i++) {
        showFieldMessage(ADMIN_FIELDS[i], "", false);
      }
    }
  }

  // The fields of the create account form. "key" matches the names in validateNewAccount.
  const ADMIN_FIELDS = adminForm
    ? [
        { key: "fullName", input: document.getElementById("adminFullName"), help: document.getElementById("adminFullNameHelp") },
        { key: "username", input: document.getElementById("adminUsername"), help: document.getElementById("adminUsernameHelp") },
        { key: "email", input: document.getElementById("adminEmail"), help: document.getElementById("adminEmailHelp") },
        { key: "role", input: roleSelect, help: document.getElementById("adminRoleHelp") },
        { key: "password", input: document.getElementById("adminPassword"), help: document.getElementById("adminPasswordHelp") },
        { key: "confirm", input: document.getElementById("adminConfirm"), help: document.getElementById("adminConfirmHelp") },
      ]
    : [];

  // Shows a message under a field and colours the box red or green
  // message "" with showGood false puts the normal hint back and removes the colours
  function showFieldMessage(field, message, showGood) {
    if (!field.help) {
      return;
    }
    field.input.classList.remove("invalid", "valid");
    field.help.classList.remove("bad", "good");

    if (message !== "") {
      field.help.textContent = message;
      field.help.classList.add("bad");
      field.input.classList.add("invalid");
    } else if (showGood) {
      field.help.textContent = field.help.dataset.good || "Looks good.";
      field.help.classList.add("good");
      field.input.classList.add("valid");
    } else {
      field.help.textContent = field.help.dataset.hint || "";
    }
  }

  // Reads what the user typed in every field
  function readDetails() {
    return {
      fullName: document.getElementById("adminFullName").value.trim(),
      username: document.getElementById("adminUsername").value.trim(),
      email: document.getElementById("adminEmail").value.trim(),
      role: roleSelect.value,
      password: document.getElementById("adminPassword").value,
      confirm: document.getElementById("adminConfirm").value,
    };
  }

  // Checks one field and shows the result under it
  function checkOneField(key) {
    const messages = validateNewAccount(readDetails(), getAllUsers());
    for (let i = 0; i < ADMIN_FIELDS.length; i++) {
      if (ADMIN_FIELDS[i].key === key) {
        showFieldMessage(ADMIN_FIELDS[i], messages[key], true);
      }
    }
  }

  clearForms();
  // "pageshow" runs again when the page is refreshed or reached with the Back button
  window.addEventListener("pageshow", function () {
    setTimeout(clearForms, 0);
  });

  // Log in. Administrators go to dashboard.html, teachers to teacher/dashboard.html
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");

    const role = login(username, password);

    if (role && ROLE_PAGES[role]) {
      window.location.href = "admin/dashboard.html";
    } else {
      message.className = "form-message error";
      message.textContent = "Incorrect username or password.";
    }
  });

  // Stop with a clear message if login.html is an old copy without the create account parts
  // (the login form above still works)
  if (!adminForm || !loginSection || !adminSection || !showCreateAdmin || !showLogin || !roleSelect) {
    console.error(
      "login.html is an old copy. It needs loginSection, adminSection, showCreateAdmin, showLogin and adminRole. Use the newest login.html.",
    );
    return;
  }

  // Switch to the create account form
  showCreateAdmin.addEventListener("click", function () {
    loginSection.hidden = true;
    adminSection.hidden = false;
    document.getElementById("adminFullName").focus();
  });

  // Switch back to the login form
  showLogin.addEventListener("click", function () {
    adminSection.hidden = true;
    loginSection.hidden = false;
    document.getElementById("username").focus();
  });

  // Check each field while the user types, and again when they leave the field
  for (let i = 0; i < ADMIN_FIELDS.length; i++) {
    const field = ADMIN_FIELDS[i];

    field.input.addEventListener("input", function () {
      checkOneField(field.key);
      // Changing the password also changes whether the confirm box matches
      if (field.key === "password" && ADMIN_FIELDS[5].input.value !== "") {
        checkOneField("confirm");
      }
    });

    field.input.addEventListener("blur", function () {
      // Do not show "required" errors for fields the user has not touched
      if (field.input.value !== "") {
        checkOneField(field.key);
      }
    });
  }

  // Create a new account
  adminForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const message = document.getElementById("adminMessage");
    const details = readDetails();
    const messages = validateNewAccount(details, getAllUsers());

    // Show the result under every field
    let problemCount = 0;
    let firstBadField = null;
    for (let i = 0; i < ADMIN_FIELDS.length; i++) {
      const field = ADMIN_FIELDS[i];
      showFieldMessage(field, messages[field.key], true);
      if (messages[field.key] !== "") {
        problemCount++;
        if (firstBadField === null) {
          firstBadField = field;
        }
      }
    }

    if (problemCount > 0) {
      message.className = "form-message error";
      message.textContent =
        problemCount === 1
          ? "Fix the field marked in red, then press Create Account again."
          : "Fix the " + problemCount + " fields marked in red, then press Create Account again.";
      firstBadField.input.focus();
      return;
    }

    // Keep the new account in memory only (NOT in localStorage)
    const user = {
      fullName: details.fullName,
      username: details.username,
      email: details.email,
      password: details.password,
      role: details.role,
    };
    newAccounts.push(user);

    // Log the new user in and open the dashboard for their role
    message.className = "form-message success";
    message.textContent = "Account created. Opening your dashboard...";
    startSession(user);
    window.location.href ="admin/dashboard.html";
  });
}

// Only run the login page code when the login form is on the page
if (document.getElementById("login-form")) {
  setUpLoginPage();
}
