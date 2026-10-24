// The sign-in page stores who is signed in; the supervisor pages read it.
// Session duration is 2 days (48 hours = 172,800,000 ms).
const KEY = "oh_session";
const EXPIRES_KEY = "oh_expires_at";
export const SESSION_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

function getStorageItem(key) {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch { /* storage unavailable */ }
  try {
    sessionStorage.setItem(key, value);
  } catch { /* storage unavailable */ }
}

function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch { /* storage unavailable */ }
  try {
    sessionStorage.removeItem(key);
  } catch { /* storage unavailable */ }
}

export function clearSession() {
  removeStorageItem(KEY);
  removeStorageItem("oh_role");
  removeStorageItem("oh_user");
  removeStorageItem("oh_token");
  removeStorageItem(EXPIRES_KEY);
}

export function getSession() {
  try {
    const raw = getStorageItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    // Check if session has expired after 2 days
    const expiresAt = parsed.expiresAt || Number(getStorageItem(EXPIRES_KEY) || 0);
    if (expiresAt && Date.now() > expiresAt) {
      clearSession();
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

export function setSession(scope) {
  try {
    const durationMs = scope && scope.expiresIn ? scope.expiresIn * 1000 : SESSION_DURATION_MS;
    const expiresAt = Date.now() + durationMs;
    const sessionData = {
      ...scope,
      loggedInAt: Date.now(),
      expiresAt,
    };

    setStorageItem(KEY, JSON.stringify(sessionData));
    setStorageItem("oh_role", scope?.role || "");
    setStorageItem("oh_user", scope?.user || "");
    setStorageItem(EXPIRES_KEY, String(expiresAt));
    if (scope && scope.token) {
      setStorageItem("oh_token", scope.token);
    }
  } catch {
    /* storage unavailable */
  }
}

export function isSupervisor(s = getSession()) {
  return !!(s && s.role === "supervisor" && s.supId);
}
