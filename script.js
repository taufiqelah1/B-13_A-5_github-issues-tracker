// API address
const API_URL = "https://phi-lab-server.vercel.app/api/v1/lab";

// Current application data
let issues = [];
let currentStatus = "all";
let currentSearch = "";
let requestNumber = 0;
let detailRequestNumber = 0;
let selectedIssueId = null;

// HTML elements
const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");
const issuesGrid = document.getElementById("issues-grid");
const issueModal = document.getElementById("issue-modal");
const filterButtons = document.querySelectorAll(".filter-button");

// Login with the demo credentials
document.getElementById("login-form").addEventListener("submit", function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (username === "admin" && password === "admin123") {
    document.getElementById("login-error").hidden = true;

    loginPage.hidden = true;
    dashboardPage.hidden = false;

    document.getElementById("search-input").focus();

    loadIssues();
  } else {
    document.getElementById("login-error").hidden = false;
  }
});

