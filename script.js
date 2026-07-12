const SELECTORS = {
  form: "#embedForm",
  input: "#embedInput",
  setupPanel: "#setupPanel",
  player: "#player",
  playerGrid: "#playerGrid",
  primaryPlayerPane: "#primaryPlayerPane",
  primaryPaneMatch: "#primaryPaneMatch",
  playerStage: "#playerStage",
  secondaryPlayerPane: "#secondaryPlayerPane",
  secondaryPaneMatch: "#secondaryPaneMatch",
  secondaryPlayerStage: "#secondaryPlayerStage",
  closeButton: "#closeButton",
  fullscreenButton: "#fullscreenButton",
  channelsButton: "#channelsButton",
  retrySourceButton: "#retrySourceButton",
  splitButton: "#splitButton",
  closeSplitButton: "#closeSplitButton",
  modeToggleButton: "#modeToggleButton",
  embedSecurityButton: "#embedSecurityButton",
  iframeControlButton: "#iframeControlButton",
  demoButton: "#demoButton",
  presetGroups: "#presetGroups",
  channelSwitcher: "#channelSwitcher",
  channelCount: "#channelCount",
  channelToast: "#channelToast",
  channelSearch: "#channelSearch",
  agendaViewTabs: "#agendaViewTabs",
  pageTitle: "#pageTitle",
  pageSubtitle: "#pageSubtitle",
  agendaFilter: "#agendaFilter",
  agendaFilterButton: "#agendaFilterButton",
  agendaFilterLabel: "#agendaFilterLabel",
  highlightsCard: "#highlightsCard",
  agendaGrid: "#agendaGrid",
  agendaStatus: "#agendaStatus",
  agendaSportShell: "#agendaSportShell",
  agendaSportTabs: "#agendaSportTabs",
  agendaDateShell: "#agendaDateShell",
  agendaDateTabs: "#agendaDateTabs",
  agendaCount: "#agendaCount",
  lastUpdated: "#lastUpdated",
  refreshStreamxButton: "#refreshStreamxButton",
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
// Fixed fallback for the World Cup badge when a match has no TheSportsDB
// `strLeagueBadge`. Swap this URL for the exact 2026 emblem if you prefer.
const WORLDCUP_BADGE_FALLBACK = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/FIFA_logo_without_slogan.svg/240px-FIFA_logo_without_slogan.svg.png";
const AGENDA_VIEWS = {
  today: { label: "Hoy", title: "Hoy", subtitle: "Partidos de hoy" },
  results: { label: "Resultados", title: "Resultados", subtitle: "Marcadores finales" },
  upcoming: { label: "Próximos", title: "Próximos", subtitle: "Siguientes partidos" },
  all: { label: "Todos", title: "World Cup", subtitle: "Partidos y resultados" },
  favorites: { label: "Favoritos", title: "Favoritos", subtitle: "Tus eventos guardados" },
};
const DEFAULT_AGENDA_SPORTS = [
  { key: "soccer", label: "Futbol" },
  { key: "mma", label: "UFC / MMA" },
  { key: "boxing", label: "Boxeo" },
  { key: "combat", label: "Peleas" },
  { key: "baseball", label: "Beisbol" },
  { key: "basketball", label: "Basquet" },
  { key: "tennis", label: "Tenis" },
  { key: "motorsport", label: "Motor" },
  { key: "american-football", label: "NFL" },
  { key: "volleyball", label: "Voley" },
  { key: "rugby", label: "Rugby" },
  { key: "hockey", label: "Hockey" },
  { key: "golf", label: "Golf" },
  { key: "cycling", label: "Ciclismo" },
  { key: "wrestling", label: "Lucha" },
  { key: "cricket", label: "Cricket" },
  { key: "esports", label: "eSports" },
];
const AGENDA_SPORT_ICONS = {
  all: "grid",
  [WORLDCUP_CATEGORY]: "cup",
  soccer: "soccer",
  mma: "octagon",
  boxing: "glove",
  combat: "bolt",
  baseball: "baseball",
  basketball: "basketball",
  tennis: "tennis",
  motorsport: "flag",
  "american-football": "football",
  volleyball: "volleyball",
  rugby: "rugby",
  hockey: "stick",
  golf: "golf",
  cycling: "wheel",
  wrestling: "ring",
  cricket: "bat",
  esports: "pad",
};
const INDIVIDUAL_MATCHUP_SPORTS = new Set(["mma", "boxing", "combat", "tennis", "wrestling"]);
const SPORT_PALETTES = {
  soccer: [[38, 166, 91], [218, 176, 54]],
  mma: [[207, 42, 54], [194, 142, 48]],
  boxing: [[211, 48, 57], [48, 92, 190]],
  combat: [[205, 58, 45], [226, 157, 55]],
  baseball: [[44, 92, 176], [207, 50, 63]],
  basketball: [[222, 112, 43], [94, 54, 167]],
  tennis: [[117, 52, 190], [19, 145, 84]],
  motorsport: [[220, 48, 45], [35, 153, 188]],
  "american-football": [[39, 92, 168], [204, 57, 64]],
  volleyball: [[38, 132, 182], [230, 154, 45]],
  rugby: [[28, 137, 82], [181, 50, 55]],
  hockey: [[48, 115, 184], [191, 48, 55]],
  golf: [[28, 139, 79], [193, 159, 54]],
  cycling: [[225, 155, 42], [41, 137, 177]],
  wrestling: [[171, 48, 142], [211, 95, 44]],
  cricket: [[43, 143, 92], [43, 103, 174]],
  esports: [[117, 60, 199], [35, 159, 181]],
  worldcup: [[22, 77, 155], [183, 35, 55]],
  generic: [[115, 65, 184], [24, 139, 93]],
};
const STREAMX_CHANNEL_CATEGORY = "streamx-247";
const STREAMX_EVENT_CATEGORY = "streamx-event";
const STREAMX_EVENTS_URL = "/.netlify/functions/streamx-events";
const STREAMX_CHANNELS_URL = "/.netlify/functions/streamx-channels";
const THESPORTSDB_EVENTS_URL = "/.netlify/functions/thesportsdb-events";
const PARTICIPANT_PROFILES_URL = "/.netlify/functions/participant-profiles";
const IMAGE_PROXY_URL = "/.netlify/functions/image-proxy";
const EVENT_ARTWORK_URL = "/.netlify/functions/event-artwork";
const STREAMX_CANONICAL_HOST = "streamx-hd.com";
const STREAMX_CANONICAL_ORIGIN = `https://${STREAMX_CANONICAL_HOST}`;
const STREAMX_LEGACY_HOSTS = new Set(["stream-xhd.com", "www.stream-xhd.com"]);
const WORLDCUP_GAMES_URL = "/.netlify/functions/worldcup-games";
const PERU_TIME_ZONE = "America/Lima";
const DEFAULT_ALLOW = "autoplay; encrypted-media; fullscreen; picture-in-picture";
const EMBED_SANDBOX = "allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-orientation-lock allow-storage-access-by-user-activation";
const DEMO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";
const CONTROLS_HIDE_DELAY = 2600;
const TOAST_HIDE_DELAY = 2400;
const SOURCE_NAVIGATION_COOLDOWN = 360;
const WORLD_CUP_LIVE_REFRESH_INTERVAL = 30000;
const WORLD_CUP_SOON_REFRESH_INTERVAL = 60000;
const WORLD_CUP_IDLE_REFRESH_INTERVAL = 300000;
const STREAMX_REFRESH_INTERVAL = 120000;
const CHANNELS_REFRESH_INTERVAL = 600000;
const CLIENT_FETCH_TIMEOUT_MS = 10000;
const UPCOMING_LIVE_CHECK_WINDOW = 45 * 60000;
const BILLBOARD_PREVIEW_TIMEOUT = 12000;
const WORLDCUP_BILLBOARD_WINDOW = 2 * 60 * 60 * 1000;
const PLAYER_MODES = { PC: "pc", TV: "tv" };
const PLAYER_PANES = { PRIMARY: "primary", SECONDARY: "secondary" };
const SIMULTANEOUS_MATCH_TOLERANCE = 15 * 60000;
const REMOTE_DEBUG_ENABLED = new URLSearchParams(window.location.search).has("debugRemote");
const REMOTE_ACTION_BY_KEY = {
  ArrowUp: "up",
  Up: "up",
  ArrowDown: "down",
  Down: "down",
  ArrowLeft: "left",
  Left: "left",
  ArrowRight: "right",
  Right: "right",
  Enter: "ok",
  Accept: "ok",
  Select: "ok",
  " ": "ok",
  Spacebar: "ok",
  Escape: "back",
  Esc: "back",
  Backspace: "back",
  BrowserBack: "back",
  GoBack: "back",
  Back: "back",
  ContextMenu: "menu",
  Menu: "menu",
  PageDown: "next",
  PageUp: "previous",
  ChannelUp: "channelUp",
  ChannelDown: "channelDown",
  MediaTrackNext: "next",
  MediaTrackPrevious: "previous",
  MediaPlayPause: "playPause",
};
const REMOTE_ACTION_BY_CODE = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "ok",
  NumpadEnter: "ok",
  Space: "ok",
  Escape: "back",
  Backspace: "back",
  PageDown: "next",
  PageUp: "previous",
};
const REMOTE_ACTION_BY_KEY_CODE = {
  4: "back",
  13: "ok",
  19: "up",
  20: "down",
  21: "left",
  22: "right",
  23: "ok",
  37: "left",
  38: "up",
  39: "right",
  40: "down",
  66: "ok",
  82: "menu",
  85: "playPause",
  87: "next",
  88: "previous",
  92: "previous",
  93: "next",
  111: "back",
  160: "ok",
  166: "channelUp",
  167: "channelDown",
  461: "back",
};
const REMOTE_TV_ACTIVATION_KEY_CODES = new Set([4, 19, 20, 21, 22, 23, 66, 82, 87, 88, 92, 93, 111, 160, 166, 167]);
const REMOTE_TV_ACTIVATION_KEYS = new Set(["Accept", "Select", "GoBack", "BrowserBack", "ChannelUp", "ChannelDown", "MediaTrackNext", "MediaTrackPrevious"]);
const pendingFetches = new Map();
let controlsHideTimer = 0;
let toastHideTimer = 0;
let remoteDebugTimer = 0;
let scoreRefreshTimer = 0;
let streamxRefreshTimer = 0;
let channelsRefreshTimer = 0;
let lastSourceNavigationAt = 0;
let searchTerm = "";
let streamxEvents = [];
let streamxChannelItems = [];
let worldcupGames = [];
let sportsDbEvents = [];
let participantProfiles = new Map();
const imagePaletteCache = new Map();
const eventPaletteCache = new Map();
const eventArtworkCache = new Map();
let pagePaletteRequest = 0;
let streamxLoading = false;
let worldcupLoading = false;
let sportsDbLoading = false;
let streamxError = "";
let channelsError = "";
let worldcupError = "";
let sportsDbError = "";
let streamxDataLoading = false;
let selectedAgendaDate = "";
let agendaDateManuallySelected = false;
let selectedAgendaSport = "all";
let selectedAgendaView = "all";
let favoriteEventKeys = loadFavoriteEventKeys();
let countdownRefreshTimer = 0;
let lastWorldcupLoadedAt = 0;
let lastStreamxLoadedAt = 0;
let lastChannelsLoadedAt = 0;
let lastSportsDbLoadedAt = 0;
const playerPaneStates = {
  [PLAYER_PANES.PRIMARY]: createPaneState(),
  [PLAYER_PANES.SECONDARY]: createPaneState(),
};
let activePaneId = PLAYER_PANES.PRIMARY;
let channelSwitcherTargetPaneId = "";
let tvOverlayLocked = true;
let embedProtectionEnabled = false;
let tvHomeFocusInitialized = false;
let playerHistoryActive = false;
let ignoreNextPopState = false;
let playerReturnFocusElement = null;
let playerMode = getInitialPlayerMode();

function getInitialPlayerMode() {
  const queryMode = new URLSearchParams(window.location.search).get("mode");

  if (queryMode === PLAYER_MODES.TV || queryMode === PLAYER_MODES.PC) {
    return queryMode;
  }

  const savedMode = safeStorageGet("playerMode");

  if (savedMode === PLAYER_MODES.TV || savedMode === PLAYER_MODES.PC) {
    return savedMode;
  }

  return isLikelyTvDevice() ? PLAYER_MODES.TV : PLAYER_MODES.PC;
}

function isLikelyTvDevice() {
  const userAgent = navigator.userAgent || "";
  const normalized = normalizeText(userAgent);
  const explicitTv = /android tv|smart-?tv|tizen|webos|bravia|aft\w*|fire tv|google ?tv|googletv|appletv|crkey|chromecast|hbbtv|mibox|mi box|mitv|xiaomi.*(tv|box)|shield android tv|nexus player|adt-\w+|onn\.? android tv/i.test(userAgent);
  const androidLargeScreen = normalized.includes("android") && !normalized.includes("mobile") && isLargeLandscapeDisplay();
  const coarseLargeScreen = isLargeLandscapeDisplay() && Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);

  return explicitTv || (androidLargeScreen && coarseLargeScreen);
}

function isIosDevice() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent || "")
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isLargeLandscapeDisplay() {
  const screenWidth = window.screen?.width || window.innerWidth;
  const screenHeight = window.screen?.height || window.innerHeight;
  const largeScreen = Math.max(screenWidth, screenHeight) >= 960 && Math.max(window.innerWidth, window.innerHeight) >= 860;
  const landscape = Boolean(window.matchMedia?.("(orientation: landscape)")?.matches) || window.innerWidth >= window.innerHeight;

  return largeScreen && landscape;
}

function isCompactViewport() {
  return Boolean(window.matchMedia?.("(max-width: 860px)")?.matches) || window.innerWidth <= 860;
}

function isTvMode() {
  return playerMode === PLAYER_MODES.TV;
}

function createPaneState() {
  return {
    item: null,
    match: null,
    playlist: [],
    playlistTitle: "",
    sourceKey: "",
  };
}

function getPaneState(paneId = activePaneId) {
  return playerPaneStates[paneId] || playerPaneStates[PLAYER_PANES.PRIMARY];
}

function getPaneStage(paneId = activePaneId) {
  return paneId === PLAYER_PANES.SECONDARY ? dom.secondaryPlayerStage : dom.playerStage;
}

function getPaneMatchElement(paneId = activePaneId) {
  return paneId === PLAYER_PANES.SECONDARY ? dom.secondaryPaneMatch : dom.primaryPaneMatch;
}

function getPaneLabel(paneId = activePaneId) {
  return paneId === PLAYER_PANES.SECONDARY ? "Ventana 2" : "Ventana 1";
}

function getSwitcherPaneId() {
  return channelSwitcherTargetPaneId || activePaneId;
}

function isSplitMode() {
  return !dom.secondaryPlayerPane.hidden;
}

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Storage can be blocked in some embedded TV browsers.
  }
}

function loadFavoriteEventKeys() {
  try {
    const values = JSON.parse(safeStorageGet("favoriteEvents") || "[]");
    return new Set(Array.isArray(values) ? values : []);
  } catch (error) {
    return new Set();
  }
}

function getEventKeyCode(event) {
  return Number(event.keyCode || event.which || event.charCode || 0);
}

function normalizeRemoteAction(event) {
  if (!event) {
    return "";
  }

  const keyCode = getEventKeyCode(event);
  return REMOTE_ACTION_BY_KEY[event.key]
    || REMOTE_ACTION_BY_CODE[event.code]
    || REMOTE_ACTION_BY_KEY_CODE[keyCode]
    || "";
}

function isRemoteLikeEvent(event, action) {
  const keyCode = getEventKeyCode(event);

  return REMOTE_TV_ACTIVATION_KEY_CODES.has(keyCode)
    || REMOTE_TV_ACTIVATION_KEYS.has(event.key)
    || (["up", "down", "left", "right", "ok", "back"].includes(action) && isLikelyTvDevice());
}

function activateTvModeFromRemote(event, action) {
  if (isTvMode() || !action || !isRemoteLikeEvent(event, action)) {
    return;
  }

  tvOverlayLocked = true;
  setPlayerMode(PLAYER_MODES.TV);

  if (!dom.player.hidden) {
    focusTvOverlay();
  }
}

function showRemoteDebug(event, action) {
  if (!REMOTE_DEBUG_ENABLED) {
    return;
  }

  let panel = document.getElementById("remoteDebugPanel");

  if (!panel) {
    panel = createElement("div", "remote-debug");
    panel.id = "remoteDebugPanel";
    document.body.append(panel);
  }

  panel.textContent = `remote key=${event.key || "-"} code=${event.code || "-"} keyCode=${getEventKeyCode(event) || "-"} action=${action || "-"} mode=${playerMode}`;
  panel.classList.add("is-visible");
  window.clearTimeout(remoteDebugTimer);
  remoteDebugTimer = window.setTimeout(() => panel.classList.remove("is-visible"), 6000);
}

function setPlayerMode(mode, options = {}) {
  playerMode = mode === PLAYER_MODES.TV ? PLAYER_MODES.TV : PLAYER_MODES.PC;

  if (options.persist !== false) {
    safeStorageSet("playerMode", playerMode);
  }

  document.body.classList.toggle("is-tv-mode", isTvMode());
  document.body.classList.toggle("is-pc-mode", !isTvMode());
  dom.player.classList.toggle("is-tv-mode", isTvMode());
  dom.player.classList.toggle("is-pc-mode", !isTvMode());

  document.querySelectorAll("[data-player-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.playerMode === playerMode);
    button.setAttribute("aria-pressed", String(button.dataset.playerMode === playerMode));
  });

  dom.modeToggleButton.classList.toggle("is-active", isTvMode());
  dom.modeToggleButton.setAttribute("aria-pressed", String(isTvMode()));
  dom.modeToggleButton.setAttribute("aria-label", "Modo TV");
  dom.modeToggleButton.setAttribute("title", isTvMode() ? "Cambiar a PC (T)" : "Cambiar a TV (T)");

  syncTvOverlay();

  if (isTvMode() && dom.player.hidden) {
    tvHomeFocusInitialized = false;
    focusTvHomeFirst();
  }
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
  }).map((item) => ({ ...item, sourceUrl: canonicalizeStreamxUrl(item.sourceUrl) }))
    .filter((item) => item.sourceUrl);
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
  if (streamxDataLoading) {
    return;
  }

  streamxDataLoading = true;
  setRefreshButtonLoading(true);

  try {
    await Promise.allSettled([
      loadStreamxSchedule({ forceRefresh: options.forceRefresh }),
      loadStreamxChannels({ forceRefresh: options.forceRefresh }),
      loadWorldcupGames({ forceRefresh: options.forceRefresh }),
    ]);

    focusTvHomeFirst();

    if (options.announce && !streamxError && !channelsError && !worldcupError && !sportsDbError) {
      showChannelToast({
        sourceName: "Agenda actualizada",
        name: "Agenda",
        language: `${buildAgendaEvents().length} eventos`,
        quality: `${streamxChannelItems.length} canales 24/7`,
        sourceUrl: getCurrentSource(),
      });
    }
  } finally {
    streamxDataLoading = false;
    setRefreshButtonLoading(false);
  }
}

