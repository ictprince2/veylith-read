import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImmunefiAdapter } from "@/lib/sources/immunefi";

const mockTreeResponse = {
  tree: [
    { path: "README.md", type: "blob" },
    { path: "SUMMARY.md", type: "blob" },
    { path: "package.json", type: "blob" },
    {
      path: "Alchemix/30634 - [SC - Critical] Unauthorized minting of unlimited FLUX in  tran....md",
      type: "blob",
    },
    {
      path: "Alchemix/30555 - [SC - Low] Precision loss when calculating the FLUX amount....md",
      type: "blob",
    },
    {
      path: "DeGate/25882 - [SC - Insight] Freezing of funds from the Default Deposit Cont....md",
      type: "blob",
    },
    { path: "Alchemix/README.md", type: "blob" },
  ],
};

const mockFindingMarkdown = `# Unauthorized minting of unlimited FLUX in 1 transaction

Submitted on May 2nd 2024 at 16:22:35 UTC by @infosec_us_team for [Boost | Alchemix](https://immunefi.com/bounty/alchemix-boost/)

Report ID: #30634

Report type: Smart Contract

Report severity: Critical

Target: https://github.com/alchemix-finance/alchemix-v2-dao/blob/main/src/Voter.sol

Impacts:
- Direct theft of any user funds, whether at-rest or in-motion, other than unclaimed yield

## Description
The absence of the onlyNewEpoch modifier allows anyone to call poke multiple times.`;

const mockInsightMarkdown = `# Freezing of funds from the Default Deposit Contract

Submitted on Nov 20th 2023 at 22:25:24 UTC by @infosec_us_team for [Boost | DeGate](https://immunefi.com/bounty/boosteddegatebugbounty/)

Report ID: #25882

Report type: Smart Contract

Report severity: Insight

Target: https://etherscan.io/address/0x9C07A72177c5A05410cA338823e790876E79D73B#code

Impacts:
* Permanent freezing of funds from the Default Deposit Contract

## Description
DeGate's guarantee self custody of their assets with the Exodus Mode.`;

function mockFetch(url: string): Promise<Response> {
  const urlStr = url.toString();

  if (urlStr.includes("git/trees/main")) {
    return Promise.resolve(new Response(JSON.stringify(mockTreeResponse), { status: 200 }));
  }

  if (urlStr.includes("raw.githubusercontent.com") && urlStr.includes("Alchemix") && urlStr.includes("30634")) {
    return Promise.resolve(new Response(mockFindingMarkdown, { status: 200 }));
  }

  if (urlStr.includes("raw.githubusercontent.com") && urlStr.includes("DeGate")) {
    return Promise.resolve(new Response(mockInsightMarkdown, { status: 200 }));
  }

  if (urlStr.includes("raw.githubusercontent.com")) {
    return Promise.resolve(new Response(mockFindingMarkdown, { status: 200 }));
  }

  return Promise.resolve(new Response("Not found", { status: 404 }));
}

