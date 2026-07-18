import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ListChecks, LogOut, Menu, X } from "lucide-react";
import { authService } from "../../services/authService";
import logo from "../../assets/logo.png";
import { StudentNotificationCenter } from "./StudentNotificationCenter";

const nav = [
  ["/student", "Bosh sahifa", LayoutDashboard],
  ["/student/submissions", "Mening vazifalarim", ListChecks],
];

export function StudentLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = authService.getUser();
  const logout = () => {
    authService.logout();
    navigate("/login");
  };
  return (
    <div className="shell student-shell">
      <button
        className={`student-sidebar-overlay ${menuOpen ? "is-open" : ""}`}
        aria-label="Menyuni yopish"
        onClick={() => setMenuOpen(false)}
      />
      <aside
        className={`sidebar student-sidebar ${menuOpen ? "sidebar--open" : ""}`}
      >
        <div className="brand">
          <img src={logo} alt="OBRANO Academy" className="brand__mark" />
          <div>
            <strong>OBRANO OS</strong>
            <small>Student kabineti</small>
          </div>
          <button
            className="icon-btn student-menu-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Menyuni yopish"
          >
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/student"}
              onClick={() => setMenuOpen(false)}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <div className="avatar">
            {user?.fullName
              ?.split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <strong>{user?.fullName}</strong>
            <small>O‘quvchi</small>
          </div>
          <button className="icon-btn" onClick={logout} aria-label="Chiqish">
            <LogOut />
          </button>
        </div>
      </aside>
      <main className="content">
        <header className="topbar student-topbar">
          <button
            className="icon-btn student-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menyuni ochish"
          >
            <Menu />
          </button>
          <div className="topbar__title">
            <strong>Student kabineti</strong>
            <small style={{ fontSize: 13 }}>{user?.fullName}</small>
          </div>
          <StudentNotificationCenter />
        </header>
        <div className="content-inner student-content-inner">{children}</div>
      </main>
    </div>
  );
}
