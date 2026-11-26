/*
  School Portal - teacher.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Fills the teacher dashboard with data from localStorage
  Note: storage.js, auth.js and teacher-flow.js must be loaded before this file
*/

// Get the page elements we need
const teacherSubject = document.getElementById("teacherSubject");
const teacherAssessment = document.getElementById("teacherAssessment");
const teacherBody = document.getElementById("teacherBody");

// Teacher profile box
function showTeacherProfile() {
  const account = getLoggedInAccount();
  if (!account) {
    return;
  }
  document.getElementById("profName").textContent = account.fullName;
  document.getElementById("profUsername").textContent = account.username;
  document.getElementById("profRole").textContent = "Teacher";
  document.getElementById("profEmail").textContent = account.email;

  // Show the grade level and subject chosen on the Subjects page
  const choice = getChoice();
  if (choice) {
    document.getElementById("profChoice").textContent = choice.level + " - " + choice.subject;
  } else {
    document.getElementById("profChoice").textContent = "None chosen yet";
  }
}

// Summary cards at the top
function showTeacherSummary() {
  const students = getData(STORAGE_KEYS.students);
  const grades = getData(STORAGE_KEYS.grades);

  let activeCount = 0;
  for (let i = 0; i < students.length; i++) {
    if (students[i].status === "Active") {
      activeCount++;
    }
  }

  document.getElementById("statStudents").textContent = activeCount;
  document.getElementById("statGrades").textContent = grades.length;
  document.getElementById("statSubjects").textContent = SUBJECTS.length;
}

// Table of active students with their scores in the chosen subject
function showSubjectStudents() {
  const students = getData(STORAGE_KEYS.students);
  const grades = getData(STORAGE_KEYS.grades);
  teacherBody.innerHTML = "";

  if (teacherSubject.value === "") {
    teacherBody.innerHTML =
      '<tr><td colspan="7"><div class="empty-note">Choose a subject to see your students.</div></td></tr>';
    return;
  }

  const list = students.filter(function (s) {
    return s.status === "Active";
  });

  list.sort(function (a, b) {
    return a.lastName.localeCompare(b.lastName);
  });

  if (list.length === 0) {
    teacherBody.innerHTML =
      '<tr><td colspan="7"><div class="empty-note">There are no active students yet.</div></td></tr>';
    return;
  }

  for (let i = 0; i < list.length; i++) {
    const s = list[i];

    // Add up this student's scores in the chosen subject
    let total = 0;
    let count = 0;
    for (let j = 0; j < grades.length; j++) {
      const sameStudent = grades[j].studentId === s.studentId;
      const sameSubject = grades[j].subject === teacherSubject.value;
      const sameAssessment =
        teacherAssessment.value === "" || grades[j].assessment === teacherAssessment.value;
      if (sameStudent && sameSubject && sameAssessment) {
        total = total + grades[j].score;
        count++;
      }
    }

    let average = "-";
    let letter = "-";
    let letterClass = "";
    if (count > 0) {
      average = (total / count).toFixed(1);
      letter = getLetterGrade(total / count);
      letterClass = ' class="grade-' + letter.toLowerCase() + '"';
    }

    teacherBody.innerHTML +=
      "<tr><td>" + escapeHtml(s.studentId) + "</td>" +
      "<td>" + escapeHtml(s.lastName + ", " + s.firstName) + "</td>" +
      "<td>" + escapeHtml(s.gradeLevel) + "</td>" +
      "<td>" + count + "</td>" +
      "<td>" + average + "</td>" +
      "<td" + letterClass + ">" + letter + "</td>" +
      '<td><a class="btn small" href="report-card.html?student=' + encodeURIComponent(s.studentId) + '">Report card</a></td></tr>';
  }
}

/* ---------- Start the page ---------- */

fillSelect(teacherSubject, SUBJECTS);
fillSelect(teacherAssessment, ASSESSMENTS);

showTeacherProfile();
showTeacherSummary();
showSubjectStudents();

teacherSubject.addEventListener("change", showSubjectStudents);
teacherAssessment.addEventListener("change", showSubjectStudents);
