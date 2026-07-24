import { toast } from "sonner";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const SESSION_KEY = "nova_admin_session";
const KEY = "nova_neon_cache_v1",
  defaults = {
    adminName: "Administrator",
    centerName: "O‘quv markazi",
    currency: "UZS",
    theme: "light",
    compact: false,
    defaultGroupFee: 500000,
    defaultIndividualFee: 800000,
    absencePenaltyStart: 4,
    absencePenaltyAmount: 20000,
    dateFormat: "dd.MM.yyyy",
    weekStart: 1,
  },
  empty = () => ({
    students: [],
    groups: [],
    attendance: [],
    payments: [],
    settings: { ...defaults },
  });
let cache = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return {
      ...empty(),
      ...saved,
      settings: { ...defaults, ...saved?.settings },
    };
  } catch {
    return empty();
  }
})();
const notify = () => window.dispatchEvent(new Event("nova:data"));
const request = (url, options = {}) =>
  fetch(`${API_URL}${url}`, {
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(localStorage.getItem(SESSION_KEY)
        ? { Authorization: `Bearer ${localStorage.getItem(SESSION_KEY)}` }
        : {}),
    },
    signal: options.signal || AbortSignal.timeout(15000),
    ...options,
  })
    .then(async (r) => {
      if (!r.ok) {
        const contentType = r.headers.get("content-type") || "",
          responseText = await r.text().catch(() => ""),
          payload = contentType.includes("application/json")
            ? (() => {
                try {
                  return JSON.parse(responseText);
                } catch {
                  return {};
                }
              })()
            : {},
          fallbackMessages = {
            400: "Yuborilgan ma’lumotlarni tekshiring",
            401: "Sessiya tugagan. Qayta kiring",
            403: "Bu amal uchun ruxsat yo‘q",
            404: "So‘ralgan API endpoint topilmadi",
            409: "Ma’lumotlar to‘qnashuvi yuz berdi",
            413: "Yuklanayotgan fayllar hajmi juda katta",
            429: "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring",
            500: "Server ma’lumotni saqlay olmadi",
            502: "Server vaqtincha javob bermayapti",
            503: "Server vaqtincha mavjud emas",
          },
          safeServerText =
            responseText &&
            !responseText.trimStart().startsWith("<") &&
            responseText.length < 300
              ? responseText
              : "",
          message =
            payload.error ||
            safeServerText ||
            fallbackMessages[r.status] ||
            `Server xatosi (${r.status})`;
        const loggedOutRequest =
          r.status === 401 &&
          !localStorage.getItem(SESSION_KEY) &&
          !url.startsWith("/api/auth/");
        if (!loggedOutRequest) toast.error(message);
        throw new Error(message);
      }
      return r.status === 204 ? null : r.json();
    })
    .catch((error) => {
      if (error.name === "TimeoutError") {
        toast.error("Server javobi kechikdi. Qayta urinib ko‘ring");
        throw new Error("Server javobi kechikdi");
      }
      if (error instanceof TypeError) {
        const message =
          "Serverga ulanib bo‘lmadi. Internet yoki API manzilini tekshiring";
        toast.error(message);
        throw new Error(message);
      }
      throw error;
    });
export function readDB() {
  return cache;
}
export function writeDB(data) {
  cache = data;
  localStorage.setItem(KEY, JSON.stringify(data));
  notify();
  return data;
}
export async function hydrateDB() {
  const data = await request("/api/data");
  writeDB({ ...empty(), ...data, settings: { ...defaults, ...data.settings } });
  return data;
}
export function table(name) {
  const endpoint = `/api/${name}`;
  return {
    list: () => readDB()[name] || [],
    create: (item) => {
      const next = { ...item, id: item.id || crypto.randomUUID() },
        db = readDB();
      writeDB({ ...db, [name]: [...(db[name] || []), next] });
      request(endpoint, { method: "POST", body: JSON.stringify(next) }).catch(
        () => hydrateDB(),
      );
      return next;
    },
    update: (id, patch) => {
      const db = readDB();
      writeDB({
        ...db,
        [name]: db[name].map((x) => (x.id === id ? { ...x, ...patch } : x)),
      });
      request(`${endpoint}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }).catch(() => hydrateDB());
    },
    remove: (id) => {
      const db = readDB();
      writeDB({ ...db, [name]: db[name].filter((x) => x.id !== id) });
      request(`${endpoint}/${id}`, { method: "DELETE" }).catch(() =>
        hydrateDB(),
      );
    },
    replace: (items) => {
      const db = readDB();
      writeDB({ ...db, [name]: items });
    },
  };
}
export async function saveSettings(settings) {
  await request("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
export async function fetchFileBlob(url) {
  const response = await fetch(`${API_URL}${url}`, {
    headers: localStorage.getItem(SESSION_KEY)
      ? { Authorization: `Bearer ${localStorage.getItem(SESSION_KEY)}` }
      : {},
  });
  if (!response.ok) throw new Error("Faylni ochib bo‘lmadi");
  return response.blob();
}
export async function download(url, fileName = "download") {
  const response = await fetch(`${API_URL}${url}`, {
    headers: localStorage.getItem(SESSION_KEY)
      ? { Authorization: `Bearer ${localStorage.getItem(SESSION_KEY)}` }
      : {},
  });
  if (!response.ok) throw new Error("Faylni yuklab bo‘lmadi");
  const href = URL.createObjectURL(await response.blob()),
    anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(href);
}
export { KEY, request };
