import { expect, test } from "@playwright/test";
import { productIds } from "./fixtures";

test("catalog preserves filters, sorting, pagination, keyword, and history", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByText("22 products")).toBeVisible();

  await page.getByLabel("Category").selectOption("e2e-laptops");
  await page.getByLabel("Max price").fill("950");
  await page.getByLabel("Sort").selectOption("price_asc");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=e2e-laptops/);
  await expect(page).toHaveURL(/maxPrice=950/);
  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(
    page.getByRole("heading", { name: "Phase 11 Developer Laptop" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page).toHaveURL("http://localhost:3011/products");
  await expect(page.getByRole("navigation", { name: "Catalog pagination" })).toBeVisible();
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("http://localhost:3011/products");
  await expect(page.getByText("Page 1 of 2")).toBeVisible();

  await page.getByLabel("Keyword").fill("Developer");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=Developer/);
  await expect(
    page.getByRole("heading", { name: "Phase 11 Developer Laptop" }),
  ).toBeVisible();
  await expect(page.getByText("1 products")).toBeVisible();
});

test("catalog renders out-of-stock state and bounded compare selection", async ({
  page,
}) => {
  await page.goto("/products?category=e2e-phones");
  await expect(
    page.getByRole("heading", { name: "Phase 11 Sold Out Phone" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();

  await page.goto("/products?category=e2e-laptops&sort=rating");
  await page.route("**/api/v1/ai/compare", (route) => route.abort("blockedbyclient"));
  await page.getByLabel("Compare Phase 11 Developer Laptop").check();
  await page.getByLabel("Compare Phase 11 Laptop 02").check();
  await page.getByRole("button", { name: "Compare selected" }).click();
  await expect(page).toHaveURL(
    new RegExp(`${productIds.developerLaptop}.*${productIds.secondLaptop}`),
  );
});
