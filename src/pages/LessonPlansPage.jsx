import { useEffect, useState } from "react";
import { BarChart3, BookOpenCheck, CircleHelp, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AppSelect } from "../components/ui/controls";
import { Modal } from "../components/ui/Modal";
import { request } from "../services/storage";
import { useConfirm } from "../components/ui/ConfirmDialog";

const dayNames = { 1: "Dushanba", 2: "Seshanba", 3: "Chorshanba", 4: "Payshanba", 5: "Juma", 6: "Shanba", 7: "Yakshanba" };
const skills = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING", "PRONUNCIATION", "QUIZ", "HOMEWORK", "OTHER"];

export function LessonPlansPage() {
  const [templates, setTemplates] = useState([]), [reasons, setReasons] = useState([]);
  const [selectedId, setSelectedId] = useState(""), [modal, setModal] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const confirmAction = useConfirm();
  const load = async () => {
    setLoading(true);
    try {
      const [nextTemplates, nextReasons] = await Promise.all([
        request("/api/admin/lesson-plan-templates"),
        request("/api/lesson-incomplete-reasons"),
      ]);
      setTemplates(nextTemplates); setReasons(nextReasons);
      setSelectedId((current) =>
        nextTemplates.some((template) => template.id === current)
          ? current
          : nextTemplates[0]?.id || "",
      );
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const selected = templates.find((template) => template.id === selectedId);

  const submitTemplate = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const editing = modal === "template-edit";
    await request(editing ? `/api/admin/lesson-plan-templates/${selected.id}` : "/api/admin/lesson-plan-templates", {
      method: editing ? "PATCH" : "POST", body: JSON.stringify({ name: data.get("name"), scheduleType: data.get("scheduleType") }),
    });
    toast.success(editing ? "Template tahrirlandi" : "Template yaratildi"); setModal(""); await load();
  };
  const submitItem = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await request(editingItem ? `/api/admin/lesson-plan-items/${editingItem.id}` : `/api/admin/lesson-plan-templates/${selectedId}/items`, {
      method: editingItem ? "PATCH" : "POST",
      body: JSON.stringify({
        weekday: Number(data.get("weekday")), title: data.get("title"), skillType: data.get("skillType"),
        description: data.get("description"), isRequired: data.get("required") === "on",
        carryOverEnabled: data.get("carry") === "on",
        orderIndex: Number(data.get("orderIndex") || 0),
      }),
    });
    toast.success(editingItem ? "Reja bandi tahrirlandi" : "Reja bandi qo‘shildi");
    setEditingItem(null); setModal(""); await load();
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
  const remove = async (path, message) => {
    if (!await confirmAction({
      title: "O‘chirishni tasdiqlang",
      message,
      confirmText: "O‘chirish",
      danger: true,
    })) return;
    await request(path, { method: "DELETE" });
    toast.success("O‘chirildi");
    await load();
  };

  return <>
    <div className="page-head"><div><h2>Dars rejalari</h2><p>Haftalik template, mavzu va bajarilmaslik sabablarini boshqarish</p></div>
      <div><button className="btn" onClick={() => setModal("guide")}><CircleHelp /> Qo‘llanma</button>
        <Link className="btn" to="/lesson-plan-report"><BarChart3 /> Hisobot</Link>
        <button className="btn btn--primary" onClick={() => setModal("template")}><Plus /> Template</button></div></div>
    {loading ? <div className="route-loader"><i /><span>Yuklanmoqda...</span></div> : <div className="lesson-admin-grid">
      <aside className="panel lesson-template-list"><header><h3>Templatelar</h3></header>
        {templates.map((template) => <button key={template.id} className={selectedId === template.id ? "active" : ""} onClick={() => setSelectedId(template.id)}>
          <BookOpenCheck /><span><strong>{template.name}</strong><small>{template.scheduleType}{template.isDefault ? " · default" : ""}</small></span>
        </button>)}</aside>
      <section className="panel lesson-template-detail">
        {selected && <><header><div><h3>{selected.name}</h3><p>{selected.scheduleType} · {selected.isActive ? "Faol" : "Nofaol"}</p></div>
          <div><button className="btn" onClick={() => setModal("template-edit")}><Pencil /> Tahrirlash</button>
          <button className="btn" onClick={() => patch(`/api/admin/lesson-plan-templates/${selected.id}`, { isActive: !selected.isActive })}><Power /> {selected.isActive ? "Nofaol qilish" : "Yoqish"}</button>
          {!selected.isDefault && <button className="btn btn--danger" onClick={() => remove(`/api/admin/lesson-plan-templates/${selected.id}`, "Template yangi darslardan o‘chadi. Eski dars yozuvlari saqlanadi.")}><Trash2 /> O‘chirish</button>}
          <button className="btn btn--primary" onClick={() => setModal("item")}><Plus /> Band</button></div></header>
          <div className="lesson-days">{selected.days.map((day) => <div className="lesson-day" key={day.id}><h4>{dayNames[day.weekday]}</h4>
            {day.items.map((item) => <div className={!item.isActive ? "inactive" : ""} key={item.id}><span>{item.skillType}</span><strong>{item.title}</strong>
              <div className="lesson-item-actions"><button className="icon-btn" title="Tahrirlash" onClick={() => { setEditingItem({ ...item, weekday: day.weekday }); setModal("item"); }}><Pencil /></button>
              <button className="icon-btn" title={item.isActive ? "Nofaol qilish" : "Faollashtirish"}
                onClick={() => patch(`/api/admin/lesson-plan-items/${item.id}`, { isActive: !item.isActive })}><Power /></button>
              <button className="icon-btn is-danger" title="O‘chirish" onClick={() => remove(`/api/admin/lesson-plan-items/${item.id}`, "Band yangi darslardan o‘chadi. Eski sessionlarda saqlanadi.")}><Trash2 /></button></div></div>)}
          </div>)}</div></>}
      </section>
      <section className="panel lesson-reasons"><header><div><h3>Bajarilmaslik sabablari</h3><p>Qisman va bajarilmadi holatlari uchun</p></div>
        <button className="btn" onClick={() => setModal("reason")}><Plus /> Sabab</button></header>
        <div>{reasons.map((reason) => <span className={!reason.isActive ? "inactive" : ""} key={reason.id}>{reason.label}
          <button className="icon-btn" onClick={() => patch(`/api/admin/lesson-incomplete-reasons/${reason.id}`, { isActive: !reason.isActive })}><Power /></button></span>)}</div>
      </section>
    </div>}
    <Modal open={modal === "template" || modal === "template-edit"} onClose={() => setModal("")} title={modal === "template-edit" ? "Templateni tahrirlash" : "Yangi template"}><form className="modal-form" onSubmit={submitTemplate}>
      <label>Nomi<input name="name" defaultValue={modal === "template-edit" ? selected?.name : ""} required /></label><label>Jadval turi<AppSelect name="scheduleType" defaultValue={modal === "template-edit" ? selected?.scheduleType : "CUSTOM"}><option value="MON_WED_FRI">Du-Chor-Ju</option><option value="TUE_THU_SAT">Se-Pa-Sh</option><option value="CUSTOM">Maxsus</option></AppSelect></label>
      <footer><button className="btn" type="button" onClick={() => setModal("")}>Bekor qilish</button><button className="btn btn--primary">{modal === "template-edit" ? "Saqlash" : "Yaratish"}</button></footer></form></Modal>
    <Modal open={modal === "item"} onClose={() => { setModal(""); setEditingItem(null); }} title={editingItem ? "Reja bandini tahrirlash" : "Reja bandi"}><form className="modal-form" onSubmit={submitItem}>
      {!editingItem && <label>Kun<AppSelect name="weekday" defaultValue="1">{Object.entries(dayNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</AppSelect></label>}
      <label>Mavzu<input name="title" defaultValue={editingItem?.title || ""} required /></label><label>Ko‘nikma<AppSelect name="skillType" defaultValue={editingItem?.skillType || "GRAMMAR"}>{skills.map((skill) => <option key={skill}>{skill}</option>)}</AppSelect></label>
      <label>Tavsif<textarea name="description" defaultValue={editingItem?.description || ""} /></label><label>Tartib raqami<input type="number" min="0" name="orderIndex" defaultValue={editingItem?.orderIndex || 0} /></label>
      <label><input type="checkbox" name="required" defaultChecked={editingItem?.isRequired ?? true} /> Majburiy</label><label><input type="checkbox" name="carry" defaultChecked={editingItem?.carryOverEnabled ?? true} /> Keyingi darsga ko‘chirish mumkin</label>
      <footer><button className="btn btn--primary">{editingItem ? "Saqlash" : "Qo‘shish"}</button></footer></form></Modal>
    <Modal open={modal === "reason"} onClose={() => setModal("")} title="Yangi sabab"><form className="modal-form" onSubmit={submitReason}>
      <label>Sabab nomi<input name="label" required /></label><footer><button className="btn btn--primary">Qo‘shish</button></footer></form></Modal>
    <Modal open={modal === "guide"} onClose={() => setModal("")} title="Dars rejasidan foydalanish" wide>
      <div className="lesson-guide">
        <section><b>1</b><div><h3>Template tayyorlang</h3><p>Dars rejalari sahifasida mavjud Du–Chor–Ju yoki Se–Pa–Sh templateni ishlating. Kerak bo‘lsa yangi template va kunlik bandlar qo‘shing.</p></div></section>
        <section><b>2</b><div><h3>Guruhga biriktiring</h3><p>Guruh profilini ochib, template hamda amal qilish boshlanish va tugash sanasini belgilang.</p></div></section>
        <section><b>3</b><div><h3>Davomatni saqlang</h3><p>Yo‘qlama sahifasida guruh va sanani tanlab, o‘quvchilar holatini belgilang. Dars rejasi faqat davomat saqlangandan keyin ochiladi.</p></div></section>
        <section><b>4</b><div><h3>Reja bandlarini belgilang</h3><p>Har bir bandga Bajarildi, Qisman yoki Bajarilmadi statusini bering. Qisman va Bajarilmadi holatlarida sabab tanlash majburiy.</p></div></section>
        <section><b>5</b><div><h3>Carry-over va yakunlash</h3><p>Keyingi darsga ko‘chiriladigan bandni belgilang, qisqa izoh yozing va “Rejani yakunlash”ni bosing.</p></div></section>
        <section><b>6</b><div><h3>Natijalarni kuzating</h3><p>Dars rejasi hisobotida sana, guruh, o‘qituvchi, status va jadval bo‘yicha real bajarilish natijalarini ko‘ring.</p></div></section>
        <footer><button className="btn btn--primary" onClick={() => setModal("")}>Tushunarli</button></footer>
      </div>
    </Modal>
  </>;
}
