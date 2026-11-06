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

// Safely display text from the API
function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Format an API date
function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-US", {
    timeZone: "UTC"
  });
}

// Choose the priority style
function getPriority(issue) {
  const priority = String(issue.priority || "low").toLowerCase();

  if (priority === "high" || priority === "medium") {
    return priority;
  }

  return "low";
}

// Build label badges using Font Awesome
function getLabels(labels) {
  if (!Array.isArray(labels)) {
    return "";
  }

  return labels.map(function (label) {
    const name = String(label);

    let labelClass = "";
    let icon = "fa-tag";

    if (name.toLowerCase() === "bug") {
      labelClass = "bug";
      icon = "fa-bug";
    } else if (name.toLowerCase() === "help wanted") {
      labelClass = "help";
      icon = "fa-life-ring";
    } else if (name.toLowerCase() === "enhancement") {
      labelClass = "enhancement";
      icon = "fa-wand-magic-sparkles";
    }

    return `
      <span class="issue-label ${labelClass}">
        <i class="fa-solid ${icon}" aria-hidden="true"></i>
        ${escapeText(name)}
      </span>
    `;
  }).join("");
}

// Load all issues or search results
async function loadIssues() {
  const thisRequest = ++requestNumber;

  document.getElementById("loading-state").hidden = false;
  document.getElementById("error-state").hidden = true;
  document.getElementById("empty-state").hidden = true;
  document.getElementById("issue-count").textContent = "Loading issues...";

  issuesGrid.innerHTML = "";
  issuesGrid.setAttribute("aria-busy", "true");

  let url = `${API_URL}/issues`;

  if (currentSearch) {
    url = `${API_URL}/issues/search?q=${encodeURIComponent(currentSearch)}`;
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const result = await response.json();

    if (!Array.isArray(result.data)) {
      throw new Error("Invalid issue data");
    }

    // Prevent an older search response from replacing a newer one.
    if (thisRequest !== requestNumber) {
      return;
    }

    issues = result.data;

    displayIssues();
  } catch (error) {
    if (thisRequest !== requestNumber) {
      return;
    }

    issues = [];

    document.getElementById("issue-count").textContent = "0 Issues";
    document.getElementById("error-state").hidden = false;
  } finally {
    if (thisRequest === requestNumber) {
      document.getElementById("loading-state").hidden = true;
      issuesGrid.setAttribute("aria-busy", "false");
    }
  }
}

// Display cards for the selected tab
function displayIssues() {
  const visibleIssues = issues.filter(function (issue) {
    return currentStatus === "all" || issue.status === currentStatus;
  });

  const issueWord = visibleIssues.length === 1 ? "Issue" : "Issues";

  document.getElementById("issue-count").textContent =
    `${visibleIssues.length} ${issueWord}`;

  document.getElementById("empty-state").hidden =
    visibleIssues.length > 0;

  issuesGrid.innerHTML = "";

  visibleIssues.forEach(function (issue) {
    const isClosed = issue.status === "closed";
    const priority = getPriority(issue);

    // Your supplied status images, using the exact filenames.
    let statusImage = "assets/Open-Status.png";
    let statusText = "Open";

    if (isClosed) {
      statusImage = "assets/Closed- Status .png";
      statusText = "Closed";
    }

    const card = document.createElement("button");

    card.type = "button";
    card.className = `issue-card ${isClosed ? "closed" : "open"}`;

    card.setAttribute(
      "aria-label",
      `${issue.title}, ${statusText}. View details`
    );

    card.innerHTML = `
      <div class="card-main">
        <div class="card-top">
          <img
            src="${statusImage}"
            class="status-image"
            width="24"
            height="24"
            alt="${statusText}"
          >

          <span class="priority ${priority}">
            ${priority}
          </span>
        </div>

        <h2 class="card-title">
          ${escapeText(issue.title)}
        </h2>

        <p class="card-description">
          ${escapeText(issue.description)}
        </p>

        <div class="labels">
          ${getLabels(issue.labels)}
        </div>
      </div>

      <div class="card-footer">
        <p>
          #${escapeText(issue.id)}
          by ${escapeText(issue.author || "Unknown")}
        </p>

        <p>${formatDate(issue.createdAt)}</p>
      </div>
    `;

    card.addEventListener("click", function () {
      openIssue(issue.id);
    });

    issuesGrid.appendChild(card);
  });
}

