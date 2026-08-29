/* Demo-only client-side role checking is for demonstration only and is not secure for production applications. */

const STORAGE_KEYS = {
  users: "campusconnect_users",
  currentUser: "campusconnect_current_user",
  events: "campusconnect_events",
  registrations: "campusconnect_event_registrations",
  complaints: "campusconnect_complaints",
};

const DEFAULT_EVENTS = [
  { id: "hackathon-2026", title: "Hackathon 2026", category: "Technical", description: "Build creative solutions in teams and present them to mentors.", eventDate: "2026-09-12", eventTime: "9:00 AM - 9:00 PM", location: "Innovation Lab", totalSeats: 24 },
  { id: "annual-sports-meet", title: "Annual Sports Meet", category: "Sports", description: "Compete in athletics, football, basketball, and indoor games.", eventDate: "2026-09-15", eventTime: "7:00 AM - 5:00 PM", location: "University Sports Complex", totalSeats: 18 },
  { id: "tech-fest", title: "Tech Fest", category: "Technical", description: "Showcase projects, attend demos, and join tech talks.", eventDate: "2026-09-18", eventTime: "10:00 AM - 4:00 PM", location: "Main Auditorium", totalSeats: 30 },
  { id: "coding-workshop", title: "Coding Workshop", category: "Workshop", description: "Learn JavaScript techniques and debugging habits.", eventDate: "2026-09-20", eventTime: "2:00 PM - 5:00 PM", location: "Computer Lab 2", totalSeats: 12 },
  { id: "cultural-night", title: "Cultural Night", category: "Cultural", description: "Enjoy student performances, music, and dance.", eventDate: "2026-09-24", eventTime: "6:30 PM - 10:00 PM", location: "Open Air Theatre", totalSeats: 20 },
  { id: "resume-workshop", title: "Resume Building Workshop", category: "Workshop", description: "Improve your resume and interview presentation.", eventDate: "2026-09-27", eventTime: "11:00 AM - 1:00 PM", location: "Seminar Hall B", totalSeats: 16 },
];

const DEMO_ADMIN = {
  id: "admin-campusconnect",
  fullName: "CampusConnect Admin",
  email: "admin@campusconnect.com",
  password: "admin123",
  role: "admin",
  createdAt: new Date().toISOString(),
};

const state = {
  user: null,
  events: [],
  registrations: [],
  complaints: [],
  eventSearchTerm: "",
  eventFilter: "all",
  complaintSearchTerm: "",
  complaintFilter: "all",
  activeComplaintId: null,
  eventModalMode: "create",
  editingEventId: null,
  adminEventSearchTerm: "",
  adminComplaintSearchTerm: "",
  adminStudentSearchTerm: "",
  activeCheckInEventId: null,
  attendeeSearchTerm: "",
  attendeeFilter: "all",
  scannerStream: null,
  scannerTimer: null,
};

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  if (document.body.classList.contains("auth-page")) initAuthPage();
  if (document.body.classList.contains("dashboard-page")) initDashboard();
  if (document.body.classList.contains("admin-page")) initAdminDashboard();
});

function readStorage(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (error) { console.error(`Could not read ${key}:`, error); return fallback; }
}

function writeStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function createId(prefix) { return `${prefix}-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`; }
function getUsers() { return readStorage(STORAGE_KEYS.users); }
function saveUsers(users) { writeStorage(STORAGE_KEYS.users, users); }
function getEvents() { return readStorage(STORAGE_KEYS.events); }
function saveEvents(events) { writeStorage(STORAGE_KEYS.events, events); }
function getRegistrations() { return readStorage(STORAGE_KEYS.registrations); }
function saveRegistrations(registrations) { writeStorage(STORAGE_KEYS.registrations, registrations); }
function getComplaints() { return readStorage(STORAGE_KEYS.complaints); }
function saveComplaints(complaints) { writeStorage(STORAGE_KEYS.complaints, complaints); }

function ensureDemoData() {
  const users = getUsers().map(normalizeUser);
  const existingAdmin = users.find((user) => user.email.toLowerCase() === DEMO_ADMIN.email.toLowerCase());
  if (!existingAdmin) users.push(DEMO_ADMIN);
  saveUsers(users);

  if (!localStorage.getItem(STORAGE_KEYS.events)) saveEvents(DEFAULT_EVENTS);
  migrateRegistrations();
  if (!localStorage.getItem(STORAGE_KEYS.complaints)) saveComplaints([]);
}

function generateTicketCode(eventId = "event") {
  const prefix = String(eventId).replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase().padEnd(4, "X");
  const randomPart = (window.crypto?.getRandomValues ? Array.from(window.crypto.getRandomValues(new Uint32Array(2))).map((value) => value.toString(36)).join("") : `${Date.now()}${Math.random()}`).replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-8);
  return `CC-${prefix}-${randomPart}`;
}

function migrateRegistrations() {
  const registrations = getRegistrations();
  const migrated = registrations.map((registration) => ({
    ...registration,
    id: registration.id || createId("registration"),
    checkedIn: registration.checkedIn === true,
    checkedInAt: registration.checkedInAt || null,
    ticketCode: registration.ticketCode || generateTicketCode(registration.eventId),
  }));
  if (JSON.stringify(registrations) !== JSON.stringify(migrated)) saveRegistrations(migrated);
  return migrated;
}

function normalizeUser(user) {
  if (!user) return user;
  return { ...user, role: user.role || "student" };
}

function getCurrentUser() {
  const session = readStorage(STORAGE_KEYS.currentUser, null);
  if (!session?.userId) return null;
  const user = getUsers().map(normalizeUser).find((item) => item.id === session.userId);
  if (!user) localStorage.removeItem(STORAGE_KEYS.currentUser);
  return user || null;
}

function getDisplayName(fullName, email = "") { return String(fullName || "").trim() || email.split("@")[0] || "Campus member"; }
function getInitials(fullName) { return getDisplayName(fullName).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "C"; }
function firstName(fullName) { return getDisplayName(fullName).split(/\s+/)[0]; }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

function registerUser(fullName, email, password) {
  const users = getUsers().map(normalizeUser);
  if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) return { error: "An account with this email already exists." };
  const user = { id: createId("user"), fullName, email, password, role: "student", createdAt: new Date().toISOString() };
  saveUsers([...users, user]);
  writeStorage(STORAGE_KEYS.currentUser, { userId: user.id });
  return { user };
}

function loginUser(email, password) {
  const user = getUsers().map(normalizeUser).find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user) return { error: "No account was found with that email." };
  if (user.password !== password) return { error: "Incorrect email or password." };
  writeStorage(STORAGE_KEYS.currentUser, { userId: user.id });
  return { user };
}

function routeUser(user) {
  if (!user) return window.location.replace("/");
  if (user.role === "admin") window.location.replace("/admin.html");
  else window.location.replace("/dashboard.html");
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  window.location.replace("/");
}

