import { useEffect, useMemo, useState } from "react";
import {
  Check,
  MinusCircle,
  Clock3,
  ShieldCheck,
  LogOut,
  RotateCcw,
  Save,
  CheckCheck,
  Users,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AppSelect, DatePicker, TimePicker } from "../components/ui/controls";
import { useApp } from "../context/AppContext";
import { attendanceService } from "../services/attendanceService";
import { StatusBadge } from "../components/shared/StatusBadge";
const statuses = [
  ["present", "Kirdi", Check],
  ["absent", "Kirmadi", MinusCircle],
  ["late", "Kechikdi", Clock3],
  ["excused", "Sababli", ShieldCheck],
  ["left", "Erta ketdi", LogOut],
];
export function AttendancePage() {
  const { groups, students } = useApp(),
    [mode, setMode] = useState("group"),
    [groupId, setGroupId] = useState(groups[0]?.id || ""),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [records, setRecords] = useState({}),
    [lessonTimes, setLessonTimes] = useState({}),
    [focus, setFocus] = useState(0),
    [saving, setSaving] = useState(false),
    individuals = students.filter(
      (s) => s.enrollmentType === "individual" && s.status === "active",
    ),
    selectedWeekday = new Date(`${date}T00:00:00`).getDay() || 7,
    scheduledIndividuals = individuals.filter(
      (s) =>
        !s.scheduleDays?.length || s.scheduleDays.includes(selectedWeekday),
    ),
    list = useMemo(
      () =>
        mode === "individual"
          ? scheduledIndividuals
          : students.filter(
              (s) => s.groupId === groupId && s.status === "active",
            ),
      [students, scheduledIndividuals, mode, groupId],
    ),
    target = {
      sessionType: mode,
      groupId: mode === "group" ? groupId : null,
      studentId: null,
      date,
    };
  useEffect(() => {
    const sessions =
      mode === "individual"
        ? scheduledIndividuals
            .map((student) =>
              attendanceService.get({
                sessionType: "individual",
                studentId: student.id,
                date,
              }),
            )
            .filter(Boolean)
        : [attendanceService.get(target)].filter(Boolean);
    setRecords(
      Object.fromEntries(
        sessions
          .flatMap((session) => session.records || [])
          .map((r) => [r.studentId, r.status]),
      ),
    );
    setLessonTimes(
      Object.fromEntries(
        sessions
          .filter((session) => session.studentId)
          .map((session) => [session.studentId, session.lessonTime || ""]),
      ),
    );
  }, [mode, groupId, date, students]);
  useEffect(() => {
    const key = (e) => {
      if (["1", "2", "3", "4", "5"].includes(e.key) && list[focus])
        setRecords((r) => ({
          ...r,
          [list[focus].id]: statuses[Number(e.key) - 1][0],
        }));
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [focus, list]);
  const all = (status) =>
      setRecords(Object.fromEntries(list.map((s) => [s.id, status]))),
    save = async () => {
      if (mode === "group" && !groupId) {
        toast.error("Guruhni tanlang");
        return;
      }
      if (!list.length) {
        toast.error("Yo‘qlama uchun o‘quvchi topilmadi");
        return;
      }
      setSaving(true);
      const jobs =
        mode === "individual"
          ? list.map((s) =>
              attendanceService.save({
                sessionType: "individual",
                groupId: null,
                studentId: s.id,
                date,
                lessonTime: lessonTimes[s.id] || null,
                records: [
                  { studentId: s.id, status: records[s.id] || "present" },
                ],
              }),
            )
          : [
              attendanceService.save({
                ...target,
                records: list.map((s) => ({
                  studentId: s.id,
                  status: records[s.id] || "present",
                })),
              }),
            ];
      await Promise.all(jobs).finally(() => setSaving(false));
      toast.success(
        mode === "individual"
          ? "Individual yo‘qlama saqlandi"
          : "Guruh yo‘qlamasi saqlandi",
      );
    };
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Yo‘qlama</h2>
          <p>Guruh va individual darslar uchun tezkor davomat</p>
        </div>
        <button className="btn btn--primary" onClick={save} disabled={saving}>
          <Save /> Yo‘qlamani saqlash
        </button>
      </div>
      <section className="attendance-shell">
        <div className="attendance-mode">
          <button
            className={mode === "group" ? "active" : ""}
            onClick={() => setMode("group")}
          >
            <Users /> Guruh yo‘qlamasi
          </button>
          <button
            className={mode === "individual" ? "active" : ""}
            onClick={() => setMode("individual")}
          >
            <UserRound /> Individual yo‘qlama
          </button>
        </div>
        <div className="attendance-bar">
          {mode === "group" ? (
            <label>
              Guruh
              <AppSelect value={groupId} onValueChange={setGroupId}>
                {groups.map((g) => (
                  <option value={g.id} key={g.id}>
                    {g.name}
                  </option>
                ))}
              </AppSelect>
            </label>
          ) : (
            <div className="individual-count">
              <UserRound />
              <strong>{scheduledIndividuals.length}</strong>
              <span>ta bugungi individual</span>
            </div>
          )}
          <label>
            Sana
            <DatePicker value={date} onValueChange={setDate} />
          </label>
          <div className="attendance-summary">
            {statuses.slice(0, 3).map(([s]) => (
              <span key={s}>
                <StatusBadge status={s} />
                <b>{Object.values(records).filter((x) => x === s).length}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="quick-actions">
          <button className="btn" onClick={() => all("present")}>
            <CheckCheck /> Hammasi keldi
          </button>
          <button className="btn" onClick={() => all("absent")}>
            <MinusCircle /> Hammasi kelmadi
          </button>
          <button className="btn" onClick={() => setRecords({})}>
            <RotateCcw /> Tozalash
          </button>
        </div>
        <div className="attendance-list">
          {list.map((s, i) => (
            <div
              key={s.id}
              className={focus === i ? "focused" : ""}
              onClick={() => setFocus(i)}
            >
              <div className="person">
                <span className="row-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="avatar avatar--soft">
                  {s.firstName[0]}
                  {s.lastName[0]}
                </div>
                <div>
                  <strong>{s.fullName}</strong>
                  <small>
                    {mode === "individual" ? "Individual dars" : s.phone}
                  </small>
                </div>
              </div>
              <div className="status-buttons">
                {mode === "individual" && (
                  <TimePicker
                    className="attendance-time"
                    value={lessonTimes[s.id] || ""}
                    onValueChange={(value) =>
                      setLessonTimes((times) => ({ ...times, [s.id]: value }))
                    }
                    placeholder="Dars vaqti"
                  />
                )}
                {statuses.map(([value, label, Icon], j) => (
                  <button
                    key={value}
                    title={`${j + 1} — ${label}`}
                    className={records[s.id] === value ? `is-${value}` : ""}
                    onClick={() => setRecords((r) => ({ ...r, [s.id]: value }))}
                  >
                    <Icon />
                    <span>{label}</span>
                    <kbd>{j + 1}</kbd>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!list.length && (
            <div className="empty">
              <UserRound />
              <h3>
                {mode === "individual"
                  ? "Individual o‘quvchi yo‘q"
                  : "Guruhda o‘quvchi yo‘q"}
              </h3>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