function setRefreshButtonLoading(isLoading) {
  dom.refreshStreamxButton.disabled = isLoading;
  dom.refreshStreamxButton.setAttribute("aria-busy", String(isLoading));
  dom.refreshStreamxButton.textContent = isLoading ? "Actualizando..." : "Actualizar agenda";
}

function getCollectionSignature(items) {
  return JSON.stringify((items || []).map((item) => [
    item.id,
    item.title,
    item.status,
    item.parsedDate?.getTime?.() || "",
    item.homeScore,
    item.awayScore,
    item.time_elapsed,
    item.finished,
    (item.servers || []).map((server) => `${server.active !== false}:${server.url}`).join("|"),
  ]));
}

async function loadWorldcupGames(options = {}) {
  const showLoadingState = !worldcupGames.length;
  let changed = false;
  worldcupLoading = true;
  worldcupError = "";
  if (showLoadingState) renderAgenda();

  try {
    const nextGames = normalizeWorldcupGames(await fetchJson(WORLDCUP_GAMES_URL, {
      forceRefresh: options.forceRefresh,
    }));
    changed = getCollectionSignature(nextGames) !== getCollectionSignature(worldcupGames);
    worldcupGames = nextGames;
    lastWorldcupLoadedAt = Date.now();
  } catch (error) {
    worldcupError = worldcupGames.length
      ? "No se pudo actualizar el marcador World Cup. Se mantiene el ultimo dato disponible."
      : "No se pudo cargar el marcador World Cup.";
  }

  worldcupLoading = false;
  if (changed || showLoadingState) renderAgenda();

  if (scoreRefreshTimer) {
    scheduleWorldcupRefresh();
  }

  if (options.announce && !worldcupError) {
    showChannelToast({
      sourceName: "Marcador actualizado",
      name: "World Cup API",
      language: `${worldcupGames.length} partidos`,
      quality: hasLiveWorldcupGame() ? "En vivo" : "Agenda",
      sourceUrl: getCurrentSource(),
    });
  }
}

async function loadStreamxSchedule(options = {}) {
  const showLoadingState = !streamxEvents.length;
  let changed = false;
  streamxLoading = true;
  streamxError = "";
  if (showLoadingState) renderAgenda();

  try {
    const nextEvents = normalizeStreamxEvents(await fetchJson(STREAMX_EVENTS_URL, {
      forceRefresh: options.forceRefresh,
    }));
    changed = getCollectionSignature(nextEvents) !== getCollectionSignature(streamxEvents);
    streamxEvents = nextEvents;
    lastStreamxLoadedAt = Date.now();
    updateLastUpdatedLabel();
  } catch (error) {
    streamxError = streamxEvents.length
      ? "No se pudo actualizar la agenda StreamX-HD. Se mantiene el ultimo dato disponible."
      : "No se pudo cargar la agenda StreamX-HD.";
  }

  streamxLoading = false;
  if (changed || showLoadingState) {
    renderAgenda();
    renderChannelSwitcher();
  }

  if (!streamxError) {
    await Promise.allSettled([
      loadSportsDbEvents({ forceRefresh: options.forceRefresh }),
      loadParticipantProfiles(),
    ]);
  }

  if (options.announce && !streamxError) {
    showChannelToast({
      sourceName: "Servidores actualizados",
      name: "StreamX-HD",
      language: `${streamxEvents.length} eventos`,
      quality: "Agenda",
      sourceUrl: getCurrentSource(),
    });
  }
}

async function loadStreamxChannels(options = {}) {
  try {
    channelsError = "";
    streamxChannelItems = normalizeStreamxChannels(await fetchJson(STREAMX_CHANNELS_URL, {
      forceRefresh: options.forceRefresh,
    }));
    lastChannelsLoadedAt = Date.now();
    renderChannels();
  } catch (error) {
    channelsError = streamxChannelItems.length
      ? "No se pudieron actualizar los canales 24/7. Se mantiene el ultimo dato disponible."
      : "No se pudieron cargar los canales 24/7.";
  }

}

async function loadSportsDbEvents(options = {}) {
  const dates = Array.from(new Set(getAvailableAgendaDates(streamxEvents).flatMap((dateKey) => {
    const date = dateFromPeruKey(dateKey);
    if (!date) return [dateKey];
    return [-1, 0, 1].map((offset) => getPeruDateKey(new Date(date.getTime() + offset * 86400000)));
  }))).sort().slice(0, 7);

  if (!dates.length) {
    sportsDbEvents = [];
    sportsDbError = "";
    renderAgenda();
    return;
  }

  const showLoadingState = !sportsDbEvents.length;
  let changed = false;
  sportsDbLoading = true;
  sportsDbError = "";
  if (showLoadingState) renderAgenda();

  try {
    const nextEvents = normalizeSportsDbEvents(await fetchJson(`${THESPORTSDB_EVENTS_URL}?dates=${encodeURIComponent(dates.join(","))}`, {
      forceRefresh: options.forceRefresh,
    }));
    changed = getCollectionSignature(nextEvents) !== getCollectionSignature(sportsDbEvents);
    sportsDbEvents = nextEvents;
    lastSportsDbLoadedAt = Date.now();
  } catch (error) {
    sportsDbError = sportsDbEvents.length
      ? "No se pudo actualizar TheSportsDB. Se mantiene el ultimo dato disponible."
      : "No se pudo cargar TheSportsDB.";
  }

  sportsDbLoading = false;
  if (changed || showLoadingState) renderAgenda();
}

function getParticipantProfileKey(name, sportKey) {
  return `${sportKey}|${normalizeText(name)}`;
}

function getParticipantProfile(name, sportKey) {
  return participantProfiles.get(getParticipantProfileKey(name, sportKey)) || null;
}

function getParticipantProfileRequests() {
  const requests = new Map();

  streamxEvents.forEach((event) => {
    const sportKey = event.sportKey || getSportKey(event.sportName || event.sport || "");

    if (!INDIVIDUAL_MATCHUP_SPORTS.has(sportKey)) {
      return;
    }

    const titleTeams = parseTeamsFromTitle(event.title);
    [event.homeTeam || titleTeams.homeTeam, event.awayTeam || titleTeams.awayTeam].forEach((name) => {
      const cleanName = cleanText(name);

      if (cleanName) {
        requests.set(getParticipantProfileKey(cleanName, sportKey), { name: cleanName, sport: sportKey });
      }
    });
  });

  return Array.from(requests.values()).slice(0, 12);
}

async function loadParticipantProfiles(options = {}) {
  const people = getParticipantProfileRequests();

  if (!people.length) {
    return;
  }

  try {
    const data = await fetchJson(`${PARTICIPANT_PROFILES_URL}?people=${encodeURIComponent(JSON.stringify(people))}`, {
      forceRefresh: options.forceRefresh,
    });
    const nextProfiles = new Map(participantProfiles);

    (data?.profiles || []).forEach((profile) => {
      if (profile?.query && profile?.sport) {
        nextProfiles.set(getParticipantProfileKey(profile.query, profile.sport), profile);
      }
    });

    const profileSignature = (profiles) => JSON.stringify(Array.from(profiles.entries()).map(([key, profile]) => [
      key,
      profile.name,
      profile.image,
      profile.sourceUrl,
    ]));
    const changed = profileSignature(nextProfiles) !== profileSignature(participantProfiles);
    participantProfiles = nextProfiles;
    if (changed) renderAgenda();
  } catch (error) {
    // Participant photos are optional; initials remain as the visual fallback.
  }
}

async function fetchJson(url, options = {}) {
  const fetchKey = options.forceRefresh ? "" : url;

  if (fetchKey && pendingFetches.has(fetchKey)) {
    return pendingFetches.get(fetchKey);
  }

  const request = fetchJsonOnce(url, options);

  if (fetchKey) {
    pendingFetches.set(fetchKey, request);
  }

  try {
    return await request;
  } finally {
    if (fetchKey) {
      pendingFetches.delete(fetchKey);
    }
  }
}

