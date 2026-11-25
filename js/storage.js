/*
  School Portal - storage.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Sets up and manages all data saved in localStorage
*/

// Names of every storage "drawer" the site uses
const STORAGE_KEYS = {
  users: "sp_users",
  //session: "portal_session",
  students: "sp_students",
  grades: "sp_grades",
  finances: "sp_finances",
  session: "sp_session",
};

// Returns the saved array for a key, or an empty array if nothing is saved
function getData(key) 
{
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

// Saves an array under key
// If the browser blocks storage (some preview windows do), the page keeps working
function saveData(key, data) 
{
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn("Could not save " + key + ": " + error.message);
  }
}


// Starter login accounts, loaded on the first visit only
const DEFAULT_USERS = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "teacher", password: "teach123", role: "teacher" },
  { username: "viewer", password: "view123", role: "viewer" },
];


// Fills empty drawers with starter data so the site works on first load
function initStorage() {
  try {
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
  } catch (error) {
    console.warn("Storage is blocked in this browser window: " + error.message);
  }
}

/* ---------- Lists shared by the admin pages ---------- */

const GRADE_LEVELS = [
  "Form 1",
  "Form 2",
  "Form 3",
  "Form 4",
  "Form 5",
  "Lower Sixth",
  "Upper Sixth",
];

// Enrollment cohorts (one cohort for each semester)
const COHORTS = [
  "2025 Semester 2",
  "2026 Semester 1",
  "2026 Semester 2",
  "2027 Semester 1",
];

const SUBJECTS = [
  "Mathematics",
  "English Language",
  "Information Technology",
  "Integrated Science",
  "Social Studies",
  "Spanish",
  "Physical Education",
  "Visual Arts",
];

const ASSESSMENTS = ["Test 1", "Test 2", "Mid-Year Exam", "Final Exam", "Coursework"];

// Sample tuition for each semester in Jamaican dollars (change these if needed)
const TUITION_BY_GRADE = {
  "Form 1": 30000,
  "Form 2": 30000,
  "Form 3": 30000,
  "Form 4": 32000,
  "Form 5": 32000,
  "Lower Sixth": 35000,
  "Upper Sixth": 35000,
};

/* ---------- Small helper functions shared by the admin pages ---------- */

// Makes text safe to place inside innerHTML (stops typed HTML from running)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shows a number as money, for example 30000 becomes J$30,000.00
function formatMoney(amount) {
  return (
    "J$" +
    Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Changes a percentage score into a letter grade
function getLetterGrade(score) {
  if (score >= 80) {
    return "A";
  } else if (score >= 70) {
    return "B";
  } else if (score >= 60) {
    return "C";
  } else if (score >= 50) {
    return "D";
  } else if (score >= 40) {
    return "E";
  }
  return "F";
}

// Finds one student by ID number, or returns undefined if there is no match
function findStudent(studentId) {
  const students = getData(STORAGE_KEYS.students);
  return students.find(function (student) {
    return student.studentId === studentId;
  });
}

// Gives back "Last, First" for a student ID (used in tables)
function getStudentName(studentId) {
  const student = findStudent(studentId);
  if (!student) {
    return "Removed student";
  }
  return student.lastName + ", " + student.firstName;
}

// Finds the biggest number at the end of the IDs in a list, then adds 1
// Example: IDs "L1", "L2", "L7" give back 8
function getNextNumber(list, idKey) {
  let biggest = 0;
  for (let i = 0; i < list.length; i++) {
    const digits = parseInt(String(list[i][idKey]).replace(/[^0-9]/g, ""), 10);
    if (digits > biggest) {
      biggest = digits;
    }
  }
  return biggest + 1;
}

// Today's date as YYYY-MM-DD (the same format a date input uses)
function getTodayText() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return today.getFullYear() + "-" + month + "-" + day;
}

// Fills a drop-down with options from a list
function fillSelect(selectElement, list) {
  for (let i = 0; i < list.length; i++) {
    const option = document.createElement("option");
    option.value = list[i];
    option.textContent = list[i];
    selectElement.appendChild(option);
  }
}

/* ---------- Finance helpers (used by the dashboard and the ledger page) ---------- */

// Adds up every payment made on one ledger record
function getAmountPaid(record) {
  let total = 0;
  for (let i = 0; i < record.payments.length; i++) {
    total = total + record.payments[i].amount;
  }
  return Math.round(total * 100) / 100;
}

// Works out the money still owing on one ledger record
function getBalance(record) {
  return Math.round((record.amountDue - getAmountPaid(record)) * 100) / 100;
}

// Paid        = nothing left to pay
// Pending     = money is owing but the due date has not passed yet
// Outstanding = money is owing and the due date has passed
function getAccountStatus(record) {
  if (getBalance(record) <= 0) {
    return "Paid";
  } else if (record.dueDate < getTodayText()) {
    return "Outstanding";
  }
  return "Pending";
}

// CSS class for a status, for example "Paid" gives "status-paid"
function getStatusClass(status) {
  return "status-" + status.toLowerCase();
}

initStorage();
