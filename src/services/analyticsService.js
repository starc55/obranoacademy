import { readDB } from "./storage";
import { paymentsService } from "./paymentsService";
const rate = (records) =>
  records.length
    ? Math.round(
        (records.filter((r) => r.status === "present" || r.status === "late")
          .length /
          records.length) *
          100
      )
    : 0;
export const analyticsService = {
  studentAttendance(studentId) {
    return rate(
      readDB()
        .attendance.flatMap((a) => a.records)
        .filter((r) => r.studentId === studentId)
    );
  },
  groupAttendance(groupId) {
    return rate(
      readDB()
        .attendance.filter((a) => a.groupId === groupId)
        .flatMap((a) => a.records)
    );
  },
  studentPaymentStatus(studentId) {
    const rows = readDB()
      .payments.filter((p) => p.studentId === studentId)
      .sort((a, b) => (b.month || "").localeCompare(a.month || ""));
    return rows[0] ? paymentsService.status(rows[0]) : "debt";
  },
  studentAbsences(studentId) {
    return readDB()
      .attendance.flatMap((a) => a.records)
      .filter((r) => r.studentId === studentId && r.status === "absent").length;
  },
};
