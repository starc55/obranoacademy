import { useEffect, useState } from "react";
import { BellRing, CheckCheck, RefreshCw, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppSelect } from "../components/ui/AppSelect";
import { request } from "../services/storage";
export function AlertsPage() {
  const [rows, setRows] = useState([]),
    [status, setStatus] = useState("OPEN"),
    [severity, setSeverity] = useState(""),
    [loading, setLoading] = useState(true);
  const load = () =>
    request(`/api/alerts?status=${status}&severity=${severity}`)
      .then(setRows)
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, [status, severity]);
  const generate = async () => {
    const result = await request("/api/alerts/generate", { method: "POST" });
    await load();
    toast.success(`${result.created} ta yangi alert yaratildi`);
  };
  const update = async (id, next) => {
    await request(`/api/alerts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    setRows((items) => items.filter((item) => item.id !== id));
    toast.success("Alert yangilandi");
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Smart Alerts</h2>
          <p>Avtomatik risk va progress ogohlantirishlari</p>
        </div>
        <button className="btn btn--primary" onClick={generate}>
          <RefreshCw /> Tekshirish
        </button>
      </div>
      <section className="table-card">
        <div className="table-tools">
          <AppSelect value={status} onValueChange={setStatus}>
            <option value="OPEN">Ochiq</option>
            <option value="ACKNOWLEDGED">Ko‘rib chiqilgan</option>
            <option value="RESOLVED">Hal qilingan</option>
            <option value="DISMISSED">Bekor qilingan</option>
          </AppSelect>
          <AppSelect value={severity} onValueChange={setSeverity}>
            <option value="">Barcha daraja</option>
            <option value="WARNING">Warning</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </AppSelect>
        </div>
        <div className="alert-grid">
          {rows.map((alert) => (
            <article className="panel alert-card" key={alert.id}>
              <header>
                <span
                  className={`risk-badge risk-${alert.severity.toLowerCase()}`}
                >
                  <BellRing /> {alert.severity}
                </span>
                <small>
                  {new Intl.DateTimeFormat("uz-UZ").format(
                    new Date(alert.createdAt),
                  )}
                </small>
              </header>
              <h3>{alert.title}</h3>
              <p>{alert.message}</p>
              <span>
                <UserRound /> {alert.studentName || "Umumiy"} ·{" "}
                {alert.groupName || "Individual"}
              </span>
              {alert.status === "OPEN" && (
                <footer>
                  <button
                    className="btn"
                    onClick={() => update(alert.id, "ACKNOWLEDGED")}
                  >
                    <CheckCheck /> Ko‘rib chiqildi
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={() => update(alert.id, "RESOLVED")}
                  >
                    Hal qilindi
                  </button>
                </footer>
              )}
            </article>
          ))}
          {!rows.length && !loading && (
            <div className="empty span-full">
              <BellRing />
              <h3>Bu filterda alert yo‘q</h3>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
