import fs from "fs";
import { NextRequest } from "next/server";
import { compressedJson } from "@/lib/compress";
import { getAllowedFileRoots, isExistingFilePathAllowed, isFilePathAllowed, isWindowsAbsolutePath } from "@/lib/file-access";
import { getGitStatus } from "@/lib/git-changes";

export async function GET(request: NextRequest) {
  try {
    const cwd = request.nextUrl.searchParams.get("cwd")?.trim() ?? "";
    if (!cwd || (!cwd.startsWith("/") && !isWindowsAbsolutePath(cwd))) {
      return compressedJson(request, { error: "cwd must be an absolute path" }, { status: 400 });
    }

    const allowedRoots = await getAllowedFileRoots();
    if (!isFilePathAllowed(cwd, allowedRoots)) {
      return compressedJson(request, { error: "Access denied" }, { status: 403 });
    }

    let stat: fs.Stats;
    try {
      stat = fs.statSync(cwd);
    } catch {
      return compressedJson(request, { error: "Directory not found" }, { status: 404 });
    }
    if (!stat.isDirectory()) {
      return compressedJson(request, { error: "Not a directory" }, { status: 400 });
    }
    if (!isExistingFilePathAllowed(cwd, allowedRoots)) {
      return compressedJson(request, { error: "Access denied" }, { status: 403 });
    }

    return compressedJson(request, await getGitStatus(cwd));
  } catch (error) {
    return compressedJson(request, { error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
