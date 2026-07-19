// Ukládání nastavení do databáze (Upstash Redis / Vercel KV).
// Bez nastavených proměnných prostředí vrací "nenastaveno" a appka
// se spokojí s uložením v prohlížeči.

export const dynamic = "force-dynamic";

const ZAKLADNI_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function klic(id) {
  return "plan:" + id;
}

function platneId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{4,40}$/.test(id);
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!ZAKLADNI_URL || !TOKEN) {
    return Response.json({ ok: false, duvod: "nenastaveno" });
  }
  if (!platneId(id)) {
    return Response.json({ ok: false, duvod: "spatne-id" }, { status: 400 });
  }

  try {
    const r = await fetch(`${ZAKLADNI_URL}/get/${encodeURIComponent(klic(id))}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
    const odpoved = await r.json();
    const data = odpoved.result ? JSON.parse(odpoved.result) : null;
    return Response.json({ ok: true, data });
  } catch (e) {
    return Response.json({ ok: false, duvod: "chyba-databaze" }, { status: 500 });
  }
}

export async function POST(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!ZAKLADNI_URL || !TOKEN) {
    return Response.json({ ok: false, duvod: "nenastaveno" });
  }
  if (!platneId(id)) {
    return Response.json({ ok: false, duvod: "spatne-id" }, { status: 400 });
  }

  try {
    const telo = await request.json();
    const data = JSON.stringify({ ...telo, ulozeno: Date.now() });
    if (data.length > 200000) {
      return Response.json({ ok: false, duvod: "prilis-velke" }, { status: 413 });
    }
    const r = await fetch(`${ZAKLADNI_URL}/set/${encodeURIComponent(klic(id))}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: data,
      cache: "no-store",
    });
    if (!r.ok) throw new Error("zapis selhal");
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, duvod: "chyba-databaze" }, { status: 500 });
  }
}
