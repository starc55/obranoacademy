import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpenCheck, CheckCheck, Repeat2, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { AppSelect, DatePicker } from "../components/ui/controls";
import { useApp } from "../context/AppContext";
import { request } from "../services/storage";

const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 8)}01`;
export function LessonPlanReportPage() {
  const { groups } = useApp(), teachers = [...new Set(groups.map((group) => group.teacher).filter(Boolean))],
    [filters, setFilters] = useState({ from: monthStart, to: today, groupId: "", teacher: "", status: "", scheduleType: "", carryOnly: false });
  const [report, setReport] = useState(null), [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value !== false));
      setReport(await request(`/api/admin/reports/lesson-plan-completion?${query}`));
    } finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const summary = report?.summary || {};
  return <>
    <Link className="back" to="/lesson-plans"><ArrowLeft /> Dars rejalariga qaytish</Link>
    <div className="page-head"><div><h2>Dars rejasi hisoboti</h2><p>Real davomat sessiyalari bo‘yicha bajarilish tahlili</p></div></div>
    <section className="report-filters"><label>Boshlanish<DatePicker value={filters.from} onValueChange={(value) => update("from", value)} /></label>
      <label>Tugash<DatePicker value={filters.to} onValueChange={(value) => update("to", value)} /></label>
      <label>Guruh<AppSelect value={filters.groupId} onValueChange={(value) => update("groupId", value)}><option value="">Barcha guruhlar</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</AppSelect></label>
      <label>O‘qituvchi<AppSelect value={filters.teacher} onValueChange={(value) => update("teacher", value)}><option value="">Barcha o‘qituvchilar</option>{teachers.map((teacher) => <option value={teacher} key={teacher}>{teacher}</option>)}</AppSelect></label>
      <label>Status<AppSelect value={filters.status} onValueChange={(value) => update("status", value)}><option value="">Barchasi</option><option value="OPEN">Jarayonda</option><option value="COMPLETED">Yakunlangan</option><option value="REOPENED">Qayta ochilgan</option></AppSelect></label>
      <label>Jadval<AppSelect value={filters.scheduleType} onValueChange={(value) => update("scheduleType", value)}><option value="">Barcha jadvallar</option><option value="MON_WED_FRI">Du-Chor-Ju</option><option value="TUE_THU_SAT">Se-Pa-Sh</option><option value="CUSTOM">Maxsus</option></AppSelect></label>
      <label className="lesson-carry-check"><input type="checkbox" checked={filters.carryOnly} onChange={(event) => update("carryOnly", event.target.checked)} />Faqat ko‘chirilganlar</label></section>
    <div className="money-stats lesson-report-stats">
      <article><BookOpenCheck /><small>Jami dars</small><strong>{summary.totalLessons || 0}</strong></article>
      <article><CheckCheck /><small>Yakunlangan</small><strong>{summary.completedPlans || 0}</strong></article>
      <article><TriangleAlert /><small>Yakunlanmagan</small><strong>{summary.unfinishedLessons || 0}</strong></article>
      <article><TriangleAlert /><small>Qisman bandlar</small><strong>{summary.partialItems || 0}</strong></article>
      <article><TriangleAlert /><small>Bajarilmagan bandlar</small><strong>{summary.notCompletedItems || 0}</strong></article>
      <article><Repeat2 /><small>Ko‘chirilgan band</small><strong>{summary.carriedItems || 0}</strong></article>
      <article><CheckCheck /><small>O‘rtacha bajarilish</small><strong>{summary.averageCompletion || 0}%</strong></article>
    </div>
    <section className="table-card"><div className="table-wrap"><table><thead><tr><th>Sana</th><th>Guruh</th><th>O‘qituvchi</th><th>Status</th><th>Bajarilish</th><th>Ko‘chirilgan</th></tr></thead>
      <tbody>{report?.rows?.map((row) => <tr key={row.id}><td>{row.lessonDate}</td><td>{row.groupName}</td><td>{row.teacher || "—"}</td><td>{row.status}</td><td>{row.metrics.percent}%</td><td>{row.metrics.carried}</td></tr>)}</tbody></table>
      {!loading && !report?.rows?.length && <div className="empty">Tanlangan davrda dars rejasi topilmadi</div>}</div></section>
  </>;
}
