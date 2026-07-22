import { analyticsService } from "../services/analyticsService";
import { studyDuration } from "../utils/studyDuration";
import { AppSelect } from "../components/ui/AppSelect";
import { useEffect, useMemo, useState } from "react";
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
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { studentsService } from "../services/studentsService";
import { StudentForm } from "../components/students/StudentForm";
import { StatusBadge } from "../components/shared/StatusBadge";
import { ImportModal } from "../components/students/ImportModal";
import { importExportService } from "../services/importExportService";
import { hydrateDB, request } from "../services/storage";
import { useConfirm } from "../components/ui/ConfirmDialog";
const matchesMastery = (score, mastery) => {
  if (mastery === "all") return true;
  if (mastery === "no_data") return score == null;
  if (score == null) return false;
  if (mastery === "excellent") return score >= 80;
  if (mastery === "satisfactory") return score >= 60 && score < 80;
  if (mastery === "attention") return score >= 30 && score < 60;
  if (mastery === "critical") return score < 30;
  return true;
};
export function StudentsPage() {
  const confirmAction = useConfirm();
  const { students, groups, attendance, payments } = useApp(),
    [q, setQ] = useState(""),
    [group, setGroup] = useState("all"),
    [status, setStatus] = useState("all"),
    [mastery, setMastery] = useState("all"),
    [insightScores, setInsightScores] = useState({}),
    [studentInsights, setStudentInsights] = useState({}),
    [submissionStats, setSubmissionStats] = useState({}),
    [selected, setSelected] = useState([]),
    [edit, setEdit] = useState(null),
    [actionMenu, setActionMenu] = useState(null),
    [add, setAdd] = useState(false),
    [imp, setImp] = useState(false),
    [page, setPage] = useState(1),
    navigate = useNavigate();
  useEffect(() => {
    request("/api/insights/overview")
      .then((result) => {
        const details = Object.fromEntries(
          (result.students || []).map((item) => [item.id, item]),
        );
        setStudentInsights(details);
        setInsightScores(
          Object.fromEntries(
            (result.students || []).map((item) => [
              item.id,
              item.health?.score ?? null,
            ]),
          ),
        );
      })
      .catch(() => {
        setStudentInsights({});
        setInsightScores({});
      });
  }, [students]);
  useEffect(() => {
    request("/api/admin/students")
      .then((rows) =>
        setSubmissionStats(Object.fromEntries(rows.map((row) => [row.id, row])))
      )
      .catch(() => setSubmissionStats({}));
  }, [students]);
  const rows = useMemo(
      () =>
        students.filter(
          (s) =>
            (s.fullName + s.phone).toLowerCase().includes(q.toLowerCase()) &&
            (group === "all" ||
              (group === "individual"
                ? s.enrollmentType === "individual"
                : s.groupId === group)) &&
            (status === "all" ||
              (s.accountStatus || "NOT_ACTIVATED") === status) &&
            matchesMastery(insightScores[s.id], mastery)
        ),
      [students, q, group, status, mastery, insightScores]
    ),
    shown = rows.slice((page - 1) * 10, page * 10),
    toggle = (id) =>
      setSelected((x) =>
        x.includes(id) ? x.filter((y) => y !== id) : [...x, id]
      );
  const remove = async (ids) => {
    if (await confirmAction({
      title: "O‘quvchini o‘chirish",
      message: `${ids.length} ta o‘quvchi va unga bog‘liq ma’lumotlar o‘chirilsinmi?`,
      confirmText: "O‘chirish",
    })) {
      ids.forEach(studentsService.remove);
      setSelected([]);
      toast.success("O‘quvchi o‘chirildi");
    }
  };
  const prepareActivation = async (student) => {
    setActionMenu(null);
    if (student.accountStatus === "ACTIVE") {
      toast.info("Bu o‘quvchi allaqachon faol");
      return;
    }
    try {
      if (student.accountStatus === "BLOCKED") {
        await request(`/api/admin/students/${student.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "NOT_ACTIVATED" }),
        });
        await hydrateDB();
      }
      setEdit({ ...student, accountStatus: "NOT_ACTIVATED" });
    } catch {
      /* request xabarni ko‘rsatadi */
    }
  };
  const deactivate = async (student) => {
    setActionMenu(null);
    if (student.accountStatus === "BLOCKED") {
      toast.info("Bu o‘quvchi allaqachon faollikdan chiqarilgan");
      return;
    }
    if (!(await confirmAction({
      title: "Faollikni bekor qilish",
      message: `${student.fullName} faollikdan chiqarilsinmi? O‘quvchi student panelga kira olmaydi.`,
      confirmText: "Faollikdan chiqarish",
    }))) return;
    try {
      await request(`/api/admin/students/${student.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "BLOCKED" }),
      });
      await hydrateDB();
      toast.success("O‘quvchi faollikdan chiqarildi");
    } catch {
      /* request xabarni ko‘rsatadi */
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
  const exportAnalytics = (studentRows, fileName) => {
    if (!studentRows.length) {
      toast.error("Yuklash uchun o‘quvchi tanlanmagan");
      return;
    }
    const ids = new Set(studentRows.map((student) => student.id)),
      statusNames = {
        entered: "Kirdi",
        not_entered: "Kirmadi",
        late: "Kechikdi",
        excused: "Sababli",
        left: "Erta ketdi",
      },
      summary = studentRows.map((student) => {
        const insight = studentInsights[student.id],
          submission = submissionStats[student.id],
          groupName =
            student.enrollmentType === "individual"
              ? "Individual"
              : groups.find((item) => item.id === student.groupId)?.name ||
                "Guruh belgilanmagan";
        return {
          "Ism-familiya": student.fullName,
          Nickname: student.nickname || "—",
          Telefon: student.phone || "—",
          "O‘qiydi": groupName,
          "Qo‘shilgan sana": student.joinedDate || "—",
          "Davomat (%)": analyticsService.studentAttendance(student.id),
          "O‘zlashtirish / Health Score (%)": insight?.health?.score ?? "—",
          "Risk holati": insight?.risk?.label || "—",
          "Risk sabablari":
            insight?.risk?.reasons?.map((reason) => reason.title).join("; ") || "—",
          "Yuborilgan vazifalar": submission?.totalSubmissions || 0,
          "Vazifalar o‘rtacha bali": submission?.averageScore || 0,
          "To‘lov holati": analyticsService.studentPaymentStatus(student.id),
          "Oylik to‘lov": Number(student.monthlyFee || 0),
          "Hisob holati": student.accountStatus || "NOT_ACTIVATED",
        };
      }),
      attendanceRows = attendance.flatMap((session) =>
        (session.records || [])
          .filter((record) => ids.has(record.studentId))
          .map((record) => {
            const student = studentRows.find((item) => item.id === record.studentId);
            return {
              Sana: session.date,
              "Ism-familiya": student?.fullName || "—",
              Holati: statusNames[record.status] || record.status,
              Izoh: record.note || "",
            };
          }),
      ),
      paymentRows = payments
        .filter((payment) => ids.has(payment.studentId))
        .map((payment) => {
          const student = studentRows.find((item) => item.id === payment.studentId);
          return {
            Sana: payment.paidDate || payment.date || "—",
            Oy: payment.month || "—",
            "Ism-familiya": student?.fullName || "—",
            Summa: Number(payment.amount || 0),
            Holati: payment.status || "—",
            "To‘lov turi": payment.method || "—",
          };
        });
    importExportService.exportWorkbook(
      {
        "Umumiy analitika": summary,
        Davomat: attendanceRows,
        "To‘lovlar": paymentRows,
      },
      fileName,
    );
    toast.success(`${studentRows.length} ta o‘quvchi analitikasi yuklandi`);
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
            onClick={() => exportAnalytics(students, "barcha-oquvchilar-analitikasi.xlsx")}
          >
            <Download /> Barcha analitika
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
          <AppSelect
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Barcha ta’lim turlari</option>
            <option value="individual">Individual</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </AppSelect>
          <AppSelect
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Barcha holatlar</option>
            <option value="NOT_ACTIVATED">Faollashtirilmagan</option>
            <option value="ACTIVE">Faol</option>
            <option value="BLOCKED">Bloklangan</option>
          </AppSelect>
          <AppSelect
            value={mastery}
            onChange={(e) => {
              setMastery(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Barcha o‘zlashtirish</option>
            <option value="excellent">A’lo · 80–100%</option>
            <option value="satisfactory">Qoniqarli · 60–79%</option>
            <option value="attention">E’tibor kerak · 30–59%</option>
            <option value="critical">Kritik · 0–29%</option>
            <option value="no_data">Ma’lumot yetarli emas</option>
          </AppSelect>
          {selected.length > 0 && (
            <div className="bulk">
              <strong>{selected.length} tanlandi</strong>
              <button onClick={copy}>
                <Copy />
              </button>
              <button
                title="Tanlanganlar analitikasini yuklash"
                onClick={() =>
                  exportAnalytics(
                    students.filter((student) => selected.includes(student.id)),
                    "tanlangan-oquvchilar-analitikasi.xlsx",
                  )
                }
              >
                <Download />
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
                <th>O‘qiydi</th>
                <th>Qo‘shilgan</th>
                <th>Davomat</th>
                <th>O‘zlashtirish</th>
                <th>Vazifalar</th>
                <th>To‘lov</th>
                <th>Holati</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
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
                        <small>
                          {s.nickname
                            ? `@${s.nickname}`
                            : "Nickname belgilanmagan"}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {s.phone}
                    <small>{s.email || s.parentPhone}</small>
                  </td>
                  <td>
                    {s.enrollmentType === "individual" ? (
                      "Individual"
                    ) : (
                      <>
                        <span
                          className="group-dot"
                          style={{
                            "--dot": groups.find((g) => g.id === s.groupId)
                              ?.color,
                          }}
                        />
                        {groups.find((g) => g.id === s.groupId)?.name ||
                          "Guruh belgilanmagan"}
                      </>
                    )}
                  </td>
                  <td>
                    {s.joinedDate}
                    <small className="nowrap">
                      {studyDuration(s.joinedDate)}dan beri o‘qiyapti
                    </small>
                  </td>
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
                    <strong>
                      {insightScores[s.id] == null
                        ? "—"
                        : `${insightScores[s.id]}%`}
                    </strong>
                    {insightScores[s.id] != null && (
                      <div className="progress">
                        <i style={{ "--w": `${insightScores[s.id]}%` }} />
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>
                      {submissionStats[s.id]?.totalSubmissions || 0}
                    </strong>
                    <small className="submission-title">
                      O‘rtacha: {submissionStats[s.id]?.averageScore || 0}/100
                    </small>
                  </td>
                  <td>
                    <StatusBadge
                      status={analyticsService.studentPaymentStatus(s.id)}
                    />
                  </td>
                  <td>
                    <StatusBadge status={s.accountStatus || "NOT_ACTIVATED"} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        title="O‘quvchi analitikasini yuklash"
                        onClick={() =>
                          exportAnalytics(
                            [s],
                            `${s.fullName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, "-")}-analitika.xlsx`,
                          )
                        }
                      >
                        <Download />
                      </button>
                      <button onClick={() => setEdit(s)}>
                        <Edit3 />
                      </button>
                      <button onClick={() => remove([s.id])}>
                        <Trash2 />
                      </button>
                      <div className="row-action-menu-wrap">
                        <button title="Hisob amallari" onClick={() => setActionMenu((current) => current === s.id ? null : s.id)}><MoreHorizontal /></button>
                        {actionMenu === s.id && (
                          <div className="row-action-menu">
                            <button type="button" onClick={() => prepareActivation(s)} disabled={s.accountStatus === "ACTIVE"}><UserCheck /><span><strong>Faollashtirish</strong><small>Nickname va yangi kod tayyorlash</small></span></button>
                            <button type="button" className="is-danger" onClick={() => deactivate(s)} disabled={s.accountStatus === "BLOCKED"}><UserX /><span><strong>Faollikni bekor qilish</strong><small>Student kirishini bloklash</small></span></button>
                          </div>
                        )}
                      </div>
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
