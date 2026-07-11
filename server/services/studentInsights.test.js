import test from "node:test";
import assert from "node:assert/strict";
import { calculateHealth, detectRisk } from "./studentInsights.js";
test("health handles missing data", () =>
  assert.equal(calculateHealth({ attendance: [], events: [] }).score, null));
test("health redistributes available metric weights", () =>
  assert.equal(
    calculateHealth({
      attendance: [{ status: "entered" }, { status: "not_entered" }],
      events: [],
    }).score,
    61,
  ));
test("two of last three absences creates risk reason", () => {
  const health = { score: 60 };
  const risk = detectRisk({
    attendance: [
      { status: "not_entered" },
      { status: "entered" },
      { status: "not_entered" },
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
        { status: "not_entered" },
        { status: "not_entered" },
        { status: "not_entered" },
      ],
      health: { score: 40 },
    }).level,
    "CRITICAL",
  ));
