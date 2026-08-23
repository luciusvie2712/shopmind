import { expect, test } from "@playwright/test";
import { apiError, registerAndLogin } from "./fixtures";

test("auth, wishlist, cart, checkout, orders, and logout use the real API", async ({
  page,
}) => {
  await registerAndLogin(page, "shopping");
  const product = page.getByRole("article").filter({
    hasText: "Phase 11 Developer Laptop",
  });

  await product.getByRole("button", { name: "Wishlist" }).click();
  await expect(product.getByRole("button", { name: "Saved" })).toBeVisible();
  await product.getByRole("button", { name: "Add to cart" }).click();
  await expect(product.getByRole("status")).toHaveText("Added to cart");

  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { name: "Wishlist" })).toBeVisible();
  await expect(page.getByText("Phase 11 Developer Laptop")).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await page
    .getByRole("button", {
      name: "Increase quantity for Phase 11 Developer Laptop",
    })
    .click();
  await expect(page.getByText("$1,798.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Create simulated order" }).click();
  await page.waitForURL("**/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await expect(page.getByText("Phase 11 Developer Laptop")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await page.goto("/cart");
  await page.waitForURL("**/login");
});

test("failed optimistic wishlist mutation rolls back", async ({ page }) => {
  await registerAndLogin(page, "rollback");
  await page.route("**/api/v1/wishlist/*", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(apiError("INTERNAL_ERROR", "Controlled failure")),
    });
  });

  const product = page.getByRole("article").filter({
    hasText: "Phase 11 Developer Laptop",
  });
  await product.getByRole("button", { name: "Wishlist" }).click();
  await expect(product.getByRole("button", { name: "Wishlist" })).toBeVisible();
  await expect(product.getByRole("alert")).toHaveText("Controlled failure");
});

test("failed optimistic cart mutation rolls back", async ({ page }) => {
  await registerAndLogin(page, "cart-rollback");
  const product = page.getByRole("article").filter({
    hasText: "Phase 11 Developer Laptop",
  });
  await product.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");

  let releaseFailure: (() => void) | undefined;
  await page.route("**/api/v1/cart/items/*", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    await new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify(apiError("OUT_OF_STOCK", "Controlled stock failure")),
    });
  });

  await page
    .getByRole("button", { name: "Increase quantity for Phase 11 Developer Laptop" })
    .click();
  await expect(
    page.getByLabel("Quantity for Phase 11 Developer Laptop", { exact: true }),
  ).toHaveText("2");
  releaseFailure?.();
  await expect(
    page.getByLabel("Quantity for Phase 11 Developer Laptop", { exact: true }),
  ).toHaveText("1");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "restored to canonical server data",
  );
});
