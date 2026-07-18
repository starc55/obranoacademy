import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Trophy,
  CheckCircle2,
  Clock3,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const load = useCallback(
    () =>
      request("/api/student")
        .then(setData)
        .catch(() => setError("Ma’lumotlarni yuklab bo‘lmadi")),
    []
  );
  useEffect(() => {
    load();
  }, [load]);
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
  const chartData = data.recent
    .slice()
    .reverse()
    .map((item) => ({
      name: item.title.length > 12 ? `${item.title.slice(0, 12)}…` : item.title,
      ball: item.score ?? 0,
    }));
  const cards = [
    ["Jami yuborilgan", s.total, Send, "blue"],
    ["Tekshirilmoqda", s.under_review, Clock3, "amber"],
    ["Qabul qilingan", s.approved, CheckCircle2, "green"],
    ["Qayta ishlash", s.revision_requested, RotateCcw, "red"],
    ["O‘rtacha ball", s.average_score, TrendingUp, "purple"],
  ];
  return (
    <>
      <div className="page-head student-welcome">
        <div>
          <span className="eyebrow">SHAXSIY NATIJALAR</span>
          <h2>Salom, {data.profile.firstName}</h2>
          <p>
            Natijalaringiz, rivojlanish dinamikasi va so‘nggi vazifalaringiz.
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => setSubmitOpen(true)}
        >
          <Send />
          Yangi vazifa yuborish
        </button>
      </div>
      <div className="stats-grid student-stats">
        {cards.map(([label, value, Icon, tone]) => (
          <article
            className={`stat-card student-stat-card tone-${tone}`}
            key={label}
          >
            <span className="student-stat-icon">
              <Icon />
            </span>
            <div>
              <strong>{value || 0}</strong>
              <p>{label}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="student-dashboard-grid">
        <section className="panel student-progress-panel">
          <header className="section-head">
            <div>
              <h3>Rivojlanish dinamikasi</h3>
              <p>Tekshirilgan so‘nggi vazifalardagi ballaringiz</p>
            </div>
            <TrendingUp />
          </header>
          {chartData.some((item) => item.ball > 0) ? (
            <div className="student-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="studentScore"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--accent)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--text-primary)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ball"
                    stroke="var(--accent)"
                    strokeWidth={3}
                    fill="url(#studentScore)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty compact">
              Chart uchun tekshirilgan vazifalar hali yetarli emas
            </div>
          )}
        </section>
        <section className="panel student-progress-summary">
          <span>Umumiy natija</span>
          <strong>
            {s.average_score || 0}
            <small>/100</small>
          </strong>
          <div className="progress">
            <i style={{ "--w": `${s.average_score || 0}%` }} />
          </div>
          <p>
            {Number(s.average_score) >= 80
              ? "Ajoyib natija — shu tempni saqlang."
              : Number(s.average_score) >= 60
              ? "Yaxshi, keyingi vazifada natijani oshiring."
              : "Vazifalarni muntazam topshirib rivojlanishni boshlang."}
          </p>
        </section>
      </div>
      {data.achievements.length > 0 && (
        <section className="panel achievement-panel">
          <header>
            <h3>
              <Trophy /> Yutuqlar
            </h3>
          </header>
          <div className="achievement-list">
            {data.achievements.map((achievement) => (
              <div key={achievement.id}>
                <Trophy />
                <span>
                  <strong>{achievement.title}</strong>
                  <small>{achievement.description}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="table-card student-recent-table">
        <header className="section-head">
          <div>
            <h3>Oxirgi vazifalar</h3>
            <p>Vazifa nomini bosib yuborgan materiallaringizni ko‘ring</p>
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
              {data.recent.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/student/submissions/${item.id}`}>
                      <strong>{item.title}</strong>
                    </Link>
                  </td>
                  <td>{item.category}</td>
                  <td>
                    <span
                      className={`submission-status status-${item.status.toLowerCase()}`}
                    >
                      {statusLabel[item.status]}
                    </span>
                  </td>
                  <td>{item.score ?? "—"}</td>
                  <td>
                    {new Date(item.submittedAt).toLocaleDateString("uz-UZ")}
                  </td>
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
        onCreated={load}
      />
    </>
  );
}
