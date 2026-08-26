document.addEventListener("DOMContentLoaded", () => {
  const EVENT_STORAGE_KEY = "campusconnect_registered_events";
  const COMPLAINT_STORAGE_KEY = "campusconnect_complaints";

  const events = [
    {
      id: "hackathon-2026",
      title: "Hackathon 2026",
      category: "Technical",
      filterCategory: "technical",
      date: "September 12, 2026",
      time: "9:00 AM - 9:00 PM",
      location: "Innovation Lab",
      description: "Build creative solutions in teams and present them to a panel of faculty mentors and industry judges.",
      seats: 24,
    },
    {
      id: "annual-sports-meet",
      title: "Annual Sports Meet",
      category: "Sports",
      filterCategory: "sports",
      date: "September 15, 2026",
      time: "7:00 AM - 5:00 PM",
      location: "University Sports Complex",
      description: "Compete in athletics, relay races, football, basketball, and indoor games across campus teams.",
      seats: 18,
    },
    {
      id: "tech-fest",
      title: "Tech Fest",
      category: "Technical",
      filterCategory: "technical",
      date: "September 18, 2026",
      time: "10:00 AM - 4:00 PM",
      location: "Main Auditorium",
      description: "Showcase projects, attend demos, and join talks on robotics, AI, and new-age digital products.",
      seats: 30,
    },
    {
      id: "coding-workshop",
      title: "Coding Workshop",
      category: "Workshop",
      filterCategory: "workshop",
      date: "September 20, 2026",
      time: "2:00 PM - 5:00 PM",
      location: "Computer Lab 2",
      description: "Learn practical JavaScript techniques, debugging habits, and problem solving in a hands-on session.",
      seats: 12,
    },
    {
      id: "cultural-night",
      title: "Cultural Night",
      category: "Cultural",
      filterCategory: "cultural",
      date: "September 24, 2026",
      time: "6:30 PM - 10:00 PM",
      location: "Open Air Theatre",
      description: "Enjoy student performances, music, dance, poetry, and a vibrant evening celebrating campus life.",
      seats: 0,
    },
    {
      id: "resume-workshop",
      title: "Resume Building Workshop",
      category: "Workshop",
      filterCategory: "workshop",
      date: "September 27, 2026",
      time: "11:00 AM - 1:00 PM",
      location: "Seminar Hall B",
      description: "Polish your resume, improve formatting, and learn how to present your skills for internships and placements.",
      seats: 16,
    },
  ];

  const complaintSampleSeed = [
    {
      id: "CC-0001",
      title: "Wi-Fi connectivity issue",
      category: "Technical",
      description: "Campus Wi-Fi keeps disconnecting in the lab during evening classes.",
      priority: "High",
      location: "Computer Lab 2",
      status: "In Progress",
      submittedAt: "August 18, 2026",
    },
    {
      id: "CC-0002",
      title: "Library seating issue",
      category: "Library",
      description: "There are not enough seats available during peak study hours.",
      priority: "Medium",
      location: "Central Library",
      status: "Pending",
      submittedAt: "August 20, 2026",
    },
  ];

  const state = {
    searchTerm: "",
    activeFilter: "all",
    registeredIds: loadRegistrations(),
    complaintSearchTerm: "",
    complaintFilter: "all",
    complaints: loadComplaints(),
    activeComplaintId: null,
  };

  const refs = {
    dateElement: document.getElementById("currentDate"),
    sidebar: document.getElementById("sidebar"),
    menuToggle: document.getElementById("menuToggle"),
    eventGrid: document.getElementById("eventGrid"),
    registeredEventsList: document.getElementById("registeredEventsList"),
    feedbackBar: document.getElementById("feedbackBar"),
    eventSearch: document.getElementById("eventSearch"),
    upcomingEventsCount: document.getElementById("upcomingEventsCount"),
    registeredEventsCount: document.getElementById("registeredEventsCount"),
    complaintsCount: document.getElementById("pendingComplaintsCount"),
    totalComplaintsCount: document.getElementById("totalComplaintsCount"),
    filterButtons: Array.from(document.querySelectorAll(".filter-pill[data-filter]")),
    complaintSearch: document.getElementById("complaintSearch"),
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
    complaintsList: document.getElementById("complaintsList"),
    complaintModal: document.getElementById("complaintModal"),
    complaintModalContent: document.getElementById("complaintModalContent"),
    complaintStatusFilters: Array.from(document.querySelectorAll("[data-complaint-filter]")),
  };

  if (refs.dateElement) {
    refs.dateElement.textContent = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());
  }

  if (refs.menuToggle && refs.sidebar) {
    refs.menuToggle.addEventListener("click", () => {
      const isOpen = refs.sidebar.classList.toggle("is-open");
      refs.menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  document.querySelectorAll(".sidebar-nav__link").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 900 && refs.sidebar) {
        refs.sidebar.classList.remove("is-open");
        refs.menuToggle?.setAttribute("aria-expanded", "false");
      }
    });
  });

  if (refs.eventSearch) {
    refs.eventSearch.addEventListener("input", (event) => {
      state.searchTerm = event.target.value.trim().toLowerCase();
      renderEvents();
    });
  }

  refs.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter || "all";
      refs.filterButtons.forEach((pill) => pill.classList.toggle("is-active", pill === button));
      renderEvents();
    });
  });

  if (refs.complaintSearch) {
    refs.complaintSearch.addEventListener("input", (event) => {
      state.complaintSearchTerm = event.target.value.trim().toLowerCase();
      renderComplaints();
    });
  }

  refs.complaintStatusFilters.forEach((button) => {
    button.addEventListener("click", () => {
      state.complaintFilter = button.dataset.complaintFilter || "all";
      refs.complaintStatusFilters.forEach((pill) => pill.classList.toggle("is-active", pill === button));
      renderComplaints();
    });
  });

  refs.complaintForm?.addEventListener("submit", submitComplaint);

  refs.complaintModal?.addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-close]")) {
      closeComplaintModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && refs.complaintModal?.classList.contains("is-open")) {
      closeComplaintModal();
    }
  });

  window.registerEvent = registerEvent;
  window.unregisterEvent = unregisterEvent;
  window.filterEvents = filterEvents;
  window.searchEvents = searchEvents;
  window.renderEvents = renderEvents;
  window.updateDashboardStats = updateDashboardStats;
  window.loadComplaints = loadComplaints;
  window.saveComplaints = saveComplaints;
  window.submitComplaint = submitComplaint;
  window.renderComplaints = renderComplaints;
  window.filterComplaints = filterComplaints;
  window.searchComplaints = searchComplaints;
  window.viewComplaint = viewComplaint;
  window.deleteComplaint = deleteComplaint;
  window.updateComplaintStats = updateComplaintStats;

  seedComplaintsIfNeeded();
  renderEvents();
  renderComplaints();

  function loadRegistrations() {
    try {
      const parsed = JSON.parse(localStorage.getItem(EVENT_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRegistrations() {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(state.registeredIds));
  }

  function loadComplaints() {
    try {
      const parsed = JSON.parse(localStorage.getItem(COMPLAINT_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveComplaints() {
    localStorage.setItem(COMPLAINT_STORAGE_KEY, JSON.stringify(state.complaints));
  }

  function seedComplaintsIfNeeded() {
    if (state.complaints.length === 0) {
      state.complaints = complaintSampleSeed.slice();
      saveComplaints();
    }
  }

  function getEventById(eventId) {
    return events.find((item) => item.id === eventId);
  }

  function getVisibleEvents() {
    return events.filter((event) => filterEvents(event) && searchEvents(event));
  }

  function filterEvents(event) {
    if (state.activeFilter === "all") {
      return true;
    }
    return event.filterCategory === state.activeFilter;
  }

  function searchEvents(event) {
    if (!state.searchTerm) {
      return true;
    }
    return (
      event.title.toLowerCase().includes(state.searchTerm) ||
      event.category.toLowerCase().includes(state.searchTerm)
    );
  }

  function renderEvents() {
    if (!refs.eventGrid || !refs.registeredEventsList) {
      return;
    }

    const visibleEvents = getVisibleEvents();

    refs.eventGrid.innerHTML = visibleEvents.length
      ? visibleEvents
          .map((event) => {
            const isRegistered = state.registeredIds.includes(event.id);
            const seatsLeft = getSeatsLeft(event);
            const isFull = seatsLeft <= 0;
            const statusText = isFull ? "Fully Booked" : `${seatsLeft} seats left`;
            const statusClass = isFull ? "event-card__status--booked" : "event-card__status--open";
            const buttonLabel = isFull ? "Fully Booked" : isRegistered ? "Registered" : "Register";

            return `
              <article class="event-card">
                <div class="event-card__badge ${badgeClassForCategory(event.filterCategory)}">${event.category}</div>
                <h3>${event.title}</h3>
                <p class="event-card__detail"><strong>Date:</strong> ${event.date}</p>
                <p class="event-card__detail"><strong>Time:</strong> ${event.time}</p>
                <p class="event-card__detail"><strong>Location:</strong> ${event.location}</p>
                <p class="event-card__description">${event.description}</p>
                <div class="event-card__footer">
                  <span class="event-card__status ${statusClass}">${statusText}</span>
                  <button
                    class="btn ${isRegistered ? "btn--secondary" : "btn--primary"}"
                    type="button"
                    data-event-id="${event.id}"
                    ${isRegistered || isFull ? "disabled" : ""}
                  >${buttonLabel}</button>
                </div>
              </article>
            `;
          })
          .join("")
      : `<article class="announcement-item"><p class="announcement-item__title">No matching events found</p><p class="announcement-item__text">Try a different search term or filter.</p></article>`;

    const registeredEvents = events.filter((event) => state.registeredIds.includes(event.id));
    refs.registeredEventsList.innerHTML = registeredEvents.length
      ? registeredEvents
          .map(
            (event) => `
              <article class="registered-item">
                <div class="registered-item__top">
                  <div>
                    <span class="event-card__badge ${badgeClassForCategory(event.filterCategory)}">${event.category}</span>
                    <h3 class="registered-item__title">${event.title}</h3>
                    <p class="registered-item__meta">${event.date} | ${event.time}</p>
                    <p class="registered-item__meta">${event.location}</p>
                  </div>
                  <span class="event-card__status event-card__status--open">Registered</span>
                </div>
                <div class="registered-item__actions">
                  <button class="btn btn--ghost" type="button" data-unregister-id="${event.id}">Unregister</button>
                </div>
              </article>
            `
          )
          .join("")
      : `<article class="announcement-item"><p class="announcement-item__title">No registrations yet</p><p class="announcement-item__text">Register for an event to see it listed here.</p></article>`;

    refs.eventGrid.querySelectorAll("[data-event-id]").forEach((button) => {
      button.addEventListener("click", () => registerEvent(button.dataset.eventId));
    });

    refs.registeredEventsList.querySelectorAll("[data-unregister-id]").forEach((button) => {
      button.addEventListener("click", () => unregisterEvent(button.dataset.unregisterId));
    });

    updateDashboardStats();
  }

  function registerEvent(eventId) {
    const event = getEventById(eventId);
    if (!event) return;

    if (state.registeredIds.includes(eventId)) {
      showFeedback("You are already registered for this event.", "warning");
      renderEvents();
      return;
    }

    if (getSeatsLeft(event) <= 0) {
      showFeedback("This event is fully booked.", "danger");
      renderEvents();
      return;
    }

    state.registeredIds.push(eventId);
    saveRegistrations();
    showFeedback(`Registered for ${event.title} successfully.`, "success");
    renderEvents();
  }

  function unregisterEvent(eventId) {
    const event = getEventById(eventId);
    if (!event) return;

    const index = state.registeredIds.indexOf(eventId);
    if (index === -1) {
      showFeedback("This event is not currently registered.", "warning");
      return;
    }

    state.registeredIds.splice(index, 1);
    saveRegistrations();
    showFeedback(`Unregistered from ${event.title}.`, "success");
    renderEvents();
  }

  function updateDashboardStats() {
    if (refs.upcomingEventsCount) {
      refs.upcomingEventsCount.textContent = String(events.length).padStart(2, "0");
    }
    if (refs.registeredEventsCount) {
      refs.registeredEventsCount.textContent = String(state.registeredIds.length).padStart(2, "0");
    }
  }

  function getSeatsLeft(event) {
    const takenSeats = state.registeredIds.filter((id) => id === event.id).length;
    return Math.max(0, event.seats - takenSeats);
  }

  function badgeClassForCategory(category) {
    switch (category) {
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

  function submitComplaint(event) {
    event.preventDefault();
    clearComplaintErrors();

    const title = refs.complaintTitle?.value.trim() || "";
    const category = refs.complaintCategory?.value || "";
    const description = refs.complaintDescription?.value.trim() || "";
    const priority = refs.complaintPriority?.value || "Medium";
    const location = refs.complaintLocation?.value.trim() || "";
    let isValid = true;

    if (!title) {
      setFieldError(refs.titleError, "Title is required.");
      isValid = false;
    }
    if (!category) {
      setFieldError(refs.categoryError, "Please select a category.");
      isValid = false;
    }
    if (!description) {
      setFieldError(refs.descriptionError, "Description is required.");
      isValid = false;
    }
    if (!location) {
      setFieldError(refs.locationError, "Location is required.");
      isValid = false;
    }

    if (!isValid) {
      showFeedback("Please complete the required complaint fields.", "warning");
      return;
    }

    const complaint = {
      id: generateComplaintId(),
      title,
      category,
      description,
      priority,
      location,
      status: "Pending",
      submittedAt: new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    };

    state.complaints.unshift(complaint);
    saveComplaints();
    refs.complaintForm?.reset();
    if (refs.complaintPriority) {
      refs.complaintPriority.value = "Medium";
    }
    showFeedback("Complaint submitted successfully.", "success");
    renderComplaints();
  }

  function renderComplaints() {
    if (!refs.complaintsList) return;

    const visibleComplaints = state.complaints.filter((complaint) => filterComplaints(complaint) && searchComplaints(complaint));

    refs.complaintsList.innerHTML = visibleComplaints.length
      ? visibleComplaints.map((complaint) => complaintCardMarkup(complaint)).join("")
      : `<div class="empty-state">No complaints found.</div>`;

    refs.complaintsList.querySelectorAll("[data-view-id]").forEach((button) => {
      button.addEventListener("click", () => viewComplaint(button.dataset.viewId));
    });
    refs.complaintsList.querySelectorAll("[data-delete-id]").forEach((button) => {
      button.addEventListener("click", () => deleteComplaint(button.dataset.deleteId));
    });

    updateComplaintStats();
  }

  function filterComplaints(complaint) {
    if (state.complaintFilter === "all") return true;
    return complaint.status === state.complaintFilter;
  }

  function searchComplaints(complaint) {
    if (!state.complaintSearchTerm) return true;
    const term = state.complaintSearchTerm;
    return (
      complaint.title.toLowerCase().includes(term) ||
      complaint.id.toLowerCase().includes(term) ||
      complaint.category.toLowerCase().includes(term)
    );
  }

  function viewComplaint(complaintId) {
    const complaint = state.complaints.find((item) => item.id === complaintId);
    if (!complaint || !refs.complaintModal || !refs.complaintModalContent) return;

    state.activeComplaintId = complaintId;
    refs.complaintModalContent.innerHTML = `
      <div class="modal__row"><strong>ID:</strong> ${complaint.id}</div>
      <div class="modal__row"><strong>Title:</strong> ${complaint.title}</div>
      <div class="modal__row"><strong>Category:</strong> ${complaint.category}</div>
      <div class="modal__row"><strong>Description:</strong> ${complaint.description}</div>
      <div class="modal__row"><strong>Location:</strong> ${complaint.location}</div>
      <div class="modal__row"><strong>Priority:</strong> ${complaint.priority}</div>
      <div class="modal__row"><strong>Date Submitted:</strong> ${complaint.submittedAt}</div>
      <div class="modal__row"><strong>Status:</strong> ${complaint.status}</div>
    `;
    refs.complaintModal.classList.add("is-open");
    refs.complaintModal.setAttribute("aria-hidden", "false");
  }

  function closeComplaintModal() {
    if (!refs.complaintModal) return;
    refs.complaintModal.classList.remove("is-open");
    refs.complaintModal.setAttribute("aria-hidden", "true");
    state.activeComplaintId = null;
  }

  function deleteComplaint(complaintId) {
    const complaint = state.complaints.find((item) => item.id === complaintId);
    if (!complaint) return;

    const confirmed = window.confirm(`Delete complaint ${complaint.id}?`);
    if (!confirmed) return;

    state.complaints = state.complaints.filter((item) => item.id !== complaintId);
    saveComplaints();
    if (state.activeComplaintId === complaintId) {
      closeComplaintModal();
    }
    showFeedback("Complaint deleted successfully.", "success");
    renderComplaints();
  }

  function updateComplaintStats() {
    if (refs.totalComplaintsCount) {
      refs.totalComplaintsCount.textContent = String(state.complaints.length).padStart(2, "0");
    }
    if (refs.complaintsCount) {
      const pendingCount = state.complaints.filter((complaint) => complaint.status === "Pending").length;
      refs.complaintsCount.textContent = String(pendingCount).padStart(2, "0");
    }
  }

  function complaintCardMarkup(complaint) {
    return `
      <article class="complaint-card">
        <div class="complaint-card__top">
          <div>
            <span class="event-card__badge ${badgeClassForComplaintCategory(complaint.category)}">${complaint.category}</span>
            <h3 class="complaint-card__title">${complaint.title}</h3>
            <p class="complaint-card__meta"><strong>ID:</strong> ${complaint.id}</p>
            <p class="complaint-card__meta"><strong>Location:</strong> ${complaint.location}</p>
          </div>
          <span class="status-badge ${badgeClassForStatus(complaint.status)}">${complaint.status}</span>
        </div>
        <p class="complaint-card__meta"><strong>Description:</strong> ${complaint.description}</p>
        <p class="complaint-card__meta"><strong>Priority:</strong> ${complaint.priority}</p>
        <p class="complaint-card__meta"><strong>Date Submitted:</strong> ${complaint.submittedAt}</p>
        <div class="complaint-card__actions">
          <button class="btn btn--secondary" type="button" data-view-id="${complaint.id}">View Details</button>
          <button class="btn btn--ghost" type="button" data-delete-id="${complaint.id}">Delete Complaint</button>
        </div>
      </article>
    `;
  }

  function badgeClassForComplaintCategory(category) {
    switch (category) {
      case "Technical":
        return "event-card__badge--blue";
      case "Library":
        return "event-card__badge--amber";
      case "Hostel":
        return "event-card__badge--green";
      case "Transport":
        return "event-card__badge--teal";
      case "Cafeteria":
        return "event-card__badge--pink";
      case "Academic":
        return "event-card__badge--red";
      default:
        return "";
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

  function setFieldError(element, message) {
    if (element) element.textContent = message;
  }

  function clearComplaintErrors() {
    [refs.titleError, refs.categoryError, refs.descriptionError, refs.locationError].forEach((item) => {
      if (item) item.textContent = "";
    });
  }

  function generateComplaintId() {
    const suffix = String(Date.now()).slice(-6);
    return `CC-${suffix}`;
  }

  function showFeedback(message, type) {
    if (!refs.feedbackBar) return;

    const note = document.createElement("div");
    note.className = `feedback-message feedback-message--${type}`;
    note.textContent = message;
    refs.feedbackBar.appendChild(note);

    window.setTimeout(() => {
      note.remove();
    }, 2600);
  }
});
