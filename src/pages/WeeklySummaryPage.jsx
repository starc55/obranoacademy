import { useEffect, useState } from "react";
import {
  CalendarRange,
  RefreshCw,
  Send,
  TrendingUp,
  Users,
  BookOpen,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { request } from "../services/storage";
export function WeeklySummaryPage() {
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [generating, setGenerating] = useState(false);
  const load = () =>
    request("/api/weekly-summaries")
      .then(setRows)
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);
  const generate = async () => {
    setGenerating(true);
    try {
      await request("/api/weekly-summaries/generate", {
        method: "POST",
        body: JSON.stringify({ offset: -1, sendTelegram: true }),
      });
      await load();
      toast.success("Haftalik hisobot yaratildi");
    } finally {
      setGenerating(false);
    }
  };
  const current = rows[0];
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Haftalik hisobot</h2>
          <p>Davomat, risk va progress bo‘yicha haftalik snapshot</p>
        </div>
        <button
          className="btn btn--primary"
          disabled={generating}
          onClick={generate}
        >
          <RefreshCw />{" "}
          {generating ? "Yaratilmoqda..." : "O‘tgan haftani yaratish"}
        </button>
      </div>
      {loading ? (
        <div className="skeleton-page">
          <i />
          <i />
        </div>
      ) : !current ? (
        <div className="empty">
          <CalendarRange />
          <h3>Haftalik hisobot hali yo‘q</h3>
        </div>
      ) : (
        <>
          <section className="summary-head panel">
            <div>
              <span className="eyebrow">
                {current.weekStart} — {current.weekEnd}
              </span>
              <h3>Markaz haftalik natijasi</h3>
            </div>
            <span
              className={`badge ${
                current.telegramStatus === "sent"
                  ? "badge--entered"
                  : "badge--late"
              }`}
            >
              <Send /> Telegram: {current.telegramStatus}
            </span>
          </section>
          <div className="money-stats summary-metrics">
            <article>
              <BookOpen />
              <small>Darslar</small>
              <strong>{current.metrics.lessons}</strong>
            </article>
            <article>
              <TrendingUp />
              <small>Umumiy davomat</small>
              <strong>{current.metrics.attendance}%</strong>
            </article>
            <article>
              <TriangleAlert />
              <small>Orqada qolmoqda</small>
              <strong>{current.metrics.behind}</strong>
            </article>
            <article>
              <Users />
              <small>Kechikkan vazifalar</small>
              <strong>{current.metrics.overdueAssignments}</strong>
            </article>
          </div>
          <section className="table-card">
            <header className="section-head">
              <div>
                <h3>Hisobotlar tarixi</h3>
                <p>Duplicate bo‘lmagan haftalik snapshotlar</p>
              </div>
            </header>
            <div className="timeline summary-list">
              {rows.map((row) => (
                <div key={row.id}>
                  <span>
                    {row.weekStart} — {row.weekEnd}
                  </span>
                  <strong>{row.metrics.attendance}% davomat</strong>
                  <em>
                    {row.metrics.lessons} dars · {row.metrics.behind} risk
                  </em>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
