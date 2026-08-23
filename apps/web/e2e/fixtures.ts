import type { Page } from "@playwright/test";

export const productIds = {
  developerLaptop: "20000000-0000-4000-8000-000000000001",
  secondLaptop: "20000000-0000-4000-8000-000000000002",
  thirdLaptop: "20000000-0000-4000-8000-000000000003",
  soldOutPhone: "20000000-0000-4000-8000-000000000099",
} as const;

export const category = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "e2e-laptops",
  name: "E2E Laptops",
} as const;

export const developerLaptop = {
  id: productIds.developerLaptop,
  title: "Phase 11 Developer Laptop",
  brand: "ShopMind Test",
  price: 899,
  rating: 4.9,
  stock: 5,
  thumbnail: null,
  category,
} as const;

export function laptopFixture(
  id: string,
  title: string,
  price: number,
) {
  return {
    ...developerLaptop,
    id,
    title,
    brand: "Acme",
    price,
    rating: 4.2,
  } as const;
}

export async function registerAndLogin(page: Page, label: string): Promise<void> {
  const email = `phase11-${label}-${Date.now()}@e2e.shopmind.test`;
  const password = "Phase11-password-123";
  await page.goto("/register");
  await page.getByLabel("Name").fill(`Phase 11 ${label}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/products");
}

export function apiError(code: string, message: string) {
  return {
    error: { code, message, requestId: "phase11-browser-request" },
  };
}
