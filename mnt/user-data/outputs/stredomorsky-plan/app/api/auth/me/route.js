import { nakonfigurovano } from "../../../../lib/server/db";
import { nactiRelaci } from "../../../../lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!nakonfigurovano()) {
    return Response.json({ ok: false, duvod: "nenastaveno" });
  }
  const relace = nactiRelaci();
  if (!relace) return Response.json({ ok: true, prihlasen: false });
  return Response.json({
    ok: true,
    prihlasen: true,
    email: relace.email,
    domacnost: relace.domacnost,
  });
}
