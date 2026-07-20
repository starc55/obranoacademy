import { request } from "./storage";

const SESSION_KEY = "nova_admin_session";
const USER_KEY = "nova_auth_user";

const hasValidSession = () => {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return false;
  try {
    const encoded = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"),
      base64 = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="),
      payload = JSON.parse(atob(base64));
    return Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
};

export const authService = {
  isAuthenticated: hasValidSession,
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  },
  getRole: () => authService.getUser()?.role || "ADMIN",
  async login(email, password) {
    try {
      const { token, user } = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(SESSION_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event("nova:auth"));
      return true;
    } catch {
      return false;
    }
  },
  async activate(payload) {
    return request("/api/auth/activate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("nova:auth"));
  },
  subscribe(listener) {
    window.addEventListener("nova:auth", listener);
    return () => window.removeEventListener("nova:auth", listener);
  },
};