function protectDashboard(expectedRole) {
  const user = getCurrentUser();
  if (!user) {
    window.location.replace("/");
    return null;
  }
  if (expectedRole && user.role !== expectedRole) {
    window.location.replace(expectedRole === "admin" ? "/dashboard.html" : "/admin.html");
    return null;
  }
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

  const currentUser = getCurrentUser();
  if (currentUser) {
    routeUser(currentUser);
    return;
  }

  const setMessage = (message, type = "") => {
    authMessage.className = `auth-message ${type ? `is-${type}` : ""}`.trim();
    authMessage.textContent = message;
  };

  const syncMode = () => {
    const signup = mode === "signup";
    if (fullNameField) fullNameField.style.display = signup ? "grid" : "none";
    if (confirmPasswordField) confirmPasswordField.style.display = signup ? "grid" : "none";
    signInBtn.textContent = signup ? "Create Account" : "Sign In";
    createAccountBtn.textContent = signup ? "Sign In" : "Create Account";
    switchModeBtn.textContent = signup ? "Sign in" : "Create account";
    passwordInput.autocomplete = signup ? "new-password" : "current-password";
  };

  const switchMode = () => {
    mode = mode === "signin" ? "signup" : "signin";
    setMessage("");
    syncMode();
  };

  togglePasswordBtn?.addEventListener("click", () => {
    const hidden = passwordInput.type === "password";
    passwordInput.type = hidden ? "text" : "password";
    togglePasswordBtn.textContent = hidden ? "Hide" : "Show";
  });
  switchModeBtn?.addEventListener("click", switchMode);
  createAccountBtn?.addEventListener("click", switchMode);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setMessage("");
    signInBtn.disabled = true;
    createAccountBtn.disabled = true;
    signInBtn.textContent = "Please wait...";

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let error = "";

    if (!email || !password || (mode === "signup" && (!fullName || !confirmPasswordInput.value))) error = "Please complete all required fields.";
    else if (!validEmail(email)) error = "Please enter a valid email address.";
    else if (mode === "signup" && password.length < 6) error = "Password must be at least 6 characters.";
    else if (mode === "signup" && password !== confirmPasswordInput.value) error = "Passwords do not match.";

    if (error) {
      setMessage(error, "error");
    } else {
      const result = mode === "signup" ? registerUser(fullName, email, password) : loginUser(email, password);
      if (result.error) setMessage(result.error, "error");
      else routeUser(result.user);
    }

    signInBtn.disabled = false;
    createAccountBtn.disabled = false;
    syncMode();
  });

  syncMode();
}

function loadEvents() { state.events = getEvents(); }
function loadUserRegistrations() {
  state.registrations = migrateRegistrations();
}
function loadComplaints() {
  state.complaints = getComplaints();
}

function initDashboard() {
  const user = protectDashboard();
  if (!user) return;
  state.user = user;
  loadEvents();
  loadUserRegistrations();
  loadComplaints();
  bindDashboardUi();
  updateDashboardStats();
  renderDashboard();
  setCurrentDate();
}

function initAdminDashboard() {
  const user = protectDashboard("admin");
  if (!user) return;
  state.user = user;
  loadEvents();
  loadUserRegistrations();
  loadComplaints();
  renderAdminDashboard();
}

function renderDashboard() {
  if (state.user.role === "admin") {
    renderAdminDashboard();
    return;
  }
  loadUserProfile();
  renderEvents();
  renderComplaints();
}

function loadUserProfile() {
  const refs = getRefs();
  const name = getDisplayName(state.user.fullName, state.user.email);
  if (refs.profileName) {
    refs.profileName.textContent = name;
    refs.profileName.title = state.user.email;
  }
  if (refs.profileEmail) refs.profileEmail.textContent = state.user.email;
  if (refs.welcomeMessage) refs.welcomeMessage.textContent = `Welcome back, ${firstName(name)}!`;
  if (refs.userAvatar) refs.userAvatar.textContent = getInitials(name);
}

function getRefs() {
  return {
    welcomeMessage: document.getElementById("welcomeMessage"),
    profileName: document.getElementById("profileName"),
    profileEmail: document.getElementById("profileEmail"),
    userAvatar: document.getElementById("userAvatar"),
    currentDate: document.getElementById("currentDate"),
    logoutBtn: document.getElementById("logoutBtn"),
    navMenuBtn: document.getElementById("navMenuBtn"),
    mobileNav: document.getElementById("mobileNav"),
    eventGrid: document.getElementById("eventGrid"),
    eventSearch: document.getElementById("eventSearch"),
    registeredEventsList: document.getElementById("registeredEventsList"),
    complaintsList: document.getElementById("complaintsList"),
    complaintForm: document.getElementById("complaintForm"),
    complaintTitle: document.getElementById("complaintTitle"),
    complaintCategory: document.getElementById("complaintCategory"),
    complaintDescription: document.getElementById("complaintDescription"),
    complaintPriority: document.getElementById("complaintPriority"),
    complaintLocation: document.getElementById("complaintLocation"),
    titleError: document.getElementById("titleError"),
    categoryError: document.getElementById("categoryError"),
    descriptionError: document.getElementById("descriptionError"),
    locationError: document.getElementById("locationError"),
    complaintSearch: document.getElementById("complaintSearch"),
    complaintModal: document.getElementById("complaintModal"),
    complaintModalContent: document.getElementById("complaintModalContent"),
    feedbackBar: document.getElementById("feedbackBar"),
    upcomingEventsCount: document.getElementById("upcomingEventsCount"),
    registeredEventsCount: document.getElementById("registeredEventsCount"),
    pendingComplaintsCount: document.getElementById("pendingComplaintsCount"),
    totalComplaintsCount: document.getElementById("totalComplaintsCount"),
  };
}

function bindDashboardUi() {
  const refs = getRefs();
  refs.logoutBtn?.addEventListener("click", logout);
  refs.navMenuBtn?.addEventListener("click", toggleMobileNav);

  if (state.user.role === "student") {
    refs.eventSearch?.addEventListener("input", (event) => {
      state.eventSearchTerm = event.target.value.trim().toLowerCase();
      renderEvents();
    });
    document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      state.eventFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderEvents();
    }));
    refs.complaintSearch?.addEventListener("input", (event) => {
      state.complaintSearchTerm = event.target.value.trim().toLowerCase();
      renderComplaints();
    });
    document.querySelectorAll("[data-complaint-filter]").forEach((button) => button.addEventListener("click", () => {
      state.complaintFilter = button.dataset.complaintFilter;
      document.querySelectorAll("[data-complaint-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderComplaints();
    }));
    refs.complaintForm?.addEventListener("submit", submitComplaint);
    refs.complaintModal?.addEventListener("click", (event) => { if (event.target.matches("[data-modal-close]")) closeComplaintModal(); });
    document.querySelectorAll("[data-ticket-close]").forEach((node) => node.addEventListener("click", closeTicketModal));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && refs.complaintModal?.classList.contains("is-open")) closeComplaintModal(); });
  }
}

