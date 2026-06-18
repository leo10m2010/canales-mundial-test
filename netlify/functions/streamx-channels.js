const SOURCE_URL = "https://stream-xhd.com/canales/canales.json";

const HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "cache-control": "public, max-age=300",
  "content-type": "application/json; charset=utf-8",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS, body: "" };
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "Mozilla/5.0 PlayerEmbed/1.0",
      },
    });

    const body = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: HEADERS,
        body: JSON.stringify({ error: "streamx_channels_failed", status: response.status }),
      };
    }

    return { statusCode: 200, headers: HEADERS, body };
  } catch (error) {
    return {
      statusCode: 502,
      headers: HEADERS,
      body: JSON.stringify({ error: "streamx_channels_unreachable" }),
    };
  }
};
