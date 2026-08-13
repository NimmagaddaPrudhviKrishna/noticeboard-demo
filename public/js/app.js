// app.js
// Single-page app logic: view switching, public notice board, admin login,
// and admin CRUD dashboard all live in this one file.

// ---------- Element refs ----------
const views = {
  board: document.getElementById("view-board"),
  login: document.getElementById("view-login"),
  admin: document.getElementById("view-admin")
};
const navBoard = document.getElementById("navBoard");
const navAdmin = document.getElementById("navAdmin");
const logoutBtn = document.getElementById("logoutBtn");

const noticeList = document.getElementById("noticeList");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const priorityFilter = document.getElementById("priorityFilter");
const refreshBtn = document.getElementById("refreshBtn");

const loginAlert = document.getElementById("loginAlert");
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const formAlert = document.getElementById("formAlert");
const adminNoticeList = document.getElementById("adminNoticeList");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const categoryInput = document.getElementById("category");
const priorityInput = document.getElementById("priority");
const editIdInput = document.getElementById("editId");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let isAdmin = false;

// ---------- Helpers ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function showAlert(el, message, type = "error") {
  el.innerHTML = `<div class="alert ${type}">${message}</div>`;
  setTimeout(() => (el.innerHTML = ""), 4000);
}

function renderNoticeCard(n, { withActions } = { withActions: false }) {
  return `
    <div class="notice-card ${n.priority === "urgent" ? "urgent" : ""}">
      <div class="meta-row">
        <h3>${escapeHtml(n.title)}</h3>
        <div>
          ${n.priority === "urgent" ? '<span class="badge urgent">Urgent</span> ' : ""}
          <span class="badge">${escapeHtml(n.category)}</span>
        </div>
      </div>
      <div class="content">${escapeHtml(n.content)}</div>
      <div class="footer-row">
        <span>Posted by ${escapeHtml(n.postedBy || "Admin")} &middot; ${timeAgo(n.createdAt)}</span>
        ${
          withActions
            ? `<div class="actions">
                <button class="btn ghost" onclick="editNoticeHandler(${n.id})">Edit</button>
                <button class="btn danger" onclick="deleteNotice(${n.id})">Delete</button>
              </div>`
            : ""
        }
      </div>
    </div>
  `;
}

// ---------- View routing ----------
function showView(name) {
  Object.values(views).forEach((v) => (v.style.display = "none"));

  if (name === "admin" && !isAdmin) name = "login";

  views[name].style.display = "block";

  if (name === "board") loadPublicNotices();
  if (name === "admin") loadAdminNotices();
}

navBoard.addEventListener("click", (e) => {
  e.preventDefault();
  showView("board");
});
navAdmin.addEventListener("click", (e) => {
  e.preventDefault();
  showView(isAdmin ? "admin" : "login");
});
logoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  isAdmin = false;
  logoutBtn.style.display = "none";
  navAdmin.textContent = "Admin Login";
  showView("board");
});

// ---------- Public board ----------
async function loadPublicNotices() {
  noticeList.innerHTML = `<p class="empty-state">Loading notices...</p>`;

  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
  if (categoryFilter.value !== "All") params.set("category", categoryFilter.value);
  if (priorityFilter.value !== "All") params.set("priority", priorityFilter.value);

  try {
    const res = await fetch(`/api/notices?${params.toString()}`);
    const notices = await res.json();

    if (!notices.length) {
      noticeList.innerHTML = `<p class="empty-state">No notices found.</p>`;
      return;
    }
    noticeList.innerHTML = notices.map((n) => renderNoticeCard(n)).join("");
  } catch (err) {
    noticeList.innerHTML = `<p class="empty-state">Failed to load notices. Please try again.</p>`;
  }
}

let debounceTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadPublicNotices, 300);
});
categoryFilter.addEventListener("change", loadPublicNotices);
priorityFilter.addEventListener("change", loadPublicNotices);
refreshBtn.addEventListener("click", loadPublicNotices);

// ---------- Login ----------
loginBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showAlert(loginAlert, "Please enter both username and password.");
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(loginAlert, data.error || "Login failed");
      return;
    }

    isAdmin = true;
    logoutBtn.style.display = "inline-block";
    navAdmin.textContent = "Dashboard";
    passwordInput.value = "";
    showView("admin");
  } catch (err) {
    showAlert(loginAlert, "Something went wrong. Try again.");
  }
});

// Allow pressing Enter in the password field to submit
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

// ---------- Admin dashboard ----------
function resetForm() {
  editIdInput.value = "";
  titleInput.value = "";
  contentInput.value = "";
  categoryInput.value = "General";
  priorityInput.value = "normal";
  formTitle.textContent = "Post a New Notice";
  submitBtn.textContent = "Post Notice";
  cancelEditBtn.style.display = "none";
}
cancelEditBtn.addEventListener("click", resetForm);

submitBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const category = categoryInput.value;
  const priority = priorityInput.value;
  const id = editIdInput.value;

  if (!title || !content) {
    showAlert(formAlert, "Title and content are required.");
    return;
  }

  const isEdit = !!id;
  const url = isEdit ? `/api/notices/${id}` : "/api/notices";
  const method = isEdit ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category, priority })
    });
    const data = await res.json();

    if (res.status === 401) {
      showAlert(formAlert, "Your session expired. Please log in again.");
      isAdmin = false;
      showView("login");
      return;
    }
    if (!res.ok) {
      showAlert(formAlert, data.error || "Failed to save notice.");
      return;
    }

    showAlert(formAlert, isEdit ? "Notice updated." : "Notice posted.", "success");
    resetForm();
    loadAdminNotices();
  } catch (err) {
    showAlert(formAlert, "Something went wrong.");
  }
});

function startEdit(notice) {
  editIdInput.value = notice.id;
  titleInput.value = notice.title;
  contentInput.value = notice.content;
  categoryInput.value = notice.category;
  priorityInput.value = notice.priority;
  formTitle.textContent = "Edit Notice";
  submitBtn.textContent = "Save Changes";
  cancelEditBtn.style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteNotice(id) {
  if (!confirm("Delete this notice? This cannot be undone.")) return;
  const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
  if (res.status === 401) {
    isAdmin = false;
    showView("login");
    return;
  }
  if (res.ok) loadAdminNotices();
  else showAlert(formAlert, "Failed to delete notice.");
}

async function loadAdminNotices() {
  adminNoticeList.innerHTML = `<p class="empty-state">Loading...</p>`;
  const res = await fetch("/api/notices");
  const notices = await res.json();

  if (!notices.length) {
    adminNoticeList.innerHTML = `<p class="empty-state">No notices yet. Post one above.</p>`;
    return;
  }

  adminNoticeList.innerHTML = notices.map((n) => renderNoticeCard(n, { withActions: true })).join("");
  window.__notices = notices;
}

function editNoticeHandler(id) {
  const notice = (window.__notices || []).find((n) => n.id === id);
  if (notice) startEdit(notice);
}

// ---------- Boot ----------
async function checkSessionAndBoot() {
  try {
    const res = await fetch("/api/session");
    const data = await res.json();
    isAdmin = !!data.isAdmin;
  } catch {
    isAdmin = false;
  }

  if (isAdmin) {
    logoutBtn.style.display = "inline-block";
    navAdmin.textContent = "Dashboard";
  }

  showView("board");
}

checkSessionAndBoot();
