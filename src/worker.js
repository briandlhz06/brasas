const ALLOWED_TTL = new Set([3600, 21600, 86400]);
const KEY_PREFIX = "brasas:";
const MAX_CHARS = 96_000;

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY = {
  "Content-Security-Policy": CSP,
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...SECURITY,
      ...extra,
    },
  });
}

function withSecurity(res, noStore = false) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
  if (noStore) headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function id() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/health" && request.method === "GET") {
    return json({ status: "ok", store: "kv" });
  }

  if (path === "/api/secrets" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ detail: "json inválido" }, 400);
    }
    const { ciphertext, iv, ttl = 86400 } = body || {};
    if (typeof ciphertext !== "string" || !ciphertext || ciphertext.length > MAX_CHARS) {
      return json({ detail: "ciphertext inválido" }, 400);
    }
    if (typeof iv !== "string" || !iv || iv.length > 64) {
      return json({ detail: "iv inválido" }, 400);
    }
    if (!ALLOWED_TTL.has(ttl)) {
      return json({ detail: "ttl no permitido" }, 400);
    }
    const secretId = id();
    await env.SECRETS.put(
      KEY_PREFIX + secretId,
      JSON.stringify({ ciphertext, iv }),
      { expirationTtl: ttl }
    );
    return json({ id: secretId });
  }

  const match = path.match(/^\/api\/secrets\/([^/]+)$/);
  if (match && request.method === "GET") {
    const secretId = match[1];
    if (!secretId || secretId.length > 64) {
      return json({ detail: "no encontrado" }, 404);
    }
    const key = KEY_PREFIX + secretId;
    const raw = await env.SECRETS.get(key);
    if (raw == null) {
      return json({ detail: "quemado o expirado" }, 404);
    }
    await env.SECRETS.delete(key);
    try {
      const data = JSON.parse(raw);
      if (!data.ciphertext || !data.iv) throw new Error("bad");
      return json({ ciphertext: data.ciphertext, iv: data.iv });
    } catch {
      return json({ detail: "dato corrupto" }, 500);
    }
  }

  return json({ detail: "no encontrado" }, 404);
}

async function handlePage(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/") {
    const res = await env.ASSETS.fetch(new URL("/index.html", url.origin));
    return withSecurity(res, true);
  }
  if (path.startsWith("/r/")) {
    const res = await env.ASSETS.fetch(new URL("/read.html", url.origin));
    return withSecurity(res, true);
  }
  if (path.startsWith("/static/")) {
    const asset = path.slice("/static".length);
    const res = await env.ASSETS.fetch(new URL(asset, url.origin));
    return withSecurity(res, path.startsWith("/static/js/"));
  }

  return withSecurity(new Response("no encontrado", { status: 404 }), true);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/")) return handleApi(request, env);
    return handlePage(request, env);
  },
};
