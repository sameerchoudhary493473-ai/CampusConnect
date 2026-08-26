/* Demo-only client-side authentication. Not suitable for production. */

const STORAGE_KEYS = {
  users: "campusconnect_users",
  currentUser: "campusconnect_current_user",
  registrations: "campusconnect_event_registrations",
  complaints: "campusconnect_complaints",
};

const EVENTS = [
  { id: "hackathon-2026", title: "Hackathon 2026", category: "Technical", description: "Build creative solutions in teams and present them to mentors.", eventDate: "2026-09-12", eventTime: "9:00 AM - 9:00 PM", location: "Innovation Lab", totalSeats: 24 },
  { id: "annual-sports-meet", title: "Annual Sports Meet", category: "Sports", description: "Compete in athletics, football, basketball, and indoor games.", eventDate: "2026-09-15", eventTime: "7:00 AM - 5:00 PM", location: "University Sports Complex", totalSeats: 18 },
  { id: "tech-fest", title: "Tech Fest", category: "Technical", description: "Showcase projects, attend demos, and join tech talks.", eventDate: "2026-09-18", eventTime: "10:00 AM - 4:00 PM", location: "Main Auditorium", totalSeats: 30 },
  { id: "coding-workshop", title: "Coding Workshop", category: "Workshop", description: "Learn JavaScript techniques and debugging habits.", eventDate: "2026-09-20", eventTime: "2:00 PM - 5:00 PM", location: "Computer Lab 2", totalSeats: 12 },
  { id: "cultural-night", title: "Cultural Night", category: "Cultural", description: "Enjoy student performances, music, and dance.", eventDate: "2026-09-24", eventTime: "6:30 PM - 10:00 PM", location: "Open Air Theatre", totalSeats: 20 },
  { id: "resume-workshop", title: "Resume Building Workshop", category: "Workshop", description: "Improve your resume and interview presentation.", eventDate: "2026-09-27", eventTime: "11:00 AM - 1:00 PM", location: "Seminar Hall B", totalSeats: 16 },
];

const state = { user: null, events: EVENTS, registrations: [], allRegistrations: [], complaints: [], eventSearchTerm: "", eventFilter: "all", complaintSearchTerm: "", complaintFilter: "all", activeComplaintId: null };

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("auth-page")) initAuthPage();
  if (document.body.classList.contains("dashboard-page")) initDashboard();
});

function readStorage(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (error) { console.error(`Could not read ${key}:`, error); return fallback; }
}

function writeStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function getUsers() { return readStorage(STORAGE_KEYS.users); }
function saveUsers(users) { writeStorage(STORAGE_KEYS.users, users); }
function getRegistrations() { return readStorage(STORAGE_KEYS.registrations); }
function saveRegistrations(registrations) { writeStorage(STORAGE_KEYS.registrations, registrations); }
function getComplaints() { return readStorage(STORAGE_KEYS.complaints); }
function saveComplaints(complaints) { writeStorage(STORAGE_KEYS.complaints, complaints); }
function createId(prefix) { return `${prefix}-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`; }

function getCurrentUser() {
  const session = readStorage(STORAGE_KEYS.currentUser, null);
  if (!session?.userId) return null;
  const user = getUsers().find((item) => item.id === session.userId);
  if (!user) localStorage.removeItem(STORAGE_KEYS.currentUser);
  return user || null;
}

function getDisplayName(fullName, email = "") { return String(fullName || "").trim() || email.split("@")[0] || "Campus member"; }
function getInitials(fullName) { return getDisplayName(fullName).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "C"; }
function firstName(fullName) { return getDisplayName(fullName).split(/\s+/)[0]; }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

function registerUser(fullName, email, password) {
  const users = getUsers();
  if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) return { error: "An account with this email already exists." };
  const user = { id: createId("user"), fullName, email, password, createdAt: new Date().toISOString() };
  saveUsers([...users, user]);
  writeStorage(STORAGE_KEYS.currentUser, { userId: user.id });
  return { user };
}

function loginUser(email, password) {
  const user = getUsers().find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user) return { error: "No account was found with that email." };
  if (user.password !== password) return { error: "Incorrect email or password." };
  writeStorage(STORAGE_KEYS.currentUser, { userId: user.id });
  return { user };
}

function logout() { localStorage.removeItem(STORAGE_KEYS.currentUser); window.location.replace("/"); }

function protectDashboard() {
  const user = getCurrentUser();
  if (!user) { window.location.replace("/"); return null; }
  document.body.classList.add("is-authenticated");
  return user;
}

