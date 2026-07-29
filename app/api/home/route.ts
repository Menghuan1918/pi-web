import { compressedJson } from "@/lib/compress";
import { homedir } from "os";

export async function GET(req: Request) {
  return compressedJson(req, { home: homedir() });
}
