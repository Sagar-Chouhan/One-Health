import { clearSession, getSession } from "./session.js";

const BASE = import.meta.env.VITE_API_BASE || "";

function apiUrl(path, params) {
  const base = BASE || (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");
  const url = new URL(String(path).replace(/^\/+/, ""), `${base.replace(/\/+$/, "")}/`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    }
  }
  return url;
}

async function toError(res) {
  let detail;
  try {
    const body = await res.json();
    detail = body && body.detail;
  } catch {
    // Some error responses do not contain JSON.
  }

  // 401: Token or session expired (e.g. after 2 days)
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  const error = new Error(typeof detail === "string" ? detail : res.statusText || "Request failed");
  error.status = res.status;
  error.detail = detail;
  return error;
}

export async function apiGet(path, params) {
  const res = await fetch(apiUrl(path, params));
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toError(res);
  return res.json();
}

function authHeaders(extra = {}) {
  let token = "";
  try {
    const session = getSession();
    token = session?.token || localStorage.getItem("oh_token") || sessionStorage.getItem("oh_token") || "";
  } catch {
    // Storage is optional.
  }
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export async function apiAuthGet(path, params) {
  const res = await fetch(apiUrl(path, params), { headers: authHeaders() });
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function apiAuthPost(path, body) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toError(res);
  return res.json();
}
