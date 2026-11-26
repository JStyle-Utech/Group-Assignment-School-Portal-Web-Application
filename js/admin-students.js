/*
  School Portal - admin-students.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Student Registry - create, read, update and delete students
  Note: storage.js and auth.js must be loaded before this file
*/

// Get the page elements we need
const studentForm = document.getElementById("studentForm");
const editingId = document.getElementById("editingId");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formMessage = document.getElementById("formMessage");
const formHeading = document.getElementById("formHeading");
const searchBox = document.getElementById("searchBox");
const cohortFilter = document.getElementById("cohortFilter");
const statusFilter = document.getElementById("statusFilter");
const studentTableBody = document.getElementById("studentTableBody");

// The table is sorted by this column (the user can change it)
let sortKey = "lastName";
let sortAscending = true;

// Every form field that can show an error message
const FIELD_NAMES = [
  "firstName", "lastName", "dob", "gender", "gradeLevel",
  "cohort", "guardianName", "guardianPhone", "email", "address",
];

/* ---------- Form errors ---------- */

function setError(fieldId, message) {
  document.getElementById(fieldId + "Error").textContent = message;
  const field = document.getElementById(fieldId);
  if (message === "") {
    field.classList.remove("invalid");
  } else {
    field.classList.add("invalid");
  }
}

function clearErrors() {
  for (let i = 0; i < FIELD_NAMES.length; i++) {
    setError(FIELD_NAMES[i], "");
  }
}

/* ---------- Validation ---------- */

