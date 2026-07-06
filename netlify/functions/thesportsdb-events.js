const API_KEY = process.env.THESPORTSDB_API_KEY || "123";
const API_BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsday.php`;
const CACHE_MAX_AGE = 300;
const STALE_WHILE_REVALIDATE = 900;
const ERROR_CACHE_CONTROL = "no-store";
const MEMORY_TTL_MS = CACHE_MAX_AGE * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_DATES = 7;
const MAX_CACHE_ENTRIES = 50;

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

function makeErrorHeaders(extra = {}) {
  return {
    ...BASE_HEADERS,
    "cache-control": ERROR_CACHE_CONTROL,
    ...extra,
  };
}

function getRequestedDates(event) {
  const raw = String(event.queryStringParameters?.dates || event.queryStringParameters?.date || "");
  return Array.from(new Set(raw.split(",")
    .map((date) => date.trim())
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))))
    .sort()
    .slice(0, MAX_DATES);
}

function hasForceRefresh(event) {
  return Boolean(event.queryStringParameters?.v || event.queryStringParameters?.refresh);
}

function getCacheKey(dates) {
  return dates.join(",");
}

function getFreshCache(cacheKey) {
  const item = cache.get(cacheKey);

  if (!item || Date.now() - item.cachedAt >= MEMORY_TTL_MS) {
    return null;
  }

  return item;
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "Mozilla/5.0 PlayerEmbed/1.0",
      },
    });
    const body = await response.text();

    if (!response.ok) {
      const error = new Error("thesportsdb_events_failed");
      error.status = response.status;
      throw error;
    }

    try {
      return JSON.parse(body);
    } catch (error) {
      const parseError = new Error("thesportsdb_events_invalid_json");
      parseError.status = 502;
      throw parseError;
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchEventsForDates(dates) {
  const settled = await Promise.allSettled(dates.map(async (date) => {
    const url = `${API_BASE_URL}?d=${encodeURIComponent(date)}`;
    const data = await fetchJson(url, REQUEST_TIMEOUT_MS);
    const events = Array.isArray(data?.events) ? data.events : [];
    return events.map((event) => ({ ...event, sourceDate: date }));
  }));

  const results = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);

  if (!results.length && settled.some((result) => result.status === "rejected")) {
    throw settled.find((result) => result.status === "rejected").reason;
  }

  return results;
}

function setCache(cacheKey, body) {
  cache.set(cacheKey, { body, cachedAt: Date.now() });

  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: makeHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: makeErrorHeaders({ allow: "GET, OPTIONS" }),
      body: JSON.stringify({ error: "method_not_allowed" }),
    };
  }

  const dates = getRequestedDates(event);

  if (!dates.length) {
    return {
      statusCode: 200,
      headers: makeHeaders({ "x-cache": "empty" }),
      body: JSON.stringify({ events: [] }),
    };
  }

  const forceRefresh = hasForceRefresh(event);
  const cacheKey = getCacheKey(dates);
  const cached = !forceRefresh ? getFreshCache(cacheKey) : null;

  if (cached) {
    return {
      statusCode: 200,
      headers: makeHeaders({
        "x-cache": "memory",
        age: String(Math.floor((Date.now() - cached.cachedAt) / 1000)),
      }),
      body: cached.body,
    };
  }

  try {
    const body = JSON.stringify({ events: await fetchEventsForDates(dates) });
    setCache(cacheKey, body);
    return { statusCode: 200, headers: makeHeaders({ "x-cache": "origin" }), body };
  } catch (error) {
    const stale = cache.get(cacheKey);

    if (stale) {
      return {
        statusCode: 200,
        headers: makeHeaders({
          "x-cache": "stale",
          age: String(Math.floor((Date.now() - stale.cachedAt) / 1000)),
        }),
        body: stale.body,
      };
    }

    return {
      statusCode: error.name === "AbortError" ? 504 : (error.status || 502),
      headers: makeErrorHeaders({ "x-cache": "miss" }),
      body: JSON.stringify({ error: error.name === "AbortError" ? "thesportsdb_events_timeout" : "thesportsdb_events_unreachable" }),
    };
  }
};