function initAuthPage() {
  const form = document.getElementById("authForm");
  if (!form) return;
  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const fullNameField = fullNameInput?.parentElement;
  const confirmPasswordField = confirmPasswordInput?.parentElement;
  const signInBtn = document.getElementById("signInBtn");
  const createAccountBtn = document.getElementById("createAccountBtn");
  const switchModeBtn = document.getElementById("switchModeBtn");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const authMessage = document.getElementById("authMessage");
  let mode = "signin";

  if (getCurrentUser()) { window.location.replace("/dashboard"); return; }
  const setMessage = (message, type = "") => { authMessage.className = `auth-message ${type ? `is-${type}` : ""}`.trim(); authMessage.textContent = message; };
  const syncMode = () => { const signup = mode === "signup"; if (fullNameField) fullNameField.style.display = signup ? "grid" : "none"; if (confirmPasswordField) confirmPasswordField.style.display = signup ? "grid" : "none"; signInBtn.textContent = signup ? "Create Account" : "Sign In"; createAccountBtn.textContent = signup ? "Sign In" : "Create Account"; switchModeBtn.textContent = signup ? "Sign in" : "Create account"; passwordInput.autocomplete = signup ? "new-password" : "current-password"; };
  const switchMode = () => { mode = mode === "signin" ? "signup" : "signin"; setMessage(""); syncMode(); };
  togglePasswordBtn?.addEventListener("click", () => { const hidden = passwordInput.type === "password"; passwordInput.type = hidden ? "text" : "password"; togglePasswordBtn.textContent = hidden ? "Hide" : "Show"; });
  switchModeBtn?.addEventListener("click", switchMode);
  createAccountBtn?.addEventListener("click", switchMode);

  form.addEventListener("submit", (event) => {
    event.preventDefault(); setMessage(""); signInBtn.disabled = true; createAccountBtn.disabled = true; signInBtn.textContent = "Please wait...";
    const fullName = fullNameInput.value.trim(); const email = emailInput.value.trim(); const password = passwordInput.value;
    let error = "";
    if (!email || !password || (mode === "signup" && (!fullName || !confirmPasswordInput.value))) error = "Please complete all required fields.";
    else if (!validEmail(email)) error = "Please enter a valid email address.";
    else if (mode === "signup" && password.length < 6) error = "Password must be at least 6 characters.";
    else if (mode === "signup" && password !== confirmPasswordInput.value) error = "Passwords do not match.";
    if (error) setMessage(error, "error");
    else { const result = mode === "signup" ? registerUser(fullName, email, password) : loginUser(email, password); if (result.error) setMessage(result.error, "error"); else { window.location.replace("/dashboard"); return; } }
    signInBtn.disabled = false; createAccountBtn.disabled = false; syncMode();
  });
  syncMode();
}

function initDashboard() {
  const user = protectDashboard(); if (!user) return; state.user = user; loadUserProfile(); loadEvents(); loadUserRegistrations(); loadComplaints(); bindDashboardUi(); updateDashboardStats(); renderEvents(); renderComplaints(); setCurrentDate();
}

function loadUserProfile() { const refs = getRefs(); const name = getDisplayName(state.user.fullName, state.user.email); if (refs.profileName) { refs.profileName.textContent = name; refs.profileName.title = state.user.email; } if (refs.profileEmail) refs.profileEmail.textContent = state.user.email; if (refs.welcomeMessage) refs.welcomeMessage.textContent = `Welcome back, ${firstName(name)}!`; if (refs.userAvatar) refs.userAvatar.textContent = getInitials(name); }
function loadEvents() { state.events = EVENTS; }
function loadUserRegistrations() { state.allRegistrations = getRegistrations(); state.registrations = state.allRegistrations.filter((item) => item.userId === state.user.id); }
function loadComplaints() { state.complaints = getComplaints().filter((item) => item.userId === state.user.id); }

