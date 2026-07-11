import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Users,
  Calendar,
  TrendingUp,
  Edit3,
  Plus,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { StatusBadge } from "../components/shared/StatusBadge";
import { studyDuration } from "../utils/studyDuration";
import { StudentForm } from "../components/students/StudentForm";
import { request } from "../services/storage";
import { Modal } from "../components/ui/Modal";
import { AppSelect } from "../components/ui/AppSelect";
import { toast } from "sonner";
export function StudentDetailsPage() {
  const [editing, setEditing] = useState(false),
    [insights, setInsights] = useState(null),
    [timeline, setTimeline] = useState([]),
    [eventOpen, setEventOpen] = useState(false);
  const { id } = useParams(),
    nav = useNavigate(),
    { students, groups, attendance, payments } = useApp(),
    s = students.find((x) => x.id === id);
  useEffect(() => {
    let active = true;
    Promise.all([
      request(`/api/students/${id}/insights`),
      request(`/api/students/${id}/timeline`),
    ])
      .then(([nextInsights, nextTimeline]) => {
        if (active) {
          setInsights(nextInsights);
          setTimeline(nextTimeline);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);
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
        <article className="panel insight-card">
          <header>
            <h3>Health Score</h3>
          </header>
          <div
            className="health-score"
            aria-label={`Health Score ${insights?.health?.score ?? 0}`}
          >
            <strong>{insights?.health?.score ?? "—"}</strong>
            <span>/100</span>
          </div>
          <b>{insights?.health?.label || "Hisoblanmoqda..."}</b>
          <p>So‘nggi 30 kunlik mavjud ko‘rsatkichlar asosida.</p>
        </article>
        <article className="panel insight-card">
          <header>
            <h3>Risk Detection</h3>
          </header>
          <span
            className={`risk-badge risk-${(insights?.risk?.level || "LOW").toLowerCase()}`}
          >
            {insights?.risk?.label || "Hisoblanmoqda..."}
          </span>
          <strong>{insights?.risk?.attendanceRate ?? 0}% davomat</strong>
          <div className="risk-reasons">
            {insights?.risk?.reasons?.map((reason) => (
              <small key={reason.code}>{reason.title}</small>
            ))}
          </div>
        </article>
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
            <button className="btn" onClick={() => setEventOpen(true)}>
              <Plus /> Progress qo‘shish
            </button>
          </header>
          <div className="timeline progress-timeline">
            {timeline.slice(0, 12).map((event) => (
              <div key={`${event.type}-${event.id}`}>
                <span>
                  {new Intl.DateTimeFormat("uz-UZ").format(
                    new Date(event.occurredAt),
                  )}
                </span>
                <strong>{event.title}</strong>
                {event.description && <small>{event.description}</small>}
              </div>
            ))}
            {!timeline.length && (
              <div className="empty compact">Timeline hali bo‘sh</div>
            )}
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
      <StudentForm
        open={editing}
        student={s}
        onClose={() => setEditing(false)}
      />
      <Modal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        title="Progress qo‘shish"
      >
        <form
          className="form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            const values = Object.fromEntries(
              new FormData(event.currentTarget),
            );
            await request(`/api/students/${id}/timeline`, {
              method: "POST",
              body: JSON.stringify({
                ...values,
                value: values.value ? Number(values.value) : null,
              }),
            });
            setTimeline(await request(`/api/students/${id}/timeline`));
            setInsights(await request(`/api/students/${id}/insights`));
            setEventOpen(false);
            toast.success("Progress saqlandi");
          }}
        >
          <label className="span-2">
            Event turi
            <AppSelect name="type" defaultValue="assignment_submitted">
              <option value="assignment_created">Vazifa berildi</option>
              <option value="assignment_submitted">Vazifa topshirildi</option>
              <option value="assignment_late">Vazifa kechikdi</option>
              <option value="grade_added">Ball qo‘shildi</option>
              <option value="feedback_added">O‘qituvchi izohi</option>
            </AppSelect>
          </label>
          <label className="span-2">
            Sarlavha
            <input name="title" required />
          </label>
          <label>
            Ball / foiz
            <input name="value" type="number" min="0" max="100" />
          </label>
          <label className="span-2">
            Izoh
            <textarea name="description" rows="3" />
          </label>
          <div className="form-actions span-2">
            <button
              type="button"
              className="btn"
              onClick={() => setEventOpen(false)}
            >
              Bekor qilish
            </button>
            <button className="btn btn--primary">Saqlash</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
