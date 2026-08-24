import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocReader } from "@/components/DocReader";
import type { VulnDoc } from "@/lib/content";

const mockDoc: VulnDoc = {
  slug: "test-vuln",
  title: "Test Vulnerability Title",
  severity: "high",
  protocol: "TestProtocol",
  chain: "Ethereum",
  category: "reentrancy",
  date: "2023-06-15",
  source_url: "https://example.com",
  tags: ["reentrancy", "defi"],
  content: "Test content",
};

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("DocReader", () => {
  it("renders the title", () => {
    render(
      <DocReader doc={mockDoc}>
        <p>Test content</p>
      </DocReader>
    );
    expect(screen.getByText("Test Vulnerability Title")).toBeInTheDocument();
  });

  it("renders severity badge", () => {
    render(
      <DocReader doc={mockDoc}>
        <p>Test content</p>
      </DocReader>
    );
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("renders metadata", () => {
    render(
      <DocReader doc={mockDoc}>
        <p>Test content</p>
      </DocReader>
    );
    expect(screen.getByText("TestProtocol")).toBeInTheDocument();
    expect(screen.getByText("Ethereum")).toBeInTheDocument();
    expect(screen.getByText("reentrancy")).toBeInTheDocument();
  });

  it("renders tags", () => {
    render(
      <DocReader doc={mockDoc}>
        <p>Test content</p>
      </DocReader>
    );
    expect(screen.getByText("reentrancy")).toBeInTheDocument();
    expect(screen.getByText("defi")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <DocReader doc={mockDoc}>
        <p>Custom MDX content here</p>
      </DocReader>
    );
    expect(screen.getByText("Custom MDX content here")).toBeInTheDocument();
  });
});
