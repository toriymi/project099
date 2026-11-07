const PLACEHOLDER_ARTWORK = "2a96cbd8b46e442fc41c2b86b821562f";

function jsonResponse(body, status, origin, allowedOrigins, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
    ...extraHeaders,
  });

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

function getAllowedOrigins(value = "") {
  return new Set(value.split(",").map((origin) => origin.trim()).filter(Boolean));
}

function readText(value) {
  return typeof value === "string" ? value : "";
}

function getCover(images) {
  if (!Array.isArray(images)) return "";

  const cover = readText(images.find((image) => image?.size === "extralarge")?.["#text"]);
  return cover.includes(PLACEHOLDER_ARTWORK) ? "" : cover;
}

function getTrack(recentTracks) {
  const tracks = recentTracks?.track;
  if (Array.isArray(tracks)) return tracks[0] || null;
  return tracks || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowedOrigins = getAllowedOrigins(env.ALLOWED_ORIGINS);

    if (url.pathname !== "/lastfm") {
      return jsonResponse({ error: "Not found" }, 404, origin, allowedOrigins);
    }

    if (request.method === "OPTIONS") {
      return jsonResponse(null, 204, origin, allowedOrigins, {
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "Content-Type",
        "Access-Control-Max-Age": "86400",
      });
    }

    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405, origin, allowedOrigins, {
        Allow: "GET, OPTIONS",
      });
    }

    if (!env.LASTFM_API_KEY || env.LASTFM_API_KEY === "ВСТАВЬ_КЛЮЧ_САМ") {
      return jsonResponse({ error: "LASTFM_API_KEY is not configured" }, 500, origin, allowedOrigins);
    }

    try {
      const apiUrl = new URL("https://ws.audioscrobbler.com/2.0/");
      apiUrl.search = new URLSearchParams({
        method: "user.getrecenttracks",
        user: env.LASTFM_USER,
        api_key: env.LASTFM_API_KEY,
        format: "json",
        limit: "1",
      }).toString();

      const response = await fetch(apiUrl, {
        cf: { cacheTtl: 10, cacheEverything: true },
      });

      if (!response.ok) {
        return jsonResponse({ error: `Last.fm returned HTTP ${response.status}` }, 502, origin, allowedOrigins);
      }

      let result;
      try {
        result = await response.json();
      } catch {
        return jsonResponse({ error: "Last.fm returned invalid JSON" }, 502, origin, allowedOrigins);
      }

      if (result?.error) {
        return jsonResponse({ error: readText(result.message) || "Last.fm API error" }, 502, origin, allowedOrigins);
      }

      const track = getTrack(result?.recenttracks);
      const payload = {
        nowplaying: track?.["@attr"]?.nowplaying === "true",
        title: readText(track?.name),
        artist: readText(track?.artist?.["#text"] || track?.artist?.name),
        album: readText(track?.album?.["#text"]),
        cover: getCover(track?.image),
      };

      return jsonResponse(payload, 200, origin, allowedOrigins);
    } catch {
      return jsonResponse({ error: "Network error while contacting Last.fm" }, 502, origin, allowedOrigins);
    }
  },
};
