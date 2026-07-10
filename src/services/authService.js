const SESSION_KEY = "nova_admin_session";
export const DEMO_ADMIN = {
  email: "admin@obrano.academy",
  password: "ObranoacaDemy2026!05155525",
  name: "Og'abek Orziyev",
};
export const authService = {
  isAuthenticated: () => localStorage.getItem(SESSION_KEY) === "active",
  login(email, password) {
    if (
      email.trim().toLowerCase() === DEMO_ADMIN.email &&
      password === DEMO_ADMIN.password
    ) {
      localStorage.setItem(SESSION_KEY, "active");
      return true;
    }
    return false;
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
};
