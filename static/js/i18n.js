const STRINGS = {
  es: {
    htmlLang: "es-AR",
    titleCreate: "brasas",
    titleRead: "brasas · leer",
    metaDesc:
      "Compartí un secreto por un link de un solo uso. Se cifra en tu browser.",
    tagline:
      "Un secreto. Un link. Se quema al leerlo. El cifrado pasa en tu browser; el server nunca ve el texto.",
    labelSecret: "Secreto",
    placeholder: "env vars, passwords, tokens…",
    labelTtl: "Vive hasta",
    ttl24: "24 horas",
    ttl6: "6 horas",
    ttl1: "1 hora",
    submit: "Generar link",
    encrypting: "Cifrando…",
    resultTitle: "Listo. Mandá este link.",
    resultNote: "Quien lo abra lo lee una sola vez. Después se borra.",
    copy: "Copiar",
    copied: "Copiado",
    footNote:
      "Self-host o usá el demo. En producción: HTTPS. Similar a OneTimeSecret / Bitwarden Send; zero-knowledge desde el día 1.",
    code: "código",
    errEmpty: "Pegá algo antes de generar el link.",
    errLong: "Demasiado largo. Máximo ~49k caracteres.",
    errSave: "No se pudo guardar",
    errEncrypt: "Falló el cifrado",
    errCopy: "No pude copiar. Seleccioná el link y copiá a mano.",
    burnWarn:
      "Este secreto se quema al abrirlo. Después de esta vista, ya no existe.",
    loading: "Descifrando…",
    revealTitle: "Tu secreto",
    copyPlain: "Copiar texto",
    createAnother: "Crear otro",
    goneTitle: "Ya se quemó",
    backHome: "Volver a brasas",
    home: "inicio",
    errNoKey: "Falta la clave en el link (el pedazo después de #).",
    errBurned: "Este secreto ya se quemó o expiró.",
    errRead: "No se pudo leer el secreto",
    errDecrypt: "No se pudo descifrar. La clave del link no cierra.",
    errGeneric: "Error al leer",
  },
  en: {
    htmlLang: "en",
    titleCreate: "brasas",
    titleRead: "brasas · read",
    metaDesc:
      "Share a secret with a one-time link. Encrypted in your browser before it leaves.",
    tagline:
      "One secret. One link. It burns when read. Encryption happens in your browser; the server never sees the plaintext.",
    labelSecret: "Secret",
    placeholder: "env vars, passwords, tokens…",
    labelTtl: "Expires in",
    ttl24: "24 hours",
    ttl6: "6 hours",
    ttl1: "1 hour",
    submit: "Create link",
    encrypting: "Encrypting…",
    resultTitle: "Done. Send this link.",
    resultNote: "Whoever opens it reads it once. Then it is gone.",
    copy: "Copy",
    copied: "Copied",
    footNote:
      "Self-host or use the demo. Production needs HTTPS. Similar idea to OneTimeSecret / Bitwarden Send; zero-knowledge from day one.",
    code: "source",
    errEmpty: "Paste something before creating the link.",
    errLong: "Too long. Max ~49k characters.",
    errSave: "Could not save",
    errEncrypt: "Encryption failed",
    errCopy: "Could not copy. Select the link and copy manually.",
    burnWarn:
      "This secret burns when opened. After this view, it no longer exists.",
    loading: "Decrypting…",
    revealTitle: "Your secret",
    copyPlain: "Copy text",
    createAnother: "Create another",
    goneTitle: "Already burned",
    backHome: "Back to brasas",
    home: "home",
    errNoKey: "Missing key in the link (the part after #).",
    errBurned: "This secret was already burned or expired.",
    errRead: "Could not fetch the secret",
    errDecrypt: "Could not decrypt. The key in the link does not match.",
    errGeneric: "Read error",
  },
};

function getLang() {
  const saved = localStorage.getItem("brasas-lang");
  if (saved === "es" || saved === "en") return saved;
  return "es";
}

function t(key) {
  const lang = getLang();
  return STRINGS[lang][key] || STRINGS.es[key] || key;
}

function applyI18n() {
  const lang = getLang();
  document.documentElement.lang = STRINGS[lang].htmlLang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
    el.textContent = val;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });

  document.querySelectorAll("[data-i18n-option]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n-option"));
  });

  const titleKey = document.body.dataset.titleKey;
  if (titleKey) document.title = t(titleKey);

  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", t("metaDesc"));

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.setAttribute(
      "aria-pressed",
      btn.getAttribute("data-lang") === lang ? "true" : "false"
    );
  });
}

function setLang(lang) {
  if (lang !== "es" && lang !== "en") return;
  localStorage.setItem("brasas-lang", lang);
  applyI18n();
  window.dispatchEvent(new CustomEvent("brasas:lang"));
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18n();
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.getAttribute("data-lang")));
  });
});

window.BrasasI18n = { t, getLang, setLang, applyI18n };
