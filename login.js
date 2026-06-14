const form = document.querySelector("#authForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const submitButton = document.querySelector("#submitButton");
const formError = document.querySelector("#formError");
const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const nextUrl = new URLSearchParams(window.location.search).get("next") || "/backend";

let mode = "login";

init();

function init() {
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode || "login"));
  });

  form.addEventListener("submit", submitAuth);
  hydrateSession();
}

async function hydrateSession() {
  const session = await fetchJson("/api/auth/session").catch(() => null);
  if (session?.authenticated) {
    window.location.href = profileUrl();
  }
}

function setMode(nextMode) {
  mode = nextMode === "signup" ? "signup" : "login";
  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  passwordInput.autocomplete = mode === "signup" ? "new-password" : "current-password";
  submitButton.textContent = mode === "signup" ? "Create account" : "Sign in";
  formError.textContent = "";
}

async function submitAuth(event) {
  event.preventDefault();
  formError.textContent = "";
  submitButton.disabled = true;

  try {
    await fetchJson(`/api/auth/${mode === "signup" ? "signup" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value
      })
    });
    window.location.href = profileUrl();
  } catch (error) {
    formError.textContent = error.message || "Could not access the workspace.";
  } finally {
    submitButton.disabled = false;
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function profileUrl() {
  return `/profile?next=${encodeURIComponent(nextUrl)}`;
}
