import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppSelect, DatePicker, TimePicker } from "../ui/controls";
import { Modal } from "../ui/Modal";
import { studentsService } from "../../services/studentsService";
import { paymentsService } from "../../services/paymentsService";
import { useApp } from "../../context/AppContext";
const schema = z
  .object({
    firstName: z.string().min(2, "Ismni kiriting"),
    lastName: z.string().min(2, "Familiyani kiriting"),
    nickname: z.string().min(3, "Nickname kamida 3 belgi").max(32),
    temporaryPassword: z.string().optional(),
    phone: z.string().refine((value) => !value || value.length >= 9, "Telefon noto‘g‘ri"),
    enrollmentType: z.enum(["group", "individual"]),
    groupId: z.string().nullish(),
    scheduleDays: z.array(z.number()).optional(),
    lessonTime: z.string().nullish(),
    monthlyFee: z.coerce.number().min(0),
    initialPaymentStatus: z.enum(["unpaid", "paid"]).optional(),
    initialPaymentAmount: z.coerce.number().optional(),
  })
  .passthrough()
  .superRefine((v, ctx) => {
    if (v.enrollmentType === "individual" && v.scheduleDays?.length !== 3)
      ctx.addIssue({
        code: "custom",
        path: ["scheduleDays"],
        message: "Individual uchun haftaning 3 kunini tanlang",
      });
    if (v.enrollmentType === "individual" && !v.lessonTime)
      ctx.addIssue({
        code: "custom",
        path: ["lessonTime"],
        message: "Individual dars vaqtini tanlang",
      });
    if (v.initialPaymentStatus === "paid" && !(v.initialPaymentAmount > 0))
      ctx.addIssue({
        code: "custom",
        path: ["initialPaymentAmount"],
        message: "To‘langan summani kiriting",
      });
  });
