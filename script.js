const SELECTORS = {
  form: "#embedForm",
  input: "#embedInput",
  setupPanel: "#setupPanel",
  player: "#player",
  playerStage: "#playerStage",
  closeButton: "#closeButton",
  fullscreenButton: "#fullscreenButton",
  channelsButton: "#channelsButton",
  demoButton: "#demoButton",
  presetGroups: "#presetGroups",
  channelSwitcher: "#channelSwitcher",
  channelCount: "#channelCount",
  channelToast: "#channelToast",
  channelSearch: "#channelSearch",
};

const dom = Object.fromEntries(
  Object.entries(SELECTORS).map(([key, selector]) => [key, document.querySelector(selector)])
);

const missingElement = Object.entries(dom).find(([, element]) => !element);

if (missingElement) {
  throw new Error(`Missing required element: ${missingElement[0]}`);
}

const CHANNELS = window.PLAYER_CHANNELS || [];
const LANGUAGES = ["Español", "English"];
const WORLDCUP_CATEGORY = "worldcup";
const DEFAULT_ALLOW = "autoplay; encrypted-media; fullscreen; picture-in-picture";
const DEMO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";
const CONTROLS_HIDE_DELAY = 2600;
const TOAST_HIDE_DELAY = 2400;
let controlsHideTimer = 0;
let toastHideTimer = 0;
let searchTerm = "";

function getPlayableItems() {
  return CHANNELS.flatMap((channel) => {
    if (!Array.isArray(channel.options) || channel.options.length === 0) {
      return [{ ...channel, sourceName: channel.name, sourceUrl: channel.url }];
    }

    return channel.options.map((option, index) => ({
      ...channel,
      sourceName: option.name || `Opción ${index + 1}`,
      sourceUrl: option.url,
    }));
  }).filter((item) => item.sourceUrl);
}

function getWorldCupItems() {
  return getPlayableItems().filter((item) => item.category === WORLDCUP_CATEGORY);
}

