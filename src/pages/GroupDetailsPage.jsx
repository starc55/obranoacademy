import {
  ArrowLeft,
  Users,
  TrendingUp,
  Wallet,
  CalendarDays,
  Phone,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { analyticsService } from "../services/analyticsService";
import { StatusBadge } from "../components/shared/StatusBadge";
export function GroupDetailsPage() {
  const { id } = useParams(),
    nav = useNavigate(),
    { groups, students, attendance, payments } = useApp(),
    group = groups.find((g) => g.id === id);
  if (!group)
    return (
      <div className="empty">
        <h3>Guruh topilmadi</h3>
        <button className="btn" onClick={() => nav("/groups")}>
          Guruhlarga qaytish
        </button>
      </div>
    );
  const members = students.filter((s) => s.groupId === id),
    sessions = attendance
      .filter((a) => a.groupId === id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    revenue = payments
      .filter((p) => members.some((s) => s.id === p.studentId))
      .reduce((a, p) => a + Number(p.amount || 0), 0);
  return (
    <>
      <button className="back" onClick={() => nav("/groups")}>
        <ArrowLeft /> Guruhlarga qaytish
      </button>
      <div className="group-detail-head">
        <div>
          <span className="eyebrow">{group.subject || "O‘QUV GURUHI"}</span>
          <h2>{group.name}</h2>
          <p>
            {group.teacher || "O‘qituvchi belgilanmagan"} · {group.days} ·{" "}
            {group.start}–{group.end}
          </p>
        </div>
        <StatusBadge status={group.active === false ? "inactive" : "active"} />
      </div>
      <div className="money-stats">
        <article>
          <small>O‘quvchilar</small>
          <strong>{members.length}</strong>
          <span>guruh tarkibi</span>
        </article>
        <article>
          <small>O‘rtacha davomat</small>
          <strong>{analyticsService.groupAttendance(id)}%</strong>
          <span>{sessions.length} ta sessiya</span>
        </article>
        <article>
          <small>Jami tushum</small>
          <strong>{revenue.toLocaleString("uz-UZ")} so‘m</strong>
          <span>real to‘lovlar</span>
        </article>
      </div>
      <div className="group-detail-grid">
        <section className="table-card">
          <header className="section-head">
            <div>
              <h3>Guruh o‘quvchilari</h3>
              <p>Faol va noaktiv tarkib</p>
            </div>
          </header>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>O‘quvchi</th>
                  <th>Telefon</th>
                  <th>Davomat</th>
                  <th>To‘lov</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((s) => (
                  <tr key={s.id} onClick={() => nav(`/students/${s.id}`)}>
                    <td>
                      <div className="person">
                        <div className="avatar avatar--soft">
                          {s.firstName[0]}
                          {s.lastName[0]}
                        </div>
                        <strong>{s.fullName}</strong>
                      </div>
                    </td>
                    <td>{s.phone}</td>
                    <td>{analyticsService.studentAttendance(s.id)}%</td>
                    <td>
                      <StatusBadge
                        status={analyticsService.studentPaymentStatus(s.id)}
                      />
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!members.length && (
              <div className="empty">
                <Users />
                <h3>Guruhda o‘quvchi yo‘q</h3>
              </div>
            )}
          </div>
        </section>
        <aside className="panel">
          <header>
            <div>
              <h3>So‘nggi darslar</h3>
              <p>Yo‘qlama sessiyalari</p>
            </div>
          </header>
          <div className="session-list">
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id}>
                <CalendarDays />
                <span>
                  {new Intl.DateTimeFormat("uz-UZ").format(
                    new Date(`${s.date}T00:00:00`)
                  )}
                </span>
                <strong>
                  {s.records.filter((r) => r.status === "present").length}/
                  {s.records.length}
                </strong>
              </div>
            ))}
            {!sessions.length && (
              <div className="empty compact">Yo‘qlama qilinmagan</div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
