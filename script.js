const SELECTORS = {
  form: "#embedForm",
  input: "#embedInput",
  setupPanel: "#setupPanel",
  player: "#player",
  playerStage: "#playerStage",
  closeButton: "#closeButton",
  fullscreenButton: "#fullscreenButton",
  channelsButton: "#channelsButton",
  modeToggleButton: "#modeToggleButton",
  iframeControlButton: "#iframeControlButton",
  demoButton: "#demoButton",
  presetGroups: "#presetGroups",
  channelSwitcher: "#channelSwitcher",
  channelCount: "#channelCount",
  channelToast: "#channelToast",
  channelSearch: "#channelSearch",
  agendaGrid: "#agendaGrid",
  agendaStatus: "#agendaStatus",
  agendaCount: "#agendaCount",
  refreshStreamxButton: "#refreshStreamxButton",
  modeLabel: "#modeLabel",
  modeDescription: "#modeDescription",
  tvOverlay: "#tvOverlay",
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
const STREAMX_CHANNEL_CATEGORY = "streamx-247";
const STREAMX_EVENT_CATEGORY = "streamx-event";
const STREAMX_EVENTS_URL = "/.netlify/functions/streamx-events";
const STREAMX_CHANNELS_URL = "/.netlify/functions/streamx-channels";
const PERU_TIME_ZONE = "America/Lima";
const DEFAULT_ALLOW = "autoplay; encrypted-media; fullscreen; picture-in-picture";
const DEMO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";
const CONTROLS_HIDE_DELAY = 2600;
const TOAST_HIDE_DELAY = 2400;
const SOURCE_NAVIGATION_COOLDOWN = 360;
const PLAYER_MODES = { PC: "pc", TV: "tv" };
let controlsHideTimer = 0;
let toastHideTimer = 0;
let lastSourceNavigationAt = 0;
let searchTerm = "";
let streamxEvents = [];
let streamxChannelItems = [];
let streamxLoading = false;
let streamxError = "";
let currentPlaylist = [];
let currentSourceKey = "";
let tvOverlayLocked = true;
let playerMode = getInitialPlayerMode();

function getInitialPlayerMode() {
  const queryMode = new URLSearchParams(window.location.search).get("mode");

  if (queryMode === PLAYER_MODES.TV || queryMode === PLAYER_MODES.PC) {
    return queryMode;
  }

  const savedMode = window.localStorage.getItem("playerMode");

  if (savedMode === PLAYER_MODES.TV || savedMode === PLAYER_MODES.PC) {
    return savedMode;
  }

  return isLikelyTvDevice() ? PLAYER_MODES.TV : PLAYER_MODES.PC;
}

function isLikelyTvDevice() {
  return /android tv|smart-?tv|tizen|webos|bravia|aft\w*|fire tv|googletv|appletv|crkey|hbbtv/i.test(navigator.userAgent);
}

function isTvMode() {
  return playerMode === PLAYER_MODES.TV;
}

function setPlayerMode(mode, options = {}) {
  playerMode = mode === PLAYER_MODES.TV ? PLAYER_MODES.TV : PLAYER_MODES.PC;

  if (options.persist !== false) {
    window.localStorage.setItem("playerMode", playerMode);
  }

  document.body.classList.toggle("is-tv-mode", isTvMode());
  document.body.classList.toggle("is-pc-mode", !isTvMode());
  dom.player.classList.toggle("is-tv-mode", isTvMode());
  dom.player.classList.toggle("is-pc-mode", !isTvMode());

  document.querySelectorAll("[data-player-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.playerMode === playerMode);
  });

  dom.modeLabel.textContent = isTvMode() ? "TV" : "PC";
  dom.modeDescription.textContent = isTvMode()
    ? "Fullscreen automatico y overlay para control remoto."
    : "Reproduccion sin fullscreen automatico y con iframe libre.";

  dom.modeToggleButton.classList.toggle("is-active", isTvMode());
  dom.modeToggleButton.setAttribute("aria-label", isTvMode() ? "Modo PC" : "Modo TV");
  dom.modeToggleButton.setAttribute("title", isTvMode() ? "Cambiar a PC (T)" : "Cambiar a TV (T)");

  syncTvOverlay();
}

