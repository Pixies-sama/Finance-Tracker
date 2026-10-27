
/* =====================================
   FINANCE TRACKER - REAL ANALYTICS
   Firebase Authentication + Firestore
   ===================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";


// 1. Firebase configuration

const firebaseConfig = {
    apiKey: "AIzaSyAN6IdtEqc2UrP7HmJZNVJuFhXf3mfapQ0",
    authDomain: "finance-tracker-23a17.firebaseapp.com",
    projectId: "finance-tracker-23a17",
    storageBucket: "finance-tracker-23a17.firebasestorage.app",
    messagingSenderId: "773713831206",
    appId: "1:773713831206:web:94596f675d9b3bea5b0de7"
};


// 2. Initialize Firebase

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// 3. Select HTML elements

const periodFilter = document.getElementById("periodFilter");

const totalIncomeElement = document.getElementById("totalIncome");
const totalExpensesElement = document.getElementById("totalExpenses");
const netSavingsElement = document.getElementById("netSavings");
const savingsRateElement = document.getElementById("savingsRate");
const donutTotalElement = document.getElementById("donutTotal");

const categoryList = document.getElementById("categoryList");

const topCategoryElement = document.getElementById("topCategory");
const topCategoryText = document.getElementById("topCategoryText");

const balanceStatusElement = document.getElementById("balanceStatus");
const balanceTextElement = document.getElementById("balanceText");

const savingsInsightElement = document.getElementById("savingsInsight");
const savingsTextElement = document.getElementById("savingsText");

const userNameElement = document.getElementById("userName");
const userEmailElement = document.getElementById("userEmail");
const userAvatarElement = document.getElementById("userAvatar");

const logoutButton = document.getElementById("logoutBtn");

const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");


// 4. Store transactions and chart instances

let allTransactions = [];
let incomeExpenseChart = null;
let expenseChart = null;


// 5. Format currency

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2
    }).format(amount);
}


// 6. Get a local calendar date without timezone issues

function getLocalDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// Convert YYYY-MM-DD into a local Date object

function parseTransactionDate(dateString) {
    if (
        typeof dateString !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
        return null;
    }

    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    // Reject invalid calendar dates.

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}


// 7. Authenticate the user and load their profile

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("Auth/signin.html");
        return;
    }

    try {
        await user.reload();

        if (!user.emailVerified) {
            await signOut(auth);
            window.location.replace("Auth/signin.html");
            return;
        }

        // Refresh the current authenticated user.

        const currentUser = auth.currentUser;

        if (!currentUser) {
            window.location.replace("Auth/signin.html");
            return;
        }

        // Load profile information from Firestore.

        const userRef = doc(db, "Users", currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        let fullName = currentUser.displayName || "";

        if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            fullName = userData.fullName || fullName;
        }

        userNameElement.textContent = fullName || "User";
        userEmailElement.textContent =
            currentUser.email || "No email available";

        if (fullName.trim()) {
            const nameParts = fullName.trim().split(/\s+/);

            userAvatarElement.textContent = (
                nameParts[0][0] +
                (nameParts.length > 1
                    ? nameParts[nameParts.length - 1][0]
                    : "")
            ).toUpperCase();
        } else {
            userAvatarElement.textContent = "U";
        }

        // Load only this user's transactions.

        await loadAnalytics(currentUser.uid);

        console.log("Analytics connected to Firestore.");
    } catch (error) {
        console.error("Unable to load analytics:", error);

        categoryList.textContent =
            "Unable to load your analytics. Please refresh the page.";
    }
});


// 8. Load transactions from the user's Firestore collection

async function loadAnalytics(uid) {
    const transactionsRef = collection(
        db,
        "Users",
        uid,
        "Transactions"
    );

    const snapshot = await getDocs(transactionsRef);

    allTransactions = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
    }));

    // Ignore records with missing or invalid amounts.

    allTransactions = allTransactions.filter((transaction) => {
        return (
            ["income", "expense"].includes(transaction.type) &&
            Number.isFinite(Number(transaction.amount)) &&
            Number(transaction.amount) > 0
        );
    });

    renderAnalytics();

    console.log("Transactions loaded for analytics:", allTransactions.length);
}


// 9. Filter transactions by the selected period

function getFilteredTransactions() {
    const selectedPeriod = periodFilter.value;
    const now = new Date();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return allTransactions.filter((transaction) => {
        const date = parseTransactionDate(transaction.date);

        if (!date) {
            return false;
        }

        if (selectedPeriod === "month") {
            return (
                date.getFullYear() === currentYear &&
                date.getMonth() === currentMonth
            );
        }

        if (selectedPeriod === "lastMonth") {
            const lastMonthDate = new Date(
                currentYear,
                currentMonth - 1,
                1
            );

            return (
                date.getFullYear() === lastMonthDate.getFullYear() &&
                date.getMonth() === lastMonthDate.getMonth()
            );
        }

        if (selectedPeriod === "year") {
            return date.getFullYear() === currentYear;
        }

        return false;
    });
}


// 10. Calculate income, expenses and savings

function calculateSummary(transactions) {
    const income = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce(
            (total, transaction) => total + Number(transaction.amount),
            0
        );

    const expenses = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce(
            (total, transaction) => total + Number(transaction.amount),
            0
        );

    const savings = income - expenses;

    const savingsRate = income > 0
        ? (savings / income) * 100
        : 0;

    return {
        income,
        expenses,
        savings,
        savingsRate
    };
}


// 11. Update the summary cards

function updateSummary(summary) {
    const {
        income,
        expenses,
        savings,
        savingsRate
    } = summary;

    totalIncomeElement.textContent = formatCurrency(income);
    totalExpensesElement.textContent = formatCurrency(expenses);
    netSavingsElement.textContent = formatCurrency(savings);

    savingsRateElement.textContent =
        `${savingsRate.toFixed(1)}%`;

    // Top expense category

    const categoryTotals = {};

    const transactions = getFilteredTransactions();

    transactions
        .filter((transaction) => transaction.type === "expense")
        .forEach((transaction) => {
            const category = transaction.category || "Uncategorized";

            categoryTotals[category] =
                (categoryTotals[category] || 0) +
                Number(transaction.amount);
        });

    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length > 0) {
        const [name, amount] = sortedCategories[0];

        const percentage = expenses > 0
            ? (amount / expenses) * 100
            : 0;

        topCategoryElement.textContent = name;

        topCategoryText.textContent =
            `${formatCurrency(amount)} spent (${percentage.toFixed(1)}% of your expenses).`;
    } else {
        topCategoryElement.textContent = "No expenses yet";

        topCategoryText.textContent =
            "Add expense transactions to discover your top category.";
    }

    // Financial balance

    if (income === 0 && expenses === 0) {
        balanceStatusElement.textContent = "No activity yet";

        balanceTextElement.textContent =
            "Your transactions will appear here.";
    } else if (savings > 0) {
        balanceStatusElement.textContent = "Positive balance";

        balanceTextElement.textContent =
            `${formatCurrency(savings)} remaining after expenses.`;
    } else if (savings < 0) {
        balanceStatusElement.textContent = "Spending exceeds income";

        balanceTextElement.textContent =
            `Expenses exceed income by ${formatCurrency(Math.abs(savings))}.`;
    } else {
        balanceStatusElement.textContent = "Break-even";

        balanceTextElement.textContent =
            "Your recorded income equals your expenses.";
    }

    // Savings insight

    savingsInsightElement.textContent =
        `${savingsRate.toFixed(1)}% saved`;

    if (income === 0) {
        savingsTextElement.textContent =
            "Record income to calculate your savings rate.";
    } else if (savingsRate > 0) {
        savingsTextElement.textContent =
            "Your income is higher than your recorded expenses.";
    } else if (savingsRate < 0) {
        savingsTextElement.textContent =
            "Review your spending to bring expenses within income.";
    } else {
        savingsTextElement.textContent =
            "Your recorded income equals your expenses.";
    }
}


// 12. Prepare data for the income vs. expenses chart

function getTrendData(transactions) {
    const selectedPeriod = periodFilter.value;
    const now = new Date();

    let labels;
    let keys;

    if (selectedPeriod === "year") {
        labels = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        keys = labels.map((_, index) => String(index));
    } else {
        labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
        keys = ["1", "2", "3", "4", "5"];
    }

    const income = Array(labels.length).fill(0);
    const expenses = Array(labels.length).fill(0);

    transactions.forEach((transaction) => {
        const date = parseTransactionDate(transaction.date);

        if (!date) return;

        let index;

        if (selectedPeriod === "year") {
            index = date.getMonth();
        } else {
            index = Math.ceil(date.getDate() / 7) - 1;
        }

        if (index < 0 || index >= labels.length) return;

        if (transaction.type === "income") {
            income[index] += Number(transaction.amount);
        } else if (transaction.type === "expense") {
            expenses[index] += Number(transaction.amount);
        }
    });

    // Show only weeks up to the current date for the current month.

    if (selectedPeriod === "month") {
        const currentWeek = Math.ceil(now.getDate() / 7);

        labels = labels.slice(0, currentWeek);
        income.length = currentWeek;
        expenses.length = currentWeek;
    }

    if (selectedPeriod === "lastMonth") {
        const previousMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            0
        );

        const numberOfWeeks = Math.ceil(
            previousMonth.getDate() / 7
        );

        labels = labels.slice(0, numberOfWeeks);
        income.length = numberOfWeeks;
        expenses.length = numberOfWeeks;
    }

    return { labels, income, expenses };
}


// 13. Create or update the income vs. expenses chart

function createIncomeExpenseChart(data) {
    const ctx = document.getElementById("incomeExpenseChart");

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(ctx, {
        type: "line",

        data: {
            labels: data.labels,

            datasets: [
                {
                    label: "Income",
                    data: data.income,
                    borderColor: "#25d9b2",
                    backgroundColor: "rgba(37, 217, 178, 0.10)",
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3
                },
                {
                    label: "Expenses",
                    data: data.expenses,
                    borderColor: "#ff7585",
                    backgroundColor: "rgba(255, 117, 133, 0.05)",
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: (context) =>
                            `${context.dataset.label}: ${formatCurrency(context.raw)}`
                    }
                }
            },

            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false }
                },

                y: {
                    beginAtZero: true,

                    grid: {
                        color: "rgba(145, 162, 187, 0.10)"
                    },

                    border: { display: false },

                    ticks: {
                        callback: (value) =>
                            "₦" + Number(value).toLocaleString("en-NG")
                    }
                }
            }
        }
    });
}


// 14. Calculate expense totals by category

function getCategoryData(transactions) {
    const totals = {};

    transactions
        .filter((transaction) => transaction.type === "expense")
        .forEach((transaction) => {
            const category = transaction.category || "Uncategorized";

            totals[category] =
                (totals[category] || 0) +
                Number(transaction.amount);
        });

    return Object.entries(totals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
}


// 15. Create the expense breakdown chart

function createExpenseChart(categories) {
    const ctx = document.getElementById("expenseChart");

    if (expenseChart) {
        expenseChart.destroy();
    }

    const colors = [
        "#25d9b2",
        "#76b9ff",
        "#b29aff",
        "#ffb86b",
        "#ff7585",
        "#60d5e8",
        "#a6d87a",
        "#e5a1cb"
    ];

    const total = categories.reduce(
        (sum, category) => sum + category.amount,
        0
    );

    donutTotalElement.textContent = formatCurrency(total);

    expenseChart = new Chart(ctx, {
        type: "doughnut",

        data: {
            labels: categories.map((category) => category.name),

            datasets: [
                {
                    data: categories.map((category) => category.amount),

                    backgroundColor: categories.map(
                        (_, index) => colors[index % colors.length]
                    ),

                    borderColor: "#101f35",
                    borderWidth: 4,
                    hoverOffset: 5
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "76%",

            plugins: {
                legend: { display: false },

                tooltip: {
                    callbacks: {
                        label: (context) =>
                            `${context.label}: ${formatCurrency(context.raw)}`
                    }
                }
            }
        }
    });
}


// 16. Display category names and progress bars

function displayCategories(categories) {
    categoryList.replaceChildren();

    const total = categories.reduce(
        (sum, category) => sum + category.amount,
        0
    );

    if (total === 0) {
        const message = document.createElement("p");

        message.className = "empty-message";
        message.textContent = "No expenses recorded for this period.";

        categoryList.appendChild(message);
        return;
    }

    const colors = [
        "#25d9b2",
        "#76b9ff",
        "#b29aff",
        "#ffb86b",
        "#ff7585",
        "#60d5e8",
        "#a6d87a",
        "#e5a1cb"
    ];

    categories.forEach((category, index) => {
        const percentage = (category.amount / total) * 100;

        const item = document.createElement("div");
        item.className = "category-item";

        const heading = document.createElement("div");
        heading.className = "category-heading";

        const name = document.createElement("span");
        name.className = "category-name";
        name.textContent = category.name;

        const value = document.createElement("span");
        value.className = "category-value";

        value.textContent =
            `${formatCurrency(category.amount)} · ${percentage.toFixed(0)}%`;

        const track = document.createElement("div");
        track.className = "category-track";

        const fill = document.createElement("div");
        fill.className = "category-fill";
        fill.style.width = `${percentage}%`;
        fill.style.backgroundColor = colors[index % colors.length];

        heading.append(name, value);
        track.appendChild(fill);
        item.append(heading, track);

        categoryList.appendChild(item);
    });
}


// 17. Render all analytics using the selected period

function renderAnalytics() {
    const transactions = getFilteredTransactions();
    const summary = calculateSummary(transactions);

    updateSummary(summary);

    createIncomeExpenseChart(getTrendData(transactions));

    const categories = getCategoryData(transactions);

    createExpenseChart(categories);
    displayCategories(categories);
}


// 18. Update analytics when the period changes

periodFilter.addEventListener("change", renderAnalytics);


// 19. Mobile sidebar

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


// 20. Log out

logoutButton.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.replace("Auth/signin.html");
    } catch (error) {
        console.error("Logout failed:", error);
        alert("Unable to log out. Please try again.");
    }
});
