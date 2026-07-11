import { table, readDB } from "./storage";
function absenceStreak(studentId) {
  const db = readDB(),
    student = db.students.find((s) => s.id === studentId),
    group = db.groups.find((g) => g.id === student?.groupId),
    text = (group?.days || "").toLowerCase(),
    groupDays =
      text.includes("se") && text.includes("pay") ? [2, 4, 6] : [1, 3, 5],
    allowed = student?.scheduleDays?.length ? student.scheduleDays : groupDays;
  const sessions = db.attendance
    .filter((a) => {
      const day = new Date(`${a.date}T00:00:00`).getDay() || 7;
      return allowed.includes(day);
    })
    .flatMap((a) =>
      a.records
        .filter((r) => r.studentId === studentId)
        .map((r) => ({ date: a.date, status: r.status })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const row of sessions) {
    if (row.status === "not_entered") streak++;
    else break;
  }
  return streak;
}
export const paymentsService = {
  ...table("payments"),
  debt: (p) => Math.max(0, (+p.fee || 0) - (+p.amount || 0)),
  status(p) {
    const d = this.debt(p);
    return d <= 0
      ? "paid"
      : +p.amount > 0
        ? "partial"
        : p.date
          ? "overdue"
          : "debt";
  },
  calculateFee(studentId, baseFee) {
    const db = readDB(),
      streak = absenceStreak(studentId),
      start = +db.settings.absencePenaltyStart || 4,
      unit = +db.settings.absencePenaltyAmount || 20000,
      penalty = Math.max(0, streak - start + 1) * unit;
    return {
      baseFee: +baseFee || 0,
      streak,
      penalty,
      total: (+baseFee || 0) + penalty,
    };
  },
};
