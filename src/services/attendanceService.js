import { hydrateDB, readDB, request, writeDB } from "./storage";
const same = (row, session) =>
  row.date === session.date &&
  (session.sessionType === "individual"
    ? row.sessionType === "individual" && row.studentId === session.studentId
    : (row.sessionType || "group") === "group" &&
      row.groupId === session.groupId);
export const attendanceService = {
  list: () => readDB().attendance || [],
  get: (session) => readDB().attendance.find((row) => same(row, session)),
  async save(session) {
    const db = readDB(),
      i = db.attendance.findIndex((row) => same(row, session)),
      next = {
        ...session,
        id: i >= 0 ? db.attendance[i].id : crypto.randomUUID(),
      };
    if (i >= 0) db.attendance[i] = next;
    else db.attendance.push(next);
    writeDB({ ...db, attendance: [...db.attendance] });
    try {
      const saved = await request("/api/attendance", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      await hydrateDB();
      return saved;
    } catch (error) {
      await hydrateDB().catch(() => {});
      throw error;
    }
  },
};
