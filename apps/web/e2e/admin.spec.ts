import { expect, test } from "@playwright/test";

const adminUser = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "ShopMind Admin",
  email: "admin@shopmind.test",
  role: "ADMIN",
  createdAt: "2026-08-01T00:00:00.000Z",
};
const productThumbnail =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2SIAAAAASUVORK5CYII=";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accessToken: "admin-e2e-token", user: adminUser }),
    }),
  );
  await page.route("**/api/v1/admin/analytics/overview?days=30", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        range: {
          from: "2026-07-30T00:00:00.000Z",
          to: "2026-08-29T00:00:00.000Z",
        },
        catalog: {
          products: 100,
          activeProducts: 96,
          sourceMissingProducts: 4,
          categories: 8,
          embeddingCoverage: 0.92,
          staleEmbeddings: 3,
        },
        ai: {
          requests: 200,
          successes: 190,
          failures: 10,
          averageLatencyMs: 420,
          p95LatencyMs: 810,
          inputTokens: 12000,
          outputTokens: 4500,
        },
        events: {
          productViews: 800,
          searchClicks: 300,
          cartAdditions: 90,
          topProducts: [
            {
              product: {
                id: "20000000-0000-4000-8000-000000000001",
                title: "Admin visual test product",
                brand: "ShopMind",
                price: 99,
                rating: 4.8,
                stock: 10,
                thumbnail: productThumbnail,
                category: {
                  id: "30000000-0000-4000-8000-000000000001",
                  slug: "test-products",
                  name: "Test products",
                },
              },
              events: 42,
            },
          ],
        },
        commerce: { orders: 32, orderValue: 1450 },
        jobs: { available: true },
      }),
    }),
  );
  await page.route("**/api/v1/admin/products?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        summary: { products: 1, active: 1, outOfStock: 0, embedded: 1 },
        items: [
          {
            id: "20000000-0000-4000-8000-000000000001",
            title: "Admin visual test product",
            source: "dummyjson",
            externalId: "101",
            sourceStatus: "ACTIVE",
            brand: "ShopMind",
            thumbnail: productThumbnail,
            category: "Test products",
            price: 99,
            rating: 4.8,
            stock: 10,
            hasEmbedding: true,
            reviewSummaryStatus: "READY",
            updatedAt: "2026-08-29T00:00:00.000Z",
          },
        ],
      }),
    }),
  );
});

test("ADMIN sees the production dashboard shell, charts, and account shortcut", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Admin analytics" }),
  ).toBeVisible();
  const sidebar = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(
    sidebar.getByRole("link", { name: "Tổng quan" }),
  ).toHaveAttribute("aria-current", "page");
  for (const name of [
    "Ingestion",
    "Người dùng",
    "Đơn hàng",
    "Thanh toán",
    "Sản phẩm",
    "AI logs",
  ]) {
    await expect(sidebar.getByRole("link", { name })).toBeVisible();
  }
  await expect(
    page.getByRole("img", { name: "Biểu đồ tương tác người dùng" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "AI success rate 95%" }),
  ).toBeVisible();
  await expect(page.getByAltText("Admin visual test product")).toBeVisible();

  await page.getByTitle("Account").click();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "href",
    "/admin",
  );

  await sidebar.getByRole("link", { name: "Sản phẩm" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await expect(page.getByAltText("Admin visual test product")).toBeVisible();
});
