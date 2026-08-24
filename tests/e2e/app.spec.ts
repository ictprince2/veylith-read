import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Veylith Read/);
  });

  test("displays the hero section", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /blockchain security/i })
    ).toBeVisible();
  });

  test("navigates to /vulns", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /browse all/i }).click();
    await expect(page).toHaveURL(/\/vulns/);
  });
});

test.describe("Vulns listing page", () => {
  test("loads and displays write-ups", async ({ page }) => {
    await page.goto("/vulns");
    await expect(
      page.getByRole("heading", { name: /vulnerability write-ups/i })
    ).toBeVisible();
  });

  test("shows filter controls", async ({ page }) => {
    await page.goto("/vulns");
    await expect(page.getByLabel("Severity")).toBeVisible();
    await expect(page.getByLabel("Category")).toBeVisible();
    await expect(page.getByLabel("Chain")).toBeVisible();
    await expect(page.getByLabel("Protocol")).toBeVisible();
  });
});

test.describe("Vuln doc page", () => {
  test("renders a known doc", async ({ page }) => {
    await page.goto("/vulns/euler-finance-flash-loan");
    await expect(
      page.getByRole("heading", {
        name: /euler finance.*flash loan attack/i,
      })
    ).toBeVisible();
  });

  test("shows severity badge", async ({ page }) => {
    await page.goto("/vulns/euler-finance-flash-loan");
    await expect(page.getByText("critical", { exact: false })).toBeVisible();
  });

  test("shows protocol metadata", async ({ page }) => {
    await page.goto("/vulns/euler-finance-flash-loan");
    await expect(page.getByText("Euler Finance")).toBeVisible();
    await expect(page.getByText("Ethereum")).toBeVisible();
  });
});

test.describe("About page", () => {
  test("loads and displays about content", async ({ page }) => {
    await page.goto("/about");
    await expect(
      page.getByRole("heading", { name: /about/i })
    ).toBeVisible();
  });
});
