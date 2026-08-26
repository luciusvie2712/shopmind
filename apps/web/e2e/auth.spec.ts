import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test("login and register share the responsive authentication visual system", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");

  const shell = page.locator("[data-auth-shell]");
  await expect(shell).toBeVisible();
  await expect(shell.locator(".auth-background-enter")).toHaveCSS(
    "background-image",
    /bg-auth/,
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to your account", level: 1 }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute(
    "autocomplete",
    "email",
  );
  await expect(page.getByLabel("Password")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(page.getByText("Continue with Google")).toHaveCount(0);
  await expect(page.getByText("Forgot password?")).toHaveCount(0);
  await expect(page.getByText("Remember me")).toHaveCount(0);

  const centerDelta = await page
    .locator('[aria-labelledby="auth-title"]')
    .evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Math.abs(
        bounds.left + bounds.width / 2 -
          document.documentElement.clientWidth / 2,
      );
    });
  expect(centerDelta).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);

  for (const viewport of [
    { width: 640, height: 900 },
    { width: 768, height: 1024 },
    { width: 1024, height: 900 },
    { width: 1280, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(shell).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  await page.getByLabel("Password").fill("visible-password");
  await page.getByRole("button", { name: "Show entered value" }).click();
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide entered value" }).click();
  await expect(page.getByLabel("Password")).toHaveAttribute(
    "type",
    "password",
  );

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: "Create your account", level: 1 }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveAttribute("autocomplete", "name");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
  await expectNoHorizontalOverflow(page);
});

test("authentication validation and API failure preserve accessible form state", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByLabel("Email")).toBeFocused();
  await expect(page.getByLabel("Email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  await page.route("**/api/v1/auth/login", (route) => route.abort());
  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("Password").fill("valid-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page
      .getByRole("region", { name: "Sign in to your account" })
      .getByRole("alert"),
  ).toContainText("ShopMind API is currently unavailable");
  await expect(page.getByLabel("Email")).toHaveValue("customer@example.com");
});

test("register then login keeps the existing redirects and session flow", async ({
  page,
}) => {
  const email = `auth-ui-${Date.now()}@e2e.shopmind.test`;
  const password = "Auth-ui-password-123";

  await page.goto("/register");
  await page.getByLabel("Name").fill("Auth UI Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/products");
  await expect(page.getByTitle("Account")).toBeVisible();
});
