import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, ExternalLink, FileUp, Paperclip, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { download, request } from "../services/storage";

const labels = {
  SUBMITTED: "Yuborildi",
  UNDER_REVIEW: "Tekshirilmoqda",
  REVISION_REQUESTED: "Qayta ishlash kerak",
  APPROVED: "Qabul qilindi",
  REJECTED: "Rad etildi",
};
const fileSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function StudentSubmissionDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [revisionFiles, setRevisionFiles] = useState([]);
  const revisionInputRef = useRef(null);
  const load = useCallback(
    () => request(`/api/student/submissions/${id}`).then(setItem),
    [id]
  );
  useEffect(() => {
    load();
  }, [load]);
  const revise = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const form = new FormData(event.currentTarget);
      form.delete("files");
      revisionFiles.forEach((file) => form.append("files", file));
      await request(`/api/student/submissions/${id}/revisions`, {
        method: "POST",
        body: form,
      });
      setRevisionFiles([]);
      toast.success("Vazifa qayta yuborildi");
      await load();
    } catch {
      /* request toast */
    } finally {
      setLoading(false);
    }
  };
  if (!item)
    return (
      <div className="route-loader">
        <i />
        <span>Yuklanmoqda...</span>
      </div>
    );
  const links = [
    ["GitHub", item.githubUrl],
    ["Demo", item.demoUrl],
    ["Figma", item.figmaUrl],
    ["Tashqi link", item.externalUrl],
  ].filter((entry) => entry[1]);
  const files = item.files || [];
  return (
    <>
      <div className="page-head submission-detail-head">
        <div>
          <span
            className={`submission-status status-${item.status.toLowerCase()}`}
          >
            {labels[item.status]}
          </span>
          <h2>{item.title}</h2>
          <p>
            {item.category} ·{" "}
            {new Date(item.submittedAt).toLocaleString("uz-UZ")}
          </p>
        </div>
        <strong className="score-display">
          {item.score == null ? "—" : `${item.score}/100`}
        </strong>
      </div>
      <div className="submission-detail-grid">
        <section className="panel">
          <h3>Yuborilgan ma’lumotlar</h3>
          <p>{item.description || "Tavsif yo‘q"}</p>
          {item.textContent && (
            <pre className="submission-text">{item.textContent}</pre>
          )}
          <div className="submission-links">
            {links.map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noreferrer">
                <ExternalLink />
                {label}
              </a>
            ))}
            {files.map((file) => (
              <button
                type="button"
                key={file.id}
                onClick={() => download(file.url, file.name)}
              >
                <Download />
                {file.name}
              </button>
            ))}
            {!files.length && item.hasFile && (
              <button
                type="button"
                onClick={() => download(item.fileUrl, item.fileName)}
              >
                <Download />
                {item.fileName}
              </button>
            )}
          </div>
        </section>
        <aside className="panel review-result">
          <h3>Admin javobi</h3>
          <strong>{labels[item.status]}</strong>
          <p>{item.adminFeedback || "Hali feedback yozilmagan"}</p>
          {item.reviewedAt && (
            <small>{new Date(item.reviewedAt).toLocaleString("uz-UZ")}</small>
          )}
        </aside>
      </div>
      {item.status === "REVISION_REQUESTED" && (
        <section className="panel revision-panel">
          <h3>
            <RotateCcw /> Qayta topshirish
          </h3>
          <form className="form-grid" onSubmit={revise}>
            <label className="span-2">
              Yangilangan izoh
              <textarea
                name="textContent"
                defaultValue={item.textContent}
                rows="5"
              />
            </label>
            <label>
              GitHub
              <input
                name="githubUrl"
                type="url"
                defaultValue={item.githubUrl || ""}
              />
            </label>
            <label>
              Demo
              <input
                name="demoUrl"
                type="url"
                defaultValue={item.demoUrl || ""}
              />
            </label>
            <div className="span-2 revision-upload">
              <button
                type="button"
                className={`custom-file multi-file-picker ${revisionFiles.length ? "has-file" : ""}`}
                onClick={() => revisionInputRef.current?.click()}
              >
                <input
                  ref={revisionInputRef}
                  name="files"
                  type="file"
                  multiple
                  onChange={(event) => {
                    setRevisionFiles((current) => [
                      ...current,
                      ...Array.from(event.target.files || []),
                    ]);
                    event.target.value = "";
                  }}
                />
                <span className="custom-file__icon"><FileUp /></span>
                <span>
                  <strong>{revisionFiles.length ? `${revisionFiles.length} ta fayl tanlandi` : "Yangi fayllarni tanlang"}</strong>
                  <small>Bir vaqtning o‘zida bir nechta fayl tanlash mumkin</small>
                </span>
              </button>
              {revisionFiles.length > 0 && (
                <div className="selected-file-list revision-file-list">
                  {revisionFiles.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`}>
                      <Paperclip />
                      <span><strong>{file.name}</strong><small>{fileSize(file.size)}</small></span>
                      <button
                        type="button"
                        aria-label={`${file.name} faylini olib tashlash`}
                        onClick={() => setRevisionFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                      ><X /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-actions span-2">
              <button className="btn btn--primary" disabled={loading}>
                {loading ? "Yuborilmoqda..." : "Qayta yuborish"}
              </button>
            </div>
          </form>
        </section>
      )}
      {item.revisions.length > 0 && (
        <section className="panel">
          <h3>Versiyalar tarixi</h3>
          <div className="revision-list">
            {item.revisions.map((revision) => (
              <div key={revision.id}>
                <strong>Versiya {revision.revision_number}</strong>
                <span>
                  {new Date(revision.submitted_at).toLocaleString("uz-UZ")}
                </span>
                <p>{revision.feedback || "Feedback yo‘q"}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
