import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { download, request } from "../services/storage";

const labels = {
  SUBMITTED: "Yuborildi",
  UNDER_REVIEW: "Tekshirilmoqda",
  REVISION_REQUESTED: "Qayta ishlash kerak",
  APPROVED: "Qabul qilindi",
  REJECTED: "Rad etildi",
};

export function StudentSubmissionDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
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
      await request(`/api/student/submissions/${id}/revisions`, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
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
            <label className="span-2">
              Yangi fayllar
              <input name="files" type="file" multiple />
            </label>
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
