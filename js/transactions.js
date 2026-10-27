let editingTransactionId = null;
const openModalButton = document.getElementById("openModalButton");
const closeModalButton = document.getElementById("closeModalButton");
const cancelModalButton = document.getElementById("cancelModalButton");

const transactionModal = document.getElementById("transactionModal");
const transactionForm = document.getElementById("transactionForm");
const formMessage = document.getElementById("formMessage");

// Open the modal

function openModal() {
  editingTransactionId = null;

  transactionForm.reset();
  formMessage.textContent = "";
  formMessage.className = "form-message";

  document.querySelector("#transactionModal h2").textContent =
    "Add Transaction";

  saveTransactionButton.textContent = "Save Transaction";

  // Set today's date as the default
  transactionDate.value = new Date().toLocaleDateString("en-CA");

  transactionModal.classList.add("show");
  transactionModal.setAttribute("aria-hidden", "false");
}

// Close the modal
function closeModal() {
  transactionModal.classList.remove("show");
  transactionModal.setAttribute("aria-hidden", "true");
}

// Button events
openModalButton.addEventListener("click", openModal);
closeModalButton.addEventListener("click", closeModal);
cancelModalButton.addEventListener("click", closeModal);

// Close when clicking outside the form
transactionModal.addEventListener("click", (event) => {
  if (event.target === transactionModal) {
    closeModal();
  }
});

// Close with the Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && transactionModal.classList.contains("show")) {
    closeModal();
  }
});

// Show a message inside the form
function showFormMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// Your existing Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAN6IdtEqc2UrP7HmJZNVJuFhXf3mfapQ0",
  authDomain: "finance-tracker-23a17.firebaseapp.com",
  projectId: "finance-tracker-23a17",
  storageBucket: "finance-tracker-23a17.firebasestorage.app",
  messagingSenderId: "773713831206",
  appId: "1:773713831206:web:94596f675d9b3bea5b0de7",
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Current signed-in user
let currentUser = null;

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userAvatar = document.getElementById("userAvatar");
const logoutButton = document.getElementById("logoutButton");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("../Auth/signin.html");
    return;
  }

  try {
    await user.reload();

    if (!user.emailVerified) {
      await signOut(auth);
      window.location.replace("../Auth/signin.html");
      return;
    }

    currentUser = auth.currentUser;

    const userRef = doc(db, "Users", currentUser.uid);
    const userSnapshot = await getDoc(userRef);

    let fullName = currentUser.displayName || "";

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      fullName = userData.fullName || fullName;
    }

    userName.textContent = fullName || "User";
    userEmail.textContent = currentUser.email || "No email available";

    if (fullName.trim()) {
      const nameParts = fullName.trim().split(/\s+/);

      userAvatar.textContent = (
        nameParts[0][0] +
        (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : "")
      ).toUpperCase();
    } else {
      userAvatar.textContent = "U";
    }

    await loadTransactions();
    console.log("Authenticated user:", currentUser.uid);
    console.log("Firestore connection ready.");
  } catch (error) {
    console.error("Unable to load user profile:", error);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("../Auth/signin.html");
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Unable to log out. Please try again.");
  }
});

const transactionType = document.getElementById("transactionType");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const transactionDate = document.getElementById("transactionDate");
const saveTransactionButton = document.getElementById("saveTransactionButton");

// Save a transaction when the form is submitted
transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showFormMessage("Please sign in before saving a transaction.", "error");
    return;
  }

  const type = transactionType.value;
  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = transactionDate.value;

  // Validate the form
  if (
    !description ||
    !category ||
    !date ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    showFormMessage("Please enter valid details in all fields.", "error");
    return;
  }

  try {
    saveTransactionButton.disabled = true;
    saveTransactionButton.textContent = editingTransactionId
      ? "Updating..."
      : "Saving...";

    const transactionData = {
      type: type,
      description: description,
      amount: amount,
      category: category,
      date: date,
    };

    const transactionsRef = collection(
      db,
      "Users",
      currentUser.uid,
      "Transactions",
    );

    if (editingTransactionId) {
      const transactionRef = doc(
        db,
        "Users",
        currentUser.uid,
        "Transactions",
        editingTransactionId,
      );

      await updateDoc(transactionRef, transactionData);

      showFormMessage("Transaction updated successfully!", "success");
    } else {
      await addDoc(transactionsRef, {
        ...transactionData,
        createdAt: serverTimestamp(),
      });

      showFormMessage("Transaction saved successfully!", "success");
    }

    await loadTransactions();

    transactionForm.reset();
    editingTransactionId = null;
    closeModal();

    console.log("Transaction saved successfully.");
  } catch (error) {
    console.error("Error saving transaction:", error);
    showFormMessage("Unable to save transaction. Please try again.", "error");
  } finally {
    saveTransactionButton.disabled = false;
    saveTransactionButton.textContent = "Save Transaction";
  }
});

