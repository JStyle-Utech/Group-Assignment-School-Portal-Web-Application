/*
  School Portal - viewer-reports.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Reporting Platform for the read-only viewer - filterable bar reports on grades and fees
  Note: storage.js and auth.js must be loaded before this file
        This page only READS data. It never saves, changes or deletes anything.
*/

// Get the page elements we need
const repQuery = document.getElementById("repQuery");
const repLevel = document.getElementById("repLevel");
const repCohort = document.getElementById("repCohort");
const repSubject = document.getElementById("repSubject");
const repAssessment = document.getElementById("repAssessment");

/* ---------- Helper functions ---------- */

// Draws a list of bars. Each item has: label, width (0 to 100), text and an optional extra class
function drawBars(listId, items) {
  const list = document.getElementById(listId);
  list.innerHTML = "";

  for (let i = 0; i < items.length; i++) {
    const width = Math.max(0, Math.min(100, items[i].width));
    list.innerHTML +=
      "<li><span>" + escapeHtml(items[i].label) + "</span>" +
      '<span class="bar-track"><span class="bar-fill ' + (items[i].extra || "") +
      '" style="display:block;width:' + width + '%"></span></span>' +
      '<span class="bar-value">' + escapeHtml(items[i].text) + "</span></li>";
  }
}

// Average of a list of numbers (null for an empty list)
function averageOf(numbers) {
  if (numbers.length === 0) {
    return null;
  }
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total = total + numbers[i];
  }
  return total / numbers.length;
}

// Overall average of one student from a list of grade records:
// the average of the subject averages
function getStudentAverage(gradeList, studentId) {
  const bySubject = {};
  for (let i = 0; i < gradeList.length; i++) {
    if (gradeList[i].studentId === studentId) {
      if (!bySubject[gradeList[i].subject]) {
        bySubject[gradeList[i].subject] = [];
      }
      bySubject[gradeList[i].subject].push(gradeList[i].score);
    }
  }
  const subjectAverages = [];
  for (const subject in bySubject) {
    subjectAverages.push(averageOf(bySubject[subject]));
  }
  return averageOf(subjectAverages);
}

/* ---------- Build every report ---------- */

