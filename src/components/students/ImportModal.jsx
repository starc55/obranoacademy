import { useState } from "react";
import { Upload, ClipboardPaste, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../ui/Modal";
import { parseTable } from "../../services/importExportService";
import { studentsService } from "../../services/studentsService";
import { groupsService } from "../../services/groupsService";
import { useApp } from "../../context/AppContext";
export function ImportModal({ open, onClose }) {
  const { students, groups } = useApp(),
    [text, setText] = useState(""),
    [rows, setRows] = useState([]),
    [done, setDone] = useState(null);
  const preview = () => {
    const parsed = parseTable(text).map((r) => ({
      ...r,
      _duplicate: students.some((s) => s.phone === r.phone),
    }));
    setRows(parsed);
  };
  const run = () => {
    let added = 0,
      skipped = 0;
    rows.forEach((r) => {
      if (r._duplicate) {
        skipped++;
        return;
      }
      let group = groups.find(
        (g) => g.name.toLowerCase() === r.group?.toLowerCase()
      );
      if (!group && r.group)
        group = groupsService.create({
          name: r.group,
          subject: "Import",
          price: +r.monthlyFee || 0,
          active: true,
          color: "#111111",
        });
      const parts = (r.fullName || "").split(" ");
      studentsService.create({
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
        fullName: r.fullName,
        phone: r.phone,
        parentPhone: r.parentPhone || "",
        groupId: group?.id || "",
        monthlyFee: +String(r.monthlyFee || 0).replace(/\D/g, ""),
        joinedDate: new Date().toISOString().slice(0, 10),
        note: r.note || "",
        status: r.status === "Noaktiv" ? "inactive" : "active",
      });
      added++;
    });
    setDone({ added, skipped });
    toast.success("Import muvaffaqiyatli yakunlandi");
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="O‘quvchilarni import qilish"
      wide
    >
      <div className="steps">
        <b className={rows.length ? "done" : "active"}>1. Ma’lumot</b>
        <b className={rows.length ? "active" : ""}>2. Preview</b>
        <b className={done ? "active" : ""}>3. Natija</b>
      </div>
      {done ? (
        <div className="import-result">
          <CheckCircle2 />
          <h3>{done.added} ta o‘quvchi qo‘shildi</h3>
          <p>{done.skipped} ta duplicate telefon o‘tkazib yuborildi.</p>
          <button className="btn btn--primary" onClick={onClose}>
            Tayyor
          </button>
        </div>
      ) : !rows.length ? (
        <div className="paste-area">
          <ClipboardPaste />
          <h3>Notion, Excel yoki Sheets’dan paste qiling</h3>
          <p>
            Birinchi qator header, ustunlar Tab yoki vergul bilan ajratilgan
            bo‘lsin.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              "Ism Familiya\tTelefon\tGuruh\tOylik to‘lov\tIzoh"
            }
          />
          <div className="form-actions">
            <label className="btn">
              <Upload /> CSV fayl
              <input
                hidden
                type="file"
                accept=".csv,.txt"
                onChange={async (e) => setText(await e.target.files[0].text())}
              />
            </label>
            <button
              className="btn btn--primary"
              disabled={!text.trim()}
              onClick={preview}
            >
              Preview
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="table-wrap import-preview">
            <table>
              <thead>
                <tr>
                  <th>Qator</th>
                  <th>Ism</th>
                  <th>Telefon</th>
                  <th>Guruh</th>
                  <th>Oylik</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._row} className={r._duplicate ? "row-error" : ""}>
                    <td>{r._row}</td>
                    <td>{r.fullName}</td>
                    <td>{r.phone}</td>
                    <td>{r.group}</td>
                    <td>{r.monthlyFee}</td>
                    <td>{r._duplicate ? "Duplicate" : "Tayyor"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button className="btn" onClick={() => setRows([])}>
              Orqaga
            </button>
            <button className="btn btn--primary" onClick={run}>
              Import qilish ({rows.filter((r) => !r._duplicate).length})
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
