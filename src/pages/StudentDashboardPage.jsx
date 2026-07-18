import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Trophy } from "lucide-react";
import { request } from "../services/storage";
import { SubmissionModal } from "../components/students/SubmissionModal";

const statusLabel = {
  SUBMITTED: "Yuborildi",
  UNDER_REVIEW: "Tekshirilmoqda",
  REVISION_REQUESTED: "Qayta ishlash kerak",
  APPROVED: "Qabul qilindi",
  REJECTED: "Rad etildi",
};
export function StudentDashboardPage() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [submitOpen, setSubmitOpen] = useState(false);
  useEffect(() => {
    request("/api/student")
      .then(setData)
      .catch(() => setError("Ma’lumotlarni yuklab bo‘lmadi"));
  }, []);
  if (error)
    return (
      <div className="empty">
        <h3>{error}</h3>
      </div>
    );
  if (!data)
    return (
      <div className="route-loader">
        <i />
        <span>Yuklanmoqda...</span>
      </div>
    );
  const s = data.stats;
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Salom, {data.profile.firstName}</h2>
          <p>Vazifalaringiz va so‘nggi natijalaringiz.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setSubmitOpen(true)}>
          <Send />
          Yangi vazifa yuborish
        </button>
      </div>
      <div className="stats-grid student-stats">
        {[
          ["Jami yuborilgan", s.total],
          ["Tekshirilmoqda", s.under_review],
          ["Qabul qilingan", s.approved],
          ["Qayta ishlash", s.revision_requested],
          ["O‘rtacha ball", s.average_score],
        ].map(([l, v]) => (
          <article className="stat-card" key={l}>
            <strong>{v || 0}</strong>
            <p>{l}</p>
          </article>
        ))}
      </div>
      {data.achievements.length > 0 && (
        <section className="panel achievement-panel">
          <header>
            <h3>
              <Trophy /> Yutuqlar
            </h3>
          </header>
          <div className="achievement-list">
            {data.achievements.map((a) => (
              <div key={a.id}>
                <Trophy />
                <span>
                  <strong>{a.title}</strong>
                  <small>{a.description}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="table-card">
        <header className="section-head">
          <div>
            <h3>Oxirgi vazifalar</h3>
            <p>So‘nggi yuborilgan ishlar</p>
          </div>
          <Link to="/student/submissions">Barchasi</Link>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vazifa</th>
                <th>Kategoriya</th>
                <th>Status</th>
                <th>Ball</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((x) => (
                <tr key={x.id}>
                  <td>
                    <Link to={`/student/submissions/${x.id}`}>
                      <strong>{x.title}</strong>
                    </Link>
                  </td>
                  <td>{x.category}</td>
                  <td>
                    <span
                      className={`submission-status status-${x.status.toLowerCase()}`}
                    >
                      {statusLabel[x.status]}
                    </span>
                  </td>
                  <td>{x.score ?? "—"}</td>
                  <td>{new Date(x.submittedAt).toLocaleDateString("uz-UZ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.recent.length && (
            <div className="empty compact">Hali vazifa yuborilmagan</div>
          )}
        </div>
      </section>
      <SubmissionModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onCreated={() => request("/api/student").then(setData)}
      />
    </>
  );
}