function getRegularItems() {
  return getPlayableItems().filter((item) => item.category !== WORLDCUP_CATEGORY);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function itemMatchesSearch(item) {
  if (!searchTerm) {
    return true;
  }

  const haystack = normalizeText([
    item.sourceName,
    item.name,
    item.language,
    item.quality,
    item.type,
    item.country,
    item.sourceUrl,
  ].join(" "));

  return haystack.includes(searchTerm);
}

function getVisibleItems(items) {
  return items.filter(itemMatchesSearch);
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

function extractIframeSrc(value) {
  const match = value.match(/<iframe\b[^>]*\bsrc=(['"])(.*?)\1/i);
  return match ? match[2] : "";
}

function buildIframe(src) {
  return `<iframe src="${escapeAttribute(src)}" width="100%" height="100%" frameborder="0" scrolling="no" allow="${DEFAULT_ALLOW}"></iframe>`;
}

function normalizeEmbed(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const iframeSrc = extractIframeSrc(trimmed);

  if (iframeSrc) {
    return buildIframe(iframeSrc);
  }

  if (isUrl(trimmed)) {
    return buildIframe(trimmed);
  }

  return "";
}

function getEmbedSrc(value) {
  return extractIframeSrc(value) || (isUrl(value.trim()) ? value.trim() : "");
}

function prepareEmbeds(container) {
  container.querySelectorAll("iframe").forEach((frame) => {
    const currentAllow = frame.getAttribute("allow") || "";
    const permissions = new Set(
      `${currentAllow}; ${DEFAULT_ALLOW}`
        .split(";")
        .map((permission) => permission.trim())
        .filter(Boolean)
    );

    frame.setAttribute("allow", Array.from(permissions).join("; "));
    frame.removeAttribute("sandbox");
    frame.removeAttribute("allowfullscreen");
  });
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}

function createFlag(channel) {
  const flag = createElement("span", "flag");

  if (channel.country === "world") {
    flag.classList.add("flag-fallback");
    flag.textContent = "GL";
    flag.setAttribute("aria-hidden", "true");
    return flag;
  }

  const image = document.createElement("img");
  image.src = `https://flagcdn.com/w80/${channel.country}.png`;
  image.alt = channel.country.toUpperCase();
  image.loading = "lazy";
  flag.append(image);
  return flag;
}

function createSourceIcon(item) {
  const icon = createElement("span", "source-icon");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const isWorldCup = item.category === WORLDCUP_CATEGORY;

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  path.setAttribute(
    "d",
    isWorldCup
      ? "M7 3h10v3h3v2a5 5 0 0 1-5 5h-.2A6.02 6.02 0 0 1 13 14.7V18h3v2H8v-2h3v-3.3A6.02 6.02 0 0 1 9.2 13H9a5 5 0 0 1-5-5V6h3V3Zm0 5H6a3 3 0 0 0 2.2 2.9A6 6 0 0 1 7 8Zm10 0a6 6 0 0 1-1.2 2.9A3 3 0 0 0 18 8h-1Z"
      : "M8 5v14l11-7L8 5Z"
  );

  icon.classList.toggle("is-worldcup-icon", isWorldCup);
  svg.append(path);
  icon.append(svg);
  return icon;
}

function createChannelButton(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.src = item.sourceUrl;

  const top = createElement("div", "channel-card-top");
  top.append(createSourceIcon(item), createFlag(item), createElement("strong", "", item.sourceName));

  const meta = createElement("div", "meta-row");
  [item.language, item.quality, item.type].forEach((label) => {
    meta.append(createElement("span", "pill", label));
  });

  if (item.sourceName !== item.name) {
    meta.append(createElement("span", "pill", item.name));
  }

  button.append(top, meta);
  button.addEventListener("click", () => openItem(item));
  return button;
}

function createItemsSection(title, items, compact = false, modifier = "") {
  const sectionClass = compact ? "switcher-group" : "preset-language";
  const section = createElement("section", `${sectionClass}${modifier ? ` ${modifier}` : ""}`);

  section.append(createElement(compact ? "span" : "h2", compact ? "switcher-label" : "", title));

  const list = compact ? section : createElement("div", "preset-grid");
  items.forEach((item) => list.append(createChannelButton(item)));

  if (!compact) {
    section.append(list);
  }

  return section;
}

function createLanguageSection(language, compact = false) {
  const items = getRegularItems().filter((item) => item.language === language);
  return createItemsSection(language, items, compact);
}

function renderChannels() {
  const items = getPlayableItems();
  const visibleItems = getVisibleItems(items);
  const worldCupItems = getVisibleItems(getWorldCupItems());
  dom.channelCount.textContent = searchTerm ? `${visibleItems.length}/${items.length} fuentes` : `${items.length} fuentes`;
  dom.presetGroups.replaceChildren();
  dom.channelSwitcher.replaceChildren();

  const switcherHeader = createElement("div", "switcher-header");
  const switcherTitle = createElement("div");
  switcherTitle.append(
    createElement("strong", "", "Canales"),
    createElement("span", "", `${visibleItems.length} fuentes visibles`)
  );
  switcherHeader.append(switcherTitle);
  dom.channelSwitcher.append(switcherHeader);

  if (worldCupItems.length) {
    dom.presetGroups.append(createItemsSection("Mundial 2026", worldCupItems, false, "is-worldcup"));
    dom.channelSwitcher.append(createItemsSection("Mundial 2026", worldCupItems, true, "is-worldcup"));
  }

  LANGUAGES.forEach((language) => {
    const languageItems = getVisibleItems(getRegularItems()).filter((item) => item.language === language);

    if (languageItems.length) {
      dom.presetGroups.append(createItemsSection(language, languageItems));
      dom.channelSwitcher.append(createItemsSection(language, languageItems, true));
    }
  });

  if (!visibleItems.length) {
    const emptyState = createElement("div", "empty-state");
    emptyState.append(
      createElement("strong", "", "No hay fuentes con ese filtro"),
      createElement("span", "", "Prueba con otro canal, pais o numero de opcion.")
    );
    dom.presetGroups.append(emptyState);
  }
}

function toggleChannelSwitcher(force) {
  const isOpen = typeof force === "boolean"
    ? dom.channelSwitcher.classList.toggle("is-open", force)
    : dom.channelSwitcher.classList.toggle("is-open");

  dom.channelsButton.setAttribute("aria-expanded", String(isOpen));
}

function updateActiveChannel(src) {
  document.querySelectorAll("[data-src]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.src === src);
  });
}

function getCurrentSource() {
  const frame = dom.playerStage.querySelector("iframe");
  return frame?.getAttribute("src") || "";
}

function getCurrentSourceIndex() {
  const currentSource = getCurrentSource();
  return getPlayableItems().findIndex((item) => item.sourceUrl === currentSource);
}

function openItemByOffset(offset) {
  const items = getPlayableItems();

  if (!items.length) {
    return;
  }

  const currentIndex = getCurrentSourceIndex();
  const safeIndex = currentIndex === -1 ? (offset > 0 ? -1 : 0) : currentIndex;
  const nextIndex = (safeIndex + offset + items.length) % items.length;
  openItem(items[nextIndex], { keepFullscreen: true, announce: true });
}

async function enterFullscreen() {
  if (document.fullscreenElement || !dom.player.requestFullscreen) {
    return;
  }

  try {
    await dom.player.requestFullscreen();
  } catch (error) {
    // Browsers can reject fullscreen unless the user gesture is direct.
  }
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }

    return;
  }

  if (!dom.player.requestFullscreen) {
    return;
  }

  try {
    await dom.player.requestFullscreen();
  } catch (error) {
    // Browsers can reject fullscreen unless the user gesture is direct.
  }
}

function syncFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement);
  const label = isFullscreen ? "Salir de pantalla completa" : "Pantalla completa";
  const title = `${label} (F)`;

  dom.fullscreenButton.setAttribute("aria-label", label);
  dom.fullscreenButton.setAttribute("title", title);
  dom.fullscreenButton.classList.toggle("is-active", isFullscreen);
  dom.player.classList.toggle("is-fullscreen", isFullscreen);

  if (isFullscreen) {
    revealControls();
  } else {
    window.clearTimeout(controlsHideTimer);
    dom.player.classList.remove("is-idle");
  }
}