function showReports() {
  const allStudents = getData(STORAGE_KEYS.students);
  const allGrades = getData(STORAGE_KEYS.grades);
  const allRecords = getData(STORAGE_KEYS.finances);

  // Students that pass the grade level and cohort filters
  const students = allStudents.filter(function (s) {
    const levelOk = repLevel.value === "" || s.gradeLevel === repLevel.value;
    const cohortOk = repCohort.value === "" || s.cohort === repCohort.value;
    const queryText = repQuery.value.trim().toLowerCase();
    const queryOk = queryText === "" ||
      (s.studentId + " " + s.firstName + " " + s.lastName).toLowerCase().includes(queryText);
    return levelOk && cohortOk && queryOk;
  });

  // Look up a student's grade level by ID (used to group the scores)
  const levelOf = {};
  const ids = {};
  for (let i = 0; i < students.length; i++) {
    levelOf[students[i].studentId] = students[i].gradeLevel;
    ids[students[i].studentId] = true;
  }

  // Scores of those students that also pass the subject and assessment filters
  const grades = allGrades.filter(function (g) {
    const subjectOk = repSubject.value === "" || g.subject === repSubject.value;
    const assessmentOk = repAssessment.value === "" || g.assessment === repAssessment.value;
    return ids[g.studentId] === true && subjectOk && assessmentOk;
  });

  // Fee records of those students
  const records = allRecords.filter(function (r) {
    return ids[r.studentId] === true;
  });

  /* ----- Summary boxes ----- */
  const scoreList = grades.map(function (g) {
    return g.score;
  });
  const average = averageOf(scoreList);
  let passCount = 0;
  for (let i = 0; i < scoreList.length; i++) {
    if (scoreList[i] >= 50) {
      passCount++;
    }
  }

  let billed = 0;
  let collected = 0;
  for (let i = 0; i < records.length; i++) {
    billed = billed + records[i].amountDue;
    collected = collected + getAmountPaid(records[i]);
  }

  document.getElementById("sumStudents").textContent = students.length;
  document.getElementById("sumScores").textContent = grades.length;
  document.getElementById("sumAverage").textContent = average === null ? "-" : average.toFixed(1) + "%";
  document.getElementById("sumPass").textContent =
    scoreList.length === 0 ? "-" : Math.round((passCount / scoreList.length) * 100) + "%";
  document.getElementById("sumCollected").textContent = formatMoney(collected);
  document.getElementById("sumOwing").textContent = formatMoney(billed - collected);

  /* ----- Average score by subject ----- */
  const subjectList = repSubject.value === "" ? SUBJECTS : [repSubject.value];
  const subjectItems = [];
  for (let i = 0; i < subjectList.length; i++) {
    const scores = grades.filter(function (g) {
      return g.subject === subjectList[i];
    }).map(function (g) {
      return g.score;
    });
    const subjectAverage = averageOf(scores);
    subjectItems.push({
      label: subjectList[i],
      width: subjectAverage === null ? 0 : subjectAverage,
      text: subjectAverage === null ? "-" : subjectAverage.toFixed(1) + "%",
    });
  }
  drawBars("subjectBars", subjectItems);

  /* ----- Grade distribution ----- */
  const letters = ["A", "B", "C", "D", "E", "F"];
  const letterCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  for (let i = 0; i < scoreList.length; i++) {
    letterCounts[getLetterGrade(scoreList[i])]++;
  }
  let biggestCount = 1;
  for (let i = 0; i < letters.length; i++) {
    if (letterCounts[letters[i]] > biggestCount) {
      biggestCount = letterCounts[letters[i]];
    }
  }
  const letterItems = [];
  for (let i = 0; i < letters.length; i++) {
    letterItems.push({
      label: "Grade " + letters[i],
      width: (letterCounts[letters[i]] / biggestCount) * 100,
      text: String(letterCounts[letters[i]]),
      extra: "fill-" + letters[i].toLowerCase(),
    });
  }
  drawBars("gradeBars", letterItems);

  /* ----- Average score by grade level ----- */
  const levelList = repLevel.value === "" ? GRADE_LEVELS : [repLevel.value];
  const levelItems = [];
  for (let i = 0; i < levelList.length; i++) {
    const scores = grades.filter(function (g) {
      return levelOf[g.studentId] === levelList[i];
    }).map(function (g) {
      return g.score;
    });
    const levelAverage = averageOf(scores);
    levelItems.push({
      label: levelList[i],
      width: levelAverage === null ? 0 : levelAverage,
      text: levelAverage === null ? "-" : levelAverage.toFixed(1) + "%",
    });
  }
  drawBars("levelBars", levelItems);

  /* ----- Fee accounts by status ----- */
  const statusNames = ["Paid", "Pending", "Outstanding"];
  const statusCounts = { Paid: 0, Pending: 0, Outstanding: 0 };
  for (let i = 0; i < records.length; i++) {
    statusCounts[getAccountStatus(records[i])]++;
  }
  let biggestStatus = 1;
  for (let i = 0; i < statusNames.length; i++) {
    if (statusCounts[statusNames[i]] > biggestStatus) {
      biggestStatus = statusCounts[statusNames[i]];
    }
  }
  const statusItems = [];
  for (let i = 0; i < statusNames.length; i++) {
    statusItems.push({
      label: statusNames[i],
      width: (statusCounts[statusNames[i]] / biggestStatus) * 100,
      text: String(statusCounts[statusNames[i]]),
      extra: "fill-" + statusNames[i].toLowerCase(),
    });
  }
  drawBars("feeBars", statusItems);

  /* ----- Fees collected by cohort ----- */
  const cohortList = repCohort.value === "" ? COHORTS : [repCohort.value];
  const cohortItems = [];
  for (let i = 0; i < cohortList.length; i++) {
    let cohortBilled = 0;
    let cohortPaid = 0;
    for (let j = 0; j < records.length; j++) {
      const student = findStudent(records[j].studentId);
      if (student && student.cohort === cohortList[i]) {
        cohortBilled = cohortBilled + records[j].amountDue;
        cohortPaid = cohortPaid + getAmountPaid(records[j]);
      }
    }
    const percent = cohortBilled === 0 ? 0 : (cohortPaid / cohortBilled) * 100;
    cohortItems.push({
      label: cohortList[i],
      width: percent,
      text: cohortBilled === 0 ? "-" : Math.round(percent) + "%",
      extra: "fill-green",
    });
  }
  drawBars("cohortBars", cohortItems);

  /* ----- Score records (read only list, the first 15) ----- */
  const recordList = grades.slice().sort(function (a, b) {
    const byName = getStudentName(a.studentId).localeCompare(getStudentName(b.studentId));
    if (byName !== 0) {
      return byName;
    }
    return a.subject.localeCompare(b.subject);
  });
  const recordsBody = document.getElementById("recordsBody");
  recordsBody.innerHTML = "";
  if (recordList.length === 0) {
    recordsBody.innerHTML = '<tr><td colspan="6"><div class="empty-note">No scores match these filters.</div></td></tr>';
  }
  for (let i = 0; i < recordList.length && i < 15; i++) {
    const g = recordList[i];
    const letter = getLetterGrade(g.score);
    recordsBody.innerHTML +=
      "<tr><td>" + escapeHtml(getStudentName(g.studentId)) + "</td>" +
      "<td>" + escapeHtml(levelOf[g.studentId]) + "</td>" +
      "<td>" + escapeHtml(g.subject) + "</td>" +
      "<td>" + escapeHtml(g.assessment) + "</td>" +
      "<td>" + g.score + "</td>" +
      '<td><span class="badge grade-' + letter.toLowerCase() + '">' + letter + "</span></td></tr>";
  }
  document.getElementById("recordsCount").textContent =
    "Showing " + Math.min(15, recordList.length) + " of " + recordList.length + " score(s). Narrow the filters to see others.";

  /* ----- Highest averages ----- */
  const ranking = [];
  for (let i = 0; i < students.length; i++) {
    const studentAverage = getStudentAverage(grades, students[i].studentId);
    if (studentAverage !== null) {
      ranking.push({ student: students[i], average: studentAverage });
    }
  }
  ranking.sort(function (a, b) {
    return b.average - a.average;
  });

  const topBody = document.getElementById("topBody");
  topBody.innerHTML = "";
  if (ranking.length === 0) {
    topBody.innerHTML = '<tr><td colspan="5"><div class="empty-note">No scores match these filters.</div></td></tr>';
  }
  for (let i = 0; i < ranking.length && i < 5; i++) {
    const letter = getLetterGrade(ranking[i].average);
    topBody.innerHTML +=
      "<tr><td>" + (i + 1) + "</td>" +
      "<td>" + escapeHtml(ranking[i].student.lastName + ", " + ranking[i].student.firstName) + "</td>" +
      "<td>" + escapeHtml(ranking[i].student.gradeLevel) + "</td>" +
      "<td>" + ranking[i].average.toFixed(1) + "</td>" +
      '<td><span class="badge grade-' + letter.toLowerCase() + '">' + letter + "</span></td></tr>";
  }
}

/* ---------- Start the page ---------- */

fillSelect(repLevel, GRADE_LEVELS);
fillSelect(repCohort, COHORTS);
fillSelect(repSubject, SUBJECTS);
fillSelect(repAssessment, ASSESSMENTS);

showReports();

repQuery.addEventListener("input", showReports);
repLevel.addEventListener("change", showReports);
repCohort.addEventListener("change", showReports);
repSubject.addEventListener("change", showReports);
repAssessment.addEventListener("change", showReports);

document.getElementById("resetBtn").addEventListener("click", function () {
  repQuery.value = "";
  repLevel.value = "";
  repCohort.value = "";
  repSubject.value = "";
  repAssessment.value = "";
  showReports();
});

document.getElementById("printReport").addEventListener("click", function () {
  window.print();
});
