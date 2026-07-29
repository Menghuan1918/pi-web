import { compressedJson } from "@/lib/compress";
import { listAllSessions } from "@/lib/session-reader";
import { getRunningRpcSessionIds } from "@/lib/rpc-manager";

export async function GET(req: Request) {
  try {
    const sessions = await listAllSessions();
    return compressedJson(req, { sessions, runningSessionIds: getRunningRpcSessionIds() });
  } catch (error) {
    return compressedJson(req,
      { error: String(error) },
      { status: 500 }
    );
  }
}
