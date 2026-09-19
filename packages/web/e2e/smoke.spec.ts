import { expect, test } from "@playwright/test";

test("web skeleton loads in a real browser and the shared contract runs client-side", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Low Cognitive Load MBSE" })).toBeVisible();
  await expect(page.getByTestId("contract-check")).toHaveText("contract rejects empty change set");
  expect(errors).toEqual([]);
});
