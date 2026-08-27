import type {
  AuditSourceAdapter,
  RawRecord,
  RawContent,
  ParsedAudit,
  NormalizedAudit,
  ValidationResult,
} from "./types";

const REPO_OWNER = "immunefi-team";
const REPO_NAME = "Past-Audit-Competitions";
const TREES_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/main`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

interface ImmunefiFile {
  protocol: string;
  findingPath: string;
  findingId: string;
  title: string;
}

interface ImmunefiMarkdown {
  findingId: string;
  protocol: string;
  title: string;
  reportType: string;
  severity: string;
  target: string;
  rawMarkdown: string;
}

interface ImmunefiRawContent {
  protocol: string;
  findingPath: string;
  findingId: string;
  title: string;
  rawMarkdown: string;
}

export class ImmunefiAdapter implements AuditSourceAdapter {
  private allowedDomains = ["github.com", "raw.githubusercontent.com", "immunefi.com"];

  async discover(): Promise<RawRecord[]> {
    const res = await fetch(`${TREES_API}?recursive=1`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "VeylithRead/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub Trees API returned ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as { tree: { path: string; type: string }[] };

    const findings: ImmunefiFile[] = [];

    for (const item of data.tree) {
      if (item.type !== "blob" || !item.path.endsWith(".md")) continue;
      if (item.path === "README.md" || item.path === "SUMMARY.md") continue;
      if (item.path.includes("package.json") || item.path.includes("package-lock.json")) continue;

      const parsed = parseFindingPath(item.path);
      if (parsed) {
        findings.push(parsed);
      }
    }

    return findings.map((f) => ({
      id: f.findingPath,
      data: f,
    }));
  }

  async fetch(record: RawRecord): Promise<RawContent> {
    const file = record.data as ImmunefiFile;
    const encodedPath = encodeURI(file.findingPath);

    const res = await fetch(`${RAW_BASE}/${encodedPath}`, {
      headers: {
        Accept: "text/plain",
        "User-Agent": "VeylithRead/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${file.findingPath}: ${res.status}`);
    }

    const markdown = await res.text();

    return {
      ...file,
      rawMarkdown: markdown,
    };
  }

  parse(content: RawContent): ParsedAudit {
    const raw = content as ImmunefiRawContent;
    const headers = parseMarkdownHeaders(raw.rawMarkdown);

    return {
      title: headers.title || raw.title,
      clientName: raw.protocol,
      auditDate: headers.submittedDate ?? null,
      reportUrl: `${RAW_BASE}/${encodeURI(raw.findingPath)}`,
      sourceUrl: `${RAW_BASE}/${encodeURI(raw.findingPath)}`,
      auditor: "Immunefi",
      chain: "",
      platforms: [],
      languages: [],
      labels: [headers.reportType, headers.severity].filter(Boolean),
      repositoryUrl: headers.target ?? null,
      findings: [
        {
          externalId: `immunefi-${raw.findingId}`,
          title: headers.title || raw.title,
          severity: headers.severity,
          status: "submitted",
        },
      ],
    };
  }

  normalize(parsed: ParsedAudit): NormalizedAudit {
    const projectSlug = slugify(parsed.clientName);

    return {
      title: parsed.title,
      projectSlug,
      projectName: parsed.clientName,
      chain: parsed.chain,
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
    const file = record.data as ImmunefiFile;
    return `${RAW_BASE}/${encodeURI(file.findingPath)}`;
  }
}

function parseFindingPath(path: string): ImmunefiFile | null {
  const parts = path.split("/");
  if (parts.length < 2) return null;

  const protocol = parts.slice(0, -1).join("/");
  const filename = parts[parts.length - 1];

  const idMatch = filename.match(/^(\d+)\s*-/);
  if (!idMatch) return null;

  const findingId = idMatch[1];

  const severityMatch = filename.match(/\[SC\s*-\s*(\w+)\]/);
  const severity = severityMatch ? severityMatch[1] : "Unknown";

  const titleMatch = filename.match(/\]\s*(.+?)\.(?:md)$/);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/, "");

  return {
    protocol,
    findingPath: path,
    findingId,
    title: `${findingId} - [SC - ${severity}] ${title}`,
  };
}

function parseMarkdownHeaders(markdown: string): {
  title: string;
  reportType: string;
  severity: string;
  target: string;
  submittedDate: string | null;
} {
  const lines = markdown.split("\n");

  let title = "";
  let reportType = "";
  let severity = "";
  let target = "";
  let submittedDate: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("# ") && !title) {
      title = trimmed.slice(2).trim();
    }

    if (trimmed.toLowerCase().startsWith("submitted on")) {
      const dateMatch = trimmed.match(/Submitted on\s+(.+?)\s+UTC/i);
      if (dateMatch) {
        const cleaned = dateMatch[1]
          .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
          .replace(/\s+at\s+/, " ");
        const parsed = new Date(cleaned + " UTC");
        if (!isNaN(parsed.getTime())) {
          submittedDate = parsed.toISOString().split("T")[0];
        }
      }
    }

    if (trimmed.toLowerCase().startsWith("report type:")) {
      reportType = trimmed.split(":").slice(1).join(":").trim();
    }

    if (trimmed.toLowerCase().startsWith("report severity:")) {
      severity = trimmed.split(":").slice(1).join(":").trim();
    }

    if (trimmed.toLowerCase().startsWith("target:")) {
      target = trimmed.split(":").slice(1).join(":").trim();
    }
  }

  return { title, reportType, severity, target, submittedDate };
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
  INSIGHT: "informational",
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
    `labels: ${parsed.labels.join(", ")}`,
    `total_findings: ${parsed.findings.length}`,
    "",
    "Findings:",
  ];

  for (const f of parsed.findings) {
    parts.push(`- [${f.severity}] ${f.title}`);
  }

  return parts.join("\n");
}
