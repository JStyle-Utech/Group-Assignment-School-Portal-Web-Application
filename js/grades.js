/*
  School Portal - grades.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Academic Matrix - enter, store and manage student grades
  Note: storage.js, auth.js and batch-upload.js must be loaded before this file
*/

// Get the page elements we need
const entrySubject = document.getElementById("entrySubject");
const entryAssessment = document.getElementById("entryAssessment");
const entryCohort = document.getElementById("entryCohort");
const entryGradeLevel = document.getElementById("entryGradeLevel");
const uploadBatchBtn = document.getElementById("uploadBatchBtn");
const batchFileInput = document.getElementById("batchFileInput");
const templateBtn = document.getElementById("templateBtn");
const batchResult = document.getElementById("batchResult");
const entryBody = document.getElementById("entryBody");
const entryMessage = document.getElementById("entryMessage");
const matrixSearch = document.getElementById("matrixSearch");
const matrixCohort = document.getElementById("matrixCohort");
const matrixAssessment = document.getElementById("matrixAssessment");
const recordSearch = document.getElementById("recordSearch");
const recordSubject = document.getElementById("recordSubject");

/* ---------- Helper functions ---------- */

// Finds the position of a grade in the list (or -1 if it is not there)
function findGradeIndex(grades, studentId, subject, assessment) {
  for (let i = 0; i < grades.length; i++) {
    const g = grades[i];
    if (g.studentId === studentId && g.subject === subject && g.assessment === assessment) {
      return i;
    }
  }
  return -1;
}

// CSS class for a letter grade, for example "A" gives "grade-a"
function getGradeClass(letter) {
  return "grade-" + letter.toLowerCase();
}

// Average score of one student in one subject
// If an assessment is chosen, only that assessment is used
// Returns null when the student has no grades there
function getAverage(grades, studentId, subject, assessment) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < grades.length; i++) {
    const g = grades[i];
    const sameAssessment = assessment === "" || g.assessment === assessment;
    if (g.studentId === studentId && g.subject === subject && sameAssessment) {
      total = total + g.score;
      count++;
    }
  }
  if (count === 0) {
    return null;
  }
  return total / count;
}

/* ---------- Section 1: enter grades ---------- */

function showEntryGrid() 
{
  const students = getData(STORAGE_KEYS.students);
  const grades = getData(STORAGE_KEYS.grades);
  entryBody.innerHTML = "";
  entryMessage.textContent = "";

  if (entrySubject.value === "") {
    entryBody.innerHTML =
      '<tr><td colspan="5"><div class="empty-note">Choose a subject to start entering grades.</div></td></tr>';
    return;
  }

  // Only active students, filtered by cohort and grade level
  const list = students.filter(function (s) {
    const cohortOk = entryCohort.value === "" || s.cohort === entryCohort.value;
    const gradeOk = entryGradeLevel.value === "" || s.gradeLevel === entryGradeLevel.value;
    return s.status === "Active" && cohortOk && gradeOk;
  });

  list.sort(function (a, b) {
    return a.lastName.localeCompare(b.lastName);
  });

  if (list.length === 0) {
    entryBody.innerHTML =
      '<tr><td colspan="5"><div class="empty-note">No active students found. ' +
      '<a class="text-link" href="students.html#formHeading">Register a student</a></div></td></tr>';
    return;
  }

  for (let i = 0; i < list.length; i++) {
    const s = list[i];

    // If a grade is already saved, show it in the box
    const index = findGradeIndex(grades, s.studentId, entrySubject.value, entryAssessment.value);
    let score = "";
    let letter = "";
    if (index !== -1) {
      score = grades[index].score;
      letter = getLetterGrade(score);
    }

    entryBody.innerHTML +=
      "<tr><td>" + escapeHtml(s.studentId) + "</td>" +
      "<td>" + escapeHtml(s.lastName + ", " + s.firstName) + "</td>" +
      "<td>" + escapeHtml(s.gradeLevel) + "</td>" +
      '<td><input type="number" class="score-input" min="0" max="100" step="0.1" ' +
      'aria-label="Score for ' + escapeHtml(s.firstName + " " + s.lastName) + '" ' +
      'data-student="' + escapeHtml(s.studentId) + '" value="' + score + '" /></td>' +
      '<td class="letter-cell">' + letter + "</td></tr>";
  }
}


// Shows the letter grade right away while the user types a score
function updateLetter(input) {
  const letterCell = input.parentElement.nextElementSibling;
  const text = input.value.trim();
  const score = Number(text);

  input.classList.remove("invalid");

  if (text === "") {
    letterCell.textContent = "";
  } else if (isNaN(score) || score < 0 || score > 100) {
    letterCell.textContent = "?";
    input.classList.add("invalid");
  } else {
    letterCell.textContent = getLetterGrade(score);
  }
}

