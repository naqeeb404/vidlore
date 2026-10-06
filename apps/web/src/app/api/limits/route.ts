import { clientHash } from "@/server/client";
import { json } from "@/server/http";
import { remainingToday } from "@/server/usage";

export async function GET(req: Request) {
  return json(await remainingToday(clientHash(req)));
}
