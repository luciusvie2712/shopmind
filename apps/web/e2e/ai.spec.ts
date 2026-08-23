import { expect, test } from "@playwright/test";
import {
  apiError,
  developerLaptop,
  productIds,
  registerAndLogin,
} from "./fixtures";

const intent = {
  category: "e2e-laptops",
  price: { max: 1_000 },
  brands: ["ShopMind Test"],
  minRating: 4,
  useCases: ["backend development"],
  requiredFeatures: ["Docker"],
  priorities: ["portability"],
  negativePreferences: ["gaming-first"],
  semanticQuery: "portable Docker development laptop",
};

function aiSearchResponse() {
  return {
    intent,
    results: [
      {
        product: developerLaptop,
        score: 0.94,
        reason: "Grounded deterministic fixture",
        tradeoffs: ["Fixture trade-off"],
      },
    ],
    status: "success",
    requestId: "phase11-ai-search",
  };
}

test("AI search shows pending, intent, results, timeout, and retry", async ({
  page,
}) => {
  let releaseResponse: (() => void) | undefined;
  let call = 0;
  await page.route("**/api/v1/ai/search", async (route) => {
    call += 1;
    if (call === 1) {
      await new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
    }
    if (call === 2) {
      await route.fulfill({
        status: 504,
        contentType: "application/json",
        body: JSON.stringify(
          apiError("AI_PROVIDER_TIMEOUT", "Controlled AI timeout"),
        ),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(aiSearchResponse()),
    });
  });

  await page.goto("/search/ai");
  await page.getByLabel("What are you shopping for?").fill("Laptop for Docker");
  await page.getByRole("button", { name: "Discover products" }).click();
  await expect(page.getByLabel("AI search pending")).toBeVisible();
  releaseResponse?.();
  await expect(page.getByText("Grounded deterministic fixture")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Phase 11 Developer Laptop" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Discover products" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Gemini timed out",
  );
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Grounded deterministic fixture")).toBeVisible();
});

test("compare renders canonical facts and a controlled API unavailable state", async ({
  page,
}) => {
  const second = {
    ...developerLaptop,
    id: productIds.secondLaptop,
    title: "Phase 11 Laptop 02",
    brand: "Acme",
    price: 902,
    rating: 4.2,
  };
  await page.route("**/api/v1/ai/compare", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        products: [
          { ...developerLaptop, attributes: { useCase: "development" } },
          { ...second, attributes: { useCase: "general" } },
        ],
        summary: "Grounded comparison fixture",
        referencedProductIds: [developerLaptop.id, second.id],
        status: "success",
        requestId: "phase11-compare",
      }),
    });
  });
  await page.goto(
    `/compare?ids=${productIds.developerLaptop},${productIds.secondLaptop}`,
  );
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Grounded comparison fixture")).toBeVisible();

  await page.unroute("**/api/v1/ai/compare");
  await page.route("**/api/v1/ai/compare", (route) => route.abort("failed"));
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "ShopMind API is unavailable",
  );
});

test("authenticated assistant renders grounded read-only output", async ({
  page,
}) => {
  await registerAndLogin(page, "assistant");
  await page.route("**/api/v1/ai/assistant/messages", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        conversationId: "30000000-0000-4000-8000-000000000001",
        message: {
          id: "30000000-0000-4000-8000-000000000002",
          role: "ASSISTANT",
          content: "This answer uses bounded canonical product facts.",
          createdAt: "2026-08-23T00:00:00.000Z",
        },
        products: [developerLaptop],
        requestId: "phase11-assistant",
      }),
    });
  });

  await page.goto("/assistant");
  await page.getByLabel("Message").fill("Show me a safe laptop");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(
    page.getByText("This answer uses bounded canonical product facts."),
  ).toBeVisible();
  await expect(page.getByText("Phase 11 Developer Laptop")).toBeVisible();
  await expect(
    page.getByText("No checkout, payment, cart, or wishlist writes are available to AI."),
  ).toBeVisible();
});
