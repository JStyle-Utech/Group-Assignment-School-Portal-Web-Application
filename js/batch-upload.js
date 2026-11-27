/*
  School Portal - batch-upload.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Batch upload of grades from a CSV file. Used by the administrator
           (admin/grades.html) and the teacher (teacher/grade-entry.html).
           Every row is checked: the student must exist, must be Active, and the
           score must be a number from 0 to 100.
  Note: storage.js must be loaded before this file

  The CSV file has two columns and looks like this:
      student_id,score
      S2026-001,85
      S2026-002,72.5
*/

/* ---------- Reading the file ---------- */

// Splits one line of a CSV file into cells. Text inside "quotes" may contain commas.
function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const character = line[i];
    if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

// Turns the text of a CSV file into a list of rows: { line, id, scoreText }
// Empty lines and the heading line are left out. "line" is the line number in the file.
function readCsvRows(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") {
      continue;
    }
    const cells = splitCsvLine(lines[i]);
    const first = cells[0].toLowerCase().replace(/[\s_-]/g, "");

    // The heading line (student_id,score) is not a student
    if (rows.length === 0 && (first === "studentid" || first === "id")) {
      continue;
    }
    rows.push({ line: i + 1, id: cells[0], scoreText: cells.length > 1 ? cells[1] : "" });
  }
  return rows;
}

/* ---------- Checking and saving ---------- */

// Checks every row and saves the good ones.
// options: { subject, assessment, level }   (level is "" when any grade level is allowed)
// Returns { savedNew, savedUpdated, blank, problems: [text, ...], total }
function importScores(rows, options) {
  const students = getData(STORAGE_KEYS.students);
  const grades = getData(STORAGE_KEYS.grades);
  const result = { savedNew: 0, savedUpdated: 0, blank: 0, problems: [], total: rows.length };
  const alreadySeen = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = row.id.trim().toUpperCase();
    const where = "Line " + row.line + (id !== "" ? " (" + id + ")" : "") + ": ";

    // A row with no score is just an empty template row, so it is skipped quietly
    if (row.scoreText.trim() === "" && id !== "") {
      result.blank++;
      continue;
    }

    if (id === "") {
      result.problems.push(where + "there is no student ID.");
      continue;
    }

    // 1. Does the student exist?
    const student = students.find(function (s) {
      return s.studentId.toUpperCase() === id;
    });
    if (!student) {
      result.problems.push(where + "no student with this ID is registered.");
      continue;
    }

    // 2. Is the student active?
    if (student.status !== "Active") {
      result.problems.push(where + student.firstName + " " + student.lastName + " is " + student.status + ", so no grade was saved.");
      continue;
    }

    // 3. Is the student in the right grade level? (teacher page only)
    if (options.level !== "" && student.gradeLevel !== options.level) {
      result.problems.push(where + student.firstName + " " + student.lastName + " is in " + student.gradeLevel + ", not " + options.level + ".");
      continue;
    }

    // 4. Is the score a number from 0 to 100?
    const scoreText = row.scoreText.trim();
    const score = Number(scoreText);
    if (!/^[0-9]+(\.[0-9]+)?$/.test(scoreText) || isNaN(score) || score < 0 || score > 100) {
      result.problems.push(where + 'the score "' + scoreText + '" is not a number from 0 to 100.');
      continue;
    }

    // 5. Is the same student in the file twice?
    if (alreadySeen[id]) {
      result.problems.push(where + "this student is already in the file (line " + alreadySeen[id] + "), so this row was skipped.");
      continue;
    }
    alreadySeen[id] = row.line;

    // The row is good: update the old grade or add a new one
    let index = -1;
    for (let j = 0; j < grades.length; j++) {
      if (grades[j].studentId === student.studentId && grades[j].subject === options.subject && grades[j].assessment === options.assessment) {
        index = j;
      }
    }
    if (index !== -1) {
      grades[index].score = score;
      grades[index].dateEntered = getTodayText();
      result.savedUpdated++;
    } else {
      grades.push({
        gradeId: "G" + getNextNumber(grades, "gradeId"),
        studentId: student.studentId,
        subject: options.subject,
        assessment: options.assessment,
        score: score,
        dateEntered: getTodayText(),
      });
      result.savedNew++;
    }
  }

  if (result.savedNew + result.savedUpdated > 0) {
    saveData(STORAGE_KEYS.grades, grades);
  }
  return result;
}

/* ---------- Showing the result ---------- */

// Writes the summary and the list of problem rows into a box on the page
function showBatchResult(box, result, options) {
  const saved = result.savedNew + result.savedUpdated;
  let html = "";

  if (saved > 0) {
    html += '<p class="message">Saved ' + saved + " grade(s) for " + escapeHtml(options.subject) + " (" +
      escapeHtml(options.assessment) + "): " + result.savedNew + " new, " + result.savedUpdated + " updated.</p>";
  } else {
    html += '<p class="message error">No grades were saved.</p>';
  }

  if (result.blank > 0) {
    html += '<p class="form-note">' + result.blank + " row(s) had no score and were ignored.</p>";
  }

  if (result.problems.length > 0) {
    html += '<p class="message error">' + result.problems.length + " row(s) were skipped:</p><ul class=\"batch-list\">";
    for (let i = 0; i < result.problems.length && i < 20; i++) {
      html += "<li>" + escapeHtml(result.problems[i]) + "</li>";
    }
    if (result.problems.length > 20) {
      html += "<li>...and " + (result.problems.length - 20) + " more.</li>";
    }
    html += "</ul>";
  }
  box.innerHTML = html;
}

function showBatchError(box, text) {
  box.innerHTML = '<p class="message error">' + escapeHtml(text) + "</p>";
}

// Reads the chosen file, checks it, saves it and shows the result.
// afterSave is called when at least one grade was saved (to redraw the page tables).
function runBatchUpload(file, options, box, afterSave) {
  if (!options.subject) {
    showBatchError(box, "Choose a subject first, then upload the file.");
    return;
  }
  if (!file) {
    showBatchError(box, "Choose a CSV file.");
    return;
  }
  if (!/\.csv$/i.test(file.name)) {
    showBatchError(box, "Only .csv files can be uploaded. Save your spreadsheet as CSV first.");
    return;
  }
  if (file.size > 1000000) {
    showBatchError(box, "The file is too big (the limit is 1 MB).");
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    const rows = readCsvRows(String(reader.result));
    if (rows.length === 0) {
      showBatchError(box, "The file is empty. It needs the columns student_id and score.");
      return;
    }
    const result = importScores(rows, options);
    showBatchResult(box, result, options);
    if (result.savedNew + result.savedUpdated > 0 && typeof afterSave === "function") {
      afterSave();
    }
  };
  reader.onerror = function () {
    showBatchError(box, "The file could not be read. Try again.");
  };
  reader.readAsText(file);
}

/* ---------- Template download ---------- */

// Downloads a CSV file with the student IDs filled in and the scores empty
function downloadTemplate(students, filename) {
  let text = "student_id,score,student_name\r\n";
  for (let i = 0; i < students.length; i++) {
    text += students[i].studentId + ",," + '"' + students[i].lastName + ", " + students[i].firstName + '"\r\n';
  }

  const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}
