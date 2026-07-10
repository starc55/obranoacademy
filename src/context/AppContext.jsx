import { createContext, useContext, useEffect, useState } from "react";
import { hydrateDB, readDB, saveSettings, writeDB } from "../services/storage";
const Context = createContext(null);
export function AppProvider({ children }) {
  const [data, setData] = useState(readDB);
  const refresh = () => setData(readDB());
  useEffect(() => {
    const hydrateAfterLogin = () => hydrateDB().catch(() => {});
    if (localStorage.getItem("nova_admin_session")) hydrateAfterLogin();
    window.addEventListener("nova:data", refresh);
    window.addEventListener("nova:auth", hydrateAfterLogin);
    return () => {
      window.removeEventListener("nova:data", refresh);
      window.removeEventListener("nova:auth", hydrateAfterLogin);
    };
  }, []);
  const updateSettings = (patch) => {
    const db = readDB();
    const settings = { ...db.settings, ...patch };
    const next = { ...db, settings };
    if (patch.theme) document.documentElement.dataset.theme = patch.theme;
    writeDB(next);
    setData(next);
    saveSettings(settings).catch(() => {});
  };
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme || "light";
  }, [data.settings.theme]);
  return (
    <Context.Provider value={{ ...data, refresh, updateSettings }}>
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
