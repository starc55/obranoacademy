import { AppSelect } from "../components/ui/AppSelect";
import { useRef } from "react";
import {
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Save,
  Users,
  UserRound,
  CalendarX2,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { importExportService } from "../services/importExportService";
import { writeDB, readDB } from "../services/storage";
export function SettingsPage() {
  const { settings, updateSettings } = useApp(),
    ref = useRef();
  const save = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    [
      "defaultGroupFee",
      "defaultIndividualFee",
      "absencePenaltyStart",
      "absencePenaltyAmount",
    ].forEach((k) => (v[k] = +v[k]));
    updateSettings(v);
    toast.success("Sozlamalar saqlandi");
  };
  const restore = async (e) => {
    try {
      await importExportService.restore(e.target.files[0]);
      toast.success("Backup tiklandi");
    } catch {
      toast.error("Backup fayli noto‘g‘ri");
    }
  };
  const clear = () => {
    if (confirm("Barcha ma’lumotlar o‘chirilsinmi?")) {
      const db = readDB();
      writeDB({
        ...db,
        students: [],
        groups: [],
        attendance: [],
        payments: [],
      });
      toast.success("Barcha data o‘chirildi");
    }
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Sozlamalar</h2>
          <p>Markaz, tarif va jarima tartibini boshqaring</p>
        </div>
      </div>
      <div className="settings-grid">
        <form
          className="panel settings-form settings-form--wide"
          onSubmit={save}
        >
          <header>
            <div>
              <h3>Markaz ma’lumotlari</h3>
              <p>Profil va regional parametrlar</p>
            </div>
          </header>
          <div className="form-grid form-grid--flush">
            <label>
              O‘quv markaz nomi
              <input name="centerName" defaultValue={settings.centerName} />
            </label>
            <label>
              Administrator ismi
              <input name="adminName" defaultValue={settings.adminName} />
            </label>
            <label>
              Valyuta
              <AppSelect name="currency" defaultValue={settings.currency}>
                <option>UZS</option>
                <option>USD</option>
              </AppSelect>
            </label>
            <label>
              Sana formati
              <AppSelect name="dateFormat" defaultValue={settings.dateFormat}>
                <option>dd.MM.yyyy</option>
                <option>yyyy-MM-dd</option>
              </AppSelect>
            </label>
          </div>
          <header className="settings-section-head">
            <div>
              <h3>To‘lov va jarima tartibi</h3>
              <p>Guruh, individual dars va ketma-ket qoldirish qoidalari</p>
            </div>
          </header>
          <div className="fee-grid">
            <label>
              <span className="field-icon">
                <Users />
              </span>
              <span>
                Guruh uchun default to‘lov
                <small>Yangi guruh/o‘quvchi bazaviy narxi</small>
              </span>
              <input
                name="defaultGroupFee"
                type="number"
                defaultValue={settings.defaultGroupFee}
              />
            </label>
            <label>
              <span className="field-icon">
                <UserRound />
              </span>
              <span>
                Individual dars to‘lovi
                <small>Yakka tartibdagi oylik narx</small>
              </span>
              <input
                name="defaultIndividualFee"
                type="number"
                defaultValue={settings.defaultIndividualFee}
              />
            </label>
            <label>
              <span className="field-icon">
                <CalendarX2 />
              </span>
              <span>
                Jarima boshlanadigan dars<small>Ketma-ket qoldirish soni</small>
              </span>
              <input
                name="absencePenaltyStart"
                type="number"
                min="2"
                defaultValue={settings.absencePenaltyStart}
              />
            </label>
            <label>
              <span className="field-icon">
                <Coins />
              </span>
              <span>
                Har keyingi dars uchun<small>Oylik summaga qo‘shiladi</small>
              </span>
              <input
                name="absencePenaltyAmount"
                type="number"
                step="1000"
                defaultValue={settings.absencePenaltyAmount}
              />
            </label>
          </div>
          <div className="rule-preview">
            <strong>Hisoblash tartibi</strong>
            <div>
              <span>1–3 dars</span>
              <b>Jarimasiz</b>
              <i>→</i>
              <span>4-dars</span>
              <b>+20 000 so‘m</b>
              <i>→</i>
              <span>5-dars</span>
              <b>+40 000 so‘m</b>
            </div>
          </div>
          <button className="btn btn--primary">
            <Save /> Sozlamalarni saqlash
          </button>
        </form>
        <section className="panel">
          <header>
            <div>
              <h3>Ko‘rinish</h3>
              <p>Interfeys rejimlari</p>
            </div>
          </header>
          <div className="setting-row">
            <div>
              <strong>Dark mode</strong>
              <small>Premium qora interfeys</small>
            </div>
            <button
              className={`switch ${settings.theme === "dark" ? "on" : ""}`}
              onClick={() =>
                updateSettings({
                  theme: settings.theme === "dark" ? "light" : "dark",
                })
              }
            >
              <i />
            </button>
          </div>
          <div className="setting-row">
            <div>
              <strong>Compact mode</strong>
              <small>Jadvallarda ko‘proq ma’lumot</small>
            </div>
            <button
              className={`switch ${settings.compact ? "on" : ""}`}
              onClick={() => updateSettings({ compact: !settings.compact })}
            >
              <i />
            </button>
          </div>
        </section>
        <section className="panel panel--wide">
          <header>
            <div>
              <h3>Ma’lumotlar va xavfsizlik</h3>
              <p>Barcha ma’lumotlar brauzer localStorage’ida saqlanadi</p>
            </div>
          </header>
          <div className="data-actions">
            <button className="btn" onClick={importExportService.backup}>
              <Download /> JSON backup
            </button>
            <button className="btn" onClick={() => ref.current.click()}>
              <Upload /> Backup tiklash
            </button>
            <input
              ref={ref}
              hidden
              type="file"
              accept=".json"
              onChange={restore}
            />
            <button className="btn btn--danger" onClick={clear}>
              <Trash2 /> Barchasini o‘chirish
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
