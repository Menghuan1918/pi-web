import { compressedJson } from "@/lib/compress";
import { getRpcSession } from "@/lib/rpc-manager";
import { resolveSessionPath } from "@/lib/session-reader";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    if (!await resolveSessionPath(id)) {
      return compressedJson(req, { error: "Session not found" }, { status: 404 });
    }

    const rpc = getRpcSession(id);
    if (!rpc?.isAlive()) return compressedJson(req, { running: false });

    const state = await rpc.send({ type: "get_state" });
    return compressedJson(req, { running: true, state });
  } catch (error) {
    return compressedJson(req, { error: String(error) }, { status: 500 });
  }
}
