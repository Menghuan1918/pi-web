import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import {
  MAX_INLINE_BASH_OUTPUT_BYTES,
  openRegularFileNoFollow,
  readUtf8FileWithinLimit,
  resolveBashOutputPath,
} from "@/lib/bash-output";
import { isBashOutputPathReferencedBySession } from "@/lib/session-file-references";
import { compressedJson, pipeCompressed } from "@/lib/compress";

// GET /api/agent/[id]/bash-output?path=<absPath>
// Reads a bash output temp file referenced by this session. Inline display is
// size-limited; download responses stream the file without buffering it.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let path: string | null = null;
  let download = false;
  try {
    const url = new URL(req.url);
    path = url.searchParams.get("path");
    download = url.searchParams.get("download") === "1";
  } catch {
    return compressedJson(req, { error: "invalid url" }, { status: 400 });
  }

  if (!path) {
    return compressedJson(req, { error: "path required" }, { status: 400 });
  }

  const resolved = resolveBashOutputPath(path, tmpdir());
  if (!resolved) {
    return compressedJson(req, { error: "invalid path" }, { status: 400 });
  }

  if (!await isBashOutputPathReferencedBySession(resolved, id)) {
    return compressedJson(req, { error: "forbidden" }, { status: 403 });
  }

  try {
    if (download) {
      const { handle } = await openRegularFileNoFollow(resolved);
      const raw = Readable.toWeb(handle.createReadStream()) as ReadableStream<Uint8Array>;
      const { stream, encoding } = pipeCompressed(req, raw);
      const headers: Record<string, string> = {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"bash-output.log\"",
        "Cache-Control": "no-store",
      };
      if (encoding) {
        headers["Content-Encoding"] = encoding;
        headers["Vary"] = "Accept-Encoding";
      }
      return new Response(stream, { headers });
    }

    const result = await readUtf8FileWithinLimit(resolved);
    if (result.tooLarge) {
      return compressedJson(req, {
        error: `Full output is too large to display (limit ${MAX_INLINE_BASH_OUTPUT_BYTES} bytes)`,
        data: { size: result.size, maxBytes: MAX_INLINE_BASH_OUTPUT_BYTES },
      }, { status: 413 });
    }
    return compressedJson(req, { success: true, data: { output: result.content } });
  } catch {
    return compressedJson(req, { error: "full output unavailable" }, { status: 404 });
  }
}
