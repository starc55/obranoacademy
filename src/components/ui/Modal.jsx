import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
export function Modal({ open, onClose, title, children, wide = false }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`modal ${wide ? "modal--wide" : ""}`}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <header className="modal__header">
              <div>
                <span className="eyebrow">OBRANO ACADEMY</span>
                <h2>{title}</h2>
              </div>
              <button
                className="icon-btn"
                onClick={onClose}
                aria-label="Yopish"
              >
                <X />
              </button>
            </header>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
