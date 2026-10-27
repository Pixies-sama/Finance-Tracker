// =========================================
// FINTRACK LANDING PAGE JAVASCRIPT
// =========================================

// Mobile navigation
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

function closeMenu() {
  navLinks.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  document.body.classList.remove("menu-open");

  menuToggle.innerHTML = '<i data-lucide="menu"></i>';

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function openMenu() {
  navLinks.classList.add("open");
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "Close navigation menu");
  document.body.classList.add("menu-open");

  menuToggle.innerHTML = '<i data-lucide="x"></i>';

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.contains("open");

  if (isOpen) {
    closeMenu();
  } else {
    openMenu();
  }
});

// Close the menu after clicking a navigation link
navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    closeMenu();
  });
});

// Close the menu with the Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

// Close the menu if the browser is resized to desktop width
window.addEventListener("resize", () => {
  if (window.innerWidth > 760) {
    closeMenu();
  }
});

// Automatically update the footer year
const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

// Initialize Lucide icons
function initializeIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeIcons);
} else {
  initializeIcons();
}
