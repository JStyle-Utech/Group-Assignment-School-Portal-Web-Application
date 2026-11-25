/*
  School Portal - dashboard.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Fills the administrator dashboard with live data from localStorage
  Note: storage.js and auth.js must be loaded before this file
*/

// Get the page elements we need
const dashSearch = document.getElementById("dashSearch");
const dashCohort = document.getElementById("dashCohort");
const dashAssessment = document.getElementById("dashAssessment");
const statusPills = document.getElementById("statusPills");

// Remembers which status button is selected in the ledger section
let selectedStatus = "";

// How many rows to show in each preview table
const PREVIEW_ROWS = 6;

/* ---------- Summary cards ---------- */

function showSummaryCards() {
  const students = getData(STORAGE_KEYS.students);
  const grades = getData(STORAGE_KEYS.grades);
  const records = getData(STORAGE_KEYS.finances);

  // Students
  let activeCount = 0;
  for (let i = 0; i < students.length; i++) {
    if (students[i].status === "Active") {
      activeCount++;
    }
  }
  document.getElementById("statStudents").textContent = students.length;
  document.getElementById("statActive").textContent = activeCount;
  document.getElementById("statInactive").textContent = students.length - activeCount;

  // Grades
  let scoreTotal = 0;
  const subjectsUsed = [];
  for (let i = 0; i < grades.length; i++) {
    scoreTotal = scoreTotal + grades[i].score;
    if (!subjectsUsed.includes(grades[i].subject)) {
      subjectsUsed.push(grades[i].subject);
    }
  }
  document.getElementById("statGrades").textContent = grades.length;
  document.getElementById("statSubjects").textContent = subjectsUsed.length;
  if (grades.length > 0) {
    document.getElementById("statAverage").textContent =
      (scoreTotal / grades.length).toFixed(1) + "%";
  } else {
    document.getElementById("statAverage").textContent = "-";
  }

  // Finance
  let billed = 0;
  let collected = 0;
  for (let i = 0; i < records.length; i++) {
    billed = billed + records[i].amountDue;
    collected = collected + getAmountPaid(records[i]);
  }
  document.getElementById("statBilled").textContent = formatMoney(billed);
  document.getElementById("statCollected").textContent = formatMoney(collected);
  document.getElementById("statBalance").textContent = formatMoney(billed - collected);
}

/* ---------- Student Registry section ---------- */

// Bars showing how many students are in each cohort
function showCohortBars() {
  const students = getData(STORAGE_KEYS.students);
  const list = document.getElementById("cohortBars");
  list.innerHTML = "";

  // Count students in each cohort and find the biggest count
  const counts = [];
  let biggest = 1;
  for (let i = 0; i < COHORTS.length; i++) {
    let count = 0;
    for (let j = 0; j < students.length; j++) {
      if (students[j].cohort === COHORTS[i]) {
        count++;
      }
    }
    counts.push(count);
    if (count > biggest) {
      biggest = count;
    }
  }

  for (let i = 0; i < COHORTS.length; i++) {
    const width = (counts[i] / biggest) * 100;
    list.innerHTML +=
      "<li><span>" + escapeHtml(COHORTS[i]) + "</span>" +
      '<span class="bar-track"><span class="bar-fill" style="display:block;width:' + width + '%"></span></span>' +
      '<span class="bar-value">' + counts[i] + "</span></li>";
  }
}

// Table of students (uses the search box and cohort drop-down)
function showStudentPreview() {
  const students = getData(STORAGE_KEYS.students);
  const searchText = dashSearch.value.trim().toLowerCase();
  const cohort = dashCohort.value;
  const body = document.getElementById("dashStudentBody");

  const matches = students.filter(function (student) {
    const text = (student.studentId + " " + student.firstName + " " + student.lastName).toLowerCase();
    return text.includes(searchText) && (cohort === "" || student.cohort === cohort);
  });

  matches.sort(function (a, b) {
    return a.lastName.localeCompare(b.lastName);
  });

  body.innerHTML = "";

  if (matches.length === 0) {
    body.innerHTML =
      '<tr><td colspan="6"><div class="empty-note">No students found. ' +
      '<a class="text-link" href="students.html#formHeading">Register a student</a></div></td></tr>';
  }

  for (let i = 0; i < matches.length && i < PREVIEW_ROWS; i++) {
    const s = matches[i];
    body.innerHTML +=
      "<tr><td>" + escapeHtml(s.studentId) + "</td>" +
      "<td>" + escapeHtml(s.lastName + ", " + s.firstName) + "</td>" +
      "<td>" + escapeHtml(s.gradeLevel) + "</td>" +
      "<td>" + escapeHtml(s.cohort) + "</td>" +
      "<td>" + escapeHtml(s.status) + "</td>" +
      '<td><a class="text-link" href="students.html?edit=' + encodeURIComponent(s.studentId) + '">Edit</a></td></tr>';
  }

  if (matches.length > PREVIEW_ROWS) {
    document.getElementById("dashCount").textContent =
      "Showing " + PREVIEW_ROWS + " of " + matches.length + " students";
  } else {
    document.getElementById("dashCount").textContent = matches.length + " student(s)";
  }
}

