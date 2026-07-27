import { useEffect, useState } from "react";
import { BarChart3, BookOpenCheck, Plus, Power } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AppSelect } from "../components/ui/controls";
import { Modal } from "../components/ui/Modal";
import { request } from "../services/storage";

const dayNames = { 1: "Dushanba", 2: "Seshanba", 3: "Chorshanba", 4: "Payshanba", 5: "Juma", 6: "Shanba", 7: "Yakshanba" };
const skills = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING", "PRONUNCIATION", "QUIZ", "HOMEWORK", "OTHER"];

export function LessonPlansPage() {
  const [templates, setTemplates] = useState([]), [reasons, setReasons] = useState([]);
  const [selectedId, setSelectedId] = useState(""), [modal, setModal] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const [nextTemplates, nextReasons] = await Promise.all([
        request("/api/admin/lesson-plan-templates"),
        request("/api/lesson-incomplete-reasons"),
      ]);
      setTemplates(nextTemplates); setReasons(nextReasons);
      setSelectedId((current) => current || nextTemplates[0]?.id || "");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const selected = templates.find((template) => template.id === selectedId);

  const submitTemplate = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await request("/api/admin/lesson-plan-templates", {
      method: "POST", body: JSON.stringify({ name: data.get("name"), scheduleType: data.get("scheduleType") }),
    });
    toast.success("Template yaratildi"); setModal(""); await load();
  };
  const submitItem = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await request(`/api/admin/lesson-plan-templates/${selectedId}/items`, {
      method: "POST",
      body: JSON.stringify({
        weekday: Number(data.get("weekday")), title: data.get("title"), skillType: data.get("skillType"),
        description: data.get("description"), isRequired: data.get("required") === "on",
        carryOverEnabled: data.get("carry") === "on",
      }),
    });
    toast.success("Reja bandi qo‘shildi"); setModal(""); await load();
  };
  const submitReason = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await request("/api/admin/lesson-incomplete-reasons", {
      method: "POST", body: JSON.stringify({ label: data.get("label") }),
    });
    toast.success("Sabab qo‘shildi"); setModal(""); await load();
  };
  const patch = async (path, body) => {
    await request(path, { method: "PATCH", body: JSON.stringify(body) });
    await load();
  };

  return <>
    <div className="page-head"><div><h2>Dars rejalari</h2><p>Haftalik template, mavzu va bajarilmaslik sabablarini boshqarish</p></div>
      <div><Link className="btn" to="/lesson-plan-report"><BarChart3 /> Hisobot</Link>
        <button className="btn btn--primary" onClick={() => setModal("template")}><Plus /> Template</button></div></div>
    {loading ? <div className="route-loader"><i /><span>Yuklanmoqda...</span></div> : <div className="lesson-admin-grid">
      <aside className="panel lesson-template-list"><header><h3>Templatelar</h3></header>
        {templates.map((template) => <button key={template.id} className={selectedId === template.id ? "active" : ""} onClick={() => setSelectedId(template.id)}>
          <BookOpenCheck /><span><strong>{template.name}</strong><small>{template.scheduleType}{template.isDefault ? " · default" : ""}</small></span>
        </button>)}</aside>
      <section className="panel lesson-template-detail">
        {selected && <><header><div><h3>{selected.name}</h3><p>{selected.scheduleType} · {selected.isActive ? "Faol" : "Nofaol"}</p></div>
          <div><button className="btn" onClick={() => patch(`/api/admin/lesson-plan-templates/${selected.id}`, { isActive: !selected.isActive })}><Power /> {selected.isActive ? "O‘chirish" : "Yoqish"}</button>
          <button className="btn btn--primary" onClick={() => setModal("item")}><Plus /> Band</button></div></header>
          <div className="lesson-days">{selected.days.map((day) => <div className="lesson-day" key={day.id}><h4>{dayNames[day.weekday]}</h4>
            {day.items.map((item) => <div className={!item.isActive ? "inactive" : ""} key={item.id}><span>{item.skillType}</span><strong>{item.title}</strong>
              <button className="icon-btn" title={item.isActive ? "Nofaol qilish" : "Faollashtirish"}
                onClick={() => patch(`/api/admin/lesson-plan-items/${item.id}`, { isActive: !item.isActive })}><Power /></button></div>)}
          </div>)}</div></>}
      </section>
      <section className="panel lesson-reasons"><header><div><h3>Bajarilmaslik sabablari</h3><p>Qisman va bajarilmadi holatlari uchun</p></div>
        <button className="btn" onClick={() => setModal("reason")}><Plus /> Sabab</button></header>
        <div>{reasons.map((reason) => <span className={!reason.isActive ? "inactive" : ""} key={reason.id}>{reason.label}
          <button className="icon-btn" onClick={() => patch(`/api/admin/lesson-incomplete-reasons/${reason.id}`, { isActive: !reason.isActive })}><Power /></button></span>)}</div>
      </section>
    </div>}
    <Modal open={modal === "template"} onClose={() => setModal("")} title="Yangi template"><form className="modal-form" onSubmit={submitTemplate}>
      <label>Nomi<input name="name" required /></label><label>Jadval turi<AppSelect name="scheduleType" defaultValue="CUSTOM"><option value="MON_WED_FRI">Du-Chor-Ju</option><option value="TUE_THU_SAT">Se-Pa-Sh</option><option value="CUSTOM">Maxsus</option></AppSelect></label>
      <footer><button className="btn" type="button" onClick={() => setModal("")}>Bekor qilish</button><button className="btn btn--primary">Yaratish</button></footer></form></Modal>
    <Modal open={modal === "item"} onClose={() => setModal("")} title="Reja bandi"><form className="modal-form" onSubmit={submitItem}>
      <label>Kun<AppSelect name="weekday" defaultValue="1">{Object.entries(dayNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</AppSelect></label>
      <label>Mavzu<input name="title" required /></label><label>Ko‘nikma<AppSelect name="skillType" defaultValue="GRAMMAR">{skills.map((skill) => <option key={skill}>{skill}</option>)}</AppSelect></label>
      <label>Tavsif<textarea name="description" /></label><label><input type="checkbox" name="required" defaultChecked /> Majburiy</label><label><input type="checkbox" name="carry" defaultChecked /> Keyingi darsga ko‘chirish mumkin</label>
      <footer><button className="btn btn--primary">Qo‘shish</button></footer></form></Modal>
    <Modal open={modal === "reason"} onClose={() => setModal("")} title="Yangi sabab"><form className="modal-form" onSubmit={submitReason}>
      <label>Sabab nomi<input name="label" required /></label><footer><button className="btn btn--primary">Qo‘shish</button></footer></form></Modal>
  </>;
}
