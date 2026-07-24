import { useEffect, useRef, useState } from "react";
import { FileUp, Send, X, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../ui/Modal";
import { request } from "../../services/storage";

const fileSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const MAX_UPLOAD_MB = Number(import.meta.env.VITE_FILE_UPLOAD_MAX_MB) || 10,
  MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024,
  MAX_FILE_COUNT = 30;

export function SubmissionModal({ open, onClose, onCreated, submission = null }) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedFileIds, setRemovedFileIds] = useState([]);
  const inputRef = useRef(null);
  const editing = Boolean(submission);
  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setExistingFiles(submission?.files || []);
    setRemovedFileIds([]);
  }, [open, submission]);
  const submit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    try {
      const form = new FormData(formElement);
      form.delete("files");
      form.set("removeFileIds", JSON.stringify(removedFileIds));
      files.forEach((file) => form.append("files", file));
      const row = await request(
        editing
          ? `/api/student/submissions/${submission.id}`
          : "/api/student/submissions",
        {
          method: editing ? "PATCH" : "POST",
          body: form,
        },
      );
      toast.success(
        editing ? "Vazifa yangilandi" : "Vazifa va barcha fayllar yuborildi",
      );
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
  const addFiles = (selected) => {
    const incoming = Array.from(selected || []);
    setFiles((current) => {
      const next = [...current, ...incoming],
        totalBytes = next.reduce((total, file) => total + file.size, 0);
      if (next.length > MAX_FILE_COUNT) {
        toast.error(`Bir urinishda ko‘pi bilan ${MAX_FILE_COUNT} ta fayl tanlang`);
        return current;
      }
      if (totalBytes > MAX_UPLOAD_BYTES) {
        toast.error(`Tanlangan fayllarning jami hajmi ${MAX_UPLOAD_MB} MB dan oshmasin`);
        return current;
      }
      return next;
    });
    if (inputRef.current) inputRef.current.value = "";
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Vazifani tahrirlash" : "Yangi vazifa yuborish"}
      wide
    >
      <form
        key={submission?.id || "new-submission"}
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
                defaultValue={submission?.title || ""}
              />
            </label>
            <label className="span-2">
              Qisqa tavsif
              <textarea
                name="description"
                rows="3"
                placeholder="Nima bajarganingizni qisqacha yozing"
                defaultValue={submission?.description || ""}
              />
            </label>
            <label>
              Yo'nalishingiz
              <input
                name="category"
                placeholder="Frontend, IELTS..."
                defaultValue={submission?.category || ""}
              />
            </label>
          </div>
        </div>
        <div className="modal-form-section span-2">
          <h3>Izoh va materiallar</h3>
          <label>
            Matnli izoh
            <textarea
              name="textContent"
              rows="4"
              defaultValue={submission?.textContent || ""}
            />
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
              <small>
                Ko‘pi bilan {MAX_FILE_COUNT} ta, jami {MAX_UPLOAD_MB} MB
              </small>
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
          {existingFiles.length > 0 && (
            <div className="selected-file-list existing-file-list">
              {existingFiles.map((file) => (
                <div key={file.id}>
                  <Paperclip />
                  <span>
                    <strong>{file.name}</strong>
                    <small>{fileSize(file.size || 0)} · avval yuklangan</small>
                  </span>
                  <button
                    type="button"
                    aria-label={`${file.name} faylini olib tashlash`}
                    onClick={() => {
                      setExistingFiles((current) =>
                        current.filter((item) => item.id !== file.id),
                      );
                      setRemovedFileIds((current) => [...current, file.id]);
                    }}
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
            {loading
              ? "Saqlanmoqda..."
              : editing
                ? "O‘zgarishlarni saqlash"
                : "Vazifani yuborish"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