async function togglePlayerMode() {
  setPlayerMode(isTvMode() ? PLAYER_MODES.PC : PLAYER_MODES.TV);

  if (!dom.player.hidden && isTvMode()) {
    await enterFullscreen();
    focusTvOverlay();
  }

  if (!isTvMode() && document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen();
  }

  if (!dom.player.hidden) {
    showChannelToast({
      sourceName: isTvMode() ? "Modo TV activo" : "Modo PC activo",
      name: "Player",
      language: isTvMode() ? "Control remoto" : "Computadora",
      quality: isTvMode() ? "Fullscreen auto" : "Sin fullscreen auto",
      sourceUrl: getCurrentSource(),
    });
  }
}

function getStaticPlayableItems() {
  return CHANNELS.flatMap((channel, channelIndex) => {
    if (!Array.isArray(channel.options) || channel.options.length === 0) {
      return [{ ...channel, sourceName: channel.name, sourceUrl: channel.url, sourceKey: `static:${channelIndex}:0` }];
    }

    return channel.options.map((option, index) => ({
      ...channel,
      sourceName: option.name || `Opción ${index + 1}`,
      sourceUrl: option.url,
      sourceKey: `static:${channelIndex}:${index}`,
    }));
  }).filter((item) => item.sourceUrl);
}

function getPlayableItems() {
  return [...getStaticPlayableItems(), ...streamxChannelItems];
}

function getWorldCupItems() {
  return getPlayableItems().filter((item) => item.category === WORLDCUP_CATEGORY);
}

function getRegularItems() {
  return getPlayableItems().filter((item) => ![WORLDCUP_CATEGORY, STREAMX_CHANNEL_CATEGORY].includes(item.category));
}