function getRefs() { return { welcomeMessage: document.getElementById("welcomeMessage"), profileName: document.getElementById("profileName"), profileEmail: document.getElementById("profileEmail"), userAvatar: document.getElementById("userAvatar"), currentDate: document.getElementById("currentDate"), logoutBtn: document.getElementById("logoutBtn"), navMenuBtn: document.getElementById("navMenuBtn"), mobileNav: document.getElementById("mobileNav"), eventGrid: document.getElementById("eventGrid"), eventSearch: document.getElementById("eventSearch"), registeredEventsList: document.getElementById("registeredEventsList"), complaintsList: document.getElementById("complaintsList"), complaintForm: document.getElementById("complaintForm"), complaintTitle: document.getElementById("complaintTitle"), complaintCategory: document.getElementById("complaintCategory"), complaintDescription: document.getElementById("complaintDescription"), complaintPriority: document.getElementById("complaintPriority"), complaintLocation: document.getElementById("complaintLocation"), titleError: document.getElementById("titleError"), categoryError: document.getElementById("categoryError"), descriptionError: document.getElementById("descriptionError"), locationError: document.getElementById("locationError"), complaintSearch: document.getElementById("complaintSearch"), complaintModal: document.getElementById("complaintModal"), complaintModalContent: document.getElementById("complaintModalContent"), feedbackBar: document.getElementById("feedbackBar"), upcomingEventsCount: document.getElementById("upcomingEventsCount"), registeredEventsCount: document.getElementById("registeredEventsCount"), pendingComplaintsCount: document.getElementById("pendingComplaintsCount"), totalComplaintsCount: document.getElementById("totalComplaintsCount") }; }

function bindDashboardUi() {
  const refs = getRefs(); refs.logoutBtn?.addEventListener("click", logout); refs.navMenuBtn?.addEventListener("click", toggleMobileNav); refs.eventSearch?.addEventListener("input", (event) => { state.eventSearchTerm = event.target.value.trim().toLowerCase(); renderEvents(); });
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { state.eventFilter = button.dataset.filter; document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button)); renderEvents(); }));
  refs.complaintSearch?.addEventListener("input", (event) => { state.complaintSearchTerm = event.target.value.trim().toLowerCase(); renderComplaints(); }); document.querySelectorAll("[data-complaint-filter]").forEach((button) => button.addEventListener("click", () => { state.complaintFilter = button.dataset.complaintFilter; document.querySelectorAll("[data-complaint-filter]").forEach((item) => item.classList.toggle("is-active", item === button)); renderComplaints(); }));
  refs.complaintForm?.addEventListener("submit", submitComplaint); refs.complaintModal?.addEventListener("click", (event) => { if (event.target.matches("[data-modal-close]")) closeComplaintModal(); }); document.addEventListener("keydown", (event) => { if (event.key === "Escape" && refs.complaintModal?.classList.contains("is-open")) closeComplaintModal(); });
}

function registerEvent(eventId) { loadUserRegistrations(); if (state.registrations.some((item) => item.eventId === eventId)) { showToast("You are already registered for this event.", "warning"); return; } const event = state.events.find((item) => item.id === eventId); if (!event) return; if (getSeatsLeft(eventId, event.totalSeats) <= 0) { showToast("This event is fully booked.", "danger"); return; } const registrations = getRegistrations(); registrations.push({ id: createId("registration"), userId: state.user.id, eventId, registeredAt: new Date().toISOString() }); saveRegistrations(registrations); loadUserRegistrations(); updateDashboardStats(); renderEvents(); showToast("Registered successfully.", "success"); }
function unregisterEvent(eventId) { saveRegistrations(getRegistrations().filter((item) => !(item.userId === state.user.id && item.eventId === eventId))); loadUserRegistrations(); updateDashboardStats(); renderEvents(); showToast("Registration removed.", "success"); }
function getSeatsLeft(eventId, totalSeats) { return Math.max(0, totalSeats - state.allRegistrations.filter((item) => item.eventId === eventId).length); }