describe("ImmunefiAdapter", () => {
  let adapter: ImmunefiAdapter;

  beforeEach(() => {
    adapter = new ImmunefiAdapter();
    vi.stubGlobal("fetch", vi.fn(mockFetch));
  });

  describe("discover", () => {
    it("returns only finding markdown files, excluding README/SUMMARY/package files", async () => {
      const records = await adapter.discover();

      const paths = records.map((r) => (r.data as { findingPath: string }).findingPath);
      expect(paths).toEqual([
        "Alchemix/30634 - [SC - Critical] Unauthorized minting of unlimited FLUX in  tran....md",
        "Alchemix/30555 - [SC - Low] Precision loss when calculating the FLUX amount....md",
        "DeGate/25882 - [SC - Insight] Freezing of funds from the Default Deposit Cont....md",
      ]);
    });

    it("uses stable IDs based on file paths", async () => {
      const records = await adapter.discover();
      expect(records[0].id).toBe(
        "Alchemix/30634 - [SC - Critical] Unauthorized minting of unlimited FLUX in  tran....md"
      );
    });

    it("throws on GitHub API error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("rate limited", { status: 403 })));
      await expect(adapter.discover()).rejects.toThrow("GitHub Trees API returned 403");
    });
  });

  describe("fetch", () => {
    it("returns markdown content with metadata", async () => {
      const records = await adapter.discover();
      const content = await adapter.fetch(records[0]);

      expect(content).toHaveProperty("rawMarkdown");
      expect(content).toHaveProperty("findingPath");
      expect(content).toHaveProperty("protocol", "Alchemix");
      expect(content).toHaveProperty("findingId", "30634");
    });

    it("throws on fetch failure", async () => {
      const originalFetch = global.fetch;
      let callCount = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string | URL) => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve(new Response(JSON.stringify(mockTreeResponse), { status: 200 }));
          }
          return Promise.resolve(new Response("not found", { status: 404 }));
        })
      );
      const records = await adapter.discover();
      await expect(adapter.fetch(records[0])).rejects.toThrow("Failed to fetch");
      vi.stubGlobal("fetch", originalFetch);
    });
  });

  describe("parse", () => {
    it("extracts metadata from markdown headers", async () => {
      const records = await adapter.discover();
      const content = await adapter.fetch(records[0]);
      const parsed = adapter.parse(content);

      expect(parsed.title).toBe("Unauthorized minting of unlimited FLUX in 1 transaction");
      expect(parsed.clientName).toBe("Alchemix");
      expect(parsed.auditDate).toBe("2024-05-02");
      expect(parsed.auditor).toBe("Immunefi");
      expect(parsed.findings).toHaveLength(1);
      expect(parsed.findings[0].externalId).toBe("immunefi-30634");
      expect(parsed.findings[0].severity).toBe("Critical");
    });

    it("handles Insight severity", async () => {
      const records = await adapter.discover();
      const content = await adapter.fetch(records[2]);
      const parsed = adapter.parse(content);

      expect(parsed.title).toBe("Freezing of funds from the Default Deposit Contract");
      expect(parsed.clientName).toBe("DeGate");
      expect(parsed.findings[0].severity).toBe("Insight");
    });

    it("sets target as repositoryUrl", async () => {
      const records = await adapter.discover();
      const content = await adapter.fetch(records[0]);
      const parsed = adapter.parse(content);

      expect(parsed.repositoryUrl).toBe(
        "https://github.com/alchemix-finance/alchemix-v2-dao/blob/main/src/Voter.sol"
      );
    });
  });

  describe("normalize", () => {
    it("maps severity to canonical values", async () => {
      const records = await adapter.discover();
      const content = await adapter.fetch(records[0]);
      const parsed = adapter.parse(content);
      const normalized = adapter.normalize(parsed);

      expect(normalized.findings[0].severity).toBe("critical");
      expect(normalized.projectSlug).toBe("alchemix");
      expect(normalized.auditor).toBe("Immunefi");
    });

    it("maps Insight to informational", async () => {
      const records = await adapter.discover();
      const content = await adapter.fetch(records[2]);
      const parsed = adapter.parse(content);
      const normalized = adapter.normalize(parsed);

      expect(normalized.findings[0].severity).toBe("informational");
    });
  });

  describe("validate", () => {
    it("passes for valid normalized audit", async () => {
      const records = await adapter.discover();
      const content = await adapter.fetch(records[0]);
      const parsed = adapter.parse(content);
      const normalized = adapter.normalize(parsed);
      const result = adapter.validate(normalized);

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails when title is missing", async () => {
      const records = await adapter.discover();
      const content = await adapter.fetch(records[0]);
      const parsed = adapter.parse(content);
      const normalized = adapter.normalize(parsed);
      normalized.title = "";
      const result = adapter.validate(normalized);

      expect(result.ok).toBe(false);
      expect(result.errors).toContain("title is required");
    });

    it("fails when sourceUrl is not in allowlist", async () => {
      const records = await adapter.discover();
      const content = await adapter.fetch(records[0]);
      const parsed = adapter.parse(content);
      const normalized = adapter.normalize(parsed);
      normalized.sourceUrl = "https://evil.com/hack.md";
      const result = adapter.validate(normalized);

      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("allowlist"))).toBe(true);
    });
  });

  describe("sourceUrl", () => {
    it("returns the raw GitHub URL for the finding", async () => {
      const records = await adapter.discover();
      const url = adapter.sourceUrl(records[0]);

      expect(url).toContain("raw.githubusercontent.com");
      expect(url).toContain("Alchemix");
      expect(url).toContain("30634");
    });
  });

  describe("full pipeline", () => {
    it("runs all 6 stages end-to-end for multiple findings", async () => {
      const records = await adapter.discover();
      expect(records.length).toBeGreaterThan(0);

      for (const record of records.slice(0, 3)) {
        const content = await adapter.fetch(record);
        const parsed = adapter.parse(content);
        const normalized = adapter.normalize(parsed);
        const validation = adapter.validate(normalized);

        expect(validation.ok).toBe(true);
        expect(normalized.title).toBeTruthy();
        expect(normalized.projectSlug).toBeTruthy();
        expect(normalized.findings.length).toBeGreaterThan(0);
      }
    });
  });
});