function revealControls() {
  dom.player.classList.remove("is-idle");
  window.clearTimeout(controlsHideTimer);

  if (!document.fullscreenElement || dom.channelSwitcher.classList.contains("is-open")) {
    return;
  }

  controlsHideTimer = window.setTimeout(() => {
    if (document.fullscreenElement && !dom.channelSwitcher.classList.contains("is-open")) {
      dom.player.classList.add("is-idle");
    }
  }, CONTROLS_HIDE_DELAY);
}

function showChannelToast(item) {
  if (!item) {
    return;
  }

  const items = getPlayableItems();
  const itemIndex = items.findIndex((source) => source.sourceUrl === item.sourceUrl);
  const position = itemIndex === -1 ? "" : `Fuente ${itemIndex + 1}/${items.length} · `;

  window.clearTimeout(toastHideTimer);

  dom.channelToast.replaceChildren();
  dom.channelToast.append(
    createElement("strong", "", item.sourceName),
    createElement("span", "", `${position}${item.sourceName === item.name ? `${item.language} / ${item.quality}` : `${item.name} / ${item.language}`}`)
  );
  dom.channelToast.classList.add("is-visible");

  toastHideTimer = window.setTimeout(() => {
    dom.channelToast.classList.remove("is-visible");
  }, TOAST_HIDE_DELAY);
}

async function openPlayer(embed, options = {}) {
  const normalizedEmbed = normalizeEmbed(embed);

  if (!normalizedEmbed) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = normalizedEmbed;
  prepareEmbeds(wrapper);

  dom.playerStage.replaceChildren(...wrapper.childNodes);
  updateActiveChannel(getEmbedSrc(normalizedEmbed));
  toggleChannelSwitcher(false);
  dom.setupPanel.hidden = true;
  dom.player.hidden = false;

  if (!options.keepFullscreen) {
    await enterFullscreen();
  }

  revealControls();
}

function openItem(item, options = {}) {
  const embed = buildIframe(item.sourceUrl);
  dom.input.value = embed;
  openPlayer(embed, options);

  if (options.announce || !dom.player.hidden) {
    showChannelToast(item);
  }
}

async function closePlayer() {
  if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen();
  }

  toggleChannelSwitcher(false);
  dom.player.hidden = true;
  dom.setupPanel.hidden = false;
  dom.playerStage.replaceChildren();
  dom.player.classList.remove("is-idle", "is-fullscreen");
  dom.channelToast.classList.remove("is-visible");
  window.clearTimeout(toastHideTimer);
}

function bindEvents() {
  dom.form.addEventListener("submit", (event) => {
    event.preventDefault();
    openPlayer(dom.input.value);
  });

  dom.demoButton.addEventListener("click", () => {
    const embed = buildIframe(DEMO_URL);
    dom.input.value = embed;
    openPlayer(embed);
  });

  dom.fullscreenButton.addEventListener("click", toggleFullscreen);
  dom.closeButton.addEventListener("click", closePlayer);
  dom.channelsButton.addEventListener("click", () => {
    toggleChannelSwitcher();
    revealControls();
  });
  dom.channelSearch.addEventListener("input", () => {
    searchTerm = normalizeText(dom.channelSearch.value.trim());
    renderChannels();
  });
  dom.player.addEventListener("pointermove", revealControls);
  dom.player.addEventListener("pointerdown", revealControls);
  dom.player.addEventListener("touchstart", revealControls, { passive: true });
  document.addEventListener("fullscreenchange", syncFullscreenButton);

  document.addEventListener("keydown", (event) => {
    if (dom.player.hidden) {
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (["c", "C"].includes(event.key)) {
      event.preventDefault();
      toggleChannelSwitcher();
      revealControls();
      return;
    }

    if (["f", "F"].includes(event.key)) {
      event.preventDefault();
      toggleFullscreen();
      revealControls();
      return;
    }

    if (["e", "E"].includes(event.key)) {
      event.preventDefault();
      closePlayer();
      return;
    }

    if (["ArrowRight", "PageDown", "n", "N"].includes(event.key)) {
      event.preventDefault();
      openItemByOffset(1);
      revealControls();
      return;
    }

    if (["ArrowLeft", "PageUp", "p", "P"].includes(event.key)) {
      event.preventDefault();
      openItemByOffset(-1);
      revealControls();
      return;
    }

    if (event.key === "Escape") {
      if (dom.channelSwitcher.classList.contains("is-open")) {
        toggleChannelSwitcher(false);
        revealControls();
        return;
      }

      closePlayer();
    }
  });
}

renderChannels();
bindEvents();
syncFullscreenButton();
