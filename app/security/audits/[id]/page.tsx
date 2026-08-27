import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { SeverityBadge } from "@/components/SeverityBadge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: audit } = await supabase
    .from("audits")
    .select("title, projects ( name )")
    .eq("id", id)
    .single();

  if (!audit) return { title: "Not Found" };
  // Supabase returns FK relations as arrays; extract single object
  const projects = audit.projects as unknown as { name: string }[] | null;
  const projMeta = projects?.[0] ?? null;
  return {
    title: `${audit.title} — Veylith Read`,
    description: `Security audit findings for ${projMeta?.name || "unknown project"}: ${audit.title}`,
  };
}

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audits")
    .select(
      `
      id, title, auditor, audit_date, report_url, source_url, created_at,
      projects ( id, name, slug, chain, repository_url ),
      sources ( name )
    `
    )
    .eq("id", id)
    .single();

  if (!audit) {
    notFound();
  }

  const { data: findings } = await supabase
    .from("findings")
    .select("id, title, severity, category, description, source_url")
    .eq("audit_id", id)
    .order("severity");

  // Supabase returns FK relations as arrays; extract single objects
  const projectsArr = audit.projects as unknown as {
    id: string;
    name: string;
    slug: string;
    chain: string;
    repository_url: string | null;
  }[] | null;
  const proj = projectsArr?.[0] ?? null;
  const sourcesArr = audit.sources as unknown as { name: string }[] | null;
  const src = sourcesArr?.[0] ?? null;

  const severityOrder = ["critical", "high", "medium", "low", "informational"];
  const sortedFindings = (findings || []).sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  return (
    <>
      <Header />
      <main className="flex-1 px-6 py-12">
        <article className="mx-auto max-w-[72ch]">
          <header className="mb-8 border-b border-zinc-800 pb-6">
            <div className="mb-4 flex items-center gap-3">
              {sortedFindings.length > 0 && (
                <SeverityBadge
                  severity={
                    sortedFindings[
                      sortedFindings.findIndex(
                        (f) =>
                          f.severity ===
                          sortedFindings
                            .map((x) => x.severity)
                            .reduce((a, b) =>
                              severityOrder.indexOf(a) < severityOrder.indexOf(b)
                                ? a
                                : b
                            )
                      )
                    ]?.severity || "informational"
                  }
                />
              )}
              {audit.audit_date && (
                <time className="font-mono text-xs text-zinc-500">
                  {new Date(audit.audit_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              )}
            </div>
            <h1 className="mb-4 font-serif text-3xl font-bold tracking-tight text-zinc-100">
              {audit.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm text-zinc-500">
              {proj && (
                <>
                  <span>
                    <span className="text-zinc-700">Project:</span>{" "}
                    <Link
                      href={`/security/projects/${proj.slug}`}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      {proj.name}
                    </Link>
                  </span>
                  {proj.chain && (
                    <span>
                      <span className="text-zinc-700">Chain:</span> {proj.chain}
                    </span>
                  )}
                </>
              )}
              {audit.auditor && (
                <span>
                  <span className="text-zinc-700">Auditor:</span> {audit.auditor}
                </span>
              )}
              {src && (
                <span>
                  <span className="text-zinc-700">Source:</span> {src.name}
                </span>
              )}
            </div>
          </header>

          {/* Source attribution */}
          <div className="mb-8 rounded-sm border border-zinc-800 bg-zinc-900/50 p-4 font-mono text-xs text-zinc-500">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                <span className="text-zinc-700">Original report:</span>{" "}
                <a
                  href={audit.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 underline decoration-zinc-700 underline-offset-2 hover:text-zinc-200"
                >
                  {audit.source_url}
                </a>
              </span>
              {audit.report_url && audit.report_url !== audit.source_url && (
                <span>
                  <span className="text-zinc-700">Audit report:</span>{" "}
                  <a
                    href={audit.report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 underline decoration-zinc-700 underline-offset-2 hover:text-zinc-200"
                  >
                    {audit.report_url}
                  </a>
                </span>
              )}
              {proj?.repository_url && (
                <span>
                  <span className="text-zinc-700">Repository:</span>{" "}
                  <a
                    href={proj.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 underline decoration-zinc-700 underline-offset-2 hover:text-zinc-200"
                  >
                    {proj.repository_url}
                  </a>
                </span>
              )}
            </div>
          </div>

          {/* Findings */}
          {sortedFindings.length > 0 ? (
            <section>
              <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Findings ({sortedFindings.length})
              </h2>
              <div className="space-y-4">
                {sortedFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="border border-zinc-800 bg-zinc-900/50 p-5"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <SeverityBadge severity={finding.severity} />
                      {finding.category && (
                        <span className="font-mono text-xs text-zinc-500">
                          {finding.category}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-2 font-serif text-lg font-semibold text-zinc-100">
                      {finding.title}
                    </h3>
                    {finding.description && (
                      <p className="text-sm leading-relaxed text-zinc-400">
                        {finding.description}
                      </p>
                    )}
                    {finding.source_url && (
                      <div className="mt-3">
                        <a
                          href={finding.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-zinc-500 underline decoration-zinc-700 underline-offset-2 hover:text-zinc-300"
                        >
                          Source
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <p className="font-mono text-sm text-zinc-600">
              No findings recorded for this audit.
            </p>
          )}
        </article>
      </main>
    </>
  );
}
