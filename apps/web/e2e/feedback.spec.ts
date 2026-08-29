import { expect, test, type Page } from "@playwright/test";
import { ApiClientError } from "../src/lib/api/client";
import { getErrorFeedback } from "../src/lib/feedback";
import { apiError, developerLaptop, laptopFixture, productIds } from "./fixtures";

const products = [
  developerLaptop,
  laptopFixture(productIds.secondLaptop, "Phase 11 Laptop 02", 799),
  laptopFixture(productIds.thirdLaptop, "Phase 11 Laptop 03", 699),
  laptopFixture(productIds.soldOutPhone, "Feedback test product", 99),
];
const cart = {
  items: [{ id: "30000000-0000-4000-8000-000000000001", product: developerLaptop, quantity: 1, unitPrice: 899, lineTotal: 899 }],
  subtotal: 899,
  total: 899,
};
const activeToasts = (page: Page) => page.locator('[data-sonner-toast][data-removed="false"]');

test.beforeEach(async ({ page }) => {
  // Exercise the real UI/hooks without database, Gemini or auth-service dependencies.
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown;
    if (path.endsWith("/auth/refresh")) {
      body = { accessToken: "feedback-test-token", user: {
        id: "40000000-0000-4000-8000-000000000001", name: "Feedback Test", email: "feedback@example.com", role: "USER", createdAt: "2026-01-01T00:00:00.000Z",
      } };
    } else if (path.endsWith("/wishlist")) {
      body = { items: products };
    } else if (path.includes("/cart")) {
      body = cart;
    } else if (path.endsWith("/orders")) {
      body = { items: [] };
    } else {
      return route.fulfill({ status: 503, json: apiError("INTERNAL_ERROR", "Private implementation detail") });
    }
    await route.fulfill({ json: body });
  });
});

test("stable codes classify contextual errors without exposing server messages", () => {
  for (const code of ["VALIDATION_ERROR", "AUTH_REQUIRED", "FORBIDDEN", "PRODUCT_NOT_FOUND", "OUT_OF_STOCK", "AI_INVALID_OUTPUT", "AI_PROVIDER_TIMEOUT", "AI_RATE_LIMITED", "EXTERNAL_DATA_ERROR"] as const) {
    const feedback = getErrorFeedback(new ApiClientError(code, "Private implementation detail", 400));
    expect(feedback.presentation).toBe("inline");
    expect(JSON.stringify(feedback)).not.toContain("Private implementation detail");
  }
  for (const error of [new Error("Private implementation detail"), new ApiClientError("API_UNAVAILABLE", "Private implementation detail", 0), new ApiClientError("INTERNAL_ERROR", "Private implementation detail", 500)]) {
    expect(getErrorFeedback(error).presentation).toBe("toast");
    expect(JSON.stringify(getErrorFeedback(error))).not.toContain("Private implementation detail");
  }
});

