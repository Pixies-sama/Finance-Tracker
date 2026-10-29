let signinForm = document.getElementById("signinForm");
let email = document.getElementById("email");
let password = document.getElementById("password");
let signinMessage = document.getElementById("signinMessage");
let googleSignIn = document.getElementById("googleSignIn");



document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.target);
    if (!input) return;

    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";

    button.setAttribute("aria-pressed", String(isHidden));
    button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");

    // Swap the eye icon between open and crossed-out
    const svg = button.querySelector("svg");
    if (isHidden) {
      svg.innerHTML = `
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        <line x1="3" y1="3" x2="21" y2="21" />
      `;
    } else {
      svg.innerHTML = `
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      `;
    }
  });
});





import { auth } from "../js/config.js";

import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const provider = new GoogleAuthProvider();


signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    // await  signInWithEmailAndPassword(auth, email.value, password.value)
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.value.trim(),
      password.value,
    );

    const user = userCredential.user;

    if (user.emailVerified) {
      alert("Login successful!");
      window.location.href = "../pages/dashboard.html";
    } else {
      await signOut(auth);
      signinMessage.textContent = "Please verify your email before logging in.";
    }
  } catch (error) {
    // console.error(error.code, error.message);
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      signinMessage.textContent = "Incorrect email or password.";
    } else if (error.code === "auth/invalid-email") {
      signinMessage.textContent = "Please enter a valid email address.";
    } else if (error.code === "auth/too-many-requests") {
      signinMessage.textContent = "Too many attempts. Please try again later.";
    } else {
      signinMessage.textContent = "Something went wrong. Please try again.";
    }
  }
});


googleSignIn.addEventListener("click", async () => {
  // Prevent multiple popup requests
  if (googleSignIn.disabled) return;

  googleSignIn.disabled = true;
  signinMessage.textContent = "Connecting to Google...";

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (user.emailVerified) {
      window.location.href = "../pages/dashboard.html";
    } else {
      await signOut(auth);
      signinMessage.textContent =
        "Please verify your email before logging in.";
    }
  } catch (error) {
    console.error("Google sign-in error:", error.code, error.message);

    signinMessage.textContent =
      error.code === "auth/cancelled-popup-request"
        ? "A sign-in request was already in progress. Please try again."
        : "Google sign-in failed. Please try again.";
  } finally {
    googleSignIn.disabled = false;
  }
});

