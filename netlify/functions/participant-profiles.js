const SPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || "123";
const SPORTSDB_SEARCH_URL = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchplayers.php`;
const WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const CACHE_MAX_AGE = 86400;
const STALE_WHILE_REVALIDATE = 604800;
const MEMORY_TTL_MS = CACHE_MAX_AGE * 1000;
const REQUEST_TIMEOUT_MS = 7000;
const MAX_PEOPLE = 12;
const MAX_CACHE_ENTRIES = 200;

const BASE_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "content-type": "application/json; charset=utf-8",
};

const profileCache = new Map();

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

function getRequestedPeople(event) {
  const raw = String(event.queryStringParameters?.people || "");

  try {
    const people = JSON.parse(raw);
    const unique = new Map();

    if (!Array.isArray(people)) {
      return [];
    }

    people.forEach((person) => {
      const name = String(person?.name || "").trim().replace(/\s+/g, " ").slice(0, 80);
      const sport = normalizeText(person?.sport).replace(/\s+/g, "-").slice(0, 30);

      if (name.length < 3 || !sport) {
        return;
      }

      const key = `${sport}|${normalizeText(name)}`;
      if (!unique.has(key)) {
        unique.set(key, { name, sport, key });
      }
    });

    return Array.from(unique.values()).slice(0, MAX_PEOPLE);
  } catch (error) {
    return [];
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "CanalesMundial/1.0 participant-image-resolver",
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

function isCompatibleSport(rawSport, sport) {
  const candidate = normalizeText(rawSport);

  if (["mma", "boxing", "combat", "wrestling"].includes(sport)) {
    return /fighting|martial arts|boxing|wrestling|mma/.test(candidate);
  }

  if (sport === "tennis") {
    return candidate.includes("tennis");
  }

  return candidate.includes(sport.replace(/-/g, " "));
}

function scoreName(query, candidate) {
  const queryParts = normalizeText(query).split(" ").filter(Boolean);
  const candidateParts = normalizeText(candidate).split(" ").filter(Boolean);

  if (!queryParts.length || !candidateParts.length) {
    return 0;
  }

  const queryLast = queryParts[queryParts.length - 1];
  const candidateLast = candidateParts[candidateParts.length - 1];

  if (queryLast !== candidateLast) {
    return 0;
  }

  const queryFirst = queryParts[0];
  const candidateFirst = candidateParts[0];

  if (queryFirst.length === 1 && candidateFirst.startsWith(queryFirst)) {
    return 80;
  }

  if (queryFirst === candidateFirst) {
    return normalizeText(query) === normalizeText(candidate) ? 120 : 100;
  }

  return 20;
}

async function searchSportsDb(name, sport) {
  const url = `${SPORTSDB_SEARCH_URL}?p=${encodeURIComponent(name)}`;
  const data = await fetchJson(url);
  const players = Array.isArray(data?.player) ? data.player : [];

  return players
    .filter((player) => isCompatibleSport(player.strSport, sport))
    .map((player) => ({ player, score: scoreName(name, player.strPlayer) }))
    .filter((item) => item.score >= 80)
    .sort((a, b) => b.score - a.score)[0]?.player || null;
}

function getWikipediaContext(sport) {
  if (sport === "tennis") {
    return "tennis player";
  }

  if (sport === "boxing") {
    return "boxer fighter";
  }

  if (sport === "wrestling") {
    return "wrestler";
  }

  return "MMA fighter";
}

function matchesWikipediaSport(page, sport) {
  const description = normalizeText(page.description);

  if (sport === "tennis") {
    return description.includes("tennis player");
  }

  if (sport === "boxing") {
    return /boxer|boxing|mixed martial artist|fighter/.test(description);
  }

  return /mixed martial artist|martial artist|fighter|boxer|kickboxer|wrestler/.test(description);
}

async function searchWikipedia(name, sport) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${name} ${getWikipediaContext(sport)}`,
    gsrlimit: "5",
    prop: "pageimages|description",
    piprop: "thumbnail",
    pithumbsize: "600",
    format: "json",
  });
  const data = await fetchJson(`${WIKIPEDIA_SEARCH_URL}?${params}`);
  const pages = Object.values(data?.query?.pages || {});

  return pages
    .filter((page) => scoreName(name, page.title) >= 80 && matchesWikipediaSport(page, sport))
    .sort((a, b) => (a.index || 99) - (b.index || 99))[0] || null;
}

function makeSportsDbProfile(query, sport, player) {
  return {
    query,
    sport,
    name: player.strPlayer || query,
    image: player.strThumb || player.strCutout || "",
    cutout: player.strCutout || "",
    source: "TheSportsDB",
    sourceUrl: `https://www.thesportsdb.com/player/${player.idPlayer}`,
  };
}

async function resolveProfile(person) {
  const cached = profileCache.get(person.key);

  if (cached && Date.now() - cached.cachedAt < MEMORY_TTL_MS) {
    return cached.profile;
  }

  let player = null;
  let wikipediaPage = null;

  try {
    player = await searchSportsDb(person.name, person.sport);
  } catch (error) {
    player = null;
  }

  if (!player) {
    try {
      wikipediaPage = await searchWikipedia(person.name, person.sport);
      if (wikipediaPage) {
        player = await searchSportsDb(wikipediaPage.title, person.sport);
      }
    } catch (error) {
      player = null;
    }
  }

  const profile = player
    ? makeSportsDbProfile(person.name, person.sport, player)
    : {
      query: person.name,
      sport: person.sport,
      name: wikipediaPage?.title || person.name,
      image: wikipediaPage?.thumbnail?.source || "",
      cutout: "",
      source: wikipediaPage?.thumbnail?.source ? "Wikipedia" : "",
      sourceUrl: wikipediaPage ? `https://en.wikipedia.org/?curid=${wikipediaPage.pageid}` : "",
    };

  profileCache.set(person.key, { profile, cachedAt: Date.now() });
  if (profileCache.size > MAX_CACHE_ENTRIES) {
    profileCache.delete(profileCache.keys().next().value);
  }

  return profile;
}

async function resolveProfiles(people) {
  const results = new Array(people.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < people.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await resolveProfile(people[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(3, people.length) }, worker));
  return results;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: makeHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: makeHeaders({ allow: "GET, OPTIONS", "cache-control": "no-store" }),
      body: JSON.stringify({ error: "method_not_allowed" }),
    };
  }

  const people = getRequestedPeople(event);

  if (!people.length) {
    return { statusCode: 200, headers: makeHeaders(), body: JSON.stringify({ profiles: [] }) };
  }

  try {
    const profiles = await resolveProfiles(people);
    return { statusCode: 200, headers: makeHeaders(), body: JSON.stringify({ profiles }) };
  } catch (error) {
    return {
      statusCode: 502,
      headers: makeHeaders({ "cache-control": "no-store" }),
      body: JSON.stringify({ error: "participant_profiles_unreachable" }),
    };
  }
};
