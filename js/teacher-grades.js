/*
  CIT2011 Web Programming - School Portal Group Project
  File: js/teacher-grades.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2501978
    5. Ameallia Williams | 2502163

  Batch Grade Entry logic for teacher/grade-entry.html (score table and CSV batch upload)
  Note: storage.js, auth.js, teacher-flow.js and batch-upload.js must be loaded before this file
*/

document.addEventListener("DOMContentLoaded", function () {
  // Get page elements
  const noChoicePanel = document.getElementById("noChoicePanel");
  const entryPanel = document.getElementById("entryPanel");
  const choiceSummary = document.getElementById("choiceSummary");
  const assessmentSelect = document.getElementById("assessmentSelect");
  const gradesForm = document.getElementById("gradesForm");
  const gradeRows = document.getElementById("gradeRows");
  const formMessage = document.getElementById("formMessage");

  // Check sessionStorage for the selected subject and class
  const choice = getChoice();

  if (!choice || !choice.subject || !choice.level) {
    if (noChoicePanel) {
      noChoicePanel.hidden = false;
      noChoicePanel.style.display = "block";
    }
    if (entryPanel) {
      entryPanel.hidden = true;
      entryPanel.style.display = "none";
    }
    return;
  }

  // Show the entry form and display the selected class and subject
  if (noChoicePanel) {
    noChoicePanel.hidden = true;
    noChoicePanel.style.display = "none";
  }
  if (entryPanel) {
    entryPanel.hidden = false;
    entryPanel.style.display = "block";
  }
  if (choiceSummary) {
    choiceSummary.textContent = choice.level + " - " + choice.subject;
  }

  // Populate the assessment dropdown
  fillSelect(assessmentSelect, ASSESSMENTS);

  // Get active students in the chosen grade level
  const students = getActiveStudentsInLevel(choice.level);

  // Build table rows for the currently selected assessment
  function renderGradeRows() {
    gradeRows.innerHTML = "";
    formMessage.textContent = "";

    const selectedAssessment = assessmentSelect.value;
    const allGrades = getData(STORAGE_KEYS.grades) || [];

    students.forEach(function (student) {
      // Check if a grade already exists for this student, subject, and assessment
      const existingGrade = allGrades.find(function (g) {
        return (
          g.studentId === student.studentId &&
          g.subject === choice.subject &&
          g.assessment === selectedAssessment
        );
      });

      const currentScore = existingGrade ? existingGrade.score : "";
      const currentLetter = existingGrade ? getLetterGrade(existingGrade.score) : "-";

      const tr = document.createElement("tr");

      // Student ID cell
      const tdId = document.createElement("td");
      tdId.textContent = student.studentId;
      tr.appendChild(tdId);

      // Student Full Name cell
      const tdName = document.createElement("td");
      tdName.textContent = student.lastName + ", " + student.firstName;
      tr.appendChild(tdName);

      // Score Input cell
      const tdInput = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "100";
      input.step = "1";
      input.value = currentScore;
      input.dataset.studentId = student.studentId;
      tdInput.appendChild(input);
      tr.appendChild(tdInput);

      // Live Letter Grade cell
      const tdLetter = document.createElement("td");
      tdLetter.textContent = currentLetter;
      tr.appendChild(tdLetter);

      // Update letter grade live as the teacher types a score
      input.addEventListener("input", function () {
        const val = input.value.trim();
        if (val === "") {
          tdLetter.textContent = "-";
        } else {
          const num = Number(val);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            tdLetter.textContent = getLetterGrade(num);
          } else {
            tdLetter.textContent = "Invalid";
          }
        }
      });

      gradeRows.appendChild(tr);
    });
  }

  // Render rows on initial load and rebuild whenever the assessment changes
  renderGradeRows();
  assessmentSelect.addEventListener("change", renderGradeRows);

  // Validate and save all scores at once on submit
  gradesForm.addEventListener("submit", function (event) {
    event.preventDefault();
    formMessage.textContent = "";

    const selectedAssessment = assessmentSelect.value;
    const inputs = gradeRows.querySelectorAll("input[type='number']");
    const validEntries = [];

    // Validate every score input before saving anything
    for (let i = 0; i < inputs.length; i++) {
      const rawValue = inputs[i].value.trim();

      if (rawValue === "") {
        continue;
      }

      const scoreNumber = Number(rawValue);
      if (isNaN(scoreNumber) || scoreNumber < 0 || scoreNumber > 100) {
        formMessage.textContent = "Error: All entered scores must be between 0 and 100.";
        inputs[i].focus();
        return;
      }

      validEntries.push({
        studentId: inputs[i].dataset.studentId,
        score: scoreNumber
      });
    }

    if (validEntries.length === 0) {
      formMessage.textContent = "Please enter at least one score before saving.";
      return;
    }

    // Update existing grade records or push new ones
    const grades = getData(STORAGE_KEYS.grades) || [];
    const today = getTodayText();

    validEntries.forEach(function (entry) {
      const existingIndex = grades.findIndex(function (g) {
        return (
          g.studentId === entry.studentId &&
          g.subject === choice.subject &&
          g.assessment === selectedAssessment
        );
      });

      if (existingIndex !== -1) {
        grades[existingIndex].score = entry.score;
        grades[existingIndex].dateEntered = today;
      } else {
        grades.push({
          gradeId: "G" + getNextNumber(grades, "gradeId"),
          studentId: entry.studentId,
          subject: choice.subject,
          assessment: selectedAssessment,
          score: entry.score,
          dateEntered: today
        });
      }
    });

    // Save updated array to localStorage and display confirmation
    saveData(STORAGE_KEYS.grades, grades);
    formMessage.textContent =
      validEntries.length + " score(s) saved for " + choice.subject + " (" + selectedAssessment + ").";
  });

  // ---------- Batch upload (CSV file) ----------
  const templateBtn = document.getElementById("templateBtn");
  const uploadBatchBtn = document.getElementById("uploadBatchBtn");
  const batchFileInput = document.getElementById("batchFileInput");
  const batchResult = document.getElementById("batchResult");

  if (templateBtn && uploadBatchBtn && batchFileInput && batchResult) {
    // Download a template with this class's student IDs filled in
    templateBtn.addEventListener("click", function () {
      downloadTemplate(students, "grade-template-" + choice.level.replace(/\s+/g, "-") + ".csv");
    });

    uploadBatchBtn.addEventListener("click", function () {
      batchFileInput.click();
    });

    // When a file is chosen, check every row and save the good ones.
    // A student must exist, be Active and be in the chosen grade level.
    batchFileInput.addEventListener("change", function () {
      const file = batchFileInput.files[0];
      batchFileInput.value = ""; // so the same file can be chosen again
      runBatchUpload(
        file,
        { subject: choice.subject, assessment: assessmentSelect.value, level: choice.level },
        batchResult,
        renderGradeRows,
      );
    });
  }
});

