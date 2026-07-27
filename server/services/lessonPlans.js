export const LESSON_ITEM_STATUSES = [
  "COMPLETED",
  "PARTIAL",
  "NOT_COMPLETED",
  "NOT_APPLICABLE",
];

export const SCHEDULE_TYPES = ["MON_WED_FRI", "TUE_THU_SAT", "CUSTOM"];

export const SKILL_TYPES = [
  "GRAMMAR",
  "VOCABULARY",
  "LISTENING",
  "READING",
  "SPEAKING",
  "PRONUNCIATION",
  "WRITING",
  "QUIZ",
  "HOMEWORK",
  "OTHER",
];

export const DEFAULT_REASONS = [
  ["TIME_SHORT", "Vaqt yetmadi"],
  ["PREVIOUS_REVIEW", "Oldingi mavzu qayta tushuntirildi"],
  ["STUDENTS_UNPREPARED", "O‘quvchilar tayyor emas edi"],
  ["LOW_ATTENDANCE", "O‘quvchilar soni kam edi"],
  ["TECHNICAL", "Texnik muammo"],
  ["TEACHER_SKIPPED", "O‘qituvchi tomonidan qoldirildi"],
  ["OTHER_ACTIVITY", "Dars boshqa faoliyatga sarflandi"],
  ["OTHER", "Boshqa sabab"],
];

export const DEFAULT_TEMPLATES = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "MON_WED_FRI standart",
    scheduleType: "MON_WED_FRI",
    days: {
      1: [
        ["Grammar", "GRAMMAR"],
        ["Vocabulary", "VOCABULARY"],
        ["Listening", "LISTENING"],
        ["Homework berildi", "HOMEWORK"],
      ],
      3: [
        ["Reading", "READING"],
        ["Speaking", "SPEAKING"],
        ["Pronunciation", "PRONUNCIATION"],
        ["Oldingi homework tekshirildi", "HOMEWORK"],
      ],
      5: [
        ["Speaking practice", "SPEAKING"],
        ["Writing", "WRITING"],
        ["Weekly quiz", "QUIZ"],
        ["Homework berildi", "HOMEWORK"],
      ],
    },
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "TUE_THU_SAT standart",
    scheduleType: "TUE_THU_SAT",
    days: {
      2: [
        ["Grammar", "GRAMMAR"],
        ["Vocabulary", "VOCABULARY"],
        ["Listening", "LISTENING"],
        ["Homework berildi", "HOMEWORK"],
      ],
      4: [
        ["Reading", "READING"],
        ["Speaking", "SPEAKING"],
        ["Pronunciation", "PRONUNCIATION"],
        ["Oldingi homework tekshirildi", "HOMEWORK"],
      ],
      6: [
        ["Writing", "WRITING"],
        ["Listening practice", "LISTENING"],
        ["Weekly quiz", "QUIZ"],
        ["Homework berildi", "HOMEWORK"],
      ],
    },
  },
];

const dayAliases = {
  du: 1,
  dush: 1,
  dushanba: 1,
  mon: 1,
  se: 2,
  sesh: 2,
  seshanba: 2,
  tue: 2,
  ch: 3,
  chor: 3,
  chorshanba: 3,
  wed: 3,
  pa: 4,
  pay: 4,
  payshanba: 4,
  thu: 4,
  ju: 5,
  jum: 5,
  juma: 5,
  fri: 5,
  sh: 6,
  shan: 6,
  shanba: 6,
  sat: 6,
  ya: 7,
  yak: 7,
  yakshanba: 7,
  sun: 7,
};

export function weekdayFromDate(value) {
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).getDay() || 7;
}

export function scheduleDays(value = "") {
  if (Array.isArray(value)) return value.map(Number).sort();
  return String(value)
    .toLowerCase()
    .split(/[,;\s·/]+/)
    .map((part) => dayAliases[part.replace(/[^a-z]/g, "")])
    .filter(Boolean)
    .sort();
}

export function inferScheduleType(value) {
  const key = scheduleDays(value).join(",");
  if (key === "1,3,5") return "MON_WED_FRI";
  if (key === "2,4,6") return "TUE_THU_SAT";
  return "CUSTOM";
}

export function defaultPlanItems(scheduleType, weekday) {
  return (
    DEFAULT_TEMPLATES.find(
      (template) => template.scheduleType === scheduleType,
    )?.days?.[weekday] || []
  );
}

export function validateLessonItems(items, reasonById = new Map()) {
  const errors = [];
  for (const item of items) {
    if (item.isRequired && !item.status)
      errors.push(`${item.titleSnapshot || item.title}: status tanlanmagan`);
    if (item.status && !LESSON_ITEM_STATUSES.includes(item.status))
      errors.push(`${item.titleSnapshot || item.title}: status noto‘g‘ri`);
    if (
      ["PARTIAL", "NOT_COMPLETED"].includes(item.status) &&
      !item.incompleteReasonId
    )
      errors.push(`${item.titleSnapshot || item.title}: sababni tanlang`);
    const reason = reasonById.get(item.incompleteReasonId);
    if (
      ["PARTIAL", "NOT_COMPLETED"].includes(item.status) &&
      reason?.code === "OTHER" &&
      !String(item.customReason || "").trim()
    )
      errors.push(`${item.titleSnapshot || item.title}: boshqa sababni yozing`);
    if (String(item.customReason || "").length > 240)
      errors.push(`${item.titleSnapshot || item.title}: sabab 240 belgidan oshmasin`);
    if (item.status === "NOT_APPLICABLE" && item.isRequired)
      errors.push(
        `${item.titleSnapshot || item.title}: majburiy bandga “Tegishli emas” qo‘yilmaydi`,
      );
    if (item.carryOverToNext && !item.carryOverEnabled)
      errors.push(
        `${item.titleSnapshot || item.title}: keyingi darsga ko‘chirish taqiqlangan`,
      );
  }
  return errors;
}

export function lessonCompletionMetrics(items = []) {
  const applicable = items.filter((item) => item.status !== "NOT_APPLICABLE"),
    completed = applicable.filter((item) => item.status === "COMPLETED").length,
    partial = applicable.filter((item) => item.status === "PARTIAL").length,
    notCompleted = applicable.filter(
      (item) => item.status === "NOT_COMPLETED",
    ).length,
    carried = applicable.filter((item) => item.carryOverToNext).length,
    percent = applicable.length
      ? Math.round(((completed + partial * 0.5) / applicable.length) * 100)
      : 0;
  return {
    total: items.length,
    completed,
    partial,
    notCompleted,
    carried,
    percent,
  };
}

export function carryOverSnapshot(item) {
  return {
    titleSnapshot: item.titleSnapshot,
    descriptionSnapshot: item.descriptionSnapshot || "",
    skillTypeSnapshot: item.skillTypeSnapshot || "OTHER",
    isRequired: true,
    carryOverEnabled: item.carryOverEnabled !== false,
    sourceSessionItemId: item.id,
    carryOverCount: Number(item.carryOverCount || 0) + 1,
  };
}
