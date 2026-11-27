/*
  CIT2011 Web Programming - School Portal Group Project
  File: js/teacher-report.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163

  Report card generator - compiles one student's saved scores into an on-screen report card
*/

// Get page elements
const reportLevel = document.getElementById("reportLevel");
const studentSelect = document.getElementById("studentSelect");
const generateBtn = document.getElementById("generateBtn");
const printButton = document.getElementById("printButton");
const reportMessage = document.getElementById("reportMessage");
const reportCard = document.getElementById("reportCard");

// Report card display fields
const cardName = document.getElementById("cardName");
const cardId = document.getElementById("cardId");
const cardGrade = document.getElementById("cardGrade");
const cardCohort = document.getElementById("cardCohort");
const cardGuardian = document.getElementById("cardGuardian");
const cardDate = document.getElementById("cardDate");
const reportBody = document.getElementById("reportBody");
const cardOverall = document.getElementById("cardOverall");
const cardLetter = document.getElementById("cardLetter");
const cardCount = document.getElementById("cardCount");
const cardBest = document.getElementById("cardBest");
const cardWorst = document.getElementById("cardWorst");
const cardBars = document.getElementById("cardBars");
const cardRemark = document.getElementById("cardRemark");
const cardTeacher = document.getElementById("cardTeacher");

// Fill the student dropdown based on the selected grade level
function fillStudentDropdown() {
  const chosenLevel = reportLevel.value;
  const allStudents = getData(STORAGE_KEYS.students) || [];
  studentSelect.innerHTML = '<option value="">Select a student...</option>';

  const filtered = allStudents.filter(function (s) {
    if (s.status !== "Active") {
      return false;
    }
    if (chosenLevel === "" || chosenLevel === "All grade levels") {
      return true;
    }
    return s.gradeLevel === chosenLevel;
  });

  for (let i = 0; i < filtered.length; i++) {
    const s = filtered[i];
    const opt = document.createElement("option");
    opt.value = s.studentId;
    opt.textContent = s.lastName + ", " + s.firstName + " (" + s.studentId + ")";
    studentSelect.appendChild(opt);
  }
}

// Build a short teacher remark based on the overall average
function getTeacherRemark(overall) {
  if (overall >= 85) {
    return "Outstanding academic performance across subjects. Keep up the excellent work!";
  }
  if (overall >= 70) {
    return "Very good performance overall. Continue applying consistent effort.";
  }
  if (overall >= 55) {
    return "Satisfactory progress. Greater focus on weaker subjects will raise the overall average.";
  }
  return "Academic support recommended. Please schedule a review with subject teachers.";
}

