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
  agendaDateTabs: "#agendaDateTabs",
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
const WORLDCUP_GAMES_URL = "/.netlify/functions/worldcup-games";
const PERU_TIME_ZONE = "America/Lima";
const DEFAULT_ALLOW = "autoplay; encrypted-media; fullscreen; picture-in-picture";
const DEMO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";
const CONTROLS_HIDE_DELAY = 2600;
const TOAST_HIDE_DELAY = 2400;
const SOURCE_NAVIGATION_COOLDOWN = 360;
const WORLD_CUP_LIVE_REFRESH_INTERVAL = 30000;
const WORLD_CUP_SOON_REFRESH_INTERVAL = 60000;
const WORLD_CUP_IDLE_REFRESH_INTERVAL = 300000;
const STREAMX_REFRESH_INTERVAL = 120000;
const CHANNELS_REFRESH_INTERVAL = 600000;
const UPCOMING_LIVE_CHECK_WINDOW = 45 * 60000;
const PLAYER_MODES = { PC: "pc", TV: "tv" };
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
  19: "up",
  20: "down",
  21: "left",
  22: "right",
  23: "ok",
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
let streamxLoading = false;
let worldcupLoading = false;
let streamxError = "";
let channelsError = "";
let worldcupError = "";
let selectedAgendaDate = "";
let lastWorldcupLoadedAt = 0;
let lastStreamxLoadedAt = 0;
let lastChannelsLoadedAt = 0;
let currentPlaylist = [];
let currentPlaylistTitle = "";
let currentSourceKey = "";
let tvOverlayLocked = true;
let tvHomeFocusInitialized = false;
let playerHistoryActive = false;
let ignoreNextPopState = false;
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
  const userAgent = navigator.userAgent || "";
  const normalized = normalizeText(userAgent);
  const explicitTv = /android tv|smart-?tv|tizen|webos|bravia|aft\w*|fire tv|google ?tv|googletv|appletv|crkey|chromecast|hbbtv|mibox|mi box|mitv|xiaomi.*(tv|box)|shield android tv|nexus player|adt-\w+|onn\.? android tv/i.test(userAgent);
  const androidLargeScreen = normalized.includes("android") && !normalized.includes("mobile") && isLargeLandscapeDisplay();
  const coarseLargeScreen = isLargeLandscapeDisplay() && Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);

  return explicitTv || (androidLargeScreen && coarseLargeScreen);
}

function isLargeLandscapeDisplay() {
  const screenWidth = window.screen?.width || window.innerWidth;
  const screenHeight = window.screen?.height || window.innerHeight;
  const largeScreen = Math.max(screenWidth, screenHeight) >= 960 && Math.max(window.innerWidth, window.innerHeight) >= 860;
  const landscape = Boolean(window.matchMedia?.("(orientation: landscape)")?.matches) || window.innerWidth >= window.innerHeight;

  return largeScreen && landscape;
}

function isTvMode() {
  return playerMode === PLAYER_MODES.TV;
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
  await Promise.allSettled([
    loadStreamxSchedule({ forceRefresh: options.forceRefresh }),
    loadStreamxChannels({ forceRefresh: options.forceRefresh }),
    loadWorldcupGames({ forceRefresh: options.forceRefresh }),
  ]);

  focusTvHomeFirst();

  if (options.announce && !streamxError && !channelsError && !worldcupError) {
    showChannelToast({
      sourceName: "Agenda actualizada",
      name: "Agenda",
      language: `${buildAgendaEvents().length} partidos`,
      quality: `${streamxChannelItems.length} canales 24/7`,
      sourceUrl: getCurrentSource(),
    });
  }
}