// Checks all the boxes, then saves every grade
function saveGrades() {
  if (entrySubject.value === "") {
    entryMessage.className = "message error";
    entryMessage.textContent = "Choose a subject first.";
    return;
  }

  const inputs = entryBody.querySelectorAll(".score-input");
  if (inputs.length === 0) {
    entryMessage.className = "message error";
    entryMessage.textContent = "There are no students to save grades for.";
    return;
  }

  // Step 1: check every score
  let errorCount = 0;
  for (let i = 0; i < inputs.length; i++) {
    const text = inputs[i].value.trim();
    const score = Number(text);
    inputs[i].classList.remove("invalid");
    if (text !== "" && (isNaN(score) || score < 0 || score > 100)) {
      inputs[i].classList.add("invalid");
      errorCount++;
    }
  }

  if (errorCount > 0) {
    entryMessage.className = "message error";
    entryMessage.textContent = "Scores must be numbers from 0 to 100. Fix the red boxes.";
    return;
  }

  // Step 2: save, update or remove each grade
  let grades = getData(STORAGE_KEYS.grades);
  let savedCount = 0;
  let removedCount = 0;

  for (let i = 0; i < inputs.length; i++) {
    const studentId = inputs[i].dataset.student;
    const text = inputs[i].value.trim();
    const index = findGradeIndex(grades, studentId, entrySubject.value, entryAssessment.value);

    if (text === "") {
      if (index !== -1) {
        grades.splice(index, 1);
        removedCount++;
      }
    } else if (index !== -1) {
      grades[index].score = Number(text);
      grades[index].dateEntered = getTodayText();
      savedCount++;
    } else {
      grades.push({
        gradeId: "G" + getNextNumber(grades, "gradeId"),
        studentId: studentId,
        subject: entrySubject.value,
        assessment: entryAssessment.value,
        score: Number(text),
        dateEntered: getTodayText(),
      });
      savedCount++;
    }
  }

  saveData(STORAGE_KEYS.grades, grades);

  entryMessage.className = "message";
  entryMessage.textContent =
    "Saved " + savedCount + " grade(s) for " + entrySubject.value +
    " (" + entryAssessment.value + "). Removed " + removedCount + ".";

  showMatrix();
  showRecords();
}

/* ---------- Section 2: academic matrix ---------- */

function showMatrix() {
  const students = getData(STORAGE_KEYS.students);
  const grades = getData(STORAGE_KEYS.grades);
  const searchText = matrixSearch.value.trim().toLowerCase();
  const head = document.getElementById("matrixHead");
  const body = document.getElementById("matrixBody");

  // Table heading: Student, each subject, Average
  let headingHtml = '<tr><th scope="col">Student</th>';
  for (let i = 0; i < SUBJECTS.length; i++) {
    headingHtml += '<th scope="col">' + escapeHtml(SUBJECTS[i]) + "</th>";
  }
  headingHtml += '<th scope="col">Average</th></tr>';
  head.innerHTML = headingHtml;

  const list = students.filter(function (s) {
    const text = (s.studentId + " " + s.firstName + " " + s.lastName).toLowerCase();
    const cohortOk = matrixCohort.value === "" || s.cohort === matrixCohort.value;
    return text.includes(searchText) && cohortOk;
  });

  list.sort(function (a, b) {
    return a.lastName.localeCompare(b.lastName);
  });

  body.innerHTML = "";

  if (list.length === 0) {
    body.innerHTML =
      '<tr><td colspan="' + (SUBJECTS.length + 2) + '"><div class="empty-note">No students to show.</div></td></tr>';
  }

  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    let rowHtml =
      "<tr><td>" + escapeHtml(s.lastName + ", " + s.firstName) +
      "<br><small>" + escapeHtml(s.studentId) + "</small></td>";

    let total = 0;
    let count = 0;

    for (let j = 0; j < SUBJECTS.length; j++) {
      const average = getAverage(grades, s.studentId, SUBJECTS[j], matrixAssessment.value);
      if (average === null) {
        rowHtml += "<td>-</td>";
      } else {
        total = total + average;
        count++;
        rowHtml +=
          '<td class="' + getGradeClass(getLetterGrade(average)) + '">' + average.toFixed(1) + "</td>";
      }
    }

  

    // Overall average of the subjects that have grades
    if (count === 0) {
      rowHtml += "<td>-</td></tr>";
    } else {
      const overall = total / count;
      rowHtml +=
        '<td class="' + getGradeClass(getLetterGrade(overall)) + '"><strong>' +
        overall.toFixed(1) + " (" + getLetterGrade(overall) + ")</strong></td></tr>";
    }

    body.innerHTML += rowHtml;
  }

  document.getElementById("matrixCount").textContent = list.length + " student(s)";
}