// Generate the report card for the selected student
function generateReportCard() {
  reportMessage.textContent = "";
  reportCard.hidden = true;
  if (printButton) {
    printButton.disabled = true;
  }

  const selectedId = studentSelect.value;
  if (selectedId === "") {
    reportMessage.textContent = "Please select a student first.";
    return;
  }

  const students = getData(STORAGE_KEYS.students) || [];
  const grades = getData(STORAGE_KEYS.grades) || [];

  const student = students.find(function (s) {
    return s.studentId === selectedId;
  });

  if (!student) {
    reportMessage.textContent = "Selected student could not be found.";
    return;
  }

  // Get all saved grades belonging to this student
  const studentGrades = grades.filter(function (g) {
    return g.studentId === selectedId;
  });

  if (studentGrades.length === 0) {
    reportMessage.textContent =
      "No grades have been recorded for " + student.firstName + " " + student.lastName + " yet.";
    return;
  }

  // Collect unique subjects this student has grades for
  const subjects = [];
  for (let i = 0; i < studentGrades.length; i++) {
    if (subjects.indexOf(studentGrades[i].subject) === -1) {
      subjects.push(studentGrades[i].subject);
    }
  }
  subjects.sort();

  // Fill student header info on the report card
  cardName.textContent = student.firstName + " " + student.lastName;
  cardId.textContent = student.studentId;
  cardGrade.textContent = student.gradeLevel;
  cardCohort.textContent = student.cohort || "-";
  cardGuardian.textContent = student.guardianName || student.guardian || "-";
  cardDate.textContent = getTodayText();

  const account = getLoggedInAccount();
  if (cardTeacher) {
    cardTeacher.textContent = account ? account.fullName : "Class Teacher";
  }

  // Build subject rows and calculate subject averages
  reportBody.innerHTML = "";
  if (cardBars) {
    cardBars.innerHTML = "";
  }

  let sumOfAverages = 0;
  let bestSubject = { name: "", avg: -1 };
  let worstSubject = { name: "", avg: 101 };

  for (let i = 0; i < subjects.length; i++) {
    const subj = subjects[i];
    const subjAvg = getSubjectAverage(grades, selectedId, subj);
    const letter = subjAvg !== null ? getLetterGrade(subjAvg) : "-";

    if (subjAvg !== null) {
      sumOfAverages += subjAvg;

      if (subjAvg > bestSubject.avg) {
        bestSubject = { name: subj, avg: subjAvg };
      }
      if (subjAvg < worstSubject.avg) {
        worstSubject = { name: subj, avg: subjAvg };
      }
    }

    // Build table row: Subject + 5 assessments + Average + Letter
    let rowHtml = "<tr><td>" + escapeHtml(subj) + "</td>";

    for (let a = 0; a < ASSESSMENTS.length; a++) {
      const assessName = ASSESSMENTS[a];
      const match = studentGrades.find(function (g) {
        return g.subject === subj && g.assessment === assessName;
      });
      rowHtml += "<td>" + (match ? match.score : "-") + "</td>";
    }

    rowHtml +=
      "<td><strong>" + (subjAvg !== null ? subjAvg.toFixed(1) : "-") + "</strong></td>" +
      "<td>" + escapeHtml(letter) + "</td></tr>";

    reportBody.innerHTML += rowHtml;

    // Build optional visual bar if #cardBars exists on the page
    if (cardBars && subjAvg !== null) {
      cardBars.innerHTML +=
        '<div class="bar-row">' +
        "<span>" + escapeHtml(subj) + " (" + subjAvg.toFixed(1) + "%)</span>" +
        '<div class="bar-track"><div class="bar-fill" style="width:' + subjAvg.toFixed(0) + '%"></div></div>' +
        "</div>";
    }
  }

  // Calculate overall average (average of subject averages)
  const overallAvg = subjects.length > 0 ? sumOfAverages / subjects.length : 0;

  cardOverall.textContent = overallAvg.toFixed(1) + "%";
  cardLetter.textContent = getLetterGrade(overallAvg);
  cardCount.textContent = subjects.length;
  cardBest.textContent =
    bestSubject.avg >= 0 ? bestSubject.name + " (" + bestSubject.avg.toFixed(1) + "%)" : "-";
  cardWorst.textContent =
    worstSubject.avg <= 100 ? worstSubject.name + " (" + worstSubject.avg.toFixed(1) + "%)" : "-";

  if (cardRemark) {
    cardRemark.textContent = getTeacherRemark(overallAvg);
  }

  // Reveal report card and enable print button
  reportCard.hidden = false;
  if (printButton) {
    printButton.disabled = false;
  }
}

/* ---------- Start the page ---------- */

// Add "All grade levels" option and populate GRADE_LEVELS
reportLevel.innerHTML = '<option value="All grade levels">All grade levels</option>';
fillSelect(reportLevel, GRADE_LEVELS);
fillStudentDropdown();

// Check if ?student=ID was passed in the URL from the dashboard
const params = new URLSearchParams(window.location.search);
const preselectedStudent = params.get("student");

if (preselectedStudent) {
  const allStudents = getData(STORAGE_KEYS.students) || [];
  const found = allStudents.find(function (s) {
    return s.studentId === preselectedStudent;
  });

  if (found) {
    reportLevel.value = found.gradeLevel;
    fillStudentDropdown();
    studentSelect.value = preselectedStudent;
    generateReportCard();
  }
}

// Event listeners
reportLevel.addEventListener("change", function () {
  fillStudentDropdown();
  reportCard.hidden = true;
  reportMessage.textContent = "";
  if (printButton) {
    printButton.disabled = true;
  }
});

generateBtn.addEventListener("click", generateReportCard);

if (printButton) {
  printButton.addEventListener("click", function () {
    window.print();
  });
}
