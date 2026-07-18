export function StatusBadge({ status }) {
  const labels = {
    active: "Faol",
    inactive: "Noaktiv",
    suspended: "To‘xtatilgan",
    paid: "To‘langan",
    partial: "Qisman",
    debt: "Qarzdor",
    overdue: "Muddati o‘tgan",
    entered: "Kirdi",
    not_entered: "Kirmadi",
    late: "Kechikdi",
    excused: "Sababli",
    left: "Erta ketdi",
  };
  return (
    <span className={`badge badge--${status}`}>{labels[status] || status}</span>
  );
}
