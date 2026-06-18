const profileForm = document.querySelector("#profileForm");
const profileName = document.querySelector("#profileName");
const profileBusiness = document.querySelector("#profileBusiness");
const profileUseFor = document.querySelector("#profileUseFor");
const profileReferredFrom = document.querySelector("#profileReferredFrom");
const profileSubmit = document.querySelector("#profileSubmit");
const profileNext = document.querySelector("#profileNext");
const profileBack = document.querySelector("#profileBack");
const profileError = document.querySelector("#profileError");
const profileStepLabel = document.querySelector("#profileStepLabel");
const profileProgressFill = document.querySelector("#profileProgressFill");
const profileSteps = Array.from(document.querySelectorAll("[data-profile-step]"));
const profileNextUrl = new URLSearchParams(window.location.search).get("next") || "/backend";

const stepFields = [profileName, profileBusiness, profileUseFor, profileReferredFrom];
const stepErrors = [
  "Add your name.",
  "Add your business.",
  "Tell us what you want Upkeep to help with.",
  "Add where you heard about Upkeep."
];

let currentStep = 0;

initProfile();

function initProfile() {
  profileForm.addEventListener("submit", saveProfile);
  profileNext.addEventListener("click", goForward);
  profileBack.addEventListener("click", goBack);
  stepFields.forEach((field) => {
    field.addEventListener("input", () => {
      profileError.textContent = "";
    });
  });
  showStep(0);
  loadProfile();
}

async function loadProfile() {
  try {
    const payload = await fetchJson("/api/profile");
    if (payload.user?.profileComplete) {
      window.location.href = profileNextUrl;
      return;
    }

    const profile = payload.profile || {};
    profileName.value = profile.name || "";
    profileBusiness.value = profile.business || "";
    profileUseFor.value = profile.useFor || "";
    profileReferredFrom.value = profile.referredFrom || "";
    showStep(firstEmptyStep());
  } catch (error) {
    if (/sign in/i.test(error.message)) {
      window.location.href = `/login?next=${encodeURIComponent(profileNextUrl)}`;
      return;
    }
    profileError.textContent = error.message || "Could not load profile.";
  }
}

function goForward() {
  if (!validateStep(currentStep)) return;
  showStep(Math.min(profileSteps.length - 1, currentStep + 1));
}

function goBack() {
  showStep(Math.max(0, currentStep - 1));
}

function showStep(index) {
  currentStep = Math.max(0, Math.min(profileSteps.length - 1, index));
  profileSteps.forEach((step, stepIndex) => {
    step.classList.toggle("is-active", stepIndex === currentStep);
    step.hidden = stepIndex !== currentStep;
  });

  profileStepLabel.textContent = `Question ${currentStep + 1} of ${profileSteps.length}`;
  profileProgressFill.style.setProperty("--profile-progress", `${((currentStep + 1) / profileSteps.length).toFixed(3)}`);
  profileBack.disabled = currentStep === 0;
  profileNext.hidden = currentStep === profileSteps.length - 1;
  profileSubmit.hidden = currentStep !== profileSteps.length - 1;
  profileError.textContent = "";
  window.requestAnimationFrame(() => stepFields[currentStep]?.focus());
}

function firstEmptyStep() {
  const index = stepFields.findIndex((field) => !field.value.trim());
  return index === -1 ? 0 : index;
}

function validateStep(index) {
  const field = stepFields[index];
  if (!field?.value.trim()) {
    profileError.textContent = stepErrors[index] || "Complete this question.";
    field?.focus();
    return false;
  }
  return true;
}

function validateAllSteps() {
  const invalidIndex = stepFields.findIndex((field) => !field.value.trim());
  if (invalidIndex === -1) return true;
  showStep(invalidIndex);
  profileError.textContent = stepErrors[invalidIndex] || "Complete this question.";
  return false;
}

async function saveProfile(event) {
  event.preventDefault();
  profileError.textContent = "";
  if (!validateAllSteps()) return;
  profileSubmit.disabled = true;

  try {
    await fetchJson("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profileName.value,
        business: profileBusiness.value,
        useFor: profileUseFor.value,
        referredFrom: profileReferredFrom.value
      })
    });
    window.location.href = profileNextUrl;
  } catch (error) {
    profileError.textContent = error.message || "Could not save profile.";
  } finally {
    profileSubmit.disabled = false;
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
