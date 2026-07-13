import "dotenv/config";
import express from "express";
import cors from "cors";
import { createHmac, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { calculateHealth, detectRisk } from "./services/studentInsights.js";
const requiredEnv = [
  "DATABASE_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "JWT_SECRET",
];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length)
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`,
  );
const sql = neon(process.env.DATABASE_URL),
  app = express();
await sql`alter table students add column if not exists lesson_time time`;
await sql`create table if not exists student_progress_events(id uuid primary key default gen_random_uuid(),student_id uuid not null references students(id) on delete cascade,type text not null,title text not null,description text not null default '',value numeric,metadata jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now(),created_at timestamptz not null default now())`;
await sql`create index if not exists progress_events_student_date_idx on student_progress_events(student_id,occurred_at desc)`;
await sql`create table if not exists weekly_summaries(id uuid primary key default gen_random_uuid(),week_start date not null,week_end date not null,summary_type text not null default 'admin',metrics jsonb not null,telegram_status text not null default 'pending',telegram_sent_at timestamptz,telegram_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(week_start,summary_type))`;
await sql`create index if not exists weekly_summaries_week_idx on weekly_summaries(week_start desc)`;
await sql`create table if not exists smart_alerts(id uuid primary key default gen_random_uuid(),student_id uuid references students(id) on delete cascade,group_id uuid references groups(id) on delete set null,type text not null,severity text not null,title text not null,message text not null,status text not null default 'OPEN',fingerprint text not null unique,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
await sql`create index if not exists smart_alerts_status_idx on smart_alerts(status,severity,created_at desc)`;
await sql.transaction([
  sql`alter table attendance_records drop constraint if exists attendance_records_status_check`,
  sql`update attendance_records set status=case status when 'present' then 'entered' when 'absent' then 'not_entered' else status end where status in ('present','absent')`,
  sql`alter table attendance_records add constraint attendance_records_status_check check(status in ('entered','not_entered','late','excused','left'))`,
]);
await sql`update weekly_summaries set metrics=(metrics-'absent')||jsonb_build_object('notEntered',metrics->'absent') where metrics ? 'absent'`;
await sql`create unique index if not exists payments_student_month_unique on payments(student_id,payment_month)`;
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
].filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "5mb" }));
app.get("/", (_req, res) => {
  res.json({ success: true, message: "OBRANO Academy API is running" });
});
const signToken = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", process.env.JWT_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
};
const validToken = (token) => {
  try {
    const [body, signature] = token.split(".");
    const expected = createHmac("sha256", process.env.JWT_SECRET)
      .update(body)
      .digest("base64url");
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return false;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return payload.exp > Date.now();
  } catch {
    return false;
  }
};
app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/auth/login") return next();
  if (
    ["/cron/weekly", "/cron/reminders"].includes(req.path) &&
    process.env.CRON_SECRET &&
    req.headers["x-cron-secret"] === process.env.CRON_SECRET
  )
    return next();
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token || !validToken(token))
    return res.status(401).json({ error: "Avtorizatsiya talab qilinadi" });
  next();
});
app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");
  const emailOk = email === process.env.ADMIN_EMAIL.trim().toLowerCase();
  const passwordBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(process.env.ADMIN_PASSWORD);
  const passwordOk =
    passwordBuffer.length === expectedBuffer.length &&
    timingSafeEqual(passwordBuffer, expectedBuffer);
  if (!emailOk || !passwordOk)
    return res.status(401).json({ error: "Login yoki parol noto‘g‘ri" });
  res.json({
    token: signToken({ sub: email, exp: Date.now() + 12 * 60 * 60 * 1000 }),
  });
});
const dateOnly = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(value.getDate()).padStart(2, "0")}`;
};
const studentOut = (r) => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  fullName: `${r.first_name} ${r.last_name}`,
  phone: r.phone,
  parentPhone: r.parent_phone,
  groupId: r.group_id,
  enrollmentType: r.enrollment_type,
  scheduleDays: r.schedule_days || [],
  lessonTime: r.lesson_time?.slice?.(0, 5) || r.lesson_time || null,
  monthlyFee: Number(r.monthly_fee),
  joinedDate: dateOnly(r.joined_date),
  birthDate: dateOnly(r.birth_date),
  note: r.note,
  avatarUrl: r.avatar_url,
  status: r.status,
});
const groupOut = (r) => ({
  id: r.id,
  name: r.name,
  subject: r.subject,
  teacher: r.teacher,
  days: r.days,
  start: r.start_time?.slice?.(0, 5) || r.start_time,
  end: r.end_time?.slice?.(0, 5) || r.end_time,
  room: r.room,
  price: Number(r.price),
  color: r.color,
  note: r.note,
  active: r.active,
});
const paymentOut = (r) => ({
  id: r.id,
  studentId: r.student_id,
  month: dateOnly(r.payment_month)?.slice(0, 7),
  amount: Number(r.amount),
  fee: Number(r.fee),
  absencePenalty: Number(r.absence_penalty),
  date: dateOnly(r.payment_date),
  method: r.method,
  note: r.note,
});
app.get("/api/health", async (_req, res) => {
  const [row] = await sql`select now() as now`;
  res.json({ ok: true, database: true, now: row.now });
});
app.get("/api/data", async (_req, res, next) => {
  try {
    const [students, groups, sessions, records, payments, settings] =
      await Promise.all([
        sql`select * from students order by created_at`,
        sql`select * from groups order by created_at`,
        sql`select * from attendance_sessions order by session_date`,
        sql`select * from attendance_records`,
        sql`select * from payments order by created_at`,
        sql`select data from app_settings where id='default'`,
      ]);
    const attendance = sessions.map((s) => ({
      id: s.id,
      groupId: s.group_id,
      studentId: s.student_id,
      sessionType: s.session_type,
      date: dateOnly(s.session_date),
      lessonTime: s.lesson_time?.slice?.(0, 5) || s.lesson_time || null,
      records: records
        .filter((r) => r.session_id === s.id)
        .map((r) => ({
          studentId: r.student_id,
          status: r.status,
          note: r.note,
        })),
    }));
    res.json({
      students: students.map(studentOut),
      groups: groups.map(groupOut),
      attendance,
      payments: payments.map(paymentOut),
      settings: settings[0]?.data || {},
    });
  } catch (e) {
    next(e);
  }
});
app.post("/api/students", async (req, res, next) => {
  try {
    const s = req.body;
    const [row] =
      await sql`insert into students(id,first_name,last_name,phone,parent_phone,group_id,enrollment_type,schedule_days,lesson_time,monthly_fee,joined_date,birth_date,note,avatar_url,status) values(${
        s.id
      },${s.firstName},${s.lastName},${s.phone},${s.parentPhone || ""},${
        s.groupId || null
      },${s.enrollmentType || "group"},${s.scheduleDays || []},${s.lessonTime || null},${
        s.monthlyFee || 0
      },${s.joinedDate || new Date().toISOString().slice(0, 10)},${
        s.birthDate || null
      },${s.note || ""},${s.avatarUrl || null},${
        s.status || "active"
      }) returning *`;
    let payment = null;
    if (s.initialPayment?.status === "paid") {
      const p = s.initialPayment,
        month = `${p.month}-01`;
      try {
        const [paymentRow] =
          await sql`insert into payments(id,student_id,payment_month,amount,fee,absence_penalty,payment_date,method,note) values(${
            p.id
          },${row.id},${month},${p.amount || s.monthlyFee || 0},${
            s.monthlyFee || 0
          },0,${p.date || new Date().toISOString().slice(0, 10)},${
            p.method || "Naqd"
          },${p.note || "O‘quvchi qo‘shilganda qabul qilindi"}) returning *`;
        payment = paymentOut(paymentRow);
      } catch (paymentError) {
        await sql`delete from students where id=${row.id}`;
        throw paymentError;
      }
    }
    res.status(201).json({ student: studentOut(row), payment });
  } catch (e) {
    next(e);
  }
});
app.patch("/api/students/:id", async (req, res, next) => {
  try {
    const s = req.body;
    const [row] = await sql`update students set first_name=coalesce(${
      s.firstName || null
    },first_name),last_name=coalesce(${
      s.lastName || null
    },last_name),phone=coalesce(${
      s.phone || null
    },phone),parent_phone=coalesce(${
      s.parentPhone ?? null
    },parent_phone),group_id=case when ${
      s.enrollmentType || null
    }='individual' then null else coalesce(${
      s.groupId || null
    },group_id) end,enrollment_type=coalesce(${
      s.enrollmentType || null
    },enrollment_type),schedule_days=coalesce(${
      s.scheduleDays || null
    },schedule_days),lesson_time=case when ${s.enrollmentType || null}='group' then null else coalesce(${s.lessonTime || null},lesson_time) end,monthly_fee=coalesce(${
      s.monthlyFee ?? null
    },monthly_fee),joined_date=coalesce(${
      s.joinedDate || null
    },joined_date),birth_date=coalesce(${
      s.birthDate || null
    },birth_date),note=coalesce(${s.note ?? null},note),status=coalesce(${
      s.status || null
    },status),updated_at=now() where id=${req.params.id} returning *`;
    res.json(studentOut(row));
  } catch (e) {
    next(e);
  }
});
app.delete("/api/students/:id", async (req, res, next) => {
  try {
    await sql`delete from students where id=${req.params.id}`;
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
const loadStudentInsights = async (studentId) => {
  const [attendance, events] = await Promise.all([
    sql`select ar.status,s.session_date as date from attendance_records ar join attendance_sessions s on s.id=ar.session_id where ar.student_id=${studentId} and s.session_date>=current_date-30 order by s.session_date`,
    sql`select id,type,title,description,value,metadata,occurred_at from student_progress_events where student_id=${studentId} and occurred_at>=now()-interval '30 days' order by occurred_at`,
  ]);
  const health = calculateHealth({ attendance, events });
  return { health, risk: detectRisk({ attendance, health }) };
};
app.get("/api/students/:id/insights", async (req, res, next) => {
  try {
    res.json(await loadStudentInsights(req.params.id));
  } catch (e) {
    next(e);
  }
});
app.get("/api/students/:id/timeline", async (req, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const [attendance, events] = await Promise.all([
      sql`select ar.id,ar.status,s.session_date as occurred_at from attendance_records ar join attendance_sessions s on s.id=ar.session_id where ar.student_id=${req.params.id} order by s.session_date desc limit ${limit}`,
      sql`select id,type,title,description,value,metadata,occurred_at from student_progress_events where student_id=${req.params.id} order by occurred_at desc limit ${limit}`,
    ]);
    const attendanceEvents = attendance.map((row) => ({
      id: row.id,
      type: `attendance_${row.status}`,
      title: {
        entered: "Darsga kirdi",
        not_entered: "Darsga kirmadi",
        late: "Darsga kechikdi",
        excused: "Sababli qatnashmadi",
        left: "Darsdan erta ketdi",
      }[row.status],
      description: "",
      occurredAt: row.occurred_at,
    }));
    res.json(
      [
        ...attendanceEvents,
        ...events.map((row) => ({ ...row, occurredAt: row.occurred_at })),
      ]
        .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
        .slice(0, limit),
    );
  } catch (e) {
    next(e);
  }
});
app.post("/api/students/:id/timeline", async (req, res, next) => {
  try {
    const e = req.body,
      allowed = [
        "assignment_created",
        "assignment_submitted",
        "assignment_late",
        "grade_added",
        "feedback_added",
      ];
    if (!allowed.includes(e.type) || !e.title)
      return res.status(400).json({ error: "Event ma’lumoti noto‘g‘ri" });
    const [row] =
      await sql`insert into student_progress_events(student_id,type,title,description,value,metadata,occurred_at) values(${req.params.id},${e.type},${e.title},${e.description || ""},${e.value ?? null},${JSON.stringify(e.metadata || {})}::jsonb,${e.occurredAt || new Date().toISOString()}) returning *`;
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});
app.get("/api/insights/overview", async (_req, res, next) => {
  try {
    const students =
      await sql`select id,first_name,last_name,group_id from students where status='active'`;
    const rows = [];
    for (const student of students)
      rows.push({ ...student, ...(await loadStudentInsights(student.id)) });
    res.json({
      averageHealth: Math.round(
        rows
          .filter((x) => x.health.score != null)
          .reduce((n, x) => n + x.health.score, 0) /
          (rows.filter((x) => x.health.score != null).length || 1),
      ),
      highRisk: rows.filter((x) => ["HIGH", "CRITICAL"].includes(x.risk.level)),
      students: rows,
    });
  } catch (e) {
    next(e);
  }
});
app.post("/api/groups", async (req, res, next) => {
  try {
    const g = req.body;
    const [row] =
      await sql`insert into groups(id,name,subject,teacher,days,start_time,end_time,room,price,color,note,active) values(${
        g.id
      },${g.name},${g.subject || ""},${g.teacher || ""},${g.days || ""},${
        g.start || null
      },${g.end || null},${g.room || ""},${g.price || 0},${
        g.color || "#111111"
      },${g.note || ""},${g.active !== false}) returning *`;
    res.status(201).json(groupOut(row));
  } catch (e) {
    next(e);
  }
});
app.patch("/api/groups/:id", async (req, res, next) => {
  try {
    const g = req.body;
    const [row] = await sql`update groups set name=coalesce(${
      g.name || null
    },name),subject=coalesce(${g.subject || null},subject),teacher=coalesce(${
      g.teacher ?? null
    },teacher),days=coalesce(${g.days ?? null},days),room=coalesce(${
      g.room ?? null
    },room),price=coalesce(${g.price ?? null},price),color=coalesce(${
      g.color || null
    },color),active=coalesce(${
      g.active ?? null
    },active),updated_at=now() where id=${req.params.id} returning *`;
    res.json(groupOut(row));
  } catch (e) {
    next(e);
  }
});
app.delete("/api/groups/:id", async (req, res, next) => {
  try {
    await sql`delete from groups where id=${req.params.id}`;
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
app.post("/api/payments", async (req, res, next) => {
  try {
    const p = req.body,
      month = `${p.month}-01`;
    const [row] =
      await sql`insert into payments(id,student_id,payment_month,amount,fee,absence_penalty,payment_date,method,note) values(${
        p.id
      },${p.studentId},${month},${p.amount || 0},${p.fee || 0},${
        p.absencePenalty || 0
      },${p.date || null},${p.method || "Naqd"},${p.note || ""}) on conflict(student_id,payment_month) do update set amount=payments.amount+excluded.amount,fee=excluded.fee,absence_penalty=excluded.absence_penalty,payment_date=excluded.payment_date,method=excluded.method,note=excluded.note,updated_at=now() returning *`;
    res.status(201).json(paymentOut(row));
  } catch (e) {
    next(e);
  }
});
app.patch("/api/payments/:id", async (req, res, next) => {
  try {
    const p = req.body,
      month = p.month ? `${p.month}-01` : null;
    const [row] = await sql`update payments set student_id=coalesce(${
      p.studentId || null
    },student_id),payment_month=coalesce(${month},payment_month),amount=coalesce(${
      p.amount ?? null
    },amount),fee=coalesce(${p.fee ?? null},fee),absence_penalty=coalesce(${
      p.absencePenalty ?? null
    },absence_penalty),payment_date=coalesce(${
      p.date || null
    },payment_date),method=coalesce(${p.method || null},method),note=coalesce(${
      p.note ?? null
    },note),updated_at=now() where id=${req.params.id} returning *`;
    res.json(paymentOut(row));
  } catch (e) {
    next(e);
  }
});
app.delete("/api/payments/:id", async (req, res, next) => {
  try {
    await sql`delete from payments where id=${req.params.id}`;
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
app.put("/api/attendance", async (req, res, next) => {
  try {
    const a = req.body;
    const [session] =
      a.sessionType === "individual"
        ? await sql`insert into attendance_sessions(group_id,student_id,session_type,session_date,lesson_time) values(null,${
            a.studentId
          },'individual',${a.date},${
            a.lessonTime || null
          }) on conflict(student_id,session_date) where session_type='individual' do update set lesson_time=excluded.lesson_time,updated_at=now() returning *`
        : await sql`insert into attendance_sessions(group_id,student_id,session_type,session_date,lesson_time) values(${a.groupId},null,'group',${a.date},null) on conflict(group_id,session_date) where session_type='group' do update set updated_at=now() returning *`;
    const recordQueries = (a.records || []).map(
      (r) =>
        sql`insert into attendance_records(session_id,student_id,status,note) values(${
          session.id
        },${r.studentId},${r.status},${r.note || ""})`,
    );
    await sql.transaction([
      sql`delete from attendance_records where session_id=${session.id}`,
      ...recordQueries,
    ]);
    res.json({ id: session.id, ...a });
  } catch (e) {
    next(e);
  }
});
app.put("/api/settings", async (req, res, next) => {
  try {
    const data = JSON.stringify(req.body);
    await sql`insert into app_settings(id,data,updated_at) values('default',${data}::jsonb,now()) on conflict(id) do update set data=excluded.data,updated_at=now()`;
    res.json(req.body);
  } catch (e) {
    next(e);
  }
});
const addMonth = (date) => {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  next.setDate(
    Math.min(
      day,
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
    ),
  );
  return dateOnly(next);
};
const sendTelegram = async (text) => {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID)
    return { sent: false, error: "Telegram sozlanmagan" };
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
      },
    );
    if (!response.ok) throw new Error(`Telegram ${response.status}`);
    return { sent: true, error: null };
  } catch (error) {
    return { sent: false, error: error.message };
  }
};
const weekRange = (offset = 0) => {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1 + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: dateOnly(start), end: dateOnly(end) };
};
const buildWeeklyMetrics = async (range) => {
  const [sessions, records, activeStudents, lateAssignments, groups] =
    await Promise.all([
      sql`select id,group_id,student_id,session_date from attendance_sessions where session_date between ${range.start} and ${range.end}`,
      sql`select ar.student_id,ar.status,ar.session_id from attendance_records ar join attendance_sessions s on s.id=ar.session_id where s.session_date between ${range.start} and ${range.end}`,
      sql`select id from students where status='active'`,
      sql`select count(*)::int count from student_progress_events where type='assignment_late' and occurred_at::date between ${range.start} and ${range.end}`,
      sql`select g.id,g.name,count(ar.student_id)::int total,count(ar.student_id) filter(where ar.status in('entered','late'))::int attended from groups g left join attendance_sessions s on s.group_id=g.id and s.session_date between ${range.start} and ${range.end} left join attendance_records ar on ar.session_id=s.id where g.active=true group by g.id,g.name`,
    ]);
  const attended = records.filter((row) =>
    ["entered", "late"].includes(row.status),
  ).length;
  const notEntered = records.filter(
    (row) => row.status === "not_entered",
  ).length;
  const late = records.filter((row) => row.status === "late").length;
  let behind = 0;
  for (const student of activeStudents) {
    const insight = await loadStudentInsights(student.id);
    if (["HIGH", "CRITICAL"].includes(insight.risk.level)) behind++;
  }
  const groupResults = groups
    .map((group) => ({
      name: group.name,
      attendance: group.total
        ? Math.round((group.attended / group.total) * 100)
        : null,
    }))
    .filter((group) => group.attendance != null)
    .sort((a, b) => b.attendance - a.attendance);
  return {
    lessons: sessions.length,
    attendance: records.length
      ? Math.round((attended / records.length) * 100)
      : 0,
    attended,
    notEntered,
    late,
    activeStudents: activeStudents.length,
    behind,
    overdueAssignments: lateAssignments[0].count,
    bestGroup: groupResults[0] || null,
    attentionGroup: groupResults.at(-1) || null,
  };
};
const generateWeeklySummary = async (offset = -1, send = true) => {
  const range = weekRange(offset),
    metrics = await buildWeeklyMetrics(range);
  const [summary] =
    await sql`insert into weekly_summaries(week_start,week_end,summary_type,metrics,updated_at) values(${range.start},${range.end},'admin',${JSON.stringify(metrics)}::jsonb,now()) on conflict(week_start,summary_type) do update set metrics=excluded.metrics,updated_at=now() returning *`;
  await sql`insert into notifications(type,title,message,due_date,dedupe_key) values('weekly_summary','Haftalik hisobot tayyor',${`${range.start} — ${range.end} · ${metrics.attendance}% davomat · ${metrics.behind} nafar risk`},${range.end},${`weekly_summary:${summary.id}`}) on conflict(dedupe_key) do nothing`;
  if (send && summary.telegram_status !== "sent") {
    const message = `<b>OBRANO Academy · Haftalik hisobot</b>\n📅 ${range.start} — ${range.end}\n📚 ${metrics.lessons} ta dars\n✅ Umumiy davomat: ${metrics.attendance}%\n⚠️ Orqada qolayotganlar: ${metrics.behind} nafar\n📝 Kechikkan vazifalar: ${metrics.overdueAssignments}\n🏆 Eng yaxshi guruh: ${metrics.bestGroup?.name || "—"} ${metrics.bestGroup?.attendance ?? 0}%`;
    const telegram = await sendTelegram(message);
    await sql`update weekly_summaries set telegram_status=${telegram.sent ? "sent" : "failed"},telegram_sent_at=${telegram.sent ? new Date().toISOString() : null},telegram_error=${telegram.error},updated_at=now() where id=${summary.id}`;
  }
  return {
    id: summary.id,
    weekStart: range.start,
    weekEnd: range.end,
    metrics,
    telegramStatus: summary.telegram_status,
  };
};
const generateSmartAlerts = async () => {
  const students =
    await sql`select id,first_name,last_name,group_id from students where status='active'`;
  let created = 0;
  for (const student of students) {
    const { health, risk } = await loadStudentInsights(student.id);
    const candidates = [];
    if (risk.consecutiveAbsences >= 2)
      candidates.push({
        type: "CONSECUTIVE_ABSENCES",
        severity: risk.consecutiveAbsences >= 3 ? "CRITICAL" : "HIGH",
        title: "Ketma-ket dars qoldirilgan",
        message: `${student.first_name} ${student.last_name} ${risk.consecutiveAbsences} ta darsni ketma-ket qoldirdi.`,
      });
    if (risk.attendanceRate < 70)
      candidates.push({
        type: "LOW_ATTENDANCE",
        severity: risk.attendanceRate < 50 ? "CRITICAL" : "HIGH",
        title: "Davomat 70% dan past",
        message: `${student.first_name} ${student.last_name} davomat ko‘rsatkichi ${risk.attendanceRate}%.`,
      });
    if (health.score != null && health.score < 50)
      candidates.push({
        type: "LOW_HEALTH",
        severity: health.score < 35 ? "CRITICAL" : "HIGH",
        title: "Health Score pasaygan",
        message: `${student.first_name} ${student.last_name} Health Score: ${health.score}/100.`,
      });
    const overdue =
      await sql`select count(*)::int count from student_progress_events where student_id=${student.id} and type='assignment_late' and occurred_at>=now()-interval '30 days'`;
    if (overdue[0].count)
      candidates.push({
        type: "OVERDUE_ASSIGNMENT",
        severity: overdue[0].count >= 2 ? "HIGH" : "WARNING",
        title: "Vazifa muddati o‘tgan",
        message: `${student.first_name} ${student.last_name}: ${overdue[0].count} ta kechikkan vazifa.`,
      });
    for (const alert of candidates) {
      const fingerprint = `${student.id}:${alert.type}:${new Date().toISOString().slice(0, 7)}`;
      const inserted =
        await sql`insert into smart_alerts(student_id,group_id,type,severity,title,message,fingerprint,metadata) values(${student.id},${student.group_id},${alert.type},${alert.severity},${alert.title},${alert.message},${fingerprint},${JSON.stringify({ healthScore: health.score, risk: risk.level })}::jsonb) on conflict(fingerprint) do nothing returning id`;
      if (inserted.length) {
        created++;
        await sql`insert into notifications(type,student_id,title,message,due_date,dedupe_key) values('smart_alert',${student.id},${alert.title},${alert.message},current_date,${`smart_alert:${inserted[0].id}`}) on conflict(dedupe_key) do nothing`;
      }
    }
  }
  return created;
};
const checkPaymentReminders = async () => {
  const students =
    await sql`select s.id,s.first_name,s.last_name,s.phone,p.payment_date,p.payment_month,p.amount,p.fee from students s join lateral (select payment_date,payment_month,amount,fee from payments where student_id=s.id and payment_date is not null order by payment_date desc limit 1) p on true where s.status='active'`;
  const today = dateOnly(new Date());
  let created = 0;
  for (const student of students) {
    const paidAt = dateOnly(student.payment_date),
      dueDate = addMonth(`${paidAt}T00:00:00`);
    const reminderStart = new Date(`${dueDate}T00:00:00`);
    reminderStart.setDate(reminderStart.getDate() - 2);
    const startDate = dateOnly(reminderStart);
    if (today < startDate || today > dueDate) continue;
    const daysLeft = Math.round(
      (new Date(`${dueDate}T00:00:00`) - new Date(`${today}T00:00:00`)) /
        86400000,
    );
    const key = `payment_due:${student.id}:${dueDate}:${today}`;
    const title =
      daysLeft === 0
        ? "To‘lov muddati bugun"
        : daysLeft === 1
          ? "To‘lov muddati ertaga"
          : "To‘lov muddatiga 2 kun qoldi";
    const debt = Math.max(0, Number(student.fee) - Number(student.amount));
    const message = `${student.first_name} ${student.last_name} (${
      student.phone
    }) · muddat: ${dueDate} · oylik: ${Number(student.fee).toLocaleString(
      "uz-UZ",
    )} so‘m · qarz: ${debt.toLocaleString("uz-UZ")} so‘m`;
    const inserted =
      await sql`insert into notifications(type,student_id,title,message,due_date,dedupe_key) values('payment_due',${student.id},${title},${message},${dueDate},${key}) on conflict(dedupe_key) do nothing returning id`;
    if (!inserted.length) continue;
    created++;
    const telegram = await sendTelegram(`<b>OBRANO Academy</b>\n💳 ${message}`);
    await sql`update notifications set telegram_sent=${telegram.sent},telegram_error=${telegram.error} where id=${inserted[0].id}`;
  }
  return created;
};
const zonedNow = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: process.env.APP_TIMEZONE || "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const weekdays = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: weekdays[parts.weekday],
  };
};
const groupWeekdays = (value = "") => {
  const aliases = {
    du: 1,
    dush: 1,
    se: 2,
    sesh: 2,
    ch: 3,
    chor: 3,
    pa: 4,
    pay: 4,
    ju: 5,
    jum: 5,
    sh: 6,
    shan: 6,
    ya: 7,
    yak: 7,
  };
  return String(value)
    .toLowerCase()
    .split(/[,;\s]+/)
    .map((part) => aliases[part.replace(/[^a-z]/g, "")])
    .filter(Boolean);
};
const timeToMinutes = (value) => {
  const [hours, minutes] = String(value || "").slice(0, 5).split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes)
    ? hours * 60 + minutes
    : null;
};
const reminderIsDue = (lessonTime, nowTime) => {
  const lesson = timeToMinutes(lessonTime),
    now = timeToMinutes(nowTime);
  return lesson !== null && now !== null && now >= lesson && now <= lesson + 15;
};
const getTodayLessons = async (now = zonedNow()) => {
  const [groups, individuals] = await Promise.all([
    sql`select g.id,g.name,g.teacher,g.days,g.start_time,g.end_time,g.room,count(s.id)::int student_count from groups g left join students s on s.group_id=g.id and s.status='active' where g.active=true and g.start_time is not null group by g.id`,
    sql`select id,first_name,last_name,phone,schedule_days,lesson_time from students where status='active' and enrollment_type='individual' and lesson_time is not null`,
  ]);
  return {
    groups: groups.filter((group) =>
      groupWeekdays(group.days).includes(now.weekday),
    ),
    individuals: individuals.filter((student) =>
      (student.schedule_days || []).includes(now.weekday),
    ),
  };
};
const checkDailyScheduleReminder = async () => {
  const now = zonedNow(),
    { groups, individuals } = await getTodayLessons(now),
    key = `daily_schedule:${now.date}`;
  if (!groups.length && !individuals.length) return 0;
  const groupLines = groups
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
      .map(
        (group) =>
          `• ${String(group.start_time).slice(0, 5)}–${String(group.end_time || "").slice(0, 5)} — ${group.name} (${group.student_count} nafar)`,
      ),
    individualLines = individuals
      .sort((a, b) => String(a.lesson_time).localeCompare(String(b.lesson_time)))
      .map(
        (student) =>
          `• ${String(student.lesson_time).slice(0, 5)} — ${student.first_name} ${student.last_name}`,
      ),
    message = [
      `<b>OBRANO Academy · Bugungi darslar</b>`,
      `📅 ${now.date}`,
      groupLines.length ? `\n<b>Guruhlar:</b>\n${groupLines.join("\n")}` : "",
      individualLines.length
        ? `\n<b>Individuallar:</b>\n${individualLines.join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  const inserted =
    await sql`insert into notifications(type,student_id,title,message,due_date,dedupe_key) values('daily_schedule',null,'Bugungi darslar',${[...groupLines, ...individualLines].join(" · ")},${now.date},${key}) on conflict(dedupe_key) do nothing returning id`;
  if (!inserted.length) return 0;
  const telegram = await sendTelegram(message);
  await sql`update notifications set telegram_sent=${telegram.sent},telegram_error=${telegram.error} where id=${inserted[0].id}`;
  return 1;
};
const checkLessonReminders = async () => {
  const now = zonedNow();
  const { groups, individuals } = await getTodayLessons(now);
  const reminders = [
    ...groups
      .filter(
        (group) =>
          reminderIsDue(group.start_time, now.time),
      )
      .map((group) => ({
        type: "group_lesson",
        studentId: null,
        key: `group_lesson:${group.id}:${now.date}`,
        title: `${group.name} darsi boshlandi`,
        message: `${now.time}–${String(group.end_time || "").slice(0, 5)} · ${group.teacher || "O‘qituvchi belgilanmagan"} · ${group.room || "Xona belgilanmagan"} · ${group.student_count} nafar o‘quvchi`,
        telegram: `<b>OBRANO Academy · Guruh darsi</b>\n👥 ${group.name}\n⏰ ${now.time}–${String(group.end_time || "").slice(0, 5)}\n👨‍🏫 ${group.teacher || "O‘qituvchi belgilanmagan"}\n🚪 ${group.room || "Xona belgilanmagan"}\n🎓 ${group.student_count} nafar o‘quvchi`,
      })),
    ...individuals
      .filter(
        (student) =>
          reminderIsDue(student.lesson_time, now.time),
      )
      .map((student) => ({
        type: "individual_lesson",
        studentId: student.id,
        key: `individual_lesson:${student.id}:${now.date}`,
        title: `${student.first_name} ${student.last_name} darsi`,
        message: `${now.time} · Individual dars · ${student.phone}`,
        telegram: `<b>OBRANO Academy · Individual dars</b>\n👤 ${student.first_name} ${student.last_name}\n⏰ ${now.time}\n📞 ${student.phone}`,
      })),
  ];
  let created = 0;
  for (const reminder of reminders) {
    const inserted =
      await sql`insert into notifications(type,student_id,title,message,due_date,dedupe_key) values(${reminder.type},${reminder.studentId},${reminder.title},${reminder.message},${now.date},${reminder.key}) on conflict(dedupe_key) do nothing returning id`;
    if (!inserted.length) continue;
    created++;
    const telegram = await sendTelegram(reminder.telegram);
    await sql`update notifications set telegram_sent=${telegram.sent},telegram_error=${telegram.error} where id=${inserted[0].id}`;
  }
  return created;
};
const checkAllReminders = async () => {
  const [payments, lessons, dailySchedule] = await Promise.all([
    checkPaymentReminders(),
    checkLessonReminders(),
    checkDailyScheduleReminder(),
  ]);
  return payments + lessons + dailySchedule;
};
app.get("/api/notifications", async (_req, res, next) => {
  try {
    await checkAllReminders();
    const rows =
      await sql`select * from notifications order by created_at desc limit 100`;
    res.json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        studentId: r.student_id,
        title: r.title,
        message: r.message,
        dueDate: dateOnly(r.due_date),
        isRead: r.is_read,
        telegramSent: r.telegram_sent,
        telegramError: r.telegram_error,
        createdAt: r.created_at,
      })),
    );
  } catch (e) {
    next(e);
  }
});
app.patch("/api/notifications/:id/read", async (req, res, next) => {
  try {
    await sql`update notifications set is_read=true where id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
app.post("/api/notifications/check", async (_req, res, next) => {
  try {
    res.json({ created: await checkAllReminders() });
  } catch (e) {
    next(e);
  }
});
app.get("/api/weekly-summaries", async (_req, res, next) => {
  try {
    const rows =
      await sql`select * from weekly_summaries order by week_start desc limit 20`;
    res.json(
      rows.map((row) => ({
        id: row.id,
        weekStart: dateOnly(row.week_start),
        weekEnd: dateOnly(row.week_end),
        metrics: row.metrics,
        telegramStatus: row.telegram_status,
        telegramSentAt: row.telegram_sent_at,
        telegramError: row.telegram_error,
      })),
    );
  } catch (e) {
    next(e);
  }
});
app.post("/api/weekly-summaries/generate", async (req, res, next) => {
  try {
    res.json(
      await generateWeeklySummary(
        Number(req.body?.offset ?? -1),
        req.body?.sendTelegram !== false,
      ),
    );
  } catch (e) {
    next(e);
  }
});
app.post("/api/cron/weekly", async (_req, res, next) => {
  try {
    res.json(await generateWeeklySummary(-1, true));
  } catch (e) {
    next(e);
  }
});
app.all("/api/cron/reminders", async (_req, res, next) => {
  try {
    res.json({ created: await checkAllReminders() });
  } catch (e) {
    next(e);
  }
});
app.get("/api/alerts", async (req, res, next) => {
  try {
    const status = req.query.status || null,
      severity = req.query.severity || null;
    const rows =
      await sql`select a.*,s.first_name,s.last_name,g.name group_name from smart_alerts a left join students s on s.id=a.student_id left join groups g on g.id=a.group_id where (${status}::text is null or a.status=${status}) and (${severity}::text is null or a.severity=${severity}) order by case a.severity when 'CRITICAL' then 1 when 'HIGH' then 2 when 'WARNING' then 3 else 4 end,a.created_at desc limit 200`;
    res.json(
      rows.map((row) => ({
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_id
          ? `${row.first_name} ${row.last_name}`
          : null,
        groupName: row.group_name,
        type: row.type,
        severity: row.severity,
        title: row.title,
        message: row.message,
        status: row.status,
        metadata: row.metadata,
        createdAt: row.created_at,
      })),
    );
  } catch (e) {
    next(e);
  }
});
app.post("/api/alerts/generate", async (_req, res, next) => {
  try {
    res.json({ created: await generateSmartAlerts() });
  } catch (e) {
    next(e);
  }
});
app.patch("/api/alerts/:id", async (req, res, next) => {
  try {
    const status = String(req.body.status || "").toUpperCase();
    if (!["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"].includes(status))
      return res.status(400).json({ error: "Alert status noto‘g‘ri" });
    const [row] =
      await sql`update smart_alerts set status=${status},updated_at=now() where id=${req.params.id} returning *`;
    res.json(row);
  } catch (e) {
    next(e);
  }
});
setTimeout(() => checkAllReminders().catch(console.error), 5000);
setTimeout(() => generateSmartAlerts().catch(console.error), 8000);
setInterval(
  () =>
    Promise.all([checkLessonReminders(), checkDailyScheduleReminder()]).catch(
      console.error,
    ),
  30 * 1000,
);
setInterval(
  () => checkPaymentReminders().catch(console.error),
  6 * 60 * 60 * 1000,
);
setInterval(
  () => generateSmartAlerts().catch(console.error),
  6 * 60 * 60 * 1000,
);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.code === "23505" ? 409 : 500).json({
    error: err.code === "23505" ? "Bu ma’lumot avval mavjud" : "Server xatosi",
  });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
