const SOURCE_URL = "https://worldcup26.ir/get/games";
const CACHE_MAX_AGE = 30;
const STALE_WHILE_REVALIDATE = 300;
const ERROR_CACHE_CONTROL = "no-store";
const MEMORY_TTL_MS = CACHE_MAX_AGE * 1000;
const REQUEST_TIMEOUT_MS = 6500;
const STALE_REQUEST_TIMEOUT_MS = 2500;

const BASE_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "content-type": "application/json; charset=utf-8",
};

let cachedBody = "";
let cachedAt = 0;

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

function validateSourceBody(body) {
  try {
    const data = JSON.parse(body);

    if (!Array.isArray(data) && !Array.isArray(data?.games)) {
      throw new Error("invalid_worldcup_games_schema");
    }
  } catch (error) {
    const parseError = new Error("worldcup_games_invalid_json");
    parseError.status = 502;
    throw parseError;
  }
}

function hasForceRefresh(event) {
  return Boolean(event.queryStringParameters?.v || event.queryStringParameters?.refresh);
}

function isMemoryCacheFresh() {
  return cachedBody && Date.now() - cachedAt < MEMORY_TTL_MS;
}

async function fetchSource(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "Mozilla/5.0 PlayerEmbed/1.0",
      },
    });

    const body = await response.text();

    if (!response.ok) {
      const error = new Error("worldcup_games_failed");
      error.status = response.status;
      throw error;
    }

    validateSourceBody(body);

    cachedBody = body;
    cachedAt = Date.now();

    return { statusCode: 200, headers: makeHeaders({ "x-cache": "origin" }), body };
  } finally {
    clearTimeout(timeout);
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

  const forceRefresh = hasForceRefresh(event);

  if (!forceRefresh && isMemoryCacheFresh()) {
    return {
      statusCode: 200,
      headers: makeHeaders({
        "x-cache": "memory",
        age: String(Math.floor((Date.now() - cachedAt) / 1000)),
      }),
      body: cachedBody,
    };
  }

  try {
    const timeoutMs = cachedBody && !forceRefresh ? STALE_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
    return await fetchSource(timeoutMs);
  } catch (error) {
    if (cachedBody) {
      return {
        statusCode: 200,
        headers: makeHeaders({
          "x-cache": "stale",
          age: String(Math.floor((Date.now() - cachedAt) / 1000)),
        }),
        body: cachedBody,
      };
    }

    return {
      statusCode: error.name === "AbortError" ? 504 : (error.status || 502),
      headers: makeErrorHeaders({ "x-cache": "miss" }),
      body: JSON.stringify({ error: error.name === "AbortError" ? "worldcup_games_timeout" : "worldcup_games_unreachable" }),
    };
  }
};
