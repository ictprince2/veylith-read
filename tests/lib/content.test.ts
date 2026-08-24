import { describe, it, expect } from "vitest";
import {
  getAllVulnSlugs,
  getVulnBySlug,
  getAllVulns,
  filterVulns,
} from "@/lib/content";

describe("content lib", () => {
  describe("getAllVulnSlugs", () => {
    it("returns an array of strings", () => {
      const slugs = getAllVulnSlugs();
      expect(Array.isArray(slugs)).toBe(true);
      slugs.forEach((slug) => {
        expect(typeof slug).toBe("string");
      });
    });

    it("excludes non-mdx files", () => {
      const slugs = getAllVulnSlugs();
      slugs.forEach((slug) => {
        expect(slug).not.toContain(".");
      });
    });
  });

  describe("getVulnBySlug", () => {
    it("returns null for non-existent slug", () => {
      const doc = getVulnBySlug("non-existent-slug-xyz");
      expect(doc).toBeNull();
    });

    it("returns a valid doc for existing slug", () => {
      const slugs = getAllVulnSlugs();
      if (slugs.length === 0) return;

      const doc = getVulnBySlug(slugs[0]);
      expect(doc).not.toBeNull();
      expect(doc).toHaveProperty("slug", slugs[0]);
      expect(doc).toHaveProperty("title");
      expect(doc).toHaveProperty("severity");
      expect(doc).toHaveProperty("protocol");
      expect(doc).toHaveProperty("chain");
      expect(doc).toHaveProperty("category");
      expect(doc).toHaveProperty("date");
      expect(doc).toHaveProperty("source_url");
      expect(doc).toHaveProperty("tags");
      expect(doc).toHaveProperty("content");
    });

    it("returns severity as a valid enum value", () => {
      const slugs = getAllVulnSlugs();
      if (slugs.length === 0) return;

      const doc = getVulnBySlug(slugs[0]);
      expect(doc).not.toBeNull();
      const validSeverities = [
        "critical",
        "high",
        "medium",
        "low",
        "informational",
      ];
      expect(validSeverities).toContain(doc!.severity);
    });
  });

  describe("getAllVulns", () => {
    it("returns docs sorted by date descending", () => {
      const vulns = getAllVulns();
      for (let i = 1; i < vulns.length; i++) {
        const prev = new Date(vulns[i - 1].date).getTime();
        const curr = new Date(vulns[i].date).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe("filterVulns", () => {
    it("filters by severity", () => {
      const vulns = getAllVulns();
      const filtered = filterVulns(vulns, { severity: "critical" });
      filtered.forEach((v) => {
        expect(v.severity).toBe("critical");
      });
    });

    it("filters by chain", () => {
      const vulns = getAllVulns();
      const filtered = filterVulns(vulns, { chain: "Ethereum" });
      filtered.forEach((v) => {
        expect(v.chain).toBe("Ethereum");
      });
    });

    it("filters by multiple criteria", () => {
      const vulns = getAllVulns();
      const filtered = filterVulns(vulns, {
        severity: "critical",
        chain: "Ethereum",
      });
      filtered.forEach((v) => {
        expect(v.severity).toBe("critical");
        expect(v.chain).toBe("Ethereum");
      });
    });

    it("returns all when no filters applied", () => {
      const vulns = getAllVulns();
      const filtered = filterVulns(vulns, {});
      expect(filtered.length).toBe(vulns.length);
    });
  });
});
