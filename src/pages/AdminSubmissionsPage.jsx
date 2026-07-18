import { useCallback, useEffect, useState } from "react";
import { Search, ClipboardCheck, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { AppSelect } from "../components/ui/AppSelect";
import { Modal } from "../components/ui/Modal";
import { download, fetchFileBlob, request } from "../services/storage";
const labels = {
  SUBMITTED: "Yuborildi",
  UNDER_REVIEW: "Tekshirilmoqda",
  REVISION_REQUESTED: "Qayta ishlash kerak",
  APPROVED: "Qabul qilindi",
  REJECTED: "Rad etildi",
};
export function AdminSubmissionsPage() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1 }),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [period, setPeriod] = useState("all"),
    [page] = useState(1),
    [selected, setSelected] = useState(null),
    [preview, setPreview] = useState(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      request(
        `/api/admin/submissions?page=${page}&search=${encodeURIComponent(
          q
        )}&status=${status}&period=${period}`
      )
        .then((result) => {
          setData(result);
          setError("");
        })
        .catch(() =>
          setError(
            "Backend yangilanmagan. Render backendni qayta deploy qiling."
          )
        ),
    [page, period, q, status]
  );
  useEffect(() => {
    load();
  }, [load]);
  const closeReview = () => {
    if (preview?.src) URL.revokeObjectURL(preview.src);
    setPreview(null);
    setSelected(null);
  };
  const previewFile = async (file) => {
    const supported =
      file?.mimeType?.startsWith("image/") ||
      file?.mimeType === "application/pdf" ||
      file?.mimeType?.startsWith("text/");
    if (!supported) {
      toast.info(
        "Bu fayl turi brauzerda ko‘rsatilmaydi, yuklab olishingiz mumkin"
      );
      return;
    }
    if (preview?.src) URL.revokeObjectURL(preview.src);
    const blob = await fetchFileBlob(file.url);
    setPreview({ ...file, src: URL.createObjectURL(blob) });
  };
  const open = async (id) => {
    const row = await request(`/api/admin/submissions/${id}`);
    setSelected(row);
    const first = (row.files || []).find(
      (file) =>
        file.mimeType?.startsWith("image/") ||
        file.mimeType === "application/pdf" ||
        file.mimeType?.startsWith("text/")
    );
    if (first) await previewFile(first);
  };
  const review = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const v = Object.fromEntries(new FormData(e.currentTarget));
      await request(`/api/admin/submissions/${selected.id}/review`, {
        method: "PATCH",
        body: JSON.stringify(v),
      });
      toast.success("Review saqlandi");
      closeReview();
      await load();
    } catch {
      /*toast*/
    } finally {
      setSaving(false);
    }
  };
  const counts = data.counts || {
    submitted: data.items.filter((x) => x.status === "SUBMITTED").length,
    underReview: data.items.filter((x) => x.status === "UNDER_REVIEW").length,
    revisionRequested: data.items.filter(
      (x) => x.status === "REVISION_REQUESTED"
    ).length,
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Vazifalarni tekshirish</h2>
          <p>O‘quvchilar yuborgan barcha ishlar</p>
        </div>
      </div>
      <div className="money-stats">
        <article>
          <small>Yangi yuborilgan</small>
          <strong>{counts.submitted}</strong>
        </article>
        <article>
          <small>Tekshirilmoqda</small>
          <strong>{counts.underReview}</strong>
        </article>
        <article>
          <small>Qayta ishlashda</small>
          <strong>{counts.revisionRequested}</strong>
        </article>
      </div>
      <section className="table-card">
        {error && <div className="empty compact">{error}</div>}
        <div className="table-tools">
          <label className="searchbox">
            <Search />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Student yoki vazifa..."
            />
          </label>
          <AppSelect value={status} onValueChange={setStatus}>
            <option value="">Barcha statuslar</option>
            {Object.entries(labels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </AppSelect>
          <AppSelect value={period} onValueChange={setPeriod}>
            <option value="all">Barcha vaqt</option>
            <option value="today">Bugungi vazifalar</option>
            <option value="7d">Oxirgi 7 kun</option>
            <option value="30d">Oxirgi 30 kun</option>
          </AppSelect>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Vazifa</th>
                <th>Kategoriya</th>
                <th>Sana</th>
                <th>Status</th>
                <th>Material</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.studentName}</strong>
                  </td>
                  <td>
                    {x.title}
                    <small  className="submission-title">Versiya {x.revisionNumber}</small>
                  </td>
                  <td>{x.category}</td>
                  <td>{new Date(x.submittedAt).toLocaleDateString("uz-UZ")}</td>
                  <td>
                    <span
                      className={`submission-status status-${x.status.toLowerCase()}`}
                    >
                      {labels[x.status]}
                    </span>
                  </td>
                  <td>
                    {x.hasFile ? "Fayl" : ""}{" "}
                    {[x.githubUrl, x.demoUrl, x.figmaUrl, x.externalUrl].some(
                      Boolean
                    )
                      ? "Link"
                      : ""}
                  </td>
                  <td>
                    <button
                      className="btn btn--small"
                      onClick={() => open(x.id)}
                    >
                      <ClipboardCheck />
                      Tekshirish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.items.length && (
            <div className="empty">Submission topilmadi</div>
          )}
        </div>
      </section>
      <Modal
        open={!!selected}
        onClose={closeReview}
        title="Vazifani tekshirish"
        wide
      >
        <div className="review-modal">
          {selected && (
            <>
              <div className="review-submission">
                <strong>{selected.studentName}</strong>
                <h3>{selected.title}</h3>
                <p>{selected.description}</p>
                {selected.textContent && (
                  <pre className="submission-text">{selected.textContent}</pre>
                )}
                <div className="submission-links">
                  {selected.githubUrl && (
                    <a href={selected.githubUrl} target="_blank">
                      GitHub
                    </a>
                  )}
                  {selected.demoUrl && (
                    <a href={selected.demoUrl} target="_blank">
                      Demo
                    </a>
                  )}
                  {selected.figmaUrl && (
                    <a href={selected.figmaUrl} target="_blank">
                      Figma
                    </a>
                  )}
                  {(selected.files || []).map((file) => (
                    <span className="admin-file-actions" key={file.id}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => previewFile(file)}
                      >
                        <Eye />
                        {file.name}
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`${file.name} faylini yuklab olish`}
                        onClick={() => download(file.url, file.name)}
                      >
                        <Download />
                      </button>
                    </span>
                  ))}
                  {!selected.files?.length && selected.hasFile && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        download(selected.fileUrl, selected.fileName)
                      }
                    >
                      <Download />
                      {selected.fileName}
                    </button>
                  )}
                </div>
                {preview && (
                  <section className="admin-file-preview">
                    <header>
                      <strong>{preview.name}</strong>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => download(preview.url, preview.name)}
                        aria-label="Faylni yuklab olish"
                      >
                        <Download />
                      </button>
                    </header>
                    {preview.mimeType.startsWith("image/") ? (
                      <img src={preview.src} alt={preview.name} />
                    ) : (
                      <iframe
                        src={preview.src}
                        title={`${preview.name} ko‘rinishi`}
                      />
                    )}
                  </section>
                )}
              </div>
              <form className="form-grid" onSubmit={review}>
                <label>
                  Status
                  <AppSelect
                    name="status"
                    defaultValue={
                      selected.status === "SUBMITTED"
                        ? "UNDER_REVIEW"
                        : selected.status
                    }
                  >
                    <option value="UNDER_REVIEW">Tekshirilmoqda</option>
                    <option value="APPROVED">Qabul qilindi</option>
                    <option value="REVISION_REQUESTED">
                      Qayta ishlash kerak
                    </option>
                    <option value="REJECTED">Rad etildi</option>
                  </AppSelect>
                </label>
                <label>
                  Ball
                  <input
                    name="score"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={selected.score ?? ""}
                  />
                </label>
                <label className="span-2">
                  Feedback
                  <textarea
                    name="feedback"
                    rows="5"
                    defaultValue={selected.adminFeedback}
                  />
                </label>
                <div className="form-actions span-2">
                  <button className="btn btn--primary" disabled={saving}>
                    {saving ? "Saqlanmoqda..." : "Review saqlash"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
