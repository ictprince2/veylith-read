import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { AuditSourceAdapter, NormalizedAudit, NormalizedFinding } from "./types";

const SEVERITY_MAP: Record<string, NormalizedFinding["severity"]> = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  OBSERVATION: "informational",
  INFORMATIONAL: "informational",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function chainFromPlatforms(platforms: string[]): string {
  if (platforms.length === 0) return "";
  return platforms[0];
}

function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
}

export async function runSync(
  sourceId: string,
  adapter: AuditSourceAdapter
): Promise<SyncResult> {
  const supabase = await createClient();

  const { data: syncRun, error: srErr } = await supabase
    .from("sync_runs")
    .insert({ source_id: sourceId, status: "running" })
    .select("id")
    .single();

  if (srErr || !syncRun) {
    throw new Error(`Failed to create sync_run: ${srErr?.message}`);
  }

  const result: SyncResult = { created: 0, updated: 0, unchanged: 0, errors: [] };

  try {
    const records = await adapter.discover();

    for (const record of records) {
      try {
        const content = await adapter.fetch(record);
        const parsed = adapter.parse(content);
        const normalized = adapter.normalize(parsed);
        const validation = adapter.validate(normalized);

        if (!validation.ok) {
          result.errors.push(
            `Validation failed for ${adapter.sourceUrl(record)}: ${validation.errors.join(", ")}`
          );
          continue;
        }

        await store(supabase, sourceId, normalized, adapter.sourceUrl(record), result);
      } catch (err) {
        result.errors.push(
          `Error processing ${adapter.sourceUrl(record)}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    await supabase
      .from("sync_runs")
      .update({
        status: result.errors.length > 0 ? "completed_with_errors" : "completed",
        completed_at: new Date().toISOString(),
        records_created: result.created,
        records_updated: result.updated,
        records_unchanged: result.unchanged,
        error: result.errors.length > 0 ? result.errors.join("\n") : null,
      })
      .eq("id", syncRun.id);
  } catch (err) {
    await supabase
      .from("sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", syncRun.id);

    throw err;
  }

  return result;
}

async function store(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceId: string,
  normalized: NormalizedAudit,
  sourceUrl: string,
  result: SyncResult
): Promise<void> {
  const contentHash = hashContent(normalized.normalizedContent);

  // Find or create project.
  const projectSlug = normalized.projectSlug;
  let projectId: string | null = null;

  const { data: existingProject } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", projectSlug)
    .single();

  if (existingProject) {
    projectId = existingProject.id;
  } else {
    const { data: newProject } = await supabase
      .from("projects")
      .insert({
        name: normalized.projectName,
        slug: projectSlug,
        chain: normalized.chain,
        repository_url: normalized.repositoryUrl,
      })
      .select("id")
      .single();
    projectId = newProject?.id ?? null;
  }

  // Check if audit already exists for this source + source_url.
  const { data: existingAudit } = await supabase
    .from("audits")
    .select("id, content_hash, version")
    .eq("source_id", sourceId)
    .eq("source_url", sourceUrl)
    .single();

  let auditId: string;
  let newVersion: number;

  if (existingAudit) {
    auditId = existingAudit.id;

    if (existingAudit.content_hash === contentHash) {
      result.unchanged++;
      return;
    }

    newVersion = existingAudit.version + 1;

    await supabase
      .from("audits")
      .update({
        title: normalized.title,
        project_id: projectId,
        auditor: normalized.auditor,
        audit_date: normalized.auditDate,
        report_url: normalized.reportUrl,
        content_hash: contentHash,
        version: newVersion,
      })
      .eq("id", auditId);

    result.updated++;
  } else {
    newVersion = 1;

    const { data: newAudit } = await supabase
      .from("audits")
      .insert({
        source_id: sourceId,
        project_id: projectId,
        title: normalized.title,
        auditor: normalized.auditor,
        audit_date: normalized.auditDate,
        report_url: normalized.reportUrl,
        source_url: sourceUrl,
        content_hash: contentHash,
        version: newVersion,
      })
      .select("id")
      .single();

    auditId = newAudit!.id;
    result.created++;
  }

  // Insert version record.
  await supabase.from("audit_versions").insert({
    audit_id: auditId,
    version: newVersion,
    content_hash: contentHash,
    normalized_content: normalized.normalizedContent,
  });

  // Upsert findings.
  for (const finding of normalized.findings) {
    await supabase.from("findings").upsert(
      {
        audit_id: auditId,
        external_id: finding.externalId,
        title: finding.title,
        severity: finding.severity,
        category: finding.category,
      },
      { onConflict: "audit_id,external_id" }
    );
  }
}
