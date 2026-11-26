/*
  School Portal - nav.js
  Group Members (Name | ID# | Fridays 12:00 PM - 1:50 PM):
    1. Shantelle Young | 2502159
    2. Domonique Butler | 2502160
    3. Jaheem Style | 2502161
    4. Abigail Reid | 2502162
    5. Ameallia Williams | 2502163
  Purpose: Opens and closes the menu on small screens, and labels table cells so tables can stack on phones
*/

const navToggle = document.getElementById("navToggle");
const adminNav = document.getElementById("adminNav");

// Opens or closes the menu and tells screen readers what happened
function setMenu(open) {
  adminNav.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
}

if (navToggle && adminNav) {
  navToggle.addEventListener("click", function () {
    setMenu(!adminNav.classList.contains("open"));
  });

  // The Escape key closes the menu
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && adminNav.classList.contains("open")) {
      setMenu(false);
      navToggle.focus();
    }
  });

  // Close the menu after a link is chosen
  adminNav.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      setMenu(false);
    }
  });

  // If the window becomes wide again, reset the menu
  window.addEventListener("resize", function () {
    if (window.innerWidth > 860) {
      setMenu(false);
    }
  });
}

/* ---------- Table cell labels (used by the stacked tables on phones) ---------- */

// Copies the text of each column heading into data-label on every cell of that column
function labelCells(table) {
  const headings = Array.from(table.querySelectorAll("thead th")).map(function (th) {
    return th.textContent.trim();
  });
  const rows = table.querySelectorAll("tbody tr");

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].children;
    for (let j = 0; j < cells.length; j++) {
      if (headings[j] && !cells[j].hasAttribute("colspan")) {
        cells[j].setAttribute("data-label", headings[j]);
      }
    }
  }
}

// The page scripts fill the tables after the page loads and again when filters change,
// so watch each table body and label the new rows
const tables = document.querySelectorAll("table.data-table");
for (let i = 0; i < tables.length; i++) {
  const table = tables[i];
  const body = table.querySelector("tbody");
  if (body) {
    labelCells(table);
    new MutationObserver(function () {
      labelCells(table);
    }).observe(body, { childList: true });
  }
}
