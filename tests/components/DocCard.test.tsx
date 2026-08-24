import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocCard } from "@/components/DocCard";
import type { VulnDoc } from "@/lib/content";

const mockDoc: VulnDoc = {
  slug: "test-vuln",
  title: "Test Vulnerability",
  severity: "critical",
  protocol: "TestProtocol",
  chain: "Ethereum",
  category: "reentrancy",
  date: "2023-01-15",
  source_url: "https://example.com",
  tags: ["reentrancy", "defi", "solidity"],
  content: "Test content",
};

describe("DocCard", () => {
  it("renders the title", () => {
    render(<DocCard doc={mockDoc} />);
    expect(screen.getByText("Test Vulnerability")).toBeInTheDocument();
  });

  it("renders the severity badge", () => {
    render(<DocCard doc={mockDoc} />);
    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  it("renders protocol and chain", () => {
    render(<DocCard doc={mockDoc} />);
    expect(screen.getByText("TestProtocol")).toBeInTheDocument();
    expect(screen.getByText("Ethereum")).toBeInTheDocument();
  });

  it("renders category", () => {
    render(<DocCard doc={mockDoc} />);
    expect(screen.getByText("reentrancy")).toBeInTheDocument();
  });

  it("renders tags", () => {
    render(<DocCard doc={mockDoc} />);
    expect(screen.getByText("reentrancy")).toBeInTheDocument();
    expect(screen.getByText("defi")).toBeInTheDocument();
    expect(screen.getByText("solidity")).toBeInTheDocument();
  });

  it("truncates tags beyond 3", () => {
    const docWithManyTags = {
      ...mockDoc,
      tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
    };
    render(<DocCard doc={docWithManyTags} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("links to the vuln page", () => {
    render(<DocCard doc={mockDoc} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/vulns/test-vuln");
  });
});
