import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const close = useCallback((answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options) => {
    const next = typeof options === "string" ? { message: options } : options;
    return new Promise((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setDialog({
        title: "Amalni tasdiqlash",
        message: "Ushbu amal bajarilsinmi?",
        confirmText: "Tasdiqlash",
        cancelText: "Bekor qilish",
        danger: true,
        ...next,
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!dialog}
        onClose={() => close(false)}
        title={dialog?.title || "Amalni tasdiqlash"}
      >
        <div className="confirm-dialog">
          <div className={`confirm-dialog__icon ${dialog?.danger ? "is-danger" : ""}`}>
            <AlertTriangle />
          </div>
          <p>{dialog?.message}</p>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => close(false)}>
              {dialog?.cancelText}
            </button>
            <button
              type="button"
              className={`btn ${dialog?.danger ? "btn--danger" : "btn--primary"}`}
              onClick={() => close(true)}
              autoFocus
            >
              {dialog?.confirmText}
            </button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm ConfirmProvider ichida ishlatilishi kerak");
  return confirm;
}
