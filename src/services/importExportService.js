import * as XLSX from "xlsx";
import { readDB, writeDB } from "./storage";
const aliases = {
  fullName: ["ism familiya", "fio", "full name", "fullname"],
  phone: ["telefon", "phone"],
  parentPhone: ["ota-ona telefon", "parent phone"],
  group: ["guruh", "group"],
  monthlyFee: ["oylik to‘lov", "oylik tolov", "fee"],
  note: ["izoh", "note"],
  status: ["status", "holati"],
};
export function parseTable(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map((x) => x.trim().toLowerCase());
  return lines.slice(1).map((line, index) => {
    const cells = line.split(sep).map((x) => x.trim()),
      row = { _row: index + 2 };
    headers.forEach((h, i) => {
      const key =
        Object.entries(aliases).find(([, a]) => a.includes(h))?.[0] || h;
      row[key] = cells[i] || "";
    });
    return row;
  });
}
export function download(name, data, type = "application/json") {
  const blob = new Blob([data], { type }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
export const importExportService = {
  backup: () =>
    download("obrano-backup.json", JSON.stringify(readDB(), null, 2)),
  restore: async (file) => writeDB(JSON.parse(await file.text())),
  exportCsv(rows, name = "export.csv") {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    download(
      name,
      [
        keys.join(","),
        ...rows.map((r) =>
          keys
            .map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`)
            .join(",")
        ),
      ].join("\n"),
      "text/csv"
    );
  },
  exportExcel(rows, name = "export.xlsx") {
    const ws = XLSX.utils.json_to_sheet(rows),
      wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, name);
  },
};
