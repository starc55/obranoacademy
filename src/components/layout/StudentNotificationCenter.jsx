import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { request } from "../../services/storage";

export function StudentNotificationCenter() {
  const [items, setItems] = useState([]),
    [open, setOpen] = useState(false),
    root = useRef(null),
    load = () =>
      request("/api/student/notifications")
        .then(setItems)
        .catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000),
      close = (e) => {
        if (!root.current?.contains(e.target)) setOpen(false);
      };
    document.addEventListener("pointerdown", close);
    return () => {
      clearInterval(timer);
      document.removeEventListener("pointerdown", close);
    };
  }, []);
  const unread = items.filter((x) => !x.isRead).length,
    markAll = async () => {
      if (!unread) return;
      await request("/api/student/notifications/read-all", { method: "PATCH" });
      setItems((rows) => rows.map((x) => ({ ...x, isRead: true })));
    };
  return (
    <div className="notification-center" ref={root}>
      <button
        className="icon-btn"
        onClick={() => setOpen((x) => !x)}
        aria-label="Bildirishnomalar"
      >
        <Bell />
        {unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
      </button>
      {open && (
        <section className="notification-popover student-notification-popover">
          <header>
            <div>
              <h3>Bildirishnomalar</h3>
              <p>{unread} ta o‘qilmagan</p>
            </div>
            <button
              className="icon-btn"
              onClick={markAll}
              disabled={!unread}
              title="Barchasini o‘qildi"
            >
              <CheckCheck />
            </button>
          </header>
          <div className="notification-list">
            {items.map((x) => (
              <article key={x.id} className={x.isRead ? "is-read" : ""}>
                <Bell />
                <span>
                  <strong>{x.title}</strong>
                  <small>{x.message}</small>
                  <em>{new Date(x.createdAt).toLocaleString("uz-UZ")}</em>
                </span>
              </article>
            ))}
            {!items.length && (
              <div className="empty compact">Bildirishnoma yo‘q</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
