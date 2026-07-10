import { analyticsService } from "../services/analyticsService";
import { AppSelect, DatePicker } from "../components/ui/controls";
import { Download, Printer, CalendarRange } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useApp } from "../context/AppContext";
import { importExportService } from "../services/importExportService";
export function ReportsPage() {
  const { students, groups, attendance, payments } = useApp(),
    data = groups.map((g) => ({
      name: g.name,
      students: students.filter((s) => s.groupId === g.id).length,
      revenue:
        payments
          .filter(
            (p) => students.find((s) => s.id === p.studentId)?.groupId === g.id
          )
          .reduce((a, p) => a + (+p.amount || 0), 0) / 1e6,
      attendance: analyticsService.groupAttendance(g.id),
    }));
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Hisobotlar</h2>
          <p>Markaz samaradorligining to‘liq tahlili</p>
        </div>
        <div>
          <button className="btn" onClick={() => print()}>
            <Printer /> Print
          </button>
          <button
            className="btn btn--primary"
            onClick={() =>
              importExportService.exportExcel(data, "hisobot.xlsx")
            }
          >
            <Download /> Excel
          </button>
        </div>
      </div>
      <section className="report-filters">
        <label>
          <CalendarRange /> Boshlanish
          <DatePicker />
        </label>
        <label>
          Tugash
          <DatePicker />
        </label>
        <label>
          Guruh
          <AppSelect>
            <option>Barcha guruhlar</option>
            {groups.map((g) => (
              <option key={g.id}>{g.name}</option>
            ))}
          </AppSelect>
        </label>
        <button className="btn btn--dark">Qo‘llash</button>
      </section>
      <div className="dashboard-grid">
        <article className="panel panel--wide">
          <header>
            <div>
              <h3>Guruhlar samaradorligi</h3>
              <p>Davomat foizi</p>
            </div>
          </header>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} />
                <YAxis domain={[0, 100]} axisLine={false} />
                <Tooltip cursor={false} contentStyle={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"10px",color:"var(--text-primary)"}} />
                <Bar dataKey="attendance" fill="var(--text-primary)" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel">
          <header>
            <h3>Qisqa xulosa</h3>
          </header>
          <div className="report-summary">
            <div>
              <strong>{students.length}</strong>
              <span>Jami o‘quvchi</span>
            </div>
            <div>
              <strong>{attendance.length}</strong>
              <span>Dars sessiyasi</span>
            </div>
            <div>
              <strong>{payments.length}</strong>
              <span>To‘lov yozuvi</span>
            </div>
          </div>
        </article>
      </div>
      <section className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Guruh</th>
                <th>O‘quvchilar</th>
                <th>Davomat</th>
                <th>Tushum</th>
                <th>Samaradorlik</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.name}>
                  <td>
                    <strong>{r.name}</strong>
                  </td>
                  <td>{r.students}</td>
                  <td>{r.attendance}%</td>
                  <td>{r.revenue.toFixed(1)} mln</td>
                  <td>
                    <div className="progress">
                      <i style={{ "--w": `${r.attendance}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
