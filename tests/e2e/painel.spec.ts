import { expect, test } from "@playwright/test";

/**
 * Guarda do painel: sem sessão nada de /admin, e o login trata credencial
 * errada sem estourar a página (o erro tem de aparecer na tela).
 */
test.describe("acesso ao painel", () => {
  test("/admin sem sessão redireciona para o login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login/);

    await expect(page).toHaveURL(/\/login/);
  });

  test("tela de login tem os campos e o botão", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: /Entrar/i })).toBeVisible();
  });

  test("credencial inválida mostra erro na tela", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill("ninguem@exemplo.local");
    await page.getByLabel("Senha").fill("senha-errada-de-teste");
    await page.getByRole("button", { name: /Entrar/i }).click();

    await expect(
      page.getByText(/inválid|incorret|e-mail ou senha/i),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
