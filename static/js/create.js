const form = document.getElementById("create-form");
const secretEl = document.getElementById("secret");
const ttlEl = document.getElementById("ttl");
const result = document.getElementById("result");
const linkEl = document.getElementById("share-link");
const copyBtn = document.getElementById("copy-btn");
const errEl = document.getElementById("error");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.hidden = true;
  result.hidden = true;

  const text = secretEl.value;
  if (!text.trim()) {
    showError(BrasasI18n.t("errEmpty"));
    return;
  }
  if (text.length > 49_000) {
    showError(BrasasI18n.t("errLong"));
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = BrasasI18n.t("encrypting");

  try {
    const packed = await BrasasCrypto.encryptText(text);
    const res = await fetch("/api/secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ciphertext: packed.ciphertext,
        iv: packed.iv,
        ttl: Number(ttlEl.value),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || BrasasI18n.t("errSave"));
    }

    const { id } = await res.json();
    const url = `${location.origin}/r/${id}#${packed.key}`;
    linkEl.value = url;
    result.hidden = false;
    secretEl.value = "";
  } catch (err) {
    showError(err.message || BrasasI18n.t("errEncrypt"));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = BrasasI18n.t("submit");
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(linkEl.value);
    copyBtn.textContent = BrasasI18n.t("copied");
    setTimeout(() => {
      copyBtn.textContent = BrasasI18n.t("copy");
    }, 1600);
  } catch {
    linkEl.select();
    showError(BrasasI18n.t("errCopy"));
  }
});

window.addEventListener("brasas:lang", () => {
  if (!submitBtn.disabled) submitBtn.textContent = BrasasI18n.t("submit");
  if (copyBtn.textContent === "Copiado" || copyBtn.textContent === "Copied") {
    copyBtn.textContent = BrasasI18n.t("copied");
  } else {
    copyBtn.textContent = BrasasI18n.t("copy");
  }
});

function showError(msg) {
  errEl.textContent = msg;
  errEl.hidden = false;
}
