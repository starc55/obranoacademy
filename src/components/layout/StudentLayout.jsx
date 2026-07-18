import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ListChecks, Bell, LogOut } from "lucide-react";
import { authService } from "../../services/authService";
import logo from "../../assets/logo.png";
import { StudentNotificationCenter } from "./StudentNotificationCenter";

const nav = [
  ["/student", "Bosh sahifa", LayoutDashboard],
  ["/student/submissions", "Mening vazifalarim", ListChecks],
  ["/student/notifications", "Bildirishnomalar", Bell],
];

export function StudentLayout({ children }) {
  const navigate = useNavigate(), user = authService.getUser();
  return (
    <div className="shell student-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="OBRANO Academy" className="brand__mark" />
          <div><strong>OBRANO</strong><small>Student kabineti</small></div>
        </div>
        <nav>{nav.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==="/student"}><Icon/><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar__foot">
          <div className="avatar">{user?.fullName?.split(" ").map(x=>x[0]).slice(0,2).join("")}</div>
          <div><strong>{user?.fullName}</strong><small>O‘quvchi</small></div>
          <button className="icon-btn" onClick={()=>{authService.logout();navigate("/login");}}><LogOut/></button>
        </div>
      </aside>
      <main className="content"><header className="topbar student-topbar"><div><strong>Student kabineti</strong><small>{user?.fullName}</small></div><StudentNotificationCenter/></header><div className="content-inner">{children}</div></main>
    </div>
  );
}
