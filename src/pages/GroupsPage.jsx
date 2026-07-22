import { analyticsService } from "../services/analyticsService";
import { useState } from "react";
import { Plus, Users, Clock, ArrowUpRight, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { TimePicker } from "../components/ui/TimePicker";
import { useNavigate } from "react-router-dom";
import { hydrateDB, request } from "../services/storage";
import { useConfirm } from "../components/ui/ConfirmDialog";

export function GroupsPage() {
  const confirmAction = useConfirm();
  const navigate = useNavigate();
  const { groups, students } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const close = () => { setOpen(false); setEditing(null); };
  const showCreate = () => { setEditing(null); setOpen(true); };
  const showEdit = (group) => { setEditing(group); setOpen(true); };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      await request(editing ? `/api/groups/${editing.id}` : "/api/groups", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(editing ? values : { ...values, id: crypto.randomUUID() }),
      });
      await hydrateDB();
      toast.success(editing ? "Guruh yangilandi" : "Guruh yaratildi");
      close();
    } catch {
      /* request xabarni ko‘rsatadi */
    } finally { setSaving(false); }
  };
  const remove = async (group) => {
    if (!(await confirmAction({
      title: "Guruhni o‘chirish",
      message: `“${group.name}” guruhi butunlay o‘chirilsinmi?`,
      confirmText: "O‘chirish",
    }))) return;
    try {
      await request(`/api/groups/${group.id}`, { method: "DELETE" });
      await hydrateDB();
      toast.success("Guruh o‘chirildi");
    } catch {
      /* ichida o‘quvchi bo‘lsa backend aniq xabar beradi */
    }
  };

  return <>
    <div className="page-head"><div><h2>Guruhlar</h2><p>{groups.length} ta o‘quv guruhi</p></div><button className="btn btn--primary" onClick={showCreate}><Plus /> Yangi guruh</button></div>
    <div className="groups-grid">
      {groups.map((group) => <article className="group-card" key={group.id}>
        <header><span className="group-card__color" style={{ "--group-color": group.color }} /><div className="group-card__actions"><button className="icon-btn" title="Tahrirlash" onClick={() => showEdit(group)}><Edit3 /></button><button className="icon-btn is-danger" title="O‘chirish" onClick={() => remove(group)}><Trash2 /></button></div></header>
        <h3>{group.name}</h3><p>{group.subject} · {group.teacher}</p>
        <div className="group-card__stats"><div><Users /><strong>{students.filter((student) => student.groupId === group.id).length}</strong><small>o‘quvchi</small></div><div><span className="donut-mini">{analyticsService.groupAttendance(group.id)}%</span><small>davomat</small></div></div>
        <footer><span><Clock />{group.days} · {group.start}</span></footer>
        <button className="group-card__open" onClick={() => navigate(`/groups/${group.id}`)}>Guruhni ochish <ArrowUpRight /></button>
      </article>)}
    </div>
    <Modal open={open} onClose={close} title={editing ? "Guruhni tahrirlash" : "Yangi guruh"}>
      <form className="form-grid" onSubmit={save} key={editing?.id || "new"}>
        <label>Guruh nomi<input name="name" required defaultValue={editing?.name || ""} /></label>
        <label>Fan / yo‘nalish<input name="subject" required defaultValue={editing?.subject || ""} /></label>
        <label>O‘qituvchi<input name="teacher" defaultValue={editing?.teacher || ""} /></label>
        <label>Dars kunlari<input name="days" placeholder="Du, Chor, Ju" defaultValue={editing?.days || ""} /></label>
        <label>Boshlanish<TimePicker name="start" defaultValue={editing?.start || "09:00"} /></label>
        <label>Tugash<TimePicker name="end" defaultValue={editing?.end || "11:00"} /></label>
        <label>Xona<input name="room" defaultValue={editing?.room || ""} /></label>
        <label>Oylik narx<input name="price" type="number" min="0" defaultValue={editing?.price || 0} /></label>
        <label>Rang<input name="color" type="color" defaultValue={editing?.color || "#111111"} /></label>
        <label className="span-2">Izoh<textarea name="note" rows="3" defaultValue={editing?.note || ""} /></label>
        <div className="form-actions span-2"><button type="button" className="btn" onClick={close}>Bekor</button><button className="btn btn--primary" disabled={saving}>{saving ? "Saqlanmoqda..." : editing ? "Saqlash" : "Yaratish"}</button></div>
      </form>
    </Modal>
  </>;
}
