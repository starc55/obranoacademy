import { useRef, useState } from "react";
import { FileUp, Send, X, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../ui/Modal";
import { request } from "../../services/storage";

const fileSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function SubmissionModal({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);
  const submit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    try {
      const form = new FormData(formElement);
      form.delete("files");
      files.forEach((file) => form.append("files", file));
      const row = await request("/api/student/submissions", {
        method: "POST",
        body: form,
      });
      toast.success("Vazifa va barcha fayllar yuborildi");
      setFiles([]);
      formElement.reset();
      onClose();
      onCreated?.(row);
    } catch {
      /* request toast */
    } finally {
      setLoading(false);
    }
  };
  const addFiles = (selected) =>
    setFiles((current) => [...current, ...Array.from(selected)]);
  return (
    <Modal open={open} onClose={onClose} title="Yangi vazifa yuborish" wide>
      <form
        className="form-grid submission-modal-form polished-modal-form"
        onSubmit={submit}
      >
        <div className="modal-form-section span-2">
          <h3>Vazifa haqida</h3>
          <div className="form-grid">
            <label className="span-2">
              Vazifa nomi
              <input
                name="title"
                required
                minLength="2"
                placeholder="Masalan: Landing page loyihasi"
              />
            </label>
            <label className="span-2">
              Qisqa tavsif
              <textarea
                name="description"
                rows="3"
                placeholder="Nima bajarganingizni qisqacha yozing"
              />
            </label>
            <label>
              Yo'nalishingiz
              <input name="category" placeholder="Frontend, IELTS..." />
            </label>
          </div>
        </div>
        <div className="modal-form-section span-2">
          <h3>Izoh va materiallar</h3>
          <label>
            Matnli izoh
            <textarea name="textContent" rows="4" />
          </label>
          <button
            type="button"
            className={`custom-file multi-file-picker ${
              files.length ? "has-file" : ""
            }`}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              name="files"
              type="file"
              multiple
              onChange={(event) => addFiles(event.target.files)}
            />
            <span className="custom-file__icon">
              <FileUp />
            </span>
            <span>
              <strong>
                {files.length
                  ? `${files.length} ta fayl tanlandi`
                  : "Fayllar yoki rasmlarni tanlang"}
              </strong>
              <small>Bir vaqtning o‘zida istalgancha fayl tanlash mumkin</small>
            </span>
          </button>
          {files.length > 0 && (
            <div className="selected-file-list">
              {files.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}-${index}`}>
                  <Paperclip />
                  <span>
                    <strong>{file.name}</strong>
                    <small>{fileSize(file.size)}</small>
                  </span>
                  <button
                    type="button"
                    aria-label={`${file.name} faylini olib tashlash`}
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                  >
                    <X />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="form-actions span-2 modal-sticky-actions">
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