function renderEvents() {
  const refs = getRefs(); const visible = state.events.filter((event) => { const category = event.category.toLowerCase(); return (state.eventFilter === "all" || category === state.eventFilter) && (!state.eventSearchTerm || event.title.toLowerCase().includes(state.eventSearchTerm) || category.includes(state.eventSearchTerm)); });
  refs.eventGrid.innerHTML = visible.length ? visible.map((event) => { const registered = state.registrations.some((item) => item.eventId === event.id); const full = getSeatsLeft(event.id, event.totalSeats) <= 0; const seats = full ? "Fully Booked" : `${getSeatsLeft(event.id, event.totalSeats)} seats left`; return `<article class="event-card"><div class="event-card__badge ${badgeClassForEvent(event.category)}">${event.category}</div><h3>${escapeHtml(event.title)}</h3><p class="event-card__detail"><strong>Date:</strong> ${formatDate(event.eventDate)}</p><p class="event-card__detail"><strong>Time:</strong> ${event.eventTime}</p><p class="event-card__detail"><strong>Location:</strong> ${escapeHtml(event.location)}</p><p class="event-card__description">${escapeHtml(event.description)}</p><div class="event-card__footer"><span class="event-card__status ${full ? "event-card__status--booked" : "event-card__status--open"}">${seats}</span><button class="btn ${registered ? "btn--secondary" : "btn--primary"}" type="button" data-register-event="${event.id}" ${registered || full ? "disabled" : ""}>${registered ? "Registered" : full ? "Fully Booked" : "Register"}</button></div></article>`; }).join("") : `<div class="empty-state">No events found.</div>`;
  refs.registeredEventsList.innerHTML = state.registrations.length ? state.registrations.map((registration) => { const event = state.events.find((item) => item.id === registration.eventId); return event ? `<article class="registered-item"><div class="registered-item__top"><div><span class="event-card__badge ${badgeClassForEvent(event.category)}">${event.category}</span><h3 class="registered-item__title">${escapeHtml(event.title)}</h3><p class="registered-item__meta">${formatDate(event.eventDate)} | ${event.eventTime}</p><p class="registered-item__meta">${escapeHtml(event.location)}</p></div><span class="event-card__status event-card__status--open">Registered</span></div><div class="registered-item__actions"><button class="btn btn--ghost" type="button" data-unregister-event="${event.id}">Unregister</button></div></article>` : ""; }).join("") : `<div class="empty-state">No registered events yet.</div>`;
  refs.eventGrid.querySelectorAll("[data-register-event]").forEach((button) => button.addEventListener("click", () => registerEvent(button.dataset.registerEvent))); refs.registeredEventsList.querySelectorAll("[data-unregister-event]").forEach((button) => button.addEventListener("click", () => unregisterEvent(button.dataset.unregisterEvent)));
}

function submitComplaint(event) { event.preventDefault(); const refs = getRefs(); clearFieldErrors(); const title = refs.complaintTitle.value.trim(); const category = refs.complaintCategory.value; const description = refs.complaintDescription.value.trim(); const priority = refs.complaintPriority.value; const location = refs.complaintLocation.value.trim(); let valid = true; if (!title) { setFieldError(refs.titleError, "Title is required."); valid = false; } if (!category) { setFieldError(refs.categoryError, "Category is required."); valid = false; } if (!description) { setFieldError(refs.descriptionError, "Description is required."); valid = false; } if (!location) { setFieldError(refs.locationError, "Location is required."); valid = false; } if (!valid) { showToast("Please complete all complaint fields.", "warning"); return; } const complaints = getComplaints(); complaints.unshift({ id: createId("complaint"), userId: state.user.id, title, category, description, priority, location, status: "Pending", createdAt: new Date().toISOString() }); saveComplaints(complaints); refs.complaintForm.reset(); refs.complaintPriority.value = "Medium"; loadComplaints(); updateDashboardStats(); renderComplaints(); showToast("Complaint submitted successfully.", "success"); }