export function StudentForm({ open, onClose, student }) {
  const { groups, settings } = useApp(),
    {
      register,
      handleSubmit,
      reset,
      watch,
      setValue,
      formState: { errors, isDirty, isSubmitting },
    } = useForm({ resolver: zodResolver(schema) });
  useEffect(() => {
    const fee = student?.monthlyFee || settings.defaultGroupFee;
    reset(
      student
        ? {
            ...student,
            enrollmentType:
              student.enrollmentType ||
              (student.groupId ? "group" : "individual"),
            groupId: student.groupId || "",
            joinedDate: String(student.joinedDate || "").slice(0, 10),
            birthDate: String(student.birthDate || "").slice(0, 10),
            schedulePreset: (student.scheduleDays || []).includes(2)
              ? "tts"
              : "mwf",
            scheduleDays: student.scheduleDays || [1, 3, 5],
            initialPaymentStatus: "unpaid",
            initialPaymentAmount: fee,
            initialPaymentMonth: new Date().toISOString().slice(0, 7),
            initialPaymentDate: new Date().toISOString().slice(0, 10),
            initialPaymentMethod: "Naqd",
          }
        : {
            status: "active",
            enrollmentType: "group",
            groupId: "",
            schedulePreset: "mwf",
            scheduleDays: [1, 3, 5],
            lessonTime: "",
            joinedDate: new Date().toISOString().slice(0, 10),
            monthlyFee: fee,
            initialPaymentStatus: "unpaid",
            initialPaymentAmount: fee,
            initialPaymentDate: new Date().toISOString().slice(0, 10),
            initialPaymentMethod: "Naqd",
          },
    );
  }, [student, open, reset, settings.defaultGroupFee]);
  const type = watch("enrollmentType") || "group",
    paymentStatus = watch("initialPaymentStatus") || "unpaid",
    temporaryPassword = watch("temporaryPassword") || "",
    nickname = watch("nickname") || "";
  const generateTemporaryPassword = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
    const bytes = new Uint32Array(12);
    crypto.getRandomValues(bytes);
    const value = Array.from(bytes, (number) => alphabet[number % alphabet.length]).join("");
    setValue("temporaryPassword", value, { shouldDirty: true, shouldValidate: true });
  };
  const copyCredentials = async () => {
    if (!nickname.trim() || !temporaryPassword) {
      toast.error("Avval nickname kiriting va vaqtinchalik kod yarating");
      return;
    }
    await navigator.clipboard?.writeText(`Nickname: ${nickname.trim()}\nVaqtinchalik parol: ${temporaryPassword}`);
    toast.success("Nickname va vaqtinchalik parol nusxalandi");
  };
  const setFee = (fee) => {
    setValue("monthlyFee", fee, { shouldDirty: true });
    if (paymentStatus === "paid")
      setValue("initialPaymentAmount", fee, { shouldDirty: true });
  };
  const changeType = (value) => {
    setValue("enrollmentType", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (value === "individual") {
      setValue("groupId", "", { shouldDirty: true, shouldValidate: true });
      if ((watch("scheduleDays") || []).length !== 3)
        setValue("scheduleDays", [1, 3, 5], { shouldDirty: true });
      setFee(settings.defaultIndividualFee);
    } else setFee(settings.defaultGroupFee);
  };
  const changeGroup = (id) => {
    setValue("groupId", id, { shouldDirty: true, shouldValidate: true });
    const group = groups.find((g) => g.id === id);
    if (group?.price) setFee(Number(group.price));
  };
  const close = () => {
    if (!isDirty || confirm("Saqlanmagan o‘zgarishlar bor. Yopilsinmi?"))
      onClose();
  };
  const invalid = (formErrors) => {
    const first = Object.values(formErrors)[0]?.message;
    toast.error(first || "Majburiy maydonlarni tekshiring");
  };
  const submit = async (v) => {
    const payload = {
      ...v,
      joinedDate: String(v.joinedDate || "").slice(0, 10),
      birthDate: v.birthDate ? String(v.birthDate).slice(0, 10) : null,
      scheduleDays:
        v.enrollmentType === "individual"
          ? v.scheduleDays
          : v.schedulePreset === "tts"
            ? [2, 4, 6]
            : [1, 3, 5],
      groupId: v.enrollmentType === "individual" ? null : v.groupId,
      fullName: `${v.firstName} ${v.lastName}`,
    };
    try {
      if (student) {
        await studentsService.updateAndRefresh(student.id, payload);
        if (v.temporaryPassword) {
          await navigator.clipboard?.writeText(`Nickname: ${v.nickname}\nVaqtinchalik parol: ${v.temporaryPassword}`);
          toast.success(`Nickname: ${v.nickname} · Kod: ${v.temporaryPassword}`, {
            duration: 12000,
            description: "Login ma’lumotlari nusxalandi. Eski kod bekor qilindi.",
          });
        }
        if (v.initialPaymentStatus === "paid") {
          await paymentsService.saveMonthly({
            studentId: student.id,
            amount: Number(v.initialPaymentAmount || 0),
            fee: Number(v.monthlyFee || 0),
            absencePenalty: 0,
            month:
              v.initialPaymentMonth || new Date().toISOString().slice(0, 7),
            date:
              v.initialPaymentDate || new Date().toISOString().slice(0, 10),
            method: v.initialPaymentMethod || "Naqd",
            note: "O‘quvchini tahrirlashda qabul qilindi",
          });
          toast.success("O‘quvchi va to‘lov yangilandi");
        } else if (!v.temporaryPassword) toast.success("O‘quvchi yangilandi");
      } else {
        const result = await studentsService.createWithPayment(payload, {
          status: v.initialPaymentStatus,
          amount: Number(v.initialPaymentAmount || 0),
          month: v.initialPaymentMonth || new Date().toISOString().slice(0, 7),
          date: v.initialPaymentDate,
          method: v.initialPaymentMethod,
        });
        if (result.temporaryPassword) {
          await navigator.clipboard?.writeText(result.temporaryPassword);
          toast.success(`Vaqtinchalik parol: ${result.temporaryPassword}`, {
            duration: 12000,
            description: "Parol clipboardga nusxalandi. Studentga xavfsiz yuboring.",
          });
        } else toast.success(
          v.initialPaymentStatus === "paid"
            ? "O‘quvchi va to‘lov qo‘shildi"
            : "O‘quvchi qo‘shildi",
        );
      }
      onClose();
    } catch {
      /* request service notification ko‘rsatadi */
    }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={student ? "O‘quvchini tahrirlash" : "Yangi o‘quvchi"}
    >
      <form className="form-grid" onSubmit={handleSubmit(submit, invalid)}>
        <label className="span-2">
          Ta’lim turi
          <AppSelect
            name="enrollmentType"
            value={type}
            onValueChange={changeType}
          >
            <option value="group">Guruhda o‘qiydi</option>
            <option value="individual">Individual o‘qiydi</option>
          </AppSelect>
        </label>
        {type === "individual" ? (
          <div className="span-2 schedule-field">
            <span>
              Dars kunlari — 3 kunni tanlang (
              {(watch("scheduleDays") || []).length}/3)
            </span>
            <div className="schedule-days">
              {[
                [1, "Du"],
                [2, "Se"],
                [3, "Ch"],
                [4, "Pa"],
                [5, "Ju"],
                [6, "Sh"],
                [7, "Ya"],
              ].map(([day, label]) => {
                const selected = (watch("scheduleDays") || []).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={selected ? "is-selected" : ""}
                    onClick={() => {
                      const current = watch("scheduleDays") || [];
                      const next = selected
                        ? current.filter((x) => x !== day)
                        : [...current, day].sort();
                      setValue("scheduleDays", next, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <small>{errors.scheduleDays?.message}</small>
            <label>
              Doimiy dars vaqti
              <TimePicker
                name="lessonTime"
                value={watch("lessonTime") || ""}
                onValueChange={(value) =>
                  setValue("lessonTime", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              <small>{errors.lessonTime?.message}</small>
            </label>
          </div>
        ) : (
          <label className="span-2">
            Dars kunlari
            <AppSelect
              name="schedulePreset"
              value={watch("schedulePreset") || "mwf"}
              onValueChange={(v) =>
                setValue("schedulePreset", v, { shouldDirty: true })
              }
            >
              <option value="mwf">Dushanba · Chorshanba · Juma</option>
              <option value="tts">Seshanba · Payshanba · Shanba</option>
            </AppSelect>
          </label>
        )}
        <label>
          Ism
          <input {...register("firstName")} />
          <small>{errors.firstName?.message}</small>
        </label>
        <label>
          Familiya
          <input {...register("lastName")} />
          <small>{errors.lastName?.message}</small>
        </label>
        <label className="nickname-field">
          Nickname
          <input {...register("nickname")} placeholder="student.nickname" />
          <small>{errors.nickname?.message}</small>
        </label>
        {(
          <label className="credential-field">
            {student ? "Bir martalik faollashtirish kodi" : "Vaqtinchalik parol"}
            <input
              {...register("temporaryPassword")}
              placeholder={
                student
                  ? "Bo‘sh qolsa hozirgi kod o‘zgarmaydi"
                  : "Bo‘sh qolsa avtomatik yaratiladi"
              }
            />
            <div className="credential-actions">
              <button type="button" className="btn" onClick={generateTemporaryPassword}>
                Kod yaratish
              </button>
              <button type="button" className="btn" onClick={copyCredentials} disabled={!temporaryPassword}>
                Nickname + kodni nusxalash
              </button>
            </div>
            {student && <small>Kiritilsa eski vaqtinchalik kod bekor bo‘ladi</small>}
          </label>
        )}
        <label>
          Telefon
          <input {...register("phone")} placeholder="+998 90 123 45 67" />
          <small>{errors.phone?.message}</small>
        </label>
        <label>
          Ota-ona telefoni
          <input {...register("parentPhone")} />
        </label>
        {type === "group" && (
          <label>
            Guruhni tanlang
            <AppSelect
              name="groupId"
              value={watch("groupId") || ""}
              onValueChange={changeGroup}
            >
              <option value="">Tanlang</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </AppSelect>
            <small>{errors.groupId?.message}</small>
          </label>
        )}
        <label>
          {type === "individual"
            ? "Individual oylik to‘lov"
            : "Guruh oylik to‘lovi"}
          <input type="number" {...register("monthlyFee")} />
        </label>
        {(
          <>
            <label className="span-2">
              {student ? "To‘lov qabul qilish" : "Joriy oy to‘lov holati"}
              <AppSelect
                name="initialPaymentStatus"
                value={paymentStatus}
                onValueChange={(v) => {
                  setValue("initialPaymentStatus", v, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  if (v === "paid")
                    setValue(
                      "initialPaymentAmount",
                      Number(watch("monthlyFee") || 0),
                    );
                }}
              >
                <option value="unpaid">To‘lanmagan</option>
                <option value="paid">To‘langan</option>
              </AppSelect>
            </label>
            {paymentStatus === "paid" && (
              <div className="initial-payment span-2">
                <label>
                  To‘langan summa
                  <input
                    type="number"
                    min="0"
                    {...register("initialPaymentAmount")}
                  />
                  <small>{errors.initialPaymentAmount?.message}</small>
                </label>
                <label>
                  Hisobot oyi
                  <DatePicker
                    mode="month"
                    name="initialPaymentMonth"
                    value={
                      watch("initialPaymentMonth") ||
                      new Date().toISOString().slice(0, 7)
                    }
                    onValueChange={(v) =>
                      setValue("initialPaymentMonth", v, { shouldDirty: true })
                    }
                  />
                </label>
                <label>
                  To‘lov sanasi
                  <DatePicker
                    name="initialPaymentDate"
                    value={watch("initialPaymentDate") || ""}
                    onValueChange={(v) =>
                      setValue("initialPaymentDate", v, { shouldDirty: true })
                    }
                  />
                </label>
                <label>
                  To‘lov usuli
                  <AppSelect
                    name="initialPaymentMethod"
                    value={watch("initialPaymentMethod") || "Naqd"}
                    onValueChange={(v) =>
                      setValue("initialPaymentMethod", v, { shouldDirty: true })
                    }
                  >
                    <option>Naqd</option>
                    <option>Karta</option>
                    <option>Bank o‘tkazmasi</option>
                  </AppSelect>
                </label>
              </div>
            )}
          </>
        )}
        <label>
          Qo‘shilgan sana
          <DatePicker
            name="joinedDate"
            value={watch("joinedDate") || ""}
            onValueChange={(v) =>
              setValue("joinedDate", v, { shouldDirty: true })
            }
          />
        </label>
        <label>
          Tug‘ilgan sana
          <DatePicker
            name="birthDate"
            value={watch("birthDate") || ""}
            onValueChange={(v) =>
              setValue("birthDate", v, { shouldDirty: true })
            }
          />
        </label>
        <label className="span-2">
          Izoh
          <textarea {...register("note")} rows="3" />
        </label>
        <label>
          Status
          <AppSelect
            name="status"
            value={watch("status") || "active"}
            onValueChange={(v) => setValue("status", v, { shouldDirty: true })}
          >
            <option value="active">Faol</option>
            <option value="inactive">Noaktiv</option>
          </AppSelect>
        </label>
        <div className="form-actions span-2">
          <button type="button" className="btn" onClick={close}>
            Bekor qilish
          </button>
          <button className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
