import { analyticsService } from "../services/analyticsService";
import { useState } from "react";
import { Plus, Users, Clock, MapPin, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { groupsService } from "../services/groupsService";
import { Modal } from "../components/ui/Modal";
import { TimePicker } from "../components/ui/TimePicker";
import { useNavigate } from "react-router-dom";
export function GroupsPage() {
  const navigate = useNavigate();
  const { groups, students } = useApp(),
    [open, setOpen] = useState(false);
  const add = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    groupsService.create(Object.fromEntries(f));
    toast.success("Guruh yaratildi");
    setOpen(false);
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Guruhlar</h2>
          <p>{groups.length} ta faol o‘quv guruhi</p>
        </div>
        <button className="btn btn--primary" onClick={() => setOpen(true)}>
          <Plus /> Yangi guruh
        </button>
      </div>
      <div className="groups-grid">
        {groups.map((g) => (
          <article className="group-card" key={g.id}>
            <header>
              <span
                className="group-card__color"
                style={{ "--group-color": g.color }}
              />
              <span className="badge badge--active">Faol</span>
            </header>
            <h3>{g.name}</h3>
            <p>
              {g.subject} · {g.teacher}
            </p>
            <div className="group-card__stats">
              <div>
                <Users />
                <strong>
                  {students.filter((s) => s.groupId === g.id).length}
                </strong>
                <small>o‘quvchi</small>
              </div>
              <div>
                <span className="donut-mini">
                  {analyticsService.groupAttendance(g.id)}%
                </span>
                <small>davomat</small>
              </div>
            </div>
            <footer>
              <span>
                <Clock />
                {g.days} · {g.start}
              </span>
            </footer>
            <button
              className="group-card__open"
              onClick={() => navigate(`/groups/${g.id}`)}
            >
              Guruhni ochish <ArrowUpRight />
            </button>
          </article>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Yangi guruh">
        <form className="form-grid" onSubmit={add}>
          <label>
            Guruh nomi
            <input name="name" required />
          </label>
          <label>
            Fan / yo‘nalish
            <input name="subject" required />
          </label>
          <label>
            O‘qituvchi
            <input name="teacher" />
          </label>
          <label>
            Dars kunlari
            <input name="days" placeholder="Du, Chor, Ju" />
          </label>
          <label>
            Boshlanish
            <TimePicker name="start" defaultValue="09:00" />
          </label>
          <label>
            Tugash
            <TimePicker name="end" defaultValue="11:00" />
          </label>
          <label>
            Oylik narx
            <input name="price" type="number" />
          </label>
          <label>
            Rang
            <input name="color" type="color" defaultValue="#111111" />
          </label>
          <div className="form-actions span-2">
            <button
              type="button"
              className="btn"
              onClick={() => setOpen(false)}
            >
              Bekor
            </button>
            <button className="btn btn--primary">Yaratish</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
