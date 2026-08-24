import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "@/components/SeverityBadge";

describe("SeverityBadge", () => {
  it("renders the severity text", () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  it("applies correct styles for critical", () => {
    render(<SeverityBadge severity="critical" />);
    const badge = screen.getByText("critical");
    expect(badge.className).toContain("bg-red-500/10");
    expect(badge.className).toContain("text-red-400");
  });

  it("applies correct styles for high", () => {
    render(<SeverityBadge severity="high" />);
    const badge = screen.getByText("high");
    expect(badge.className).toContain("bg-orange-500/10");
    expect(badge.className).toContain("text-orange-400");
  });

  it("applies custom className", () => {
    render(<SeverityBadge severity="medium" className="test-class" />);
    const badge = screen.getByText("medium");
    expect(badge.className).toContain("test-class");
  });

  it("renders as uppercase", () => {
    render(<SeverityBadge severity="critical" />);
    const badge = screen.getByText("critical");
    expect(badge.className).toContain("uppercase");
  });
});
