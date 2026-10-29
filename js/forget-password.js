
import { auth } from "../js/config.js";

import {
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const email = document.getElementById("email");
const forgotMessage = document.getElementById("forgotMessage");
const resetButton = document.getElementById("resetButton");

// Keep your existing password-reset event listener below.


forgotPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userEmail = email.value.trim();

  forgotMessage.textContent = "";
  forgotMessage.classList.remove("error");
  resetButton.disabled = true;
  resetButton.textContent = "Sending...";

  try {
    await sendPasswordResetEmail(auth, userEmail);

    forgotMessage.textContent =
      "If an account exists for this email, you will receive a password reset link. Check your inbox and spam folder.";

    forgotPasswordForm.reset();
  } catch (error) {
    console.error(error.code, error.message);

    forgotMessage.classList.add("error");

    if (error.code === "auth/invalid-email") {
      forgotMessage.textContent = "Please enter a valid email address.";
    } else if (error.code === "auth/too-many-requests") {
      forgotMessage.textContent = "Too many attempts. Please try again later.";
    } else {
      forgotMessage.textContent =
        "Unable to process your request. Please try again.";
    }
  } finally {
    resetButton.disabled = false;
    resetButton.textContent = "Send Reset Link";
  }
});
