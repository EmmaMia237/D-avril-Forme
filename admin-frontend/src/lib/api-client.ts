const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ? String(import.meta.env.VITE_API_BASE_URL) : "").replace(/\/$/, "");
const AUTH_TOKEN_KEY = "af_auth_token";

export function apiUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  // Prefer localStorage (persistent) but allow sessionStorage fallback for non-remembered sessions
  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? window.sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null, remember = true) {
  if (typeof window === "undefined") return;
  if (token) {
    try {
      if (remember) {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
        // ensure sessionStorage does not hold a stale token
        window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
      } else {
        window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch (err) {
      // storage may fail (e.g., user blocked) — fall back to sessionStorage
      try {
        window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      } catch (_) {
        // nothing left we can do safely
      }
    }
  } else {
    // remove from both stores to fully clear auth
    try { window.localStorage.removeItem(AUTH_TOKEN_KEY); } catch (_) {}
    try { window.sessionStorage.removeItem(AUTH_TOKEN_KEY); } catch (_) {}
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {} as any);
  const token = getAuthToken();
  if (token && !headers.has("authorization")) {
    headers.set("authorization", "Bearer " + token);
  }

  const requestInit: RequestInit = {
    credentials: "include",
    ...init,
    headers,
  };

  try {
    const res = await fetch(apiUrl(path), requestInit);
    return res;
  } catch (err: any) {
    const message = err?.message || String(err);
    throw new Error(`Network request failed when contacting ${apiUrl(path)}: ${message}`);
  }
}