/* ---------- Academic Matrix section ---------- */

// Bars showing the average score for each subject
function showSubjectBars() {
  const grades = getData(STORAGE_KEYS.grades);
  const assessment = dashAssessment.value;
  const list = document.getElementById("subjectBars");
  list.innerHTML = "";

  for (let i = 0; i < SUBJECTS.length; i++) {
    let total = 0;
    let count = 0;
    for (let j = 0; j < grades.length; j++) {
      const sameSubject = grades[j].subject === SUBJECTS[i];
      const sameAssessment = assessment === "" || grades[j].assessment === assessment;
      if (sameSubject && sameAssessment) {
        total = total + grades[j].score;
        count++;
      }
    }

    let width = 0;
    let label = "-";
    if (count > 0) {
      width = total / count;
      label = width.toFixed(1) + "%";
    }

    list.innerHTML +=
      "<li><span>" + escapeHtml(SUBJECTS[i]) + "</span>" +
      '<span class="bar-track"><span class="bar-fill" style="display:block;width:' + width + '%"></span></span>' +
      '<span class="bar-value">' + label + "</span></li>";
  }
}

/* ---------- Financial Ledger section ---------- */

// Updates the number on each status button, for example "Paid (3)"
function showStatusCounts(records) {
  const buttons = statusPills.querySelectorAll(".pill");
  for (let i = 0; i < buttons.length; i++) {
    const status = buttons[i].dataset.status;
    let count = 0;
    for (let j = 0; j < records.length; j++) {
      if (status === "" || getAccountStatus(records[j]) === status) {
        count++;
      }
    }
    buttons[i].textContent = (status === "" ? "All" : status) + " (" + count + ")";
  }
}

function showLedgerPreview() {
  const records = getData(STORAGE_KEYS.finances);
  const body = document.getElementById("dashLedgerBody");
  showStatusCounts(records);

  // Newest records first
  const sorted = records.slice().reverse();
  const matches = sorted.filter(function (record) {
    return selectedStatus === "" || getAccountStatus(record) === selectedStatus;
  });

  body.innerHTML = "";

  if (matches.length === 0) {
    body.innerHTML =
      '<tr><td colspan="5"><div class="empty-note">No ledger records to show. ' +
      '<a class="text-link" href="finance.html">Add a charge</a></div></td></tr>';
  }

  for (let i = 0; i < matches.length && i < PREVIEW_ROWS; i++) {
    const r = matches[i];
    const status = getAccountStatus(r);
    body.innerHTML +=
      "<tr><td>" + escapeHtml(getStudentName(r.studentId)) + "</td>" +
      "<td>" + escapeHtml(r.description) + "</td>" +
      "<td>" + escapeHtml(r.dueDate) + "</td>" +
      "<td>" + formatMoney(getBalance(r)) + "</td>" +
      '<td><span class="badge ' + getStatusClass(status) + '">' + status + "</span></td></tr>";
  }
}

/* ---------- Start the page ---------- */

fillSelect(dashCohort, COHORTS);
fillSelect(dashAssessment, ASSESSMENTS);

showSummaryCards();
showCohortBars();
showStudentPreview();
showSubjectBars();
showLedgerPreview();

// Update the student table while the user types or changes the cohort
dashSearch.addEventListener("input", showStudentPreview);
dashCohort.addEventListener("change", showStudentPreview);

// Update the subject bars when the assessment changes
dashAssessment.addEventListener("change", showSubjectBars);

// Status buttons in the ledger section
statusPills.addEventListener("click", function (event) {
  const button = event.target.closest(".pill");
  if (!button) {
    return;
  }
  selectedStatus = button.dataset.status;

  const allButtons = statusPills.querySelectorAll(".pill");
  for (let i = 0; i < allButtons.length; i++) {
    allButtons[i].classList.remove("active");
  }
  button.classList.add("active");

  showLedgerPreview();
});
