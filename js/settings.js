

import { auth, db } from "../js/config.js";

import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// Keep your existing settings logic below this line.

// 3. Get page elements
const profileForm = document.getElementById("profileForm");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");

const profileDisplayName = document.getElementById("profileDisplayName");
const profileDisplayEmail = document.getElementById("profileDisplayEmail");
const profileAvatar = document.getElementById("profileAvatar");

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userAvatar = document.getElementById("userAvatar");

const profileMessage = document.getElementById("profileMessage");
const securityMessage = document.getElementById("securityMessage");
const preferencesMessage = document.getElementById("preferencesMessage");

const resetPasswordButton = document.getElementById(
  "resetPasswordButton"
);

const savePreferencesButton = document.getElementById("savePreferences");
const currencySelect = document.getElementById("currency");

const logoutButton = document.getElementById("logoutButton");
const accountLogoutButton = document.getElementById(
  "accountLogoutButton"
);

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// Current signed-in user
let currentUser = null;

// 4. Helper functions
function showMessage(element, message, isError = false) {
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "#f87171" : "#2dd4bf";
}

function getInitials(name) {
  if (!name || !name.trim()) return "U";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("visible");
}

// 5. Load profile information
async function loadSettings(user) {
  try {
    const userRef = doc(db, "Users", user.uid);
    const userSnapshot = await getDoc(userRef);

    const userData = userSnapshot.exists()
      ? userSnapshot.data()
      : {};

    const savedName =
      userData.fullName?.trim() ||
      user.displayName ||
      "";

    const email = user.email || "";

    // Populate the profile form
    fullNameInput.value = savedName;
    emailInput.value = email;

    // Populate the profile preview
    profileDisplayName.textContent = savedName || "Your name";
    profileDisplayEmail.textContent = email;

    // Populate the sidebar
    userName.textContent = savedName || "User";
    userEmail.textContent = email;

    // Update avatars
    const initials = getInitials(savedName);

    profileAvatar.textContent = initials;
    userAvatar.textContent = initials;

    // Load the saved currency preference
    const savedCurrency = userData.currency || "NGN";

    const availableCurrencies = Array.from(
      currencySelect.options
    ).map((option) => option.value);

    currencySelect.value = availableCurrencies.includes(savedCurrency)
      ? savedCurrency
      : "NGN";
  } catch (error) {
    console.error("Error loading settings:", error);

    showMessage(
      profileMessage,
      "Unable to load your profile. Please refresh and try again.",
      true
    );
  }
}

// 6. Save profile changes
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const newName = fullNameInput.value.trim();

  if (!newName) {
    showMessage(profileMessage, "Please enter your full name.", true);
    return;
  }

  const saveButton = profileForm.querySelector(
    'button[type="submit"]'
  );

  try {
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const userRef = doc(db, "Users", currentUser.uid);

    // Save the name to the existing Users document
    await setDoc(
      userRef,
      { fullName: newName },
      { merge: true }
    );

    // Update the Firebase Authentication display name too
    await updateProfile(currentUser, {
      displayName: newName,
    });

    // Refresh the visible profile
    profileDisplayName.textContent = newName;
    userName.textContent = newName;

    const initials = getInitials(newName);
    profileAvatar.textContent = initials;
    userAvatar.textContent = initials;

    showMessage(profileMessage, "Profile updated successfully.");
  } catch (error) {
    console.error("Error saving profile:", error);

    showMessage(
      profileMessage,
      "Unable to save your profile. Please try again.",
      true
    );
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save changes";
  }
});

// 7. Password reset
resetPasswordButton.addEventListener("click", async () => {
  if (!currentUser?.email) {
    showMessage(
      securityMessage,
      "No email address is available for this account.",
      true
    );
    return;
  }

  try {
    resetPasswordButton.disabled = true;
    resetPasswordButton.textContent = "Sending...";

    await sendPasswordResetEmail(auth, currentUser.email);

    showMessage(
      securityMessage,
      `Password reset email sent to ${currentUser.email}. Check your inbox and spam folder.`
    );
  } catch (error) {
    console.error("Password reset error:", error);

    let message = "Unable to send the reset email. Please try again.";

    if (error.code === "auth/too-many-requests") {
      message = "Too many attempts. Please wait before trying again.";
    } else if (error.code === "auth/network-request-failed") {
      message = "Network error. Check your internet connection.";
    }

    showMessage(securityMessage, message, true);
  } finally {
    resetPasswordButton.disabled = false;
    resetPasswordButton.textContent = "Reset password";
  }
});

// 8. Save currency preference
savePreferencesButton.addEventListener("click", async () => {
  if (!currentUser) return;

  const selectedCurrency = currencySelect.value;

  try {
    savePreferencesButton.disabled = true;
    savePreferencesButton.textContent = "Saving...";

    const userRef = doc(db, "Users", currentUser.uid);

    await setDoc(
      userRef,
      { currency: selectedCurrency },
      { merge: true }
    );

    showMessage(
      preferencesMessage,
      "Currency preference saved successfully."
    );
  } catch (error) {
    console.error("Error saving preferences:", error);

    showMessage(
      preferencesMessage,
      "Unable to save preferences. Please try again.",
      true
    );
  } finally {
    savePreferencesButton.disabled = false;
    savePreferencesButton.textContent = "Save preferences";
  }
});

// 9. Log out
async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = "../Auth/signin.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Unable to log out. Please try again.");
  }
}

logoutButton.addEventListener("click", handleLogout);
accountLogoutButton.addEventListener("click", handleLogout);

// 10. Mobile sidebar
menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("visible");
});

sidebarOverlay.addEventListener("click", closeSidebar);

document.querySelectorAll(".sidebar-nav .nav-link").forEach((link) => {
  link.addEventListener("click", closeSidebar);
});

// 11. Check authentication
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Auth/signin.html";
    return;
  }

  // Match the verification requirement used on the dashboard
  if (!user.emailVerified) {
    await signOut(auth);
    window.location.href = "../Auth/signin.html";
    return;
  }

  currentUser = user;
  await loadSettings(user);
});
