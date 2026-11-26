/*
  School Portal - viewer.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Universal Search for the read-only viewer - student profiles, grades and fee statements
  Note: storage.js and auth.js must be loaded before this file
        This page only READS data. It never saves, changes or deletes anything.
*/

// Get the page elements we need
const searchBox = document.getElementById("searchBox");
const levelFilter = document.getElementById("levelFilter");
const cohortFilter = document.getElementById("cohortFilter");
const feeFilter = document.getElementById("feeFilter");
const resultBody = document.getElementById("resultBody");
const detailPanel = document.getElementById("detailPanel");

/* ---------- Helper functions ---------- */

// Overall average of one student: the average of their subject averages (null if no scores)
function getOverallAverage(grades, studentId) {
  const totals = {};
  const counts = {};
  for (let i = 0; i < grades.length; i++) {
    if (grades[i].studentId === studentId) {
      const subject = grades[i].subject;
      totals[subject] = (totals[subject] || 0) + grades[i].score;
      counts[subject] = (counts[subject] || 0) + 1;
    }
  }

  let sum = 0;
  let subjectCount = 0;
  for (const subject in totals) {
    sum = sum + totals[subject] / counts[subject];
    subjectCount++;
  }
  if (subjectCount === 0) {
    return null;
  }
  return sum / subjectCount;
}

// Adds up the fees of one student and works out one status for all their accounts
function getFeeSummary(records, studentId) {
  const summary = { count: 0, billed: 0, paid: 0, balance: 0, status: "No charges" };
  let hasOutstanding = false;
  let hasPending = false;

  for (let i = 0; i < records.length; i++) {
    if (records[i].studentId !== studentId) {
      continue;
    }
    summary.count++;
    summary.billed = summary.billed + records[i].amountDue;
    summary.paid = summary.paid + getAmountPaid(records[i]);

    const status = getAccountStatus(records[i]);
    if (status === "Outstanding") {
      hasOutstanding = true;
    } else if (status === "Pending") {
      hasPending = true;
    }
  }

  summary.balance = Math.round((summary.billed - summary.paid) * 100) / 100;
  if (summary.count > 0) {
    if (hasOutstanding) {
      summary.status = "Outstanding";
    } else if (hasPending) {
      summary.status = "Pending";
    } else {
      summary.status = "Paid";
    }
  }
  return summary;
}

// CSS class for a fee status badge
function getFeeClass(status) {
  if (status === "No charges") {
    return "status-none";
  }
  return getStatusClass(status);
}

// All the text of a student that the search box looks through
function getSearchText(student, grades, records) {
  let text = [
    student.studentId, student.firstName, student.lastName, student.gender,
    student.gradeLevel, student.cohort, student.guardianName, student.guardianPhone,
    student.email, student.address,
  ].join(" ");

  // Add the subjects the student has scores in
  for (let i = 0; i < grades.length; i++) {
    if (grades[i].studentId === student.studentId && !text.includes(grades[i].subject)) {
      text += " " + grades[i].subject;
    }
  }
  // Add the fee descriptions
  for (let i = 0; i < records.length; i++) {
    if (records[i].studentId === student.studentId) {
      text += " " + records[i].description;
    }
  }
  return text.toLowerCase();
}

/* ---------- Viewer profile ---------- */

function showViewerProfile() {
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  document.getElementById("profName").textContent = user.fullName;
  document.getElementById("profUsername").textContent = user.username;
}

/* ---------- Search results ---------- */

function showResults() {
  const students = getData(STORAGE_KEYS.students);
  const grades = getData(STORAGE_KEYS.grades);
  const records = getData(STORAGE_KEYS.finances);
  const searchText = searchBox.value.trim().toLowerCase();

  const matches = students.filter(function (s) {
    const levelOk = levelFilter.value === "" || s.gradeLevel === levelFilter.value;
    const cohortOk = cohortFilter.value === "" || s.cohort === cohortFilter.value;
    const feeOk = feeFilter.value === "" || getFeeSummary(records, s.studentId).status === feeFilter.value;
    const textOk = searchText === "" || getSearchText(s, grades, records).includes(searchText);
    return levelOk && cohortOk && feeOk && textOk;
  });

  matches.sort(function (a, b) {
    return a.lastName.localeCompare(b.lastName);
  });

  resultBody.innerHTML = "";

  if (matches.length === 0) {
    resultBody.innerHTML =
      '<tr><td colspan="8"><div class="empty-note">No students match your search.</div></td></tr>';
  }

  for (let i = 0; i < matches.length; i++) {
    const s = matches[i];
    const average = getOverallAverage(grades, s.studentId);
    const fees = getFeeSummary(records, s.studentId);

    let averageText = "-";
    if (average !== null) {
      averageText = average.toFixed(1) + " (" + getLetterGrade(average) + ")";
    }

    let balanceText = "-";
    if (fees.count > 0) {
      balanceText = formatMoney(fees.balance);
    }

    resultBody.innerHTML +=
      "<tr><td>" + escapeHtml(s.studentId) + "</td>" +
      "<td>" + escapeHtml(s.lastName + ", " + s.firstName) + "</td>" +
      "<td>" + escapeHtml(s.gradeLevel) + "</td>" +
      "<td>" + escapeHtml(s.cohort) + "</td>" +
      "<td>" + averageText + "</td>" +
      "<td>" + balanceText + "</td>" +
      '<td><span class="badge ' + getFeeClass(fees.status) + '">' + fees.status + "</span></td>" +
      '<td><button type="button" class="btn small" data-id="' + escapeHtml(s.studentId) + '">View</button></td></tr>';
  }

  document.getElementById("resultCount").textContent =
    "Showing " + matches.length + " of " + students.length + " students";
}

