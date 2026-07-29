import { NextRequest } from "next/server";
import { stat } from "fs/promises";
import { compressedJson } from "@/lib/compress";
import {
  getBrowseStartDirectory,
  getParentDirectory,
  listDirectories,
  resolveDirectory,
} from "@/lib/directory-browser";

// GET /api/cwd/browse?path=...：列出文件系统中的可读子目录。
export async function GET(request: NextRequest) {
  try {
    const requested = request.nextUrl.searchParams.get("path")?.trim();
    const candidate = getBrowseStartDirectory(requested);

    let resolved: string;
    try {
      resolved = await resolveDirectory(candidate);
    } catch {
      return compressedJson(request, { error: "Directory does not exist" }, { status: 404 });
    }


    const directoryStat = await stat(resolved);
    if (!directoryStat.isDirectory()) {
      return compressedJson(request, { error: "Path is not a directory" }, { status: 400 });
    }

    const directories = await listDirectories(resolved);

    return compressedJson(request, {
      path: resolved,
      parentPath: getParentDirectory(resolved),
      directories,
    });
  } catch (error) {
    return compressedJson(request, { error: String(error) }, { status: 500 });
  }
}
