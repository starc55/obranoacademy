import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "../services/authService";
import logo from "../assets/logo.png";

export function LoginPage() {
  const nav = useNavigate(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (await authService.login(email, password)) {
        toast.success("Xush kelibsiz, administrator");
        nav("/");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand brand--login">
          <img src={logo} alt="OBRANO ACADEMY logo" className="brand__mark" />
          <div>
            <strong>OBRANO</strong>
            <small>Academy OS</small>
          </div>
        </div>
        <div className="login-brand__copy">
          <span className="eyebrow">PREMIUM EDUCATION OS</span>
          <h1>
            Markazingizni
            <br />
            aniqlik bilan boshqaring.
          </h1>
          <p>O‘quvchilar, davomat va moliya — yagona sokin ish maydonida.</p>
        </div>
        <div className="login-proof">
          <ShieldCheck />
          <span>
            <strong>Ishonchli Xavfsizlik</strong>
            <small>Ma’lumotlaringiz ishonchli qo'llarda !</small>
          </span>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <header>
            <span className="login-card__mark">N</span>
            <h2>Admin panelga kirish</h2>
            <p>Davom etish uchun hisob ma’lumotlarini kiriting.</p>
          </header>
          <label>
            Email manzil
            <div className="input-shell">
              <Mail />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </label>
          <label>
            Parol
            <div className="input-shell">
              <LockKeyhole />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow((x) => !x)}
                aria-label={show ? "Parolni yashirish" : "Parolni ko‘rsatish"}
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          <button className="btn btn--primary login-submit" disabled={loading}>
            {loading ? (
              "Tekshirilmoqda..."
            ) : (
              <>
                Tizimga kirish <ArrowRight />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