function showEventTicket(registrationId) {
  const registration = migrateRegistrations().find((item) => item.id === registrationId && item.userId === state.user?.id);
  const event = registration && getEvents().find((item) => item.id === registration.eventId);
  const modal = document.getElementById("ticketModal");
  const content = document.getElementById("ticketContent");
  if (!registration || !event || !modal || !content) return;
  content.innerHTML = `<div class="ticket"><p class="eyebrow">CampusConnect</p><h2 id="ticketModalTitle">Event Ticket</h2><p class="ticket__event">${escapeHtml(event.title)}</p><div class="ticket__qr" id="ticketQr" aria-label="QR code for ${escapeHtml(event.title)}"><span>Preparing QR code...</span></div><div class="ticket__details"><p><strong>Student:</strong> ${escapeHtml(getDisplayName(state.user.fullName, state.user.email))}</p><p><strong>Date:</strong> ${formatDate(event.eventDate)}</p><p><strong>Time:</strong> ${escapeHtml(event.eventTime)}</p><p><strong>Location:</strong> ${escapeHtml(event.location)}</p><p><strong>Ticket ID:</strong> ${escapeHtml(registration.ticketCode)}</p><p><strong>Status:</strong> ${registration.checkedIn ? "Checked In" : "Registered"}</p></div></div>`;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  generateQRCode(registration, document.getElementById("ticketQr"));
}

function closeTicketModal() {
  const modal = document.getElementById("ticketModal");
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
}

function generateQRCode(registration, target) {
  if (!target) return;
  const payload = JSON.stringify({ ticketCode: registration.ticketCode, eventId: registration.eventId });
  target.textContent = "";
  if (window.QRCode) {
    new window.QRCode(target, { text: payload, width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel?.M });
    return;
  }
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
  script.onload = () => generateQRCode(registration, target);
  script.onerror = () => { target.innerHTML = `<div class="ticket__qr-fallback">QR library unavailable.<br /><strong>${escapeHtml(registration.ticketCode)}</strong></div>`; };
  document.head.appendChild(script);
}

function registerEvent(eventId) {
  loadUserRegistrations();
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  if (state.registrations.some((item) => item.userId === state.user.id && item.eventId === eventId)) {
    showToast("You are already registered for this event.", "warning");
    return;
  }
  if (getSeatsLeft(eventId, event.totalSeats) <= 0) {
    showToast("This event is fully booked.", "danger");
    return;
  }
  const registrations = getRegistrations();
  registrations.push({ id: createId("registration"), userId: state.user.id, eventId, registeredAt: new Date().toISOString(), checkedIn: false, checkedInAt: null, ticketCode: generateTicketCode(eventId) });
  saveRegistrations(registrations);
  loadUserRegistrations();
  updateDashboardStats();
  renderEvents();
  renderAdminDashboard();
  showToast("Registration confirmed. Your ticket is ready.", "success");
}

function unregisterEvent(eventId) {
  saveRegistrations(getRegistrations().filter((item) => !(item.userId === state.user.id && item.eventId === eventId)));
  loadUserRegistrations();
  updateDashboardStats();
  renderEvents();
  renderAdminDashboard();
  showToast("Registration removed.", "success");
}

function getSeatsLeft(eventId, totalSeats) {
  return Math.max(0, totalSeats - getRegistrations().filter((item) => item.eventId === eventId).length);
}

function renderEvents() {
  const refs = getRefs();
  if (!refs.eventGrid || state.user.role !== "student") return;
  const visible = state.events.filter((event) => {
    const category = event.category.toLowerCase();
    return (state.eventFilter === "all" || category === state.eventFilter) && (!state.eventSearchTerm || event.title.toLowerCase().includes(state.eventSearchTerm) || category.includes(state.eventSearchTerm));
  });

  refs.eventGrid.innerHTML = visible.length ? visible.map((event) => {
    const registered = getRegistrations().some((item) => item.userId === state.user.id && item.eventId === event.id);
    const full = getSeatsLeft(event.id, event.totalSeats) <= 0;
    const seats = full ? "Fully Booked" : `${getSeatsLeft(event.id, event.totalSeats)} seats left`;
    return `<article class="event-card"><div class="event-card__badge ${badgeClassForEvent(event.category)}">${escapeHtml(event.category)}</div><h3>${escapeHtml(event.title)}</h3><p class="event-card__detail"><strong>Date:</strong> ${formatDate(event.eventDate)}</p><p class="event-card__detail"><strong>Time:</strong> ${escapeHtml(event.eventTime)}</p><p class="event-card__detail"><strong>Location:</strong> ${escapeHtml(event.location)}</p><p class="event-card__description">${escapeHtml(event.description)}</p><div class="event-card__footer"><span class="event-card__status ${full ? "event-card__status--booked" : "event-card__status--open"}">${seats}</span><button class="btn ${registered ? "btn--secondary" : "btn--primary"}" type="button" data-register-event="${event.id}" ${registered || full ? "disabled" : ""}>${registered ? "Registered" : full ? "Fully Booked" : "Register"}</button></div></article>`;
  }).join("") : `<div class="empty-state">No events found.</div>`;

  refs.registeredEventsList.innerHTML = state.registrations.filter((item) => item.userId === state.user.id).length ? state.registrations.filter((item) => item.userId === state.user.id).map((registration) => {
    const event = state.events.find((item) => item.id === registration.eventId);
    return event ? `<article class="registered-item"><div class="registered-item__top"><div><span class="event-card__badge ${badgeClassForEvent(event.category)}">${escapeHtml(event.category)}</span><h3 class="registered-item__title">${escapeHtml(event.title)}</h3><p class="registered-item__meta">${formatDate(event.eventDate)} | ${escapeHtml(event.eventTime)}</p><p class="registered-item__meta">${escapeHtml(event.location)}</p></div><span class="event-card__status ${registration.checkedIn ? "event-card__status--checked-in" : "event-card__status--open"}">${registration.checkedIn ? "Checked In" : "Registered"}</span></div><div class="registered-item__actions"><button class="btn btn--primary" type="button" data-view-ticket="${registration.id}">View Ticket</button><button class="btn btn--ghost" type="button" data-unregister-event="${event.id}">Unregister</button></div></article>` : "";
  }).join("") : `<div class="empty-state">No registered events yet.</div>`;

  refs.eventGrid.querySelectorAll("[data-register-event]").forEach((button) => button.addEventListener("click", () => registerEvent(button.dataset.registerEvent)));
  refs.registeredEventsList.querySelectorAll("[data-unregister-event]").forEach((button) => button.addEventListener("click", () => unregisterEvent(button.dataset.unregisterEvent)));
  refs.registeredEventsList.querySelectorAll("[data-view-ticket]").forEach((button) => button.addEventListener("click", () => showEventTicket(button.dataset.viewTicket)));
}