// Checks every field. Returns true only when everything is correct.
function validateForm() {
  let allGood = true;
  const namePattern = /^[A-Za-z][A-Za-z '\-]{1,29}$/;

  clearErrors();

  const firstName = document.getElementById("firstName").value.trim();
  if (!namePattern.test(firstName)) {
    setError("firstName", "Use 2 to 30 letters (spaces, ' and - are allowed).");
    allGood = false;
  }

  const lastName = document.getElementById("lastName").value.trim();
  if (!namePattern.test(lastName)) {
    setError("lastName", "Use 2 to 30 letters (spaces, ' and - are allowed).");
    allGood = false;
  }

  // Date of birth: must be a real date in the past, and the student must be 10 to 25
  const dob = document.getElementById("dob").value;
  if (dob === "") {
    setError("dob", "Choose the date of birth.");
    allGood = false;
  } else {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthGap = today.getMonth() - birthDate.getMonth();
    if (monthGap < 0 || (monthGap === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (birthDate > today) {
      setError("dob", "The date of birth cannot be in the future.");
      allGood = false;
    } else if (age < 10 || age > 25) {
      setError("dob", "Student age must be between 10 and 25.");
      allGood = false;
    }
  }

  if (document.getElementById("gender").value === "") {
    setError("gender", "Select a gender.");
    allGood = false;
  }

  if (document.getElementById("gradeLevel").value === "") {
    setError("gradeLevel", "Select a grade / form.");
    allGood = false;
  }

  if (document.getElementById("cohort").value === "") {
    setError("cohort", "Select an enrollment cohort.");
    allGood = false;
  }

  const guardianName = document.getElementById("guardianName").value.trim();
  if (!/^[A-Za-z][A-Za-z '\-.]{2,49}$/.test(guardianName)) {
    setError("guardianName", "Use 3 to 50 letters (spaces, ' - and . are allowed).");
    allGood = false;
  }

  const guardianPhone = document.getElementById("guardianPhone").value.trim();
  if (!/^876-[0-9]{3}-[0-9]{4}$/.test(guardianPhone)) {
    setError("guardianPhone", "Use the format 876-555-1234.");
    allGood = false;
  }

  const email = document.getElementById("email").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError("email", "Enter a valid email address.");
    allGood = false;
  }

  const address = document.getElementById("address").value.trim();
  if (address.length < 5 || address.length > 100) {
    setError("address", "The address must be 5 to 100 characters long.");
    allGood = false;
  }

  // The same name and date of birth should not be registered twice
  if (allGood) {
    const students = getData(STORAGE_KEYS.students);
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const sameStudent =
        s.firstName.toLowerCase() === firstName.toLowerCase() &&
        s.lastName.toLowerCase() === lastName.toLowerCase() &&
        s.dob === dob;
      if (sameStudent && s.studentId !== editingId.value) {
        setError("firstName", "This student is already registered (" + s.studentId + ").");
        allGood = false;
      }
    }
  }

  return allGood;
}

/* ---------- Saving ---------- */

// Makes the next student ID, for example S2026-001, S2026-002 ...
function getNextStudentId(students) {
  let biggest = 0;
  for (let i = 0; i < students.length; i++) {
    const number = parseInt(students[i].studentId.split("-")[1], 10);
    if (number > biggest) {
      biggest = number;
    }
  }
  return "S" + new Date().getFullYear() + "-" + String(biggest + 1).padStart(3, "0");
}

// Reads the form and saves a new student, or updates the one being edited
function saveStudent() {
  const students = getData(STORAGE_KEYS.students);

  const details = {
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
    status: document.getElementById("status").value,
  };

  if (editingId.value !== "") {
    // Update: find the student and copy the new details onto them
    for (let i = 0; i < students.length; i++) {
      if (students[i].studentId === editingId.value) {
        details.studentId = students[i].studentId;
        students[i] = details;
      }
    }
    formMessage.textContent = "Student " + editingId.value + " was updated.";
  } else {
    // Create: give the student a new ID
    details.studentId = getNextStudentId(students);
    students.push(details);
    formMessage.textContent = "Student registered with ID " + details.studentId + ".";
  }

  formMessage.className = "message";
  saveData(STORAGE_KEYS.students, students);
}

/* ---------- Edit mode ---------- */

function startEdit(studentId) {
  const student = findStudent(studentId);
  if (!student) {
    return;
  }

  clearErrors();
  editingId.value = student.studentId;
  document.getElementById("firstName").value = student.firstName;
  document.getElementById("lastName").value = student.lastName;
  document.getElementById("dob").value = student.dob;
  document.getElementById("gender").value = student.gender;
  document.getElementById("gradeLevel").value = student.gradeLevel;
  document.getElementById("cohort").value = student.cohort;
  document.getElementById("guardianName").value = student.guardianName;
  document.getElementById("guardianPhone").value = student.guardianPhone;
  document.getElementById("email").value = student.email;
  document.getElementById("address").value = student.address;
  document.getElementById("status").value = student.status;

  formHeading.textContent = "Update student " + student.studentId;
  saveBtn.textContent = "Save changes";
  cancelBtn.hidden = false;
  formMessage.textContent = "";
  formHeading.scrollIntoView({ behavior: "smooth" });
}

function stopEdit() {
  editingId.value = "";
  formHeading.textContent = "Register a student";
  saveBtn.textContent = "Register student";
  cancelBtn.hidden = true;
  clearErrors();
}

/* ---------- Delete ---------- */

function deleteStudent(studentId) {
  const ok = confirm(
    "Delete student " + studentId + "? Their grades and fee records will also be deleted.",
  );
  if (!ok) {
    return;
  }

  // Keep every list except the records that belong to this student
  const students = getData(STORAGE_KEYS.students).filter(function (s) {
    return s.studentId !== studentId;
  });
  const grades = getData(STORAGE_KEYS.grades).filter(function (g) {
    return g.studentId !== studentId;
  });
  const finances = getData(STORAGE_KEYS.finances).filter(function (f) {
    return f.studentId !== studentId;
  });

  saveData(STORAGE_KEYS.students, students);
  saveData(STORAGE_KEYS.grades, grades);
  saveData(STORAGE_KEYS.finances, finances);

  if (editingId.value === studentId) {
    studentForm.reset();
  }
  formMessage.className = "message";
  formMessage.textContent = "Student " + studentId + " was deleted.";
  showEverything();
}

/* ---------- Showing data ---------- */

// Counts of students in each cohort
function showCohortSummary() {
  const students = getData(STORAGE_KEYS.students);
  const list = document.getElementById("cohortSummary");
  list.innerHTML = "";

  for (let i = 0; i < COHORTS.length; i++) {
    let count = 0;
    for (let j = 0; j < students.length; j++) {
      if (students[j].cohort === COHORTS[i]) {
        count++;
      }
    }
    list.innerHTML += "<li><strong>" + count + "</strong>" + escapeHtml(COHORTS[i]) + "</li>";
  }
}

// The table of students (uses the search box, filters and sorting)
function showTable() {
  const students = getData(STORAGE_KEYS.students);
  const searchText = searchBox.value.trim().toLowerCase();

  const matches = students.filter(function (s) {
    const text = (s.studentId + " " + s.firstName + " " + s.lastName + " " + s.email).toLowerCase();
    const cohortOk = cohortFilter.value === "" || s.cohort === cohortFilter.value;
    const statusOk = statusFilter.value === "" || s.status === statusFilter.value;
    return text.includes(searchText) && cohortOk && statusOk;
  });

  matches.sort(function (a, b) {
    const result = String(a[sortKey]).localeCompare(String(b[sortKey]));
    return sortAscending ? result : -result;
  });

  studentTableBody.innerHTML = "";

  if (matches.length === 0) {
    studentTableBody.innerHTML =
      '<tr><td colspan="7"><div class="empty-note">No students to show yet.</div></td></tr>';
  }

  for (let i = 0; i < matches.length; i++) {
    const s = matches[i];
    studentTableBody.innerHTML +=
      "<tr><td>" + escapeHtml(s.studentId) + "</td>" +
      "<td>" + escapeHtml(s.lastName + ", " + s.firstName) + "</td>" +
      "<td>" + escapeHtml(s.gradeLevel) + "</td>" +
      "<td>" + escapeHtml(s.cohort) + "</td>" +
      "<td>" + escapeHtml(s.guardianName) + "<br>" + escapeHtml(s.guardianPhone) + "</td>" +
      "<td>" + escapeHtml(s.status) + "</td>" +
      '<td><button type="button" class="btn small" data-action="edit" data-id="' + escapeHtml(s.studentId) + '">Edit</button> ' +
      '<button type="button" class="btn small danger" data-action="delete" data-id="' + escapeHtml(s.studentId) + '">Delete</button></td></tr>';
  }

  document.getElementById("resultCount").textContent =
    "Showing " + matches.length + " of " + students.length + " students";
}

function showEverything() {
  showCohortSummary();
  showTable();
}

/* ---------- Start the page ---------- */

// Fill the drop-down lists
fillSelect(document.getElementById("gradeLevel"), GRADE_LEVELS);
fillSelect(document.getElementById("cohort"), COHORTS);
fillSelect(cohortFilter, COHORTS);

// The date of birth cannot be after today
document.getElementById("dob").max = getTodayText();

showEverything();

// Save button (the form uses novalidate, so we check the fields ourselves)
studentForm.addEventListener("submit", function (event) {
  event.preventDefault();

  if (!validateForm()) {
    formMessage.className = "message error";
    formMessage.textContent = "Please fix the errors shown above.";
    return;
  }

  saveStudent();
  studentForm.reset();
  showEverything();
});

// Clear form button
studentForm.addEventListener("reset", function () {
  stopEdit();
});

// Cancel edit button
cancelBtn.addEventListener("click", function () {
  studentForm.reset();
  formMessage.textContent = "";
});

// Edit and Delete buttons inside the table
studentTableBody.addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  if (button.dataset.action === "edit") {
    startEdit(button.dataset.id);
  } else if (button.dataset.action === "delete") {
    deleteStudent(button.dataset.id);
  }
});

// Search and filters
searchBox.addEventListener("input", showTable);
cohortFilter.addEventListener("change", showTable);
statusFilter.addEventListener("change", showTable);

// Sort buttons in the table heading
const sortButtons = document.querySelectorAll(".sort");
for (let i = 0; i < sortButtons.length; i++) {
  sortButtons[i].addEventListener("click", function () {
    const key = sortButtons[i].dataset.key;
    if (sortKey === key) {
      sortAscending = !sortAscending;
    } else {
      sortKey = key;
      sortAscending = true;
    }
    showTable();
  });
}

// The dashboard links here with ?edit=S2026-001 to open a student for updating
const editParameter = new URLSearchParams(window.location.search).get("edit");
if (editParameter) {
  startEdit(editParameter);
}
