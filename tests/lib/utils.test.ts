import { describe, it, expect } from "vitest";
import { cn, formatDate, SEVERITY_COLORS, SEVERITY_ORDER } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("joins class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("filters falsy values", () => {
      expect(cn("foo", null, undefined, false, "bar")).toBe("foo bar");
    });

    it("returns empty string for no args", () => {
      expect(cn()).toBe("");
    });
  });

  describe("formatDate", () => {
    it("formats ISO date string", () => {
      const result = formatDate("2023-03-13");
      expect(result).toMatch(/\w+ \d+, 2023/);
    });
  });

  describe("SEVERITY_COLORS", () => {
    it("has entries for all severities", () => {
      SEVERITY_ORDER.forEach((sev) => {
        expect(SEVERITY_COLORS[sev]).toBeDefined();
        expect(typeof SEVERITY_COLORS[sev]).toBe("string");
      });
    });
  });

  describe("SEVERITY_ORDER", () => {
    it("is ordered from critical to informational", () => {
      expect(SEVERITY_ORDER).toEqual([
        "critical",
        "high",
        "medium",
        "low",
        "informational",
      ]);
    });
  });
});
