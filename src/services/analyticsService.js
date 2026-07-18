import { readDB } from "./storage";
import { paymentsService } from "./paymentsService";
import { isAttendanceSessionScheduled } from "../utils/schedule";
const rate = (records) =>
  records.length
    ? Math.round(
        (records.filter((r) => r.status === "entered" || r.status === "late")
          .length /
          records.length) *
          100,
      )
    : 0;
export const analyticsService = {
  studentAttendance(studentId) {
    const db = readDB();
    return rate(
      db.attendance
        .filter((session) => isAttendanceSessionScheduled(session, db))
        .flatMap((a) => a.records)
        .filter((r) => r.studentId === studentId),
    );
  },
  groupAttendance(groupId) {
    const db = readDB();
    return rate(
      db.attendance.filter((a) => a.groupId === groupId && isAttendanceSessionScheduled(a, db))
        .flatMap((a) => a.records),
    );
  },
  studentPaymentStatus(studentId) {
    const rows = readDB()
      .payments.filter((p) => p.studentId === studentId)
      .sort((a, b) => (b.month || "").localeCompare(a.month || ""));
    return rows[0] ? paymentsService.status(rows[0]) : "debt";
  },
  studentAbsences(studentId) {
    const db = readDB();
    return db.attendance
      .filter((session) => isAttendanceSessionScheduled(session, db))
      .flatMap((a) => a.records)
      .filter((r) => r.studentId === studentId && r.status === "not_entered")
      .length;
  },
};
