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

function createChannelButton(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.src = item.sourceUrl;

  const top = createElement("div", "channel-card-top");
  top.append(createFlag(item), createElement("strong", "", item.sourceName));

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
  const worldCupItems = getWorldCupItems();
  dom.channelCount.textContent = `${items.length} fuentes`;
  dom.presetGroups.replaceChildren();
  dom.channelSwitcher.replaceChildren();

  const switcherHeader = createElement("div", "switcher-header");
  const switcherTitle = createElement("div");
  switcherTitle.append(
    createElement("strong", "", "Canales"),
    createElement("span", "", `${items.length} fuentes disponibles`)
  );
  switcherHeader.append(switcherTitle);
  dom.channelSwitcher.append(switcherHeader);

  if (worldCupItems.length) {
    dom.presetGroups.append(createItemsSection("Mundial 2026", worldCupItems, false, "is-worldcup"));
    dom.channelSwitcher.append(createItemsSection("Mundial 2026", worldCupItems, true, "is-worldcup"));
  }

  LANGUAGES.forEach((language) => {
    const languageItems = getRegularItems().filter((item) => item.language === language);

    if (languageItems.length) {
      dom.presetGroups.append(createItemsSection(language, languageItems));
      dom.channelSwitcher.append(createItemsSection(language, languageItems, true));
    }
  });
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

async function requestFullscreen() {
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

  dom.fullscreenButton.setAttribute("aria-label", label);
  dom.fullscreenButton.setAttribute("title", label);
  dom.fullscreenButton.classList.toggle("is-active", isFullscreen);
}

async function openPlayer(embed) {
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
  await requestFullscreen();
}

function openItem(item) {
  const embed = buildIframe(item.sourceUrl);
  dom.input.value = embed;
  openPlayer(embed);
}

async function closePlayer() {
  if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen();
  }

  toggleChannelSwitcher(false);
  dom.player.hidden = true;
  dom.setupPanel.hidden = false;
  dom.playerStage.replaceChildren();
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

  dom.fullscreenButton.addEventListener("click", requestFullscreen);
  dom.closeButton.addEventListener("click", closePlayer);
  dom.channelsButton.addEventListener("click", () => toggleChannelSwitcher());
  document.addEventListener("fullscreenchange", syncFullscreenButton);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || dom.player.hidden) {
      return;
    }

    if (dom.channelSwitcher.classList.contains("is-open")) {
      toggleChannelSwitcher(false);
      return;
    }

    closePlayer();
  });
}

renderChannels();
bindEvents();
syncFullscreenButton();
