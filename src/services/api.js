const API_BASE = import.meta?.env?.VITE_API_URL ?? "/api";

function makeHeaders(token, extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function apiRequest(path, { method = "GET", body, token, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: makeHeaders(token, headers),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text || res.statusText }; }
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}
export const api = { request: apiRequest, base: API_BASE };
