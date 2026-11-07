const RESPONSE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=0, s-maxage=20, stale-while-revalidate=20",
};

function jsonResponse(body, status = 200, headers = RESPONSE_HEADERS) {
  return new Response(JSON.stringify(body), { status, headers });
}

function safeHttpsUrl(value) {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function cleanText(value, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function findArtwork(images) {
  if (!Array.isArray(images)) return "";
  const preferred = ["extralarge", "mega", "large", "medium", "small"];
  for (const size of preferred) {
    const image = images.find((entry) => entry?.size === size && entry["#text"]);
    if (image) return safeHttpsUrl(image["#text"]);
  }
  return safeHttpsUrl(images.find((entry) => entry?.["#text"])?.["#text"]);
}

function noStoreJsonResponse(body, status) {
  return jsonResponse(body, status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
}

export async function onRequestGet({ env }) {
  const apiKey = env.LASTFM_API_KEY;
  if (!apiKey) {
    return noStoreJsonResponse({ error: "missing_api_key" }, 503);
  }

  const cacheKey = new Request("https://toriymi-cache.invalid/api/now-playing");
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const endpoint = new URL("https://ws.audioscrobbler.com/2.0/");
  endpoint.search = new URLSearchParams({
    method: "user.getrecenttracks",
    user: env.LASTFM_USERNAME || "omnipotence88",
    api_key: apiKey,
    format: "json",
    limit: "1",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstreamResponse = await fetch(endpoint, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!upstreamResponse.ok) return noStoreJsonResponse({ error: "lastfm_unavailable" }, 502);

    const result = await upstreamResponse.json();
    if (result.error) return noStoreJsonResponse({ error: "lastfm_unavailable" }, 502);

    const rawTrack = result.recenttracks?.track;
    const track = Array.isArray(rawTrack) ? rawTrack[0] : rawTrack;
    if (!track) {
      const response = jsonResponse({ status: "idle", track: null });
      await cache.put(cacheKey, response.clone());
      return response;
    }

    const nowPlaying = track["@attr"]?.nowplaying === "true";
    const payload = {
      status: nowPlaying ? "playing" : "recent",
      track: cleanText(track.name),
      artist: cleanText(track.artist?.["#text"] || track.artist?.name),
      album: cleanText(track.album?.["#text"]),
      artwork: findArtwork(track.image),
      url: safeHttpsUrl(track.url),
      timestamp: Number.parseInt(track.date?.uts, 10) || null,
    };

    const response = jsonResponse(payload);
    await cache.put(cacheKey, response.clone());
    return response;
  } catch {
    return noStoreJsonResponse({ error: "lastfm_unavailable" }, 502);
  } finally {
    clearTimeout(timeout);
  }
}
