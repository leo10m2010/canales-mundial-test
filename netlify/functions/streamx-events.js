const SOURCE_URL = "https://stream-xhd.com/eventos.json";
const CACHE_MAX_AGE = 60;
const STALE_WHILE_REVALIDATE = 300;
const MEMORY_TTL_MS = CACHE_MAX_AGE * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const STALE_REQUEST_TIMEOUT_MS = 3000;

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
      const error = new Error("streamx_events_failed");
      error.status = response.status;
      throw error;
    }

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
      headers: makeHeaders({ "x-cache": "miss" }),
      body: JSON.stringify({ error: error.name === "AbortError" ? "streamx_events_timeout" : "streamx_events_unreachable" }),
    };
  }
};
