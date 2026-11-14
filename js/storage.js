/*
School Portal - storage.js
Group Members:
    1. Jaheem Style 2403277
*/

const Storage_KEYS = {
    user: "sp_users",
    students: "sp_students",
    grades: "sp_grades",
    finances: "sp_finances",
    sessions: "sp_sessions",
};

const Default_Storage = {
    {username: "admin", password: "admin123", role: "admin"},
    {username: "teacher", password: "teacher123", role: "teacher"},
    {username: "viewer", password: "viewer123", role: "viewer"},
};
