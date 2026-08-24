import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface VulnDoc {
  slug: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  protocol: string;
  chain: string;
  category: string;
  date: string;
  source_url: string;
  tags: string[];
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content", "vulns");

export function getAllVulnSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    return [];
  }
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  return files.map((f) => f.replace(/\.mdx$/, ""));
}

export function getVulnBySlug(slug: string): VulnDoc | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title,
    severity: data.severity,
    protocol: data.protocol,
    chain: data.chain,
    category: data.category,
    date: data.date,
    source_url: data.source_url,
    tags: data.tags || [],
    content,
  };
}

export function getAllVulns(): VulnDoc[] {
  const slugs = getAllVulnSlugs();
  return slugs
    .map((slug) => getVulnBySlug(slug))
    .filter((doc): doc is VulnDoc => doc !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface FilterParams {
  severity?: string;
  category?: string;
  chain?: string;
  protocol?: string;
}

export function filterVulns(vulns: VulnDoc[], filters: FilterParams): VulnDoc[] {
  return vulns.filter((v) => {
    if (filters.severity && v.severity !== filters.severity) return false;
    if (filters.category && v.category !== filters.category) return false;
    if (filters.chain && v.chain !== filters.chain) return false;
    if (filters.protocol && v.protocol !== filters.protocol) return false;
    return true;
  });
}

export function getAllSeverityCounts(vulns: VulnDoc[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of vulns) {
    counts[v.severity] = (counts[v.severity] || 0) + 1;
  }
  return counts;
}
