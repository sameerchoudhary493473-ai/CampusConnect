/* global supabase */
(function () {
  const SUPABASE_URL = "YOUR_SUPABASE_URL";
  const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  function getDisplayName(fullName) {
    if (!fullName) return "Student";
    const trimmed = fullName.trim();
    return trimmed ? trimmed : "Student";
  }

  function getInitials(fullName) {
    const parts = getDisplayName(fullName).split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "S";
  }

  async function initAuth() {
    const authForm = document.getElementById("authForm");
    const signInBtn = document.getElementById("signInBtn");
    const createAccountBtn = document.getElementById("createAccountBtn");
    const switchModeBtn = document.getElementById("switchModeBtn");
    const togglePasswordBtn = document.getElementById("togglePassword");
    const authMessage = document.getElementById("authMessage");
    const fullNameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    if (!authForm) return;

    let mode = "signin";

    const setMessage = (message, type = "") => {
      if (!authMessage) return;
      authMessage.className = `auth-message ${type ? `is-${type}` : ""}`.trim();
      authMessage.textContent = message;
    };

    const setLoading = (loading) => {
      [signInBtn, createAccountBtn].forEach((btn) => {
        if (btn) btn.disabled = loading;
      });
      if (signInBtn) signInBtn.textContent = loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account";
      if (createAccountBtn) createAccountBtn.textContent = loading ? "Please wait..." : mode === "signin" ? "Create Account" : "Sign In";
    };

    const syncMode = () => {
      if (!fullNameInput) return;
      fullNameInput.parentElement.style.display = mode === "signup" ? "grid" : "none";
      if (switchModeBtn) {
        switchModeBtn.textContent = mode === "signin" ? "Create account" : "Sign in";
      }
      if (createAccountBtn) {
        createAccountBtn.textContent = mode === "signin" ? "Create Account" : "Sign In";
      }
      if (signInBtn) {
        signInBtn.textContent = mode === "signin" ? "Sign In" : "Create Account";
      }
    };

    syncMode();

    togglePasswordBtn?.addEventListener("click", () => {
      if (!passwordInput) return;
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      togglePasswordBtn.textContent = isHidden ? "Hide" : "Show";
    });

    switchModeBtn?.addEventListener("click", () => {
      mode = mode === "signin" ? "signup" : "signin";
      setMessage("");
      syncMode();
    });

    createAccountBtn?.addEventListener("click", () => {
      mode = mode === "signin" ? "signup" : "signin";
      setMessage("");
      syncMode();
    });

    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("");
      setLoading(true);

      try {
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        const fullName = getDisplayName(fullNameInput?.value);

        if (!email || !password) {
          setMessage("Email and password are required.", "error");
          return;
        }

        if (mode === "signup") {
          if (!fullNameInput?.value.trim()) {
            setMessage("Full name is required for account creation.", "error");
            return;
          }

          const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          });

          if (error) {
            console.error("Signup failed:", error);
            setMessage(userFriendlyAuthError(error), "error");
            return;
          }

          if (data?.user) {
            setMessage("Account created successfully. Please sign in to continue.", "success");
            mode = "signin";
            syncMode();
            authForm.reset();
          }
          return;
        }

        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Sign-in failed:", error);
          setMessage(userFriendlyAuthError(error), "error");
          return;
        }

        if (data?.session) {
          window.location.href = "index.html";
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setMessage("Something went wrong while signing you in.", "error");
      } finally {
        setLoading(false);
      }
    });
  }

  async function checkSession() {
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.error("Session check failed:", error);
    }
    return data?.session || null;
  }

  async function logout() {
    await client.auth.signOut();
    window.location.href = "login.html";
  }

  function userFriendlyAuthError(error) {
    const message = (error?.message || "").toLowerCase();
    if (message.includes("invalid login") || message.includes("invalid credentials")) {
      return "Incorrect email or password.";
    }
    if (message.includes("already registered")) {
      return "This email is already registered.";
    }
    if (message.includes("email not confirmed")) {
      return "Please confirm your email before signing in.";
    }
    return "We could not complete that action. Please try again.";
  }

  window.CampusConnectAuth = {
    client,
    initAuth,
    checkSession,
    logout,
    getDisplayName,
    getInitials,
    userFriendlyAuthError,
  };

  const isLoginPage = window.location.pathname.endsWith("login.html") || window.location.pathname.endsWith("/");
  if (isLoginPage) {
    initAuth();
    checkSession().then((session) => {
      if (session) window.location.href = "index.html";
    });
  }
})();
