import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../services/authService";

export function RegisterPage() {
  const navigate = useNavigate(),
    [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.register(
        Object.fromEntries(new FormData(e.currentTarget))
      );
      toast.success("Registratsiya muvaffaqiyatli. Endi tizimga kiring");
      navigate("/login");
    } catch {
      /* request xabar beradi */
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login-page register-page">
      <section className="login-brand">
        <div className="login-brand__copy">
          <span className="eyebrow">OBRANO ACADEMY</span>
          <h1>Shaxsiy kabinetingizni yarating.</h1>
          <p>
            Bajargan ishlaringizni yuboring, feedback va natijalaringizni
            kuzating.
          </p>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card register-card" onSubmit={submit}>
          <header>
            <h2>O‘quvchi registratsiyasi</h2>
            <p>Barcha majburiy maydonlarni kiriting.</p>
          </header>
          <div className="form-grid">
            <label>
              Ism
              <input name="firstName" required minLength="2" />
            </label>
            <label>
              Familiya
              <input name="lastName" required minLength="2" />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Telefon
              <input name="phone" placeholder="+998..." required />
            </label>
            <label>
              Parol
              <input name="password" type="password" minLength="8" required />
            </label>
            <label>
              Parolni tasdiqlash
              <input
                name="confirmPassword"
                type="password"
                minLength="8"
                required
              />
            </label>
            <label>
              Telegram username
              <input name="telegramUsername" />
            </label>
            <label className="span-2">
              Yo‘nalish
              <input name="direction" />
            </label>
          </div>
          <button className="btn btn--primary login-submit" disabled={loading}>
            {loading ? "Yaratilmoqda..." : "Ro‘yxatdan o‘tish"}
          </button>
          <p className="auth-switch">
            Hisobingiz bormi? <Link to="/login">Kirish</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