test("failed optimistic wishlist removal restores the item and shows only safe error feedback", async ({ page }) => {
  let release!: () => void;
  await page.route("**/api/v1/wishlist/*", async (route) => {
    await new Promise<void>((resolve) => { release = resolve; });
    await route.fulfill({ status: 503, json: apiError("INTERNAL_ERROR", "Private implementation detail") });
  });
  await page.goto("/wishlist");
  await page.getByRole("button", { name: "Remove Phase 11 Developer Laptop from wishlist" }).click();
  await expect(page.getByRole("link", { name: developerLaptop.title, exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole("link", { name: developerLaptop.title, exact: true })).toBeVisible();
  await expect(activeToasts(page)).toHaveText(/Couldn’t update your wishlist/);
  await expect(page.getByText("Private implementation detail")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("cart stock conflict rolls back quantity and remains inline without success toast", async ({ page }) => {
  let release!: () => void;
  await page.route("**/api/v1/cart/items/*", async (route) => {
    await new Promise<void>((resolve) => { release = resolve; });
    await route.fulfill({ status: 409, json: apiError("OUT_OF_STOCK", "Private implementation detail") });
  });
  await page.goto("/cart");
  await page.getByRole("button", { name: `Increase quantity for ${developerLaptop.title}` }).click();
  const quantity = page.getByLabel(`Quantity for ${developerLaptop.title}`, { exact: true });
  await expect(quantity).toHaveText("2");
  release();
  await expect(quantity).toHaveText("1");
  await expect(page.locator("main").getByRole("alert")).toContainText("Stock changed");
  await expect(activeToasts(page)).toHaveCount(0);
});

test("repeated actions deduplicate, replace success on failure, and dismiss by keyboard", async ({ page }) => {
  await page.goto("/wishlist");
  const add = page.getByRole("button", { name: "Add to cart", exact: true }).first();
  await add.click();
  await expect(activeToasts(page)).toHaveText(/Added to cart/);
  await add.click();
  await expect(activeToasts(page)).toHaveCount(1);
  await expect(activeToasts(page)).toHaveText(/Added to cart/);
  await page.route("**/api/v1/cart/items", (route) => route.abort());
  await add.click();
  await expect(activeToasts(page)).toHaveText(/Couldn’t update your cart/);
  await expect(activeToasts(page).filter({ hasText: "Added to cart" })).toHaveCount(0);
  const close = activeToasts(page).getByRole("button", { name: "Close notification" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(activeToasts(page)).toHaveCount(0);
});

test("one global toaster caps active events at three and background refetch stays silent", async ({ page }) => {
  await page.goto("/wishlist");
  const adds = page.getByRole("button", { name: "Add to cart", exact: true });
  await expect(adds).toHaveCount(4);
  await expect(activeToasts(page)).toHaveCount(0);
  for (let index = 0; index < 4; index++) {
    await adds.nth(index).click();
    await expect(adds.nth(index)).toBeEnabled();
    await expect(activeToasts(page)).toHaveCount(Math.min(index + 1, 3));
  }
  await expect(page.locator("[data-sonner-toaster]")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Notifications alt+T" })).toHaveAttribute("aria-live", "polite");
});

test("toast and inline stock feedback fit all target widths with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/wishlist");
  const add = page.getByRole("button", { name: "Add to cart", exact: true }).first();
  for (const width of [375, 640, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await add.click();
    await expect(activeToasts(page)).toHaveText(/Added to cart/);
    await expect(activeToasts(page)).toHaveCSS("transition-duration", "0s");
    const bounds = await activeToasts(page).boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.route("**/api/v1/cart/items", (route) => route.fulfill({ status: 409, json: apiError("OUT_OF_STOCK", "Private implementation detail") }));
  await page.setViewportSize({ width: 375, height: 812 });
  await add.click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Stock changed");
  await expect(page.locator(".feedback-alert")).toHaveCSS("animation-name", "none");
  await expect(activeToasts(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("AI timeout and invalid output expose inline retry while validation stays contextual", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/ai/search", (route) => {
    calls++;
    return route.fulfill({ status: 504, json: apiError(calls === 1 ? "AI_PROVIDER_TIMEOUT" : "AI_INVALID_OUTPUT", "Private implementation detail") });
  });
  await page.goto("/search/ai");
  await page.getByRole("button", { name: "Discover products" }).click();
  expect(calls).toBe(0);
  await expect(page.getByLabel("What are you shopping for?")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("What are you shopping for?").fill("Laptop for Docker");
  await page.getByRole("button", { name: "Discover products" }).click();
  const alert = page.locator("main").getByRole("alert");
  await expect(alert).toContainText("AI search took too long");
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(alert).toContainText("AI response could not be validated");
  await expect(alert.getByRole("button", { name: "Retry" })).toBeEnabled();
  await expect(activeToasts(page)).toHaveCount(0);
});

test("checkout conflict stays inline and success keeps navigation with a toast", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/v1/orders/checkout", (route) => {
    calls++;
    return calls === 1
      ? route.fulfill({ status: 409, json: apiError("OUT_OF_STOCK", "Private implementation detail") })
      : route.fulfill({ json: { id: "50000000-0000-4000-8000-000000000001", status: "CREATED", subtotal: 899, total: 899, createdAt: "2026-01-01T00:00:00.000Z", items: [] } });
  });
  await page.goto("/cart");
  await page.getByRole("button", { name: "Đặt mua" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Stock changed");
  await expect(activeToasts(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Đặt mua" }).click();
  await page.waitForURL("**/orders/*");
  await expect(activeToasts(page)).toHaveText(/Checkout successful/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
