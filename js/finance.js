/*
  School Portal - finance.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Financial Ledger - tuition charges, payments and account status
  Note: storage.js and auth.js must be loaded before this file
*/

// Get the page elements we need
const chargeForm = document.getElementById("chargeForm");
const chargeStudent = document.getElementById("chargeStudent");
const chargeDescription = document.getElementById("chargeDescription");
const chargeAmount = document.getElementById("chargeAmount");
const chargeDueDate = document.getElementById("chargeDueDate");
const chargeMessage = document.getElementById("chargeMessage");
const paymentForm = document.getElementById("paymentForm");
const paymentRecord = document.getElementById("paymentRecord");
const paymentAmount = document.getElementById("paymentAmount");
const paymentDate = document.getElementById("paymentDate");
const paymentMethod = document.getElementById("paymentMethod");
const paymentMessage = document.getElementById("paymentMessage");
const ledgerSearch = document.getElementById("ledgerSearch");
const ledgerStatus = document.getElementById("ledgerStatus");
const ledgerBody = document.getElementById("ledgerBody");

function allPayments() {
  const payments = [];
  getData(STORAGE_KEYS.finances).forEach(function (record) {
    (record.payments || []).forEach(function (payment, index) {
      payments.push({
        receiptId: record.recordId + "-P" + (index + 1),
        date: payment.date, method: payment.method, amount: payment.amount,
        studentId: record.studentId, description: record.description,
        recordId: record.recordId,
      });
    });
  });
  return payments;
}