const transactionsTableBody = document.getElementById("transactionsTableBody");
const totalIncomeElement = document.getElementById("totalIncome");
const totalExpensesElement = document.getElementById("totalExpenses");
const transactionCountElement = document.getElementById("transactionCount");
const typeFilter = document.getElementById("typeFilter");

let allTransactions = [];

async function loadTransactions() {
  if (!currentUser) return;

  try {
    const transactionsRef = collection(
      db,
      "Users",
      currentUser.uid,
      "Transactions",
    );

    const transactionQuery = query(transactionsRef, orderBy("date", "desc"));

    const snapshot = await getDocs(transactionQuery);

    allTransactions = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    displayTransactions();
    updateSummary();

    console.log("Transactions loaded:", allTransactions.length);
  } catch (error) {
    console.error("Error loading transactions:", error);
    transactionsTableBody.innerHTML = `
            <tr>
                <td colspan="6">Unable to load transactions.</td>
            </tr>
        `;
  }
}

function displayTransactions() {
  const selectedType = typeFilter.value;

  const filteredTransactions = allTransactions.filter((transaction) => {
    return selectedType === "all" || transaction.type === selectedType;
  });

  function editTransaction(transactionId) {
    const transaction = allTransactions.find(
      (item) => item.id === transactionId,
    );

    if (!transaction) {
      alert("Transaction not found.");
      return;
    }

    editingTransactionId = transactionId;

    transactionType.value = transaction.type;
    descriptionInput.value = transaction.description;
    amountInput.value = transaction.amount;
    categoryInput.value = transaction.category;
    transactionDate.value = transaction.date;

    formMessage.textContent = "";
    formMessage.className = "form-message";

    document.querySelector("#transactionModal h2").textContent =
      "Edit Transaction";

    saveTransactionButton.textContent = "Update Transaction";

    transactionModal.classList.add("show");
    transactionModal.setAttribute("aria-hidden", "false");
  }

  transactionsTableBody.replaceChildren();

  if (filteredTransactions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.textContent = "No transactions found.";
    row.appendChild(cell);
    transactionsTableBody.appendChild(row);
    return;
  }

  filteredTransactions.forEach((transaction) => {
    const row = document.createElement("tr");

    const values = [
      transaction.description,
      transaction.category,
      transaction.date,
      transaction.type === "income" ? "Income" : "Expense",
      `${transaction.type === "income" ? "+" : "-"}₦${Number(
        transaction.amount,
      ).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ];

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;

      if (index === 3) {
        cell.classList.add(
          transaction.type === "income" ? "income-text" : "expense-text",
        );
      }

      if (index === 4) {
        cell.classList.add(
          transaction.type === "income" ? "income-text" : "expense-text",
        );
      }

      row.appendChild(cell);
    });

    const actionsCell = document.createElement("td");
    actionsCell.classList.add("actions-cell");

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.type = "button";
    editButton.className = "edit-button";

    editButton.addEventListener("click", () => {
      editTransaction(transaction.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.type = "button";
    deleteButton.className = "delete-button";

    // We'll implement the delete function next
    deleteButton.addEventListener("click", () => {
      deleteTransaction(transaction.id);
    });

    actionsCell.append(editButton, deleteButton);
    row.appendChild(actionsCell);

    transactionsTableBody.appendChild(row);
  });
}

typeFilter.addEventListener("change", displayTransactions);

function updateSummary() {
  const income = allTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const expenses = allTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  totalIncomeElement.textContent = `₦${income.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  totalExpensesElement.textContent = `₦${expenses.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  transactionCountElement.textContent = allTransactions.length;
}

async function deleteTransaction(transactionId) {
  if (!currentUser) {
    alert("Please sign in before deleting a transaction.");
    return;
  }

  const transaction = allTransactions.find((item) => item.id === transactionId);

  if (!transaction) {
    alert("Transaction not found.");
    return;
  }

  const confirmed = confirm(
    `Are you sure you want to delete "${transaction.description}"? This action cannot be undone.`,
  );

  if (!confirmed) return;

  try {
    const transactionRef = doc(
      db,
      "Users",
      currentUser.uid,
      "Transactions",
      transactionId,
    );

    await deleteDoc(transactionRef);

    await loadTransactions();

    alert("Transaction deleted successfully!");
  } catch (error) {
    console.error("Error deleting transaction:", error);
    alert("Unable to delete transaction. Please try again.");
  }
}
