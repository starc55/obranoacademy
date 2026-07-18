import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../services/authService";

function SecretInput({ name, label, visible, onToggle, temporary = false }) {
  return (
    <label>
      {label}
      <div className="input-shell">
        <input
          name={name}
          type={visible ? "text" : "password"}
          minLength={temporary ? undefined : 8}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Parolni yashirish" : "Parolni ko‘rsatish"}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
    </label>
  );
}

export function ActivationPage() {
  const navigate = useNavigate(),
    [loading, setLoading] = useState(false),
    [visible, setVisible] = useState({
      temporary: false,
      password: false,
      confirm: false,
    });
  const toggle = (key) =>
    setVisible((state) => ({ ...state, [key]: !state[key] }));
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await authService.activate(
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      toast.success("Hisob faollashtirildi. Endi yangi parol bilan kiring");
      navigate("/login");
    } catch {
      /* request toast */
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login-page register-page">
      <section className="login-brand">
        <div className="login-brand__copy">
          <span className="eyebrow">OBRANO ACADEMY</span>
          <h1>Student hisobini faollashtiring.</h1>
          <p>Admin bergan nickname va vaqtinchalik paroldan foydalaning.</p>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card register-card" onSubmit={submit}>
          <header>
            <h2>Hisobni faollashtirish</h2>
            <p>Bu amal faqat bir marta bajariladi.</p>
          </header>
          <label>
            Nickname
            <input name="nickname" autoComplete="username" required />
          </label>
          <SecretInput
            name="temporaryPassword"
            label="Vaqtinchalik parol"
            visible={visible.temporary}
            onToggle={() => toggle("temporary")}
            temporary
          />
          <SecretInput
            name="password"
            label="Yangi parol"
            visible={visible.password}
            onToggle={() => toggle("password")}
          />
          <SecretInput
            name="confirmPassword"
            label="Yangi parolni tasdiqlash"
            visible={visible.confirm}
            onToggle={() => toggle("confirm")}
          />
          <button className="btn btn--primary login-submit" disabled={loading}>
            {loading ? "Faollashtirilmoqda..." : "Hisobni faollashtirish"}
          </button>
          <p className="auth-switch">
            <Link to="/login">Kirish sahifasiga qaytish</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