function csvCell(value) {
  const text = String(value == null ? "" : value);
  // Quoting all cells, and neutralising formulas, makes exports safe to open in Excel.
  const safe = /^[\s]*[=+@\-\t\r]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function downloadCsv(filename, headings, rows) {
  const csv = [headings].concat(rows).map(function (row) {
    return row.map(csvCell).join(",");
  }).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], {type: "text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

document.getElementById("exportLedger").addEventListener("click", function () {
  const records = getData(STORAGE_KEYS.finances);
  downloadCsv("school-ledger.csv",
    ["Record ID", "Student ID", "Student", "Description", "Due date", "Amount due JMD", "Paid JMD", "Balance JMD", "Status"],
    records.map(function (r) { return [r.recordId, r.studentId, getStudentName(r.studentId), r.description, r.dueDate, r.amountDue, getAmountPaid(r), getBalance(r), getAccountStatus(r)]; }));
  document.getElementById("exportMessage").textContent = "Ledger exported (" + records.length + " accounts).";
});

document.getElementById("exportPayments").addEventListener("click", function () {
  const payments = allPayments();
  downloadCsv("school-payments.csv",
    ["Receipt ID", "Date", "Student ID", "Student", "Charge", "Method", "Amount JMD"],
    payments.map(function (p) { return [p.receiptId, p.date, p.studentId, getStudentName(p.studentId), p.description, p.method, p.amount]; }));
  document.getElementById("exportMessage").textContent = "Payments exported (" + payments.length + " transactions).";
});

// The record that just changed (its status badge will flash)
let flashRecordId = "";

/* ---------- Form errors ---------- */

function setError(fieldId, message) {
  document.getElementById(fieldId + "Error").textContent = message;
  const field = document.getElementById(fieldId);
  if (message === "") {
    field.classList.remove("invalid");
  } else {
    field.classList.add("invalid");
  }
}

function clearChargeErrors() {
  setError("chargeStudent", "");
  setError("chargeDescription", "");
  setError("chargeAmount", "");
  setError("chargeDueDate", "");
}

function clearPaymentErrors() {
  setError("paymentRecord", "");
  setError("paymentAmount", "");
  setError("paymentDate", "");
}

/* ---------- Drop-down lists ---------- */

// Active students in the "Add a tuition charge" form
function fillStudentList() {
  const students = getData(STORAGE_KEYS.students);
  chargeStudent.innerHTML = '<option value="">Select...</option>';

  for (let i = 0; i < students.length; i++) {
    if (students[i].status === "Active") {
      const option = document.createElement("option");
      option.value = students[i].studentId;
      option.textContent =
        students[i].lastName + ", " + students[i].firstName + " (" + students[i].studentId + ")";
      chargeStudent.appendChild(option);
    }
  }
}

// Accounts that still owe money, in the "Record a payment" form
function fillAccountList() {
  const records = getData(STORAGE_KEYS.finances);
  const oldChoice = paymentRecord.value;
  paymentRecord.innerHTML = '<option value="">Select...</option>';

  for (let i = 0; i < records.length; i++) {
    if (getBalance(records[i]) > 0) {
      const option = document.createElement("option");
      option.value = records[i].recordId;
      option.textContent =
        getStudentName(records[i].studentId) + " - " + records[i].description +
        " - owes " + formatMoney(getBalance(records[i]));
      paymentRecord.appendChild(option);
    }
  }
  paymentRecord.value = oldChoice;
}

/* ---------- Summary and tables ---------- */

function showSummary() {
  const records = getData(STORAGE_KEYS.finances);
  let billed = 0;
  let collected = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let outstandingCount = 0;

  for (let i = 0; i < records.length; i++) {
    billed = billed + records[i].amountDue;
    collected = collected + getAmountPaid(records[i]);

    const status = getAccountStatus(records[i]);
    if (status === "Paid") {
      paidCount++;
    } else if (status === "Pending") {
      pendingCount++;
    } else {
      outstandingCount++;
    }
  }

  document.getElementById("boxBilled").textContent = formatMoney(billed);
  document.getElementById("boxCollected").textContent = formatMoney(collected);
  document.getElementById("boxBalance").textContent = formatMoney(billed - collected);
  document.getElementById("boxPaid").textContent = paidCount;
  document.getElementById("boxPending").textContent = pendingCount;
  document.getElementById("boxOutstanding").textContent = outstandingCount;
}

function showLedger() {
  const records = getData(STORAGE_KEYS.finances);
  const searchText = ledgerSearch.value.trim().toLowerCase();

  // Newest records first
  const matches = records.slice().reverse().filter(function (record) {
    const text = (record.studentId + " " + getStudentName(record.studentId) + " " + record.description).toLowerCase();
    const statusOk = ledgerStatus.value === "" || getAccountStatus(record) === ledgerStatus.value;
    return text.includes(searchText) && statusOk;
  });

  ledgerBody.innerHTML = "";

  if (matches.length === 0) {
    ledgerBody.innerHTML =
      '<tr><td colspan="8"><div class="empty-note">No ledger records yet. Add a tuition charge above.</div></td></tr>';
  }

  for (let i = 0; i < matches.length; i++) {
    const r = matches[i];
    const status = getAccountStatus(r);

    // The badge flashes if this is the record that just changed
    let badgeClass = "badge " + getStatusClass(status);
    if (r.recordId === flashRecordId) {
      badgeClass += " flash";
    }

    let payButton = "";
    if (getBalance(r) > 0) {
      payButton = '<button type="button" class="btn small" data-action="pay" data-id="' + escapeHtml(r.recordId) + '">Pay</button> ';
    }

    ledgerBody.innerHTML +=
      "<tr><td>" + escapeHtml(getStudentName(r.studentId)) + "</td>" +
      "<td>" + escapeHtml(r.description) + "</td>" +
      "<td>" + escapeHtml(r.dueDate) + "</td>" +
      "<td>" + formatMoney(r.amountDue) + "</td>" +
      "<td>" + formatMoney(getAmountPaid(r)) + "</td>" +
      "<td>" + formatMoney(getBalance(r)) + "</td>" +
      '<td><span class="' + badgeClass + '">' + status + "</span></td>" +
      "<td>" + payButton +
      '<button type="button" class="btn small danger" data-action="delete" data-id="' + escapeHtml(r.recordId) + '">Delete</button></td></tr>';
  }

  document.getElementById("ledgerCount").textContent =
    "Showing " + matches.length + " of " + records.length + " records";
}

// The 10 most recent payments from all accounts
function showTransactions() {
  const body = document.getElementById("transactionBody");
  const payments = allPayments();

  // Newest date first
  payments.sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  body.innerHTML = "";

  if (payments.length === 0) {
    body.innerHTML = '<tr><td colspan="6"><div class="empty-note">No payments recorded yet.</div></td></tr>';
  }

  for (let i = 0; i < payments.length && i < 10; i++) {
    const p = payments[i];
    body.innerHTML +=
      "<tr><td>" + escapeHtml(p.date) + "</td>" +
      "<td>" + escapeHtml(getStudentName(p.studentId)) + "</td>" +
      "<td>" + escapeHtml(p.description) + "</td>" +
      "<td>" + escapeHtml(p.method) + "</td>" +
      "<td>" + formatMoney(p.amount) + "</td>" +
      '<td><button type="button" class="btn small" data-receipt="' + escapeHtml(p.receiptId) + '">Print</button></td></tr>';
  }
}

document.getElementById("transactionBody").addEventListener("click", function (event) {
  const button = event.target.closest("button[data-receipt]");
  if (!button) return;
  const payment = allPayments().find(function (p) { return p.receiptId === button.dataset.receipt; });
  if (!payment) return;
  const receipt = window.open("", "_blank", "width=600,height=650");
  if (!receipt) { alert("Allow pop-ups to print this receipt."); return; }
  receipt.document.write('<!doctype html><html><head><title>Payment receipt</title><style>body{font:16px Arial,sans-serif;max-width:520px;margin:45px auto;line-height:1.8}h1{color:#800000}hr{border:0;border-top:2px solid #800000}</style></head><body>' +
    '<h1>School Payment Receipt</h1><hr><p><b>Receipt:</b> ' + escapeHtml(payment.receiptId) +
    '<br><b>Date:</b> ' + escapeHtml(payment.date) +
    '<br><b>Student:</b> ' + escapeHtml(getStudentName(payment.studentId)) +
    '<br><b>Student ID:</b> ' + escapeHtml(payment.studentId) +
    '<br><b>For:</b> ' + escapeHtml(payment.description) +
    '<br><b>Payment method:</b> ' + escapeHtml(payment.method) +
    '<br><b>Amount received:</b> ' + formatMoney(payment.amount) +
    '</p><hr><p>Generated from the School Portal demonstration ledger.</p></body></html>');
  receipt.document.close();
  receipt.focus();
  receipt.print();
});

function showEverything() {
  fillAccountList();
  showSummary();
  showLedger();
  showTransactions();
}

/* ---------- Add a charge ---------- */

// When a student is chosen, fill in the description and the tuition for their grade
chargeStudent.addEventListener("change", function () {
  const student = findStudent(chargeStudent.value);
  if (student) {
    chargeDescription.value = "Tuition - " + student.cohort;
    chargeAmount.value = TUITION_BY_GRADE[student.gradeLevel] || "";
  }
});

chargeForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearChargeErrors();
  let allGood = true;

  const description = chargeDescription.value.trim();
  const amount = Number(chargeAmount.value);

  if (chargeStudent.value === "") {
    setError("chargeStudent", "Select a student.");
    allGood = false;
  }
  if (description.length < 3 || description.length > 60) {
    setError("chargeDescription", "Enter a description of 3 to 60 characters.");
    allGood = false;
  }
  if (chargeAmount.value === "" || isNaN(amount) || amount <= 0 || amount > 1000000) {
    setError("chargeAmount", "Enter an amount greater than 0 and not more than 1,000,000.");
    allGood = false;
  }
  if (chargeDueDate.value === "") {
    setError("chargeDueDate", "Choose the due date.");
    allGood = false;
  }

  if (!allGood) {
    chargeMessage.className = "message error";
    chargeMessage.textContent = "Please fix the errors shown above.";
    return;
  }

  const records = getData(STORAGE_KEYS.finances);
  const newRecord = {
    recordId: "L" + getNextNumber(records, "recordId"),
    studentId: chargeStudent.value,
    description: description,
    amountDue: Math.round(amount * 100) / 100,
    dueDate: chargeDueDate.value,
    payments: [],
  };
  records.push(newRecord);
  saveData(STORAGE_KEYS.finances, records);

  flashRecordId = newRecord.recordId;
  chargeForm.reset();
  chargeMessage.className = "message";
  chargeMessage.textContent =
    "Charge added. Status: " + getAccountStatus(newRecord) + ".";
  showEverything();
});

