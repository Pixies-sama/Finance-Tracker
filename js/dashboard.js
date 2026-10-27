import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// Sidebar elements
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// Close sidebar
function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("show");
  menuToggle.setAttribute("aria-expanded", "false");
}

// Open and close sidebar
menuToggle.addEventListener("click", () => {
  const isOpen = sidebar.classList.toggle("open");

  sidebarOverlay.classList.toggle("show", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

sidebarOverlay.addEventListener("click", closeSidebar);

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAN6IdtEqc2UrP7HmJZNVJuFhXf3mfapQ0",
  authDomain: "finance-tracker-23a17.firebaseapp.com",
  projectId: "finance-tracker-23a17",
  storageBucket: "finance-tracker-23a17.firebasestorage.app",
  messagingSenderId: "773713831206",
  appId: "1:773713831206:web:94596f675d9b3bea5b0de7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Dashboard elements
const logoutButton = document.getElementById("logoutButton");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userAvatar = document.getElementById("userAvatar");

// Generate initials for the avatar
function getInitials(name) {
  if (!name || !name.trim()) {
    return "U";
  }

  const nameParts = name.trim().split(/\s+/);

  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }

  return (
    nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
  ).toUpperCase();
}

// Check the signed-in user
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("../Auth/signin.html");
    return;
  }

  try {
    // Refresh the user's authentication information
    await user.reload();

    // Block unverified email/password accounts
    if (!user.emailVerified) {
      await signOut(auth);
      window.location.replace("../Auth/signin.html");
      return;
    }

    // Get this user's document from Firestore
    const userRef = doc(db, "Users", user.uid);
    const userSnapshot = await getDoc(userRef);

    let fullName = user.displayName || "";

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();

      // Your signup form saves the name as "fullName"
      fullName = userData.fullName || fullName;

      console.log("User data:", userData);
    } else {
      console.log("No Firestore profile found for this user.");
    }

    // Display username
    userName.textContent = fullName || "User";

    // Display email from Authentication, with Firestore fallback
    userEmail.textContent =
      user.email ||
      (userSnapshot.exists() ? userSnapshot.data().email : "") ||
      "No email available";

    // Display initials in the avatar
    userAvatar.textContent = getInitials(fullName);
  } catch (error) {
    console.error("Unable to load dashboard profile:", error);
    userName.textContent = "User";
    userEmail.textContent = user.email || "Unable to load email";
    userAvatar.textContent = getInitials(user.displayName || "");
  }
});

// Log the user out
logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("../Auth/signin.html");
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Unable to log out. Please try again.");
  }
});