function submitComplaint(event) {
  event.preventDefault();
  const refs = getRefs();
  clearFieldErrors();
  const title = refs.complaintTitle.value.trim();
  const category = refs.complaintCategory.value;
  const description = refs.complaintDescription.value.trim();
  const priority = refs.complaintPriority.value;
  const location = refs.complaintLocation.value.trim();
  let valid = true;
  if (!title) { setFieldError(refs.titleError, "Title is required."); valid = false; }
  if (!category) { setFieldError(refs.categoryError, "Category is required."); valid = false; }
  if (!description) { setFieldError(refs.descriptionError, "Description is required."); valid = false; }
  if (!location) { setFieldError(refs.locationError, "Location is required."); valid = false; }
  if (!valid) { showToast("Please complete all complaint fields.", "warning"); return; }
  const complaints = getComplaints();
  complaints.unshift({ id: createId("complaint"), userId: state.user.id, title, category, description, priority, location, status: "Pending", createdAt: new Date().toISOString() });
  saveComplaints(complaints);
  refs.complaintForm.reset();
  refs.complaintPriority.value = "Medium";
  loadComplaints();
  updateDashboardStats();
  renderComplaints();
  renderAdminDashboard();
  showToast("Complaint submitted successfully.", "success");
}

function renderComplaints() {
  const refs = getRefs();
  if (!refs.complaintsList || state.user.role !== "student") return;
  const visible = getComplaints().filter((complaint) => complaint.userId === state.user.id).filter((complaint) => {
    const searchable = `${complaint.title} ${complaint.id} ${complaint.category} ${complaint.status}`.toLowerCase();
    return (state.complaintFilter === "all" || complaint.status === state.complaintFilter) && (!state.complaintSearchTerm || searchable.includes(state.complaintSearchTerm));
  });
  refs.complaintsList.innerHTML = visible.length ? visible.map((complaint) => `<article class="complaint-card"><div class="complaint-card__top"><div><span class="event-card__badge ${badgeClassForComplaint(complaint.category)}">${escapeHtml(complaint.category)}</span><h3 class="complaint-card__title">${escapeHtml(complaint.title)}</h3><p class="complaint-card__meta"><strong>ID:</strong> ${escapeHtml(complaint.id)}</p><p class="complaint-card__meta"><strong>Location:</strong> ${escapeHtml(complaint.location)}</p></div><span class="status-badge ${badgeClassForStatus(complaint.status)}">${escapeHtml(complaint.status)}</span></div><p class="complaint-card__meta"><strong>Description:</strong> ${escapeHtml(complaint.description)}</p><p class="complaint-card__meta"><strong>Priority:</strong> ${escapeHtml(complaint.priority)}</p><p class="complaint-card__meta"><strong>Date Submitted:</strong> ${formatDateTime(complaint.createdAt)}</p><div class="complaint-card__actions"><button class="btn btn--secondary" type="button" data-view-complaint="${complaint.id}">View Details</button><button class="btn btn--ghost" type="button" data-delete-complaint="${complaint.id}">Delete Complaint</button></div></article>`).join("") : `<div class="empty-state">No complaints found.</div>`;
  refs.complaintsList.querySelectorAll("[data-view-complaint]").forEach((button) => button.addEventListener("click", () => viewComplaint(button.dataset.viewComplaint)));
  refs.complaintsList.querySelectorAll("[data-delete-complaint]").forEach((button) => button.addEventListener("click", () => deleteComplaint(button.dataset.deleteComplaint)));
}

function deleteComplaint(complaintId) {
  const complaint = getComplaints().find((item) => item.id === complaintId && item.userId === state.user.id);
  if (!complaint || !window.confirm(`Delete complaint ${complaint.id}?`)) return;
  saveComplaints(getComplaints().filter((item) => !(item.id === complaintId && item.userId === state.user.id)));
  loadComplaints();
  updateDashboardStats();
  renderComplaints();
  renderAdminDashboard();
  if (state.activeComplaintId === complaintId) closeComplaintModal();
  showToast("Complaint deleted.", "success");
}

function updateDashboardStats() {
  const refs = getRefs();
  if (state.user?.role === "student") {
    if (refs.upcomingEventsCount) refs.upcomingEventsCount.textContent = String(state.events.length).padStart(2, "0");
    if (refs.registeredEventsCount) refs.registeredEventsCount.textContent = String(state.registrations.filter((item) => item.userId === state.user.id).length).padStart(2, "0");
    if (refs.pendingComplaintsCount) refs.pendingComplaintsCount.textContent = String(getComplaints().filter((item) => item.userId === state.user.id && item.status === "Pending").length).padStart(2, "0");
    if (refs.totalComplaintsCount) refs.totalComplaintsCount.textContent = String(getComplaints().filter((item) => item.userId === state.user.id).length).padStart(2, "0");
  }
}

function viewComplaint(complaintId) {
  const refs = getRefs();
  const complaint = getComplaints().find((item) => item.id === complaintId && item.userId === state.user.id);
  if (!complaint) return;
  state.activeComplaintId = complaintId;
  refs.complaintModalContent.innerHTML = `<div class="modal__row"><strong>ID:</strong> ${escapeHtml(complaint.id)}</div><div class="modal__row"><strong>Title:</strong> ${escapeHtml(complaint.title)}</div><div class="modal__row"><strong>Category:</strong> ${escapeHtml(complaint.category)}</div><div class="modal__row"><strong>Description:</strong> ${escapeHtml(complaint.description)}</div><div class="modal__row"><strong>Location:</strong> ${escapeHtml(complaint.location)}</div><div class="modal__row"><strong>Priority:</strong> ${escapeHtml(complaint.priority)}</div><div class="modal__row"><strong>Date Submitted:</strong> ${formatDateTime(complaint.createdAt)}</div><div class="modal__row"><strong>Status:</strong> ${escapeHtml(complaint.status)}</div>`;
  refs.complaintModal.classList.add("is-open");
  refs.complaintModal.setAttribute("aria-hidden", "false");
}

function closeComplaintModal() {
  const modal = document.getElementById("complaintModal");
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
}

function toggleMobileNav() {
  const menu = document.getElementById("mobileNav");
  const button = document.getElementById("navMenuBtn");
  if (!menu || !button) return;
  const open = menu.hidden;
  menu.hidden = !open;
  menu.classList.toggle("is-open", open);
  button.setAttribute("aria-expanded", String(open));
}

function setCurrentDate() {
  const element = document.getElementById("currentDate");
  if (element) element.textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }
function formatDateTime(value) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function setFieldError(element, message) { if (element) element.textContent = message; }
function clearFieldErrors() { ["titleError", "categoryError", "descriptionError", "locationError"].forEach((id) => { const element = document.getElementById(id); if (element) element.textContent = ""; }); }
function badgeClassForEvent(category) { return { technical: "event-card__badge--blue", sports: "event-card__badge--green", cultural: "event-card__badge--pink", workshop: "event-card__badge--amber" }[category.toLowerCase()] || "event-card__badge--blue"; }
function badgeClassForComplaint(category) { return { technical: "event-card__badge--blue", library: "event-card__badge--amber", hostel: "event-card__badge--green", transport: "event-card__badge--teal", cafeteria: "event-card__badge--pink", academic: "event-card__badge--red" }[category.toLowerCase()] || "event-card__badge--blue"; }
function badgeClassForStatus(status) { return status === "In Progress" ? "status-badge--progress" : status === "Resolved" ? "status-badge--resolved" : "status-badge--pending"; }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function showToast(message, type = "success") {
  const bar = document.getElementById("feedbackBar");
  if (!bar) return;
  const note = document.createElement("div");
  note.className = `feedback-message feedback-message--${type}`;
  note.textContent = message;
  bar.appendChild(note);
  window.setTimeout(() => note.remove(), 3000);
}

