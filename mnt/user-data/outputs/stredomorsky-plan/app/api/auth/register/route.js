import { dbGet, dbSet, klice, nakonfigurovano } from "../../../../lib/server/db";
import {
  novaDomacnost,
  platnyEmail,
  upravEmail,
  vytvorRelaci,
  zahesluj,
} from "../../../../lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!nakonfigurovano()) {
    return Response.json({ ok: false, duvod: "nenastaveno" });
  }
  try {
    const { email: syrovyEmail, heslo, pozvanka } = await request.json();
    const email = upravEmail(syrovyEmail);

    if (!platnyEmail(email)) {
      return Response.json({ ok: false, chyba: "Zadejte platný e-mail." }, { status: 400 });
    }
    if (!heslo || String(heslo).length < 8) {
      return Response.json({ ok: false, chyba: "Heslo musí mít aspoň 8 znaků." }, { status: 400 });
    }

    const existuje = await dbGet(klice.uzivatel(email));
    if (existuje) {
      return Response.json({ ok: false, chyba: "Účet s tímhle e-mailem už existuje." }, { status: 409 });
    }

    // Pozvánka připojí druhého člena ke stejné domácnosti
    let domacnost = novaDomacnost();
    if (pozvanka) {
      const kod = String(pozvanka).trim();
      if (!/^dom-[a-z0-9]{4,32}$/.test(kod)) {
        return Response.json({ ok: false, chyba: "Neplatný kód domácnosti." }, { status: 400 });
      }
      domacnost = kod;
    }

    await dbSet(klice.uzivatel(email), {
      email,
      heslo: zahesluj(String(heslo)),
      domacnost,
      vytvoreno: Date.now(),
    });

    vytvorRelaci(email, domacnost);
    return Response.json({ ok: true, email, domacnost });
  } catch (e) {
    return Response.json({ ok: false, chyba: "Registrace se nezdařila." }, { status: 500 });
  }
}