/* ---------- One student's record ---------- */

function showDetail(studentId) {
  const student = findStudent(studentId);
  if (!student) {
    return;
  }
  const grades = getData(STORAGE_KEYS.grades);
  const records = getData(STORAGE_KEYS.finances);

  document.getElementById("detailHeading").textContent =
    "Student record: " + student.firstName + " " + student.lastName;

  // Personal profile
  const profileItems = [
    ["Student ID", student.studentId],
    ["Name", student.firstName + " " + student.lastName],
    ["Gender", student.gender],
    ["Date of birth", student.dob],
    ["Grade level", student.gradeLevel],
    ["Cohort", student.cohort],
    ["Status", student.status],
    ["Guardian", student.guardianName],
    ["Guardian phone", student.guardianPhone],
    ["Email", student.email],
    ["Address", student.address],
  ];
  let profileHtml = "";
  for (let i = 0; i < profileItems.length; i++) {
    profileHtml += "<dt>" + profileItems[i][0] + "</dt><dd>" + escapeHtml(profileItems[i][1]) + "</dd>";
  }
  document.getElementById("detailProfile").innerHTML = profileHtml;

  // Grades directory (sorted by subject, then assessment order)
  const myGrades = grades.filter(function (g) {
    return g.studentId === studentId;
  });
  myGrades.sort(function (a, b) {
    const bySubject = a.subject.localeCompare(b.subject);
    if (bySubject !== 0) {
      return bySubject;
    }
    return ASSESSMENTS.indexOf(a.assessment) - ASSESSMENTS.indexOf(b.assessment);
  });

  const gradeBody = document.getElementById("detailGrades");
  gradeBody.innerHTML = "";
  if (myGrades.length === 0) {
    gradeBody.innerHTML = '<tr><td colspan="5"><div class="empty-note">No scores saved yet.</div></td></tr>';
    document.getElementById("detailGradeSummary").textContent = "No scores saved yet.";
  } else {
    for (let i = 0; i < myGrades.length; i++) {
      const g = myGrades[i];
      const letter = getLetterGrade(g.score);
      gradeBody.innerHTML +=
        "<tr><td>" + escapeHtml(g.subject) + "</td>" +
        "<td>" + escapeHtml(g.assessment) + "</td>" +
        "<td>" + g.score + "</td>" +
        '<td><span class="badge grade-' + letter.toLowerCase() + '">' + letter + "</span></td>" +
        "<td>" + escapeHtml(g.dateEntered) + "</td></tr>";
    }
    const average = getOverallAverage(grades, studentId);
    document.getElementById("detailGradeSummary").textContent =
      myGrades.length + " score(s). Overall average: " + average.toFixed(1) + "% (" + getLetterGrade(average) + ").";
  }

  // Financial statement
  const myRecords = records.filter(function (r) {
    return r.studentId === studentId;
  });
  const financeBody = document.getElementById("detailFinance");
  financeBody.innerHTML = "";
  if (myRecords.length === 0) {
    financeBody.innerHTML = '<tr><td colspan="6"><div class="empty-note">No fee charges yet.</div></td></tr>';
    document.getElementById("detailFinanceSummary").textContent = "No fee charges yet.";
  } else {
    for (let i = 0; i < myRecords.length; i++) {
      const r = myRecords[i];
      const status = getAccountStatus(r);
      financeBody.innerHTML +=
        "<tr><td>" + escapeHtml(r.description) + "</td>" +
        "<td>" + escapeHtml(r.dueDate) + "</td>" +
        "<td>" + formatMoney(r.amountDue) + "</td>" +
        "<td>" + formatMoney(getAmountPaid(r)) + "</td>" +
        "<td>" + formatMoney(getBalance(r)) + "</td>" +
        '<td><span class="badge ' + getStatusClass(status) + '">' + status + "</span></td></tr>";
    }
    const fees = getFeeSummary(records, studentId);
    document.getElementById("detailFinanceSummary").textContent =
      "Billed " + formatMoney(fees.billed) + ", paid " + formatMoney(fees.paid) +
      ", balance owing " + formatMoney(fees.balance) + ".";
  }

  detailPanel.hidden = false;
  detailPanel.scrollIntoView({ behavior: "smooth" });
}

/* ---------- Start the page ---------- */

fillSelect(levelFilter, GRADE_LEVELS);
fillSelect(cohortFilter, COHORTS);

showViewerProfile();
showResults();

searchBox.addEventListener("input", showResults);
levelFilter.addEventListener("change", showResults);
cohortFilter.addEventListener("change", showResults);
feeFilter.addEventListener("change", showResults);

// The View buttons in the table
resultBody.addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (button) {
    showDetail(button.dataset.id);
  }
});

document.getElementById("closeDetail").addEventListener("click", function () {
  detailPanel.hidden = true;
});

// A link can open a student directly: search.html?student=S2026-001
const viewParameter = new URLSearchParams(window.location.search).get("student");
if (viewParameter) {
  showDetail(viewParameter);
}
