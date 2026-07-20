import { zrusRelaci } from "../../../../lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  zrusRelaci();
  return Response.json({ ok: true });
}
