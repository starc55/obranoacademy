import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { request } from "../../services/storage";
export function NotificationCenter() {
  const [open, setOpen] = useState(false),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(false),
    [markingAll, setMarkingAll] = useState(false),
    root = useRef(null),
    load = async () => {
      setLoading(true);
      try {
        setItems(await request("/api/notifications"));
      } finally {
        setLoading(false);
      }
    };
  useEffect(() => {
    load();
    const timer = setInterval(load, 30 * 1000),
      close = (e) => {
        if (!root.current?.contains(e.target)) setOpen(false);
      };
    document.addEventListener("pointerdown", close);
    return () => {
      clearInterval(timer);
      document.removeEventListener("pointerdown", close);
    };
  }, []);
  const unread = items.filter((n) => !n.isRead).length,
    mark = async (item) => {
      if (item.isRead) return;
      await request(`/api/notifications/${item.id}/read`, { method: "PATCH" });
      setItems((rows) =>
        rows.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
    },
    markAll = async () => {
      if (!unread || markingAll) return;
      setMarkingAll(true);
      try {
        const unreadItems = items.filter((item) => !item.isRead);
        await Promise.all(
          unreadItems.map((item) =>
            request(`/api/notifications/${item.id}/read`, {
              method: "PATCH",
            }),
          ),
        );
        setItems((rows) => rows.map((item) => ({ ...item, isRead: true })));
        toast.success(`${unreadItems.length} ta bildirishnoma o‘qildi`);
      } catch {
        toast.error("Bildirishnomalarni o‘qilgan qilishda xatolik");
      } finally {
        setMarkingAll(false);
      }
    };
  return (
    <div className="notification-center" ref={root}>
      <button
        className="icon-btn"
        aria-label="Bildirishnomalar"
        onClick={() => {
          setOpen((x) => !x);
          if (!open) load();
        }}
      >
        <Bell />
        {unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
      </button>
      {open && (
        <section className="notification-popover">
          <header>
            <div>
              <h3>Bildirishnomalar</h3>
              <p>{unread} ta o‘qilmagan</p>
            </div>
            <button
              className="icon-btn"
              onClick={markAll}
              title="Barchasini o‘qildi deb belgilash"
              aria-label="Barchasini o‘qildi deb belgilash"
              disabled={!unread || markingAll}
            >
              <CheckCheck />
            </button>
          </header>
          <div className="notification-list">
            {items.map((item) => (
              <button
                key={item.id}
                className={item.isRead ? "is-read" : ""}
                onClick={() => mark(item)}
              >
                <span className="notification-icon">
                  <TriangleAlert />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                  <em>{item.dueDate || ""}</em>
                </span>
                {item.telegramSent && <Send />}
              </button>
            ))}
            {!items.length && !loading && (
              <div className="empty compact">
                <Bell />
                <p>Bildirishnoma yo‘q</p>
              </div>
            )}
            {loading && !items.length && (
              <div className="empty compact">Tekshirilmoqda...</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
