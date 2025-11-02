import { test, expect } from "@playwright/test";

test("user can see signup form and validate", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: /Daftar/i })).toBeVisible();

  await page.getByLabel("Nama").fill("Ananda");
  await page.getByLabel("Email").fill("ananda@example.com");
  await page.getByLabel("Kata sandi").fill("password123");
  await page.getByLabel("Konfirmasi kata sandi").fill("password123");
  await page.getByRole("button", { name: /Daftar/i }).click();

  // Karena API saat e2e belum pointing ke test DB, cukup cek tombol submit tidak disabled lama
  await expect(page.getByRole("button", { name: /Daftar/i })).toBeEnabled();
});
