const ALLOWED_HOSTS = new Set([
  "r2.thesportsdb.com",
  "www.thesportsdb.com",
  "disney.images.edge.bamgrid.com",
  "a.espncdn.com",
  "static.vecteezy.com",
  "flagcdn.com",
  "upload.wikimedia.org",
]);
const CACHE_MAX_AGE = 86400;
const STALE_WHILE_REVALIDATE = 604800;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 3;

const BASE_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "x-content-type-options": "nosniff",
};

function makeHeaders(extra = {}) {
  return {
    ...BASE_HEADERS,
    "cache-control": `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
    ...extra,
  };
}

function parseAllowedUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }
    return url;
  } catch (error) {
    return null;
  }
}

async function fetchImage(initialUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let url = initialUrl;

  try {
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "user-agent": "Mozilla/5.0 MundialPlus/ImagePaletteProxy",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        const redirectedUrl = location ? parseAllowedUrl(new URL(location, url).href) : null;
        if (!redirectedUrl) {
          throw new Error("redirect_not_allowed");
        }
        url = redirectedUrl;
        continue;
      }

      if (!response.ok) {
        const error = new Error("image_upstream_failed");
        error.status = response.status;
        throw error;
      }

      const contentType = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (!contentType.startsWith("image/") || contentLength > MAX_IMAGE_BYTES) {
        throw new Error("invalid_image_response");
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
        throw new Error("invalid_image_size");
      }

      return { buffer, contentType };
    }

    throw new Error("too_many_redirects");
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
      headers: makeHeaders({ allow: "GET, OPTIONS", "cache-control": "no-store" }),
      body: "Method not allowed",
    };
  }

  const url = parseAllowedUrl(event.queryStringParameters?.url);
  if (!url) {
    return {
      statusCode: 400,
      headers: makeHeaders({ "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }),
      body: "Image URL not allowed",
    };
  }

  try {
    const { buffer, contentType } = await fetchImage(url);
    return {
      statusCode: 200,
      headers: makeHeaders({ "content-type": contentType }),
      isBase64Encoded: true,
      body: buffer.toString("base64"),
    };
  } catch (error) {
    return {
      statusCode: error.name === "AbortError" ? 504 : (error.status || 502),
      headers: makeHeaders({ "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }),
      body: error.name === "AbortError" ? "Image request timed out" : "Image unavailable",
    };
  }
};
