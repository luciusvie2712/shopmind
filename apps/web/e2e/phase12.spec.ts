import { expect, test, type Page } from "@playwright/test";
import {
  developerLaptop,
  laptopFixture,
  productIds,
  registerAndLogin,
} from "./fixtures";

const secondLaptop = laptopFixture(
  productIds.secondLaptop,
  "Phase 11 Laptop 02",
  902,
);
const thirdLaptop = laptopFixture(
  productIds.thirdLaptop,
  "Phase 11 Laptop 03",
  903,
);

async function expectNoPageOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.body.scrollWidth <= window.innerWidth + 1 &&
          document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
}

async function mockAiBoundaries(page: Page): Promise<void> {
  await page.route("**/api/v1/ai/search", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        intent: {
          category: "e2e-laptops",
          price: { max: 1_000 },
          brands: [],
          useCases: ["backend development"],
          requiredFeatures: ["Docker"],
          priorities: [],
          negativePreferences: [],
          semanticQuery: "Docker development laptop",
        },
        results: [
          {
            product: developerLaptop,
            score: 0.94,
            reason: "Grounded Phase 12 fixture",
            tradeoffs: [],
          },
        ],
        status: "success",
        requestId: "phase12-ai-search",
      }),
    }),
  );
  await page.route("**/api/v1/ai/compare", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        products: [developerLaptop, secondLaptop, thirdLaptop].map((product) => ({
          ...product,
          attributes: {},
        })),
        summary: "Grounded Phase 12 comparison",
        referencedProductIds: [
          developerLaptop.id,
          secondLaptop.id,
          thirdLaptop.id,
        ],
        status: "success",
        requestId: "phase12-compare",
      }),
    }),
  );
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
] as const) {
  test(`main demo journey remains usable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockAiBoundaries(page);
    await registerAndLogin(page, `phase12-${viewport.name}`);

    if (viewport.name === "mobile") {
      await page.getByText("Menu", { exact: true }).click();
      await expect(
        page.getByRole("navigation", { name: "Mobile primary navigation" }),
      ).toBeVisible();
      await page.getByText("Menu", { exact: true }).click();
    }

    const catalogFilters =
      viewport.name === "mobile"
        ? page.getByLabel("Mobile catalog filters")
        : page.getByLabel("Catalog filters", { exact: true });
    if (viewport.name === "mobile") {
      await page.getByRole("button", { name: "Filters" }).click();
    }
    await catalogFilters.getByLabel("Keyword").fill("Developer");
    await catalogFilters.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/q=Developer/);
    await expectNoPageOverflow(page);

    await page.goto("/search/ai");
    await page
      .getByLabel("What are you shopping for?")
      .fill("Laptop under $1000 for Docker");
    await page.getByRole("button", { name: "Discover products" }).click();
    await expect(page.getByText("Grounded Phase 12 fixture")).toBeVisible();
    await expectNoPageOverflow(page);

    await page.goto("/products?category=e2e-laptops&sort=rating");
    for (const title of [
      "Phase 11 Developer Laptop",
      "Phase 11 Laptop 02",
      "Phase 11 Laptop 03",
    ]) {
      await page.getByLabel(`Compare ${title}`).check();
    }
    const product = page.getByRole("article").filter({
      hasText: "Phase 11 Developer Laptop",
    });
    await product.getByRole("button", { name: "Wishlist" }).click();
    await product.getByTitle("Add to cart").click();
    await expect(
      page.locator('[data-sonner-toast][data-removed="false"]'),
    ).toHaveCount(0, { timeout: 8_000 });
    await page.getByRole("button", { name: "Compare selected" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoPageOverflow(page);

    await page.goto("/wishlist");
    await expect(page.getByText("Phase 11 Developer Laptop")).toBeVisible();
    await expectNoPageOverflow(page);

    await page.goto("/cart");
    await page.getByRole("button", { name: "Đặt mua" }).click();
    await page.waitForURL("**/orders/*");
    await expect(
      page.getByText("Phase 11 Developer Laptop").filter({ visible: true }),
    ).toBeVisible();
    await expectNoPageOverflow(page);

    await page.goto("/assistant");
    await expect(page.getByLabel("Message")).toBeVisible();
    await expectNoPageOverflow(page);
  });
}

test("tablet layout and representative keyboard accessibility remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.goto("/products?category=e2e-laptops");
  await expectNoPageOverflow(page);
  await page.getByRole("button", { name: "Filters" }).click();
  const catalogFilters = page.getByLabel("Mobile catalog filters");
  await catalogFilters.getByLabel("Keyword").focus();
  await catalogFilters.getByLabel("Keyword").fill("Developer");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=Developer/);

  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByLabel("Email")).toBeFocused();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");

  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
