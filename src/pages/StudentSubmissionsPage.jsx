import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Eye } from "lucide-react";
import { AppSelect } from "../components/ui/AppSelect";
import { request } from "../services/storage";
const labels = {
  SUBMITTED: "Yuborildi",
  UNDER_REVIEW: "Tekshirilmoqda",
  REVISION_REQUESTED: "Qayta ishlash kerak",
  APPROVED: "Qabul qilindi",
  REJECTED: "Rad etildi",
};
export function StudentSubmissionsPage() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 }),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    request(
      `/api/student/submissions?page=${page}&search=${encodeURIComponent(
        q
      )}&status=${status}`
    )
      .then(setData)
      .catch(() => setError("Vazifalarni yuklab bo‘lmadi"))
      .finally(() => setLoading(false));
  }, [q, status, page]);
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Mening vazifalarim</h2>
          <p>{data.total} ta real submission</p>
        </div>
      </div>
      <section className="table-card">
        <div className="table-tools">
          <label className="searchbox">
            <Search />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Vazifa qidirish..."
            />
          </label>
          <AppSelect
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <option value="">Barcha statuslar</option>
            {Object.entries(labels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </AppSelect>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vazifa</th>
                <th>Kategoriya</th>
                <th>Yuborilgan</th>
                <th>Status</th>
                <th>Ball</th>
                <th>Feedback</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((x) => (
                <tr key={x.id}>
                  <td>
                    <Link to={`/student/submissions/${x.id}`}>
                      <strong>{x.title}</strong>
                    </Link>
                  </td>
                  <td>{x.category}</td>
                  <td>{new Date(x.submittedAt).toLocaleDateString("uz-UZ")}</td>
                  <td>
                    <span
                      className={`submission-status status-${x.status.toLowerCase()}`}
                    >
                      {labels[x.status]}
                    </span>
                  </td>
                  <td>{x.score ?? "—"}</td>
                  <td>{x.adminFeedback ? "Bor" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="empty compact">Yuklanmoqda...</div>}
          {error && <div className="empty compact">{error}</div>}
          {!loading && !error && !data.items.length && (
            <div className="empty">
              <h3>Vazifalar topilmadi</h3>
              <p>Yangi vazifa yuborishingiz mumkin.</p>
            </div>
          )}
        </div>
        <footer className="pagination">
          <span>{data.total} ta</span>
          <div>
            <button disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>
              ‹
            </button>
            <span>
              {page} / {data.pages || 1}
            </span>
            <button
              disabled={page >= data.pages}
              onClick={() => setPage((x) => x + 1)}
            >
              ›
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}
