import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSync } from "@/lib/sources/orchestrator";
import { HackenAdapter } from "@/lib/sources/hacken";

const ADAPTERS: Record<string, () => import("@/lib/sources/types").AuditSourceAdapter> = {
  hacken: () => new HackenAdapter(),
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const supabase = await createClient();

  // Admin check.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { sourceId } = await params;

  // Look up the source.
  const { data: source, error: srcErr } = await supabase
    .from("sources")
    .select("id, name, enabled")
    .eq("id", sourceId)
    .single();

  if (srcErr || !source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (!source.enabled) {
    return NextResponse.json({ error: "Source is disabled" }, { status: 400 });
  }

  const adapterFactory = ADAPTERS[source.name.toLowerCase()];
  if (!adapterFactory) {
    return NextResponse.json(
      { error: `No adapter registered for source: ${source.name}` },
      { status: 400 }
    );
  }

  try {
    const result = await runSync(sourceId, adapterFactory());
    return NextResponse.json({
      ok: true,
      created: result.created,
      updated: result.updated,
      unchanged: result.unchanged,
      errors: result.errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