// All, Open, and Closed filter buttons
filterButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    currentStatus = button.dataset.status;

    filterButtons.forEach(function (tab) {
      const active = tab === button;

      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", active);
    });

    const isLoading = issuesGrid.getAttribute("aria-busy") === "true";
    const hasError = !document.getElementById("error-state").hidden;

    if (!isLoading && !hasError) {
      displayIssues();
    }
  });
});
// Submit a search using the button or Enter key
document.getElementById("search-form").addEventListener("submit", function (event) {
  event.preventDefault();

  currentSearch = document.getElementById("search-input").value.trim();

  loadIssues();
});

// Restore the full list when the search input is cleared
document.getElementById("search-input").addEventListener("input", function () {
  if (!this.value && currentSearch) {
    currentSearch = "";
    loadIssues();
  }
});

// Retry loading the issue list
document.getElementById("retry-button").addEventListener("click", loadIssues);

// Open the modal and request the selected issue
async function openIssue(id) {
  selectedIssueId = id;

  const thisRequest = ++detailRequestNumber;

  if (!issueModal.open) {
    issueModal.showModal();
  }

  document.body.style.overflow = "hidden";

  document.getElementById("modal-loading").hidden = false;
  document.getElementById("modal-error").hidden = true;
  document.getElementById("modal-details").hidden = true;

  try {
    const response = await fetch(
      `${API_URL}/issue/${encodeURIComponent(id)}`,
      {
        signal: AbortSignal.timeout(20000)
      }
    );

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const result = await response.json();

    if (!result.data || Array.isArray(result.data)) {
      throw new Error("Invalid issue");
    }

    if (thisRequest !== detailRequestNumber || !issueModal.open) {
      return;
    }

    const issue = result.data;
    const isClosed = issue.status === "closed";
    const priority = getPriority(issue);

    document.getElementById("modal-details").innerHTML = `
      <h2 id="modal-title">
        ${escapeText(issue.title)}
      </h2>

      <div class="modal-meta">
        <span class="status-badge ${isClosed ? "closed" : ""}">
          ${isClosed ? "Closed" : "Opened"}
        </span>

        <i
          class="fa-solid fa-circle meta-dot"
          aria-hidden="true"
        ></i>

        <span>
          Opened by ${escapeText(issue.author || "Unknown")}
        </span>

        <i
          class="fa-solid fa-circle meta-dot"
          aria-hidden="true"
        ></i>

        <span>${formatDate(issue.createdAt)}</span>
      </div>

      <div class="labels modal-labels">
        ${getLabels(issue.labels)}
      </div>

      <p class="modal-description">${escapeText(issue.description)}</p>

      <dl class="issue-facts">
        <div>
          <dt>Assignee:</dt>
          <dd>${escapeText(issue.assignee || "Unassigned")}</dd>
        </div>

        <div>
          <dt>Priority:</dt>

          <dd>
            <span class="priority ${priority}">
              ${priority}
            </span>
          </dd>
        </div>
      </dl>

      <p class="updated-date">
        Issue #${escapeText(issue.id)}
        ${
          issue.updatedAt
            ? ` · Updated ${formatDate(issue.updatedAt)}`
            : ""
        }
      </p>
    `;

    document.getElementById("modal-details").hidden = false;
  } catch (error) {
    if (thisRequest === detailRequestNumber && issueModal.open) {
      document.getElementById("modal-error").hidden = false;
    }
  } finally {
    if (thisRequest === detailRequestNumber) {
      document.getElementById("modal-loading").hidden = true;
    }
  }
}

// Retry loading details for the selected issue
document.getElementById("retry-details").addEventListener("click", function () {
  openIssue(selectedIssueId);
});

// Restore page scrolling after closing the modal
issueModal.addEventListener("close", function () {
  detailRequestNumber++;
  document.body.style.overflow = "";
});