import test from "node:test";
import assert from "node:assert/strict";
import {
  carryOverSnapshot,
  defaultPlanItems,
  inferScheduleType,
  lessonCompletionMetrics,
  scheduleDays,
  validateLessonItems,
  weekdayFromDate,
} from "./lessonPlans.js";

test("Du-Chor-Ju jadvali aniqlanadi", () => assert.equal(inferScheduleType("Du, Chor, Ju"), "MON_WED_FRI"));
test("Se-Pa-Sh jadvali aniqlanadi", () => assert.equal(inferScheduleType("Se, Pa, Sh"), "TUE_THU_SAT"));
test("maxsus jadval CUSTOM bo‘ladi", () => assert.equal(inferScheduleType("Du, Se"), "CUSTOM"));
test("kun aliaslari tartiblanadi", () => assert.deepEqual(scheduleDays("Ju, Du, Chor"), [1, 3, 5]));
test("ISO sana weekday’i to‘g‘ri", () => assert.equal(weekdayFromDate("2026-07-27"), 1));
test("dushanba default rejasida Grammar bor", () => assert.equal(defaultPlanItems("MON_WED_FRI", 1)[0][0], "Grammar"));
test("chorshanba default rejasida Speaking bor", () => assert.ok(defaultPlanItems("MON_WED_FRI", 3).some(([title]) => title === "Speaking")));
test("shanba default rejasida Writing bor", () => assert.ok(defaultPlanItems("TUE_THU_SAT", 6).some(([title]) => title === "Writing")));
test("majburiy band statussiz yakunlanmaydi", () => assert.equal(validateLessonItems([{ title: "Grammar", isRequired: true, status: null }]).length, 1));
test("qisman bajarilish sabab talab qiladi", () => assert.equal(validateLessonItems([{ title: "Reading", status: "PARTIAL" }]).length, 1));
test("bajarilmagan band sabab talab qiladi", () => assert.equal(validateLessonItems([{ title: "Writing", status: "NOT_COMPLETED" }]).length, 1));
test("OTHER sababi izoh talab qiladi", () => {
  const reasons = new Map([["other", { id: "other", code: "OTHER" }]]);
  assert.equal(validateLessonItems([{ title: "Quiz", status: "PARTIAL", incompleteReasonId: "other" }], reasons).length, 1);
});
test("majburiy band NOT_APPLICABLE bo‘la olmaydi", () => assert.equal(validateLessonItems([{ title: "Quiz", isRequired: true, status: "NOT_APPLICABLE" }]).length, 1));
test("carry taqiqlangan band ko‘chirilmaydi", () => assert.equal(validateLessonItems([{ title: "Quiz", status: "NOT_COMPLETED", incompleteReasonId: "x", carryOverToNext: true, carryOverEnabled: false }]).length, 1));
test("carry snapshot tarix va sanoqni saqlaydi", () => assert.deepEqual(carryOverSnapshot({ id: "a", titleSnapshot: "Speaking", carryOverCount: 2 }), {
  titleSnapshot: "Speaking", descriptionSnapshot: "", skillTypeSnapshot: "OTHER", isRequired: true,
  carryOverEnabled: true, sourceSessionItemId: "a", carryOverCount: 3,
}));
test("bajarilish foizi partial’ni yarim hisoblaydi", () => assert.equal(lessonCompletionMetrics([
  { status: "COMPLETED" }, { status: "PARTIAL" }, { status: "NOT_COMPLETED" },
]).percent, 50));
test("NOT_APPLICABLE foiz maxrajiga kirmaydi", () => assert.equal(lessonCompletionMetrics([
  { status: "COMPLETED" }, { status: "NOT_APPLICABLE" },
]).percent, 100));
