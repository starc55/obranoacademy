import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Users, Calendar, TrendingUp, Edit3 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { StatusBadge } from "../components/shared/StatusBadge";
import { studyDuration } from "../utils/studyDuration";
import { StudentForm } from "../components/students/StudentForm";
export function StudentDetailsPage() {
  const [editing, setEditing] = useState(false);
  const { id } = useParams(),
    nav = useNavigate(),
    { students, groups, attendance, payments } = useApp(),
    s = students.find((x) => x.id === id);
  if (!s)
    return (
      <div className="empty">
        <h3>O‘quvchi topilmadi</h3>
      </div>
    );
  const records = attendance
      .flatMap((a) => a.records.map((r) => ({ ...r, date: a.date })))
      .filter((r) => r.studentId === id),
    present = records.filter((r) => r.status === "present").length,
    rate = records.length ? Math.round((present / records.length) * 100) : 0;
  return (
    <>
      <button className="back" onClick={() => nav(-1)}>
        <ArrowLeft /> O‘quvchilarga qaytish
      </button>
      <section className="profile-head">
        <div className="avatar avatar--xl">
          {s.firstName[0]}
          {s.lastName[0]}
        </div>
        <div>
          <StatusBadge status={s.status} />
          <h2>{s.fullName}</h2>
          <p>
            {groups.find((g) => g.id === s.groupId)?.name} · {s.phone}
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => setEditing(true)}>
          <Edit3 /> Tahrirlash
        </button>
      </section>
      <div className="profile-grid">
        <article className="panel">
          <header>
            <h3>Shaxsiy ma’lumotlar</h3>
          </header>
          <div className="details">
            <span>
              <Phone />
              Telefon <strong>{s.phone}</strong>
            </span>
            <span>
              <Users />
              Ota-ona <strong>{s.parentPhone || "—"}</strong>
            </span>
            <span>
              <Calendar />
              O‘qish muddati <strong>{studyDuration(s.joinedDate)}</strong>
            </span>
          </div>
        </article>
        <article className="panel">
          <header>
            <h3>Davomat</h3>
          </header>
          <div className="profile-metric">
            <TrendingUp />
            <strong>{rate}%</strong>
            <span>
              {records.length} ta dars ·{" "}
              {records.filter((r) => r.status === "late").length} kechikish
            </span>
          </div>
        </article>
        <article className="panel panel--wide">
          <header>
            <h3>So‘nggi tarix</h3>
          </header>
          <div className="timeline">
            {records
              .slice(-8)
              .reverse()
              .map((r, i) => (
                <div key={i}>
                  <span>{r.date}</span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
          </div>
        </article>
        <article className="panel">
          <header>
            <h3>To‘lovlar</h3>
          </header>
          <div className="timeline">
            {payments
              .filter((p) => p.studentId === id)
              .map((p) => (
                <div key={p.id}>
                  <span>{p.month}</span>
                  <strong>{(+p.amount).toLocaleString()} so‘m</strong>
                </div>
              ))}
          </div>
        </article>
      </div>
      <StudentForm open={editing} student={s} onClose={() => setEditing(false)} />
    </>
  );
}