async function fetchJsonOnce(url, options = {}) {
  const requestUrl = options.forceRefresh ? addCacheBust(url) : url;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller ? window.setTimeout(() => controller.abort(), CLIENT_FETCH_TIMEOUT_MS) : 0;

  try {
    const response = await fetch(requestUrl, {
      cache: options.forceRefresh ? "reload" : "default",
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${url}`);
    }

    return response.json();
  } finally {
    if (timeout) {
      window.clearTimeout(timeout);
    }
  }
}

function addCacheBust(url) {
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

function normalizeStreamxEvents(data) {
  const events = [];

  (data?.sports || []).forEach((sport) => {
    (sport.leagues || []).forEach((league) => {
      (league.events || []).forEach((event, index) => {
        const servers = normalizeStreamxEventServers(event);

        if (!servers.length) {
          return;
        }

        const title = event.title || makeTitleFromTeams(event) || "Evento";
        const parsedDate = parseStreamxDate(event);
        const leagueLogo = firstImageUrl(league.logo, league.image, league.background);
        const sportLogo = firstImageUrl(sport.logo, sport.image);
        const eventLogo = firstImageUrl(event.logo, event.image, event.background, event.channelLogo, leagueLogo, sportLogo);

        events.push({
          ...event,
          id: event.id || toBase64Id([title, event.time || event.datetime || event.date || "", index].join("|")),
          title,
          sportName: cleanText(sport.name || event.sport || "Deportes"),
          sportKey: getSportKey(sport.id || sport.name || event.sport || ""),
          sportIcon: sport.icon || "",
          leagueName: event.league || league.name || "",
          eventLogo,
          leagueLogo,
          sportLogo,
          parsedDate,
          servers,
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
    event?.title,
    event?.code,
    event?.league,
    event?.leagueName,
    event?.competition,
    event?.tournament,
    league?.name,
  ].join(" "));

  return text.includes("mundial") || text.includes("copa del mundo") || text.includes("world cup");
}

function normalizeWorldcupGames(data) {
  const games = Array.isArray(data) ? data : (data?.games || []);

  return games.map((game) => {
    const homeTeam = getWorldcupTeamName(game, "home");
    const awayTeam = getWorldcupTeamName(game, "away");
    const parsedDate = parseWorldcupDate(game);

    return {
      ...game,
      id: String(game.id || game._id || toBase64Id(`${homeTeam}|${awayTeam}|${game.local_date || ""}`)),
      title: homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : "Partido Mundial",
      homeTeam,
      awayTeam,
      homeScore: parseScore(game.home_score),
      awayScore: parseScore(game.away_score),
      parsedDate,
      matchKey: makeMatchKey(homeTeam, awayTeam),
    };
  }).filter((game) => game.homeTeam && game.awayTeam);
}

function normalizeSportsDbEvents(data) {
  const events = Array.isArray(data) ? data : (data?.events || []);

  return events.map((event) => {
    const homeTeam = cleanText(event.strHomeTeam || event.homeTeam || "");
    const awayTeam = cleanText(event.strAwayTeam || event.awayTeam || "");
    const title = cleanText(event.strEvent || event.title || makeTitleFromTeams({ homeTeam, awayTeam }) || "Evento");
    const parsedDate = parseSportsDbDate(event);
    const homeScore = parseNullableScore(event.intHomeScore ?? event.homeScore);
    const awayScore = parseNullableScore(event.intAwayScore ?? event.awayScore);

    return {
      ...event,
      id: String(event.idEvent || event.id || toBase64Id(`${title}|${event.dateEvent || event.sourceDate || ""}`)),
      title,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      parsedDate,
      dateKey: parsedDate ? getPeruDateKey(parsedDate) : cleanText(event.dateEvent || event.sourceDate || ""),
      sportName: cleanText(event.strSport || event.sportName || ""),
      leagueName: cleanText(event.strLeague || event.leagueName || ""),
      matchKey: makeMatchKey(homeTeam, awayTeam),
    };
  }).filter((event) => event.title);
}

function getWorldcupTeamName(game, side) {
  const prefix = side === "home" ? "home" : "away";
  return cleanText(game[`${prefix}_team_name_en`] || game[`${prefix}_team_label`] || game[`${prefix}Team`] || "");
}

function parseScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score : 0;
}

function parseNullableScore(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function hasSportsDbScore(event) {
  if (!event) {
    return false;
  }

  if (event.sportsDbScoreHome !== undefined || event.sportsDbScoreAway !== undefined) {
    return event.sportsDbScoreHome !== null && event.sportsDbScoreAway !== null;
  }

  return event.homeScore !== null && event.awayScore !== null;
}

function parseWorldcupDate(game) {
  const value = game.local_date || game.datetime || game.date;

  if (!value) {
    return null;
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);

  if (!match) {
    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  return zonedTimeToDate(
    Number(match[3]),
    Number(match[1]),
    Number(match[2]),
    Number(match[4]),
    Number(match[5]),
    0,
    PERU_TIME_ZONE
  );
}

function parseSportsDbDate(event) {
  const timestamp = cleanText(event.strTimestamp || event.timestamp || "");

  if (timestamp) {
    const parsed = new Date(timestamp);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const date = cleanText(event.dateEvent || event.sourceDate || "");
  const time = cleanText(event.strTime || "00:00:00");
  const match = `${date} ${time}`.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) {
    const fallback = new Date(date);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  return safeZonedTimeToDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] || 0),
    "UTC"
  );
}

function makeMatchKey(homeTeam, awayTeam) {
  return [canonicalTeamName(homeTeam), canonicalTeamName(awayTeam)].sort().join("|");
}

function getOrientedScore(displayHome, displayAway, sourceHome, sourceAway, homeScore, awayScore) {
  const sourceHomeScore = parseNullableScore(homeScore);
  const sourceAwayScore = parseNullableScore(awayScore);

  if (sourceHomeScore === null || sourceAwayScore === null) {
    return { home: null, away: null };
  }

  const displayHomeName = canonicalTeamName(displayHome || "");
  const displayAwayName = canonicalTeamName(displayAway || "");
  const sourceHomeName = canonicalTeamName(sourceHome || "");
  const sourceAwayName = canonicalTeamName(sourceAway || "");

  if (displayHomeName && displayAwayName && sourceHomeName && sourceAwayName
    && displayHomeName === sourceAwayName && displayAwayName === sourceHomeName) {
    return { home: sourceAwayScore, away: sourceHomeScore };
  }

  return { home: sourceHomeScore, away: sourceAwayScore };
}

function canonicalTeamName(value) {
  const normalized = normalizeText(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const aliases = {
    argentina: "argentina",
    australia: "australia",
    austria: "austria",
    belgium: "belgium",
    belgica: "belgium",
    bosnia: "bosnia and herzegovina",
    "bosnia and herzegovina": "bosnia and herzegovina",
    "bosnia herzegovina": "bosnia and herzegovina",
    brasil: "brazil",
    brazil: "brazil",
    canada: "canada",
    chile: "chile",
    colombia: "colombia",
    croacia: "croatia",
    croatia: "croatia",
    curacao: "curacao",
    ecuador: "ecuador",
    egypt: "egypt",
    egipto: "egypt",
    england: "england",
    inglaterra: "england",
    espana: "spain",
    france: "france",
    francia: "france",
    germany: "germany",
    ghana: "ghana",
    haiti: "haiti",
    iran: "iran",
    iraq: "iraq",
    japan: "japan",
    japon: "japan",
    mexico: "mexico",
    morocco: "morocco",
    marruecos: "morocco",
    netherlands: "netherlands",
    "paises bajos": "netherlands",
    norway: "norway",
    noruega: "norway",
    paraguay: "paraguay",
    portugal: "portugal",
    qatar: "qatar",
    "republica checa": "czech republic",
    "czech republic": "czech republic",
    czechia: "czech republic",
    "south africa": "south africa",
    sudafrica: "south africa",
    "south korea": "south korea",
    "corea del sur": "south korea",
    scotland: "scotland",
    escocia: "scotland",
    spain: "spain",
    sweden: "sweden",
    suecia: "sweden",
    switzerland: "switzerland",
    suiza: "switzerland",
    tunisia: "tunisia",
    tunez: "tunisia",
    turkey: "turkey",
    turquia: "turkey",
    "united states": "united states",
    usa: "united states",
    "estados unidos": "united states",
    uruguay: "uruguay",
  };

  return aliases[normalized] || normalized;
}

function findWorldcupGameForEvent(event) {
  const eventHomeName = canonicalTeamName(event.homeTeam || "");
  const eventAwayName = canonicalTeamName(event.awayTeam || "");
  const key = eventHomeName && eventAwayName ? [eventHomeName, eventAwayName].sort().join("|") : "";

  if (key) {
    const direct = worldcupGames.find((game) => game.matchKey === key);

    if (direct) {
      return direct;
    }
  }

  const eventDate = event.parsedDate || parseStreamxDate(event);

  if (!eventDate || (!eventHomeName && !eventAwayName)) {
    return null;
  }

  return worldcupGames.find((game) => {
    if (!game.parsedDate) {
      return false;
    }

    const minutes = Math.abs(game.parsedDate.getTime() - eventDate.getTime()) / 60000;
    const gameHomeName = canonicalTeamName(game.homeTeam);
    const gameAwayName = canonicalTeamName(game.awayTeam);
    const sameSide = (eventHomeName && (gameHomeName.includes(eventHomeName) || eventHomeName.includes(gameHomeName)))
      || (eventAwayName && (gameAwayName.includes(eventAwayName) || eventAwayName.includes(gameAwayName)));
    return minutes <= 180 && sameSide;
  }) || null;
}

function findSportsDbEventForEvent(event) {
  const eventDateKey = getAgendaEventDateKey(event);
  const eventSport = event.sportKey || getSportKey(event.sportName || event.sport || "");
  const eventHome = canonicalTeamName(event.homeTeam || "");
  const eventAway = canonicalTeamName(event.awayTeam || "");
  const eventKey = eventHome && eventAway ? [eventHome, eventAway].sort().join("|") : "";
  const eventTitle = normalizeMatchTitle(event.title || makeTitleFromTeams(event));

  if (!eventDateKey || !eventTitle) {
    return null;
  }

  return sportsDbEvents.find((candidate) => {
    if (candidate.dateKey !== eventDateKey) {
      return false;
    }

    const candidateSport = getSportKey(candidate.sportName || "");

    if (eventSport && candidateSport && !areCompatibleSports(eventSport, candidateSport)) {
      return false;
    }

    if (eventKey && candidate.matchKey && eventKey === candidate.matchKey) {
      return true;
    }

    const candidateTitle = normalizeMatchTitle(candidate.title);
    return candidateTitle && (
      candidateTitle.includes(eventTitle)
      || eventTitle.includes(candidateTitle)
      || haveStrongTitleOverlap(eventTitle, candidateTitle)
    );
  }) || null;
}

function areCompatibleSports(first, second) {
  if (first === second) {
    return true;
  }

  const combatSports = new Set(["mma", "boxing", "combat", "wrestling"]);
  return combatSports.has(first) && combatSports.has(second);
}

function haveStrongTitleOverlap(first, second) {
  const ignored = new Set(["vs", "the", "de", "del", "la", "el", "final", "live"]);
  const getTokens = (value) => new Set(normalizeMatchTitle(value).split(" ")
    .filter((token) => token.length > 2 && !ignored.has(token)));
  const firstTokens = getTokens(first);
  const secondTokens = getTokens(second);
  let shared = 0;

  firstTokens.forEach((token) => {
    if (secondTokens.has(token)) {
      shared += 1;
    }
  });

  return shared >= 2;
}

function getSportKey(value) {
  const text = normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();
  const aliases = {
    futbol: "soccer",
    football: "soccer",
    soccer: "soccer",
    beisbol: "baseball",
    baseball: "baseball",
    basquet: "basketball",
    basquetbol: "basketball",
    basketball: "basketball",
    tenis: "tennis",
    tennis: "tennis",
    ciclismo: "cycling",
    cycling: "cycling",
    box: "boxing",
    boxeo: "boxing",
    boxing: "boxing",
    ufc: "mma",
    mma: "mma",
    "mixed martial arts": "mma",
    "artes marciales mixtas": "mma",
    fight: "combat",
    fights: "combat",
    fighting: "combat",
    pelea: "combat",
    peleas: "combat",
    combat: "combat",
    "combat sports": "combat",
    "deportes de combate": "combat",
    nfl: "american-football",
    "american football": "american-football",
    "futbol americano": "american-football",
    motor: "motorsport",
    motorsport: "motorsport",
    automovilismo: "motorsport",
    f1: "motorsport",
    "formula 1": "motorsport",
    nascar: "motorsport",
    voley: "volleyball",
    volleyball: "volleyball",
    voleibol: "volleyball",
    rugby: "rugby",
    hockey: "hockey",
    "ice hockey": "hockey",
    golf: "golf",
    wrestling: "wrestling",
    lucha: "wrestling",
    "lucha libre": "wrestling",
    cricket: "cricket",
    esports: "esports",
    "e sports": "esports",
  };

  if (aliases[text]) {
    return aliases[text];
  }

  const words = new Set(text.split(" ").filter(Boolean));

  if (words.has("american") && words.has("football")) {
    return "american-football";
  }

  const compoundAliases = [
    ["mma", "mma"],
    ["ufc", "mma"],
    ["boxing", "boxing"],
    ["boxeo", "boxing"],
    ["tennis", "tennis"],
    ["tenis", "tennis"],
    ["cycling", "cycling"],
    ["ciclismo", "cycling"],
    ["motor", "motorsport"],
    ["football", "soccer"],
    ["futbol", "soccer"],
  ];
  const compound = compoundAliases.find(([word]) => words.has(word));
  return compound?.[1] || text.replace(/\s+/g, "-");
}

function normalizeMatchTitle(value) {
  return normalizeText(value)
    .replace(/\bvs\.?\b/g, " vs ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findStreamxEventForGame(game) {
  return streamxEvents.find((event) => {
    if (makeMatchKey(event.homeTeam || "", event.awayTeam || "") !== game.matchKey) {
      return false;
    }

    const eventDate = event.parsedDate || parseStreamxDate(event);

    if (!eventDate || !game.parsedDate) {
      return true;
    }

    return Math.abs(eventDate.getTime() - game.parsedDate.getTime()) <= 180 * 60000;
  }) || null;
}

function normalizeStreamxChannels(data) {
  const channels = Array.isArray(data) ? data : (data?.channels || data?.canales || []);

  return channels
    .filter((channel) => channel && channel.active !== false && channel.status !== "off")
    .map((channel, index) => {
      const stream = cleanText(channel.stream || channel.codigo || channel.code || channel.id || extractStreamCode(channel.url));
      const url = stream ? buildStreamxLiveUrl(stream) : canonicalizeStreamxUrl(channel.url);
      const name = cleanText(channel.name || channel.nombre || channel.title || `Canal ${index + 1}`);
      const stableKey = stream || extractStreamCode(url) || url || name || String(index);

      return {
        name,
        sourceName: name,
        sourceUrl: url,
        sourceKey: `streamx-channel:${toBase64Id(stableKey).slice(0, 64)}`,
        language: normalizeStreamxLanguage(channel),
        country: countryToFlagCode(channel.country || channel.pais || channel.category || channel.categoria),
        quality: cleanText(channel.quality || channel.calidad || "720p"),
        type: "StreamX-HD",
        category: STREAMX_CHANNEL_CATEGORY,
      };
    })
    .filter((channel) => channel.sourceUrl && !isBlockedStreamxItem(channel));
}

function normalizeStreamxEventServers(event) {
  const servers = Array.isArray(event?.servers) ? event.servers : [];

  return servers
    .filter((server) => server && server.active !== false && server.url)
    .map((server) => ({ ...server, url: canonicalizeStreamxUrl(server.url) }))
    .filter((server) => server.url);
}

function buildStreamxLiveUrl(stream) {
  return `${STREAMX_CANONICAL_ORIGIN}/live1.php?stream=${encodeURIComponent(stream)}`;
}

function canonicalizeStreamxUrl(url) {
  const value = cleanText(url);

  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();

    if (host === STREAMX_CANONICAL_HOST || host === `www.${STREAMX_CANONICAL_HOST}` || STREAMX_LEGACY_HOSTS.has(host)) {
      parsed.protocol = "https:";
      parsed.hostname = STREAMX_CANONICAL_HOST;
      return parsed.toString();
    }
  } catch (error) {
    return "";
  }

  return "";
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

function getTeamFlagCode(teamName) {
  const map = {
    argentina: "ar",
    australia: "au",
    austria: "at",
    belgium: "be",
    "bosnia and herzegovina": "ba",
    brazil: "br",
    canada: "ca",
    chile: "cl",
    colombia: "co",
    croatia: "hr",
    curacao: "cw",
    "czech republic": "cz",
    ecuador: "ec",
    egypt: "eg",
    england: "gb-eng",
    france: "fr",
    germany: "de",
    ghana: "gh",
    haiti: "ht",
    iran: "ir",
    iraq: "iq",
    japan: "jp",
    mexico: "mx",
    morocco: "ma",
    netherlands: "nl",
    paraguay: "py",
    portugal: "pt",
    qatar: "qa",
    scotland: "gb-sct",
    "south africa": "za",
    "south korea": "kr",
    spain: "es",
    sweden: "se",
    switzerland: "ch",
    tunisia: "tn",
    turkey: "tr",
    "united states": "us",
    uruguay: "uy",
  };

  return map[canonicalTeamName(teamName)] || "";
}

function getTeamFlagImageUrl(teamName) {
  const flagCode = getTeamFlagCode(teamName);
  return flagCode ? `https://flagcdn.com/${flagCode}.svg` : "";
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

function buildStreamxAgendaEvents() {
  return streamxEvents
    .map((event) => buildAgendaEvent(event, findWorldcupGameForEvent(event)))
    .sort(sortAgendaEvents);
}

function buildWorldcupAgendaEvents(streamAgendaEvents = buildStreamxAgendaEvents()) {
  const matchedGames = new Set();
  const events = [];

  streamAgendaEvents.forEach((event) => {
    if (event.worldcupGame) {
      matchedGames.add(event.worldcupGame.id);
      events.push(event);
      return;
    }

    if (isWorldCupEvent(event, { name: event.leagueName })) {
      events.push(event);
    }
  });

  worldcupGames.forEach((game) => {
    if (!matchedGames.has(game.id)) {
      events.push(buildAgendaEvent(findStreamxEventForGame(game), game));
    }
  });

  return events.sort(sortAgendaEvents);
}

function buildAgendaEvents() {
  return buildStreamxAgendaEvents();
}

function buildAgendaEvent(streamEvent, game) {
  const source = streamEvent || {};
  const sportsDbEvent = findSportsDbEventForEvent(source);
  const title = source.title || game?.title || makeTitleFromTeams(source) || "Evento";
  const leagueName = source.leagueName || source.league || source.sportName || (game ? "Copa Del Mundo 2026" : "");
  const parsedDate = source.parsedDate || game?.parsedDate || parseStreamxDate(source);
  const titleTeams = parseTeamsFromTitle(title);
  const sportKey = source.sportKey || getSportKey(source.sportName || source.sport || (game ? "soccer" : ""));
  const rawHomeTeam = cleanText(source.homeTeam || game?.homeTeam || titleTeams.homeTeam);
  const rawAwayTeam = cleanText(source.awayTeam || game?.awayTeam || titleTeams.awayTeam);
  const homeProfile = getParticipantProfile(rawHomeTeam, sportKey);
  const awayProfile = getParticipantProfile(rawAwayTeam, sportKey);
  const sourceHomeTeam = cleanText(source.homeTeam || game?.homeTeam || sportsDbEvent?.homeTeam || homeProfile?.name || titleTeams.homeTeam);
  const sourceAwayTeam = cleanText(source.awayTeam || game?.awayTeam || sportsDbEvent?.awayTeam || awayProfile?.name || titleTeams.awayTeam);
  const hasTeams = Boolean(sourceHomeTeam && sourceAwayTeam);
  const displayMode = hasTeams
    ? (INDIVIDUAL_MATCHUP_SPORTS.has(sportKey) ? "individual" : "teams")
    : "title";
  const eventLogo = firstImageUrl(source.eventLogo, source.logo, source.image, source.background);
  const leagueLogo = firstImageUrl(source.leagueLogo, source.sportLogo);
  const secondaryLogo = leagueLogo && leagueLogo !== eventLogo ? leagueLogo : "";
  const isWorldcup = Boolean(game) || /mundial|world\s*cup|copa del mundo|fifa/i.test(`${leagueName} ${source.sportName || ""}`);
  const leagueBadge = firstImageUrl(sportsDbEvent?.strLeagueBadge, sportsDbEvent?.strBadge)
    || (isWorldcup ? WORLDCUP_BADGE_FALLBACK : "");
  const matchThumb = firstImageUrl(
    sportsDbEvent?.strThumb,
    sportsDbEvent?.strFanart,
    sportsDbEvent?.strBanner,
    sportsDbEvent?.strPoster,
    sportsDbEvent?.strSquare,
  );
  const homeFlagLogo = game ? getTeamFlagImageUrl(sourceHomeTeam) : "";
  const awayFlagLogo = game ? getTeamFlagImageUrl(sourceAwayTeam) : "";
  const worldcupScore = getOrientedScore(sourceHomeTeam, sourceAwayTeam, game?.homeTeam, game?.awayTeam, game?.homeScore, game?.awayScore);
  const sportsDbScore = getOrientedScore(sourceHomeTeam, sourceAwayTeam, sportsDbEvent?.homeTeam, sportsDbEvent?.awayTeam, sportsDbEvent?.homeScore, sportsDbEvent?.awayScore);
  const event = {
    ...source,
    id: source.id || (game ? `worldcup-${game.id}` : toBase64Id(title)),
    title,
    sportName: source.sportName || (game ? "Mundial" : source.sportName),
    sportKey,
    homeTeam: sourceHomeTeam,
    awayTeam: sourceAwayTeam,
    homeLogo: firstImageUrl(source.homeLogo, homeFlagLogo, sportsDbEvent?.strHomeTeamBadge, sportsDbEvent?.strHomeTeamLogo, homeProfile?.image)
      || (!hasTeams ? eventLogo : ""),
    awayLogo: firstImageUrl(source.awayLogo, awayFlagLogo, sportsDbEvent?.strAwayTeamBadge, sportsDbEvent?.strAwayTeamLogo, awayProfile?.image)
      || (!hasTeams ? secondaryLogo : ""),
    homeProfile,
    awayProfile,
    eventLogo,
    leagueLogo,
    leagueBadge,
    matchThumb,
    isWorldcup,
    hasTeams,
    displayMode,
    leagueName,
    parsedDate,
    duration: Number(source.duration || 130),
    extraTime: Number(source.extraTime || 0),
    worldcupGame: game || null,
    worldcupScoreHome: worldcupScore.home,
    worldcupScoreAway: worldcupScore.away,
    sportsDbEvent,
    sportsDbScoreHome: sportsDbScore.home,
    sportsDbScoreAway: sportsDbScore.away,
  };

  event.servers = Array.isArray(source.servers) ? source.servers : [];
  event.serverItems = getEventServerItems(event);
  event.statusInfo = getAgendaStatus(event);
  return event;
}

function shouldShowWorldcupFallback(game) {
  const status = getWorldcupGameStatus(game);

  if (status.key === "live") {
    return true;
  }

  if (!game.parsedDate) {
    return false;
  }

  const hoursFromNow = (game.parsedDate.getTime() - Date.now()) / 3600000;

  if (status.key === "finished") {
    return hoursFromNow >= -48 && hoursFromNow <= 12;
  }

  return hoursFromNow >= -6 && hoursFromNow <= 168;
}

function sortAgendaEvents(a, b) {
  const statusRank = { live: 0, upcoming: 1, finished: 2 };
  const rankDiff = statusRank[a.statusInfo.key] - statusRank[b.statusInfo.key];

  if (rankDiff) {
    return rankDiff;
  }

  return (a.parsedDate?.getTime() || Number.MAX_SAFE_INTEGER) - (b.parsedDate?.getTime() || Number.MAX_SAFE_INTEGER);
}

function getAgendaEventDateKey(event) {
  const date = event.parsedDate || event.worldcupGame?.parsedDate;
  return date ? getPeruDateKey(date) : "";
}

function getPeruDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PERU_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }

    return result;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateFromPeruKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return zonedTimeToDate(year, month, day, 12, 0, 0, PERU_TIME_ZONE);
}

function getAvailableAgendaDates(events) {
  return Array.from(new Set(events.map(getAgendaEventDateKey).filter(Boolean))).sort();
}

function ensureSelectedAgendaDate(events) {
  const dates = getAvailableAgendaDates(events);
  const today = getPeruDateKey();

  if (!dates.length) {
    selectedAgendaDate = "";
    agendaDateManuallySelected = false;
    return dates;
  }

  if (agendaDateManuallySelected && dates.includes(selectedAgendaDate)) {
    return dates;
  }

  selectedAgendaDate = dates.includes(today)
    ? today
    : dates.find((dateKey) => dateKey > today) || dates[0];
  agendaDateManuallySelected = false;

  return dates;
}

function getAgendaEventsForSelectedDate(events) {
  if (!selectedAgendaDate) {
    return events;
  }

  return events.filter((event) => getAgendaEventDateKey(event) === selectedAgendaDate);
}

function formatAgendaDateTabLabel(dateKey) {
  const date = dateFromPeruKey(dateKey);

  if (!date) {
    return "Fecha pendiente";
  }

  const today = getPeruDateKey();
  const tomorrow = getPeruDateKey(new Date(dateFromPeruKey(today).getTime() + 86400000));
  const formatted = new Intl.DateTimeFormat("es-PE", {
    timeZone: PERU_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);

  if (dateKey === today) {
    return `Hoy · ${formatted}`;
  }

  if (dateKey === tomorrow) {
    return `Mañana · ${formatted}`;
  }

  return formatted;
}

function renderAgendaDateTabs(dates, events) {
  dom.agendaDateTabs.replaceChildren();
  const shouldHide = dates.length <= 1;
  dom.agendaDateShell.hidden = shouldHide;
  dom.agendaDateTabs.hidden = shouldHide;

  if (shouldHide) {
    return;
  }

  const counts = events.reduce((result, event) => {
    const dateKey = getAgendaEventDateKey(event);

    if (dateKey) {
      result.set(dateKey, (result.get(dateKey) || 0) + 1);
    }

    return result;
  }, new Map());

  dates.forEach((dateKey) => {
    const count = counts.get(dateKey) || 0;
    const button = createElement("button", "agenda-date-button");
    button.type = "button";
    button.dataset.agendaDate = dateKey;
    button.dataset.tvFocusKey = `agenda-date:${dateKey}`;
    button.classList.toggle("is-active", dateKey === selectedAgendaDate);
    button.setAttribute("aria-pressed", String(dateKey === selectedAgendaDate));
    button.append(
      createElement("strong", "tab-label", formatAgendaDateTabLabel(dateKey)),
      createElement("span", "tab-count", `${count} evento${count === 1 ? "" : "s"}`)
    );
    button.addEventListener("click", () => {
      selectedAgendaDate = dateKey;
      agendaDateManuallySelected = true;
      renderAgenda();
    });
    dom.agendaDateTabs.append(button);
  });

  centerSelectedAgendaDateTab();
  updateTabScrollHints(dom.agendaDateTabs);
}

function centerSelectedAgendaDateTab() {
  if (!selectedAgendaDate || dom.agendaDateTabs.hidden) {
    return;
  }

  window.requestAnimationFrame(() => {
    const activeButton = dom.agendaDateTabs.querySelector(".agenda-date-button.is-active");
    if (activeButton) {
      const targetLeft = activeButton.offsetLeft - (dom.agendaDateTabs.clientWidth - activeButton.offsetWidth) / 2;
      dom.agendaDateTabs.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    }
    updateTabScrollHints(dom.agendaDateTabs);
  });
}

function scrollTabRow(container, direction) {
  const amount = Math.max(container.clientWidth * 0.74, 220);
  container.scrollBy({ left: amount * direction, behavior: "smooth" });
  window.setTimeout(() => updateTabScrollHints(container), 220);
}

function updateTabScrollHints(container) {
  const shell = container.closest(".agenda-scroll-shell");

  if (!shell) {
    return;
  }

  const overflow = container.scrollWidth > container.clientWidth + 2;
  const canScrollLeft = overflow && container.scrollLeft > 2;
  const canScrollRight = overflow && container.scrollLeft + container.clientWidth < container.scrollWidth - 2;

  shell.classList.toggle("has-overflow", overflow);
  shell.classList.toggle("can-scroll-left", canScrollLeft);
  shell.classList.toggle("can-scroll-right", canScrollRight);
  shell.querySelector(".tab-scroll-arrow.is-left")?.toggleAttribute("disabled", !canScrollLeft);
  shell.querySelector(".tab-scroll-arrow.is-right")?.toggleAttribute("disabled", !canScrollRight);
}

function getAgendaSportLabel(event) {
  return cleanText(event.sportName || event.sport || "Deportes");
}

function getAgendaSportIcon(key) {
  return AGENDA_SPORT_ICONS[key] || "generic";
}

function getAgendaSportKey(event) {
  return event.sportKey || getSportKey(getAgendaSportLabel(event)) || "deportes";
}

function getAvailableAgendaSports(events) {
  const map = new Map();
  const defaultOrder = new Map(DEFAULT_AGENDA_SPORTS.map((sport, index) => [sport.key, index]));

  DEFAULT_AGENDA_SPORTS.forEach((sport) => {
    map.set(sport.key, { ...sport, count: 0 });
  });

  events.forEach((event) => {
    const key = getAgendaSportKey(event);

    if (!map.has(key)) {
      map.set(key, { key, label: getAgendaSportLabel(event), count: 0 });
    }

    map.get(key).count += 1;
  });

  return Array.from(map.values()).sort((a, b) => {
    const countDiff = b.count - a.count;

    if (countDiff) {
      return countDiff;
    }

    const orderDiff = (defaultOrder.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (defaultOrder.get(b.key) ?? Number.MAX_SAFE_INTEGER);

    return orderDiff || a.label.localeCompare(b.label);
  });
}

function ensureSelectedAgendaSport(events, worldcupEvents = []) {
  const sports = getAvailableAgendaSports(events);

  if (selectedAgendaSport === WORLDCUP_CATEGORY && worldcupEvents.length) {
    return sports;
  }

  if (!sports.some((sport) => sport.key === selectedAgendaSport)) {
    selectedAgendaSport = "all";
  }

  return sports;
}

function getAgendaEventsForSelectedSport(events) {
  if (selectedAgendaSport === "all" || selectedAgendaSport === WORLDCUP_CATEGORY) {
    return events;
  }

  return events.filter((event) => getAgendaSportKey(event) === selectedAgendaSport);
}

function renderAgendaSportTabs(sports, events, worldcupEvents = []) {
  dom.agendaSportTabs.replaceChildren();
  const showWorldcup = worldcupEvents.length > 0;
  const shouldHide = sports.length <= 1 && !showWorldcup;
  dom.agendaSportShell.hidden = shouldHide;
  dom.agendaSportTabs.hidden = shouldHide;
  dom.agendaFilter.hidden = shouldHide;

  if (shouldHide) {
    closeAgendaFilter();
    return;
  }

  const buttons = [{ key: "all", label: "Todos", count: events.length, icon: AGENDA_SPORT_ICONS.all }];

  if (showWorldcup) {
    buttons.push({ key: WORLDCUP_CATEGORY, label: "Mundial", count: worldcupEvents.length, icon: AGENDA_SPORT_ICONS[WORLDCUP_CATEGORY], featured: true });
  }

  buttons.push(...sports);

  buttons.forEach((sport) => {
    const button = createElement("button", "agenda-sport-button");
    button.type = "button";
    button.dataset.agendaSport = sport.key;
    button.dataset.tvFocusKey = `agenda-sport:${sport.key}`;
    button.classList.toggle("is-active", sport.key === selectedAgendaSport);
    button.classList.toggle("is-featured", Boolean(sport.featured));
    button.setAttribute("aria-pressed", String(sport.key === selectedAgendaSport));
    setPaletteVariables(button, getSportPalette(sport.key === "all" ? "generic" : sport.key));
    const icon = sport.key === WORLDCUP_CATEGORY
      ? createWorldcupBadgeTile()
      : createSportIcon(sport.icon || getAgendaSportIcon(sport.key));
    const copy = createElement("span", "sport-copy");
    copy.append(
      createElement("strong", "tab-label", sport.label),
      createElement("span", "tab-count", `${sport.count} evento${sport.count === 1 ? "" : "s"}`)
    );
    button.append(icon, copy);
    if (sport.featured) {
      button.append(createElement("span", "featured-tag", "ACTUAL"));
    }
    button.addEventListener("click", () => {
      selectedAgendaSport = sport.key;
      selectedAgendaDate = "";
      agendaDateManuallySelected = false;
      closeAgendaFilter();
      renderAgenda();
    });
    dom.agendaSportTabs.append(button);
  });

  const selected = buttons.find((sport) => sport.key === selectedAgendaSport);
  dom.agendaFilterLabel.textContent = selected ? selected.label : "Todos";
  updateTabScrollHints(dom.agendaSportTabs);
}

let agendaFilterOpen = false;

function toggleAgendaFilter(force) {
  const next = typeof force === "boolean" ? force : !agendaFilterOpen;
  agendaFilterOpen = next;
  dom.agendaFilter.classList.toggle("is-open", next);
  dom.agendaFilterButton.setAttribute("aria-expanded", String(next));
}

function closeAgendaFilter() {
  toggleAgendaFilter(false);
}

function filterAgendaByView(events, view) {
  const todayKey = getPeruDateKey();

  return events.filter((event) => {
    const status = (event.statusInfo || getAgendaStatus(event)).key;
    const date = event.parsedDate || event.worldcupGame?.parsedDate;
    const dateKey = date ? getPeruDateKey(date) : null;

    if (view === "today") return dateKey === todayKey;
    if (view === "results") return status === "finished";
    if (view === "upcoming") return status === "upcoming" || status === "live";
    if (view === "favorites") return favoriteEventKeys.has(getFavoriteEventKey(event));
    return true;
  });
}

function getFavoriteEventKey(event) {
  return String(event.id || toBase64Id(`${event.title}|${event.time || event.parsedDate?.toISOString?.() || ""}`));
}

function toggleFavoriteEvent(event) {
  const key = getFavoriteEventKey(event);
  if (favoriteEventKeys.has(key)) favoriteEventKeys.delete(key);
  else favoriteEventKeys.add(key);
  safeStorageSet("favoriteEvents", JSON.stringify(Array.from(favoriteEventKeys)));
  renderAgenda();
}

function setAgendaView(view) {
  if (!AGENDA_VIEWS[view] || view === selectedAgendaView) {
    return;
  }

  selectedAgendaView = view;
  syncAgendaViewTabs();
  updateAgendaHero();
  renderAgenda();
}

function syncAgendaViewTabs() {
  dom.agendaViewTabs.querySelectorAll("[data-agenda-view]").forEach((button) => {
    const isActive = button.dataset.agendaView === selectedAgendaView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateAgendaHero() {
  const view = AGENDA_VIEWS[selectedAgendaView] || AGENDA_VIEWS.all;
  dom.pageTitle.textContent = view.title;
  dom.pageSubtitle.textContent = view.subtitle;
}

function pickFeaturedAgendaEvent(events) {
  if (!Array.isArray(events) || !events.length) {
    return null;
  }

  const hasServers = (event) => (event.serverItems || getEventServerItems(event)).length > 0;
  const teamEvents = events.filter((event) => event.hasTeams);
  const withServers = teamEvents.filter(hasServers);
  const pool = withServers.length ? withServers : (teamEvents.length ? teamEvents : events);
  const statusOf = (event) => (event.statusInfo || getAgendaStatus(event)).key;
  const isWorldcup = (event) => Boolean(event.worldcupGame || event.isWorldcup || isWorldCupEvent(event, { name: event.leagueName }));
  const startsWithinWorldcupWindow = (event) => {
    const date = event.parsedDate || event.worldcupGame?.parsedDate;
    const distance = date ? date.getTime() - Date.now() : Number.POSITIVE_INFINITY;
    return statusOf(event) === "upcoming" && distance >= 0 && distance <= WORLDCUP_BILLBOARD_WINDOW;
  };

  return pool.find((event) => isWorldcup(event) && statusOf(event) === "live")
    || pool.find((event) => statusOf(event) === "live")
    || pool.find((event) => isWorldcup(event) && startsWithinWorldcupWindow(event))
    || pool.find((event) => statusOf(event) === "upcoming")
    || pool[0];
}

const SVG_NS = "http://www.w3.org/2000/svg";
let heroMuted = true;

function svgIcon(...paths) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  paths.forEach((d) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  });
  return svg;
}

function createMuteIcon(muted) {
  return svgIcon(
    "M11 5 6 9H2v6h4l5 4V5Z",
    muted ? "m22 9-6 6M16 9l6 6" : "M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14",
  );
}

function createWorldcupBadgeTile() {
  const tile = createElement("span", "sport-icon");
  const img = makeLeagueBadge(WORLDCUP_BADGE_FALLBACK, "sport-badge-img");
  if (img) {
    tile.append(img);
  }
  return tile;
}

function makeLeagueBadge(url, className = "bb-league-badge") {
  if (!url) {
    return null;
  }

  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  img.loading = "lazy";
  img.className = className;
  img.onerror = () => img.remove();
  return img;
}

function makeMiniFlag(logo) {
  if (!logo) {
    return null;
  }

  const wrap = createElement("span", "highlights-flag");
  const img = document.createElement("img");
  img.src = logo;
  img.alt = "";
  img.loading = "lazy";
  img.onerror = () => wrap.remove();
  wrap.append(img);
  return wrap;
}

function stopHighlightsPlayer() {
  const frame = dom.highlightsCard.querySelector(".highlights-frame");
  if (frame) {
    frame.remove();
    highlightsKey = "";
  }
}

function makeBillboardPreviewUrl(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("muted", "1");
    url.searchParams.set("playsinline", "1");
    return url.href;
  } catch (error) {
    return sourceUrl;
  }
}

function resolveBillboardArtwork(event) {
  const homeTeam = cleanText(event.worldcupGame?.homeTeam || event.homeTeam || "");
  const awayTeam = cleanText(event.worldcupGame?.awayTeam || event.awayTeam || "");
  const cacheKey = `${canonicalTeamName(homeTeam)}|${canonicalTeamName(awayTeam)}`;

  if (!homeTeam || !awayTeam) {
    return Promise.resolve("");
  }

  if (eventArtworkCache.has(cacheKey)) {
    return eventArtworkCache.get(cacheKey);
  }

  const request = fetchJson(`${EVENT_ARTWORK_URL}?home=${encodeURIComponent(homeTeam)}&away=${encodeURIComponent(awayTeam)}`)
    .then((data) => firstImageUrl(data?.image, data?.alternateImage))
    .catch(() => "");
  eventArtworkCache.set(cacheKey, request);
  return request;
}

let highlightsKey = "";

function updateHighlightsCard(events) {
  const card = dom.highlightsCard;
  const featured = pickFeaturedAgendaEvent(events);

  if (!featured) {
    card.hidden = true;
    card.replaceChildren();
    card.classList.remove("is-live", "is-clickable");
    card.onclick = null;
    card.onkeydown = null;
    highlightsKey = "";
    applyPagePalette(null);
    return;
  }

  const servers = featured.serverItems || getEventServerItems(featured);
  const status = featured.statusInfo || getAgendaStatus(featured);
  const isLive = status.key === "live" && servers.length > 0;
  const title = featured.hasTeams && featured.homeTeam && featured.awayTeam
    ? `${featured.homeTeam} vs ${featured.awayTeam}`
    : cleanText(featured.title || "Evento destacado");
  const poster = firstImageUrl(featured.matchThumb);
  const desiredKey = `${isLive ? `live:${getItemKey(servers[0])}` : `static:${featured.id}`}|${poster}`;

  card.hidden = false;
  card.dataset.featuredEvent = String(featured.id);
  applyEventPalette(card, featured);
  applyPagePalette(featured);

  // Avoid rebuilding (and reloading the live iframe) when the featured source is unchanged.
  if (desiredKey === highlightsKey && card.childElementCount) {
    return;
  }

  highlightsKey = desiredKey;
  card.replaceChildren();
  card.classList.toggle("is-live", isLive);
  delete card.dataset.heroUrl;

  // Media layer — fills the billboard.
  const thumb = createElement("div", "highlights-thumb");

  if (poster) {
    thumb.style.backgroundImage = `url("${poster}")`;
  } else {
    thumb.classList.add("is-empty");
    resolveBillboardArtwork(featured).then((artwork) => {
      if (artwork && card.dataset.featuredEvent === String(featured.id) && thumb.isConnected) {
        thumb.style.backgroundImage = `url("${artwork}")`;
        thumb.classList.remove("is-empty");
      }
    });
  }

  if (isLive && !embedProtectionEnabled) {
    const frame = createEmbedFrame(makeBillboardPreviewUrl(servers[0].sourceUrl), title);
    let loaded = false;
    const previewTimeout = window.setTimeout(() => {
      if (!loaded) {
        frame.remove();
        thumb.classList.remove("is-player-ready");
      }
    }, BILLBOARD_PREVIEW_TIMEOUT);
    frame.classList.add("highlights-frame");
    frame.setAttribute("aria-hidden", "true");
    frame.addEventListener("load", () => {
      loaded = true;
      window.clearTimeout(previewTimeout);
      window.setTimeout(() => thumb.classList.add("is-player-ready"), 500);
    }, { once: true });
    frame.addEventListener("error", () => {
      window.clearTimeout(previewTimeout);
      frame.remove();
      thumb.classList.remove("is-player-ready");
    }, { once: true });
    thumb.append(frame);
  }
  card.append(thumb);

  // Netflix-style info overlay, bottom-left.
  const info = createElement("div", "billboard-info");

  const leagueText = cleanText(
    featured.leagueName && !/streamx/i.test(featured.leagueName)
      ? featured.leagueName
      : featured.sportName || "",
  );
  if (featured.leagueBadge || leagueText) {
    const league = createElement("div", "bb-league");
    const badge = makeLeagueBadge(featured.leagueBadge);
    if (badge) league.append(badge);
    if (leagueText) league.append(createElement("span", "", leagueText));
    info.append(league);
  }

  if (featured.hasTeams) {
    const teams = createElement("div", "bb-teams");
    teams.append(
      createBillboardTeam(featured.homeTeam || "Local", featured.homeLogo),
      createElement("span", "bb-vs", "VS"),
      createBillboardTeam(featured.awayTeam || "Visitante", featured.awayLogo),
    );
    info.append(teams);
  } else {
    info.append(createElement("h2", "bb-title", title));
  }

  const badge = createElement("div", `bb-badge is-${status.key}`);
  if (isLive) {
    badge.append(createElement("span", "live-dot"), createElement("span", "", "EN VIVO"));
  } else if (status.key === "upcoming") {
    badge.append(createElement("span", "", `${formatAgendaTime(featured)} · ${formatAgendaDayShort(featured)}`));
  } else {
    badge.append(createElement("span", "", "Finalizado"));
  }
  info.append(badge);

  const actions = createElement("div", "bb-actions");
  if (isLive || servers.length) {
    const play = createElement("button", "bb-play");
    play.type = "button";
    play.dataset.tvFocusKey = "billboard-play";
    play.append(createPlayIcon(), createElement("span", "", "Ver"));
    play.addEventListener("click", (event) => {
      event.stopPropagation();
      openItem(servers[0], { playlist: servers, playlistTitle: `Servidores de ${featured.title}`, match: featured });
    });
    actions.append(play);
  }
  info.append(actions);
  card.append(info);

  if (isLive) {
    const mute = createElement("button", "highlights-mute");
    mute.type = "button";
    mute.setAttribute("aria-label", heroMuted ? "Activar sonido" : "Silenciar");
    mute.append(createMuteIcon(heroMuted));
    mute.addEventListener("click", (event) => {
      event.stopPropagation();
      heroMuted = !heroMuted;
      mute.replaceChildren(createMuteIcon(heroMuted));
      mute.setAttribute("aria-label", heroMuted ? "Activar sonido" : "Silenciar");
    });
    card.append(mute);
  }
}

function createBillboardTeam(name, logo) {
  const wrap = createElement("span", "bb-team");

  if (logo) {
    const img = document.createElement("img");
    img.src = logo;
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => img.remove();
    wrap.append(img);
  }

  wrap.append(createElement("span", "bb-team-name", cleanText(name)));
  return wrap;
}

function createPlayIcon() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M8 5v14l11-7z");
  path.setAttribute("fill", "currentColor");
  svg.append(path);
  return svg;
}

function renderAgenda() {
  const streamAgendaEvents = buildStreamxAgendaEvents();
  const worldcupAgendaEvents = buildWorldcupAgendaEvents(streamAgendaEvents);
  const availableAgendaSports = ensureSelectedAgendaSport(streamAgendaEvents, worldcupAgendaEvents);
  const sourceAgendaEvents = selectedAgendaSport === WORLDCUP_CATEGORY ? worldcupAgendaEvents : streamAgendaEvents;
  const sportAgendaEvents = getAgendaEventsForSelectedSport(sourceAgendaEvents);
  const isDateView = selectedAgendaView === "all";
  const availableAgendaDates = isDateView ? ensureSelectedAgendaDate(sportAgendaEvents) : [];
  const agendaEvents = isDateView
    ? getAgendaEventsForSelectedDate(sportAgendaEvents)
    : filterAgendaByView(sportAgendaEvents, selectedAgendaView);
  const activeFocusKey = document.activeElement?.dataset?.tvFocusKey || "";

  dom.agendaGrid.replaceChildren();
  renderAgendaSportTabs(availableAgendaSports, streamAgendaEvents, worldcupAgendaEvents);
  renderAgendaDateTabs(availableAgendaDates, sportAgendaEvents);
  updateHighlightsCard(sourceAgendaEvents);
  dom.agendaCount.textContent = `${agendaEvents.length} evento${agendaEvents.length === 1 ? "" : "s"}`;

  if ((streamxLoading || worldcupLoading) && !sourceAgendaEvents.length) {
    setAgendaStatus("Cargando eventos…", false, true);
    renderAgendaSkeletons();
    return;
  }

  if ((streamxError || worldcupError) && !sourceAgendaEvents.length) {
    setAgendaStatus("No disponible por ahora.", true, true);
    return;
  }

  if (!sourceAgendaEvents.length) {
    setAgendaStatus("No hay eventos disponibles por ahora.", false, true);
    return;
  }

  if (!sportAgendaEvents.length && selectedAgendaSport !== "all" && selectedAgendaSport !== WORLDCUP_CATEGORY) {
    const sportLabel = availableAgendaSports.find((sport) => sport.key === selectedAgendaSport)?.label || "este deporte";
    setAgendaStatus(`No hay eventos de ${sportLabel} por ahora.`, false, true);
    return;
  }

  if (!agendaEvents.length) {
    const sportLabel = selectedAgendaSport === "all" ? "" : ` de ${selectedAgendaSport === WORLDCUP_CATEGORY ? "Mundial" : availableAgendaSports.find((sport) => sport.key === selectedAgendaSport)?.label || "este deporte"}`;
    if (!isDateView) {
      setAgendaStatus(`No hay eventos${sportLabel} en "${AGENDA_VIEWS[selectedAgendaView].label}" por ahora.`, false, true);
      return;
    }
    setAgendaStatus(`No hay eventos${sportLabel} para ${formatAgendaDateTabLabel(selectedAgendaDate)}.`, false, true);
    return;
  }

  setAgendaStatus("", false, false);

  agendaEvents.forEach((event) => {
    dom.agendaGrid.append(createAgendaCard(event, agendaEvents));
  });

  restoreTvHomeFocus(activeFocusKey);
}

function setAgendaStatus(message, isError, isProminent) {
  dom.agendaStatus.textContent = message;
  dom.agendaStatus.hidden = !message;
  dom.agendaStatus.classList.toggle("is-error", isError);
  dom.agendaStatus.classList.toggle("is-prominent", isProminent);
}

function renderAgendaSkeletons() {
  if (dom.agendaGrid.childElementCount) return;
  for (let index = 0; index < 4; index += 1) {
    const skeleton = createElement("article", "event-card event-card-skeleton");
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.append(
      createElement("span", "skeleton-line is-short", ""),
      createElement("div", "skeleton-body", ""),
      createElement("span", "skeleton-line is-button", ""),
    );
    dom.agendaGrid.append(skeleton);
  }
}

function hasPlayableServers(event) {
  const servers = event.serverItems || getEventServerItems(event);
  return servers.length > 0;
}

function getSimultaneousAgendaEvents(event, events) {
  const eventDate = event.parsedDate || event.worldcupGame?.parsedDate;

  if (!eventDate || !hasPlayableServers(event)) {
    return [];
  }

  return events.filter((candidate) => {
    if (!candidate || candidate.id === event.id || !hasPlayableServers(candidate)) {
      return false;
    }

    const candidateDate = candidate.parsedDate || candidate.worldcupGame?.parsedDate;

    if (!candidateDate) {
      return false;
    }

    return Math.abs(candidateDate.getTime() - eventDate.getTime()) <= SIMULTANEOUS_MATCH_TOLERANCE;
  });
}

function createAgendaCard(event, agendaEvents = []) {
  const status = event.statusInfo || getAgendaStatus(event);
  const servers = event.serverItems || getEventServerItems(event);
  const playlistTitle = `Servidores de ${event.title}`;
  const card = createElement("article", `match-card event-card is-${status.key} is-${event.displayMode || "title"}`);
  card.dataset.eventId = event.id;
  applyEventPalette(card, event);

  const head = createElement("div", "match-head");
  const leagueRaw = cleanText(event.leagueName || "");
  const leagueText = leagueRaw && !/streamx/i.test(leagueRaw) ? leagueRaw : cleanText(event.sportName || "");
  const leagueWrap = createElement("div", "match-league-wrap");
  if (event.isWorldcup && event.leagueBadge) {
    const badge = makeLeagueBadge(event.leagueBadge, "match-league-badge");
    if (badge) leagueWrap.append(badge);
  }
  leagueWrap.append(createElement("span", "match-league", leagueText || "Evento"));
  head.append(leagueWrap);
  const headActions = createElement("div", "event-head-actions");
  const favoriteButton = createElement("button", "event-favorite-button", "★");
  const isFavorite = favoriteEventKeys.has(getFavoriteEventKey(event));
  favoriteButton.type = "button";
  favoriteButton.classList.toggle("is-active", isFavorite);
  favoriteButton.setAttribute("aria-label", isFavorite ? "Quitar de favoritos" : "Agregar a favoritos");
  favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  favoriteButton.addEventListener("click", () => toggleFavoriteEvent(event));
  headActions.append(favoriteButton, createElement("span", `match-status ${status.key}`, status.label));
  head.append(headActions);

  const body = createElement("div", "event-card-body");
  const summary = createEventSummary(event, status);
  const action = createElement("div", "event-card-action");

  if (servers.length) {
    const watchButton = createElement("button", "watch-button");
    watchButton.type = "button";
    watchButton.dataset.tvFocusKey = `watch:${event.id}`;
    watchButton.append(createElement("span", "watch-button-icon", ""), createElement("span", "", "Ver transmisión"));
    watchButton.firstElementChild.append(createPlayIcon());
    watchButton.addEventListener("click", () => openItem(servers[0], { playlist: servers, playlistTitle, match: event }));
    action.append(watchButton);
  } else {
    const pending = createElement("button", "watch-button is-disabled", "No disponible");
    pending.type = "button";
    pending.dataset.tvFocusKey = `pending:${event.id}`;
    pending.disabled = true;
    action.append(pending);
  }

  body.append(createEventVisual(event), summary, action);
  card.append(head, body);
  return card;
}

function getEventDisplayCopy(event) {
  if (event.hasTeams) {
    return {
      title: `${event.homeTeam} vs ${event.awayTeam}`,
      context: "",
    };
  }

  const rawTitle = cleanText(event.title || "Evento");
  const league = cleanText(event.leagueName || event.sportName || "");
  const separator = rawTitle.includes(" - ") ? " - " : (rawTitle.includes(": ") ? ": " : "");

  if (!separator) {
    return { title: rawTitle, context: "" };
  }

  const parts = rawTitle.split(separator).map(cleanText).filter(Boolean);
  const title = parts.pop() || rawTitle;
  let context = parts.join(separator);

  if (league && normalizeText(context).startsWith(normalizeText(league))) {
    context = cleanText(context.slice(league.length)).replace(/^[-·:]+\s*/, "");
  }

  return { title, context };
}

function createEventSummary(event, status) {
  const summary = createElement("div", "event-card-summary");
  const copy = getEventDisplayCopy(event);
  const meta = createElement("div", "event-card-meta");
  const league = cleanText(event.leagueName || event.sportName || "Evento");

  meta.append(createElement("span", "", league));
  if (copy.context) {
    meta.append(createElement("span", "event-meta-dot", ""), createElement("span", "", copy.context.replace(/#/g, "")));
  }

  const title = createElement("h3", "event-card-title", copy.title);
  title.title = cleanText(event.title || copy.title);
  summary.append(title, meta);

  if (event.displayMode === "teams" && status.key !== "upcoming") {
    const [homeScore, awayScore] = getAgendaScorePair(event);
    if (homeScore !== "-" && awayScore !== "-") {
      summary.append(createElement("div", "event-scoreline", `${homeScore} — ${awayScore}`));
    }
  }

  const timing = createElement("div", `event-timing is-${status.key}`);
  timing.append(createElement("span", "event-timing-dot", ""));
  const timingText = createElement("span", "event-timing-text", getEventTimingText(event, status));
  const eventDate = event.parsedDate || event.worldcupGame?.parsedDate;
  if (eventDate) timingText.dataset.eventStart = String(eventDate.getTime());
  timingText.dataset.eventDuration = String(Number(event.duration || 130) + Number(event.extraTime || 0));
  timingText.dataset.eventStatus = status.key;
  timing.append(timingText);
  summary.append(timing);

  const servers = event.serverItems || getEventServerItems(event);
  if (servers.length) {
    const sourceMeta = createElement("div", "event-source-meta");
    const languages = Array.from(new Set(servers.map((server) => server.language).filter(Boolean)));
    const qualities = Array.from(new Set(servers.map((server) => server.quality).filter(Boolean)));
    sourceMeta.append(
      createElement("span", "", `${servers.length} fuente${servers.length === 1 ? "" : "s"}`),
      createElement("span", "", languages.join(" / ") || "Idioma variable"),
      createElement("span", "", qualities.join(" / ") || "Calidad variable"),
    );
    summary.append(sourceMeta);
  }

  const credits = [event.homeProfile, event.awayProfile].filter((profile, index, profiles) => (
    profile?.source && profile?.sourceUrl && profiles.findIndex((item) => item?.sourceUrl === profile.sourceUrl) === index
  ));
  if (credits.length) {
    const creditRow = createElement("div", "event-photo-credits");
    credits.forEach((profile) => {
      const credit = createElement("a", "", `Foto: ${profile.source}`);
      credit.href = profile.sourceUrl;
      credit.target = "_blank";
      credit.rel = "noopener noreferrer";
      creditRow.append(credit);
    });
    summary.append(creditRow);
  }

  return summary;
}

function getEventTimingText(event, status = event.statusInfo || getAgendaStatus(event)) {
  if (status.key === "live") return "Ahora en juego";
  if (status.key === "finished") return "Evento finalizado";
  const date = event.parsedDate || event.worldcupGame?.parsedDate;
  if (!date) return "Horario por confirmar";
  const remaining = date.getTime() - Date.now();
  if (remaining > 0 && remaining <= 24 * 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.ceil(remaining / 60000));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours ? `Comienza en ${hours} h${rest ? ` ${rest} min` : ""}` : `Comienza en ${minutes} min`;
  }
  return `${formatAgendaTime(event)} · ${formatAgendaDayShort(event)}`;
}

function updateCountdownLabels() {
  document.querySelectorAll(".event-timing-text[data-event-start]").forEach((label) => {
    const date = new Date(Number(label.dataset.eventStart));
    const pseudoEvent = { parsedDate: date, duration: Number(label.dataset.eventDuration || 130) };
    const status = getStreamxStatus(pseudoEvent);
    label.textContent = getEventTimingText(pseudoEvent, status);
    const timing = label.closest(".event-timing");
    if (timing) {
      timing.classList.remove("is-live", "is-upcoming", "is-finished");
      timing.classList.add(`is-${status.key}`);
    }
  });
  updateLastUpdatedLabel();
}

function updateLastUpdatedLabel() {
  if (!lastStreamxLoadedAt) return;
  const seconds = Math.max(0, Math.floor((Date.now() - lastStreamxLoadedAt) / 1000));
  dom.lastUpdated.textContent = seconds < 10 ? "Actualizado ahora" : `Actualizado hace ${seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min`}`;
}

function createEventVisual(event) {
  const visual = createElement("div", `event-card-visual is-${event.displayMode || "title"}`);

  if (event.displayMode === "individual" && (!event.homeLogo || !event.awayLogo)) {
    const applyPromo = (artwork) => {
      if (!artwork || !visual.isConnected) return;
      const image = document.createElement("img");
      image.alt = cleanText(event.title || `${event.homeTeam} vs ${event.awayTeam}`);
      image.loading = "lazy";
      image.onload = () => {
        visual.className = "event-card-visual is-promo";
        visual.replaceChildren(image);
      };
      image.src = artwork;
    };

    if (event.matchThumb) {
      window.requestAnimationFrame(() => applyPromo(event.matchThumb));
    } else {
      resolveBillboardArtwork(event).then(applyPromo);
    }
  }

  if (event.hasTeams) {
    visual.append(
      createEventVisualMark(event.homeTeam, event.homeLogo, "is-home"),
      createElement("span", "event-visual-vs", "VS"),
      createEventVisualMark(event.awayTeam, event.awayLogo, "is-away"),
    );
    return visual;
  }

  const logo = firstImageUrl(event.eventLogo, event.leagueLogo);
  if (logo) {
    const image = document.createElement("img");
    image.src = logo;
    image.alt = cleanText(event.leagueName || event.title || "Evento");
    image.loading = "lazy";
    image.onerror = () => visual.replaceChildren(createSportIcon(getAgendaSportIcon(getAgendaSportKey(event))));
    visual.append(image);
  } else {
    visual.append(createSportIcon(getAgendaSportIcon(getAgendaSportKey(event))));
  }

  return visual;
}

function createEventVisualMark(name, logo, className) {
  const mark = createElement("span", `event-visual-mark ${className}`);
  mark.textContent = makeInitials(name);

  if (logo) {
    const image = document.createElement("img");
    image.src = logo;
    image.alt = cleanText(name);
    image.loading = "lazy";
    image.onload = () => mark.classList.add("has-image");
    image.onerror = () => image.remove();
    mark.append(image);
  }

  return mark;
}

function getAgendaStatus(event) {
  if (event.worldcupGame) {
    return getWorldcupGameStatus(event.worldcupGame);
  }

  return getStreamxStatus(event);
}

function getWorldcupGameStatus(game) {
  const finished = normalizeText(game.finished) === "true" || normalizeText(game.time_elapsed) === "finished";
  const elapsed = normalizeText(game.time_elapsed);

  if (finished) {
    return { key: "finished", label: "FINALIZADO" };
  }

  if (elapsed.includes("live") || elapsed.includes("playing")) {
    return { key: "live", label: "EN VIVO" };
  }

  return { key: "upcoming", label: "PRONTO" };
}

function formatAgendaEndTime(event) {
  const start = event.parsedDate || event.worldcupGame?.parsedDate;

  if (!start) {
    return "hora pendiente";
  }

  const duration = Number(event.duration || 130) + Number(event.extraTime || 0);
  const end = new Date(start.getTime() + duration * 60000);

  return formatPeruTime(end);
}

function formatAgendaTime(event) {
  const date = event.parsedDate || event.worldcupGame?.parsedDate;

  if (!date) {
    return "Horario pendiente";
  }

  return formatPeruTime(date);
}

function formatAgendaDate(event) {
  const date = event.parsedDate || event.worldcupGame?.parsedDate;

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

function hasLiveWorldcupGame() {
  return worldcupGames.some((game) => getWorldcupGameStatus(game).key === "live");
}

function restoreTvHomeFocus(activeFocusKey) {
  if (!activeFocusKey || !isTvMode() || !dom.player.hidden) {
    return;
  }

  window.setTimeout(() => {
    const target = Array.from(document.querySelectorAll("[data-tv-focus-key]"))
      .find((element) => element.dataset.tvFocusKey === activeFocusKey);
    target?.focus({ preventScroll: true });
  }, 0);
}

function getAgendaScorePair(event) {
  const game = event.worldcupGame;

  if (game) {
    const status = getWorldcupGameStatus(game);
    if (status.key === "upcoming" && !game.homeScore && !game.awayScore) {
      return ["-", "-"];
    }
    return [
      String(event.worldcupScoreHome ?? game.homeScore ?? 0),
      String(event.worldcupScoreAway ?? game.awayScore ?? 0),
    ];
  }

  if (hasSportsDbScore(event)) {
    return [String(event.sportsDbScoreHome), String(event.sportsDbScoreAway)];
  }

  return ["-", "-"];
}

function formatAgendaDayShort(event) {
  const date = event.parsedDate || event.worldcupGame?.parsedDate;

  if (!date) {
    return "Por definir";
  }

  const key = getPeruDateKey(date);
  const today = getPeruDateKey();
  const tomorrow = getPeruDateKey(new Date(dateFromPeruKey(today).getTime() + 86400000));

  if (key === today) return "Hoy";
  if (key === tomorrow) return "Mañana";

  return new Intl.DateTimeFormat("es-PE", {
    timeZone: PERU_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getEventServerItems(event) {
  const servers = Array.isArray(event.servers) ? event.servers : [];

  return servers
    .filter((server) => server && server.active !== false && server.url)
    .map((server, index) => {
      const sourceUrl = canonicalizeStreamxUrl(server.url);

      if (!sourceUrl) {
        return null;
      }

      return {
        sourceName: cleanText(server.name || "Servidor"),
        sourceUrl,
        sourceKey: `streamx-event:${event.id}:${index}`,
        name: event.title || "Evento",
        language: normalizeStreamxLanguage(server),
        country: "world",
        quality: cleanText(server.quality || "HD"),
        type: "StreamX-HD",
        category: STREAMX_EVENT_CATEGORY,
      };
    })
    .filter(Boolean);
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

  return safeZonedTimeToDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] || 0),
    sourceTimeZone
  );
}

function safeZonedTimeToDate(year, month, day, hour, minute, second, timeZone) {
  try {
    return zonedTimeToDate(year, month, day, hour, minute, second, timeZone || PERU_TIME_ZONE);
  } catch (error) {
    if (timeZone && timeZone !== PERU_TIME_ZONE) {
      try {
        return zonedTimeToDate(year, month, day, hour, minute, second, PERU_TIME_ZONE);
      } catch (fallbackError) {
        return null;
      }
    }

    return null;
  }
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

  return formatPeruTime(date);
}

function formatPeruTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PERU_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
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

function parseTeamsFromTitle(value) {
  const parts = cleanText(value).split(/\s+v(?:s\.?)?\s+/i);

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { homeTeam: "", awayTeam: "" };
  }

  return { homeTeam: cleanText(parts[0]), awayTeam: cleanText(parts[1]) };
}

function formatCompactMatchTitle(event) {
  const home = cleanText(event.homeTeam || "");
  const away = cleanText(event.awayTeam || "");
  return home && away ? `${home} vs ${away}` : cleanText(event.title || "otro evento");
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

function firstImageUrl(...values) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map(cleanText)
    .find(isUrl) || "";
}

function getSportPalette(sportKey) {
  return SPORT_PALETTES[sportKey] || SPORT_PALETTES.generic;
}

function getEventPaletteSources(event) {
  if (event.hasTeams) {
    return [
      firstImageUrl(event.homeLogo, event.eventLogo, event.leagueLogo),
      firstImageUrl(event.awayLogo, event.leagueLogo, event.eventLogo),
    ].filter(Boolean);
  }

  return [firstImageUrl(event.eventLogo, event.leagueLogo, event.sportLogo)].filter(Boolean);
}

function colorDistance(first, second) {
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}

function getColorSaturation([red, green, blue]) {
  const max = Math.max(red, green, blue) / 255;
  const min = Math.min(red, green, blue) / 255;
  const lightness = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
}

function extractImagePalette(url) {
  if (!url) {
    return Promise.resolve([]);
  }

  if (imagePaletteCache.has(url)) {
    return imagePaletteCache.get(url);
  }

  const request = new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve([]), 6000);

    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      window.clearTimeout(timeout);

      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        const buckets = new Map();

        for (let index = 0; index < pixels.length; index += 16) {
          const alpha = pixels[index + 3];
          if (alpha < 160) continue;

          const color = [pixels[index], pixels[index + 1], pixels[index + 2]];
          const lightness = (Math.max(...color) + Math.min(...color)) / 510;
          const saturation = getColorSaturation(color);
          if (lightness < 0.14 || lightness > 0.88 || saturation < 0.2) continue;

          const quantized = color.map((channel) => Math.round(channel / 32) * 32);
          const key = quantized.join(",");
          const current = buckets.get(key) || { color: quantized, weight: 0 };
          current.weight += 1 + saturation * 2;
          buckets.set(key, current);
        }

        const ranked = Array.from(buckets.values()).sort((a, b) => b.weight - a.weight);
        const palette = [];
        ranked.forEach(({ color }) => {
          if (palette.length < 2 && palette.every((selected) => colorDistance(selected, color) > 72)) {
            palette.push(color.map((channel) => Math.max(24, Math.min(232, channel))));
          }
        });
        resolve(palette);
      } catch (error) {
        resolve([]);
      }
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve([]);
    };
    image.src = `${IMAGE_PROXY_URL}?url=${encodeURIComponent(url)}`;
  });

  imagePaletteCache.set(url, request);
  return request;
}

async function resolveEventPalette(event) {
  const sources = getEventPaletteSources(event);
  const cacheKey = `${event.id}|${sources.join("|")}`;

  if (eventPaletteCache.has(cacheKey)) {
    return eventPaletteCache.get(cacheKey);
  }

  const request = (async () => {
    const fallback = getSportPalette(getAgendaSportKey(event));
    const palettes = await Promise.all(sources.map(extractImagePalette));

    if (event.hasTeams && palettes.length > 1) {
      return [palettes[0][0] || fallback[0], palettes[1][0] || fallback[1]];
    }

    const extracted = palettes[0] || [];
    return [extracted[0] || fallback[0], extracted[1] || fallback[1]];
  })();

  eventPaletteCache.set(cacheKey, request);
  return request;
}

function setPaletteVariables(element, palette, prefix = "event") {
  const [first, second] = palette;
  const setColor = (name, color) => {
    element.style.setProperty(`--${prefix}-${name}`, `rgb(${color.join(", ")})`);
    element.style.setProperty(`--${prefix}-${name}-soft`, `rgba(${color.join(", ")}, 0.16)`);
    element.style.setProperty(`--${prefix}-${name}-glow`, `rgba(${color.join(", ")}, 0.32)`);
  };
  setColor("a", first);
  setColor("b", second);
}

function applyEventPalette(element, event) {
  const fallback = getSportPalette(getAgendaSportKey(event));
  setPaletteVariables(element, fallback);
  resolveEventPalette(event).then((palette) => {
    if (element.isConnected) {
      setPaletteVariables(element, palette);
    }
  });
}

function applyPagePalette(event) {
  const requestId = ++pagePaletteRequest;
  const fallback = getSportPalette(event ? getAgendaSportKey(event) : "generic");
  setPaletteVariables(document.documentElement, fallback, "page");

  if (!event) return;
  resolveEventPalette(event).then((palette) => {
    if (requestId === pagePaletteRequest) {
      setPaletteVariables(document.documentElement, palette, "page");
    }
  });
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function toBase64Id(value) {
  return btoa(unescape(encodeURIComponent(value))).replace(/=/g, "");
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

function normalizeUrl(value) {
  const text = cleanText(value);

  if (!isUrl(text)) {
    return "";
  }

  try {
    const parsed = new URL(text);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch (error) {
    return "";
  }
}

function extractIframeSrc(value) {
  const match = value.match(/<iframe\b[^>]*\bsrc=(['"])(.*?)\1/i);
  return match ? match[2] : "";
}

function extractIframeTitle(value) {
  const match = String(value || "").match(/<iframe\b[^>]*\btitle=(['"])(.*?)\1/i);
  return match ? cleanText(match[2]) : "";
}

function buildIframe(src, title = "Player embed") {
  const sandbox = embedProtectionEnabled ? ` sandbox="${EMBED_SANDBOX}"` : "";
  return `<iframe src="${escapeAttribute(src)}" title="${escapeAttribute(title)}" width="100%" height="100%" frameborder="0" scrolling="no" allow="${DEFAULT_ALLOW}"${sandbox} webkitallowfullscreen></iframe>`;
}

function normalizeEmbed(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  const iframeSrc = extractIframeSrc(trimmed);

  if (iframeSrc) {
    return normalizeUrl(iframeSrc);
  }

  return normalizeUrl(trimmed);
}

function getEmbedSrc(value) {
  return normalizeEmbed(value);
}

function createEmbedFrame(src, title = "Player embed") {
  const frame = document.createElement("iframe");
  frame.title = cleanText(title) || "Player embed";
  frame.width = "100%";
  frame.height = "100%";
  frame.frameBorder = "0";
  frame.scrolling = "no";
  frame.allow = DEFAULT_ALLOW;
  if (embedProtectionEnabled) {
    frame.setAttribute("sandbox", EMBED_SANDBOX);
  }
  frame.setAttribute("webkitallowfullscreen", "true");
  frame.setAttribute("allowtransparency", "true");
  frame.setAttribute("playsinline", "true");
  frame.referrerPolicy = "no-referrer";
  frame.src = src;
  return frame;
}

function prepareEmbeds(container) {
  const frames = container.tagName === "IFRAME" ? [container] : Array.from(container.querySelectorAll("iframe"));

  frames.forEach((frame) => {
    const currentAllow = frame.getAttribute("allow") || "";
    const permissions = new Set(
      `${currentAllow}; ${DEFAULT_ALLOW}`
        .split(";")
        .map((permission) => permission.trim())
        .filter(Boolean)
    );

    frame.setAttribute("allow", Array.from(permissions).join("; "));
    frame.setAttribute("title", frame.getAttribute("title") || "Player embed");
    if (embedProtectionEnabled) {
      frame.setAttribute("sandbox", EMBED_SANDBOX);
    } else {
      frame.removeAttribute("sandbox");
    }
    frame.setAttribute("webkitallowfullscreen", "true");
    frame.setAttribute("playsinline", "true");
    frame.setAttribute("referrerpolicy", "no-referrer");
  });
}

function createIosPlaybackHint() {
  const hint = createElement("div", "ios-playback-hint");
  hint.append(
    createPlayIcon(),
    createElement("span", "", "Toca el reproductor para iniciar el video")
  );
  return hint;
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

function createSportIcon(iconName) {
  const safeIconName = String(iconName || "generic").replace(/[^a-z0-9-]/gi, "") || "generic";
  const wrapper = createElement("span", `sport-icon sport-icon--${safeIconName}`);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  wrapper.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("focusable", "false");

  const add = (tagName, attributes) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);

    Object.entries(attributes).forEach(([name, value]) => {
      node.setAttribute(name, value);
    });

    svg.append(node);
  };

  switch (safeIconName) {
    case "grid":
      [[5, 5], [14, 5], [5, 14], [14, 14]].forEach(([x, y]) => add("rect", { x, y, width: 5, height: 5, rx: 1.4 }));
      break;
    case "cup":
      add("path", { d: "M8 4h8v3a4 4 0 0 1-8 0V4Z" });
      add("path", { d: "M8 6H5.5A2.5 2.5 0 0 0 8 9" });
      add("path", { d: "M16 6h2.5A2.5 2.5 0 0 1 16 9" });
      add("path", { d: "M12 11v5" });
      add("path", { d: "M8.5 20h7" });
      add("path", { d: "M10 16h4l1 4H9l1-4Z" });
      break;
    case "soccer":
      add("circle", { cx: 12, cy: 12, r: 8 });
      add("path", { d: "m12 7.5 3.2 2.3-1.2 3.8h-4l-1.2-3.8L12 7.5Z" });
      add("path", { d: "M9.1 9.8 6.6 8.7M14.9 9.8l2.5-1.1M10 13.6l-1.2 3M14 13.6l1.2 3" });
      break;
    case "octagon":
    case "ring":
      add("path", { d: "M8.5 4h7L20 8.5v7L15.5 20h-7L4 15.5v-7L8.5 4Z" });
      add("path", { d: "M8 12h8" });
      break;
    case "glove":
      add("path", { d: "M8.5 5.5h5.2a4.2 4.2 0 0 1 4.2 4.2v1.7a5.6 5.6 0 0 1-5.6 5.6H8.5A4.5 4.5 0 0 1 4 12.5V10a4.5 4.5 0 0 1 4.5-4.5Z" });
      add("path", { d: "M7 16.5V20h7v-3" });
      add("path", { d: "M10 6v6" });
      add("path", { d: "M13 6v5" });
      break;
    case "bolt":
      add("path", { d: "M13 2 5 13h6l-1 9 9-13h-6l1-7Z", fill: "currentColor", stroke: "none" });
      break;
    case "baseball":
      add("circle", { cx: 12, cy: 12, r: 8 });
      add("path", { d: "M8.2 5.1c2.3 2.2 2.3 11.6 0 13.8" });
      add("path", { d: "M15.8 5.1c-2.3 2.2-2.3 11.6 0 13.8" });
      break;
    case "basketball":
      add("circle", { cx: 12, cy: 12, r: 8 });
      add("path", { d: "M4 12h16" });
      add("path", { d: "M12 4v16" });
      add("path", { d: "M6.6 6.2c3.1 2.1 3.1 9.5 0 11.6" });
      add("path", { d: "M17.4 6.2c-3.1 2.1-3.1 9.5 0 11.6" });
      break;
    case "tennis":
      add("circle", { cx: 12, cy: 12, r: 8 });
      add("path", { d: "M5.8 7.2c4.8.7 10.3 6.2 11 11" });
      add("path", { d: "M18.2 6.1c-4.6.8-10.8 7-11.4 11.7" });
      break;
    case "flag":
      add("path", { d: "M6 21V4" });
      add("path", { d: "M6 5h11l-2 4 2 4H6" });
      break;
    case "football":
    case "rugby":
      add("ellipse", { cx: 12, cy: 12, rx: 8, ry: 5, transform: "rotate(-22 12 12)" });
      add("path", { d: "M8.3 13.6 15.7 10.4" });
      add("path", { d: "m10.6 11.3.8 1.8M12.7 10.4l.8 1.8" });
      break;
    case "volleyball":
      add("circle", { cx: 12, cy: 12, r: 8 });
      add("path", { d: "M12 4c.3 3.5-1.1 6-4.8 7.2" });
      add("path", { d: "M19.2 8.6c-3.3-.6-6.2.4-8.7 3" });
      add("path", { d: "M8.5 19.1c1.1-3.3 3.4-5.4 7-6.3" });
      break;
    case "stick":
      add("path", { d: "M15 4 8 17" });
      add("path", { d: "M8 17h7.5c1.3 0 2.5.9 2.8 2.2" });
      add("path", { d: "M6 20h4" });
      break;
    case "golf":
      add("path", { d: "M7 4v16" });
      add("path", { d: "M7 4h8l-1.4 2L15 8H7" });
      add("circle", { cx: 16, cy: 19, r: 1.5 });
      break;
    case "wheel":
      add("circle", { cx: 12, cy: 12, r: 8 });
      add("circle", { cx: 12, cy: 12, r: 2 });
      add("path", { d: "M12 4v16M4 12h16M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" });
      break;
    case "bat":
      add("path", { d: "M5 19 16.5 7.5" });
      add("path", { d: "M14.5 5.5 18.5 9.5" });
      add("path", { d: "M4 20l3-3" });
      add("circle", { cx: 18.5, cy: 5.5, r: 1.4 });
      break;
    case "pad":
      add("rect", { x: 4, y: 8, width: 16, height: 9, rx: 4 });
      add("path", { d: "M8 12h4M10 10v4" });
      add("circle", { cx: 15.5, cy: 11, r: 0.8, fill: "currentColor", stroke: "none" });
      add("circle", { cx: 17.5, cy: 14, r: 0.8, fill: "currentColor", stroke: "none" });
      break;
    default:
      add("path", { d: "M12 4 20 12 12 20 4 12 12 4Z" });
      add("path", { d: "M12 8v8M8 12h8" });
  }

  wrapper.append(svg);
  return wrapper;
}

function enableHorizontalDragScroll(container, options = {}) {
  const dragButtons = options.dragButtons !== false;
  let pointerId = null;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;

  container.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    if (!dragButtons && event.target.closest("button")) {
      dragged = false;
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = container.scrollLeft;
    dragged = false;
  });

  container.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startX;

    if (Math.abs(deltaX) > 12) {
      dragged = true;
      container.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
    }
  });

  ["pointerup", "pointercancel"].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      if (pointerId === event.pointerId) {
        pointerId = null;
      }
    });
  });

  container.addEventListener("click", (event) => {
    if (dragged) {
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    }
  }, true);

  container.addEventListener("wheel", (event) => {
    if (container.scrollWidth <= container.clientWidth) {
      return;
    }

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

    if (!delta) {
      return;
    }

    container.scrollLeft += delta;
    event.preventDefault();
  }, { passive: false });
}

function createPaneTeam(teamName, logo) {
  const team = createElement("span", "pane-team");
  const flag = createElement("span", "pane-flag");
  const flagCode = getTeamFlagCode(teamName);
  const useFallback = () => {
    flag.replaceChildren();
    flag.classList.add("is-fallback");
    flag.textContent = makeInitials(teamName).slice(0, 2);
  };

  if (logo) {
    const image = document.createElement("img");
    image.src = logo;
    image.alt = teamName;
    image.loading = "lazy";
    image.onerror = useFallback;
    flag.append(image);
  } else if (flagCode) {
    const image = document.createElement("img");
    image.src = `https://flagcdn.com/${flagCode}.svg`;
    image.alt = teamName;
    image.loading = "lazy";
    image.onerror = useFallback;
    flag.append(image);
  } else {
    useFallback();
  }

  team.append(flag, createElement("strong", "", teamName));
  return team;
}

function createPaneMatchHeader(paneState, paneId) {
  const header = createElement("div", "pane-match-inner");
  const match = paneState.match;

  if (match) {
    const homeTeam = cleanText(match.homeTeam || "Local");
    const awayTeam = cleanText(match.awayTeam || "Visitante");
    const meta = createElement("span", "pane-match-meta", `${getPaneLabel(paneId)} · ${formatAgendaTime(match)}`);
    const versus = createElement("span", "pane-versus", "vs");

    header.append(
      meta,
      createElement("span", "pane-match-teams", ""),
    );
    header.lastElementChild.append(
      createPaneTeam(homeTeam, match.homeLogo),
      versus,
      createPaneTeam(awayTeam, match.awayLogo)
    );
    return header;
  }

  const item = paneState.item;
  const sourceName = item?.sourceName || getPaneLabel(paneId);
  const label = item ? `${item.name || item.language || "Canal"}` : "Sin canal seleccionado";

  header.append(
    createElement("span", "pane-match-meta", getPaneLabel(paneId)),
    createElement("strong", "pane-source-title", sourceName),
    createElement("span", "pane-source-subtitle", label)
  );
  return header;
}

function syncPaneMatchHeaders() {
  Object.values(PLAYER_PANES).forEach((paneId) => {
    const paneState = getPaneState(paneId);
    const pane = paneId === PLAYER_PANES.SECONDARY ? dom.secondaryPlayerPane : dom.primaryPlayerPane;
    const target = getPaneMatchElement(paneId);
    const title = paneState.match ? formatCompactMatchTitle(paneState.match) : paneState.item?.sourceName || getPaneLabel(paneId);

    target.replaceChildren(createPaneMatchHeader(paneState, paneId));
    target.setAttribute("aria-hidden", String(!isSplitMode()));
    pane.setAttribute("aria-label", `${getPaneLabel(paneId)}: ${title}`);
  });
}

function createFlag(channel) {
  const flag = createElement("span", "flag");
  const country = cleanText(channel.country || "world").toLowerCase();

  if (!country || country === "world") {
    flag.classList.add("flag-fallback");
    flag.textContent = "GL";
    flag.setAttribute("aria-hidden", "true");
    return flag;
  }

  const image = document.createElement("img");
  image.src = `https://flagcdn.com/w80/${country}.png`;
  image.alt = country.toUpperCase();
  image.loading = "lazy";
  flag.append(image);
  return flag;
}

function createSourceIcon(item) {
  const icon = createElement("span", "source-icon");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const isWorldCup = item.category === WORLDCUP_CATEGORY || item.category === STREAMX_EVENT_CATEGORY;

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

function getLiveEventForChannel(item) {
  if (item.category === STREAMX_EVENT_CATEGORY) {
    return null;
  }

  const sourceUrl = canonicalizeStreamxUrl(item.sourceUrl);
  const streamCode = extractStreamCode(sourceUrl);

  return streamxEvents.find((event) => {
    if (getStreamxStatus(event).key !== "live") {
      return false;
    }

    return normalizeStreamxEventServers(event).some((server) => {
      const serverCode = extractStreamCode(server.url);
      return server.url === sourceUrl || Boolean(streamCode && serverCode === streamCode);
    });
  }) || null;
}

function createChannelButton(item, playlist = null, playlistTitle = "", showLiveEvent = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.src = item.sourceUrl;
  button.dataset.sourceKey = getItemKey(item);

  const top = createElement("div", "channel-card-top");
  top.append(createSourceIcon(item), createFlag(item), createElement("strong", "", item.sourceName), createElement("span", "source-active-label", "En uso"));

  const meta = createElement("div", "meta-row");
  [item.language, item.quality, item.type].forEach((label) => {
    meta.append(createElement("span", "pill", label));
  });

  if (item.sourceName !== item.name) {
    meta.append(createElement("span", "pill", item.name));
  }

  button.append(top, meta);

  const liveEvent = showLiveEvent ? getLiveEventForChannel(item) : null;
  if (liveEvent) {
    const nowPlaying = createElement("div", "channel-now-playing");
    nowPlaying.append(
      createElement("span", "channel-now-playing-label", "Transmitiendo ahora"),
      createElement("strong", "channel-now-playing-title", liveEvent.title || "Evento en vivo")
    );
    button.append(nowPlaying);
  }

  button.addEventListener("click", () => openItem(item, {
    playlist: playlist || getPlayableItems(),
    playlistTitle: playlistTitle || "Biblioteca en vivo",
    keepPlaylist: Boolean(playlist),
  }));
  return button;
}

function createItemsSection(title, items, compact = false, modifier = "", playlist = null) {
  const sectionClass = compact ? "switcher-group" : "preset-language";
  const section = createElement("section", `${sectionClass}${modifier ? ` ${modifier}` : ""}`);

  section.append(createElement(compact ? "span" : "h2", compact ? "switcher-label" : "", title));

  const list = compact ? section : createElement("div", "preset-grid");
  items.forEach((item) => list.append(createChannelButton(item, playlist, title, compact)));

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

  if (worldCupItems.length) {
    dom.presetGroups.append(createItemsSection("Mundial 2026", worldCupItems, false, "is-worldcup"));
  }

  if (streamxItems.length) {
    dom.presetGroups.append(createItemsSection("StreamX-HD 24/7", streamxItems, false, "is-streamx"));
  }

  LANGUAGES.forEach((language) => {
    const languageItems = getVisibleItems(getRegularItems()).filter((item) => item.language === language);

    if (languageItems.length) {
      dom.presetGroups.append(createItemsSection(language, languageItems));
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

  renderChannelSwitcher();
}

function setActivePane(paneId, options = {}) {
  const nextPaneId = paneId === PLAYER_PANES.SECONDARY && !dom.secondaryPlayerPane.hidden
    ? PLAYER_PANES.SECONDARY
    : PLAYER_PANES.PRIMARY;

  activePaneId = nextPaneId;
  channelSwitcherTargetPaneId = "";
  syncSplitMode();
  updateActiveChannel(getCurrentSource(activePaneId), getPaneState(activePaneId).sourceKey, activePaneId);

  if (dom.channelSwitcher.classList.contains("is-open")) {
    renderChannelSwitcher();
  }

  if (!options.silent && isSplitMode()) {
    showChannelToast({
      sourceName: `${getPaneLabel(activePaneId)} activa`,
      name: "Vista doble",
      language: "El selector y las flechas controlan esta ventana",
      quality: "Split",
      sourceUrl: getCurrentSource(activePaneId),
    }, activePaneId);
  }
}

function syncSplitMode() {
  const splitActive = !dom.secondaryPlayerPane.hidden;
  dom.player.classList.toggle("is-split", splitActive);
  dom.primaryPlayerPane.classList.toggle("is-active", activePaneId === PLAYER_PANES.PRIMARY);
  dom.secondaryPlayerPane.classList.toggle("is-active", activePaneId === PLAYER_PANES.SECONDARY);
  syncPaneMatchHeaders();
  dom.splitButton.classList.toggle("is-active", splitActive);
  dom.splitButton.setAttribute("aria-label", splitActive ? "Cambiar ventana activa" : "Agregar segunda pantalla");
  dom.splitButton.setAttribute("title", splitActive ? "Cambiar ventana activa (V)" : "Agregar segunda pantalla (D)");
  dom.closeSplitButton.hidden = !splitActive;
  document.querySelectorAll("[data-activate-pane]").forEach((button) => {
    const isActivePaneButton = button.dataset.activatePane === activePaneId;
    button.tabIndex = splitActive ? 0 : -1;
    button.setAttribute("aria-hidden", String(!splitActive));
    button.setAttribute("aria-pressed", String(splitActive && isActivePaneButton));
  });
}

function closeSecondaryPane(options = {}) {
  if (dom.secondaryPlayerPane.hidden && !getPaneState(PLAYER_PANES.SECONDARY).sourceKey) {
    return;
  }

  dom.secondaryPlayerStage.replaceChildren();
  dom.secondaryPlayerPane.hidden = true;
  playerPaneStates[PLAYER_PANES.SECONDARY] = createPaneState();
  activePaneId = PLAYER_PANES.PRIMARY;
  channelSwitcherTargetPaneId = "";
  syncSplitMode();
  renderChannelSwitcher();

  if (!options.silent) {
    showChannelToast({
      sourceName: "Vista doble cerrada",
      name: "Ventana 1",
      language: "Reproductor unico",
      quality: "PC/TV",
      sourceUrl: getCurrentSource(PLAYER_PANES.PRIMARY),
    }, PLAYER_PANES.PRIMARY);
  }
}

function toggleActivePane() {
  if (!isSplitMode()) {
    toggleChannelSwitcher(true, { focus: true, paneId: PLAYER_PANES.SECONDARY });
    showChannelToast({
      sourceName: "Elige la segunda pantalla",
      name: "Vista doble",
      language: "Selecciona un canal para Ventana 2",
      quality: "Split",
      sourceUrl: getCurrentSource(PLAYER_PANES.PRIMARY),
    }, PLAYER_PANES.PRIMARY);
    return;
  }

  setActivePane(activePaneId === PLAYER_PANES.PRIMARY ? PLAYER_PANES.SECONDARY : PLAYER_PANES.PRIMARY);
}

function renderChannelSwitcher() {
  const paneId = getSwitcherPaneId();
  const paneState = getPaneState(paneId);
  const items = getPlayableItems();
  const visibleItems = getVisibleItems(items);
  const worldCupItems = getVisibleItems(getWorldCupItems());
  const streamxItems = getVisibleItems(getStreamxChannelItems());
  const regularItems = getVisibleItems(getRegularItems());
  const currentSourceIndex = paneState.playlist.findIndex((item) => getItemKey(item) === paneState.sourceKey);
  const headerSubtitle = paneState.playlist.length
    ? `${currentSourceIndex >= 0 ? `Fuente ${currentSourceIndex + 1} de ` : ""}${paneState.playlist.length} · ${getPaneLabel(paneId)}`
    : `${visibleItems.length} fuentes visibles`;

  dom.channelSwitcher.replaceChildren();

  const switcherHeader = createElement("div", "switcher-header");
  const switcherTitle = createElement("div");
  switcherTitle.append(
    createElement("strong", "", channelSwitcherTargetPaneId ? `Elegir ${getPaneLabel(paneId)}` : paneState.playlist.length ? `Servidores del evento · ${getPaneLabel(paneId)}` : `Canales · ${getPaneLabel(paneId)}`),
    createElement("span", "", headerSubtitle)
  );
  switcherHeader.append(switcherTitle);
  dom.channelSwitcher.append(switcherHeader);

  if (paneState.playlist.length) {
    dom.channelSwitcher.append(createItemsSection(paneState.playlistTitle || "Servidores del evento", paneState.playlist, true, "is-event", paneState.playlist));
  }

  if (streamxItems.length) {
    dom.channelSwitcher.append(createItemsSection("StreamX-HD 24/7", streamxItems, true, "is-streamx"));
  }

  if (worldCupItems.length) {
    dom.channelSwitcher.append(createItemsSection("Mundial 2026", worldCupItems, true, "is-worldcup"));
  }

  LANGUAGES.forEach((language) => {
    const languageItems = regularItems.filter((item) => item.language === language);

    if (languageItems.length) {
      dom.channelSwitcher.append(createItemsSection(language, languageItems, true));
    }
  });

  updateActiveChannel(getCurrentSource(paneId), paneState.sourceKey, paneId);
  syncChannelSwitcherAccessibility();
}

function toggleChannelSwitcher(force, options = {}) {
  const activeElement = document.activeElement;
  const wasOpen = dom.channelSwitcher.classList.contains("is-open");

  if (options.paneId) {
    channelSwitcherTargetPaneId = options.paneId;
  }

  const isOpen = typeof force === "boolean"
    ? dom.channelSwitcher.classList.toggle("is-open", force)
    : dom.channelSwitcher.classList.toggle("is-open");

  if (isOpen && (!wasOpen || options.paneId)) {
    renderChannelSwitcher();
  }

  dom.channelsButton.setAttribute("aria-expanded", String(isOpen));
  syncChannelSwitcherAccessibility(isOpen);

  if (isOpen && (options.focus || isCompactViewport())) {
    focusActiveSwitcherItem();
  }

  if (!isOpen) {
    channelSwitcherTargetPaneId = "";
  }

  if (!isOpen && isTvMode()) {
    focusTvOverlay();
  } else if (!isOpen && activeElement instanceof HTMLElement && dom.channelSwitcher.contains(activeElement)) {
    dom.channelsButton.focus({ preventScroll: true });
  }

  return isOpen;
}

function syncChannelSwitcherAccessibility(isOpen = dom.channelSwitcher.classList.contains("is-open")) {
  dom.channelSwitcher.setAttribute("aria-hidden", String(!isOpen));

  if ("inert" in dom.channelSwitcher) {
    dom.channelSwitcher.inert = !isOpen;
  }

  dom.channelSwitcher.toggleAttribute("inert", !isOpen);
  dom.channelSwitcher.querySelectorAll("button").forEach((button) => {
    if (isOpen) {
      button.removeAttribute("tabindex");
    } else {
      button.tabIndex = -1;
    }
  });
}

function focusActiveSwitcherItem() {
  if (!dom.channelSwitcher.classList.contains("is-open")) {
    return;
  }

  window.setTimeout(() => {
    const target = dom.channelSwitcher.querySelector("button.is-active") || dom.channelSwitcher.querySelector("button") || dom.channelSwitcher;
    target.focus({ preventScroll: false });
  }, 0);
}

function updateActiveChannel(src, sourceKey = "") {
  document.querySelectorAll("[data-src]").forEach((button) => {
    const isActive = sourceKey
      ? button.dataset.sourceKey === sourceKey
      : button.dataset.src === src;

    button.classList.toggle("is-active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function getCurrentSource(paneId = activePaneId) {
  const frame = getPaneStage(paneId).querySelector("iframe");
  return frame?.getAttribute("src") || "";
}

function getCurrentSourceIndex(paneId = activePaneId) {
  const paneState = getPaneState(paneId);
  const currentSource = getCurrentSource(paneId);
  const items = getNavigationItems(paneId);

  if (paneState.sourceKey) {
    const keyIndex = items.findIndex((item) => getItemKey(item) === paneState.sourceKey);

    if (keyIndex !== -1) {
      return keyIndex;
    }
  }

  return items.findIndex((item) => item.sourceUrl === currentSource);
}

function getNavigationItems(paneId = activePaneId) {
  const paneState = getPaneState(paneId);
  return paneState.playlist.length ? paneState.playlist : getPlayableItems();
}

function getItemKey(item) {
  return item?.sourceKey || item?.sourceUrl || "";
}

function openItemByOffset(offset, paneId = activePaneId) {
  const items = getNavigationItems(paneId);

  if (!items.length) {
    return;
  }

  const currentIndex = getCurrentSourceIndex(paneId);
  const safeIndex = currentIndex === -1 ? (offset > 0 ? -1 : 0) : currentIndex;
  const nextIndex = (safeIndex + offset + items.length) % items.length;
  openItem(items[nextIndex], { paneId, keepFullscreen: true, keepSplit: true, announce: true, playlist: items, keepPlaylist: true });
}

function retryCurrentSource(paneId = activePaneId) {
  const paneState = getPaneState(paneId);
  if (!paneState.item?.sourceUrl) return;
  showChannelToast({ ...paneState.item, sourceName: `Reintentando ${paneState.item.sourceName}` }, paneId);
  openItem(paneState.item, {
    paneId,
    keepPlaylist: true,
    keepSplit: true,
    keepFullscreen: true,
    silentToast: true,
  });
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

function syncEmbedSecurityButton() {
  const label = embedProtectionEnabled
    ? "Protección anti-popup activa"
    : "Modo compatible: los popups pueden abrirse";
  dom.embedSecurityButton.classList.toggle("is-active", embedProtectionEnabled);
  dom.embedSecurityButton.classList.toggle("is-unsafe", !embedProtectionEnabled);
  dom.embedSecurityButton.setAttribute("aria-pressed", String(embedProtectionEnabled));
  dom.embedSecurityButton.setAttribute("aria-label", label);
  dom.embedSecurityButton.setAttribute("title", `${label} (S)`);
}

function reloadPlayerFramesForSecurityMode() {
  [dom.playerStage, dom.secondaryPlayerStage].forEach((stage) => {
    const currentFrame = stage.querySelector("iframe");
    if (!currentFrame) return;

    const replacement = createEmbedFrame(currentFrame.src, currentFrame.title);
    replacement.className = currentFrame.className;
    currentFrame.replaceWith(replacement);
  });
}

function toggleEmbedProtection() {
  embedProtectionEnabled = !embedProtectionEnabled;
  syncEmbedSecurityButton();
  reloadPlayerFramesForSecurityMode();
  highlightsKey = "";
  if (dom.player.hidden) {
    renderAgenda();
  }

  showChannelToast({
    sourceName: embedProtectionEnabled ? "Protección anti-popup" : "Modo compatible",
    name: embedProtectionEnabled ? "Sandbox activado" : "Sandbox desactivado",
    language: embedProtectionEnabled ? "Ventanas bloqueadas" : "El proveedor puede abrir publicidad",
    quality: embedProtectionEnabled ? "Protegido" : "Precaución",
    sourceUrl: getCurrentSource(),
  });
  revealControls();
}

async function enterFullscreen() {
  if (isIosDevice()) {
    dom.player.classList.add("is-ios-expanded");
    syncFullscreenButton();
    return;
  }

  const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
  const requestFullscreen = dom.player.requestFullscreen || dom.player.webkitRequestFullscreen;

  if (fullscreenElement || !requestFullscreen) {
    return;
  }

  try {
    await requestFullscreen.call(dom.player);
  } catch (error) {
    // Browsers can reject fullscreen unless the user gesture is direct.
  }
}

async function toggleFullscreen() {
  if (isIosDevice()) {
    dom.player.classList.toggle("is-ios-expanded");
    syncFullscreenButton();
    return;
  }

  const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
  const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;

  if (fullscreenElement) {
    if (exitFullscreen) {
      await exitFullscreen.call(document);
    }

    return;
  }

  const requestFullscreen = dom.player.requestFullscreen || dom.player.webkitRequestFullscreen;

  if (!requestFullscreen) {
    return;
  }

  try {
    await requestFullscreen.call(dom.player);
  } catch (error) {
    // Browsers can reject fullscreen unless the user gesture is direct.
  }
}

function syncFullscreenButton() {
  const nativeFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  const isExpanded = nativeFullscreen || dom.player.classList.contains("is-ios-expanded");
  const label = isExpanded ? "Salir de pantalla completa" : "Pantalla completa";
  const title = `${label} (F)`;

  dom.fullscreenButton.setAttribute("aria-label", label);
  dom.fullscreenButton.setAttribute("title", title);
  dom.fullscreenButton.classList.toggle("is-active", isExpanded);
  dom.player.classList.toggle("is-fullscreen", isExpanded);

  if (nativeFullscreen) {
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

function showChannelToast(item, paneId = activePaneId) {
  if (!item) {
    return;
  }

  const items = getNavigationItems(paneId);
  const itemKey = getItemKey(item);
  const itemIndex = items.findIndex((source) => getItemKey(source) === itemKey);
  const panePrefix = isSplitMode() ? `${getPaneLabel(paneId)} · ` : "";
  const position = itemIndex === -1 ? panePrefix : `${panePrefix}Fuente ${itemIndex + 1}/${items.length} · `;

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

function rememberPlayerReturnFocus() {
  if (!dom.player.hidden || !(document.activeElement instanceof HTMLElement)) {
    return;
  }

  playerReturnFocusElement = document.activeElement;
}

function restorePlayerReturnFocus() {
  const target = playerReturnFocusElement;
  playerReturnFocusElement = null;

  if (target && document.contains(target) && isElementVisible(target)) {
    window.setTimeout(() => target.focus({ preventScroll: false }), 0);
  }
}

function pushPlayerHistoryState() {
  if (playerHistoryActive || !window.history?.pushState) {
    return;
  }

  window.history.pushState({ playerEmbed: "player" }, "", window.location.href);
  playerHistoryActive = true;
}

function syncPlayerHistoryAfterClose(options = {}) {
  if (!playerHistoryActive || options.fromPopState || options.keepHistory) {
    playerHistoryActive = false;
    return;
  }

  if (window.history?.state?.playerEmbed === "player") {
    ignoreNextPopState = true;
    window.history.back();
  }

  playerHistoryActive = false;
}

function handlePlayerPopState() {
  if (ignoreNextPopState) {
    ignoreNextPopState = false;
    return;
  }

  if (dom.player.hidden) {
    playerHistoryActive = false;
    return;
  }

  if (dom.channelSwitcher.classList.contains("is-open")) {
    playerHistoryActive = false;
    toggleChannelSwitcher(false);
    pushPlayerHistoryState();
    revealControls();
    return;
  }

  if (isSplitMode()) {
    playerHistoryActive = false;
    closeSecondaryPane();
    pushPlayerHistoryState();
    revealControls();
    return;
  }

  playerHistoryActive = false;
  closePlayer({ fromPopState: true });
}

async function openPlayer(embed, options = {}) {
  const embedSrc = normalizeEmbed(embed);
  const paneId = options.paneId || activePaneId;
  const paneStage = getPaneStage(paneId);
  const wasHidden = dom.player.hidden;
  const wasSwitcherOpen = dom.channelSwitcher.classList.contains("is-open");

  if (!embedSrc) {
    return;
  }

  rememberPlayerReturnFocus();

  if (paneId === PLAYER_PANES.PRIMARY && !options.keepSplit) {
    closeSecondaryPane({ silent: true });
  }

  const frame = createEmbedFrame(embedSrc, options.title || extractIframeTitle(embed));
  prepareEmbeds(frame);

  getPaneState(paneId).sourceKey = options.sourceKey || "";
  const posterMatch = getPaneState(paneId).match;
  const posterUrl = firstImageUrl(posterMatch?.matchThumb, posterMatch?.eventLogo, posterMatch?.leagueBadge);
  const iosHint = isIosDevice() ? createIosPlaybackHint() : null;

  if (iosHint) {
    frame.addEventListener("load", () => iosHint.classList.add("is-ready"), { once: true });
  }

  paneStage.style.backgroundImage = posterUrl ? `url("${posterUrl}")` : "";
  paneStage.replaceChildren(...[frame, iosHint].filter(Boolean));
  if (posterMatch) {
    applyEventPalette(paneStage, posterMatch);
  }

  if (paneId === PLAYER_PANES.SECONDARY) {
    dom.secondaryPlayerPane.hidden = false;
  }

  setActivePane(paneId, { silent: true });
  syncSplitMode();
  updateActiveChannel(embedSrc, getPaneState(paneId).sourceKey, paneId);
  toggleChannelSwitcher(false);
  stopHighlightsPlayer();
  dom.setupPanel.hidden = true;
  dom.player.hidden = false;

  if (isTvMode()) {
    tvOverlayLocked = true;
  }

  syncTvOverlay();
  if (wasHidden) {
    pushPlayerHistoryState();
  }

  if (!options.keepFullscreen && (isTvMode() || options.forceFullscreen)) {
    await enterFullscreen();
  }

  if (isTvMode()) {
    focusTvOverlay();
  } else if (wasHidden || wasSwitcherOpen) {
    window.setTimeout(() => dom.closeButton.focus({ preventScroll: true }), 0);
  }

  revealControls();
}

function openItem(item, options = {}) {
  const paneId = options.paneId || channelSwitcherTargetPaneId || activePaneId;
  const paneState = getPaneState(paneId);
  const hasMatchOption = Object.prototype.hasOwnProperty.call(options, "match");
  const keepSplit = options.keepSplit ?? isSplitMode();

  if (Array.isArray(options.playlist)) {
    paneState.playlist = options.playlist.filter((source) => source && source.sourceUrl);
    paneState.playlistTitle = options.playlistTitle || paneState.playlistTitle || "Canales disponibles";
  } else if (!options.keepPlaylist) {
    paneState.playlist = getPlayableItems();
    paneState.playlistTitle = options.playlistTitle || "Biblioteca en vivo";
  }

  if (hasMatchOption) {
    paneState.match = options.match || null;
  } else if (!options.keepPlaylist) {
    paneState.match = null;
  }

  paneState.item = item;
  renderChannelSwitcher();

  const embed = buildIframe(item.sourceUrl, `${item.sourceName} - ${item.name || "Player"}`);
  dom.input.value = embed;
  openPlayer(embed, { ...options, paneId, keepSplit, sourceKey: getItemKey(item), title: `${item.sourceName} - ${item.name || "Player"}` });

  if (!options.silentToast && (options.announce || !dom.player.hidden)) {
    showChannelToast(item, paneId);
  }
}

function openSplitEvents(primaryEvent, secondaryEvent) {
  const primaryServers = primaryEvent.serverItems || getEventServerItems(primaryEvent);
  const secondaryServers = secondaryEvent.serverItems || getEventServerItems(secondaryEvent);

  if (!primaryServers.length || !secondaryServers.length) {
    return;
  }

  openSplitItems(primaryServers[0], secondaryServers[0], {
    primaryPlaylist: primaryServers,
    primaryPlaylistTitle: `Servidores de ${primaryEvent.title}`,
    primaryMatch: primaryEvent,
    secondaryPlaylist: secondaryServers,
    secondaryPlaylistTitle: `Servidores de ${secondaryEvent.title}`,
    secondaryMatch: secondaryEvent,
  });
}

function openSplitItems(primaryItem, secondaryItem, options = {}) {
  const wasHidden = dom.player.hidden;

  openItem(primaryItem, {
    paneId: PLAYER_PANES.PRIMARY,
    playlist: options.primaryPlaylist || [primaryItem],
    playlistTitle: options.primaryPlaylistTitle || "Ventana 1",
    match: options.primaryMatch || null,
    keepSplit: true,
    keepFullscreen: !wasHidden,
    silentToast: true,
  });

  openItem(secondaryItem, {
    paneId: PLAYER_PANES.SECONDARY,
    playlist: options.secondaryPlaylist || [secondaryItem],
    playlistTitle: options.secondaryPlaylistTitle || "Ventana 2",
    match: options.secondaryMatch || null,
    keepSplit: true,
    keepFullscreen: true,
    silentToast: true,
  });

  setActivePane(PLAYER_PANES.PRIMARY, { silent: true });
  showChannelToast({
    sourceName: "Vista doble activa",
    name: "Dos eventos al mismo tiempo",
    language: getPaneState(PLAYER_PANES.PRIMARY).item?.name || "Ventana 1",
    quality: getPaneState(PLAYER_PANES.SECONDARY).item?.name || "Ventana 2",
    sourceUrl: getCurrentSource(PLAYER_PANES.PRIMARY),
  }, PLAYER_PANES.PRIMARY);
}

async function closePlayer(options = {}) {
  const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
  const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;

  if (fullscreenElement && exitFullscreen) {
    try {
      await exitFullscreen.call(document);
    } catch (error) {
      // Continue closing the player even if the browser rejects fullscreen exit.
    }
  }

  toggleChannelSwitcher(false);
  dom.player.hidden = true;
  dom.setupPanel.hidden = false;
  renderAgenda();
  dom.playerStage.replaceChildren();
  dom.secondaryPlayerStage.replaceChildren();
  dom.playerStage.style.backgroundImage = "";
  dom.secondaryPlayerStage.style.backgroundImage = "";
  dom.secondaryPlayerPane.hidden = true;
  dom.player.classList.remove("is-idle", "is-fullscreen", "is-ios-expanded");
  syncFullscreenButton();
  dom.channelToast.classList.remove("is-visible");
  playerPaneStates[PLAYER_PANES.PRIMARY] = createPaneState();
  playerPaneStates[PLAYER_PANES.SECONDARY] = createPaneState();
  activePaneId = PLAYER_PANES.PRIMARY;
  channelSwitcherTargetPaneId = "";
  syncSplitMode();
  renderChannelSwitcher();
  syncTvOverlay();
  window.clearTimeout(toastHideTimer);
  syncPlayerHistoryAfterClose(options);
  restorePlayerReturnFocus();
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

  if (isSplitMode()) {
    closeSecondaryPane();
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

function isElementVisible(element) {
  if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getElementCenter(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function focusElement(element) {
  if (!element) {
    return;
  }

  element.focus({ preventScroll: false });
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function rangesOverlap(startA, endA, startB, endB) {
  return Math.max(startA, startB) <= Math.min(endA, endB);
}

function findSpatialTarget(elements, current, direction) {
  if (!current || !elements.includes(current)) {
    return elements[0] || null;
  }

  const currentRect = current.getBoundingClientRect();
  const currentCenter = getElementCenter(current);
  const candidates = elements
    .filter((element) => element !== current)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const center = getElementCenter(element);
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;
      const primary = direction === "right" ? dx
        : direction === "left" ? -dx
          : direction === "down" ? dy
            : -dy;
      const secondary = direction === "right" || direction === "left" ? Math.abs(dy) : Math.abs(dx);
      const aligned = direction === "right" || direction === "left"
        ? rangesOverlap(currentRect.top, currentRect.bottom, rect.top, rect.bottom)
        : rangesOverlap(currentRect.left, currentRect.right, rect.left, rect.right);
      const score = (aligned ? 0 : 10000) + primary + secondary * (aligned ? 0.25 : 2.5);

      return { element, primary, secondary, aligned, score };
    })
    .filter((candidate) => candidate.primary > 4)
    .sort((a, b) => a.score - b.score);

  return candidates[0]?.element || null;
}

function moveSpatialFocus(elements, direction) {
  const visibleElements = elements.filter(isElementVisible);

  if (!visibleElements.length) {
    return;
  }

  const target = findSpatialTarget(visibleElements, document.activeElement, direction);

  if (target) {
    focusElement(target);
  }
}

function clickFocusedButton() {
  const target = document.activeElement;

  if (target && typeof target.click === "function" && !target.disabled) {
    target.click();
    return true;
  }

  return false;
}

function moveSwitcherFocus(direction) {
  const buttons = Array.from(dom.channelSwitcher.querySelectorAll("button"));

  if (!buttons.length) {
    return;
  }

  moveSpatialFocus(buttons, direction);
}

function getTvHomeFocusables() {
  return Array.from(new Set(Array.from(document.querySelectorAll([
    ".top-tabs button",
    ".bb-play",
    ".highlights-mute",
    ".agenda button:not(:disabled)",
    ".preset-grid button",
    ".custom-embed summary",
  ].join(","))))).filter(isElementVisible);
}

function focusTvHomeFirst() {
  if (!isTvMode() || !dom.player.hidden || tvHomeFocusInitialized) {
    return;
  }

  window.setTimeout(() => {
    const target = document.querySelector(".bb-play")
      || document.querySelector(".top-tabs .top-tab.is-active")
      || document.querySelector(".watch-button:not(:disabled)")
      || document.querySelector(".preset-grid button");

    if (target) {
      tvHomeFocusInitialized = true;
      target.focus({ preventScroll: false });
      target.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }, 0);
}

function moveTvHomeFocus(direction) {
  const focusables = getTvHomeFocusables();

  if (!focusables.length) {
    return;
  }

  moveSpatialFocus(focusables, direction);
}

function handleHomeRemoteAction(event, action) {
  if (!isTvMode()) {
    return false;
  }

  if (["up", "down", "left", "right"].includes(action)) {
    event.preventDefault();
    moveTvHomeFocus(action);
    return true;
  }

  if (action === "ok") {
    event.preventDefault();

    if (!clickFocusedButton()) {
      focusTvHomeFirst();
    }

    return true;
  }

  if (action === "menu") {
    event.preventDefault();
    focusTvHomeFirst();
    return true;
  }

  return false;
}

function handleSwitcherRemoteAction(event, action) {
  if (!["up", "down", "left", "right", "ok", "back", "menu"].includes(action)) {
    return false;
  }

  event.preventDefault();

  if (["up", "down", "left", "right"].includes(action)) {
    moveSwitcherFocus(action);
    return true;
  }

  if (action === "ok") {
    clickFocusedButton();
    return true;
  }

  toggleChannelSwitcher(false);
  revealControls();
  return true;
}

function handlePlayerRemoteAction(event, action) {
  if (!action) {
    return false;
  }

  if (dom.channelSwitcher.classList.contains("is-open") && handleSwitcherRemoteAction(event, action)) {
    return true;
  }

  if (action === "back") {
    event.preventDefault();
    handleBackNavigation();
    return true;
  }

  if (action === "menu") {
    event.preventDefault();
    toggleChannelSwitcher(undefined, { focus: true, paneId: activePaneId });
    revealControls();
    return true;
  }

  if (action === "ok" && isTvMode()) {
    event.preventDefault();
    toggleChannelSwitcher(true, { focus: true, paneId: activePaneId });
    revealControls();
    return true;
  }

  if (["up", "down"].includes(action) && isTvMode()) {
    event.preventDefault();

    if (isSplitMode()) {
      setActivePane(activePaneId === PLAYER_PANES.PRIMARY ? PLAYER_PANES.SECONDARY : PLAYER_PANES.PRIMARY);
    } else {
      toggleChannelSwitcher(true, { focus: true, paneId: activePaneId });
    }

    revealControls();
    return true;
  }

  if (["right", "next", "channelUp"].includes(action)) {
    event.preventDefault();

    if (canRunSourceNavigation(event)) {
      openItemByOffset(1, dom.channelSwitcher.classList.contains("is-open") ? getSwitcherPaneId() : activePaneId);
    }

    revealControls();
    return true;
  }

  if (["left", "previous", "channelDown"].includes(action)) {
    event.preventDefault();

    if (canRunSourceNavigation(event)) {
      openItemByOffset(-1, dom.channelSwitcher.classList.contains("is-open") ? getSwitcherPaneId() : activePaneId);
    }

    revealControls();
    return true;
  }

  return false;
}

function handleRemoteAction(event, action) {
  if (!action) {
    return false;
  }

  activateTvModeFromRemote(event, action);

  if (dom.player.hidden) {
    return handleHomeRemoteAction(event, action);
  }

  return handlePlayerRemoteAction(event, action);
}

function hasSoonWorldcupGame() {
  const now = Date.now();

  return worldcupGames.some((game) => {
    if (!game.parsedDate || getWorldcupGameStatus(game).key !== "upcoming") {
      return false;
    }

    const startsIn = game.parsedDate.getTime() - now;
    return startsIn > 0 && startsIn <= UPCOMING_LIVE_CHECK_WINDOW;
  });
}

function getWorldcupRefreshInterval() {
  if (hasLiveWorldcupGame()) {
    return WORLD_CUP_LIVE_REFRESH_INTERVAL;
  }

  if (hasSoonWorldcupGame()) {
    return WORLD_CUP_SOON_REFRESH_INTERVAL;
  }

  return WORLD_CUP_IDLE_REFRESH_INTERVAL;
}

function isDataStale(lastLoadedAt, maxAge) {
  return !lastLoadedAt || Date.now() - lastLoadedAt >= maxAge;
}

function scheduleWorldcupRefresh() {
  window.clearTimeout(scoreRefreshTimer);

  scoreRefreshTimer = window.setTimeout(async () => {
    if (!document.hidden) {
      await loadWorldcupGames();
    }

    scheduleWorldcupRefresh();
  }, getWorldcupRefreshInterval());
}

function startAutoRefresh() {
  window.clearTimeout(scoreRefreshTimer);
  window.clearInterval(streamxRefreshTimer);
  window.clearInterval(channelsRefreshTimer);
  window.clearInterval(countdownRefreshTimer);

  scheduleWorldcupRefresh();

  streamxRefreshTimer = window.setInterval(() => {
    if (!document.hidden) {
      loadStreamxSchedule();
    }
  }, STREAMX_REFRESH_INTERVAL);

  channelsRefreshTimer = window.setInterval(() => {
    if (!document.hidden) {
      loadStreamxChannels();
    }
  }, CHANNELS_REFRESH_INTERVAL);

  countdownRefreshTimer = window.setInterval(updateCountdownLabels, 30000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      if (isDataStale(lastWorldcupLoadedAt, getWorldcupRefreshInterval())) {
        loadWorldcupGames();
      }

      if (isDataStale(lastStreamxLoadedAt, STREAMX_REFRESH_INTERVAL)) {
        loadStreamxSchedule();
      }

      if (isDataStale(lastChannelsLoadedAt, CHANNELS_REFRESH_INTERVAL)) {
        loadStreamxChannels();
      }
    }
  });
}

function bindEvents() {
  dom.form.addEventListener("submit", (event) => {
    event.preventDefault();
    openPlayer(dom.input.value);
  });

  dom.demoButton.addEventListener("click", () => {
    const embed = buildIframe(DEMO_URL, "Demo player");
    dom.input.value = embed;
    openPlayer(embed);
  });

  document.querySelectorAll("[data-player-mode]").forEach((button) => {
    button.addEventListener("click", () => setPlayerMode(button.dataset.playerMode));
  });

  dom.refreshStreamxButton.addEventListener("click", () => {
    loadStreamxData({ announce: true, forceRefresh: true });
  });
  dom.agendaViewTabs.querySelectorAll("[data-agenda-view]").forEach((button) => {
    button.dataset.tvFocusKey = `agenda-view:${button.dataset.agendaView}`;
    button.addEventListener("click", () => setAgendaView(button.dataset.agendaView));
  });
  syncAgendaViewTabs();
  updateAgendaHero();

  dom.agendaFilterButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleAgendaFilter();
  });
  document.addEventListener("click", (event) => {
    if (agendaFilterOpen && !dom.agendaFilter.contains(event.target)) {
      closeAgendaFilter();
    }
  });
  enableHorizontalDragScroll(dom.agendaDateTabs, { dragButtons: true });
  enableHorizontalDragScroll(dom.agendaSportTabs, { dragButtons: false });
  [dom.agendaDateTabs, dom.agendaSportTabs].forEach((container) => {
    container.addEventListener("scroll", () => updateTabScrollHints(container), { passive: true });
  });
  document.querySelectorAll("[data-scroll-tabs]").forEach((button) => {
    button.addEventListener("click", () => {
      const container = dom[button.dataset.scrollTabs];

      if (container) {
        scrollTabRow(container, Number(button.dataset.scrollDir || 1));
      }
    });
  });
  window.addEventListener("resize", () => {
    updateTabScrollHints(dom.agendaDateTabs);
    updateTabScrollHints(dom.agendaSportTabs);
  });

  dom.fullscreenButton.addEventListener("click", toggleFullscreen);
  dom.retrySourceButton.addEventListener("click", () => retryCurrentSource());
  dom.splitButton.addEventListener("click", () => {
    toggleActivePane();
    revealControls();
  });
  dom.closeSplitButton.addEventListener("click", () => {
    closeSecondaryPane();
    revealControls();
  });
  dom.modeToggleButton.addEventListener("click", togglePlayerMode);
  dom.embedSecurityButton.addEventListener("click", toggleEmbedProtection);
  dom.iframeControlButton.addEventListener("click", toggleIframeControl);
  dom.closeButton.addEventListener("click", handleBackNavigation);
  dom.channelsButton.addEventListener("click", () => {
    toggleChannelSwitcher(undefined, { focus: isTvMode(), paneId: activePaneId });
    revealControls();
  });
  document.querySelectorAll("[data-activate-pane]").forEach((button) => {
    button.addEventListener("click", () => {
      setActivePane(button.dataset.activatePane);
      revealControls();
    });
  });
  let searchDebounce = 0;
  dom.channelSearch.addEventListener("input", () => {
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => {
      searchTerm = normalizeText(dom.channelSearch.value.trim());
      renderChannels();
    }, 160);
  });
  dom.player.addEventListener("pointermove", revealControls);
  dom.player.addEventListener("pointerdown", revealControls);
  dom.player.addEventListener("touchstart", revealControls, { passive: true });
  dom.tvOverlay.addEventListener("click", () => {
    toggleChannelSwitcher(true, { focus: true, paneId: activePaneId });
    revealControls();
  });
  dom.channelSwitcher.addEventListener("keydown", (event) => {
    const action = normalizeRemoteAction(event);
    showRemoteDebug(event, action);

    if (handleSwitcherRemoteAction(event, action)) {
      event.stopPropagation();
    }
  });
  document.addEventListener("fullscreenchange", syncFullscreenButton);
  document.addEventListener("webkitfullscreenchange", syncFullscreenButton);
  window.addEventListener("popstate", handlePlayerPopState);

  document.addEventListener("keydown", (event) => {
    const remoteAction = normalizeRemoteAction(event);
    showRemoteDebug(event, remoteAction);

    if (isTypingTarget(event.target) && !["back"].includes(remoteAction)) {
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (handleRemoteAction(event, remoteAction)) {
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

    if (["s", "S"].includes(event.key)) {
      event.preventDefault();
      toggleEmbedProtection();
      return;
    }

    if (["r", "R"].includes(event.key)) {
      event.preventDefault();
      retryCurrentSource();
      return;
    }

    if (["c", "C"].includes(event.key)) {
      event.preventDefault();
      toggleChannelSwitcher(undefined, { focus: isTvMode(), paneId: activePaneId });
      revealControls();
      return;
    }

    if (["d", "D"].includes(event.key)) {
      event.preventDefault();
      toggleActivePane();
      revealControls();
      return;
    }

    if (["v", "V"].includes(event.key) && isSplitMode()) {
      event.preventDefault();
      toggleActivePane();
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

    if (["ArrowRight", "PageDown", "n", "N"].includes(event.key)) {
      event.preventDefault();
      if (canRunSourceNavigation(event)) {
        openItemByOffset(1, dom.channelSwitcher.classList.contains("is-open") ? getSwitcherPaneId() : activePaneId);
      }
      revealControls();
      return;
    }

    if (["ArrowLeft", "PageUp", "p", "P"].includes(event.key)) {
      event.preventDefault();
      if (canRunSourceNavigation(event)) {
        openItemByOffset(-1, dom.channelSwitcher.classList.contains("is-open") ? getSwitcherPaneId() : activePaneId);
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
syncEmbedSecurityButton();
renderAgenda();
renderChannels();
bindEvents();
syncSplitMode();
syncFullscreenButton();
loadStreamxData();
startAutoRefresh();
