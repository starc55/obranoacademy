import { useState } from "react";
import { FileUp, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../ui/Modal";
import { request } from "../../services/storage";

export function SubmissionModal({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false),
    [fileName, setFileName] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const row = await request("/api/student/submissions", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      toast.success("Vazifa yuborildi");
      setFileName("");
      onClose();
      onCreated?.(row);
    } catch {
      /* request toast */
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Yangi vazifa yuborish">
      <form className="form-grid submission-modal-form" onSubmit={submit}>
        <label className="span-2">
          Vazifa nomi
          <input name="title" required minLength="2" />
        </label>
        <label className="span-2">
          Qisqa tavsif
          <textarea name="description" rows="2" />
        </label>
        <label>
          Kategoriya
          <input name="category" placeholder="Frontend, IELTS..." />
        </label>
        <label>
          GitHub link
          <input
            name="githubUrl"
            type="url"
            placeholder="https://github.com/..."
          />
        </label>
        <label>
          Demo link
          <input name="demoUrl" type="url" />
        </label>
        <label>
          Figma link
          <input name="figmaUrl" type="url" />
        </label>
        <label className="span-2">
          Matnli izoh
          <textarea name="textContent" rows="4" />
        </label>
        <label className={`custom-file span-2 ${fileName ? "has-file" : ""}`}>
          <input
            name="file"
            type="file"
            accept=".pdf,.zip,.png,.jpg,.jpeg,.doc,.docx"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          />
          <span className="custom-file__icon">
            <FileUp />
          </span>
          <span>
            <strong>{fileName || "Fayl yoki screenshot tanlang"}</strong>
            <small>PDF, ZIP, PNG, JPG, DOC/DOCX · maksimum 10 MB</small>
          </span>
          {fileName && (
            <button
              type="button"
              aria-label="Faylni olib tashlash"
              onClick={(e) => {
                e.preventDefault();
                setFileName("");
                const input = e.currentTarget
                  .closest("label")
                  .querySelector("input");
                input.value = "";
              }}
            >
              <X />
            </button>
          )}
        </label>
        <div className="form-actions span-2">
          <button type="button" className="btn" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn--primary" disabled={loading}>
            <Send />
            {loading ? "Yuborilmoqda..." : "Vazifani yuborish"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
