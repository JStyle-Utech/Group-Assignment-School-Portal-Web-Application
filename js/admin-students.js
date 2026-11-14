/*
  CIT2011 Web Programming - School Portal Group Project
  File: admin-students.js (Student Registry logic)
  Role: Student 3 - Administrative Interface Developer
  Group members (Name | ID# | Lab day/time):
    1. <Name> | <ID#> | <Day/Time>
    ... (list all members)
*/

"use strict";

/* ---------- Constants shared with the rest of the team ---------- */
// Agree these key names with Student 2 (State Manager) before integrating.
const STUDENTS_KEY = "sp_students";
const SESSION_KEY = "sp_session";      // expected shape: { username, role: "admin" | "teacher" }
const LOGIN_PAGE = "../login.html";

const GRADE_LEVELS = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Grade 13"];
const COHORTS = [
  "2026/27 Semester 1",
  "2026/27 Semester 2",
  "2027/28 Semester 1",
  "2027/28 Semester 2"
];

/* ---------- Module state ---------- */
let students = [];
let sortKey = "studentId";
let sortAsc = true;

/* ---------- DOM references ---------- */
const form = document.getElementById("studentForm");
const tableBody = document.getElementById("studentTableBody");
const searchBox = document.getElementById("searchBox");
const cohortFilter = document.getElementById("cohortFilter");
const statusFilter = document.getElementById("statusFilter");
const resultCount = document.getElementById("resultCount");
const formMessage = document.getElementById("formMessage");
const editingIdInput = document.getElementById("editingId");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formHeading = document.getElementById("formHeading");
const cohortSummary = document.getElementById("cohortSummary");

/* ---------- Access control: only administrators may view this page ---------- */
function checkAdminAccess() {
  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch (err) {
    session = null;
  }
  if (!session || session.role !== "admin") {
    window.location.href = LOGIN_PAGE;
    return false;
  }
  return true;
}

/* ---------- Storage helpers ---------- */
function loadStudents() {
  try {
    const raw = localStorage.getItem(STUDENTS_KEY);
    students = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(students)) students = [];
  } catch (err) {
    students = [];            // corrupted data: start clean instead of crashing
  }
  if (students.length === 0) seedStudents();
}

