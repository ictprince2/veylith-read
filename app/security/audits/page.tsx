import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { AuditCard } from "@/components/AuditCard";
import { AuditFilterBar } from "@/components/AuditFilterBar";

export const metadata = {
  title: "Security Audits — Veylith Read",
  description:
    "Browse security audit reports and findings from public sources.",
};

export default function SecurityAuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  return (
    <Suspense fallback={<AuditsPageSkeleton />}>
      <AuditsPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function AuditsPageInner({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const severityFilter = params.severity || "";
  const chainFilter = params.chain || "";
  const sourceFilter = params.source || "";
  const searchQuery = params.q || "";

  // Fetch audits with project + source joins
  let query = supabase
    .from("audits")
    .select(
      `
      id, title, auditor, audit_date, report_url, source_url,
      projects ( name, chain ),
      sources ( name )
    `
    )
    .order("audit_date", { ascending: false, nullsFirst: false });

  if (chainFilter) {
    query = query.eq("projects.chain", chainFilter);
  }
  if (sourceFilter) {
    query = query.eq("sources.name", sourceFilter);
  }
  if (searchQuery) {
    query = query.ilike("title", `%${searchQuery}%`);
  }

  const { data: audits, error } = await query;

  if (error) {
    console.error("Failed to fetch audits:", error);
  }

  const auditList = audits || [];

  // Fetch findings for these audits to compute severity counts and apply severity filter
  const auditIds = auditList.map((a: { id: string }) => a.id);
  let findingsMap: Record<string, { id: string; title: string; severity: string; category: string }[]> = {};

  if (auditIds.length > 0) {
    const { data: findings } = await supabase
      .from("findings")
      .select("id, audit_id, title, severity, category")
      .in("audit_id", auditIds);

    if (findings) {
      for (const f of findings) {
        if (!findingsMap[f.audit_id]) findingsMap[f.audit_id] = [];
        findingsMap[f.audit_id].push(f);
      }
    }
  }

  // Build typed audit list with findings attached
  type AuditRow = {
    id: string;
    title: string;
    auditor: string;
    audit_date: string | null;
    report_url: string | null;
    source_url: string;
    projects: { name: string; chain: string } | null;
    sources: { name: string } | null;
    findings: { id: string; title: string; severity: string; category: string }[];
  };

  const auditsWithFindings: AuditRow[] = auditList.map((audit: Record<string, unknown>) => {
    const projArr = audit.projects as { name: string; chain: string }[] | null;
    const srcArr = audit.sources as { name: string }[] | null;
    return {
      id: audit.id as string,
      title: audit.title as string,
      auditor: audit.auditor as string,
      audit_date: audit.audit_date as string | null,
      report_url: audit.report_url as string | null,
      source_url: audit.source_url as string,
      projects: projArr?.[0] ?? null,
      sources: srcArr?.[0] ?? null,
      findings: findingsMap[audit.id as string] || [],
    };
  });

  // Apply severity filter
  const filteredAudits = severityFilter
    ? auditsWithFindings.filter((a) =>
        a.findings.some((f) => f.severity === severityFilter)
      )
    : auditsWithFindings;

  // Collect distinct filter options from all audits (before severity filtering)
  const allChains = new Set<string>();
  const allSources = new Set<string>();
  for (const audit of auditsWithFindings) {
    if (audit.projects?.chain) allChains.add(audit.projects.chain);
    if (audit.sources?.name) allSources.add(audit.sources.name);
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6">
            <h1 className="mb-1 font-serif text-2xl font-bold tracking-tight text-zinc-100">
              Security Audits
            </h1>
            <p className="font-mono text-xs text-zinc-500">
              {filteredAudits.length}{" "}
              {filteredAudits.length === 1 ? "audit" : "audits"}
            </p>
          </div>

          <AuditFilterBar
            chains={[...allChains].sort()}
            sources={[...allSources].sort()}
            activeFilters={{
              severity: severityFilter,
              chain: chainFilter,
              source: sourceFilter,
              q: searchQuery,
            }}
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAudits.map((audit) => (
                <AuditCard key={audit.id} audit={audit} />
            ))}
          </div>

          {filteredAudits.length === 0 && (
            <div className="mt-12 text-center">
              <p className="font-mono text-sm text-zinc-600">
                No audits match the selected filters.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function AuditsPageSkeleton() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6">
            <h1 className="mb-1 font-serif text-2xl font-bold tracking-tight text-zinc-100">
              Security Audits
            </h1>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded bg-zinc-900" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
