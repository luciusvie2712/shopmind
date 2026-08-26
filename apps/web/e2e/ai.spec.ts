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
  const secondLaptop = {
    ...developerLaptop,
    id: productIds.secondLaptop,
    title: "Phase 11 Laptop 02",
    price: 902,
    rating: 4.2,
  };
  return {
    intent,
    results: [
      {
        product: developerLaptop,
        score: 0.94,
        reason: "Grounded deterministic fixture",
        tradeoffs: ["Fixture trade-off"],
      },
      {
        product: secondLaptop,
        score: 0.87,
        reason: "Second grounded deterministic fixture",
        tradeoffs: [],
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
  await expect(
    page.getByText("Grounded deterministic fixture", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Phase 11 Developer Laptop" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI insight" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top AI recommendations" })).toBeVisible();

  await page.getByRole("checkbox", { name: "Compare Phase 11 Developer Laptop" }).check();
  await page.getByRole("checkbox", { name: "Compare Phase 11 Laptop 02" }).check();
  const compareLink = page.getByRole("link", { name: "Compare selected" });
  await expect(page.getByRole("heading", { name: "Compare top picks" })).toBeVisible();
  await expect(compareLink).toHaveAttribute(
    "href",
    `/compare?ids=${productIds.developerLaptop},${productIds.secondLaptop}`,
  );

  await page.getByRole("button", { name: "Discover products" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Gemini timed out",
  );
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByText("Grounded deterministic fixture", { exact: true }),
  ).toBeVisible();
});

test("AI search recommendations remain responsive without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/api/v1/ai/search", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(aiSearchResponse()),
    });
  });

  await page.goto("/search/ai");
  await page.getByRole("button", { name: "Discover products" }).click();
  await expect(
    page.getByText("Describe your need in at least 3 characters", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("What are you shopping for?").fill("Laptop for Docker");
  await page.getByRole("button", { name: "Discover products" }).click();

  await expect(page.getByRole("heading", { name: "AI insight" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top AI recommendations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Phase 11 Developer Laptop" })).toBeVisible();
  for (const width of [375, 640, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 812 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

test("compare renders canonical facts and a controlled API unavailable state", async ({
  page,
}) => {
  let compareRequests = 0;
  let releaseCompare: (() => void) | undefined;
  const second = {
    ...developerLaptop,
    id: productIds.secondLaptop,
    title: "Phase 11 Laptop 02",
    brand: "Acme",
    price: 902,
    rating: 4.2,
  };
  await page.route("**/api/v1/ai/compare", async (route) => {
    compareRequests += 1;
    await new Promise<void>((resolve) => {
      releaseCompare = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        products: [
          {
            ...developerLaptop,
            attributes: { useCase: "development", warranty: "2 years" },
          },
          {
            ...second,
            attributes: { useCase: "general", shipping: "3 days" },
          },
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
  await expect(page.getByLabel("Comparison loading")).toBeVisible();
  await expect.poll(() => compareRequests).toBe(1);
  releaseCompare?.();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Grounded comparison fixture")).toBeVisible();
  await expect(page.getByText("2 / 4 products selected")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Use case" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Warranty" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Shipping" })).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  expect(compareRequests).toBe(1);

  for (const width of [375, 640, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  }

  await page.unroute("**/api/v1/ai/compare");
  await page.route("**/api/v1/ai/compare", (route) => route.abort("failed"));
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "ShopMind API is unavailable",
  );
});

test("compare fallback waits for the API and retries only on request", async ({
  page,
}) => {
  const second = {
    ...developerLaptop,
    id: productIds.secondLaptop,
    title: "Phase 11 Laptop 02",
    price: 902,
  };
  let compareRequests = 0;

  await page.route("**/api/v1/ai/compare", async (route) => {
    compareRequests += 1;
    const success = compareRequests > 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        products: [
          { ...developerLaptop, attributes: { useCase: "development" } },
          { ...second, attributes: { useCase: "general" } },
        ],
        ...(success ? { summary: "Grounded retry fixture" } : {}),
        referencedProductIds: success
          ? [developerLaptop.id, second.id]
          : [],
        status: success ? "success" : "fallback",
        ...(success ? {} : { fallbackReason: "AI_PROVIDER_TIMEOUT" }),
        requestId: success ? "phase11-compare-retry" : "phase11-compare-timeout",
      }),
    });
  });

  await page.goto(
    `/compare?ids=${productIds.developerLaptop},${productIds.secondLaptop}`,
  );
  await expect(
    page.getByRole("heading", { name: "AI summary temporarily unavailable" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.waitForTimeout(200);
  expect(compareRequests).toBe(1);

  await page.getByRole("button", { name: "Retry summary" }).click();
  await expect(page.getByText("Grounded retry fixture")).toBeVisible();
  expect(compareRequests).toBe(2);

  await page
    .getByRole("button", {
      name: `Remove ${developerLaptop.title} from comparison`,
    })
    .first()
    .click();
  await page.waitForURL(`**/compare?ids=${productIds.secondLaptop}`);
  await expect(
    page.getByRole("heading", { name: "Invalid comparison selection" }),
  ).toBeVisible();
  expect(compareRequests).toBe(2);
});

test("authenticated assistant renders grounded read-only output", async ({
  page,
}) => {
  await registerAndLogin(page, "assistant");
  const second = {
    ...developerLaptop,
    id: productIds.secondLaptop,
    title: "Phase 11 Laptop 02",
    price: 902,
    rating: 4.2,
  };
  let assistantRequests = 0;
  let releaseAssistant: (() => void) | undefined;
  await page.route("**/api/v1/ai/assistant/messages", async (route) => {
    assistantRequests += 1;
    await new Promise<void>((resolve) => {
      releaseAssistant = resolve;
    });
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
        products: [developerLaptop, second],
        requestId: "phase11-assistant",
      }),
    });
  });

  await page.goto("/assistant");
  await expect(page.getByRole("heading", { name: "ShopMind assistant" })).toBeVisible();
  await expect(page.getByText("Read-only assistant", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Discovery context" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grounded results" })).toBeVisible();
  await page.getByLabel("Message").fill("Show me a safe laptop");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Waiting for the assistant response…")).toBeVisible();
  await expect.poll(() => assistantRequests).toBe(1);
  releaseAssistant?.();
  await expect(
    page.getByText("This answer uses bounded canonical product facts."),
  ).toBeVisible();
  await expect(page.getByText("Phase 11 Developer Laptop")).toBeVisible();
  await expect(page.getByText("Phase 11 Laptop 02")).toBeVisible();
  await expect(page.getByRole("link", { name: "Compare grounded products" })).toHaveAttribute(
    "href",
    `/compare?ids=${productIds.developerLaptop},${productIds.secondLaptop}`,
  );
  await expect(
    page.getByText("No checkout, payment, cart, or wishlist writes are available to AI."),
  ).toBeVisible();

  for (const width of [375, 640, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
  expect(assistantRequests).toBe(1);
});

test("assistant preserves the conversation through timeout and manual retry", async ({
  page,
}) => {
  await registerAndLogin(page, "assistant-retry");
  let assistantRequests = 0;
  await page.route("**/api/v1/ai/assistant/messages", async (route) => {
    assistantRequests += 1;
    if (assistantRequests === 1) {
      await route.fulfill({
        status: 504,
        contentType: "application/json",
        body: JSON.stringify(apiError("AI_PROVIDER_TIMEOUT", "Timed out")),
      });
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        conversationId: "30000000-0000-4000-8000-000000000011",
        message: {
          id: "30000000-0000-4000-8000-000000000012",
          role: "ASSISTANT",
          content: "Grounded retry response.",
          createdAt: "2026-08-23T00:00:00.000Z",
        },
        products: [],
        requestId: "phase11-assistant-retry",
      }),
    });
  });

  await page.goto("/assistant");
  await page.getByLabel("Message").fill("Keep this message visible");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Keep this message visible")).toBeVisible();
  await expect(page.getByText(/assistant timed out/i)).toBeVisible();
  expect(assistantRequests).toBe(1);

  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Grounded retry response.")).toBeVisible();
  await expect(page.getByText("Keep this message visible")).toBeVisible();
  expect(assistantRequests).toBe(2);
  await expect(page.getByText("No grounded products yet")).toBeVisible();
});
