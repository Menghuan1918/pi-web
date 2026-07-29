import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { invalidateModelsCache } from "@/lib/models-cache";
import { compressedJson } from "@/lib/compress";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const modelRuntime = await ModelRuntime.create();
  if (!modelRuntime.getProvider(provider)?.auth.oauth) {
    return compressedJson(req, { error: `Unknown provider: ${provider}` }, { status: 400 });
  }
  await modelRuntime.logout(provider);
  invalidateModelsCache();
  return compressedJson(req, { ok: true });
}
