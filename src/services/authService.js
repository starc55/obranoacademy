import { request } from "./storage";

const SESSION_KEY = "nova_admin_session";

export const authService = {
  isAuthenticated: () => Boolean(localStorage.getItem(SESSION_KEY)),
  async login(email, password) {
    try {
      const { token } = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(SESSION_KEY, token);
      window.dispatchEvent(new Event("nova:auth"));
      return true;
    } catch {
      return false;
    }
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
};
