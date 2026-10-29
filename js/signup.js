let signupForm = document.getElementById("signupForm");
let fullName = document.getElementById("fullName");
let email = document.getElementById("email");
let password = document.getElementById("password");
let confirmPassword = document.getElementById("confirmPassword");
let signupMessage = document.getElementById("signupMessage");
let signupButton = document.getElementById("signupButton");
let googleSignupButton = document.getElementById("googleSignupButton");
let togglePassword = document.querySelectorAll("toggle-password")



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


import { auth, db } from "../js/config.js";

import {
  getDocs,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// Google sign-in provider
const provider = new GoogleAuthProvider();

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
          let user = {
              fullName: fullName.value.trim(),
              email: email.value.trim(),
              password: password.value,
              confirmPassword: confirmPassword.value,
            };
            if (user.password !== user.confirmPassword) {
            alert("Passwords do not match.");
            signupMessage.textContent = "Passwords do not match."
            return;
            
          }
          let userCredential = await createUserWithEmailAndPassword(
            auth,
            user.email,
            user.password,
          );
          console.log(user);

          const uid = userCredential.user.uid;
          await setDoc(doc(db, "Users", uid), {
            uid: uid,
            fullName: user.fullName,
            email: user.email,
          });

          const users = userCredential.user;
          await sendEmailVerification(users).then(() => {
            alert("Email link sent!");
          });

          await signOut(auth);
          alert("Account created successfully!");
          window.location.href = "signin.html";
        } catch (error) {
          console.error(error.code, error.message);
          if (error.code === "auth/email-already-in-use") {
            alert("An account with this email already exists.");
            signupMessage.textContent = "An account with this email already exists."
          } else if (error.code === "auth/invalid-email") {
            alert("Please enter a valid email address.");
          } else if (error.code === "auth/weak-password") {
            alert("Please choose a stronger password.");
          } else {
            alert("Something went wrong. Please try again.");
          }
        }
});
signupForm.addEventListener("input", () => {
    signupMessage.textContent = "";
});

googleSignupButton.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await setDoc(
      doc(db, "Users", user.uid),
      {
        uid: user.uid,
        fullName: user.displayName || "",
        email: user.email
      },
      { merge: true }
    );

    alert("Account signed in successfully!");
    window.location.href = "../pages/dashboard.html";

  } catch (error) {
    console.error(error.code, error.message);

    if (error.code === "auth/account-exists-with-different-credential") {
      signupMessage.textContent =
        "This email already has an account with another sign-in method.";
    } else {
      signupMessage.textContent =
        "Google sign-in failed. Please try again.";
    }
  }
});


