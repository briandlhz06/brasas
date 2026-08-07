const warn = document.getElementById("burn-warn");
const loading = document.getElementById("loading");
const reveal = document.getElementById("reveal");
const plainEl = document.getElementById("plaintext");
const gone = document.getElementById("gone");
const errEl = document.getElementById("error");
const copyBtn = document.getElementById("copy-plain");

const id = location.pathname.split("/").filter(Boolean).pop();
const key = location.hash.slice(1);

(async function main() {
  if (!id || !key) {
    showGone(BrasasI18n.t("errNoKey"));
    return;
  }

  try {
    const res = await fetch(`/api/secrets/${encodeURIComponent(id)}`);
    if (res.status === 404) {
      showGone(BrasasI18n.t("errBurned"));
      return;
    }
    if (!res.ok) throw new Error(BrasasI18n.t("errRead"));

    const data = await res.json();
    const text = await BrasasCrypto.decryptText(
      data.ciphertext,
      data.iv,
      key
    );

    loading.hidden = true;
    warn.hidden = false;
    reveal.hidden = false;
    plainEl.value = text;

    history.replaceState(null, "", location.pathname);
  } catch (err) {
    loading.hidden = true;
    if (err.name === "OperationError") {
      showGone(BrasasI18n.t("errDecrypt"));
    } else {
      errEl.textContent = err.message || BrasasI18n.t("errGeneric");
      errEl.hidden = false;
    }
  }
})();

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(plainEl.value);
    copyBtn.textContent = BrasasI18n.t("copied");
    setTimeout(() => {
      copyBtn.textContent = BrasasI18n.t("copyPlain");
    }, 1600);
  } catch {
    plainEl.select();
  }
});

window.addEventListener("brasas:lang", () => {
  copyBtn.textContent = BrasasI18n.t("copyPlain");
});

function showGone(msg) {
  loading.hidden = true;
  warn.hidden = true;
  reveal.hidden = true;
  gone.hidden = false;
  document.getElementById("gone-msg").textContent = msg;
}
