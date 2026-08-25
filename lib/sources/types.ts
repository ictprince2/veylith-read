export interface RawRecord {
  /** Stable identifier from the source — used as external_id. */
  id: string;
  /** The source's own data, passed through to fetch(). */
  data: unknown;
}

export type RawContent = unknown;

export interface ParsedAudit {
  title: string;
  clientName: string;
  auditDate: string | null;
  reportUrl: string | null;
  sourceUrl: string;
  auditor: string;
  platforms: string[];
  languages: string[];
  labels: string[];
  repositoryUrl: string | null;
  findings: ParsedFinding[];
}

export interface ParsedFinding {
  externalId: string;
  title: string;
  severity: string;
  status: string;
}

export interface NormalizedAudit {
  title: string;
  projectSlug: string;
  projectName: string;
  chain: string;
  auditor: string;
  auditDate: string | null;
  reportUrl: string | null;
  sourceUrl: string;
  repositoryUrl: string | null;
  findings: NormalizedFinding[];
  /** Normalized text used for content hashing. */
  normalizedContent: string;
}

export interface NormalizedFinding {
  externalId: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  category: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface AuditSourceAdapter {
  discover(): Promise<RawRecord[]>;
  fetch(record: RawRecord): Promise<RawContent>;
  parse(content: RawContent): ParsedAudit;
  normalize(parsed: ParsedAudit): NormalizedAudit;
  validate(normalized: NormalizedAudit): ValidationResult;
  sourceUrl(record: RawRecord): string;
}
