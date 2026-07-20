import { dbGet, klice, nakonfigurovano } from "../../../../lib/server/db";
import { overHeslo, upravEmail, vytvorRelaci } from "../../../../lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!nakonfigurovano()) {
    return Response.json({ ok: false, duvod: "nenastaveno" });
  }
  try {
    const { email: syrovyEmail, heslo } = await request.json();
    const email = upravEmail(syrovyEmail);
    const uzivatel = await dbGet(klice.uzivatel(email));

    if (!uzivatel || !overHeslo(String(heslo || ""), uzivatel.heslo)) {
      return Response.json({ ok: false, chyba: "Špatný e-mail nebo heslo." }, { status: 401 });
    }

    vytvorRelaci(email, uzivatel.domacnost);
    return Response.json({ ok: true, email, domacnost: uzivatel.domacnost });
  } catch (e) {
    return Response.json({ ok: false, chyba: "Přihlášení se nezdařilo." }, { status: 500 });
  }
}
