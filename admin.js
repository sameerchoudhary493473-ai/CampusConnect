(function () {
  document.addEventListener("DOMContentLoaded", () => {
    if (!document.body.classList.contains("admin-page")) return;

    const { renderAdminDashboard, logout } = window.CampusConnect || {};

    window.addEventListener("storage", () => {
      renderAdminDashboard?.();
    });

    window.addEventListener("hashchange", () => {
      document.getElementById("adminMobileNav")?.setAttribute("hidden", "true");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        document.getElementById("adminMobileNav")?.setAttribute("hidden", "true");
      }
    });

    if (!renderAdminDashboard) {
      logout?.();
    }
  });
})();
