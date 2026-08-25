import type {
  AuditSourceAdapter,
  RawRecord,
  RawContent,
  ParsedAudit,
  NormalizedAudit,
  ValidationResult,
} from "./types";

const API_URL = "https://hacken.io/api/audits";

interface HackenAudit {
  audit_name: string;
  client_name: string;
  audit_date: string | null;
  report_link: string | null;
  platforms: string[];
  languages: string[];
  labels: string[];
  scope_parameters?: { repository?: string };
  issues?: { severity: string; name: string; status: string }[];
  audit_description?: string;
}

export class HackenAdapter implements AuditSourceAdapter {
  private allowedDomains = ["hacken.io"];

  async discover(): Promise<RawRecord[]> {
    const res = await fetch(API_URL, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Hacken API returned ${res.status}: ${res.statusText}`);
    }

    const audits: HackenAudit[] = await res.json();

    return audits.map((audit, index) => ({
      id: audit.report_link ?? `hacken-${index}`,
      data: audit,
    }));
  }

  async fetch(record: RawRecord): Promise<RawContent> {
    // Hacken API returns all data in the list endpoint — no secondary fetch needed.
    return record.data;
  }

  parse(content: RawContent): ParsedAudit {
    const audit = content as HackenAudit;

    return {
      title: audit.audit_name,
      clientName: audit.client_name,
      auditDate: audit.audit_date?.split("T")[0] ?? null,
      reportUrl: audit.report_link,
      sourceUrl: audit.report_link ?? API_URL,
      auditor: "Hacken",
      platforms: audit.platforms ?? [],
      languages: audit.languages ?? [],
      labels: audit.labels ?? [],
      repositoryUrl: audit.scope_parameters?.repository ?? null,
      findings: (audit.issues ?? []).map((issue, i) => ({
        externalId: `${audit.audit_name}-finding-${i}`,
        title: issue.name,
        severity: issue.severity,
        status: issue.status,
      })),
    };
  }

  normalize(parsed: ParsedAudit): NormalizedAudit {
    const projectSlug = slugify(parsed.clientName);
    const chain = parsed.platforms[0] ?? "";

    return {
      title: parsed.title,
      projectSlug,
      projectName: parsed.clientName,
      chain,
      auditor: parsed.auditor,
      auditDate: parsed.auditDate,
      reportUrl: parsed.reportUrl,
      sourceUrl: parsed.sourceUrl,
      repositoryUrl: parsed.repositoryUrl,
      findings: parsed.findings.map((f) => ({
        externalId: f.externalId,
        title: f.title,
        severity: mapSeverity(f.severity),
        category: "",
      })),
      normalizedContent: buildNormalizedContent(parsed),
    };
  }

  validate(normalized: NormalizedAudit): ValidationResult {
    const errors: string[] = [];

    if (!normalized.title) errors.push("title is required");
    if (!normalized.projectSlug) errors.push("projectSlug is required");
    if (!normalized.sourceUrl) errors.push("sourceUrl is required");

    const url = normalized.sourceUrl;
    if (url) {
      try {
        const host = new URL(url).hostname;
        if (!this.allowedDomains.some((d) => host === d || host.endsWith(`.${d}`))) {
          errors.push(`sourceUrl domain not in allowlist: ${host}`);
        }
      } catch {
        errors.push(`sourceUrl is not a valid URL: ${url}`);
      }
    }

    return { ok: errors.length === 0, errors };
  }

  sourceUrl(record: RawRecord): string {
    const audit = record.data as HackenAudit;
    return audit.report_link ?? API_URL;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const SEVERITY_MAP: Record<string, NormalizedAudit["findings"][0]["severity"]> = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  OBSERVATION: "informational",
  INFORMATIONAL: "informational",
};

function mapSeverity(severity: string): NormalizedAudit["findings"][0]["severity"] {
  return SEVERITY_MAP[severity.toUpperCase()] ?? "informational";
}

function buildNormalizedContent(parsed: ParsedAudit): string {
  const parts = [
    `title: ${parsed.title}`,
    `client: ${parsed.clientName}`,
    `date: ${parsed.auditDate ?? "unknown"}`,
    `auditor: ${parsed.auditor}`,
    `platforms: ${parsed.platforms.join(", ")}`,
    `languages: ${parsed.languages.join(", ")}`,
    "",
    "Findings:",
  ];

  for (const f of parsed.findings) {
    parts.push(`- [${f.severity}] ${f.title} (${f.status})`);
  }

  return parts.join("\n");
}
