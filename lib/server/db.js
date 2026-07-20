// Přístup k databázi (Upstash Redis / Vercel KV) přes REST.
// Bez proměnných prostředí appka běží dál, jen bez ukládání na server.

const ZAKLADNI_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function nakonfigurovano() {
  return Boolean(ZAKLADNI_URL && TOKEN);
}

export async function dbGet(klic) {
  const r = await fetch(`${ZAKLADNI_URL}/get/${encodeURIComponent(klic)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("čtení z databáze selhalo");
  const odpoved = await r.json();
  if (odpoved.result === null || odpoved.result === undefined) return null;
  try {
    return JSON.parse(odpoved.result);
  } catch {
    return odpoved.result;
  }
}

export async function dbSet(klic, hodnota) {
  const r = await fetch(`${ZAKLADNI_URL}/set/${encodeURIComponent(klic)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(hodnota),
    cache: "no-store",
  });
  if (!r.ok) throw new Error("zápis do databáze selhal");
  return true;
}

export const klice = {
  uzivatel: (email) => `uzivatel:${email}`,
  plan: (domacnost) => `plan:${domacnost}`,
};