function saveStudents() {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

// Sample records so the tables are not empty on first load
function seedStudents() {
  students = [
    makeStudent("Shanice", "Brown", "2011-03-14", "Female", "Grade 9", COHORTS[0],
      "Marcia Brown", "876-555-0101", "m.brown@example.com", "12 Hope Road, Kingston", "Active"),
    makeStudent("Andre", "Campbell", "2010-09-02", "Male", "Grade 10", COHORTS[0],
      "Devon Campbell", "876-555-0102", "d.campbell@example.com", "5 Mango Lane, St. Andrew", "Active")
  ];
  saveStudents();
}

/* ---------- Data helpers ---------- */
// Builds the next ID such as STU-2026-003 using the highest existing number
function generateStudentId() {
  const year = new Date().getFullYear();
  let highest = 0;
  students.forEach(function (s) {
    const num = parseInt(String(s.studentId).split("-")[2], 10);
    if (!isNaN(num) && num > highest) highest = num;
  });
  return "STU-" + year + "-" + String(highest + 1).padStart(3, "0");
}

function makeStudent(firstName, lastName, dob, gender, gradeLevel, cohort,
                     guardianName, guardianPhone, email, address, status) {
  return {
    studentId: generateStudentId(),
    firstName, lastName, dob, gender, gradeLevel, cohort,
    guardianName, guardianPhone, email, address, status
  };
}

/* ---------- Validation ---------- */
const fieldMessages = {
  firstName: "Enter 2-30 letters (spaces, ' and - allowed).",
  lastName: "Enter 2-30 letters (spaces, ' and - allowed).",
  dob: "Enter a valid date of birth (age 3 to 25).",
  gender: "Select a gender.",
  gradeLevel: "Select a grade or form.",
  cohort: "Select an enrollment cohort.",
  guardianName: "Enter the guardian's full name (letters only).",
  guardianPhone: "Use the format 876-555-1234.",
  email: "Enter a valid email address.",
  address: "Enter an address of 5-100 characters."
};

function setError(fieldId, message) {
  document.getElementById(fieldId + "Error").textContent = message;
  document.getElementById(fieldId).setAttribute("aria-invalid", message ? "true" : "false");
}

function validateField(fieldId) {
  const input = document.getElementById(fieldId);
  const value = input.value.trim();
  let message = "";

  if (!input.checkValidity() || value === "") {
    message = fieldMessages[fieldId];
  } else if (fieldId === "dob") {
    const age = (Date.now() - new Date(value).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (isNaN(age) || age < 3 || age > 25) message = fieldMessages.dob;
  } else if (fieldId === "email") {
    // Block duplicate emails (ignore the record currently being edited)
    const duplicate = students.some(function (s) {
      return s.email.toLowerCase() === value.toLowerCase() && s.studentId !== editingIdInput.value;
    });
    if (duplicate) message = "This email is already registered to another student.";
  }
  setError(fieldId, message);
  return message === "";
}

function validateForm() {
  let allValid = true;
  Object.keys(fieldMessages).forEach(function (fieldId) {
    if (!validateField(fieldId)) allValid = false;
  });
  return allValid;
}

/* ---------- Rendering ---------- */
function fillSelect(select, options) {
  options.forEach(function (text) {
    const opt = document.createElement("option");
    opt.value = text;
    opt.textContent = text;
    select.appendChild(opt);
  });
}

function getVisibleStudents() {
  const term = searchBox.value.trim().toLowerCase();
  const cohort = cohortFilter.value;
  const status = statusFilter.value;

  const filtered = students.filter(function (s) {
    const haystack = (s.studentId + " " + s.firstName + " " + s.lastName + " " + s.email).toLowerCase();
    return (term === "" || haystack.includes(term)) &&
           (cohort === "" || s.cohort === cohort) &&
           (status === "" || s.status === status);
  });

  filtered.sort(function (a, b) {
    const result = String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true });
    return sortAsc ? result : -result;
  });
  return filtered;
}

function renderTable() {
  const visible = getVisibleStudents();
  tableBody.textContent = "";

  if (visible.length === 0) {
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 7;
    cell.className = "empty";
    cell.textContent = "No students match your search. Clear the filters or register a student.";
  }

  visible.forEach(function (s) {
    const row = tableBody.insertRow();
    // textContent is used (not innerHTML) so typed text can never inject markup
    row.insertCell().textContent = s.studentId;
    row.insertCell().textContent = s.lastName + ", " + s.firstName;
    row.insertCell().textContent = s.gradeLevel;
    row.insertCell().textContent = s.cohort;
    row.insertCell().textContent = s.guardianName + " (" + s.guardianPhone + ")";

    const statusCell = row.insertCell();
    const badge = document.createElement("span");
    badge.className = "badge " + s.status.toLowerCase();
    badge.textContent = s.status;
    statusCell.appendChild(badge);

    const actionCell = row.insertCell();
    actionCell.className = "row-actions";
    actionCell.appendChild(makeActionButton("Edit", "edit", s.studentId));
    actionCell.appendChild(makeActionButton("Delete", "delete", s.studentId));
  });

  resultCount.textContent = visible.length + " of " + students.length + " students";
  renderCohortSummary();
}

function makeActionButton(label, action, id) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn small " + (action === "delete" ? "danger" : "");
  btn.textContent = label;
  btn.dataset.action = action;
  btn.dataset.id = id;
  btn.setAttribute("aria-label", label + " student " + id);
  return btn;
}

function renderCohortSummary() {
  cohortSummary.textContent = "";
  COHORTS.forEach(function (cohort) {
    const count = students.filter(function (s) {
      return s.cohort === cohort && s.status === "Active";
    }).length;
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = cohort;
    const num = document.createElement("strong");
    num.textContent = count;
    li.appendChild(label);
    li.appendChild(num);
    cohortSummary.appendChild(li);
  });
}

function showMessage(text, isError) {
  formMessage.textContent = text;
  formMessage.className = "message " + (isError ? "bad" : "good");
}