function renderAdminDashboard() {
  const root = document.getElementById("adminRoot");
  if (!root || state.user?.role !== "admin") return;

  const events = getEvents();
  const complaints = getComplaints();
  const users = getUsers().map(normalizeUser);
  const students = users.filter((user) => user.role === "student");
  const eventQuery = state.adminEventSearchTerm.trim().toLowerCase();
  const complaintQuery = state.adminComplaintSearchTerm.trim().toLowerCase();
  const studentQuery = state.adminStudentSearchTerm.trim().toLowerCase();

  const visibleEvents = events.filter((event) => !eventQuery || `${event.title} ${event.category}`.toLowerCase().includes(eventQuery));
  const visibleComplaints = complaints.filter((complaint) => {
    const student = users.find((user) => user.id === complaint.userId);
    const blob = `${complaint.id} ${student?.fullName || ""} ${complaint.title} ${complaint.category} ${complaint.status}`.toLowerCase();
    return !complaintQuery || blob.includes(complaintQuery);
  });
  const visibleStudents = students.filter((student) => `${student.fullName} ${student.email}`.toLowerCase().includes(studentQuery));

  const registrations = migrateRegistrations();
  const totalRegistrations = registrations.length;
  const totalStudents = students.length;
  const totalEvents = events.length;
  const pendingComplaints = complaints.filter((item) => item.status === "Pending").length;

  root.innerHTML = `
    <section class="admin-shell">
      <header class="admin-topbar">
        <div class="brand-lockup">
          <div class="brand__mark" aria-hidden="true">CC</div>
          <div>
            <h1 class="brand__name">CampusConnect</h1>
            <p class="brand__tagline">Admin Dashboard</p>
          </div>
        </div>
        <div class="admin-topbar__actions">
          <div class="profile-pill profile-pill--admin">
            <div class="avatar" aria-hidden="true">${getInitials(state.user.fullName)}</div>
            <div>
              <p class="profile-pill__label">Admin</p>
              <p class="profile-pill__name">${escapeHtml(state.user.fullName)}</p>
              <p class="profile-pill__email">${escapeHtml(state.user.email)}</p>
            </div>
          </div>
          <button class="nav-shelf__menu admin-menu-btn" id="adminMenuBtn" type="button" aria-expanded="false" aria-controls="adminMobileNav">Menu</button>
          <button class="btn btn--secondary" id="adminLogoutBtn" type="button">Logout</button>
        </div>
      </header>
      <nav class="nav-shelf admin-nav" aria-label="Admin navigation">
        <div class="nav-shelf__links">
          <a class="nav-link active" href="#adminDashboard">Dashboard</a>
          <a class="nav-link" href="#adminEvents">Events</a>
          <a class="nav-link" href="#adminComplaints">Complaints</a>
          <a class="nav-link" href="#adminStudents">Students</a>
        </div>
      </nav>
      <div class="mobile-nav" id="adminMobileNav" hidden>
        <a class="nav-link active" href="#adminDashboard">Dashboard</a>
        <a class="nav-link" href="#adminEvents">Events</a>
        <a class="nav-link" href="#adminComplaints">Complaints</a>
        <a class="nav-link" href="#adminStudents">Students</a>
      </div>
      <section class="hero-card admin-hero" id="adminDashboard">
        <p class="eyebrow">ADMIN CONTROL CENTER</p>
        <h2>Welcome back, Admin!</h2>
        <p class="hero-card__sub">Manage campus activities, events and student services.</p>
      </section>
      <section class="stats-grid">
        <article class="stat-card"><p class="stat-card__label">Total Students</p><h3 class="stat-card__value">${String(totalStudents)}</h3></article>
        <article class="stat-card"><p class="stat-card__label">Total Events</p><h3 class="stat-card__value">${String(totalEvents)}</h3></article>
        <article class="stat-card"><p class="stat-card__label">Total Registrations</p><h3 class="stat-card__value">${String(totalRegistrations)}</h3></article>
        <article class="stat-card"><p class="stat-card__label">Pending Complaints</p><h3 class="stat-card__value">${String(pendingComplaints)}</h3></article>
      </section>
      <section class="admin-panels">
        <article class="panel admin-panel" id="adminEvents">
          <div class="section-heading">
            <div><p class="eyebrow">Event Management</p><h2>Events</h2></div>
            <button class="btn btn--primary" id="createEventBtn" type="button">+ Create Event</button>
          </div>
          <label class="search-box" for="adminEventSearch"><span class="search-box__icon" aria-hidden="true">Search</span><input id="adminEventSearch" type="search" placeholder="Search by title or category" autocomplete="off" value="${escapeHtml(state.adminEventSearchTerm)}" /></label>
           <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Event Name</th><th>Category</th><th>Date</th><th>Location</th><th>Capacity</th><th>Registered</th><th>Checked In</th><th>Remaining</th><th>Actions</th></tr></thead><tbody>${visibleEvents.map((event) => { const eventRegistrations = registrations.filter((item) => item.eventId === event.id); const registered = eventRegistrations.length; const checkedIn = eventRegistrations.filter((item) => item.checkedIn).length; const available = getSeatsLeft(event.id, event.totalSeats); return `<tr><td>${escapeHtml(event.title)}</td><td>${escapeHtml(event.category)}</td><td>${formatDate(event.eventDate)}</td><td>${escapeHtml(event.location)}</td><td>${event.totalSeats}</td><td>${registered}</td><td>${checkedIn}</td><td>${Math.max(0, registered - checkedIn)}</td><td><div class="table-actions"><button class="btn btn--secondary" type="button" data-edit-event="${event.id}">Edit</button><button class="btn btn--ghost" type="button" data-delete-event="${event.id}">Delete</button><button class="btn btn--primary" type="button" data-checkin-event="${event.id}">Check-In</button></div></td></tr>`; }).join("")}</tbody></table></div>
        </article>
        <article class="panel admin-panel" id="adminComplaints">
          <div class="section-heading">
            <div><p class="eyebrow">Complaint Management</p><h2>Complaints</h2></div>
          </div>
          <label class="search-box" for="adminComplaintSearch"><span class="search-box__icon" aria-hidden="true">Search</span><input id="adminComplaintSearch" type="search" placeholder="Search by student, title, category or status" autocomplete="off" value="${escapeHtml(state.adminComplaintSearchTerm)}" /></label>
          <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Complaint ID</th><th>Student</th><th>Title</th><th>Category</th><th>Priority</th><th>Location</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>${visibleComplaints.map((complaint) => { const student = users.find((user) => user.id === complaint.userId); return `<tr><td>${escapeHtml(complaint.id)}</td><td>${escapeHtml(student?.fullName || "Unknown")}</td><td>${escapeHtml(complaint.title)}</td><td>${escapeHtml(complaint.category)}</td><td>${escapeHtml(complaint.priority)}</td><td>${escapeHtml(complaint.location)}</td><td>${formatDateTime(complaint.createdAt)}</td><td><span class="status-badge ${badgeClassForStatus(complaint.status)}">${escapeHtml(complaint.status)}</span></td><td><div class="table-actions"><button class="btn btn--secondary" type="button" data-view-admin-complaint="${complaint.id}">View</button><button class="btn btn--ghost" type="button" data-status-progress="${complaint.id}">Mark In Progress</button><button class="btn btn--ghost" type="button" data-status-resolved="${complaint.id}">Mark Resolved</button></div></td></tr>`; }).join("")}</tbody></table></div>
        </article>
        <article class="panel admin-panel" id="adminStudents">
          <div class="section-heading">
            <div><p class="eyebrow">Student Management</p><h2>Students</h2></div>
          </div>
          <label class="search-box" for="adminStudentSearch"><span class="search-box__icon" aria-hidden="true">Search</span><input id="adminStudentSearch" type="search" placeholder="Search by name or email" autocomplete="off" value="${escapeHtml(state.adminStudentSearchTerm)}" /></label>
          <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Registered Events</th><th>Complaints</th></tr></thead><tbody>${visibleStudents.map((student) => { const registeredEvents = getRegistrations().filter((item) => item.userId === student.id).length; const studentComplaints = complaints.filter((item) => item.userId === student.id).length; return `<tr><td>${escapeHtml(student.fullName)}</td><td>${escapeHtml(student.email)}</td><td>${escapeHtml(student.role)}</td><td>${registeredEvents}</td><td>${studentComplaints}</td></tr>`; }).join("")}</tbody></table></div>
        </article>
      </section>
    </section>
    <div class="modal" id="eventModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="eventModalTitle">
      <div class="modal__backdrop" data-event-modal-close></div>
      <div class="modal__panel admin-modal" role="document">
        <button class="modal__close" type="button" data-event-modal-close aria-label="Close event form">×</button>
        <h2 id="eventModalTitle">${state.eventModalMode === "edit" ? "Edit Event" : "Create Event"}</h2>
        <form class="admin-form" id="eventForm">
          <input type="hidden" id="eventId" />
          <div class="admin-form__grid">
            <label class="form-field"><span>Event Title</span><input id="eventTitle" type="text" required /></label>
            <label class="form-field"><span>Category</span><select id="eventCategory" required><option value="">Select category</option><option>Technical</option><option>Sports</option><option>Cultural</option><option>Workshop</option></select></label>
            <label class="form-field"><span>Date</span><input id="eventDate" type="date" required /></label>
            <label class="form-field"><span>Time</span><input id="eventTime" type="text" placeholder="e.g. 2:00 PM - 5:00 PM" required /></label>
            <label class="form-field"><span>Location</span><input id="eventLocation" type="text" required /></label>
            <label class="form-field form-field--full"><span>Description</span><textarea id="eventDescription" rows="4" required></textarea></label>
            <label class="form-field"><span>Total Seats</span><input id="eventSeats" type="number" min="1" required /></label>
          </div>
          <div class="modal-actions"><button class="btn btn--secondary" type="button" data-event-modal-close>Cancel</button><button class="btn btn--primary" type="submit">Save Event</button></div>
        </form>
      </div>
    </div>
    <div class="modal" id="adminComplaintModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="adminComplaintModalTitle">
      <div class="modal__backdrop" data-admin-complaint-close></div>
      <div class="modal__panel admin-modal" role="document">
        <button class="modal__close" type="button" data-admin-complaint-close aria-label="Close complaint details">×</button>
        <h2 id="adminComplaintModalTitle">Complaint Details</h2>
        <div id="adminComplaintModalContent" class="modal__content"></div>
      </div>
    </div>
    <div class="modal" id="checkInModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="checkInModalTitle">
      <div class="modal__backdrop" data-checkin-close></div>
      <div class="modal__panel checkin-modal" role="document">
        <button class="modal__close" type="button" data-checkin-close aria-label="Close check-in">×</button>
        <div data-checkin-content></div>
      </div>
    </div>
  `;

  const adminLogoutBtn = document.getElementById("adminLogoutBtn");
  const createEventBtn = document.getElementById("createEventBtn");
  const adminMenuBtn = document.getElementById("adminMenuBtn");
  adminLogoutBtn?.addEventListener("click", logout);
  createEventBtn?.addEventListener("click", () => openEventModal());
  adminMenuBtn?.addEventListener("click", toggleAdminMobileNav);
  document.getElementById("adminEventSearch")?.addEventListener("input", (event) => { state.adminEventSearchTerm = event.target.value; renderAdminDashboard(); });
  document.getElementById("adminComplaintSearch")?.addEventListener("input", (event) => { state.adminComplaintSearchTerm = event.target.value; renderAdminDashboard(); });
  document.getElementById("adminStudentSearch")?.addEventListener("input", (event) => { state.adminStudentSearchTerm = event.target.value; renderAdminDashboard(); });
  document.querySelectorAll("[data-edit-event]").forEach((button) => button.addEventListener("click", () => openEventModal(button.dataset.editEvent)));
  document.querySelectorAll("[data-delete-event]").forEach((button) => button.addEventListener("click", () => deleteEvent(button.dataset.deleteEvent)));
  document.querySelectorAll("[data-checkin-event]").forEach((button) => button.addEventListener("click", () => openCheckIn(button.dataset.checkinEvent)));
  document.querySelectorAll("[data-view-admin-complaint]").forEach((button) => button.addEventListener("click", () => openAdminComplaintModal(button.dataset.viewAdminComplaint)));
  document.querySelectorAll("[data-status-progress]").forEach((button) => button.addEventListener("click", () => updateComplaintStatus(button.dataset.statusProgress, "In Progress")));
  document.querySelectorAll("[data-status-resolved]").forEach((button) => button.addEventListener("click", () => updateComplaintStatus(button.dataset.statusResolved, "Resolved")));
  document.getElementById("eventForm")?.addEventListener("submit", submitEventForm);
  document.querySelectorAll("[data-event-modal-close]").forEach((node) => node.addEventListener("click", closeEventModal));
  document.querySelectorAll("[data-admin-complaint-close]").forEach((node) => node.addEventListener("click", closeAdminComplaintModal));
  document.querySelectorAll("[data-checkin-close]").forEach((node) => node.addEventListener("click", closeCheckIn));
}