function getStreamxChannelItems() {
  return getPlayableItems().filter((item) => item.category === STREAMX_CHANNEL_CATEGORY);
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

async function loadStreamxData(options = {}) {
  streamxLoading = true;
  streamxError = "";
  renderAgenda();

  const [eventsResult, channelsResult] = await Promise.allSettled([
    fetchJson(STREAMX_EVENTS_URL),
    fetchJson(STREAMX_CHANNELS_URL),
  ]);

  if (eventsResult.status === "fulfilled") {
    streamxEvents = normalizeStreamxEvents(eventsResult.value);
  } else {
    streamxEvents = [];
    streamxError = "No se pudo cargar la agenda Stream-XHD.";
  }

  if (channelsResult.status === "fulfilled") {
    streamxChannelItems = normalizeStreamxChannels(channelsResult.value);
  } else {
    streamxChannelItems = [];
    streamxError = streamxError || "No se pudieron cargar los canales 24/7.";
  }

  streamxLoading = false;
  renderAgenda();
  renderChannels();

  if (options.announce && !streamxError) {
    showChannelToast({
      sourceName: "Stream-XHD actualizado",
      name: "Agenda",
      language: `${streamxEvents.length} partidos`,
      quality: `${streamxChannelItems.length} canales`,
      sourceUrl: getCurrentSource(),
    });
  }
}

async function fetchJson(url) {
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${url}`);
  }

  return response.json();
}

function normalizeStreamxEvents(data) {
  const events = [];

  (data?.sports || []).forEach((sport) => {
    (sport.leagues || []).forEach((league) => {
      (league.events || []).forEach((event, index) => {
        if (!isWorldCupEvent(event, league)) {
          return;
        }

        const title = event.title || makeTitleFromTeams(event) || "Partido Mundial";
        const parsedDate = parseStreamxDate(event);

        events.push({
          ...event,
          id: event.id || toBase64Id([title, event.time || event.datetime || event.date || "", index].join("|")),
          title,
          sportName: sport.name || "Football",
          sportIcon: sport.icon || "⚽",
          leagueName: event.league || league.name || "Copa Del Mundo 2026",
          parsedDate,
        });
      });
    });
  });

  return events.sort((a, b) => {
    const statusRank = { live: 0, upcoming: 1, finished: 2 };
    const aStatus = getStreamxStatus(a).key;
    const bStatus = getStreamxStatus(b).key;
    const rankDiff = statusRank[aStatus] - statusRank[bStatus];

    if (rankDiff) {
      return rankDiff;
    }

    return (a.parsedDate?.getTime() || Number.MAX_SAFE_INTEGER) - (b.parsedDate?.getTime() || Number.MAX_SAFE_INTEGER);
  });
}

function isWorldCupEvent(event, league) {
  const text = normalizeText([
    event?.code,
    event?.league,
    event?.competition,
    event?.tournament,
    league?.name,
  ].join(" "));

  return text.includes("mundial") || text.includes("copa del mundo") || text.includes("world cup");
}

function normalizeStreamxChannels(data) {
  const channels = Array.isArray(data) ? data : (data?.channels || data?.canales || []);

  return channels
    .filter((channel) => channel && channel.active !== false && channel.status !== "off")
    .map((channel, index) => {
      const stream = cleanText(channel.stream || channel.codigo || channel.code || channel.id || extractStreamCode(channel.url));
      const url = cleanText(channel.url || (stream ? `https://stream-xhd.com/live1.php?stream=${encodeURIComponent(stream)}` : ""));
      const name = cleanText(channel.name || channel.nombre || channel.title || `Canal ${index + 1}`);

      return {
        name,
        sourceName: name,
        sourceUrl: url,
        sourceKey: `streamx-channel:${index}`,
        language: normalizeStreamxLanguage(channel),
        country: countryToFlagCode(channel.country || channel.pais || channel.category || channel.categoria),
        quality: cleanText(channel.quality || channel.calidad || "720p"),
        type: "Stream-XHD",
        category: STREAMX_CHANNEL_CATEGORY,
      };
    })
    .filter((channel) => channel.sourceUrl && !isBlockedStreamxItem(channel));
}

