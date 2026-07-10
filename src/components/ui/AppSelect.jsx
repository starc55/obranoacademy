import {
  Children,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown } from "lucide-react";
export const AppSelect = forwardRef(function AppSelect(
  {
    children,
    value,
    defaultValue = "",
    onChange,
    onValueChange,
    name,
    required,
    disabled,
    className = "",
    placeholder = "Tanlang",
    ...rest
  },
  forwardedRef
) {
  const root = useRef(null),
    [open, setOpen] = useState(false),
    [internal, setInternal] = useState(defaultValue);
  const options = useMemo(
    () =>
      Children.toArray(children).flatMap((child) =>
        child?.type === "option"
          ? [
              {
                value: String(child.props.value ?? child.props.children),
                label: child.props.children,
                disabled: child.props.disabled,
              },
            ]
          : []
      ),
    [children]
  );
  const current = value !== undefined ? String(value) : String(internal ?? "");
  const selected = options.find((o) => o.value === current);
  useEffect(() => {
    const close = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const choose = (option) => {
    if (option.disabled) return;
    if (value === undefined) setInternal(option.value);
    onValueChange?.(option.value);
    onChange?.({ target: { name, value: option.value } });
    setOpen(false);
  };
  return (
    <div
      ref={root}
      className={`app-select ${open ? "app-select--open" : ""} ${
        disabled ? "is-disabled" : ""
      } ${className}`}
      {...rest}
    >
      <input
        ref={forwardedRef}
        type="hidden"
        name={name}
        value={current}
        required={required}
      />
      <button
        type="button"
        className="app-select__trigger"
        onClick={() => !disabled && setOpen((x) => !x)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={!selected ? "placeholder" : ""}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown />
      </button>
      {open && (
        <div className="app-select__menu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === current}
              disabled={option.disabled}
              className={option.value === current ? "is-selected" : ""}
              key={option.value}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.value === current && <Check />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
