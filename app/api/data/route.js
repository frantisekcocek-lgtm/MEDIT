// Data jídelníčku. Čtou a zapisují se podle přihlášené domácnosti.
import { dbGet, dbSet, klice, nakonfigurovano } from "../../../lib/server/db";
import { nactiRelaci } from "../../../lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!nakonfigurovano()) return Response.json({ ok: false, duvod: "nenastaveno" });
  const relace = nactiRelaci();
  if (!relace) return Response.json({ ok: false, duvod: "neprihlasen" }, { status: 401 });

  try {
    const data = await dbGet(klice.plan(relace.domacnost));
    return Response.json({ ok: true, data });
  } catch {
    return Response.json({ ok: false, duvod: "chyba-databaze" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!nakonfigurovano()) return Response.json({ ok: false, duvod: "nenastaveno" });
  const relace = nactiRelaci();
  if (!relace) return Response.json({ ok: false, duvod: "neprihlasen" }, { status: 401 });

  try {
    const telo = await request.json();
    const data = { ...telo, ulozeno: Date.now() };
    if (JSON.stringify(data).length > 200000) {
      return Response.json({ ok: false, duvod: "prilis-velke" }, { status: 413 });
    }
    await dbSet(klice.plan(relace.domacnost), data);
    return Response.json({ ok: true, ulozeno: data.ulozeno });
  } catch {
    return Response.json({ ok: false, duvod: "chyba-databaze" }, { status: 500 });
  }
}
