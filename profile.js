const profileForm = document.querySelector("#profileForm");
const profileName = document.querySelector("#profileName");
const profileBusiness = document.querySelector("#profileBusiness");
const profileUseFor = document.querySelector("#profileUseFor");
const profileReferredFrom = document.querySelector("#profileReferredFrom");
const profileSubmit = document.querySelector("#profileSubmit");
const profileError = document.querySelector("#profileError");
const profileNextUrl = new URLSearchParams(window.location.search).get("next") || "/backend";

initProfile();

function initProfile() {
  profileForm.addEventListener("submit", saveProfile);
  loadProfile();
}

async function loadProfile() {
  try {
    const payload = await fetchJson("/api/profile");
    const profile = payload.profile || {};
    profileName.value = profile.name || "";
    profileBusiness.value = profile.business || "";
    profileUseFor.value = profile.useFor || "";
    profileReferredFrom.value = profile.referredFrom || "";
  } catch (error) {
    if (/sign in/i.test(error.message)) {
      window.location.href = `/login?next=${encodeURIComponent(profileNextUrl)}`;
      return;
    }
    profileError.textContent = error.message || "Could not load profile.";
  }
}

async function saveProfile(event) {
  event.preventDefault();
  profileError.textContent = "";
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
