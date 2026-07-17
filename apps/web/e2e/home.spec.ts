import { expect, test } from "@playwright/test";

test("loads the home page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Meet for real dates, not endless swipes.",
    })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Start free/ })).toBeVisible();
});
