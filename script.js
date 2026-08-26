document.addEventListener("DOMContentLoaded", () => {
  const auth = window.CampusConnectAuth;
  if (!auth) {
    console.error("CampusConnect auth helper is missing.");
    return;
  }

  const state = {
    session: null,
    profile: null,
    events: [],
    registrations: [],
    complaints: [],
    eventSearchTerm: "",
    eventFilter: "all",
    complaintSearchTerm: "",
    complaintFilter: "all",
    activeComplaintId: null,
  };

  const refs = {
    pageLoading: document.getElementById("pageLoading"),
    welcomeMessage: document.getElementById("welcomeMessage"),
    profileName: document.getElementById("profileName"),
    userAvatar: document.getElementById("userAvatar"),
    currentDate: document.getElementById("currentDate"),
    logoutBtn: document.getElementById("logoutBtn"),
    navMenuBtn: document.getElementById("navMenuBtn"),
    mobileNav: document.getElementById("mobileNav"),
    eventGrid: document.getElementById("eventGrid"),
    eventSearch: document.getElementById("eventSearch"),
    eventFilterButtons: Array.from(document.querySelectorAll("[data-filter]")),
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
    complaintFilterButtons: Array.from(document.querySelectorAll("[data-complaint-filter]")),
    complaintModal: document.getElementById("complaintModal"),
    complaintModalContent: document.getElementById("complaintModalContent"),
    feedbackBar: document.getElementById("feedbackBar"),
    upcomingEventsCount: document.getElementById("upcomingEventsCount"),
    registeredEventsCount: document.getElementById("registeredEventsCount"),
    pendingComplaintsCount: document.getElementById("pendingComplaintsCount"),
    totalComplaintsCount: document.getElementById("totalComplaintsCount"),
  };

  initApp();

  async function initApp() {
    setLoading(true, "Checking session...");
    const session = await checkSession();
    if (!session) {
      window.location.href = "login.html";
      return;
    }

    state.session = session;
    setupAuthListener();
    bindUi();
    await loadAllData();
    setLoading(false);
  }

  function bindUi() {
    refs.logoutBtn?.addEventListener("click", logout);
    refs.navMenuBtn?.addEventListener("click", toggleMobileNav);
    refs.eventSearch?.addEventListener("input", (e) => {
      state.eventSearchTerm = e.target.value.trim().toLowerCase();
      renderEvents();
    });
    refs.eventFilterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.eventFilter = button.dataset.filter || "all";
        refs.eventFilterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
        renderEvents();
      });
    });
    refs.complaintSearch?.addEventListener("input", (e) => {
      state.complaintSearchTerm = e.target.value.trim().toLowerCase();
      renderComplaints();
    });
    refs.complaintFilterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.complaintFilter = button.dataset.complaintFilter || "all";
        refs.complaintFilterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
        renderComplaints();
      });
    });
    refs.complaintForm?.addEventListener("submit", submitComplaint);
    refs.complaintModal?.addEventListener("click", (event) => {
      if (event.target.matches("[data-modal-close]")) closeComplaintModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && refs.complaintModal?.classList.contains("is-open")) closeComplaintModal();
    });
  }

  function setupAuthListener() {
    auth.client.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        window.location.href = "login.html";
        return;
      }
      if (session.user?.id !== state.session?.user?.id) {
        state.session = session;
        await loadAllData();
      }
    });
  }

  async function checkSession() {
    try {
      return await auth.checkSession();
    } catch (error) {
      console.error("Session check failed:", error);
      return null;
    }
  }

  async function loadAllData() {
    try {
      setLoading(true, "Loading profile...");
      await loadProfile();
      setLoading(true, "Loading events...");
      await Promise.all([loadEvents(), loadUserRegistrations(), loadComplaints()]);
      updateDashboardStats();
      renderEvents();
      renderComplaints();
    } catch (error) {
      console.error("Dashboard load error:", error);
      showToast("We could not load your dashboard right now.", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    const user = state.session.user;
    const { data, error } = await auth.client
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile load error:", error);
      throw error;
    }

    if (data) {
      state.profile = data;
    } else {
      const profile = {
        id: user.id,
        full_name: auth.getDisplayName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Student"),
        email: user.email,
      };
      const insertResult = await auth.client.from("profiles").insert(profile).select("id, full_name, email").single();
      if (insertResult.error) {
        console.error("Profile insert error:", insertResult.error);
        throw insertResult.error;
      }
      state.profile = insertResult.data;
    }

    const name = state.profile.full_name || "Student";
    if (refs.profileName) refs.profileName.textContent = name;
    if (refs.welcomeMessage) refs.welcomeMessage.textContent = `Welcome back, ${firstName(name)}!`;
    if (refs.userAvatar) refs.userAvatar.textContent = auth.getInitials(name);
  }

  async function loadEvents() {
    const { data, error } = await auth.client
      .from("events")
      .select("id, title, category, description, event_date, event_time, location, total_seats, created_at")
      .order("event_date", { ascending: true });
    if (error) throw error;
    state.events = data || [];
  }

  async function loadUserRegistrations() {
    const { data, error } = await auth.client
      .from("event_registrations")
      .select("id, user_id, event_id, registered_at, events(id, title, category, description, event_date, event_time, location, total_seats)")
      .eq("user_id", state.session.user.id);
    if (error) throw error;
    state.registrations = data || [];
  }

  async function loadComplaints() {
    const { data, error } = await auth.client
      .from("complaints")
      .select("id, user_id, title, category, description, priority, location, status, created_at")
      .eq("user_id", state.session.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    state.complaints = data || [];
  }

  function renderEvents() {
    if (!refs.eventGrid || !refs.registeredEventsList) return;

    const visible = state.events.filter((event) => {
      const matchesFilter = state.eventFilter === "all" || event.category.toLowerCase() === state.eventFilter;
      const term = state.eventSearchTerm;
      const matchesSearch = !term || event.title.toLowerCase().includes(term) || event.category.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });

    refs.eventGrid.innerHTML = visible.length
      ? visible.map((event) => {
          const registered = state.registrations.some((item) => item.event_id === event.id);
          const seatsLeft = getSeatsLeft(event.id, event.total_seats);
          const full = seatsLeft <= 0;
          return `
            <article class="event-card">
              <div class="event-card__badge ${badgeClassForEvent(event.category)}">${event.category}</div>
              <h3>${escapeHtml(event.title)}</h3>
              <p class="event-card__detail"><strong>Date:</strong> ${formatDate(event.event_date)}</p>
              <p class="event-card__detail"><strong>Time:</strong> ${event.event_time || "TBA"}</p>
              <p class="event-card__detail"><strong>Location:</strong> ${event.location || "Campus"}</p>
              <p class="event-card__description">${escapeHtml(event.description || "")}</p>
              <div class="event-card__footer">
                <span class="event-card__status ${full ? "event-card__status--booked" : "event-card__status--open"}">${full ? "Fully Booked" : `${seatsLeft} seats left`}</span>
                <button class="btn ${registered ? "btn--secondary" : "btn--primary"}" type="button" data-register-event="${event.id}" ${registered || full ? "disabled" : ""}>
                  ${registered ? "Registered" : full ? "Fully Booked" : "Register"}
                </button>
              </div>
            </article>
          `;
        }).join("")
      : `<div class="empty-state">No events found.</div>`;

    refs.registeredEventsList.innerHTML = state.registrations.length
      ? state.registrations.map((row) => {
          const event = row.events;
          return `
            <article class="registered-item">
              <div class="registered-item__top">
                <div>
                  <span class="event-card__badge ${badgeClassForEvent(event.category)}">${event.category}</span>
                  <h3 class="registered-item__title">${escapeHtml(event.title)}</h3>
                  <p class="registered-item__meta">${formatDate(event.event_date)} | ${event.event_time || "TBA"}</p>
                  <p class="registered-item__meta">${event.location || "Campus"}</p>
                </div>
                <span class="event-card__status event-card__status--open">Registered</span>
              </div>
              <div class="registered-item__actions">
                <button class="btn btn--ghost" type="button" data-unregister-event="${row.event_id}">Unregister</button>
              </div>
            </article>
          `;
        }).join("")
      : `<div class="empty-state">No registered events yet.</div>`;

    refs.eventGrid.querySelectorAll("[data-register-event]").forEach((button) => {
      button.addEventListener("click", () => registerEvent(button.dataset.registerEvent));
    });
    refs.registeredEventsList.querySelectorAll("[data-unregister-event]").forEach((button) => {
      button.addEventListener("click", () => unregisterEvent(button.dataset.unregisterEvent));
    });
  }

  async function registerEvent(eventId) {
    try {
      setLoading(true, "Registering for event...");
      const exists = state.registrations.some((item) => item.event_id === eventId);
      if (exists) {
        showToast("You are already registered for this event.", "warning");
        return;
      }

      const event = state.events.find((item) => item.id === eventId);
      if (!event) {
        showToast("Event not found.", "danger");
        return;
      }

      const seatsLeft = getSeatsLeft(event.id, event.total_seats);
      if (seatsLeft <= 0) {
        showToast("This event is fully booked.", "danger");
        renderEvents();
        return;
      }

      const { error } = await auth.client.from("event_registrations").insert({
        user_id: state.session.user.id,
        event_id: eventId,
      });
      if (error) throw error;

      showToast("Registered successfully.", "success");
      await loadUserRegistrations();
      updateDashboardStats();
      renderEvents();
    } catch (error) {
      console.error("Event registration error:", error);
      showToast("Event registration failed. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function unregisterEvent(eventId) {
    try {
      setLoading(true, "Removing registration...");
      const { error } = await auth.client
        .from("event_registrations")
        .delete()
        .eq("user_id", state.session.user.id)
        .eq("event_id", eventId);
      if (error) throw error;
      showToast("Registration removed.", "success");
      await loadUserRegistrations();
      updateDashboardStats();
      renderEvents();
    } catch (error) {
      console.error("Unregister error:", error);
      showToast("Could not remove registration.", "danger");
    } finally {
      setLoading(false);
    }
  }

  function getSeatsLeft(eventId, totalSeats) {
    const count = state.registrations.filter((item) => item.event_id === eventId).length;
    return Math.max(0, totalSeats - count);
  }

  function updateDashboardStats() {
    if (refs.upcomingEventsCount) refs.upcomingEventsCount.textContent = String(state.events.length).padStart(2, "0");
    if (refs.registeredEventsCount) refs.registeredEventsCount.textContent = String(state.registrations.length).padStart(2, "0");
    if (refs.totalComplaintsCount) refs.totalComplaintsCount.textContent = String(state.complaints.length).padStart(2, "0");
    if (refs.pendingComplaintsCount) {
      const pending = state.complaints.filter((item) => item.status === "Pending").length;
      refs.pendingComplaintsCount.textContent = String(pending).padStart(2, "0");
    }
  }

  async function submitComplaint(event) {
    event.preventDefault();
    clearComplaintErrors();

    const title = refs.complaintTitle.value.trim();
    const category = refs.complaintCategory.value;
    const description = refs.complaintDescription.value.trim();
    const priority = refs.complaintPriority.value;
    const location = refs.complaintLocation.value.trim();
    let valid = true;

    if (!title) {
      setFieldError(refs.titleError, "Title is required.");
      valid = false;
    }
    if (!category) {
      setFieldError(refs.categoryError, "Category is required.");
      valid = false;
    }
    if (!description) {
      setFieldError(refs.descriptionError, "Description is required.");
      valid = false;
    }
    if (!location) {
      setFieldError(refs.locationError, "Location is required.");
      valid = false;
    }
    if (!valid) {
      showToast("Please complete all complaint fields.", "warning");
      return;
    }

    try {
      setLoading(true, "Submitting complaint...");
      const { error } = await auth.client.from("complaints").insert({
        user_id: state.session.user.id,
        title,
        category,
        description,
        priority,
        location,
        status: "Pending",
      });
      if (error) throw error;
      refs.complaintForm.reset();
      refs.complaintPriority.value = "Medium";
      showToast("Complaint submitted successfully.", "success");
      await loadComplaints();
      updateDashboardStats();
      renderComplaints();
    } catch (error) {
      console.error("Complaint submission error:", error);
      showToast("Complaint submission failed. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  }

  function renderComplaints() {
    if (!refs.complaintsList) return;
    const visible = state.complaints.filter((complaint) => {
      const matchesFilter = state.complaintFilter === "all" || complaint.status === state.complaintFilter;
      const term = state.complaintSearchTerm;
      const matchesSearch =
        !term ||
        complaint.title.toLowerCase().includes(term) ||
        complaint.id.toLowerCase().includes(term) ||
        complaint.category.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });

    refs.complaintsList.innerHTML = visible.length
      ? visible.map((complaint) => `
          <article class="complaint-card">
            <div class="complaint-card__top">
              <div>
                <span class="event-card__badge ${badgeClassForComplaint(complaint.category)}">${complaint.category}</span>
                <h3 class="complaint-card__title">${escapeHtml(complaint.title)}</h3>
                <p class="complaint-card__meta"><strong>ID:</strong> ${complaint.id}</p>
                <p class="complaint-card__meta"><strong>Location:</strong> ${escapeHtml(complaint.location)}</p>
              </div>
              <span class="status-badge ${badgeClassForStatus(complaint.status)}">${complaint.status}</span>
            </div>
            <p class="complaint-card__meta"><strong>Description:</strong> ${escapeHtml(complaint.description)}</p>
            <p class="complaint-card__meta"><strong>Priority:</strong> ${complaint.priority}</p>
            <p class="complaint-card__meta"><strong>Date Submitted:</strong> ${formatDateTime(complaint.created_at)}</p>
            <div class="complaint-card__actions">
              <button class="btn btn--secondary" type="button" data-view-complaint="${complaint.id}">View Details</button>
              <button class="btn btn--ghost" type="button" data-delete-complaint="${complaint.id}">Delete Complaint</button>
            </div>
          </article>
        `).join("")
      : `<div class="empty-state">No complaints found.</div>`;

    refs.complaintsList.querySelectorAll("[data-view-complaint]").forEach((button) => {
      button.addEventListener("click", () => viewComplaint(button.dataset.viewComplaint));
    });
    refs.complaintsList.querySelectorAll("[data-delete-complaint]").forEach((button) => {
      button.addEventListener("click", () => deleteComplaint(button.dataset.deleteComplaint));
    });
  }

  async function deleteComplaint(complaintId) {
    const complaint = state.complaints.find((item) => item.id === complaintId);
    if (!complaint) return;
    if (!window.confirm(`Delete complaint ${complaint.id}?`)) return;

    try {
      setLoading(true, "Deleting complaint...");
      const { error } = await auth.client
        .from("complaints")
        .delete()
        .eq("id", complaintId)
        .eq("user_id", state.session.user.id);
      if (error) throw error;
      showToast("Complaint deleted successfully.", "success");
      await loadComplaints();
      updateDashboardStats();
      renderComplaints();
      if (state.activeComplaintId === complaintId) closeComplaintModal();
    } catch (error) {
      console.error("Delete complaint error:", error);
      showToast("Could not delete complaint.", "danger");
    } finally {
      setLoading(false);
    }
  }

  function viewComplaint(complaintId) {
    const complaint = state.complaints.find((item) => item.id === complaintId);
    if (!complaint || !refs.complaintModal || !refs.complaintModalContent) return;
    state.activeComplaintId = complaintId;
    refs.complaintModalContent.innerHTML = `
      <div class="modal__row"><strong>ID:</strong> ${complaint.id}</div>
      <div class="modal__row"><strong>Title:</strong> ${escapeHtml(complaint.title)}</div>
      <div class="modal__row"><strong>Category:</strong> ${complaint.category}</div>
      <div class="modal__row"><strong>Description:</strong> ${escapeHtml(complaint.description)}</div>
      <div class="modal__row"><strong>Location:</strong> ${escapeHtml(complaint.location)}</div>
      <div class="modal__row"><strong>Priority:</strong> ${complaint.priority}</div>
      <div class="modal__row"><strong>Date Submitted:</strong> ${formatDateTime(complaint.created_at)}</div>
      <div class="modal__row"><strong>Status:</strong> ${complaint.status}</div>
    `;
    refs.complaintModal.classList.add("is-open");
    refs.complaintModal.setAttribute("aria-hidden", "false");
  }

  function closeComplaintModal() {
    refs.complaintModal?.classList.remove("is-open");
    refs.complaintModal?.setAttribute("aria-hidden", "true");
    state.activeComplaintId = null;
  }

  function updateDashboardLoading(show) {
    if (refs.pageLoading) refs.pageLoading.hidden = !show;
  }

  function setLoading(show, text) {
    updateDashboardLoading(show);
    if (refs.pageLoading && text) refs.pageLoading.textContent = text;
  }

  function toggleMobileNav() {
    const isOpen = !refs.mobileNav.hasAttribute("hidden");
    if (isOpen) {
      refs.mobileNav.setAttribute("hidden", "");
      refs.navMenuBtn?.setAttribute("aria-expanded", "false");
    } else {
      refs.mobileNav.removeAttribute("hidden");
      refs.navMenuBtn?.setAttribute("aria-expanded", "true");
    }
  }

  function setFieldError(element, message) {
    if (element) element.textContent = message;
  }

  function clearComplaintErrors() {
    [refs.titleError, refs.categoryError, refs.descriptionError, refs.locationError].forEach((el) => {
      if (el) el.textContent = "";
    });
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(value));
    } catch {
      return value || "";
    }
  }

  function formatDateTime(value) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value || "";
    }
  }

  function firstName(fullName) {
    return (fullName || "Student").trim().split(/\s+/)[0] || "Student";
  }

  function badgeClassForEvent(category) {
    switch ((category || "").toLowerCase()) {
      case "technical":
        return "event-card__badge--blue";
      case "sports":
        return "event-card__badge--green";
      case "cultural":
        return "event-card__badge--pink";
      case "workshop":
        return "event-card__badge--amber";
      default:
        return "";
    }
  }

  function badgeClassForComplaint(category) {
    switch ((category || "").toLowerCase()) {
      case "technical":
        return "event-card__badge--blue";
      case "library":
        return "event-card__badge--amber";
      case "hostel":
        return "event-card__badge--green";
      case "transport":
        return "event-card__badge--teal";
      case "cafeteria":
        return "event-card__badge--pink";
      case "academic":
        return "event-card__badge--red";
      default:
        return "event-card__badge--blue";
    }
  }

  function badgeClassForStatus(status) {
    switch (status) {
      case "In Progress":
        return "status-badge--progress";
      case "Resolved":
        return "status-badge--resolved";
      default:
        return "status-badge--pending";
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function showToast(message, type = "success") {
    if (!refs.feedbackBar) return;
    const note = document.createElement("div");
    note.className = `feedback-message feedback-message--${type}`;
    note.textContent = message;
    refs.feedbackBar.appendChild(note);
    window.setTimeout(() => note.remove(), 3000);
  }

  // Expose the required reusable function names for maintenance and debugging.
  window.loadUserRegistrations = loadUserRegistrations;
  window.logout = logout;

  async function logout() {
    try {
      await auth.logout();
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "login.html";
    }
  }
});
