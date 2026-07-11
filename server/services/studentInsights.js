export const INSIGHT_RULES = {
  mediumAttendance: 80,
  highAttendance: 65,
  criticalAttendance: 50,
  highAbsences: 2,
  criticalAbsences: 3,
};
const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
export function calculateHealth({ attendance = [], events = [] }) {
  const relevant = attendance.filter((x) => x.status);
  if (!relevant.length && !events.length)
    return {
      score: null,
      level: "NO_DATA",
      label: "Yetarli ma’lumot yo‘q",
      trend: 0,
      factors: {},
      updatedAt: new Date().toISOString(),
    };
  const factors = {};
  if (relevant.length) {
    const points = relevant.reduce(
      (n, x) =>
        n +
        (x.status === "present"
          ? 100
          : x.status === "late"
            ? 75
            : x.status === "excused"
              ? 60
              : 0),
      0,
    );
    factors.attendance = { score: clamp(points / relevant.length), weight: 35 };
  }
  const assignments = events.filter((x) => x.type.startsWith("assignment_"));
  if (assignments.length) {
    const done = assignments.filter(
      (x) => x.type === "assignment_submitted",
    ).length;
    factors.assignments = {
      score: clamp((done / assignments.length) * 100),
      weight: 25,
    };
  }
  const grades = events.filter(
    (x) => x.type === "grade_added" && Number.isFinite(Number(x.value)),
  );
  if (grades.length)
    factors.results = {
      score: clamp(
        grades.reduce((n, x) => n + Number(x.value), 0) / grades.length,
      ),
      weight: 20,
    };
  const feedback = events.filter((x) => x.type === "feedback_added");
  if (feedback.length)
    factors.feedback = {
      score: clamp(
        feedback.reduce((n, x) => n + Number(x.value || 75), 0) /
          feedback.length,
      ),
      weight: 10,
    };
  factors.activity = {
    score: relevant.length || events.length ? 100 : 0,
    weight: 10,
  };
  const totalWeight = Object.values(factors).reduce((n, x) => n + x.weight, 0),
    score = clamp(
      Object.values(factors).reduce((n, x) => n + x.score * x.weight, 0) /
        totalWeight,
    );
  const level =
    score >= 85
      ? "EXCELLENT"
      : score >= 70
        ? "GOOD"
        : score >= 50
          ? "NEEDS_ATTENTION"
          : "CRITICAL";
  return {
    score,
    level,
    label: {
      EXCELLENT: "A’lo",
      GOOD: "Yaxshi",
      NEEDS_ATTENTION: "E’tibor kerak",
      CRITICAL: "Kritik",
    }[level],
    trend: 0,
    factors: Object.fromEntries(
      Object.entries(factors).map(([k, v]) => [
        k,
        { ...v, weight: Math.round((v.weight / totalWeight) * 100) },
      ]),
    ),
    updatedAt: new Date().toISOString(),
  };
}
export function detectRisk({ attendance = [], health }) {
  const rows = attendance.filter((x) => x.status),
    rate = rows.length
      ? (rows.filter((x) => ["present", "late"].includes(x.status)).length /
          rows.length) *
        100
      : 100;
  let consecutive = 0;
  for (const row of [...rows].reverse()) {
    if (row.status === "absent") consecutive++;
    else break;
  }
  const recent = rows.slice(-3),
    recentAbsent = recent.filter((x) => x.status === "absent").length,
    reasons = [];
  if (recent.length === 3 && recentAbsent >= 2)
    reasons.push({
      code: "RECENT_ABSENCES",
      title: "Oxirgi 3 darsdan 2 tasi qoldirilgan",
      description: `Oxirgi 3 darsning ${recentAbsent} tasida qatnashmagan.`,
    });
  if (consecutive >= 2)
    reasons.push({
      code: "CONSECUTIVE_ABSENCES",
      title: "Ketma-ket dars qoldirilgan",
      description: `${consecutive} ta dars ketma-ket qoldirilgan.`,
    });
  if (rate < 70)
    reasons.push({
      code: "LOW_ATTENDANCE",
      title: "Davomat 70% dan past",
      description: `Joriy davomat ${Math.round(rate)}%.`,
    });
  let level = "LOW";
  if (
    rate < INSIGHT_RULES.criticalAttendance ||
    consecutive >= 3 ||
    health?.score < 35
  )
    level = "CRITICAL";
  else if (
    rate < INSIGHT_RULES.highAttendance ||
    consecutive >= 2 ||
    health?.score < 50
  )
    level = "HIGH";
  else if (rate < INSIGHT_RULES.mediumAttendance || reasons.length)
    level = "MEDIUM";
  return {
    level,
    label: {
      LOW: "Low Risk",
      MEDIUM: "Medium Risk",
      HIGH: "High Risk",
      CRITICAL: "Critical Risk",
    }[level],
    attendanceRate: Math.round(rate),
    consecutiveAbsences: consecutive,
    reasons,
    detectedAt: new Date().toISOString(),
  };
}
