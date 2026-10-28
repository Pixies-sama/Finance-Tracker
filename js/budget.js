
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// --------------------------------------------------
// 1. FIREBASE CONFIGURATION
// Keep this consistent with transactions.js.
// --------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyAN6IdtEqc2UrP7HmJZNVJuFhXf3mfapQ0",
  authDomain: "finance-tracker-23a17.firebaseapp.com",
  projectId: "finance-tracker-23a17",
  storageBucket: "finance-tracker-23a17.firebasestorage.app",
  messagingSenderId: "773713831206",
  appId: "1:773713831206:web:94596f675d9b3bea5b0de7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --------------------------------------------------
// 2. DOM ELEMENTS
// --------------------------------------------------

const budgetList = document.getElementById("budgetList");
const budgetModal = document.getElementById("budgetModal");
const budgetForm = document.getElementById("budgetForm");

const addBudgetBtn = document.getElementById("addBudgetBtn");
const emptyAddBudgetBtn = document.getElementById("emptyAddBudgetBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");

const budgetCategory = document.getElementById("budgetCategory");
const budgetAmount = document.getElementById("budgetAmount");
const budgetMonth = document.getElementById("budgetMonth");
const periodFilter = document.getElementById("periodFilter");

const formError = document.getElementById("formError");
const modalTitle = document.getElementById("modalTitle");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const emptyState = document.getElementById("emptyState");

const logoutBtn = document.getElementById("logoutBtn");
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// --------------------------------------------------
// 3. APPLICATION STATE
// --------------------------------------------------

let currentUser = null;
let budgets = [];
let transactions = [];
let editingBudgetId = null;
let stopBudgetListener = null;
let stopTransactionListener = null;
let isSaving = false;

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2
});

function formatMoney(amount) {
  return currencyFormatter.format(amount);
}

function getLocalMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getLocalYear() {
  return String(new Date().getFullYear());
}


function getSelectedMonth() {
  const today = new Date();

  if (periodFilter.value === "lastMonth") {
    return getLocalMonth(
      new Date(today.getFullYear(), today.getMonth() - 1, 1)
    );
  }

  return getLocalMonth(today);
}

// --------------------------------------------------
// 4. CATEGORY ICONS AND COLORS
// --------------------------------------------------

const categoryIcons = {
  "Food & Dining": "🍽️",
  Transportation: "🚌",
  Shopping: "🛍️",
  "Bills & Utilities": "⚡",
  Education: "📚",
  Health: "💊",
  Entertainment: "🎬",
  Rent: "🏠",
  "Personal Care": "✨",
  Other: "◈"
};

const categoryColors = {
  "Food & Dining": "#ffb56b",
  Transportation: "#20b8ff",
  Shopping: "#a78bfa",
  "Bills & Utilities": "#25d0b1",
  Education: "#ff8fa3",
  Health: "#5ee0c1",
  Entertainment: "#f5c76c",
  Rent: "#8ba8ff",
  "Personal Care": "#f49cc4",
  Other: "#9eafc4"
};

// --------------------------------------------------
// 5. AUTHENTICATION AND PROFILE
// --------------------------------------------------

function stopFirestoreListeners() {
  if (stopBudgetListener) {
    stopBudgetListener();
    stopBudgetListener = null;
  }

  if (stopTransactionListener) {
    stopTransactionListener();
    stopTransactionListener = null;
  }
}

function showPageError(message) {
  formError.textContent = message;
}

