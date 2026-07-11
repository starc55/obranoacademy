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
    return this.saveMany([session]).then(([saved]) => saved);
  },
  async saveMany(sessions) {
    const db = readDB(),
      nextRows = [...db.attendance],
      pending = sessions.map((session) => {
        const i = nextRows.findIndex((row) => same(row, session));
        const next = {
          ...session,
          id: i >= 0 ? nextRows[i].id : crypto.randomUUID(),
        };
        if (i >= 0) nextRows[i] = next;
        else nextRows.push(next);
        return next;
      });
    try {
      writeDB({ ...db, attendance: nextRows });
      const saved = await Promise.all(
        pending.map((next) =>
          request("/api/attendance", {
            method: "PUT",
            body: JSON.stringify(next),
          }),
        ),
      );
      await hydrateDB();
      return saved;
    } catch (error) {
      await hydrateDB().catch(() => {});
      throw error;
    }
  },
};
