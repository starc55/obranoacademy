import {
  Users,
  Layers3,
  UserCheck,
  UserX,
  Clock3,
  Wallet,
  TrendingUp,
  PackageOpen,
} from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { paymentsService } from "../services/paymentsService";
import { analyticsService } from "../services/analyticsService";
export function DashboardPage() {
  const { students, groups, attendance, payments, settings } = useApp(),
    now = new Date(),
    today = now.toISOString().slice(0, 10),
    todayRecords = attendance
      .filter((a) => a.date === today)
      .flatMap((a) => a.records),
    present = todayRecords.filter((r) => r.status === "present").length,
    absent = todayRecords.filter((r) => r.status === "absent").length,
    late = todayRecords.filter((r) => r.status === "late").length,
    month = today.slice(0, 7),
    monthPayments = payments.filter((p) => p.month === month),
    revenue = monthPayments.reduce((a, p) => a + (+p.amount || 0), 0),
    debts = monthPayments.filter((p) => paymentsService.debt(p) > 0).length,
    allRecords = attendance.flatMap((a) => a.records),
    attendanceRate = allRecords.length
      ? Math.round(
          (allRecords.filter(
            (r) => r.status === "present" || r.status === "late"
          ).length /
            allRecords.length) *
            100
        )
      : 0;
  const stats = [
    [Users, "Jami o‘quvchilar", students.length, "Real vaqt"],
    [
      Layers3,
      "Faol guruhlar",
      groups.filter((g) => g.active !== false).length,
      "Real vaqt",
    ],
    [UserCheck, "Bugun keldi", present, "Bugun"],
    [UserX, "Bugun kelmadi", absent, "Bugun"],
    [Clock3, "Kechikdi", late, "Bugun"],
    [Wallet, "Qarzdorlar", debts, "Joriy oy"],
    [
      TrendingUp,
      "Oylik tushum",
      `${(revenue / 1e6).toFixed(1)} mln`,
      "Joriy oy",
    ],
  ];
  const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      const date = d.toISOString().slice(0, 10),
        rs = attendance
          .filter((a) => a.date === date)
          .flatMap((a) => a.records);
      return {
        name: ["Ya", "Du", "Se", "Chor", "Pay", "Ju", "Sha"][d.getDay()],
        kelgan: rs.filter((r) => r.status === "present").length,
        kelmagan: rs.filter((r) => r.status === "absent").length,
      };
    }),
    groupData = groups.map((g) => ({
      name: g.name,
      students: students.filter((s) => s.groupId === g.id).length,
    })),
    attention = students
      .map((s) => ({
        student: s,
        absences: analyticsService.studentAbsences(s.id),
        payment: analyticsService.studentPaymentStatus(s.id),
      }))
      .filter(
        (x) =>
          x.absences >= 3 || x.payment === "debt" || x.payment === "overdue"
      )
      .slice(0, 5),
    dateLabel = new Intl.DateTimeFormat("uz-UZ", {
      day: "numeric",
      month: "long",
      weekday: "long",
    }).format(now);
  const hasData =
    students.length || groups.length || attendance.length || payments.length;
  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">{dateLabel.toUpperCase()}</span>
          <h2>Xayrli kun, {settings.adminName}</h2>
          <p>Markazingizdagi joriy holat va real ko‘rsatkichlar.</p>
        </div>
        <span className="live">
          <i /> Jonli ma’lumotlar
        </span>
      </div>
      <div className="stats-grid">
        {stats.map(([Icon, label, value, meta], i) => (
          <motion.article
            className="stat-card"
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.035 }}
          >
            <div className="stat-card__top">
              <span className="stat-card__icon">
                <Icon />
              </span>
              <span className="trend">{meta}</span>
            </div>
            <strong>{value}</strong>
            <p>{label}</p>
          </motion.article>
        ))}
      </div>
      {!hasData ? (
        <section className="panel empty">
          <span className="empty__icon">
            <PackageOpen className="empty-icon" />
          </span>
          <h3>Ma'lumot mavjud emas</h3>
          <p>
            Avval guruh va o‘quvchilarni kiriting. Dashboard real ma’lumotlar
            bilan avtomatik shakllanadi.
          </p>
        </section>
      ) : (
        <div className="dashboard-grid">
          <article className="panel">
            <header>
              <div>
                <h3>Haftalik davomat</h3>
                <p>Oxirgi 7 kunlik real dinamika</p>
              </div>
              <span className="badge badge--present">
                {attendanceRate}% o‘rtacha
              </span>
            </header>
            <div className="chart">
              <ResponsiveContainer>
                <AreaChart data={days}>
                  <defs>
                    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0"
                        stopColor="var(--text-primary)"
                        stopOpacity=".2"
                      />
                      <stop
                        offset="1"
                        stopColor="var(--text-primary)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="kelgan"
                    stroke="var(--text-primary)"
                    fill="url(#area)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
          <article className="panel">
            <header>
              <div>
                <h3>Bugungi holat</h3>
                <p>Davomat taqsimoti</p>
              </div>
            </header>
            {todayRecords.length ? (
              <div className="chart chart--pie">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Keldi", value: present },
                        { name: "Kelmadi", value: absent },
                        { name: "Kechikdi", value: late },
                      ]}
                      dataKey="value"
                      innerRadius={56}
                      outerRadius={76}
                      paddingAngle={4}
                    >
                      {[
                        "var(--text-primary)",
                        "var(--danger)",
                        "var(--warning)",
                      ].map((c) => (
                        <Cell key={c} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty compact">Bugun yo‘qlama qilinmagan</div>
            )}
          </article>
          <article className="panel">
            <header>
              <div>
                <h3>Guruhlar kesimida</h3>
                <p>Real o‘quvchilar soni</p>
              </div>
            </header>
            <div className="chart">
              <ResponsiveContainer>
                <BarChart data={groupData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar
                    dataKey="students"
                    fill="var(--text-primary)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
          <article className="panel">
            <header>
              <div>
                <h3>Diqqat talab qiladi</h3>
                <p>Davomat va to‘lov bo‘yicha real holat</p>
              </div>
            </header>
            <div className="attention-list">
              {attention.length ? (
                attention.map(({ student: s, absences, payment }) => (
                  <div key={s.id}>
                    <div className="avatar avatar--soft">
                      {s.firstName[0]}
                      {s.lastName[0]}
                    </div>
                    <div>
                      <strong>{s.fullName}</strong>
                      <small>
                        {groups.find((g) => g.id === s.groupId)?.name ||
                          "Guruhsiz"}
                      </small>
                    </div>
                    <span
                      className={`badge badge--${
                        absences >= 3 ? "absent" : payment
                      }`}
                    >
                      {absences >= 3
                        ? `${absences} dars qoldirgan`
                        : "To‘lov kutilmoqda"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty compact">Muammoli holat yo‘q</div>
              )}
            </div>
          </article>
        </div>
      )}
    </>
  );
}
