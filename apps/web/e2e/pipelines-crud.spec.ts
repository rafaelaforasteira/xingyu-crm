import { expect, test, type Page } from "@playwright/test";
import { DEMO_ORG_ID, DEMO_USER_ID } from "@xingyu/config";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

function pipelineCard(page: Page, name: string) {
  return page
    .getByTestId("pipeline-card")
    .filter({ has: page.getByRole("link", { name, exact: true }) });
}

async function openPipelineAction(page: Page, name: string, action: string) {
  const card = pipelineCard(page, name);
  await card.getByLabel(`Ações de ${name}`).click();
  await card.getByRole("menuitem", { name: action, exact: true }).click();
}

test("creates, edits, duplicates, favorites, archives, restores and deletes a pipeline", async ({
  page,
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = `E2E Pipeline ${suffix}`;
  const editedName = `${name} editado`;
  const createdIds: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  try {
    await page.goto("/pipelines");
    await expect(
      page.getByRole("heading", { name: "Pipelines", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Criar pipeline", exact: true }).click();
    const createDialog = page.getByRole("dialog", { name: "Criar pipeline" });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel("Nome").fill(name);
    await createDialog
      .getByLabel("Descrição")
      .fill("Pipeline criado pelo teste E2E de CRUD.");
    await createDialog.getByLabel("Código da cor").fill("#2563eb");
    await createDialog.getByLabel("Adicionar aos favoritos").check();

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/pipelines\/?$/.test(new URL(response.url()).pathname),
    );
    await createDialog
      .getByRole("button", { name: "Criar pipeline", exact: true })
      .click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();
    const created = (await createResponse.json()) as { id: string; name: string };
    createdIds.push(created.id);
    expect(created.name).toBe(name);
    await expect(page).toHaveURL(new RegExp(`/pipelines/${created.id}$`));
    await page.reload();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();

    await page.goto("/pipelines");
    await page.getByLabel("Buscar pipelines").fill(name);
    await expect(pipelineCard(page, name)).toHaveCount(1);

    await openPipelineAction(page, name, "Editar");
    const editDialog = page.getByRole("dialog", { name: "Editar pipeline" });
    await editDialog.getByLabel("Nome").fill(editedName);
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname.endsWith(`/api/pipelines/${created.id}`),
    );
    await editDialog.getByRole("button", { name: "Salvar", exact: true }).click();
    expect((await updateResponsePromise).ok()).toBeTruthy();
    await expect(pipelineCard(page, editedName)).toHaveCount(1);
    await page.reload();
    await page.getByLabel("Buscar pipelines").fill(editedName);
    await expect(pipelineCard(page, editedName)).toHaveCount(1);

    const duplicateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith(
          `/api/pipelines/${created.id}/duplicate`,
        ),
    );
    await openPipelineAction(page, editedName, "Duplicar");
    const duplicateResponse = await duplicateResponsePromise;
    expect(duplicateResponse.ok()).toBeTruthy();
    const duplicate = (await duplicateResponse.json()) as {
      id: string;
      name: string;
    };
    createdIds.push(duplicate.id);
    expect(duplicate.id).not.toBe(created.id);
    await page.getByLabel("Buscar pipelines").fill(duplicate.name);
    await expect(pipelineCard(page, duplicate.name)).toHaveCount(1);

    await page.getByLabel("Buscar pipelines").fill(editedName);
    await expect(pipelineCard(page, editedName)).toHaveCount(1);
    await openPipelineAction(page, editedName, "Remover dos favoritos");
    await expect(pipelineCard(page, editedName).getByText("Favorito")).toHaveCount(0);
    await openPipelineAction(page, editedName, "Favoritar");

    await page.getByRole("button", { name: "Favoritos", exact: true }).click();
    await expect(pipelineCard(page, editedName)).toHaveCount(1);

    await openPipelineAction(page, editedName, "Arquivar");
    await expect(pipelineCard(page, editedName)).toHaveCount(0);
    await page.getByRole("button", { name: "Arquivados", exact: true }).click();
    await expect(pipelineCard(page, editedName)).toHaveCount(1);
    await expect(pipelineCard(page, editedName).getByText("Arquivado")).toBeVisible();

    await openPipelineAction(page, editedName, "Restaurar");
    await expect(pipelineCard(page, editedName)).toHaveCount(0);
    await page.getByRole("button", { name: "Ativos", exact: true }).click();
    await expect(pipelineCard(page, editedName)).toHaveCount(1);

    await openPipelineAction(page, editedName, "Excluir");
    const deleteDialog = page.getByRole("dialog", { name: "Excluir pipeline" });
    await expect(deleteDialog).toContainText(editedName);
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        new URL(response.url()).pathname.endsWith(`/api/pipelines/${created.id}`),
    );
    await deleteDialog
      .getByRole("button", { name: "Excluir pipeline", exact: true })
      .click();
    expect((await deleteResponsePromise).ok()).toBeTruthy();
    await expect(pipelineCard(page, editedName)).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  } finally {
    for (const id of createdIds) {
      await request.delete(`${API_URL}/pipelines/${id}`, {
        headers: {
          "x-demo-user-id": DEMO_USER_ID,
          "x-organization-id": DEMO_ORG_ID,
        },
      });
    }
  }
});
