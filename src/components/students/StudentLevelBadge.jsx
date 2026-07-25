import { Award } from "lucide-react";

export function StudentLevelBadge({ level, showScore = false }) {
  const current = level || {
    code: "NEW",
    label: "Yangi",
    score: null,
  };
  return (
    <span
      className={`student-level-badge level-${current.code.toLowerCase()}`}
      title={`Daraja: ${current.label}${current.score == null ? "" : ` · ${current.score}/100`}`}
    >
      <Award />
      <strong>{current.label}</strong>
      {showScore && current.score != null && <small>{current.score}/100</small>}
    </span>
  );
}