chargeForm.addEventListener("reset", function () {
  clearChargeErrors();
});

/* ---------- Record a payment ---------- */

// When an account is chosen, fill in the full balance as the payment amount
paymentRecord.addEventListener("change", function () {
  const records = getData(STORAGE_KEYS.finances);
  for (let i = 0; i < records.length; i++) {
    if (records[i].recordId === paymentRecord.value) {
      paymentAmount.value = getBalance(records[i]);
    }
  }
});

paymentForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearPaymentErrors();
  let allGood = true;

  const records = getData(STORAGE_KEYS.finances);
  const amount = Number(paymentAmount.value);
  let chosen = null;

  for (let i = 0; i < records.length; i++) {
    if (records[i].recordId === paymentRecord.value) {
      chosen = records[i];
    }
  }

  if (chosen === null) {
    setError("paymentRecord", "Select an account.");
    allGood = false;
  }

  if (paymentAmount.value === "" || isNaN(amount) || amount <= 0) {
    setError("paymentAmount", "Enter an amount greater than 0.");
    allGood = false;
  } else if (chosen !== null && amount > getBalance(chosen)) {
    setError("paymentAmount", "The payment is more than the balance (" + formatMoney(getBalance(chosen)) + ").");
    allGood = false;
  }

  if (paymentDate.value === "") {
    setError("paymentDate", "Choose the payment date.");
    allGood = false;
  } else if (paymentDate.value > getTodayText()) {
    setError("paymentDate", "The payment date cannot be in the future.");
    allGood = false;
  }

  if (!allGood) {
    paymentMessage.className = "message error";
    paymentMessage.textContent = "Please fix the errors shown above.";
    return;
  }

  chosen.payments.push({
    date: paymentDate.value,
    amount: Math.round(amount * 100) / 100,
    method: paymentMethod.value,
  });
  saveData(STORAGE_KEYS.finances, records);

  flashRecordId = chosen.recordId;
  paymentMessage.className = "message";
  paymentMessage.textContent =
    "Payment of " + formatMoney(amount) + " saved. New status: " + getAccountStatus(chosen) + ".";

  paymentForm.reset();
  paymentDate.value = getTodayText();
  showEverything();
});

paymentForm.addEventListener("reset", function () {
  clearPaymentErrors();
  // After the form clears, put today's date back in
  setTimeout(function () {
    paymentDate.value = getTodayText();
  }, 0);
});

/* ---------- Buttons in the ledger table ---------- */

ledgerBody.addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  if (button.dataset.action === "pay") {
    // Choose this account in the payment form and jump to it
    paymentRecord.value = button.dataset.id;
    paymentRecord.dispatchEvent(new Event("change"));
    document.getElementById("paymentHeading").scrollIntoView({ behavior: "smooth" });
    paymentAmount.focus();
  } else if (button.dataset.action === "delete") {
    if (!confirm("Delete this ledger record and all of its payments?")) {
      return;
    }
    const records = getData(STORAGE_KEYS.finances).filter(function (r) {
      return r.recordId !== button.dataset.id;
    });
    saveData(STORAGE_KEYS.finances, records);
    showEverything();
  }
});

/* ---------- Start the page ---------- */

paymentDate.value = getTodayText();
paymentDate.max = getTodayText();

fillStudentList();
showEverything();

ledgerSearch.addEventListener("input", showLedger);
ledgerStatus.addEventListener("change", showLedger);
