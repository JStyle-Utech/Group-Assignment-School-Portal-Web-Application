/* CIT2011 School Portal — Student 4: Instructor Workflow Specialist
   Name / ID / Lab day and time: ADD VERIFIED GROUP DETAILS BEFORE SUBMISSION
   Add ALL group members' names, IDs, and lab day/time as required by brief.
   Uses storage.js and auth.js from the shared group project.
*/
"use strict";

// 1. The curriculum list is a prototype for a Jamaican high school.
const TEACHER_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Integrated Science",
  "Social Studies",
  "Information Technology",
  "Spanish",
  "Physical Education",
  "Visual Arts",
  "Music",
  "Religious Education",
  "Geography",
  "History",
  "Principles of Business",
  "Principles of Accounts",
  "Biology",
  "Chemistry",
  "Physics",
];
const TEACHER_LEVELS = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Grade 13",
];

// 2. Reuse existing browser storage keys rather than creating a separate student list.
function teacherRead(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}
function teacherStudents() {
  return teacherRead(STORAGE_KEYS.students).filter(
    (student) => String(student.status || "Active").toLowerCase() === "active",
  );
}
function teacherGrades() {
  return teacherRead(STORAGE_KEYS.grades);
}
function studentLabel(student) {
  return (
    [student.firstName, student.lastName].filter(Boolean).join(" ") ||
    student.studentId
  );
}
function element(tag, content) {
  const node = document.createElement(tag);
  node.textContent = String(content);
  return node; // textContent prevents student names from becoming HTML
}
function addOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label || value;
  select.appendChild(option);
}
function fillFilters() {
  const levels = document.getElementById("levelSelect");
  const subjects = document.getElementById("subjectSelect");
  if (levels) TEACHER_LEVELS.forEach((level) => addOption(levels, level));
  if (subjects)
    TEACHER_SUBJECTS.forEach((subject) => addOption(subjects, subject));
}
function selectedStudents() {
  const level = document.getElementById("levelSelect").value;
  return teacherStudents().filter((s) => s.gradeLevel === level);
}
function renderSubjects() {
  const body = document.getElementById("subjectStudents");
  if (!body) return;
  body.replaceChildren();
  const students = selectedStudents();
  students.forEach((s) => {
    const tr = document.createElement("tr");
    [s.studentId, studentLabel(s), s.gradeLevel].forEach((v) =>
      tr.appendChild(element("td", v)),
    );
    body.appendChild(tr);
  });
  document.getElementById("subjectCount").textContent =
    `${students.length} active student(s) in this grade.`;
  document.getElementById("subjectDescription").textContent =
    `Selected subject: ${document.getElementById("subjectSelect").value}.`;
}

// 3. Every score belongs to exactly one student + subject. Saving again updates it.
function renderGradeRows() {
  const body = document.getElementById("gradeRows");
  if (!body) return;
  body.replaceChildren();
  const subject = document.getElementById("subjectSelect").value;
  const grades = teacherGrades();
  selectedStudents().forEach((student) => {
    const tr = document.createElement("tr");
    tr.appendChild(element("td", student.studentId));
    tr.appendChild(element("td", studentLabel(student)));
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.className = "score-input";
    input.type = "number";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.setAttribute("aria-label", `Score for ${studentLabel(student)}`);
    input.dataset.studentId = student.studentId;
    const saved = grades.find(
      (g) => g.studentId === student.studentId && g.subject === subject,
    );
    if (saved) input.value = saved.score;
    cell.appendChild(input);
    tr.appendChild(cell);
    body.appendChild(tr);
  });
  document.getElementById("formMessage").textContent = body.children.length
    ? ""
    : "No active students in this grade. Ask the administrator to add students.";
}
function saveGrades(event) {
  event.preventDefault();
  const subject = document.getElementById("subjectSelect").value;
  const inputs = Array.from(document.querySelectorAll("#gradeRows input"));
  // Validate ALL entered scores before writing anything.
  for (const input of inputs) {
    if (input.value.trim() === "") continue;
    const score = Number(input.value);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      document.getElementById("formMessage").textContent =
        "Please use whole-number scores from 0 to 100.";
      input.focus();
      return;
    }
  }
  const grades = teacherGrades();
  let savedCount = 0;
  inputs.forEach((input) => {
    if (input.value.trim() === "") return;
    const record = {
      studentId: input.dataset.studentId,
      subject,
      score: Number(input.value),
    };
    const index = grades.findIndex(
      (g) => g.studentId === record.studentId && g.subject === subject,
    );
    if (index >= 0) grades[index] = record;
    else grades.push(record);
    savedCount++;
  });
  saveData(STORAGE_KEYS.grades, grades);
  document.getElementById("formMessage").textContent =
    `${savedCount} score(s) saved for ${subject}.`;
}

