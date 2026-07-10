import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
const months = [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr",
  ],
  week = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const parse = (v) => {
  if (!v) return new Date();
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
};
export const DatePicker = forwardRef(function DatePicker(
  {
    value,
    defaultValue = "",
    onChange,
    onValueChange,
    name,
    required,
    disabled,
    placeholder = "Sanani tanlang",
    mode = "date",
    className = "",
  },
  forwardedRef
) {
  const root = useRef(null),
    [open, setOpen] = useState(false),
    [internal, setInternal] = useState(defaultValue),
    current = value !== undefined ? value : internal,
    selected = parse(current),
    [view, setView] = useState(() => parse(current));
  useEffect(() => {
    if (current) setView(parse(current));
  }, [current]);
  useEffect(() => {
    const close = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1),
      offset = (first.getDay() + 6) % 7,
      start = new Date(view.getFullYear(), view.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);
  const commit = (next) => {
    const result = mode === "month" ? next.slice(0, 7) : next;
    if (value === undefined) setInternal(result);
    onValueChange?.(result);
    onChange?.({ target: { name, value: result } });
    setOpen(false);
  };
  const label = current
    ? mode === "month"
      ? `${months[selected.getMonth()]} ${selected.getFullYear()}`
      : `${String(selected.getDate()).padStart(2, "0")}.${String(
          selected.getMonth() + 1
        ).padStart(2, "0")}.${selected.getFullYear()}`
    : placeholder;
  return (
    <div
      ref={root}
      className={`date-picker ${open ? "date-picker--open" : ""} ${className}`}
    >
      <input
        ref={forwardedRef}
        type="hidden"
        name={name}
        value={current || ""}
        required={required}
      />
      <button
        type="button"
        className="date-picker__trigger"
        disabled={disabled}
        onClick={() => setOpen((x) => !x)}
      >
        <span className={!current ? "placeholder" : ""}>{label}</span>
        <CalendarDays />
      </button>
      {open && (
        <div className="date-picker__popover">
          <header>
            <button
              type="button"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
              }
            >
              <ChevronLeft />
            </button>
            <strong>
              {months[view.getMonth()]} {view.getFullYear()}
            </strong>
            <button
              type="button"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
              }
            >
              <ChevronRight />
            </button>
          </header>
          {mode === "month" ? (
            <div className="month-grid">
              {months.map((m, i) => (
                <button
                  type="button"
                  className={
                    current ===
                    `${view.getFullYear()}-${String(i + 1).padStart(2, "0")}`
                      ? "is-selected"
                      : ""
                  }
                  key={m}
                  onClick={() =>
                    commit(
                      `${view.getFullYear()}-${String(i + 1).padStart(2, "0")}`
                    )
                  }
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="calendar-week">
                {week.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="calendar-grid">
                {days.map((d) => {
                  const key = iso(d),
                    outside = d.getMonth() !== view.getMonth(),
                    today = key === iso(new Date()),
                    active = key === current;
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`${outside ? "is-outside " : ""}${
                        today ? "is-today " : ""
                      }${active ? "is-selected" : ""}`}
                      onClick={() => commit(key)}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <footer>
                <button type="button" onClick={() => commit(iso(new Date()))}>
                  Bugun
                </button>
                {current && (
                  <button type="button" onClick={() => commit("")}>
                    Tozalash
                  </button>
                )}
              </footer>
            </>
          )}
        </div>
      )}
    </div>
  );
});