function extractStreamCode(url) {
  try {
    return new URL(String(url || "")).searchParams.get("stream") || "";
  } catch (error) {
    const match = String(url || "").match(/[?&]stream=([^&]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  }
}

function isBlockedStreamxItem(item) {
  const text = normalizeText([item.name, item.sourceName, item.sourceUrl, item.type].join(" "));
  return ["adult", "adulto", "xxx", "playboy", "venus", "+18", "18+"].some((word) => text.includes(word));
}

function countryToFlagCode(country) {
  const normalized = normalizeText(country).replace(/[^a-z0-9]+/g, " ").trim();
  const map = {
    argentina: "ar",
    brasil: "br",
    brazil: "br",
    canada: "ca",
    chile: "cl",
    colombia: "co",
    ecuador: "ec",
    espana: "es",
    spain: "es",
    estados: "us",
    "estados unidos": "us",
    mexico: "mx",
    paraguay: "py",
    peru: "pe",
    usa: "us",
  };

  return map[normalized] || "world";
}

function normalizeStreamxLanguage(item) {
  const raw = normalizeText([
    item.language,
    item.lang,
    item.idioma,
    item.customLanguages,
    ...(Array.isArray(item.languages) ? item.languages : []),
  ].join(" "));

  if (raw.includes("english") || raw.includes("ingles")) {
    return "English";
  }

  if (raw.includes("spanish") || raw.includes("espanol")) {
    return "Español";
  }

  return "Español";
}

function renderAgenda() {
  dom.agendaGrid.replaceChildren();
  dom.agendaCount.textContent = `${streamxEvents.length} partidos`;

  if (streamxLoading) {
    setAgendaStatus("Cargando agenda Stream-XHD...", false, true);
    return;
  }

  if (streamxError && !streamxEvents.length) {
    setAgendaStatus(`${streamxError} En Netlify funcionara mediante proxy; en servidor local simple puede no estar disponible.`, true, true);
    return;
  }

  if (!streamxEvents.length) {
    setAgendaStatus("No hay partidos Mundial 2026 disponibles ahora mismo.", false, true);
    return;
  }

  setAgendaStatus(streamxError || "Agenda cargada. Selecciona un servidor para abrirlo en el player.", Boolean(streamxError), false);

  streamxEvents.forEach((event) => {
    dom.agendaGrid.append(createAgendaCard(event));
  });
}

function setAgendaStatus(message, isError, isProminent) {
  dom.agendaStatus.textContent = message;
  dom.agendaStatus.classList.toggle("is-error", isError);
  dom.agendaStatus.classList.toggle("is-prominent", isProminent);
}

function createAgendaCard(event) {
  const status = getStreamxStatus(event);
  const servers = getEventServerItems(event);
  const card = createElement("article", `match-card is-${status.key}`);
  const head = createElement("div", "match-head");
  const league = createElement("span", "match-league", event.leagueName || "Mundial 2026");
  const statusPill = createElement("span", `match-status ${status.key}`, status.label);
  const teams = createElement("div", "match-teams");
  const meta = createElement("div", "match-meta");
  const serverLabel = createElement("div", "server-title", servers.length ? `${servers.length} servidores disponibles` : "Servidor pendiente");
  const serverList = createElement("div", "server-list");

  head.append(league, statusPill);
  teams.append(createTeamBlock(event.homeTeam || "Local", event.homeLogo), createElement("strong", "versus", "VS"), createTeamBlock(event.awayTeam || "Visitante", event.awayLogo));
  meta.append(createElement("span", "match-time", formatStreamxTime(event)), createElement("span", "match-date", formatStreamxDate(event)));

  if (servers.length) {
    servers.forEach((serverItem) => {
      const button = createElement("button", "server-chip", serverItem.sourceName);
      button.type = "button";
      button.addEventListener("click", () => openItem(serverItem, { playlist: servers }));
      serverList.append(button);
    });
  } else {
    serverList.append(createElement("span", "server-empty", "Stream pendiente"));
  }

  card.append(head, teams, meta, serverLabel, serverList);
  return card;
}

function createTeamBlock(name, logo) {
  const team = createElement("div", "team-block");
  const mark = createElement("div", "team-mark");

  if (logo) {
    const image = document.createElement("img");
    image.src = logo;
    image.alt = name;
    image.loading = "lazy";
    mark.append(image);
  } else {
    mark.textContent = makeInitials(name);
  }

  team.append(mark, createElement("span", "team-name", name));
  return team;
}

function getEventServerItems(event) {
  const servers = Array.isArray(event.servers) ? event.servers : [];

  return servers
    .filter((server) => server && server.active !== false && server.url)
    .map((server, index) => ({
      sourceName: cleanText(server.name || "Servidor"),
      sourceUrl: cleanText(server.url),
      sourceKey: `streamx-event:${event.id}:${index}`,
      name: event.title || "Mundial 2026",
      language: normalizeStreamxLanguage(server),
      country: "world",
      quality: cleanText(server.quality || "HD"),
      type: "Stream-XHD",
      category: STREAMX_EVENT_CATEGORY,
    }));
}

function getStreamxStatus(event) {
  const explicit = normalizeText(event.status);

  if (explicit === "live") {
    return { key: "live", label: "EN VIVO" };
  }

  if (explicit === "finished") {
    return { key: "finished", label: "FINALIZADO" };
  }

  if (explicit === "upcoming") {
    return { key: "upcoming", label: "PRONTO" };
  }

  const start = event.parsedDate || parseStreamxDate(event);

  if (!start) {
    return { key: "upcoming", label: "PRONTO" };
  }

  const now = new Date();
  const duration = Number(event.duration || 130) + Number(event.extraTime || 0);
  const end = new Date(start.getTime() + duration * 60000);

  if (now >= start && now <= end) {
    return { key: "live", label: "EN VIVO" };
  }

  if (now > end) {
    return { key: "finished", label: "FINALIZADO" };
  }

  return { key: "upcoming", label: "PRONTO" };
}

function parseStreamxDate(event) {
  const value = event.time || event.datetime || event.date;
  const sourceTimeZone = event.timezone || event.tz || PERU_TIME_ZONE;

  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(text)) {
    const direct = new Date(text);
    return Number.isNaN(direct.getTime()) ? null : direct;
  }

  const match = text.replace("T", " ").match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) {
    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  return zonedTimeToDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] || 0),
    sourceTimeZone
  );
}

