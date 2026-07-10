import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Layers3,
  ClipboardCheck,
  CreditCard,
  BarChart3,
  Settings,
  Search,
  Plus,
  Sun,
  Moon,
  Bell,
  PanelLeftClose,
  Menu,
  X,
  Command,
  LogOut,
  UserRound,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Modal } from "../ui/Modal";
import { StudentForm } from "../students/StudentForm";
import { authService } from "../../services/authService";
import logo from "../../assets/logo.png";
import { NotificationCenter } from "./NotificationCenter";

const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/students", "O‘quvchilar", Users],
  ["/groups", "Guruhlar", Layers3],
  ["/individuals", "Individuallar", UserRound],
  ["/attendance", "Yo‘qlama", ClipboardCheck],
  ["/payments", "To‘lovlar", CreditCard],
  ["/reports", "Hisobotlar", BarChart3],
  ["/settings", "Sozlamalar", Settings],
];
export function AppLayout({ children }) {
  const { settings, updateSettings, students, groups } = useApp(),
    [collapsed, setCollapsed] = useState(
      () => localStorage.getItem("sidebar") === "1"
    ),
    [mobile, setMobile] = useState(false),
    [add, setAdd] = useState(false),
    [command, setCommand] = useState(false),
    [query, setQuery] = useState("");
  const loc = useLocation(),
    navigate = useNavigate(),
    title = nav.find((x) => x[0] === loc.pathname)?.[1] || "Profil";
  useEffect(() => {
    const fn = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommand(true);
      }
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  }, []);
  const toggle = () => {
    setCollapsed((x) => {
      localStorage.setItem("sidebar", x ? "0" : "1");
      return !x;
    });
  };
  const results = [
    ...students
      .filter((s) =>
        `${s.fullName} ${s.phone} ${s.note}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
      .slice(0, 5)
      .map((s) => ({ label: s.fullName, to: `/students/${s.id}` })),
    ...groups
      .filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
      .map((g) => ({ label: g.name, to: "/groups" })),
  ];
  return (
    <div className={`shell ${collapsed ? "shell--collapsed" : ""}`}>
      <aside className={`sidebar ${mobile ? "sidebar--open" : ""}`}>
        <div className="brand">
          <img src={logo} alt="OBRANO ACADEMY logo" className="brand__mark" />
          <div>
            <strong>OBRANO</strong>
            <small>Academy OS</small>
          </div>
          <button
            className="icon-btn sidebar__mobile-close"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMobile(false)}
            >
              <Icon />
              <span>{label}</span>
              <span className="nav-tooltip" role="tooltip">
                {label}
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <div className="avatar">AK</div>
          <div>
            <strong>{settings.adminName}</strong>
            <small>Administrator</small>
          </div>
          <button className="icon-btn" onClick={toggle}>
            <PanelLeftClose />
          </button>
          <button
            className="icon-btn sidebar__logout"
            title="Chiqish"
            onClick={() => {
              authService.logout();
              navigate("/login");
            }}
          >
            <LogOut />
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="topbar__title">
            <button
              className="icon-btn menu-btn"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <div>
              <span className="eyebrow">BOSHQARUV PANELI</span>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="topbar__actions">
            <button className="search-trigger" onClick={() => setCommand(true)}>
              <Search />
              <span>Qidirish...</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="btn btn--primary quick-add"
              onClick={() => setAdd(true)}
            >
              <Plus />
              O‘quvchi
            </button>
            <button
              className="icon-btn"
              onClick={() =>
                updateSettings({
                  theme: settings.theme === "dark" ? "light" : "dark",
                })
              }
            >
              {settings.theme === "dark" ? <Sun /> : <Moon />}
            </button>
            <NotificationCenter />
            <div className="avatar">OO</div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
      <StudentForm open={add} onClose={() => setAdd(false)} />
      <Modal
        open={command}
        onClose={() => setCommand(false)}
        title="Tezkor qidiruv"
      >
        <div className="command-search">
          <Search />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="O‘quvchi, guruh yoki telefon..."
          />
        </div>
        <div className="command-list">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                navigate(r.to);
                setCommand(false);
              }}
            >
              <Command />
              {r.label}
              <span>Ochish →</span>
            </button>
          ))}
          {!results.length && (
            <div className="empty compact">Qidiruvni boshlang</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