/* ---------- CRUD operations ---------- */
function handleSubmit(event) {
  event.preventDefault();
  if (!validateForm()) {
    showMessage("Fix the highlighted fields and try again.", true);
    return;
  }

  const data = {
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    dob: document.getElementById("dob").value,
    gender: document.getElementById("gender").value,
    gradeLevel: document.getElementById("gradeLevel").value,
    cohort: document.getElementById("cohort").value,
    guardianName: document.getElementById("guardianName").value.trim(),
    guardianPhone: document.getElementById("guardianPhone").value.trim(),
    email: document.getElementById("email").value.trim(),
    address: document.getElementById("address").value.trim(),
    status: document.getElementById("status").value
  };

  if (editingIdInput.value) {
    // UPDATE: merge changes into the existing record, keep its ID
    const index = students.findIndex(function (s) { return s.studentId === editingIdInput.value; });
    if (index !== -1) students[index] = Object.assign({}, students[index], data);
    showMessage("Student " + editingIdInput.value + " updated.", false);
  } else {
    // CREATE
    const newStudent = Object.assign({ studentId: generateStudentId() }, data);
    students.push(newStudent);
    showMessage("Student " + newStudent.studentId + " registered.", false);
  }

  saveStudents();
  exitEditMode();
  renderTable();
}

function startEdit(id) {
  const s = students.find(function (item) { return item.studentId === id; });
  if (!s) return;

  Object.keys(fieldMessages).concat("status").forEach(function (key) {
    document.getElementById(key).value = s[key];
    if (key !== "status") setError(key, "");
  });
  editingIdInput.value = id;
  formHeading.textContent = "Update student " + id;
  saveBtn.textContent = "Save changes";
  cancelBtn.hidden = false;
  form.scrollIntoView({ behavior: "smooth" });
  document.getElementById("firstName").focus();
}

function exitEditMode() {
  form.reset();
  editingIdInput.value = "";
  formHeading.textContent = "Register a student";
  saveBtn.textContent = "Register student";
  cancelBtn.hidden = true;
  Object.keys(fieldMessages).forEach(function (key) { setError(key, ""); });
}

function deleteStudent(id) {
  if (!window.confirm("Delete student " + id + "? This cannot be undone.")) return;
  students = students.filter(function (s) { return s.studentId !== id; });
  saveStudents();
  if (editingIdInput.value === id) exitEditMode();
  renderTable();
  showMessage("Student " + id + " deleted.", false);
}

/* ---------- Event wiring ---------- */
function bindEvents() {
  form.addEventListener("submit", handleSubmit);
  form.addEventListener("reset", function () {
    // Wait for the browser to clear the fields, then wipe the error text
    setTimeout(function () {
      Object.keys(fieldMessages).forEach(function (key) { setError(key, ""); });
      formMessage.textContent = "";
    }, 0);
  });
  cancelBtn.addEventListener("click", exitEditMode);

  // Validate each field as the user leaves it
  Object.keys(fieldMessages).forEach(function (fieldId) {
    document.getElementById(fieldId).addEventListener("blur", function () { validateField(fieldId); });
  });

  // Event delegation: one listener handles every Edit/Delete button
  tableBody.addEventListener("click", function (event) {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "edit") startEdit(btn.dataset.id);
    if (btn.dataset.action === "delete") deleteStudent(btn.dataset.id);
  });

  [searchBox, cohortFilter, statusFilter].forEach(function (el) {
    el.addEventListener("input", renderTable);
  });

  document.querySelectorAll("button.sort").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const key = btn.dataset.key;
      sortAsc = (sortKey === key) ? !sortAsc : true;
      sortKey = key;
      renderTable();
    });
  });

  document.getElementById("logoutLink").addEventListener("click", function (event) {
    event.preventDefault();
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = LOGIN_PAGE;
  });
}

/* ---------- Start-up ---------- */
function init() {
  if (!checkAdminAccess()) return;
  fillSelect(document.getElementById("gradeLevel"), GRADE_LEVELS);
  fillSelect(document.getElementById("cohort"), COHORTS);
  fillSelect(cohortFilter, COHORTS);
  loadStudents();
  bindEvents();
  renderTable();
}

document.addEventListener("DOMContentLoaded", init);