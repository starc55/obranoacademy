export function StatusBadge({ status }) {
  const labels = {
    active: "Faol",
    inactive: "Noaktiv",
    paid: "To‘langan",
    partial: "Qisman",
    debt: "Qarzdor",
    overdue: "Muddati o‘tgan",
    present: "Keldi",
    absent: "Kelmadi",
    late: "Kechikdi",
    excused: "Sababli",
    left: "Erta ketdi",
  };
  return (
    <span className={`badge badge--${status}`}>{labels[status] || status}</span>
  );
}
