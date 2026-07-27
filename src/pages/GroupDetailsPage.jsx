import {
  ArrowLeft,
  Users,
  TrendingUp,
  Wallet,
  CalendarDays,
  Phone,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { analyticsService } from "../services/analyticsService";
import { StatusBadge } from "../components/shared/StatusBadge";
import { AppSelect, DatePicker } from "../components/ui/controls";
import { request } from "../services/storage";
export function GroupDetailsPage() {
  const { id } = useParams(),
    nav = useNavigate(),
    { groups, students, attendance, payments } = useApp(),
    group = groups.find((g) => g.id === id),
    [planSettings, setPlanSettings] = useState(null),
    [templateId, setTemplateId] = useState(""),
    [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10)),
    [effectiveTo, setEffectiveTo] = useState("");
  const loadPlan = useCallback(() => request(`/api/groups/${id}/lesson-plan`).then((data) => {
    setPlanSettings(data);
    setTemplateId(data.currentTemplate?.id || data.templates?.[0]?.id || "");
  }).catch(() => setPlanSettings(null)), [id]);
  useEffect(() => { loadPlan(); }, [loadPlan]);
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
      {planSettings && <section className="panel group-plan-setting">
        <header><div><h3>Dars rejasi template’i</h3><p>Hozir: {planSettings.currentTemplate?.name || "Belgilanmagan"} · {planSettings.scheduleType}</p></div></header>
        <div className="group-plan-form"><label>Template<AppSelect value={templateId} onValueChange={setTemplateId}>
          {planSettings.templates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}
        </AppSelect></label><label>Amal qilish sanasi<DatePicker value={effectiveFrom} onValueChange={setEffectiveFrom} /></label>
          <label>Tugash sanasi (ixtiyoriy)<DatePicker value={effectiveTo} onValueChange={setEffectiveTo} /></label>
          <button className="btn btn--primary" onClick={async () => {
            await request(`/api/groups/${id}/lesson-plan`, { method: "PATCH", body: JSON.stringify({ templateId, effectiveFrom, effectiveTo: effectiveTo || null }) });
            toast.success("Guruh dars rejasi yangilandi"); await loadPlan();
          }}>Saqlash</button></div>
      </section>}
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
                    new Date(`${s.date}T00:00:00`),
                  )}
                </span>
                <strong>
                  {s.records.filter((r) => r.status === "entered").length}/
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