function toggleAdminMobileNav() {
  const menu = document.getElementById("adminMobileNav");
  const button = document.getElementById("adminMenuBtn");
  if (!menu || !button) return;
  const open = menu.hidden;
  menu.hidden = !open;
  menu.classList.toggle("is-open", open);
  button.setAttribute("aria-expanded", String(open));
}

function openEventModal(eventId = null) {
  const modal = document.getElementById("eventModal");
  if (!modal) return;
  state.eventModalMode = eventId ? "edit" : "create";
  state.editingEventId = eventId;
  const event = eventId ? getEvents().find((item) => item.id === eventId) : null;
  document.getElementById("eventModalTitle").textContent = eventId ? "Edit Event" : "Create Event";
  document.getElementById("eventId").value = event?.id || "";
  document.getElementById("eventTitle").value = event?.title || "";
  document.getElementById("eventCategory").value = event?.category || "";
  document.getElementById("eventDate").value = event?.eventDate || "";
  document.getElementById("eventTime").value = event?.eventTime || "";
  document.getElementById("eventLocation").value = event?.location || "";
  document.getElementById("eventDescription").value = event?.description || "";
  document.getElementById("eventSeats").value = event?.totalSeats || "";
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeEventModal() {
  const modal = document.getElementById("eventModal");
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
}

function submitEventForm(event) {
  event.preventDefault();
  const eventId = document.getElementById("eventId").value;
  const newEvent = {
    id: eventId || createId("event"),
    title: document.getElementById("eventTitle").value.trim(),
    category: document.getElementById("eventCategory").value,
    eventDate: document.getElementById("eventDate").value,
    eventTime: document.getElementById("eventTime").value.trim(),
    location: document.getElementById("eventLocation").value.trim(),
    description: document.getElementById("eventDescription").value.trim(),
    totalSeats: Number(document.getElementById("eventSeats").value),
  };
  if (!newEvent.title || !newEvent.category || !newEvent.eventDate || !newEvent.eventTime || !newEvent.location || !newEvent.description || !newEvent.totalSeats) return;
  const events = getEvents();
  if (eventId) {
    const index = events.findIndex((item) => item.id === eventId);
    if (index >= 0) events[index] = newEvent;
  } else {
    events.unshift(newEvent);
  }
  saveEvents(events);
  closeEventModal();
  loadEvents();
  renderAdminDashboard();
  renderEvents();
  showToast(eventId ? "Event updated." : "Event created.", "success");
}

function deleteEvent(eventId) {
  if (!window.confirm("Are you sure you want to delete this event?")) return;
  saveEvents(getEvents().filter((item) => item.id !== eventId));
  saveRegistrations(getRegistrations().filter((item) => item.eventId !== eventId));
  loadEvents();
  loadUserRegistrations();
  renderAdminDashboard();
  renderEvents();
  showToast("Event deleted.", "success");
}

function openAdminComplaintModal(complaintId) {
  const complaint = getComplaints().find((item) => item.id === complaintId);
  if (!complaint) return;
  state.activeComplaintId = complaintId;
  const student = getUsers().map(normalizeUser).find((item) => item.id === complaint.userId);
  document.getElementById("adminComplaintModalContent").innerHTML = `
    <div class="modal__row"><strong>ID:</strong> ${escapeHtml(complaint.id)}</div>
    <div class="modal__row"><strong>Student Name:</strong> ${escapeHtml(student?.fullName || "Unknown")}</div>
    <div class="modal__row"><strong>Student Email:</strong> ${escapeHtml(student?.email || "Unknown")}</div>
    <div class="modal__row"><strong>Title:</strong> ${escapeHtml(complaint.title)}</div>
    <div class="modal__row"><strong>Category:</strong> ${escapeHtml(complaint.category)}</div>
    <div class="modal__row"><strong>Description:</strong> ${escapeHtml(complaint.description)}</div>
    <div class="modal__row"><strong>Priority:</strong> ${escapeHtml(complaint.priority)}</div>
    <div class="modal__row"><strong>Location:</strong> ${escapeHtml(complaint.location)}</div>
    <div class="modal__row"><strong>Date:</strong> ${formatDateTime(complaint.createdAt)}</div>
    <div class="modal__row"><strong>Current Status:</strong> ${escapeHtml(complaint.status)}</div>
    <div class="modal-actions">
      <button class="btn btn--secondary" type="button" data-admin-status="In Progress">Mark In Progress</button>
      <button class="btn btn--primary" type="button" data-admin-status="Resolved">Mark Resolved</button>
    </div>`;
  document.querySelectorAll("[data-admin-status]").forEach((button) => button.addEventListener("click", () => updateComplaintStatus(complaintId, button.dataset.adminStatus)));
  document.getElementById("adminComplaintModal").classList.add("is-open");
  document.getElementById("adminComplaintModal").setAttribute("aria-hidden", "false");
}

function closeAdminComplaintModal() {
  const modal = document.getElementById("adminComplaintModal");
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
}

function getEventAttendance(eventId) {
  const registrations = migrateRegistrations().filter((item) => item.eventId === eventId);
  const checkedIn = registrations.filter((item) => item.checkedIn).length;
  return { registered: registrations.length, checkedIn, remaining: registrations.length - checkedIn, percentage: registrations.length ? Math.round((checkedIn / registrations.length) * 100) : 0 };
}

function openCheckIn(eventId) {
  const event = getEvents().find((item) => item.id === eventId);
  const modal = document.getElementById("checkInModal");
  if (!event || !modal) return;
  state.activeCheckInEventId = eventId;
  state.attendeeSearchTerm = "";
  state.attendeeFilter = "all";
  renderCheckIn(event);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function renderCheckIn(event) {
  const modal = document.getElementById("checkInModal");
  if (!modal) return;
  const attendance = getEventAttendance(event.id);
  const users = getUsers().map(normalizeUser);
  const query = state.attendeeSearchTerm.toLowerCase();
  const attendees = migrateRegistrations().filter((item) => item.eventId === event.id).filter((item) => {
    const student = users.find((user) => user.id === item.userId);
    const blob = `${student?.fullName || ""} ${student?.email || ""} ${item.ticketCode}`.toLowerCase();
    return (state.attendeeFilter === "all" || (state.attendeeFilter === "checked" ? item.checkedIn : !item.checkedIn)) && (!query || blob.includes(query));
  });
  modal.querySelector("[data-checkin-content]").innerHTML = `<div class="checkin-header"><p class="eyebrow">Event Check-In</p><h2>${escapeHtml(event.title)}</h2><div class="checkin-stats"><span>Registered: <strong>${attendance.registered}</strong></span><span>Checked In: <strong>${attendance.checkedIn}</strong></span><span>Remaining: <strong>${attendance.remaining}</strong></span><span>Attendance: <strong>${attendance.percentage}%</strong></span></div></div><div class="scanner-panel"><div class="scanner-preview"><video id="scannerVideo" playsinline muted></video><div class="scanner-placeholder" id="scannerPlaceholder">Point the camera at the student's QR code.</div></div><div class="scanner-actions"><button class="btn btn--primary" type="button" id="startScannerBtn">Start Camera Scanner</button><button class="btn btn--secondary" type="button" id="stopScannerBtn">Stop Scanner</button></div><form class="ticket-code-form" id="ticketCodeForm"><label for="ticketCodeInput">Enter Ticket Code</label><div><input id="ticketCodeInput" type="text" placeholder="CC-HACK-XXXXXX" autocomplete="off" required /><button class="btn btn--ghost" type="submit">Verify Code</button></div></form><p class="scanner-help">Camera scanning is optional. Manual ticket-code verification works without a camera.</p><div id="checkInResult" class="checkin-result" aria-live="polite"></div></div><section class="attendee-section"><div class="section-heading"><div><p class="eyebrow">Attendance List</p><h3>Attendees</h3></div><label class="search-box" for="attendeeSearch"><span class="search-box__icon" aria-hidden="true">Search</span><input id="attendeeSearch" type="search" placeholder="Search attendees..." value="${escapeHtml(state.attendeeSearchTerm)}" /></label></div><div class="filter-pills attendee-filters"><button class="filter-pill ${state.attendeeFilter === "all" ? "is-active" : ""}" type="button" data-attendee-filter="all">All</button><button class="filter-pill ${state.attendeeFilter === "checked" ? "is-active" : ""}" type="button" data-attendee-filter="checked">Checked In</button><button class="filter-pill ${state.attendeeFilter === "unchecked" ? "is-active" : ""}" type="button" data-attendee-filter="unchecked">Not Checked In</button></div><div class="admin-table-wrap"><table class="admin-table attendee-table"><thead><tr><th>Student Name</th><th>Email</th><th>Ticket ID</th><th>Registration Time</th><th>Check-In Time</th><th>Status</th></tr></thead><tbody>${attendees.map((registration) => { const student = users.find((user) => user.id === registration.userId); return `<tr><td>${escapeHtml(student?.fullName || "Unknown")}</td><td>${escapeHtml(student?.email || "Unknown")}</td><td>${escapeHtml(registration.ticketCode)}</td><td>${formatDateTime(registration.registeredAt)}</td><td>${registration.checkedInAt ? formatDateTime(registration.checkedInAt) : "-"}</td><td><span class="status-badge ${registration.checkedIn ? "status-badge--checked" : "status-badge--pending"}">${registration.checkedIn ? "Checked In" : "Not Checked In"}</span></td></tr>`; }).join("") || `<tr><td colspan="6">No attendees found.</td></tr>`}</tbody></table></div></section>`;
  bindCheckInUi(event);
}

function bindCheckInUi(event) {
  document.getElementById("startScannerBtn")?.addEventListener("click", () => startQRScanner(event.id));
  document.getElementById("stopScannerBtn")?.addEventListener("click", stopQRScanner);
  document.getElementById("ticketCodeForm")?.addEventListener("submit", (formEvent) => { formEvent.preventDefault(); verifyTicket({ ticketCode: document.getElementById("ticketCodeInput").value.trim(), eventId: event.id }); });
  document.getElementById("attendeeSearch")?.addEventListener("input", (inputEvent) => { state.attendeeSearchTerm = inputEvent.target.value; renderCheckIn(event); });
  document.querySelectorAll("[data-attendee-filter]").forEach((button) => button.addEventListener("click", () => { state.attendeeFilter = button.dataset.attendeeFilter; renderCheckIn(event); }));
}

function closeCheckIn() {
  stopQRScanner();
  const modal = document.getElementById("checkInModal");
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
  state.activeCheckInEventId = null;
}

async function startQRScanner(eventId) {
  const video = document.getElementById("scannerVideo");
  const placeholder = document.getElementById("scannerPlaceholder");
  if (!video || !navigator.mediaDevices?.getUserMedia || !window.BarcodeDetector) { if (placeholder) placeholder.textContent = "Camera scanning is unavailable. Use Enter Ticket Code below."; return; }
  try {
    state.scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    video.srcObject = state.scannerStream;
    await video.play();
    if (placeholder) placeholder.hidden = true;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const scan = async () => { if (!state.scannerStream) return; try { const codes = await detector.detect(video); if (codes[0]?.rawValue) { verifyTicket(codes[0].rawValue); stopQRScanner(); return; } } catch (error) { console.warn("QR scan failed:", error); } state.scannerTimer = requestAnimationFrame(scan); };
    state.scannerTimer = requestAnimationFrame(scan);
  } catch (error) { stopQRScanner(); if (placeholder) { placeholder.hidden = false; placeholder.textContent = "Camera scanning is unavailable. Use Enter Ticket Code below."; } }
}

function stopQRScanner() {
  if (state.scannerTimer) cancelAnimationFrame(state.scannerTimer);
  state.scannerTimer = null;
  state.scannerStream?.getTracks().forEach((track) => track.stop());
  state.scannerStream = null;
  const video = document.getElementById("scannerVideo");
  if (video) video.srcObject = null;
}

function verifyTicket(rawPayload) {
  // QR attendance verification is client-side and intended for portfolio demonstration only. Production attendance systems require server-side validation.
  let payload;
  try { payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload; } catch (error) { payload = { ticketCode: String(rawPayload || "") }; }
  const result = document.getElementById("checkInResult");
  const registration = migrateRegistrations().find((item) => item.ticketCode.toLowerCase() === String(payload.ticketCode || "").toLowerCase());
  const event = getEvents().find((item) => item.id === state.activeCheckInEventId);
  const student = registration && getUsers().map(normalizeUser).find((user) => user.id === registration.userId);
  if (!result || !event) return;
  if (!registration || !student) { result.className = "checkin-result is-error"; result.textContent = "Invalid Ticket: Registration could not be verified."; return; }
  if (registration.eventId !== event.id || (payload.eventId && payload.eventId !== event.id)) { result.className = "checkin-result is-error"; result.textContent = "Invalid Event Ticket: This ticket belongs to another event."; return; }
  if (registration.checkedIn) { result.className = "checkin-result is-warning"; result.innerHTML = `<strong>Already Checked In</strong><br />${escapeHtml(student.fullName)}<br />Checked in at: ${formatDateTime(registration.checkedInAt)}`; return; }
  const checkedInAt = new Date().toISOString();
  saveRegistrations(migrateRegistrations().map((item) => item.id === registration.id ? { ...item, checkedIn: true, checkedInAt } : item));
  renderCheckIn(event);
  const refreshedResult = document.getElementById("checkInResult");
  if (refreshedResult) {
    refreshedResult.className = "checkin-result is-success";
    refreshedResult.innerHTML = `<strong>Check-In Successful</strong><br />Student: ${escapeHtml(student.fullName)}<br />Event: ${escapeHtml(event.title)}<br />Time: ${formatDateTime(checkedInAt)}<br />Status: Checked In`;
  }
}

function updateComplaintStatus(complaintId, status) {
  const complaints = getComplaints().map((item) => item.id === complaintId ? { ...item, status } : item);
  saveComplaints(complaints);
  loadComplaints();
  updateDashboardStats();
  renderAdminDashboard();
  if (state.activeComplaintId === complaintId) openAdminComplaintModal(complaintId);
  showToast(`Complaint marked ${status.toLowerCase()}.`, "success");
}

window.CampusConnect = {
  getCurrentUser,
  registerUser,
  loginUser,
  logout,
  protectDashboard,
  registerEvent,
  unregisterEvent,
  submitComplaint,
  deleteComplaint,
  updateDashboardStats,
  renderAdminDashboard,
  generateTicketCode,
  migrateRegistrations,
  showEventTicket,
  generateQRCode,
  openCheckIn,
  closeCheckIn,
  startQRScanner,
  stopQRScanner,
  verifyTicket,
  getEventAttendance,
};