function renderComplaints() { const refs = getRefs(); const visible = state.complaints.filter((complaint) => { const searchable = `${complaint.title} ${complaint.id} ${complaint.category}`.toLowerCase(); return (state.complaintFilter === "all" || complaint.status === state.complaintFilter) && (!state.complaintSearchTerm || searchable.includes(state.complaintSearchTerm)); }); refs.complaintsList.innerHTML = visible.length ? visible.map((complaint) => `<article class="complaint-card"><div class="complaint-card__top"><div><span class="event-card__badge ${badgeClassForComplaint(complaint.category)}">${complaint.category}</span><h3 class="complaint-card__title">${escapeHtml(complaint.title)}</h3><p class="complaint-card__meta"><strong>ID:</strong> ${escapeHtml(complaint.id)}</p><p class="complaint-card__meta"><strong>Location:</strong> ${escapeHtml(complaint.location)}</p></div><span class="status-badge ${badgeClassForStatus(complaint.status)}">${complaint.status}</span></div><p class="complaint-card__meta"><strong>Description:</strong> ${escapeHtml(complaint.description)}</p><p class="complaint-card__meta"><strong>Priority:</strong> ${escapeHtml(complaint.priority)}</p><p class="complaint-card__meta"><strong>Date Submitted:</strong> ${formatDateTime(complaint.createdAt)}</p><div class="complaint-card__actions"><button class="btn btn--secondary" type="button" data-view-complaint="${complaint.id}">View Details</button><button class="btn btn--ghost" type="button" data-delete-complaint="${complaint.id}">Delete Complaint</button></div></article>`).join("") : `<div class="empty-state">No complaints found.</div>`; refs.complaintsList.querySelectorAll("[data-view-complaint]").forEach((button) => button.addEventListener("click", () => viewComplaint(button.dataset.viewComplaint))); refs.complaintsList.querySelectorAll("[data-delete-complaint]").forEach((button) => button.addEventListener("click", () => deleteComplaint(button.dataset.deleteComplaint))); }
function deleteComplaint(complaintId) { const complaint = state.complaints.find((item) => item.id === complaintId); if (!complaint || !window.confirm(`Delete complaint ${complaint.id}?`)) return; saveComplaints(getComplaints().filter((item) => !(item.id === complaintId && item.userId === state.user.id))); loadComplaints(); updateDashboardStats(); renderComplaints(); if (state.activeComplaintId === complaintId) closeComplaintModal(); showToast("Complaint deleted.", "success"); }
function updateDashboardStats() { const refs = getRefs(); if (refs.upcomingEventsCount) refs.upcomingEventsCount.textContent = String(state.events.length).padStart(2, "0"); if (refs.registeredEventsCount) refs.registeredEventsCount.textContent = String(state.registrations.length).padStart(2, "0"); if (refs.pendingComplaintsCount) refs.pendingComplaintsCount.textContent = String(state.complaints.filter((item) => item.status === "Pending").length).padStart(2, "0"); if (refs.totalComplaintsCount) refs.totalComplaintsCount.textContent = String(state.complaints.length).padStart(2, "0"); }
function viewComplaint(complaintId) { const refs = getRefs(); const complaint = state.complaints.find((item) => item.id === complaintId); if (!complaint) return; state.activeComplaintId = complaintId; refs.complaintModalContent.innerHTML = `<div class="modal__row"><strong>ID:</strong> ${escapeHtml(complaint.id)}</div><div class="modal__row"><strong>Title:</strong> ${escapeHtml(complaint.title)}</div><div class="modal__row"><strong>Category:</strong> ${escapeHtml(complaint.category)}</div><div class="modal__row"><strong>Description:</strong> ${escapeHtml(complaint.description)}</div><div class="modal__row"><strong>Location:</strong> ${escapeHtml(complaint.location)}</div><div class="modal__row"><strong>Priority:</strong> ${escapeHtml(complaint.priority)}</div><div class="modal__row"><strong>Date Submitted:</strong> ${formatDateTime(complaint.createdAt)}</div><div class="modal__row"><strong>Status:</strong> ${escapeHtml(complaint.status)}</div>`; refs.complaintModal.classList.add("is-open"); refs.complaintModal.setAttribute("aria-hidden", "false"); }
function closeComplaintModal() { const modal = document.getElementById("complaintModal"); modal?.classList.remove("is-open"); modal?.setAttribute("aria-hidden", "true"); }
function toggleMobileNav() { const menu = document.getElementById("mobileNav"); const button = document.getElementById("navMenuBtn"); if (!menu || !button) return; const open = menu.hidden; menu.hidden = !open; menu.classList.toggle("is-open", open); button.setAttribute("aria-expanded", String(open)); }
function setCurrentDate() { const element = document.getElementById("currentDate"); if (element) element.textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()); }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }
function formatDateTime(value) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function setFieldError(element, message) { if (element) element.textContent = message; }
function clearFieldErrors() { ["titleError", "categoryError", "descriptionError", "locationError"].forEach((id) => { const element = document.getElementById(id); if (element) element.textContent = ""; }); }
function badgeClassForEvent(category) { return { technical: "event-card__badge--blue", sports: "event-card__badge--green", cultural: "event-card__badge--pink", workshop: "event-card__badge--amber" }[category.toLowerCase()] || "event-card__badge--blue"; }
function badgeClassForComplaint(category) { return { technical: "event-card__badge--blue", library: "event-card__badge--amber", hostel: "event-card__badge--green", transport: "event-card__badge--teal", cafeteria: "event-card__badge--pink", academic: "event-card__badge--red" }[category.toLowerCase()] || "event-card__badge--blue"; }
function badgeClassForStatus(status) { return status === "In Progress" ? "status-badge--progress" : status === "Resolved" ? "status-badge--resolved" : "status-badge--pending"; }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function showToast(message, type = "success") { const bar = document.getElementById("feedbackBar"); if (!bar) return; const note = document.createElement("div"); note.className = `feedback-message feedback-message--${type}`; note.textContent = message; bar.appendChild(note); window.setTimeout(() => note.remove(), 3000); }

window.CampusConnect = { getCurrentUser, registerUser, loginUser, logout, protectDashboard, loadUserProfile, getUsers, saveUsers, getRegistrations, saveRegistrations, getComplaints, saveComplaints, registerEvent, unregisterEvent, submitComplaint, deleteComplaint, updateDashboardStats };
