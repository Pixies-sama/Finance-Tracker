
import { app, auth, db } from "../js/config.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";


// ==============================
// SIDEBAR
// ==============================

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("show");
  menuToggle?.setAttribute("aria-expanded", "false");
}

menuToggle?.addEventListener("click", () => {
  const isOpen = sidebar.classList.toggle("open");

  sidebarOverlay?.classList.toggle("show", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

sidebarOverlay?.addEventListener("click", closeSidebar);

// ==============================
// DASHBOARD ELEMENTS
// ==============================

const logoutButton = document.getElementById("logoutButton");

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userAvatar = document.getElementById("userAvatar");
const welcomeName = document.getElementById("welcomeName");

const totalBalance = document.getElementById("totalBalance");
const totalIncome = document.getElementById("totalIncome");
const totalExpenses = document.getElementById("totalExpenses");

const recentTransactions = document.getElementById(
  "recentTransactions"
);

// ==============================
// FORMATTING HELPERS
// ==============================

function formatMoney(amount) {
  return `₦${Number(amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getInitials(name) {
  if (!name || !name.trim()) {
    return "U";
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function formatDate(dateString) {
  if (!dateString) return "—";

  // Parse YYYY-MM-DD as a local calendar date.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (match) {
    const [, year, month, day] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return dateString;
}

// ==============================
// FINANCIAL SUMMARY
// ==============================

function updateFinancialSummary(transactions) {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0
    );

  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0
    );

  const balance = income - expenses;

  totalIncome.textContent = formatMoney(income);
  totalExpenses.textContent = formatMoney(expenses);
  totalBalance.textContent = formatMoney(balance);
}

// ==============================
// RECENT TRANSACTIONS
// ==============================

function displayRecentTransactions(transactions) {
  recentTransactions.replaceChildren();

  const latestTransactions = transactions.slice(0, 5);

  if (latestTransactions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.className = "empty-table";
    cell.textContent =
      "No transactions yet. Add your first transaction to get started.";

    row.appendChild(cell);
    recentTransactions.appendChild(row);

    return;
  }

  latestTransactions.forEach((transaction) => {
    const row = document.createElement("tr");

    // Transaction description
    const descriptionCell = document.createElement("td");
    descriptionCell.textContent = transaction.description || "Untitled";

    // Category
    const categoryCell = document.createElement("td");
    categoryCell.textContent = transaction.category || "Uncategorized";

    // Date
    const dateCell = document.createElement("td");
    dateCell.textContent = formatDate(transaction.date);

    // Amount
    const amountCell = document.createElement("td");
    const isIncome = transaction.type === "income";

    amountCell.textContent =
      `${isIncome ? "+" : "-"}${formatMoney(transaction.amount)}`;

    amountCell.classList.add(
      isIncome ? "income-text" : "expense-text"
    );

    // Type
    const typeCell = document.createElement("td");
    typeCell.textContent = isIncome ? "Income" : "Expense";

    typeCell.classList.add(
      isIncome ? "income-text" : "expense-text"
    );

    row.append(
      descriptionCell,
      categoryCell,
      dateCell,
      amountCell,
      typeCell
    );

    recentTransactions.appendChild(row);
  });
}

// ==============================
// LOAD USER PROFILE
// ==============================

async function loadUserProfile(user) {
  let fullName = user.displayName || "";

  try {
    const userRef = doc(db, "Users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      fullName = userData.fullName || fullName;
    }
  } catch (error) {
    console.error("Unable to load Firestore profile:", error);
  }

  userName.textContent = fullName || "User";
  userEmail.textContent = user.email || "No email available";
  userAvatar.textContent = getInitials(fullName);

  if (welcomeName) {
    welcomeName.textContent = fullName
      ? fullName.trim().split(/\s+/)[0]
      : "there";
  }
}

// ==============================
// REAL-TIME TRANSACTIONS
// ==============================

let unsubscribeTransactions = null;

function listenForTransactions(user) {
  // Stop listening to any previous user's transactions.
  if (unsubscribeTransactions) {
    unsubscribeTransactions();
    unsubscribeTransactions = null;
  }

  recentTransactions.innerHTML = `
    <tr>
      <td colspan="5" class="empty-table">
        Loading transactions...
      </td>
    </tr>
  `;

  const transactionsRef = collection(
    db,
    "Users",
    user.uid,
    "Transactions"
  );

  const transactionsQuery = query(
    transactionsRef,
    orderBy("date", "desc")
  );

  unsubscribeTransactions = onSnapshot(
    transactionsQuery,
    (snapshot) => {
      const transactions = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      updateFinancialSummary(transactions);
      displayRecentTransactions(transactions);

      console.log(
        "Dashboard transactions updated:",
        transactions.length
      );
    },
    (error) => {
      console.error("Unable to load dashboard transactions:", error);

      recentTransactions.innerHTML = `
        <tr>
          <td colspan="5" class="empty-table">
            Unable to load transactions. Please refresh the page.
          </td>
        </tr>
      `;
    }
  );
}

// ==============================
// AUTHENTICATION
// ==============================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (unsubscribeTransactions) {
      unsubscribeTransactions();
      unsubscribeTransactions = null;
    }

    window.location.replace("../Auth/signin.html");
    return;
  }

  try {
    await user.reload();

    const refreshedUser = auth.currentUser;

    if (!refreshedUser) {
      window.location.replace("../Auth/signin.html");
      return;
    }

    // Require verified email accounts.
    if (!refreshedUser.emailVerified) {
      await signOut(auth);
      window.location.replace("../Auth/signin.html");
      return;
    }

    await loadUserProfile(refreshedUser);
    listenForTransactions(refreshedUser);

    console.log("Dashboard authenticated:", refreshedUser.uid);
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
  }
});

// ==============================
// LOGOUT
// ==============================

logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("../Auth/signin.html");
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Unable to log out. Please try again.");
  }
});
