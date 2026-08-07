const enc = new TextEncoder();
const dec = new TextDecoder();

const BUCKETS = [512, 2048, 8192, 32768, 49152];

function toB64Url(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(str) {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function padPlaintext(text) {
  const raw = enc.encode(text);
  const need = 4 + raw.length;
  const bucket = BUCKETS.find((b) => b >= need);
  if (!bucket) throw new Error("too long");
  const out = new Uint8Array(bucket);
  new DataView(out.buffer).setUint32(0, raw.length, false);
  out.set(raw, 4);
  if (4 + raw.length < bucket) {
    crypto.getRandomValues(out.subarray(4 + raw.length));
  }
  return out;
}

function unpadPlaintext(buf) {
  if (buf.length < 4) throw new Error("pad inválido");
  const len = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(
    0,
    false
  );
  if (len < 0 || len > buf.length - 4) throw new Error("pad inválido");
  return dec.decode(buf.subarray(4, 4 + len));
}

async function generateKey() {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function exportKeyRaw(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toB64Url(raw);
}

async function importKeyRaw(b64url) {
  const raw = fromB64Url(b64url);
  if (raw.length !== 32) throw new Error("clave inválida");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
}

async function encryptText(plaintext) {
  const key = await generateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const padded = padPlaintext(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    padded
  );
  return {
    ciphertext: toB64Url(ciphertext),
    iv: toB64Url(iv),
    key: await exportKeyRaw(key),
  };
}

async function decryptText(ciphertextB64, ivB64, keyB64) {
  const key = await importKeyRaw(keyB64);
  const iv = fromB64Url(ivB64);
  const ciphertext = fromB64Url(ciphertextB64);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return unpadPlaintext(new Uint8Array(plain));
}

window.BrasasCrypto = {
  encryptText,
  decryptText,
  toB64Url,
  fromB64Url,
  BUCKETS,
};
