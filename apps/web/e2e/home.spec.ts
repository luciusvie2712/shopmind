import { expect, test } from "@playwright/test";

const fullPlaceholder =
  "e.g., Find a laptop for backend development under $1200";

test("home hero animates its prompt without changing search behavior", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Find the right products, faster with AI",
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.locator(".hero-title-letter")).toHaveCount(14);

  const search = page.getByLabel("Describe the product you want to find");
  await expect
    .poll(() => search.getAttribute("placeholder"), { timeout: 2_000 })
    .not.toBe(fullPlaceholder);
  await expect
    .poll(() => search.getAttribute("placeholder"), { timeout: 5_000 })
    .toBe(fullPlaceholder);

  await search.fill("ergonomic office chair");
  await page.waitForTimeout(700);
  await expect(search).toHaveValue("ergonomic office chair");
  await page.getByRole("button", { name: "Open AI search" }).click();
  await expect(page).toHaveURL(/\/search\/ai\?query=ergonomic%20office%20chair/);
});

test("global back-to-top appears after scrolling and returns to the page start", async ({
  page,
}) => {
  await page.goto("/");
  const backToTop = page.getByRole("button", { name: "Back to top" });

  await expect(backToTop).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 1_200));
  await expect(backToTop).toBeVisible();

  await backToTop.click();
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 3_000 })
    .toBe(0);
  await expect(backToTop).toBeHidden();
});

test("quick contact menu expands and closes on outside click or Escape", async ({
  page,
}) => {
  await page.goto("/");
  const openMenu = page.getByRole("button", {
    name: "Open quick contact menu",
  });

  // Next.js dev tools occupy the same bottom-left corner in E2E development.
  await openMenu.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Close quick contact menu" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel(/^Phone/)).toBeVisible();
  await expect(page.getByLabel(/^Facebook/)).toBeVisible();
  await expect(page.getByLabel(/^Zalo/)).toBeVisible();
  await expect(page.getByLabel(/^Gmail/)).toBeVisible();

  await page
    .getByRole("heading", {
      name: "Find the right products, faster with AI",
      level: 1,
    })
    .click();
  await expect(openMenu).toHaveAttribute("aria-expanded", "false");

  await openMenu.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(openMenu).toHaveAttribute("aria-expanded", "false");
  await expect(openMenu).toBeFocused();
});
