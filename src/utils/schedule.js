const aliases = {
  du: 1, dush: 1, dushanba: 1, mon: 1,
  se: 2, sesh: 2, seshanba: 2, tue: 2,
  ch: 3, chor: 3, chorshanba: 3, wed: 3,
  pa: 4, pay: 4, payshanba: 4, thu: 4,
  ju: 5, jum: 5, juma: 5, fri: 5,
  sh: 6, shan: 6, shanba: 6, sat: 6,
  ya: 7, yak: 7, yakshanba: 7, sun: 7,
};

export function weekdayOf(date) {
  return new Date(`${String(date).slice(0, 10)}T00:00:00`).getDay() || 7;
}

export function groupWeekdays(value = "") {
  if (Array.isArray(value)) return value.map(Number).filter((day) => day >= 1 && day <= 7);
  return String(value).toLowerCase().split(/[,;\s·/]+/).map((part) => aliases[part.replace(/[^a-z]/g, "")]).filter(Boolean);
}

export function isGroupScheduled(group, date) {
  const days = groupWeekdays(group?.days);
  return !days.length || days.includes(weekdayOf(date));
}

export function isAttendanceSessionScheduled(session, db) {
  const day = weekdayOf(session.date);
  if (session.sessionType === "individual" || session.studentId) {
    const student = db.students.find((item) => item.id === session.studentId);
    return !student?.scheduleDays?.length || student.scheduleDays.includes(day);
  }
  const group = db.groups.find((item) => item.id === session.groupId);
  return !group || isGroupScheduled(group, session.date);
}