// 4. A report average is sum of recorded subject marks / count of marks.
function renderReport() {
  const select = document.getElementById("studentSelect");
  if (!select) return;
  const area = document.getElementById("reportOutput");
  area.replaceChildren();
  const student = teacherStudents().find((s) => s.studentId === select.value);
  if (!student) {
    area.appendChild(element("p", "Select a student to view a report."));
    return;
  }
  const grades = teacherGrades().filter(
    (g) =>
      g.studentId === student.studentId && Number.isFinite(Number(g.score)),
  );
  const title = element("h2", studentLabel(student));
  title.className = "report-header";
  area.appendChild(title);
  area.appendChild(
    element("p", `${student.studentId} • ${student.gradeLevel}`),
  );
  if (!grades.length) {
    area.appendChild(element("p", "No scores recorded for this student yet."));
    return;
  }
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const header = document.createElement("tr");
  ["Subject", "Score /100"].forEach((t) =>
    header.appendChild(element("th", t)),
  );
  thead.appendChild(header);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  grades.forEach((g) => {
    const row = document.createElement("tr");
    row.appendChild(element("td", g.subject));
    row.appendChild(element("td", g.score));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  area.appendChild(table);
  const average =
    grades.reduce((total, g) => total + Number(g.score), 0) / grades.length;
  area.appendChild(
    element(
      "strong",
      `Average: ${average.toFixed(1)}% across ${grades.length} subject(s)`,
    ),
  );
}
function populateStudentSelect() {
  const select = document.getElementById("studentSelect");
  if (!select) return;
  select.replaceChildren();
  teacherStudents().forEach((s) =>
    addOption(select, s.studentId, `${studentLabel(s)} (${s.studentId})`),
  );
  renderReport();
}
function initializeTeacher() {
  const user = getCurrentUser();
  if (!user || user.role !== "teacher") {
    window.location.replace("../login.html");
    return;
  }
  document.getElementById("teacherName").textContent =
    `Signed in: ${user.username}`;
  document.getElementById("logoutButton").addEventListener("click", logout);
  fillFilters();
  if (document.getElementById("studentTotal")) {
    document.getElementById("studentTotal").textContent =
      teacherStudents().length;
    document.getElementById("subjectTotal").textContent =
      TEACHER_SUBJECTS.length;
    document.getElementById("gradeTotal").textContent = teacherGrades().length;
  }
  if (document.getElementById("subjectStudents")) {
    renderSubjects();
    ["levelSelect", "subjectSelect"].forEach((id) =>
      document.getElementById(id).addEventListener("change", renderSubjects),
    );
  }
  if (document.getElementById("gradeRows")) {
    renderGradeRows();
    ["levelSelect", "subjectSelect"].forEach((id) =>
      document.getElementById(id).addEventListener("change", renderGradeRows),
    );
    document
      .getElementById("gradesForm")
      .addEventListener("submit", saveGrades);
  }
  if (document.getElementById("studentSelect")) {
    populateStudentSelect();
    document
      .getElementById("studentSelect")
      .addEventListener("change", renderReport);
    document
      .getElementById("printButton")
      .addEventListener("click", () => window.print());
  }
}
document.addEventListener("DOMContentLoaded", initializeTeacher);
