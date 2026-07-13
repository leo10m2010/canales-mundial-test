const { test, expect } = require("@playwright/test");

async function preparePage(page, query = "") {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/.netlify/functions/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "{}",
  }));
  await page.goto(`/${query}`);
  await page.waitForFunction(() => document.fonts.status === "loaded");
  return errors;
}

test("primary view change runs the branded ident", async ({ page }) => {
  const errors = await preparePage(page, "?mode=pc");
  const transitionStarted = await page.evaluate(() => {
    document.querySelector('[data-agenda-view="results"]').click();
    return document.querySelector("#sceneTransition").classList.contains("is-active");
  });
  expect(transitionStarted).toBe(true);
  await expect(page.locator("#sceneTransitionLabel")).toHaveText("Resultados");
  await expect(page.locator("#sceneTransitionDetail")).toHaveText("Marcadores finales");
  await expect(page.locator("#pageTitle")).toHaveText("Resultados");
  expect(errors).toEqual([]);
});

test("player reveals a loaded source and preserves context", async ({ page }) => {
  const errors = await preparePage(page, "?mode=pc");
  await page.evaluate(() => {
    const fixture = `${window.location.origin}/tests/fixture-player.html`;
    openItem({
      sourceName: "Servidor 1",
      sourceUrl: fixture,
      sourceKey: "fixture-1",
      name: "Partido de prueba",
      language: "Español",
      quality: "HD",
      type: "Web",
    }, { playlist: [], playlistTitle: "Prueba" });
  });
  await expect(page.locator("#player")).toBeVisible();
  await expect(page.locator("#playerStage iframe")).toHaveClass(/is-ready/);
  await expect(page.locator("#primaryPlayerPane")).toHaveAttribute("data-player-state", "ready");
  expect(errors).toEqual([]);
});

test("a timed-out source fails over once to the next source", async ({ page }) => {
  const errors = await preparePage(page, "?mode=pc&sourceTimeout=1000");
  await page.evaluate(() => {
    const origin = window.location.origin;
    const sources = [
      { sourceName: "Servidor lento", sourceUrl: `${origin}/tests/hang`, sourceKey: "slow", name: "Prueba", language: "Español", quality: "HD", type: "Web" },
      { sourceName: "Servidor alterno", sourceUrl: `${origin}/tests/fixture-player.html`, sourceKey: "ready", name: "Prueba", language: "Español", quality: "HD", type: "Web" },
    ];
    openItem(sources[0], { playlist: sources, playlistTitle: "Servidores de prueba" });
  });
  await expect(page.locator("#playerStage iframe")).toHaveAttribute("src", /fixture-player\.html/, { timeout: 5000 });
  await expect(page.locator("#primaryPlayerPane")).toHaveAttribute("data-player-state", "ready");
  expect(errors).toEqual([]);
});

test("all failed sources stop on a recoverable error", async ({ page }) => {
  const errors = await preparePage(page, "?mode=pc&sourceTimeout=1000");
  await page.evaluate(() => {
    const hang = `${window.location.origin}/tests/hang`;
    const sources = [
      { sourceName: "Servidor 1", sourceUrl: `${hang}?one`, sourceKey: "failed-1", name: "Prueba", language: "Español", quality: "HD", type: "Web" },
      { sourceName: "Servidor 2", sourceUrl: `${hang}?two`, sourceKey: "failed-2", name: "Prueba", language: "Español", quality: "HD", type: "Web" },
    ];
    openItem(sources[0], { playlist: sources, playlistTitle: "Servidores de prueba" });
  });
  await expect(page.locator("#primaryPlayerPane")).toHaveAttribute("data-player-state", "failed", { timeout: 5000 });
  await expect(page.locator("#playerStage .player-signal-title")).toHaveText("No pudimos abrir esta transmisión");
  await expect(page.locator("#playerStage .player-signal-action")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("scene ident visual", async ({ page }, testInfo) => {
  await preparePage(page, testInfo.project.name === "tv" ? "?mode=tv" : "?mode=pc");
  await page.evaluate(() => {
    window.clearTimeout(sceneTransitionTimer);
    window.clearTimeout(sceneTransitionCleanupTimer);
    document.body.classList.add("is-scene-transitioning");
    [sceneTransition, sceneTransitionPlayer].forEach((transition) => {
      transition.dataset.variant = "live";
      transition.classList.add("is-active");
    });
    sceneTransitionLabel.textContent = "En vivo";
    sceneTransitionDetail.textContent = "Argentina vs España";
  });
  await expect(page).toHaveScreenshot(`scene-ident-${testInfo.project.name}.png`);
});

test("branded player handoff visual", async ({ page }, testInfo) => {
  await preparePage(page, testInfo.project.name === "tv" ? "?mode=tv" : "?mode=pc");
  await page.evaluate(() => {
    openItem({
      sourceName: "Servidor 1",
      sourceUrl: `${window.location.origin}/tests/hang`,
      sourceKey: "visual-loading",
      name: "Argentina vs España",
      language: "Español",
      quality: "HD",
      type: "Web",
    }, { playlist: [], playlistTitle: "Servidores" });
  });
  await expect(page.locator("#playerStage .player-signal")).toBeVisible();
  await expect(page.locator("#playerGrid")).toHaveScreenshot(`player-handoff-${testInfo.project.name}.png`);
});
