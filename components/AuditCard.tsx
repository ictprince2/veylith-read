import Link from "next/link";
import { SeverityBadge } from "./SeverityBadge";

interface Finding {
  id: string;
  title: string;
  severity: string;
  category: string;
}

interface AuditCardProps {
  audit: {
    id: string;
    title: string;
    auditor: string;
    audit_date: string | null;
    report_url: string | null;
    source_url: string;
    projects: { name: string; chain: string } | null;
    sources: { name: string } | null;
    findings: Finding[];
  };
}

function getHighestSeverity(findings: Finding[]): string {
  const order = ["critical", "high", "medium", "low", "informational"];
  for (const sev of order) {
    if (findings.some((f) => f.severity === sev)) return sev;
  }
  return "informational";
}

function getSeverityCounts(findings: Finding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }
  return counts;
}

export function AuditCard({ audit }: AuditCardProps) {
  const projectName = audit.projects?.name || "Unknown";
  const chain = audit.projects?.chain || "";
  const sourceName = audit.sources?.name || "";
  const highest = getHighestSeverity(audit.findings);
  const counts = getSeverityCounts(audit.findings);

  return (
    <Link
      href={`/security/audits/${audit.id}`}
      className="group block border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <SeverityBadge severity={highest} />
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
      <h3 className="mb-2 font-serif text-lg font-semibold text-zinc-100 group-hover:text-white">
        {audit.title}
      </h3>
      <div className="mb-3 flex flex-wrap gap-2 text-xs font-mono text-zinc-500">
        <span>{projectName}</span>
        {chain && (
          <>
            <span className="text-zinc-700">/</span>
            <span>{chain}</span>
          </>
        )}
        {sourceName && (
          <>
            <span className="text-zinc-700">/</span>
            <span>{sourceName}</span>
          </>
        )}
      </div>
      {audit.findings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(counts)
            .sort(
              (a, b) =>
                ["critical", "high", "medium", "low", "informational"].indexOf(
                  a[0]
                ) -
                ["critical", "high", "medium", "low", "informational"].indexOf(
                  b[0]
                )
            )
            .map(([sev, count]) => (
              <span
                key={sev}
                className="rounded-sm bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-400"
              >
                {count} {sev}
              </span>
            ))}
        </div>
      )}
    </Link>
  );
}
