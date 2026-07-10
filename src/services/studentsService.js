import { hydrateDB, readDB, request, table, writeDB } from "./storage";
const base = table("students");
export const studentsService = {
  ...base,
  async createWithPayment(student, initialPayment) {
    const id = student.id || crypto.randomUUID(),
      payment =
        initialPayment?.status === "paid"
          ? { ...initialPayment, id: crypto.randomUUID() }
          : initialPayment;
    const result = await request("/api/students", {
      method: "POST",
      body: JSON.stringify({ ...student, id, initialPayment: payment }),
    });
    await hydrateDB();
    return result;
  },
  async updateAndRefresh(id, student) {
    const result = await request(`/api/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(student),
    });
    const db = readDB();
    writeDB({
      ...db,
      students: db.students.map((item) => (item.id === id ? result : item)),
    });
    return result;
  },
};
