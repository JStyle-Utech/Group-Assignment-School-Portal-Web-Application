/*
  School Portal - teacher-subjects.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Subjects page - choose a grade level and subject, then load the student list
  Note: storage.js, auth.js and teacher-flow.js must be loaded before this file
*/

// Get the page elements we need
const levelSelect = document.getElementById("levelSelect");
const subjectSelect = document.getElementById("subjectSelect");
const loadBtn = document.getElementById("loadBtn");
const subjectInfo = document.getElementById("subjectInfo");
const studentPanel = document.getElementById("studentPanel");
const subjectStudents = document.getElementById("subjectStudents");

function setSelectError(fieldId, message) {
  document.getElementById(fieldId + "Error").textContent = message;
  const field = document.getElementById(fieldId);
  if (message === "") {
    field.classList.remove("invalid");
  } else {
    field.classList.add("invalid");
  }
}

// Fills the subject list with the subjects offered in the chosen grade level
function fillSubjectList() {
  const level = levelSelect.value;
  subjectSelect.innerHTML = '<option value="">Select...</option>';

  if (level === "") {
    subjectSelect.disabled = true;
    subjectInfo.textContent = "Choose a grade level first. Then the subjects for that level will appear.";
    return;
  }

  const list = getSubjectsForLevel(level);
  fillSelect(subjectSelect, list);
  subjectSelect.disabled = false;
  subjectInfo.textContent = level + " offers " + list.length + " subjects. Choose one.";
}

// Loads the students of the chosen level and remembers the choice for the other pages
function showStudents() {
  setSelectError("levelSelect", "");
  setSelectError("subjectSelect", "");

  if (levelSelect.value === "") {
    setSelectError("levelSelect", "Choose a grade level.");
    return;
  }
  if (subjectSelect.value === "") {
    setSelectError("subjectSelect", "Choose a subject.");
    return;
  }

  const level = levelSelect.value;
  const subject = subjectSelect.value;
  saveChoice(level, subject);

  const students = getActiveStudentsInLevel(level);
  const grades = getData(STORAGE_KEYS.grades);
  subjectStudents.innerHTML = "";

  if (students.length === 0) {
    subjectStudents.innerHTML =
      '<tr><td colspan="5"><div class="empty-note">No active students are registered in ' +
      escapeHtml(level) + " yet.</div></td></tr>";
  }

  for (let i = 0; i < students.length; i++) {
    const s = students[i];

    // Count this student's scores in the chosen subject
    let count = 0;
    for (let j = 0; j < grades.length; j++) {
      if (grades[j].studentId === s.studentId && grades[j].subject === subject) {
        count++;
      }
    }

    const average = getSubjectAverage(grades, s.studentId, subject);
    let averageText = "-";
    if (average !== null) {
      averageText = average.toFixed(1) + " (" + getLetterGrade(average) + ")";
    }

    subjectStudents.innerHTML +=
      "<tr><td>" + escapeHtml(s.studentId) + "</td>" +
      "<td>" + escapeHtml(s.lastName + ", " + s.firstName) + "</td>" +
      "<td>" + escapeHtml(s.cohort) + "</td>" +
      "<td>" + count + "</td>" +
      "<td>" + averageText + "</td></tr>";
  }

  document.getElementById("studentHeadingText").textContent = level + " - " + subject;
  document.getElementById("subjectCount").textContent = students.length + " active student(s)";
  studentPanel.hidden = false;
}

/* ---------- Start the page ---------- */

fillSelect(levelSelect, GRADE_LEVELS);

// When the page opens again, show the choice made earlier
const earlierChoice = getChoice();
if (earlierChoice) {
  levelSelect.value = earlierChoice.level;
  fillSubjectList();
  subjectSelect.value = earlierChoice.subject;
  showStudents();
}

// Changing the level changes the subject list, and hides the old student list
levelSelect.addEventListener("change", function () {
  fillSubjectList();
  studentPanel.hidden = true;
  setSelectError("levelSelect", "");
});

subjectSelect.addEventListener("change", function () {
  studentPanel.hidden = true;
  setSelectError("subjectSelect", "");
});

loadBtn.addEventListener("click", showStudents);
