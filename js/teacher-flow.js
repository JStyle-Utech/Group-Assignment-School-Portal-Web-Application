/*
  School Portal - teacher-flow.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Shared helpers for the teacher pages (curriculum filter routing)
           The teacher first picks a grade level and a subject, and the other pages remember it.
  Note: storage.js and auth.js must be loaded before this file
*/

// The name used to remember the teacher's choice while the tab is open
const CHOICE_KEY = "sp_teacher_choice";

// The subjects offered in each grade level (a sample list - change it if your group needs to)
const SUBJECTS_BY_LEVEL = {
  "Form 1": ["Mathematics", "English Language", "Information Technology", "Integrated Science", "Social Studies", "Spanish", "Physical Education", "Visual Arts"],
  "Form 2": ["Mathematics", "English Language", "Information Technology", "Integrated Science", "Social Studies", "Spanish", "Physical Education", "Visual Arts"],
  "Form 3": ["Mathematics", "English Language", "Information Technology", "Integrated Science", "Social Studies", "Spanish", "Physical Education", "Visual Arts"],
  "Form 4": ["Mathematics", "English Language", "Information Technology", "Integrated Science", "Social Studies", "Spanish", "Visual Arts"],
  "Form 5": ["Mathematics", "English Language", "Information Technology", "Integrated Science", "Social Studies", "Spanish", "Visual Arts"],
  "Lower Sixth": ["Mathematics", "English Language", "Information Technology", "Social Studies", "Spanish"],
  "Upper Sixth": ["Mathematics", "English Language", "Information Technology", "Social Studies", "Spanish"],
};

// Gives back the subjects for one grade level (an empty list if the level is not known)
function getSubjectsForLevel(level) {
  return SUBJECTS_BY_LEVEL[level] || [];
}

// Remembers the grade level and subject the teacher chose
function saveChoice(level, subject) {
  try {
    sessionStorage.setItem(CHOICE_KEY, JSON.stringify({ level: level, subject: subject }));
  } catch (error) {
    console.warn("Could not remember the choice: " + error.message);
  }
}

// Gives back the saved choice, or null if the teacher has not chosen yet
function getChoice() {
  try {
    const choice = JSON.parse(sessionStorage.getItem(CHOICE_KEY));
    if (choice && choice.level && choice.subject) {
      return choice;
    }
  } catch (error) {
    return null;
  }
  return null;
}

// Forgets the choice
function clearChoice() {
  try {
    sessionStorage.removeItem(CHOICE_KEY);
  } catch (error) {
    console.warn("Could not clear the choice: " + error.message);
  }
}

// Active students of one grade level, sorted by last name
function getActiveStudentsInLevel(level) {
  const list = getData(STORAGE_KEYS.students).filter(function (s) {
    return s.status === "Active" && s.gradeLevel === level;
  });
  list.sort(function (a, b) {
    return a.lastName.localeCompare(b.lastName);
  });
  return list;
}

// Average score of one student in one subject (null if there are no scores)
function getSubjectAverage(grades, studentId, subject) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < grades.length; i++) {
    if (grades[i].studentId === studentId && grades[i].subject === subject) {
      total = total + grades[i].score;
      count++;
    }
  }
  if (count === 0) {
    return null;
  }
  return total / count;
}

// Finds the full account (name, email) of the person who is logged in
function getLoggedInAccount() {
  const session = getCurrentUser();
  if (!session) {
    return null;
  }
  const account = getAllUsers().find(function (u) {
    return u.username === session.username;
  });
  return {
    fullName: session.fullName,
    username: session.username,
    role: session.role,
    email: account && account.email ? account.email : "Not added",
  };
}
