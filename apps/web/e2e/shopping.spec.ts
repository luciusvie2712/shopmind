import { expect, test, type Page } from "@playwright/test";
import { apiError, registerAndLogin } from "./fixtures";

const activeToasts = (page: Page) =>
  page.locator('[data-sonner-toast][data-removed="false"]');

test("auth, wishlist, cart, checkout, orders, and logout use the real API", async ({
  page,
}) => {
  await registerAndLogin(page, "shopping");
  const product = page.getByRole("article").filter({
    hasText: "Phase 11 Developer Laptop",
  });

  await product.getByTitle("Add to wishlist").click();
  await expect(product.getByTitle("Remove from wishlist")).toBeVisible();
  await product.getByTitle("Add to cart").click();
  await expect(activeToasts(page).filter({ hasText: "Added to cart" })).toBeVisible();

  await page.goto("/wishlist");
  await expect(
    page.getByRole("heading", { name: "Wishlist", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved item" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Phase 11 Developer Laptop", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("5 in stock")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
  for (const width of [375, 640, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cart items" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();
  await page
    .getByRole("button", {
      name: "Increase quantity for Phase 11 Developer Laptop",
    })
    .click();
  await expect(
    page.getByRole("complementary").getByRole("definition").last(),
  ).toHaveText("$1,798.00");
  for (const width of [375, 640, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
  await page.getByRole("button", { name: "Đặt mua" }).click();
  await page.waitForURL("**/orders/*");
  await expect(page.getByText("Thanh toán mô phỏng — không thực hiện giao dịch thật.")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Mã QR thanh toán mô phỏng ShopMind" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thanh toán", exact: true }).click();
  await expect(page.getByText("Thanh toán thành công", { exact: true })).toBeVisible();
  await expect(page.getByText("Đã nhận đơn hàng", { exact: true })).toBeVisible();
  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order history" })).toBeVisible();
  const orderCard = page.getByRole("article").filter({
    hasText: "Phase 11 Developer Laptop",
  });
  await expect(orderCard.getByText("PAID", { exact: true })).toBeVisible();
  await expect(orderCard.getByRole("link", { name: "View Phase 11 Developer Laptop" })).toBeVisible();
  await expect(orderCard.getByText("Qty 2", { exact: true })).toBeVisible();
  await expect(orderCard.getByText("$899.00 each", { exact: true })).toBeVisible();
  await expect(orderCard.getByText("$1,798.00", { exact: true }).first()).toBeVisible();
  for (const width of [375, 640, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }

  await page.getByTitle("Account").click();
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
  await product.getByTitle("Add to wishlist").click();
  await expect(product.getByTitle("Add to wishlist")).toBeVisible();
  await expect(activeToasts(page)).toContainText("Couldn’t update your wishlist");
});

test("failed optimistic wishlist removal restores the canonical item", async ({
  page,
}) => {
  await registerAndLogin(page, "wishlist-remove-rollback");
  const product = page.getByRole("article").filter({
    hasText: "Phase 11 Developer Laptop",
  });
  await product.getByTitle("Add to wishlist").click();
  await page.goto("/wishlist");

  let releaseFailure: (() => void) | undefined;
  await page.route("**/api/v1/wishlist/*", async (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    await new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(apiError("INTERNAL_ERROR", "Controlled wishlist removal failure")),
    });
  });

  await page
    .getByRole("button", {
      name: "Remove Phase 11 Developer Laptop from wishlist",
    })
    .click();
  await expect(page.getByText("No saved products yet")).toBeVisible();
  releaseFailure?.();
  await expect(
    page.getByRole("link", { name: "Phase 11 Developer Laptop", exact: true }),
  ).toBeVisible();
  await expect(activeToasts(page)).toContainText(
    "Couldn’t update your wishlist",
  );
});

test("wishlist keeps its shell through loading and API unavailable states", async ({
  page,
}) => {
  await registerAndLogin(page, "wishlist-states");
  await page.goto("/wishlist");
  await expect(page.getByText("No saved products yet")).toBeVisible();

  let releaseWishlist: (() => void) | undefined;
  let markWishlistRequested!: () => void;
  const wishlistRequested = new Promise<void>((resolve) => {
    markWishlistRequested = resolve;
  });
  await page.route("**/api/v1/wishlist", async (route) => {
    const response = await route.fetch();
    markWishlistRequested();
    await new Promise<void>((resolve) => {
      releaseWishlist = resolve;
    });
    await route.fulfill({ response });
  });

  await page.reload();
  await wishlistRequested;
  await expect(
    page.getByRole("heading", { name: "Wishlist", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Wishlist items loading")).toBeVisible();
  releaseWishlist?.();
  await expect(page.getByText("No saved products yet")).toBeVisible();

  await page.unroute("**/api/v1/wishlist");
  await page.route("**/api/v1/wishlist", (route) => route.abort("failed"));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Wishlist", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wishlist unavailable" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("wishlist keeps out-of-stock products removable while cart action stays disabled", async ({
  page,
}) => {
  await registerAndLogin(page, "wishlist-out-of-stock");
  const product = page.getByRole("article").filter({
    hasText: "Phase 11 Sold Out Phone",
  });
  await product.getByTitle("Add to wishlist").click();
  await page.goto("/wishlist");

  await expect(page.getByText("Out of stock").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Remove Phase 11 Sold Out Phone from wishlist",
    }),
  ).toBeEnabled();
});

test("failed optimistic cart mutation rolls back", async ({ page }) => {
  await registerAndLogin(page, "cart-rollback");
  const product = page.getByRole("article").filter({
    hasText: "Phase 11 Developer Laptop",
  });
  await product.getByTitle("Add to cart").click();
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
    "Stock changed",
  );
  await expect(activeToasts(page).filter({ hasText: "Added to cart" })).toHaveCount(0);
});

test("failed optimistic cart removal restores the canonical item", async ({ page }) => {
  await registerAndLogin(page, "cart-remove-rollback");
  const product = page.getByRole("article").filter({
    hasText: "Phase 11 Developer Laptop",
  });
  await product.getByTitle("Add to cart").click();
  await page.goto("/cart");

  let releaseFailure: (() => void) | undefined;
  await page.route("**/api/v1/cart/items/*", async (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    await new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(apiError("INTERNAL_ERROR", "Controlled remove failure")),
    });
  });

  await page.getByRole("button", { name: "Remove Phase 11 Developer Laptop from cart" }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
  releaseFailure?.();
  await expect(
    page.getByRole("link", { name: "Phase 11 Developer Laptop", exact: true }),
  ).toBeVisible();
  await expect(activeToasts(page)).toContainText(
    "Couldn’t update your cart",
  );
});

test("cart keeps its shell through loading and API unavailable states", async ({ page }) => {
  await registerAndLogin(page, "cart-states");
  let releaseCart: (() => void) | undefined;
  await page.route("**/api/v1/cart", async (route) => {
    const response = await route.fetch();
    await new Promise<void>((resolve) => {
      releaseCart = resolve;
    });
    await route.fulfill({ response });
  });

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByLabel("Cart items loading")).toBeVisible();
  releaseCart?.();
  await expect(page.getByText("Your cart is empty")).toBeVisible();

  await page.unroute("**/api/v1/cart");
  await page.route("**/api/v1/cart", (route) => route.abort("failed"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cart unavailable" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("orders keeps its shell through empty, loading, and API unavailable states", async ({
  page,
}) => {
  await registerAndLogin(page, "orders-states");
  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
  await expect(page.getByText("No simulated orders yet")).toBeVisible();

  let releaseOrders: (() => void) | undefined;
  let markOrdersRequested!: () => void;
  const ordersRequested = new Promise<void>((resolve) => {
    markOrdersRequested = resolve;
  });
  await page.route("**/api/v1/orders", async (route) => {
    const response = await route.fetch();
    markOrdersRequested();
    await new Promise<void>((resolve) => {
      releaseOrders = resolve;
    });
    await route.fulfill({ response });
  });

  await page.reload();
  await ordersRequested;
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
  await expect(page.getByLabel("Order history loading")).toBeVisible();
  releaseOrders?.();
  await expect(page.getByText("No simulated orders yet")).toBeVisible();

  await page.unroute("**/api/v1/orders");
  await page.route("**/api/v1/orders", (route) => route.abort("failed"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Order history unavailable" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