async function loadUserProfile(user) {
  document.getElementById("userEmail").textContent = user.email || "";
  document.getElementById("userAvatar").textContent =
    (user.displayName || user.email || "U").charAt(0).toUpperCase();

  try {
    const userRef = doc(db, "Users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (auth.currentUser?.uid !== user.uid) return;

    const profile = userSnapshot.exists() ? userSnapshot.data() : {};
    const fullName = profile.fullName || user.displayName || "User";

    document.getElementById("userName").textContent = fullName;
    document.getElementById("userAvatar").textContent =
      fullName.charAt(0).toUpperCase();
  } catch (error) {
    console.error("Could not load user profile:", error);
    document.getElementById("userName").textContent =
      user.displayName || "User";
  }
}

onAuthStateChanged(auth, async (user) => {
  stopFirestoreListeners();

  currentUser = null;
  budgets = [];
  transactions = [];
  renderBudgets();

  if (!user) {
    window.location.href = "Auth/signin.html";
    return;
  }

  try {
    await user.reload();

    // Re-check that this is still the active account.
    const refreshedUser = auth.currentUser;

    if (!refreshedUser || refreshedUser.uid !== user.uid) return;

    if (!refreshedUser.emailVerified) {
      window.location.href = "Auth/signin.html";
      return;
    }

    currentUser = refreshedUser;

    await loadUserProfile(refreshedUser);

    if (!currentUser || currentUser.uid !== refreshedUser.uid) return;

    listenForBudgets(refreshedUser.uid);
    listenForTransactions(refreshedUser.uid);
  } catch (error) {
    console.error("Authentication check failed:", error);
    window.location.href = "Auth/signin.html";
  }
});

// --------------------------------------------------
// 6. LOAD BUDGETS FROM FIRESTORE
// Path: Users/{uid}/Budgets/{budgetId}
// --------------------------------------------------

function listenForBudgets(uid) {
  const budgetsRef = collection(db, "Users", uid, "Budgets");

  stopBudgetListener = onSnapshot(
    budgetsRef,
    (snapshot) => {
      budgets = snapshot.docs.map((budgetDoc) => ({
        id: budgetDoc.id,
        ...budgetDoc.data()
      }));

      renderBudgets();
    },
    (error) => {
      console.error("Could not load budgets:", error);
      showPageError("Unable to load budgets. Please refresh the page.");
    }
  );
}

// --------------------------------------------------
// 7. LOAD TRANSACTIONS FROM FIRESTORE
// Path: Users/{uid}/Transactions/{transactionId}
// --------------------------------------------------

function listenForTransactions(uid) {
  const transactionsRef = collection(
    db,
    "Users",
    uid,
    "Transactions"
  );

  stopTransactionListener = onSnapshot(
    transactionsRef,
    (snapshot) => {
      transactions = snapshot.docs.map((transactionDoc) => ({
        id: transactionDoc.id,
        ...transactionDoc.data()
      }));

      renderBudgets();
    },
    (error) => {
      console.error("Could not load transactions:", error);
      showPageError(
        "Budgets loaded, but transactions could not be retrieved."
      );
    }
  );
}

// --------------------------------------------------
// 8. FILTER BUDGETS BY SELECTED PERIOD
// --------------------------------------------------

function getVisibleBudgets() {
  const selectedPeriod = periodFilter.value;
  const today = new Date();

  if (selectedPeriod === "year") {
    const year = getLocalYear();

    return budgets
      .filter((budget) =>
        typeof budget.month === "string" &&
        budget.month.startsWith(year)
      )
      .map(addCalculatedSpending);
  }

  let selectedMonth = getLocalMonth(today);

  if (selectedPeriod === "lastMonth") {
    selectedMonth = getLocalMonth(
      new Date(today.getFullYear(), today.getMonth() - 1, 1)
    );
  }

  return budgets
    .filter((budget) => budget.month === selectedMonth)
    .map(addCalculatedSpending);
}

// --------------------------------------------------
// 9. CALCULATE SPENDING FROM REAL TRANSACTIONS
// --------------------------------------------------


function normalizeCategory(category) {
  const value = String(category || "")
    .trim()
    .toLowerCase();

  const categoryAliases = {
    "transport": "transportation",
    "transportation": "transportation",
    "food": "food & dining",
    "food & dining": "food & dining",
    "bill": "bills & utilities",
    "bills": "bills & utilities",
    "bills & utilities": "bills & utilities"
  };

  return categoryAliases[value] || value;
}

function addCalculatedSpending(budget) {
  const month = budget.month;
  const category = normalizeCategory(budget.category);

  const spent = transactions.reduce((total, transaction) => {
    if (transaction.type !== "expense") return total;

    if (
      normalizeCategory(transaction.category) !== category
    ) {
      return total;
    }

    if (
      typeof transaction.date !== "string" ||
      !transaction.date.startsWith(month)
    ) {
      return total;
    }

    const amount = Number(transaction.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return total;
    }

    return total + amount;
  }, 0);

  return {
    ...budget,
    limit: Number(budget.limit) || 0,
    spent,
    icon: categoryIcons[budget.category] || "◈",
    color: categoryColors[budget.category] || "#9eafc4"
  };
}


// --------------------------------------------------
// 10. CALCULATE TOTALS AND PROGRESS
// --------------------------------------------------

function getTotals(items) {
  return items.reduce(
    (totals, budget) => {
      totals.limit += budget.limit;
      totals.spent += budget.spent;

      return totals;
    },
    { limit: 0, spent: 0 }
  );
}

function getProgress(spent, limit) {
  if (limit <= 0) return 0;

  return Math.min((spent / limit) * 100, 100);
}

function getProgressClass(spent, limit) {
  if (limit > 0 && spent > limit) return "danger";
  if (limit > 0 && spent / limit >= 0.8) return "warning";

  return "";
}

function renderSummary(items) {
  const { limit, spent } = getTotals(items);

  const remaining = limit - spent;
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const progress = Math.min(percentage, 100);

  document.getElementById("totalBudget").textContent =
    formatMoney(limit);

  document.getElementById("totalSpent").textContent =
    formatMoney(spent);

  document.getElementById("remainingBudget").textContent =
    formatMoney(remaining);

  document.getElementById("budgetUsed").textContent =
    `${Math.round(percentage)}%`;

  document.getElementById("overallProgress").style.width =
    `${progress}%`;

  document.getElementById("overallSpent").textContent =
    formatMoney(spent);

  document.getElementById("overallLimit").textContent =
    formatMoney(limit);

  document.getElementById("overallLargeProgress").style.width =
    `${progress}%`;

  document.getElementById("overallProgressText").textContent =
    `${Math.round(percentage)}% of budget used`;

  document.getElementById("overallRemainingText").textContent =
    remaining >= 0
      ? `${formatMoney(remaining)} remaining`
      : `${formatMoney(Math.abs(remaining))} over budget`;

  const status = document.getElementById("overallStatus");
  const progressBar = document.getElementById("overallLargeProgress");

  status.className = "period-badge";
  progressBar.className = "";

  if (limit === 0) {
    status.textContent = "No budget set";
  } else if (spent > limit) {
    status.textContent = "Over budget";
    status.classList.add("danger");
    progressBar.classList.add("danger");
  } else if (percentage >= 80) {
    status.textContent = "Near limit";
    status.classList.add("warning");
    progressBar.classList.add("warning");
  } else {
    status.textContent = "On track";
  }
}

// --------------------------------------------------
// 11. RENDER CATEGORY BUDGETS
// --------------------------------------------------

function renderBudgets() {
  if (!budgetList) return;

  const visibleBudgets = getVisibleBudgets();

  renderSummary(visibleBudgets);

  document.getElementById("budgetCount").textContent =
    `${visibleBudgets.length} ${
      visibleBudgets.length === 1 ? "budget" : "budgets"
    }`;

  budgetList.innerHTML = "";

  emptyState.classList.toggle("hidden", visibleBudgets.length > 0);
  budgetList.classList.toggle("hidden", visibleBudgets.length === 0);

  visibleBudgets.forEach((budget) => {
    const percentage =
      budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;

    const progress = getProgress(budget.spent, budget.limit);
    const progressClass = getProgressClass(
      budget.spent,
      budget.limit
    );

    const remaining = budget.limit - budget.spent;

    const row = document.createElement("article");
    row.className = "budget-row";

    const categoryInfo = document.createElement("div");
    categoryInfo.className = "category-info";

    const icon = document.createElement("div");
    icon.className = "category-icon";
    icon.textContent = budget.icon;
    icon.style.color = budget.color;

    const categoryText = document.createElement("div");

    const categoryName = document.createElement("p");
    categoryName.className = "category-name";
    categoryName.textContent = budget.category;

    const categorySubtitle = document.createElement("p");
    categorySubtitle.className = "category-subtitle";
    categorySubtitle.textContent = budget.month;

    categoryText.append(categoryName, categorySubtitle);
    categoryInfo.append(icon, categoryText);

    const progressArea = document.createElement("div");
    progressArea.className = "budget-progress-area";

    const progressLabels = document.createElement("div");
    progressLabels.className = "budget-progress-labels";

    const spentLabel = document.createElement("span");
    spentLabel.textContent = `${formatMoney(budget.spent)} spent`;

    const percentageLabel = document.createElement("span");
    percentageLabel.textContent = `${Math.round(percentage)}%`;

    progressLabels.append(spentLabel, percentageLabel);

    const progressTrack = document.createElement("div");
    progressTrack.className = "budget-progress";

    const progressFill = document.createElement("div");
    progressFill.style.width = `${progress}%`;

    if (progressClass) {
      progressFill.classList.add(progressClass);
    }

    progressTrack.appendChild(progressFill);
    progressArea.append(progressLabels, progressTrack);

    const amountArea = document.createElement("div");
    amountArea.className = "budget-amounts";

    const limitLabel = document.createElement("strong");
    limitLabel.textContent = formatMoney(budget.limit);

    const remainingLabel = document.createElement("span");
    remainingLabel.textContent =
      remaining >= 0
        ? `${formatMoney(remaining)} left`
        : `${formatMoney(Math.abs(remaining))} over limit`;

    if (remaining < 0) {
      remainingLabel.style.color = "var(--danger)";
    }

    amountArea.append(limitLabel, remainingLabel);

    const actions = document.createElement("div");
    actions.className = "budget-actions";

    const editButton = document.createElement("button");
    editButton.className = "icon-button";
    editButton.type = "button";
    editButton.textContent = "✎";
    editButton.title = "Edit budget";
    editButton.setAttribute(
      "aria-label",
      `Edit ${budget.category} budget`
    );

    editButton.addEventListener("click", () => {
      openEditModal(budget.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button delete";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete budget";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${budget.category} budget`
    );

    deleteButton.addEventListener("click", () => {
      deleteBudget(budget.id);
    });

    actions.append(editButton, deleteButton);

    row.append(categoryInfo, progressArea, amountArea, actions);
    budgetList.appendChild(row);
  });
}

// --------------------------------------------------
// 12. ADD AND EDIT BUDGET MODAL
// --------------------------------------------------

function openModal() {
  if (!currentUser) return;

  editingBudgetId = null;
  budgetForm.reset();

  budgetMonth.value = getSelectedMonth();
  modalTitle.textContent = "Create a budget";
  saveBudgetBtn.textContent = "Save budget";
  formError.textContent = "";

  budgetModal.classList.remove("hidden");
  budgetCategory.focus();
}

function openEditModal(id) {
  const budget = budgets.find((item) => item.id === id);

  if (!budget) return;

  editingBudgetId = id;

  budgetCategory.value = budget.category;
  budgetAmount.value = budget.limit;
  budgetMonth.value = budget.month;

  modalTitle.textContent = "Edit budget";
  saveBudgetBtn.textContent = "Update budget";
  formError.textContent = "";

  budgetModal.classList.remove("hidden");
  budgetCategory.focus();
}

function closeModal() {
  budgetModal.classList.add("hidden");
  budgetForm.reset();
  editingBudgetId = null;
  formError.textContent = "";
}

// --------------------------------------------------
// 13. SAVE BUDGET TO FIRESTORE
// --------------------------------------------------

budgetForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || isSaving) return;

  const category = budgetCategory.value;
  const limit = Number(budgetAmount.value);
  const month = budgetMonth.value;

  if (
    !category ||
    !month ||
    !Number.isFinite(limit) ||
    limit <= 0
  ) {
    showPageError(
      "Please select a category, enter a valid amount, and choose a month."
    );
    return;
  }

  formError.textContent = "";

  const duplicate = budgets.find((budget) =>
    budget.category === category &&
    budget.month === month &&
    budget.id !== editingBudgetId
  );

  if (duplicate) {
    formError.textContent =
      "A budget already exists for this category and month.";
    return;
  }

  isSaving = true;
  saveBudgetBtn.disabled = true;
  saveBudgetBtn.textContent = "Saving...";

  try {
    const uid = currentUser.uid;
    const budgetRef = editingBudgetId
      ? doc(db, "Users", uid, "Budgets", editingBudgetId)
      : doc(collection(db, "Users", uid, "Budgets"));

    const budgetData = {
      category,
      limit,
      month,
      updatedAt: serverTimestamp()
    };

    if (!editingBudgetId) {
      budgetData.createdAt = serverTimestamp();
    }

    await setDoc(budgetRef, budgetData, { merge: true });

    closeModal();
    // onSnapshot updates the list and totals automatically.
  } catch (error) {
    console.error("Could not save budget:", error);
    formError.textContent =
      "Could not save your budget. Check your connection and try again.";
  } finally {
    isSaving = false;
    saveBudgetBtn.disabled = false;
    saveBudgetBtn.textContent = editingBudgetId
      ? "Update budget"
      : "Save budget";
  }
});

// --------------------------------------------------
// 14. DELETE BUDGET FROM FIRESTORE
// --------------------------------------------------

async function deleteBudget(id) {
  if (!currentUser) return;

  const budget = budgets.find((item) => item.id === id);

  if (!budget) return;

  const confirmed = window.confirm(
    `Delete the ${budget.category} budget for ${budget.month}?`
  );

  if (!confirmed) return;

  try {
    await deleteDoc(
      doc(db, "Users", currentUser.uid, "Budgets", id)
    );
    // onSnapshot refreshes the list automatically.
  } catch (error) {
    console.error("Could not delete budget:", error);
    window.alert("Could not delete this budget. Please try again.");
  }
}

// --------------------------------------------------
// 15. UI EVENT LISTENERS
// --------------------------------------------------

addBudgetBtn.addEventListener("click", openModal);
emptyAddBudgetBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelModalBtn.addEventListener("click", closeModal);

budgetModal.addEventListener("click", (event) => {
  if (event.target === budgetModal) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    !budgetModal.classList.contains("hidden")
  ) {
    closeModal();
  }
});

periodFilter.addEventListener("change", renderBudgets);

// --------------------------------------------------
// 16. MOBILE SIDEBAR
// --------------------------------------------------

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("show");
}

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("show");
});

sidebarOverlay.addEventListener("click", closeSidebar);

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", closeSidebar);
});

// --------------------------------------------------
// 17. LOGOUT
// --------------------------------------------------

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "../Auth/signin.html";
  } catch (error) {
    console.error("Logout failed:", error);
    window.alert("Unable to log out. Please try again.");
  }
});

// The initial UI is empty until Firebase loads the user's data.
renderBudgets();
