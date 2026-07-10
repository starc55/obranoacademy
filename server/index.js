import "dotenv/config";
import express from "express";
import cors from "cors";
import { createHmac, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
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
      await sql`insert into students(id,first_name,last_name,phone,parent_phone,group_id,enrollment_type,schedule_days,monthly_fee,joined_date,birth_date,note,avatar_url,status) values(${
        s.id
      },${s.firstName},${s.lastName},${s.phone},${s.parentPhone || ""},${
        s.groupId || null
      },${s.enrollmentType || "group"},${s.scheduleDays || []},${
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
    },schedule_days),monthly_fee=coalesce(${
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
      },${p.date || null},${p.method || "Naqd"},${p.note || ""}) returning *`;
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
app.get("/api/notifications", async (_req, res, next) => {
  try {
    await checkPaymentReminders();
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
    res.json({ created: await checkPaymentReminders() });
  } catch (e) {
    next(e);
  }
});
setTimeout(() => checkPaymentReminders().catch(console.error), 5000);
setInterval(
  () => checkPaymentReminders().catch(console.error),
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