function zonedTimeToDate(year, month, day, hour, minute, second, timeZone) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const parts = getZoneParts(utcGuess, timeZone);
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const wantedUTC = Date.UTC(year, month - 1, day, hour, minute, second);

  return new Date(utcGuess.getTime() - (asUTC - wantedUTC));
}

function getZoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const result = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      result[part.type] = Number(part.value);
    }
  });

  return result;
}

function formatStreamxTime(event) {
  const date = event.parsedDate || parseStreamxDate(event);

  if (!date) {
    return "Horario pendiente";
  }

  return new Intl.DateTimeFormat("es-PE", {
    timeZone: PERU_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatStreamxDate(event) {
  const date = event.parsedDate || parseStreamxDate(event);

  if (!date) {
    return "Hora Peru";
  }

  return `${new Intl.DateTimeFormat("es-PE", {
    timeZone: PERU_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date)} · Hora Peru`;
}

function makeTitleFromTeams(event) {
  return event.homeTeam && event.awayTeam ? `${event.homeTeam} vs ${event.awayTeam}` : "";
}

function makeInitials(value) {
  return String(value || "TV")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "TV";
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function toBase64Id(value) {
  return btoa(unescape(encodeURIComponent(value))).replace(/=/g, "");
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
  button.dataset.sourceKey = getItemKey(item);

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
  button.addEventListener("click", () => openItem(item, { playlist: getPlayableItems() }));
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
  const streamxItems = getVisibleItems(getStreamxChannelItems());
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

  if (streamxItems.length) {
    dom.presetGroups.append(createItemsSection("Stream-XHD 24/7", streamxItems, false, "is-streamx"));
    dom.channelSwitcher.append(createItemsSection("Stream-XHD 24/7", streamxItems, true, "is-streamx"));
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

function toggleChannelSwitcher(force, options = {}) {
  const isOpen = typeof force === "boolean"
    ? dom.channelSwitcher.classList.toggle("is-open", force)
    : dom.channelSwitcher.classList.toggle("is-open");

  dom.channelsButton.setAttribute("aria-expanded", String(isOpen));

  if (isOpen && options.focus) {
    focusActiveSwitcherItem();
  }

  if (!isOpen && isTvMode()) {
    focusTvOverlay();
  }

  return isOpen;
}

function focusActiveSwitcherItem() {
  window.setTimeout(() => {
    const target = dom.channelSwitcher.querySelector("button.is-active") || dom.channelSwitcher.querySelector("button");
    target?.focus({ preventScroll: false });
  }, 0);
}

function updateActiveChannel(src, sourceKey = "") {
  document.querySelectorAll("[data-src]").forEach((button) => {
    const isActive = sourceKey
      ? button.dataset.sourceKey === sourceKey
      : button.dataset.src === src;

    button.classList.toggle("is-active", isActive);
  });
}

function getCurrentSource() {
  const frame = dom.playerStage.querySelector("iframe");
  return frame?.getAttribute("src") || "";
}

function getCurrentSourceIndex() {
  const currentSource = getCurrentSource();
  const items = getNavigationItems();

  if (currentSourceKey) {
    const keyIndex = items.findIndex((item) => getItemKey(item) === currentSourceKey);

    if (keyIndex !== -1) {
      return keyIndex;
    }
  }

  return items.findIndex((item) => item.sourceUrl === currentSource);
}

function getNavigationItems() {
  return currentPlaylist.length ? currentPlaylist : getPlayableItems();
}

function getItemKey(item) {
  return item?.sourceKey || item?.sourceUrl || "";
}

function openItemByOffset(offset) {
  const items = getNavigationItems();

  if (!items.length) {
    return;
  }

  const currentIndex = getCurrentSourceIndex();
  const safeIndex = currentIndex === -1 ? (offset > 0 ? -1 : 0) : currentIndex;
  const nextIndex = (safeIndex + offset + items.length) % items.length;
  openItem(items[nextIndex], { keepFullscreen: true, announce: true, playlist: items, keepPlaylist: true });
}

function canRunSourceNavigation(event) {
  if (event?.repeat) {
    return false;
  }

  const now = performance.now();

  if (lastSourceNavigationAt && now - lastSourceNavigationAt < SOURCE_NAVIGATION_COOLDOWN) {
    return false;
  }

  lastSourceNavigationAt = now;
  return true;
}

function isTvOverlayActive() {
  return isTvMode() && tvOverlayLocked && !dom.player.hidden;
}

function syncTvOverlay() {
  const active = isTvOverlayActive();

  dom.tvOverlay.classList.toggle("is-active", active);
  dom.tvOverlay.setAttribute("tabindex", active ? "0" : "-1");
  dom.player.classList.toggle("is-tv-overlay-active", active);
  dom.iframeControlButton.classList.toggle("is-active", active);
  dom.iframeControlButton.hidden = !isTvMode();
  dom.iframeControlButton.setAttribute("aria-label", active ? "Liberar iframe" : "Recuperar control TV");
  dom.iframeControlButton.setAttribute("title", active ? "Liberar iframe (I)" : "Recuperar control TV (I)");
}

function focusTvOverlay() {
  if (!isTvOverlayActive()) {
    return;
  }

  window.setTimeout(() => {
    dom.tvOverlay.focus({ preventScroll: true });
  }, 0);
}

function toggleIframeControl() {
  if (!isTvMode()) {
    return;
  }

  tvOverlayLocked = !tvOverlayLocked;
  syncTvOverlay();

  showChannelToast({
    sourceName: tvOverlayLocked ? "Control TV recuperado" : "Iframe liberado",
    name: "Modo TV",
    language: tvOverlayLocked ? "Flechas activas" : "El reproductor recibe el control",
    quality: "TV",
    sourceUrl: getCurrentSource(),
  });

  if (tvOverlayLocked) {
    focusTvOverlay();
  }
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

  const items = getNavigationItems();
  const itemKey = getItemKey(item);
  const itemIndex = items.findIndex((source) => getItemKey(source) === itemKey);
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

  currentSourceKey = options.sourceKey || "";
  dom.playerStage.replaceChildren(...wrapper.childNodes);
  updateActiveChannel(getEmbedSrc(normalizedEmbed), currentSourceKey);
  toggleChannelSwitcher(false);
  dom.setupPanel.hidden = true;
  dom.player.hidden = false;
  syncTvOverlay();

  if (!options.keepFullscreen && (isTvMode() || options.forceFullscreen)) {
    await enterFullscreen();
  }

  focusTvOverlay();
  revealControls();
}

function openItem(item, options = {}) {
  if (Array.isArray(options.playlist)) {
    currentPlaylist = options.playlist.filter((source) => source && source.sourceUrl);
  } else if (!options.keepPlaylist) {
    currentPlaylist = getPlayableItems();
  }

  const embed = buildIframe(item.sourceUrl);
  dom.input.value = embed;
  openPlayer(embed, { ...options, sourceKey: getItemKey(item) });

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
  currentPlaylist = [];
  currentSourceKey = "";
  syncTvOverlay();
  window.clearTimeout(toastHideTimer);
}

async function handleBackNavigation() {
  if (dom.player.hidden) {
    return;
  }

  if (dom.channelSwitcher.classList.contains("is-open")) {
    toggleChannelSwitcher(false);
    revealControls();
    return;
  }

  await closePlayer();
}

function isTypingTarget(element) {
  if (!element) {
    return false;
  }

  const tagName = element.tagName?.toLowerCase();
  return element.isContentEditable || ["input", "textarea", "select"].includes(tagName);
}

function moveSwitcherFocus(direction) {
  const buttons = Array.from(dom.channelSwitcher.querySelectorAll("button"));

  if (!buttons.length) {
    return;
  }

  const currentIndex = buttons.indexOf(document.activeElement);
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + direction + buttons.length) % buttons.length;

  buttons[nextIndex].focus({ preventScroll: false });
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

  document.querySelectorAll("[data-player-mode]").forEach((button) => {
    button.addEventListener("click", () => setPlayerMode(button.dataset.playerMode));
  });

  dom.refreshStreamxButton.addEventListener("click", () => {
    loadStreamxData({ announce: true });
  });

  dom.fullscreenButton.addEventListener("click", toggleFullscreen);
  dom.modeToggleButton.addEventListener("click", togglePlayerMode);
  dom.iframeControlButton.addEventListener("click", toggleIframeControl);
  dom.closeButton.addEventListener("click", handleBackNavigation);
  dom.channelsButton.addEventListener("click", () => {
    toggleChannelSwitcher(undefined, { focus: isTvMode() });
    revealControls();
  });
  dom.channelSearch.addEventListener("input", () => {
    searchTerm = normalizeText(dom.channelSearch.value.trim());
    renderChannels();
  });
  dom.player.addEventListener("pointermove", revealControls);
  dom.player.addEventListener("pointerdown", revealControls);
  dom.player.addEventListener("touchstart", revealControls, { passive: true });
  dom.tvOverlay.addEventListener("click", () => {
    toggleChannelSwitcher(true, { focus: true });
    revealControls();
  });
  dom.channelSwitcher.addEventListener("keydown", (event) => {
    if (["ArrowDown", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      moveSwitcherFocus(1);
      return;
    }

    if (["ArrowUp", "ArrowLeft"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      moveSwitcherFocus(-1);
      return;
    }

    if (["Escape", "Backspace", "BrowserBack", "GoBack"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      toggleChannelSwitcher(false);
    }
  });
  document.addEventListener("fullscreenchange", syncFullscreenButton);

  document.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target) && event.key !== "Escape") {
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (["t", "T"].includes(event.key)) {
      event.preventDefault();
      togglePlayerMode();
      revealControls();
      return;
    }

    if (dom.player.hidden) {
      return;
    }

    if (["i", "I"].includes(event.key)) {
      event.preventDefault();
      toggleIframeControl();
      revealControls();
      return;
    }

    if (["c", "C"].includes(event.key)) {
      event.preventDefault();
      toggleChannelSwitcher(undefined, { focus: isTvMode() });
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
      handleBackNavigation();
      return;
    }

    if (isTvMode() && event.key === "Enter") {
      event.preventDefault();
      toggleChannelSwitcher(true, { focus: true });
      revealControls();
      return;
    }

    if (isTvMode() && ["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      toggleChannelSwitcher(true, { focus: true });
      revealControls();
      return;
    }

    if (["ArrowRight", "PageDown", "n", "N"].includes(event.key)) {
      event.preventDefault();
      if (canRunSourceNavigation(event)) {
        openItemByOffset(1);
      }
      revealControls();
      return;
    }

    if (["ArrowLeft", "PageUp", "p", "P"].includes(event.key)) {
      event.preventDefault();
      if (canRunSourceNavigation(event)) {
        openItemByOffset(-1);
      }
      revealControls();
      return;
    }

    if (["Escape", "Backspace", "BrowserBack", "GoBack"].includes(event.key)) {
      event.preventDefault();
      handleBackNavigation();
    }
  });
}

setPlayerMode(playerMode, { persist: false });
renderAgenda();
renderChannels();
bindEvents();
syncFullscreenButton();
loadStreamxData();
