import { useState } from "react";
import { ArrowRight, Check, CheckCheck, CircleMinus, Clock3, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppSelect } from "../ui/controls";
import { request } from "../../services/storage";

const statuses = [
  ["COMPLETED", "Bajarildi", Check],
  ["PARTIAL", "Qisman", CircleMinus],
  ["NOT_COMPLETED", "Bajarilmadi", RotateCcw],
  ["NOT_APPLICABLE", "Tegishli emas", Clock3],
];
const needsReason = (status) => status === "PARTIAL" || status === "NOT_COMPLETED";

export function LessonPlanPanel({ plan, loading, onReload }) {
  const [busy, setBusy] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  if (loading) return <section className="lesson-plan-panel">Dars rejasi yuklanmoqda...</section>;
  if (!plan) return null;
  const locked = plan.status === "COMPLETED", reasons = plan.reasons || [];
  const completionBlocked = plan.items.some((item) =>
    (item.isRequired && !item.status) ||
    (needsReason(item.status) && !item.incompleteReasonId) ||
    (reasons.find((reason) => reason.id === item.incompleteReasonId)?.code === "OTHER" && !item.customReason?.trim()),
  );

  const saveItem = async (item, patch) => {
    const next = { ...item, ...patch };
    onReload({ ...plan, items: plan.items.map((row) => row.id === item.id ? next : row) });
    if (needsReason(next.status) && !next.incompleteReasonId) return;
    setBusy(item.id);
    try {
      await request(`/api/lesson-session-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: next.status,
          incompleteReasonId: needsReason(next.status) ? next.incompleteReasonId : null,
          customReason: next.customReason || "",
          teacherNote: next.teacherNote || "",
          carryOverToNext: Boolean(next.carryOverToNext),
        }),
      });
      await onReload();
    } catch (error) {
      toast.error(error.message);
      await onReload();
    } finally { setBusy(""); }
  };

  const itemView = (item) => (
    <article className={`lesson-plan-item ${item.sourceSessionItemId ? "is-carried" : ""}`} key={item.id}>
      <div className="lesson-plan-item__main">
        <div><span className="lesson-plan-skill">{item.skillTypeSnapshot}</span><h4>{item.titleSnapshot}</h4><p>{item.descriptionSnapshot}</p></div>
        {item.sourceSessionItemId && <span className="carry-badge"><ArrowRight /> {item.carryOverCount}. ko‘chirish</span>}
      </div>
      <div className="lesson-statuses">
        {statuses.filter(([value]) => value !== "NOT_APPLICABLE" || !item.isRequired).map(([value, label, Icon]) => (
          <button type="button" key={value} disabled={locked || busy === item.id}
            className={item.status === value ? "active" : ""} onClick={() => saveItem(item, {
              status: value,
              carryOverToNext: ["PARTIAL", "NOT_COMPLETED"].includes(value)
                ? item.carryOverEnabled
                : false,
            })}>
            <Icon /> {label}
          </button>
        ))}
      </div>
      {needsReason(item.status) && <div className="lesson-item-fields">
        <label>Sabab<AppSelect value={item.incompleteReasonId || ""} disabled={locked}
          onValueChange={(incompleteReasonId) => saveItem(item, { incompleteReasonId })}>
          <option value="">Sababni tanlang</option>
          {reasons.filter((reason) => reason.isActive).map((reason) => <option value={reason.id} key={reason.id}>{reason.label}</option>)}
        </AppSelect></label>
        {reasons.find((reason) => reason.id === item.incompleteReasonId)?.code === "OTHER" && <label>Boshqa sabab
          <input value={item.customReason || ""} disabled={locked} maxLength={240}
            onChange={(event) => onReload({ ...plan, items: plan.items.map((row) => row.id === item.id ? { ...row, customReason: event.target.value } : row) })}
            onBlur={(event) => saveItem(item, { customReason: event.currentTarget.value })} />
        </label>}
        <label>Qisqa izoh<input value={item.teacherNote || ""} disabled={locked} maxLength={500}
          onChange={(event) => onReload({ ...plan, items: plan.items.map((row) => row.id === item.id ? { ...row, teacherNote: event.target.value } : row) })}
          onBlur={(event) => saveItem(item, { teacherNote: event.currentTarget.value })} /></label>
        {item.carryOverEnabled && <label className="lesson-carry-check"><input type="checkbox"
          checked={Boolean(item.carryOverToNext)} disabled={locked}
          onChange={(event) => saveItem(item, { carryOverToNext: event.target.checked })} />Keyingi darsga ko‘chirish</label>}
      </div>}
    </article>
  );

  const action = async (path, body, success) => {
    setBusy("session");
    try {
      await request(path, { method: "POST", body: JSON.stringify(body) });
      toast.success(success);
      await onReload();
    } catch (error) { toast.error(error.message); }
    finally { setBusy(""); }
  };
  const addItem = async () => {
    if (!customTitle.trim()) return;
    await action(`/api/lesson-sessions/${plan.id}/items`, { title: customTitle.trim(), skillType: "OTHER" }, "Band qo‘shildi");
    setCustomTitle("");
  };
  const groups = [
    ["Oldingi darsdan qolgan vazifalar", plan.items.filter((item) => item.sourceSessionItemId)],
    ["Bugungi dars rejasi", plan.items.filter((item) => !item.sourceSessionItemId)],
  ];
  return <section className="lesson-plan-panel">
    <div className="lesson-plan-head"><div><span className="eyebrow">Dars rejasi bajarilishi</span><h3>{plan.templateName}</h3><p>{plan.groupName} · {plan.lessonDate}</p></div>
      <span className={`plan-state plan-state--${plan.status.toLowerCase()}`}>{locked ? "Yakunlangan" : "Jarayonda"}</span></div>
    {groups.map(([title, items]) => items.length > 0 && <div className="lesson-plan-section" key={title}><h3>{title}</h3><div className="lesson-plan-items">{items.map(itemView)}</div></div>)}
    {!locked && <div className="lesson-custom-item"><input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="Shu dars uchun qo‘shimcha band" />
      <button className="btn" onClick={addItem} disabled={busy === "session"}><Plus /> Qo‘shish</button></div>}
    <div className="lesson-plan-footer"><label>O‘qituvchi izohi<textarea rows="2" value={plan.teacherNote || ""} disabled={locked}
      onChange={(event) => onReload({ ...plan, teacherNote: event.target.value })} /></label>
      {locked
        ? <button className="btn" onClick={() => action(`/api/lesson-sessions/${plan.id}/reopen-plan`, { reason: "Tahrirlash uchun qayta ochildi" }, "Reja qayta ochildi")}><RotateCcw /> Qayta ochish</button>
        : <button className="btn btn--primary" disabled={completionBlocked || busy === "session"}
          title={completionBlocked ? "Barcha majburiy band va sabablarni belgilang" : ""}
          onClick={() => action(`/api/lesson-sessions/${plan.id}/complete-plan`, { teacherNote: plan.teacherNote }, "Dars rejasi yakunlandi")}><CheckCheck /> Rejani yakunlash</button>}
    </div>
  </section>;
}
