import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  ReceiptText,
  Trash2,
  WalletCards,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { AppSelect, DatePicker } from "../components/ui/controls";
import { useApp } from "../context/AppContext";
import { paymentsService } from "../services/paymentsService";
import { Modal } from "../components/ui/Modal";
import { StatusBadge } from "../components/shared/StatusBadge";
const currentMonth = () => new Date().toISOString().slice(0, 7),
  todayValue = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
  },
  monthTitle = (value) => {
    const [y, m] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("uz-UZ", {
      month: "long",
      year: "numeric",
    }).format(new Date(y, m - 1, 1));
  },
  money = (value) => Number(value || 0).toLocaleString("uz-UZ"),
  displayDate = (value) =>
    value
      ? new Intl.DateTimeFormat("uz-UZ").format(new Date(`${value}T00:00:00`))
      : "—";
export function PaymentsPage() {
  const { payments, students, groups } = useApp(),
    [open, setOpen] = useState(false),
    [edit, setEdit] = useState(null),
    [q, setQ] = useState(""),
    [onlyDebt, setOnlyDebt] = useState(false),
    [dueFilter, setDueFilter] = useState("month"),
    [month, setMonth] = useState(currentMonth());
  const monthRows = useMemo(
      () => payments.filter((p) => p.month === month),
      [payments, month],
    ),
    latestRows = Array.from(
      [...payments]
        .sort((a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")),
        )
        .reduce((map, payment) => {
          if (!map.has(payment.studentId)) map.set(payment.studentId, payment);
          return map;
        }, new Map())
        .values(),
    ),
    today = todayValue(),
    nextThreeDays = (() => {
      const date = new Date(`${today}T00:00:00`);
      date.setDate(date.getDate() + 3);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    })(),
    nextWeek = (() => {
      const date = new Date(`${today}T00:00:00`);
      date.setDate(date.getDate() + 7);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(date.getDate()).padStart(2, "0")}`;
    })(),
    filteredByPeriod =
      dueFilter === "month"
        ? monthRows
        : latestRows.filter((payment) => {
            const due = paymentsService.nextDueDate(payment.date);
            if (dueFilter === "paid_today") return payment.date === today;
            if (dueFilter === "due_today") return due === today;
            if (dueFilter === "overdue") return due && due < today;
            if (dueFilter === "next_3")
              return due && due > today && due <= nextThreeDays;
            if (dueFilter === "next_7")
              return due && due > today && due <= nextWeek;
            return true;
          }),
    rows = filteredByPeriod.filter((p) => {
      const s = students.find((x) => x.id === p.studentId);
      return (
        (!q ||
          `${s?.fullName || ""} ${s?.phone || ""}`
            .toLowerCase()
            .includes(q.toLowerCase())) &&
        (!onlyDebt || paymentsService.debt(p) > 0)
      );
    }),
    revenue = monthRows.reduce((a, p) => a + Number(p.amount || 0), 0),
    debt = monthRows.reduce((a, p) => a + paymentsService.debt(p), 0),
    expected = revenue + debt,
    rate = expected ? Math.round((revenue / expected) * 100) : 0,
    debtors = new Set(
      monthRows
        .filter((p) => paymentsService.debt(p) > 0)
        .map((p) => p.studentId),
    ).size,
    close = () => {
      setOpen(false);
      setEdit(null);
    };
  const save = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)),
      student = students.find((s) => s.id === v.studentId);
    if (!student) {
      toast.error("O‘quvchini tanlang");
      return;
    }
    const calc = paymentsService.calculateFee(student.id, student.monthlyFee),
      payload = {
        ...v,
        amount: Number(v.amount),
        fee: calc.total,
        absencePenalty: calc.penalty,
      };
    edit
      ? paymentsService.update(edit.id, payload)
      : paymentsService.create(payload);
    toast.success(edit ? "To‘lov yangilandi" : "To‘lov qo‘shildi");
    setMonth(v.month);
    close();
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h2>To‘lovlar</h2>
          <p>Oylik tushum va qarzdorlik nazorati</p>
        </div>
        <button className="btn btn--primary" onClick={() => setOpen(true)}>
          <Plus /> To‘lov qo‘shish
        </button>
      </div>
      <div className="payment-period">
        <div>
          <span className="eyebrow">HISOBOT DAVRI</span>
          <strong>{monthTitle(month)}</strong>
        </div>
        <DatePicker mode="month" value={month} onValueChange={setMonth} />
      </div>
      <div className="money-stats">
        <article>
          <small>{monthTitle(month)} tushumi</small>
          <strong>{money(revenue)} so‘m</strong>
          <span>{monthRows.length} ta to‘lov yozuvi</span>
        </article>
        <article>
          <small>Joriy qarzdorlik</small>
          <strong>{money(debt)} so‘m</strong>
          <span>{debtors} nafar o‘quvchi</span>
        </article>
        <article>
          <small>To‘lov darajasi</small>
          <strong>{rate}%</strong>
          <div className="progress">
            <i style={{ "--w": `${rate}%` }} />
          </div>
        </article>
      </div>
      <section className="table-card">
        <div className="table-tools">
          <label className="searchbox">
            <Search />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ism yoki telefon..."
            />
          </label>
          <button
            className={`btn ${onlyDebt ? "btn--dark" : ""}`}
            onClick={() => setOnlyDebt((x) => !x)}
          >
            Qarzdorlar
          </button>
          <AppSelect value={dueFilter} onValueChange={setDueFilter}>
            <option value="month">Hisobot oyi</option>
            <option value="paid_today">Bugun to‘laganlar</option>
            <option value="due_today">Bugun muddati yetganlar</option>
            <option value="overdue">Muddati o‘tganlar</option>
            <option value="next_3">Keyingi 3 kun</option>
            <option value="next_7">Keyingi 7 kun</option>
          </AppSelect>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>O‘quvchi</th>
                <th>Ta’lim turi</th>
                <th>Hisoblangan</th>
                <th>To‘langan</th>
                <th>Qarz</th>
                <th>Sana</th>
                <th>Keyingi to‘lov</th>
                <th>Usul</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const s = students.find((x) => x.id === p.studentId),
                  status = paymentsService.status(p),
                  group = groups.find((g) => g.id === s?.groupId);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="person">
                        <div className="avatar avatar--soft">
                          {s?.firstName?.[0]}
                          {s?.lastName?.[0]}
                        </div>
                        <div>
                          <strong>
                            {s?.fullName || "O‘chirilgan o‘quvchi"}
                          </strong>
                          <small>{s?.phone}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {s?.enrollmentType === "individual"
                        ? "Individual"
                        : group?.name || "Guruh belgilanmagan"}
                    </td>
                    <td>{money(p.fee)}</td>
                    <td>
                      <strong>{money(p.amount)}</strong>
                    </td>
                    <td className={paymentsService.debt(p) > 0 ? "danger" : ""}>
                      {money(paymentsService.debt(p))}
                    </td>
                    <td>{displayDate(p.date)}</td>
                    <td
                      className={
                        paymentsService.nextDueDate(p.date) <= today
                          ? "danger"
                          : ""
                      }
                    >
                      {displayDate(paymentsService.nextDueDate(p.date))}
                    </td>
                    <td>{p.method}</td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          aria-label="To‘lovni tahrirlash"
                          onClick={() => setEdit(p)}
                        >
                          <Edit3 />
                        </button>
                        <button
                          aria-label="To‘lovni o‘chirish"
                          onClick={() => {
                            if (confirm("To‘lov yozuvi o‘chirilsinmi?")) {
                              paymentsService.remove(p.id);
                              toast.success("To‘lov o‘chirildi");
                            }
                          }}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <div className="empty">
              <WalletCards />
              <h3>{monthTitle(month)} uchun to‘lov yo‘q</h3>
              <p>Tanlangan davrda filterga mos to‘lov yozuvlari topilmadi.</p>
            </div>
          )}
        </div>
      </section>
      <Modal
        open={open || !!edit}
        onClose={close}
        title={edit ? "To‘lovni tahrirlash" : "To‘lov qo‘shish"}
      >
        <form key={edit?.id || "new"} className="form-grid" onSubmit={save}>
          <label className="span-2">
            O‘quvchi
            <AppSelect
              name="studentId"
              defaultValue={edit?.studentId || ""}
              required
            >
              <option value="">Tanlang</option>
              {students
                .filter(
                  (s) => s.status === "active" || s.id === edit?.studentId,
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
            </AppSelect>
          </label>
          <label>
            To‘langan summa
            <input
              name="amount"
              type="number"
              min="0"
              defaultValue={edit?.amount || ""}
              required
            />
          </label>
          <label>
            Hisobot oyi
            <DatePicker
              mode="month"
              name="month"
              defaultValue={edit?.month || month}
            />
          </label>
          <label>
            To‘lov sanasi
            <DatePicker
              name="date"
              defaultValue={edit?.date || new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label>
            To‘lov usuli
            <AppSelect name="method" defaultValue={edit?.method || "Naqd"}>
              <option>Naqd</option>
              <option>Karta</option>
              <option>Bank o‘tkazmasi</option>
            </AppSelect>
          </label>
          <label className="span-2">
            Izoh
            <textarea name="note" rows="3" defaultValue={edit?.note || ""} />
          </label>
          <div className="form-actions span-2">
            <button className="btn" type="button" onClick={close}>
              Bekor qilish
            </button>
            <button className="btn btn--primary">
              <ReceiptText /> {edit ? "Yangilash" : "Qabul qilish"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
