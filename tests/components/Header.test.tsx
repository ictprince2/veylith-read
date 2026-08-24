import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "@/components/Header";

describe("Header", () => {
  it("renders the brand name", () => {
    render(<Header />);
    expect(screen.getByText("VEYLITH")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /vulns/i })).toHaveAttribute(
      "href",
      "/vulns"
    );
    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute(
      "href",
      "/about"
    );
  });

  it("renders the home link", () => {
    render(<Header />);
    const homeLink = screen.getByText("VEYLITH").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
