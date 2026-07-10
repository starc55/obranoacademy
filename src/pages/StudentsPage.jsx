import { analyticsService } from "../services/analyticsService";
import { studyDuration } from "../utils/studyDuration";
import { AppSelect } from "../components/ui/AppSelect";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Upload,
  Download,
  MoreHorizontal,
  Trash2,
  Edit3,
  Copy,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { studentsService } from "../services/studentsService";
import { StudentForm } from "../components/students/StudentForm";
import { StatusBadge } from "../components/shared/StatusBadge";
import { ImportModal } from "../components/students/ImportModal";
import { importExportService } from "../services/importExportService";
export function StudentsPage() {
  const { students, groups } = useApp(),
    [q, setQ] = useState(""),
    [group, setGroup] = useState("all"),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState([]),
    [edit, setEdit] = useState(null),
    [add, setAdd] = useState(false),
    [imp, setImp] = useState(false),
    [page, setPage] = useState(1),
    navigate = useNavigate();
  const rows = useMemo(
      () =>
        students.filter(
          (s) =>
            (s.fullName + s.phone).toLowerCase().includes(q.toLowerCase()) &&
            (group === "all" || s.groupId === group) &&
            (status === "all" || s.status === status)
        ),
      [students, q, group, status]
    ),
    shown = rows.slice((page - 1) * 10, page * 10),
    toggle = (id) =>
      setSelected((x) =>
        x.includes(id) ? x.filter((y) => y !== id) : [...x, id]
      );
  const remove = (ids) => {
    if (confirm(`${ids.length} ta o‘quvchi o‘chirilsinmi?`)) {
      ids.forEach(studentsService.remove);
      setSelected([]);
      toast.success("O‘quvchi o‘chirildi");
    }
  };
  const copy = async () => {
    const data = students
      .filter((s) => selected.includes(s.id))
      .map(
        (s) =>
          `${s.fullName}\t${s.phone}\t${
            groups.find((g) => g.id === s.groupId)?.name
          }\t${s.monthlyFee}`
      )
      .join("\n");
    await navigator.clipboard.writeText(data);
    toast.success("Tanlangan qatorlar nusxalandi");
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h2>O‘quvchilar</h2>
          <p>{students.length} nafar o‘quvchini boshqaring</p>
        </div>
        <div>
          <button className="btn" onClick={() => setImp(true)}>
            <Upload /> Import
          </button>
          <button
            className="btn"
            onClick={() =>
              importExportService.exportExcel(rows, "oquvchilar.xlsx")
            }
          >
            <Download /> Export
          </button>
          <button className="btn btn--primary" onClick={() => setAdd(true)}>
            <Plus /> Yangi o‘quvchi
          </button>
        </div>
      </div>
      <section className="table-card">
        <div className="table-tools">
          <label className="searchbox">
            <Search />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Ism yoki telefon..."
            />
          </label>
          <AppSelect value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">Barcha guruhlar</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </AppSelect>
          <AppSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Barcha holatlar</option>
            <option value="active">Faol</option>
            <option value="inactive">Noaktiv</option>
          </AppSelect>
          {selected.length > 0 && (
            <div className="bulk">
              <strong>{selected.length} tanlandi</strong>
              <button onClick={copy}>
                <Copy />
              </button>
              <button onClick={() => remove(selected)}>
                <Trash2 />
              </button>
            </div>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      shown.length > 0 &&
                      shown.every((s) => selected.includes(s.id))
                    }
                    onChange={() =>
                      setSelected(
                        shown.every((s) => selected.includes(s.id))
                          ? []
                          : shown.map((s) => s.id)
                      )
                    }
                  />
                </th>
                <th>O‘quvchi</th>
                <th>Telefon</th>
                <th>Guruh</th>
                <th>Qo‘shilgan</th>
                <th>Davomat</th>
                <th>To‘lov</th>
                <th>Holati</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((s, i) => (
                <tr
                  key={s.id}
                  onDoubleClick={() => navigate(`/students/${s.id}`)}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                  </td>
                  <td>
                    <div className="person">
                      <div className="avatar avatar--soft">
                        {s.firstName[0]}
                        {s.lastName[0]}
                      </div>
                      <div>
                        <strong>{s.fullName}</strong>
                        <small>{s.note || "Izoh yo‘q"}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {s.phone}
                    <small>{s.parentPhone}</small>
                  </td>
                  <td>
                    <span
                      className="group-dot"
                      style={{
                        "--dot": groups.find((g) => g.id === s.groupId)?.color,
                      }}
                    />
                    {groups.find((g) => g.id === s.groupId)?.name}
                  </td>
                  <td>{s.joinedDate}<small>{studyDuration(s.joinedDate)} o‘qiyapti</small></td>
                  <td>
                    <strong>{analyticsService.studentAttendance(s.id)}%</strong>
                    <div className="progress">
                      <i
                        style={{
                          "--w": `${analyticsService.studentAttendance(s.id)}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <StatusBadge
                      status={analyticsService.studentPaymentStatus(s.id)}
                    />
                  </td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => setEdit(s)}>
                        <Edit3 />
                      </button>
                      <button onClick={() => remove([s.id])}>
                        <Trash2 />
                      </button>
                      <button>
                        <MoreHorizontal />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <div className="empty">
              <PackageOpen className="empty-icon" />
              <h3>O‘quvchilar topilmadi</h3>
              <p>Filterlarni o‘zgartiring yoki yangi o‘quvchi qo‘shing.</p>
            </div>
          )}
        </div>
        <footer className="pagination">
          <span>
            {rows.length} tadan {(page - 1) * 10 + 1}–
            {Math.min(page * 10, rows.length)}
          </span>
          <div>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft />
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(rows.length / 10))}
            </span>
            <button
              disabled={page >= Math.ceil(rows.length / 10)}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight />
            </button>
          </div>
        </footer>
      </section>
      <StudentForm
        open={add || !!edit}
        student={edit}
        onClose={() => {
          setAdd(false);
          setEdit(null);
        }}
      />
      <ImportModal open={imp} onClose={() => setImp(false)} />
    </>
  );
}
function UsersIcon() {
  return <span className="empty__icon">◎</span>;
}
