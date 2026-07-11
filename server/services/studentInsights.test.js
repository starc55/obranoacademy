import test from "node:test";
import assert from "node:assert/strict";
import { calculateHealth, detectRisk } from "./studentInsights.js";
test("health handles missing data", () =>
  assert.equal(calculateHealth({ attendance: [], events: [] }).score, null));
test("health redistributes available metric weights", () =>
  assert.equal(
    calculateHealth({
      attendance: [{ status: "present" }, { status: "absent" }],
      events: [],
    }).score,
    61,
  ));
test("two of last three absences creates risk reason", () => {
  const health = { score: 60 };
  const risk = detectRisk({
    attendance: [
      { status: "absent" },
      { status: "present" },
      { status: "absent" },
    ],
    health,
  });
  assert.equal(risk.level, "CRITICAL");
  assert.ok(risk.reasons.some((x) => x.code === "RECENT_ABSENCES"));
});
test("three consecutive absences are critical", () =>
  assert.equal(
    detectRisk({
      attendance: [
        { status: "absent" },
        { status: "absent" },
        { status: "absent" },
      ],
      health: { score: 40 },
    }).level,
    "CRITICAL",
  ));
