/*
  School Portal - storage.js
  Group Members: Name, ID#, Lab Day/Time (one line per member)
  Purpose: Sets up and manages all data saved in localStorage
*/

// Names of every storage "drawer" the site uses
const STORAGE_KEYS = {
  users: "sp_users",
  students: "sp_students",
  grades: "sp_grades",
  finances: "sp_finances",
  session: "sp_session",
};

// Starter login accounts, loaded on the first visit only
const DEFAULT_USERS = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "teacher", password: "teach123", role: "teacher" },
  { username: "viewer", password: "view123", role: "viewer" },
];

// Reads a drawer and returns its list, or an empty list if nothing is saved
function getData(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

// Saves data into a drawer as text
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Fills empty drawers with starter data so the site works on first load
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    saveData(STORAGE_KEYS.users, DEFAULT_USERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.students)) {
    saveData(STORAGE_KEYS.students, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.grades)) {
    saveData(STORAGE_KEYS.grades, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.finances)) {
    saveData(STORAGE_KEYS.finances, []);
  }
}

initStorage();