/* ---------- Section 3: saved grade records ---------- */

function showRecords() {
  const grades = getData(STORAGE_KEYS.grades);
  const searchText = recordSearch.value.trim().toLowerCase();
  const body = document.getElementById("recordBody");

  // Newest records first
  const matches = grades.slice().reverse().filter(function (g) {
    const text = (g.studentId + " " + getStudentName(g.studentId)).toLowerCase();
    const subjectOk = recordSubject.value === "" || g.subject === recordSubject.value;
    return text.includes(searchText) && subjectOk;
  });

  body.innerHTML = "";

  if (matches.length === 0) {
    body.innerHTML =
      '<tr><td colspan="7"><div class="empty-note">No grade records yet.</div></td></tr>';
  }

  for (let i = 0; i < matches.length; i++) {
    const g = matches[i];
    const letter = getLetterGrade(g.score);
    body.innerHTML +=
      "<tr><td>" + escapeHtml(getStudentName(g.studentId)) + "</td>" +
      "<td>" + escapeHtml(g.subject) + "</td>" +
      "<td>" + escapeHtml(g.assessment) + "</td>" +
      "<td>" + g.score + "</td>" +
      '<td><span class="badge ' + getGradeClass(letter) + '">' + letter + "</span></td>" +
      "<td>" + escapeHtml(g.dateEntered) + "</td>" +
      '<td><button type="button" class="btn small danger" data-id="' + escapeHtml(g.gradeId) + '">Delete</button></td></tr>';
  }

  document.getElementById("recordCount").textContent = matches.length + " record(s)";
}

/* ---------- Start the page ---------- */

fillSelect(entrySubject, SUBJECTS);
fillSelect(entryAssessment, ASSESSMENTS);
fillSelect(entryCohort, COHORTS);
fillSelect(entryGradeLevel, GRADE_LEVELS);
fillSelect(matrixCohort, COHORTS);
fillSelect(matrixAssessment, ASSESSMENTS);
fillSelect(recordSubject, SUBJECTS);

showEntryGrid();
showMatrix();
showRecords();

// Redraw the entry grid when any choice changes
entrySubject.addEventListener("change", showEntryGrid);
entryAssessment.addEventListener("change", showEntryGrid);
entryCohort.addEventListener("change", showEntryGrid);
entryGradeLevel.addEventListener("change", showEntryGrid);

// Letter grade changes while typing
entryBody.addEventListener("input", function (event) {
  if (event.target.classList.contains("score-input")) {
    updateLetter(event.target);
  }
});

document.getElementById("saveGradesBtn").addEventListener("click", saveGrades);

// Matrix filters
matrixSearch.addEventListener("input", showMatrix);
matrixCohort.addEventListener("change", showMatrix);
matrixAssessment.addEventListener("change", showMatrix);

// Record filters
recordSearch.addEventListener("input", showRecords);
recordSubject.addEventListener("change", showRecords);

// Delete buttons in the records table
document.getElementById("recordBody").addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  if (!confirm("Delete this grade record?")) {
    return;
  }

  const grades = getData(STORAGE_KEYS.grades).filter(function (g) {
    return g.gradeId !== button.dataset.id;
  });
  saveData(STORAGE_KEYS.grades, grades);

  showEntryGrid();
  showMatrix();
  showRecords();
});

/* ---------- Batch upload (CSV file) ---------- */

// The active students in the entry grid (same filters as the grid), used for the template
function getEntryStudents() {
  return getData(STORAGE_KEYS.students).filter(function (s) {
    const cohortOk = entryCohort.value === "" || s.cohort === entryCohort.value;
    const gradeOk = entryGradeLevel.value === "" || s.gradeLevel === entryGradeLevel.value;
    return s.status === "Active" && cohortOk && gradeOk;
  });
}

// Download a template with the student IDs filled in
templateBtn.addEventListener("click", function () {
  downloadTemplate(getEntryStudents(), "grade-upload-template.csv");
});

// Upload CSV opens the file chooser
uploadBatchBtn.addEventListener("click", function () {
  if (entrySubject.value === "") {
    showBatchError(batchResult, "Choose a subject and an assessment first, then upload the file.");
    return;
  }
  batchFileInput.click();
});

// When a file is chosen, check every row and save the good ones
batchFileInput.addEventListener("change", function () {
  const file = batchFileInput.files[0];
  batchFileInput.value = ""; // so the same file can be chosen again
  runBatchUpload(
    file,
    { subject: entrySubject.value, assessment: entryAssessment.value, level: "" },
    batchResult,
    function () {
      showEntryGrid();
      showMatrix();
      showRecords();
    },
  );
});
