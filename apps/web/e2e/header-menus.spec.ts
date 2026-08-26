import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./fixtures";

test("account and mobile navigation menus dismiss outside and after navigation", async ({
  page,
}) => {
  await registerAndLogin(page, "dismissible-header-menus");

  const accountTrigger = page.getByTitle("Account");
  const accountMenu = page.locator("details").filter({ has: accountTrigger });

  await accountTrigger.click();
  await expect(accountMenu).toHaveAttribute("open", "");
  await page.getByRole("heading", { level: 1 }).click();
  await expect(accountMenu).not.toHaveAttribute("open", "");

  await accountTrigger.click();
  await page.keyboard.press("Escape");
  await expect(accountMenu).not.toHaveAttribute("open", "");
  await expect(accountTrigger).toBeFocused();

  await accountTrigger.click();
  await page.getByRole("link", { name: "Cart", exact: true }).click();
  await page.waitForURL("**/cart");
  await expect(accountMenu).not.toHaveAttribute("open", "");

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileTrigger = page.getByLabel("Main menu");
  const mobileMenu = page.locator("details").filter({ has: mobileTrigger });

  await mobileTrigger.click();
  await expect(mobileMenu).toHaveAttribute("open", "");
  await page.locator("#main-content").click({ position: { x: 10, y: 200 } });
  await expect(mobileMenu).not.toHaveAttribute("open", "");

  await mobileTrigger.click();
  const mobileNavigation = page.getByLabel("Mobile primary navigation");
  const mobileAccountTrigger = mobileNavigation.getByLabel(/Account menu for/);
  const mobileAccountMenu = mobileAccountTrigger.locator("..");
  await mobileAccountTrigger.click();
  await expect(mobileAccountMenu).toHaveAttribute("open", "");

  await page.locator("#main-content").click({ position: { x: 10, y: 200 } });
  await expect(mobileMenu).not.toHaveAttribute("open", "");
  await expect(mobileAccountMenu).not.toHaveAttribute("open", "");

  await mobileTrigger.click();
  await mobileNavigation.getByRole("link", { name: "Home" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(mobileMenu).not.toHaveAttribute("open", "");
});
