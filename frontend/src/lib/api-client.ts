const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ? String(import.meta.env.VITE_API_BASE_URL) : "").replace(/\/$/, "");
const AUTH_TOKEN_KEY = "af_auth_token";

export function apiUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  const token = getAuthToken();
  if (token && !headers.has("authorization")) {
    // send a Bearer token when available
    headers.set("authorization", 'Bearer ' + token);
  }

  const requestInit: RequestInit = {
    credentials: "include",
    ...init,
    headers,
  };

  // perform fetch and provide a clearer error when network fails
  try {
    const res = await fetch(apiUrl(path), requestInit);
    return res;
  } catch (err: any) {
    const message = err?.message || String(err);
    throw new Error(`Network request failed when contacting ${apiUrl(path)}: ${message}`);
  }
}