async function loadWorldcupGames(options = {}) {
  worldcupLoading = true;
  worldcupError = "";
  renderAgenda();

  try {
    worldcupGames = normalizeWorldcupGames(await fetchJson(WORLDCUP_GAMES_URL, {
      forceRefresh: options.forceRefresh,
    }));
    lastWorldcupLoadedAt = Date.now();
  } catch (error) {
    worldcupError = worldcupGames.length
      ? "No se pudo actualizar el marcador World Cup. Se mantiene el ultimo dato disponible."
      : "No se pudo cargar el marcador World Cup.";
  }

  worldcupLoading = false;
  renderAgenda();

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
  streamxLoading = true;
  streamxError = "";
  renderAgenda();

  try {
    streamxEvents = normalizeStreamxEvents(await fetchJson(STREAMX_EVENTS_URL, {
      forceRefresh: options.forceRefresh,
    }));
    lastStreamxLoadedAt = Date.now();
  } catch (error) {
    streamxError = streamxEvents.length
      ? "No se pudo actualizar la agenda Stream-XHD. Se mantiene el ultimo dato disponible."
      : "No se pudo cargar la agenda Stream-XHD.";
  }

  streamxLoading = false;
  renderAgenda();
  renderChannelSwitcher();

  if (options.announce && !streamxError) {
    showChannelToast({
      sourceName: "Servidores actualizados",
      name: "Stream-XHD",
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

  renderAgenda();
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
  const response = await fetch(requestUrl, {
    cache: options.forceRefresh ? "reload" : "default",
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${url}`);
  }

  return response.json();
}

function addCacheBust(url) {
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
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

function getWorldcupTeamName(game, side) {
  const prefix = side === "home" ? "home" : "away";
  return cleanText(game[`${prefix}_team_name_en`] || game[`${prefix}_team_label`] || game[`${prefix}Team`] || "");
}

function parseScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score : 0;
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

function makeMatchKey(homeTeam, awayTeam) {
  return [canonicalTeamName(homeTeam), canonicalTeamName(awayTeam)].sort().join("|");
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

function findStreamxEventForGame(game) {
  return streamxEvents.find((event) => makeMatchKey(event.homeTeam || "", event.awayTeam || "") === game.matchKey) || null;
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

function buildAgendaEvents() {
  const matchedGames = new Set();
  const events = streamxEvents.map((event) => {
    const game = findWorldcupGameForEvent(event);

    if (game) {
      matchedGames.add(game.id);
    }

    return buildAgendaEvent(event, game);
  });

  worldcupGames.forEach((game) => {
    if (matchedGames.has(game.id) || !shouldShowWorldcupFallback(game)) {
      return;
    }

    events.push(buildAgendaEvent(findStreamxEventForGame(game), game));
  });

  return events.sort(sortAgendaEvents);
}

function buildAgendaEvent(streamEvent, game) {
  const source = streamEvent || {};
  const title = source.title || game?.title || makeTitleFromTeams(source) || "Partido Mundial";
  const parsedDate = source.parsedDate || game?.parsedDate || parseStreamxDate(source);
  const event = {
    ...source,
    id: source.id || (game ? `worldcup-${game.id}` : toBase64Id(title)),
    title,
    homeTeam: source.homeTeam || game?.homeTeam || "Local",
    awayTeam: source.awayTeam || game?.awayTeam || "Visitante",
    homeLogo: source.homeLogo || "",
    awayLogo: source.awayLogo || "",
    leagueName: source.leagueName || source.league || "Copa Del Mundo 2026",
    parsedDate,
    duration: Number(source.duration || 130),
    extraTime: Number(source.extraTime || 0),
    worldcupGame: game || null,
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

  if (!dates.length) {
    selectedAgendaDate = "";
    return dates;
  }

  if (dates.includes(selectedAgendaDate)) {
    return dates;
  }

  const today = getPeruDateKey();
  selectedAgendaDate = dates.includes(today)
    ? today
    : dates.find((dateKey) => dateKey > today) || dates[0];

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
  dom.agendaDateTabs.hidden = dates.length <= 1;

  if (dates.length <= 1) {
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
    button.dataset.tvFocusKey = `agenda-date:${dateKey}`;
    button.classList.toggle("is-active", dateKey === selectedAgendaDate);
    button.setAttribute("aria-pressed", String(dateKey === selectedAgendaDate));
    button.append(
      createElement("strong", "", formatAgendaDateTabLabel(dateKey)),
      createElement("span", "", `${count} partido${count === 1 ? "" : "s"}`)
    );
    button.addEventListener("click", () => {
      selectedAgendaDate = dateKey;
      renderAgenda();
    });
    dom.agendaDateTabs.append(button);
  });
}

function renderAgenda() {
  const allAgendaEvents = buildAgendaEvents();
  const availableAgendaDates = ensureSelectedAgendaDate(allAgendaEvents);
  const agendaEvents = getAgendaEventsForSelectedDate(allAgendaEvents);
  const activeFocusKey = document.activeElement?.dataset?.tvFocusKey || "";

  dom.agendaGrid.replaceChildren();
  renderAgendaDateTabs(availableAgendaDates, allAgendaEvents);
  dom.agendaCount.textContent = selectedAgendaDate && agendaEvents.length !== allAgendaEvents.length
    ? `${agendaEvents.length}/${allAgendaEvents.length} partidos`
    : `${agendaEvents.length} partidos`;

  if ((streamxLoading || worldcupLoading) && !allAgendaEvents.length) {
    setAgendaStatus("Cargando agenda y marcador. La pagina mostrara los partidos apenas llegue la primera fuente...", false, true);
    return;
  }

  if ((streamxError || worldcupError) && !allAgendaEvents.length) {
    setAgendaStatus(`${streamxError || worldcupError} En Netlify funcionara mediante proxy; en servidor local simple puede no estar disponible.`, true, true);
    return;
  }

  if (!allAgendaEvents.length) {
    setAgendaStatus("No hay partidos Mundial 2026 disponibles ahora mismo.", false, true);
    return;
  }

  if (!agendaEvents.length) {
    setAgendaStatus(`No hay partidos para ${formatAgendaDateTabLabel(selectedAgendaDate)}. Elige otro dia disponible.`, false, true);
    return;
  }

  const statusParts = [];

  if (worldcupLoading) {
    statusParts.push("marcador actualizandose en segundo plano");
  } else if (worldcupError) {
    statusParts.push(worldcupError);
  } else {
    statusParts.push("Marcador World Cup activo");
  }

  if (streamxLoading) {
    statusParts.push("servidores Stream-XHD actualizandose");
  } else if (streamxError) {
    statusParts.push(streamxError);
  } else {
    statusParts.push("servidores Stream-XHD activos");
  }

  if (channelsError) {
    statusParts.push(channelsError);
  }

  statusParts.push(`vista: ${formatAgendaDateTabLabel(selectedAgendaDate)}`);
  statusParts.push("auto-refresh: marcador inteligente, servidores 2min");
  setAgendaStatus(statusParts.join(" · "), Boolean(streamxError || worldcupError || channelsError), false);

  agendaEvents.forEach((event) => {
    dom.agendaGrid.append(createAgendaCard(event));
  });

  restoreTvHomeFocus(activeFocusKey);
}

function setAgendaStatus(message, isError, isProminent) {
  dom.agendaStatus.textContent = message;
  dom.agendaStatus.classList.toggle("is-error", isError);
  dom.agendaStatus.classList.toggle("is-prominent", isProminent);
}

function createAgendaCard(event) {
  const status = event.statusInfo || getAgendaStatus(event);
  const servers = event.serverItems || getEventServerItems(event);
  const playlistTitle = `Servidores de ${event.title}`;
  const card = createElement("article", `match-card is-${status.key}`);
  const head = createElement("div", "match-head");
  const league = createElement("span", "match-league", event.leagueName || "Mundial 2026");
  const statusPill = createElement("span", `match-status ${status.key}`, status.label);
  const teams = createElement("div", "match-teams");
  const scoreBlock = createElement("div", "score-block");
  const score = createElement("strong", "match-score", formatAgendaScore(event));
  const scoreLabel = createElement("span", "score-label", formatAgendaScoreLabel(event));
  const meta = createElement("div", "match-meta");
  const detail = createElement("div", "match-detail", formatAgendaDetail(event));
  const serverLabel = createElement("div", "server-title", servers.length ? `${servers.length} canales disponibles` : "Canales pendientes");
  const serverList = createElement("div", "server-list");

  head.append(league, statusPill);
  scoreBlock.append(score, scoreLabel);
  teams.append(createTeamBlock(event.homeTeam || "Local", event.homeLogo), scoreBlock, createTeamBlock(event.awayTeam || "Visitante", event.awayLogo));
  meta.append(createElement("span", "match-time", formatAgendaTime(event)), createElement("span", "match-date", formatAgendaDate(event)));

  if (servers.length) {
    const watchButton = createElement("button", "watch-button", "Ver primer canal");
    watchButton.type = "button";
    watchButton.dataset.tvFocusKey = `watch:${event.id}`;
    watchButton.addEventListener("click", () => openItem(servers[0], { playlist: servers, playlistTitle }));
    serverList.append(watchButton);

    servers.forEach((serverItem) => {
      const button = createElement("button", "server-chip", serverItem.sourceName);
      button.type = "button";
      button.dataset.tvFocusKey = getItemKey(serverItem);
      button.addEventListener("click", () => openItem(serverItem, { playlist: servers, playlistTitle }));
      serverList.append(button);
    });
  } else {
    const pending = createElement("button", "watch-button is-disabled", "Canales pendientes");
    pending.type = "button";
    pending.dataset.tvFocusKey = `pending:${event.id}`;
    pending.disabled = true;
    serverList.append(pending);
  }

  card.append(head, teams, meta, detail, serverLabel, serverList);
  return card;
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

function formatAgendaScore(event) {
  const game = event.worldcupGame;

  if (!game) {
    return "VS";
  }

  const status = getWorldcupGameStatus(game);

  if (status.key === "upcoming" && !game.homeScore && !game.awayScore) {
    return "VS";
  }

  return `${game.homeScore} - ${game.awayScore}`;
}

function formatAgendaScoreLabel(event) {
  if (!event.worldcupGame) {
    return "sin marcador API";
  }

  const status = getWorldcupGameStatus(event.worldcupGame);

  if (status.key === "finished") {
    return "resultado final";
  }

  if (status.key === "live") {
    return normalizeText(event.worldcupGame.time_elapsed) === "live" ? "marcador en vivo" : event.worldcupGame.time_elapsed;
  }

  return "marcador API";
}

function formatAgendaDetail(event) {
  const game = event.worldcupGame;
  const status = event.statusInfo || getAgendaStatus(event);

  if (game && status.key === "finished") {
    return `Acabo ${formatAgendaEndTime(event)} aprox. · API World Cup`;
  }

  if (game && status.key === "live") {
    const elapsed = cleanText(game.time_elapsed || "live");
    return `${elapsed === "live" ? "Partido en vivo" : elapsed} · API World Cup`;
  }

  if (game) {
    return `Programado · API World Cup`;
  }

  return `Horario desde Stream-XHD`;
}

function formatAgendaEndTime(event) {
  const start = event.parsedDate || event.worldcupGame?.parsedDate;

  if (!start) {
    return "hora pendiente";
  }

  const duration = Number(event.duration || 130) + Number(event.extraTime || 0);
  const end = new Date(start.getTime() + duration * 60000);

  return new Intl.DateTimeFormat("es-PE", {
    timeZone: PERU_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(end);
}

function formatAgendaTime(event) {
  const date = event.parsedDate || event.worldcupGame?.parsedDate;

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

function createChannelButton(item, playlist = null, playlistTitle = "") {
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
  items.forEach((item) => list.append(createChannelButton(item, playlist, title)));

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
    dom.presetGroups.append(createItemsSection("Stream-XHD 24/7", streamxItems, false, "is-streamx"));
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

function renderChannelSwitcher() {
  const items = getPlayableItems();
  const visibleItems = getVisibleItems(items);
  const worldCupItems = getVisibleItems(getWorldCupItems());
  const streamxItems = getVisibleItems(getStreamxChannelItems());
  const regularItems = getVisibleItems(getRegularItems());
  const headerSubtitle = currentPlaylist.length
    ? `${currentPlaylist.length} canales del partido`
    : `${visibleItems.length} fuentes visibles`;

  dom.channelSwitcher.replaceChildren();

  const switcherHeader = createElement("div", "switcher-header");
  const switcherTitle = createElement("div");
  switcherTitle.append(
    createElement("strong", "", currentPlaylist.length ? "Canales disponibles" : "Canales"),
    createElement("span", "", headerSubtitle)
  );
  switcherHeader.append(switcherTitle);
  dom.channelSwitcher.append(switcherHeader);

  if (currentPlaylist.length) {
    dom.channelSwitcher.append(createItemsSection(currentPlaylistTitle || "Servidores del partido", currentPlaylist, true, "is-event", currentPlaylist));
  }

  if (streamxItems.length) {
    dom.channelSwitcher.append(createItemsSection("Stream-XHD 24/7", streamxItems, true, "is-streamx"));
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

  updateActiveChannel(getCurrentSource(), currentSourceKey);
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

  playerHistoryActive = false;
  closePlayer({ fromPopState: true });
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

  if (isTvMode()) {
    tvOverlayLocked = true;
  }

  syncTvOverlay();
  pushPlayerHistoryState();

  if (!options.keepFullscreen && (isTvMode() || options.forceFullscreen)) {
    await enterFullscreen();
  }

  focusTvOverlay();
  revealControls();
}

function openItem(item, options = {}) {
  if (Array.isArray(options.playlist)) {
    currentPlaylist = options.playlist.filter((source) => source && source.sourceUrl);
    currentPlaylistTitle = options.playlistTitle || currentPlaylistTitle || "Canales disponibles";
  } else if (!options.keepPlaylist) {
    currentPlaylist = getPlayableItems();
    currentPlaylistTitle = options.playlistTitle || "Biblioteca en vivo";
  }

  renderChannelSwitcher();

  const embed = buildIframe(item.sourceUrl);
  dom.input.value = embed;
  openPlayer(embed, { ...options, sourceKey: getItemKey(item) });

  if (options.announce || !dom.player.hidden) {
    showChannelToast(item);
  }
}

async function closePlayer(options = {}) {
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
  currentPlaylistTitle = "";
  currentSourceKey = "";
  renderChannelSwitcher();
  syncTvOverlay();
  window.clearTimeout(toastHideTimer);
  syncPlayerHistoryAfterClose(options);
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

function findSpatialTarget(elements, current, direction) {
  if (!current || !elements.includes(current)) {
    return elements[0] || null;
  }

  const currentCenter = getElementCenter(current);
  const candidates = elements
    .filter((element) => element !== current)
    .map((element) => {
      const center = getElementCenter(element);
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;
      const primary = direction === "right" ? dx
        : direction === "left" ? -dx
          : direction === "down" ? dy
            : -dy;
      const secondary = direction === "right" || direction === "left" ? Math.abs(dy) : Math.abs(dx);

      return { element, primary, secondary };
    })
    .filter((candidate) => candidate.primary > 4)
    .sort((a, b) => (a.primary * 1000 + a.secondary) - (b.primary * 1000 + b.secondary));

  return candidates[0]?.element || null;
}

function moveSpatialFocus(elements, direction) {
  const visibleElements = elements.filter(isElementVisible);

  if (!visibleElements.length) {
    return;
  }

  const target = findSpatialTarget(visibleElements, document.activeElement, direction) || visibleElements[0];
  focusElement(target);
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
  return Array.from(document.querySelectorAll([
    ".agenda button:not(:disabled)",
    ".mode-button",
    ".refresh-button",
    ".preset-grid button",
    ".custom-embed summary",
  ].join(","))).filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function focusTvHomeFirst() {
  if (!isTvMode() || !dom.player.hidden || tvHomeFocusInitialized) {
    return;
  }

  window.setTimeout(() => {
    const target = document.querySelector(".watch-button:not(:disabled)")
      || document.querySelector(".server-chip:not(:disabled)")
      || document.querySelector(".preset-grid button")
      || document.querySelector(".mode-button.is-active");

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
    toggleChannelSwitcher(undefined, { focus: true });
    revealControls();
    return true;
  }

  if (action === "ok" && isTvMode()) {
    event.preventDefault();
    toggleChannelSwitcher(true, { focus: true });
    revealControls();
    return true;
  }

  if (["up", "down"].includes(action) && isTvMode()) {
    event.preventDefault();
    toggleChannelSwitcher(true, { focus: true });
    revealControls();
    return true;
  }

  if (["right", "next", "channelUp"].includes(action)) {
    event.preventDefault();

    if (canRunSourceNavigation(event)) {
      openItemByOffset(1);
    }

    revealControls();
    return true;
  }

  if (["left", "previous", "channelDown"].includes(action)) {
    event.preventDefault();

    if (canRunSourceNavigation(event)) {
      openItemByOffset(-1);
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
    const embed = buildIframe(DEMO_URL);
    dom.input.value = embed;
    openPlayer(embed);
  });

  document.querySelectorAll("[data-player-mode]").forEach((button) => {
    button.addEventListener("click", () => setPlayerMode(button.dataset.playerMode));
  });

  dom.refreshStreamxButton.addEventListener("click", () => {
    loadStreamxData({ announce: true, forceRefresh: true });
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
    const action = normalizeRemoteAction(event);
    showRemoteDebug(event, action);

    if (handleSwitcherRemoteAction(event, action)) {
      event.stopPropagation();
    }
  });
  document.addEventListener("fullscreenchange", syncFullscreenButton);
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
startAutoRefresh();
