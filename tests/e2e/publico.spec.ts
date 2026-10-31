import { expect, test } from "@playwright/test";

/**
 * F4/F3 — fluxo público. Cobre o que o visitante faz sem sessão:
 * descobrir o catálogo, filtrar, buscar e abrir a página do negócio.
 * Depende do seed (`pnpm db:seed:completo`), que cria "Padaria do Zé".
 */
test.describe("catálogo público", () => {
  test("home responde e mostra a chamada principal", async ({ page }) => {
    const resposta = await page.goto("/");

    expect(resposta?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Bento Gonçalves/i,
    );
    await expect(
      page.getByRole("link", { name: /Cadastrar seu negócio/i }).first(),
    ).toBeVisible();
  });

  test("catálogo lista negócios publicados", async ({ page }) => {
    await page.goto("/catalogo");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Padaria do Zé").first()).toBeVisible();
  });

  test("filtro por categoria reduz o resultado pela URL", async ({ page }) => {
    await page.goto("/catalogo?categoria=pizzarias");

    await expect(page.getByText("Pizzaria Bella Napoli").first()).toBeVisible();
    await expect(page.getByText("Padaria do Zé")).toHaveCount(0);
  });

  test("busca sem acento encontra o negócio", async ({ page }) => {
    await page.goto("/busca?q=padaria");

    await expect(page.getByText("Padaria do Zé").first()).toBeVisible();
  });

  test("página do negócio mostra contatos e endereço", async ({ page }) => {
    const resposta = await page.goto("/negocio/padaria-do-ze");

    expect(resposta?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Padaria do Zé/i,
    );
    await expect(page.getByText("Contatos", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /WhatsApp/i }).first(),
    ).toBeVisible();
    await expect(page.getByText(/Rua Marechal Floriano/)).toBeVisible();
  });

  test("slug inexistente responde 404", async ({ page }) => {
    const resposta = await page.goto("/negocio/nao-existe-essa-padaria");

    expect(resposta?.status()).toBe(404);
  });
});
