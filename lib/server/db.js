// Přístup k databázi (Upstash Redis / Vercel KV) přes REST.
// Bez proměnných prostředí appka běží dál, jen bez ukládání na server.

// Vercel může proměnným přidat prefix (např. "medit_KV_REST_API_URL").
// Proto hledáme podle konce názvu, ne podle přesné shody.
function najdi(pripona) {
  const primy = process.env[pripona];
  if (primy) return primy;
  const klic = Object.keys(process.env).find(
    (k) => k.endsWith("_" + pripona) || k === pripona
  );
  return klic ? process.env[klic] : undefined;
}

// Token musí být pro zápis — read-only variantu vynecháme.
function najdiToken() {
  const rest = najdi("KV_REST_API_TOKEN") || najdi("UPSTASH_REDIS_REST_TOKEN");
  if (rest) return rest;
  const klic = Object.keys(process.env).find(
    (k) =>
      (k.endsWith("KV_REST_API_TOKEN") || k.endsWith("UPSTASH_REDIS_REST_TOKEN")) &&
      !k.includes("READ_ONLY")
  );
  return klic ? process.env[klic] : undefined;
}

const ZAKLADNI_URL = najdi("KV_REST_API_URL") || najdi("UPSTASH_REDIS_REST_URL");
const TOKEN = najdiToken();

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
