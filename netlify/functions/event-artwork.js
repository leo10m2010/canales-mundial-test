const API_KEY = process.env.THESPORTSDB_API_KEY || "123";
const API_BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;
const CACHE_MAX_AGE = 21600;
const STALE_WHILE_REVALIDATE = 86400;
const REQUEST_TIMEOUT_MS = 7000;
const MAX_CACHE_ENTRIES = 100;

const BASE_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "content-type": "application/json; charset=utf-8",
};

const cache = new Map();

function makeHeaders(extra = {}) {
  return {
    ...BASE_HEADERS,
    "cache-control": `public, max-age=0, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
    ...extra,
  };
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalTeamName(value) {
  const normalized = normalizeText(value);
  const aliases = {
    inglaterra: "England",
    noruega: "Norway",
    suiza: "Switzerland",
    espana: "Spain",
    francia: "France",
    alemania: "Germany",
    brasil: "Brazil",
    marruecos: "Morocco",
    "paises bajos": "Netherlands",
    "estados unidos": "United States",
    japon: "Japan",
    belgica: "Belgium",
  };
  return aliases[normalized] || String(value || "").trim();
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "MundialPlus/1.0 event-artwork",
      },
    });
    if (!response.ok) {
      throw new Error(`upstream_${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function getEventArtwork(event) {
  return event?.strThumb
    || event?.strFanart
    || event?.strBanner
    || event?.strPoster
    || "";
}

function getTeamArtwork(team) {
  return team?.strFanart1
    || team?.strFanart2
    || team?.strFanart3
    || team?.strFanart4
    || team?.strStadiumThumb
    || "";
}

async function findEvent(home, away) {
  const query = `${home} vs ${away}`;
  const data = await fetchJson(`${API_BASE_URL}/searchevents.php?e=${encodeURIComponent(query)}`);
  const events = Array.isArray(data?.event) ? data.event : [];
  const homeKey = normalizeText(home);
  const awayKey = normalizeText(away);

  return events.find((event) => {
    const eventHome = normalizeText(event.strHomeTeam);
    const eventAway = normalizeText(event.strAwayTeam);
    return (eventHome === homeKey && eventAway === awayKey)
      || (eventHome === awayKey && eventAway === homeKey);
  }) || events.find((event) => getEventArtwork(event)) || null;
}

async function findTeamArtwork(teamName) {
  const data = await fetchJson(`${API_BASE_URL}/searchteams.php?t=${encodeURIComponent(teamName)}`);
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  const team = teams.find((candidate) => normalizeText(candidate.strTeam) === normalizeText(teamName)) || teams[0];
  return getTeamArtwork(team);
}

async function resolveArtwork(home, away) {
  try {
    const event = await findEvent(home, away);
    const image = getEventArtwork(event);
    if (image) {
      return { image, source: "TheSportsDB event", kind: "event", eventId: event.idEvent || "" };
    }
  } catch (error) {
    // Fall through to team fanart.
  }

  const settled = await Promise.allSettled([findTeamArtwork(home), findTeamArtwork(away)]);
  const images = settled.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  return { image: images[0] || "", alternateImage: images[1] || "", source: images.length ? "TheSportsDB fanart" : "", kind: images.length ? "team" : "" };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: makeHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: makeHeaders({ allow: "GET, OPTIONS", "cache-control": "no-store" }), body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  const home = canonicalTeamName(String(event.queryStringParameters?.home || "").slice(0, 80));
  const away = canonicalTeamName(String(event.queryStringParameters?.away || "").slice(0, 80));
  if (!home || !away) {
    return { statusCode: 200, headers: makeHeaders(), body: JSON.stringify({ image: "" }) };
  }

  const cacheKey = `${normalizeText(home)}|${normalizeText(away)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_MAX_AGE * 1000) {
    return { statusCode: 200, headers: makeHeaders({ "x-cache": "memory" }), body: cached.body };
  }

  try {
    const body = JSON.stringify(await resolveArtwork(home, away));
    cache.set(cacheKey, { body, cachedAt: Date.now() });
    if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    return { statusCode: 200, headers: makeHeaders({ "x-cache": "origin" }), body };
  } catch (error) {
    return { statusCode: 502, headers: makeHeaders({ "cache-control": "no-store" }), body: JSON.stringify({ error: "event_artwork_unreachable" }) };
  }
};
