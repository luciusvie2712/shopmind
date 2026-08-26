import { expect, test } from "@playwright/test";
import { productIds } from "./fixtures";

test("catalog preserves filters, sorting, pagination, keyword, and history", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
  await expect(page.getByText("22 products")).toBeVisible();
  const filters = page.getByRole("form", { name: "Catalog filters" });
  const catalogProducts = page.getByRole("region", { name: "Catalog products" });

  await filters.getByLabel("E2E Laptops", { exact: true }).check();
  await filters.getByLabel("Max price").fill("950");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=e2e-laptops/);
  await expect(page).toHaveURL(/maxPrice=950/);
  await page.getByLabel("Sort").selectOption("price_asc");
  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(
    catalogProducts.getByRole("heading", { name: "Phase 11 Developer Laptop" }),
  ).toBeVisible();

  await filters.getByRole("button", { name: "Clear all" }).click();
  await expect(page).toHaveURL("http://localhost:3011/products");
  await expect(page.getByRole("navigation", { name: "Catalog pagination" })).toBeVisible();
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("http://localhost:3011/products");
  await expect(page.getByText("Page 1 of 2")).toBeVisible();

  await filters.getByLabel("Keyword").fill("Developer");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=Developer/);
  await expect(
    catalogProducts.getByRole("heading", { name: "Phase 11 Developer Laptop" }),
  ).toBeVisible();
  await expect(page.getByText("1 products")).toBeVisible();
});

test("catalog renders out-of-stock state and bounded compare selection", async ({
  page,
}) => {
  await page.goto("/products?category=e2e-phones");
  const catalog = page.getByRole("region", { name: "Catalog products" });
  await expect(
    catalog.getByRole("heading", { name: "Phase 11 Sold Out Phone" }),
  ).toBeVisible();
  await expect(
    catalog.getByRole("button", { name: /out of stock/i }),
  ).toBeDisabled();

  await page.goto("/products?category=e2e-laptops&sort=rating");
  await page.route("**/api/v1/ai/compare", (route) => route.abort("blockedbyclient"));
  await page.getByLabel("Compare Phase 11 Developer Laptop").check();
  await page.getByLabel("Compare Phase 11 Laptop 02").check();
  await page.getByRole("button", { name: "Compare selected" }).click();
  await expect(page).toHaveURL(
    new RegExp(`${productIds.developerLaptop}.*${productIds.secondLaptop}`),
  );
});

test("mobile catalog uses an accessible filter dialog without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/products");

  const trigger = page.getByRole("button", { name: "Filters", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Product filters" });
  await expect(dialog).toBeVisible();

  const filters = page.getByRole("form", { name: "Mobile catalog filters" });
  await filters.getByLabel("E2E Laptops", { exact: true }).check();
  await filters.getByLabel("Max price").fill("950");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=e2e-laptops/);
  await expect(page).toHaveURL(/maxPrice=950/);

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(
      () => document.body.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("product detail renders canonical data and clamps quantity to stock", async ({
  page,
}) => {
  await page.goto(`/products/${productIds.developerLaptop}`);

  await expect(
    page.getByRole("heading", { name: "Phase 11 Developer Laptop", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "E2E Laptops" })).toBeVisible();
  await expect(page.getByText("$899.00", { exact: true })).toBeVisible();
  await expect(page.getByText("In stock (5 available)")).toBeVisible();
  await expect(
    page
      .getByRole("paragraph")
      .filter({ hasText: "Deterministic browser fixture for development" })
      .first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Specifications" })).toBeVisible();
  await expect(page.getByText("development, portable")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Reviews/ })).toHaveCount(0);

  const quantity = page.getByLabel("Quantity");
  await quantity.fill("99");
  await expect(quantity).toHaveValue("5");
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Add to wishlist" })).toBeEnabled();
});

test("product detail handles out-of-stock and responsive states", async ({ page }) => {
  await page.goto(`/products/${productIds.soldOutPhone}`);

  await expect(
    page.getByRole("heading", { name: "Phase 11 Sold Out Phone", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("paragraph").filter({ hasText: "Out of stock" }),
  ).toBeVisible();
  await expect(page.getByLabel("Quantity")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add to wishlist" })).toBeEnabled();

  for (const width of [375, 640, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.body.scrollWidth <= document.documentElement.clientWidth,
      ),
      `product detail should not overflow at ${width}px`,
    ).toBe(true);
  }
});

test("unknown product detail uses the route not-found state", async ({ page }) => {
  await page.goto("/products/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "Product not found" })).toBeVisible();
});
