const loadingScreen = document.querySelector(".loading-screen");
const landingContent = document.querySelector(".landing-content");
const themeToggle = document.querySelector("#theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const siteFavicon = document.querySelector("#site-favicon");
const nowPlayingCard = document.querySelector("#now-playing");
const playerStatus = document.querySelector("#player-status");
const playerTrack = document.querySelector("#player-track");
const playerTrackLink = document.querySelector("#player-track-link");
const playerArtist = document.querySelector("#player-artist");
const playerArtwork = document.querySelector("#player-artwork");
const playerArtworkPlaceholder = document.querySelector("#player-artwork-placeholder");
const themeStorageKey = "toriymi-theme";
const lastFmProfileUrl = "https://www.last.fm/user/omnipotence88";
const lastFmWorkerEndpoint = "https://lastfm-now-playing.toriymii.workers.dev/lastfm";
let playerRequestPending = false;

function setPlayerState(state, status, track, artist) {
  if (!nowPlayingCard) return;
  nowPlayingCard.dataset.state = state;
  playerStatus.textContent = status;
  playerTrack.textContent = track;
  playerArtist.textContent = artist;
  nowPlayingCard.setAttribute("aria-busy", String(state === "loading"));
}

function getSafeHttpsUrl(value) {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function setPlayerArtwork(url) {
  const safeUrl = getSafeHttpsUrl(url);
  if (!safeUrl) {
    playerArtwork.removeAttribute("src");
    playerArtwork.hidden = true;
    playerArtworkPlaceholder.hidden = false;
    return;
  }

  playerArtwork.onload = () => {
    playerArtwork.hidden = false;
    playerArtworkPlaceholder.hidden = true;
  };
  playerArtwork.onerror = () => {
    playerArtwork.removeAttribute("src");
    playerArtwork.hidden = true;
    playerArtworkPlaceholder.hidden = false;
  };
  playerArtwork.src = safeUrl;
}

async function updateNowPlaying() {
  if (!nowPlayingCard || playerRequestPending || document.visibilityState === "hidden") return;
  playerRequestPending = true;

  try {
    const response = await fetch(lastFmWorkerEndpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("The Last.fm worker is unavailable");

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (!data.title) {
      setPlayerState("idle", "NO RECENT SIGNAL", "NO TRACK DATA", "Listening status will appear here");
      playerTrackLink.href = lastFmProfileUrl;
      setPlayerArtwork("");
      return;
    }

    const playing = data.nowplaying === true;
    const albumText = data.album ? ` · ${data.album}` : "";
    setPlayerState(
      playing ? "playing" : "recent",
      playing ? "NOW PLAYING" : "LAST SCROBBLE",
      data.title,
      `${data.artist || "Unknown artist"}${albumText}`,
    );
    playerTrackLink.href = lastFmProfileUrl;
    setPlayerArtwork(data.cover);
  } catch {
    setPlayerState("error", "SIGNAL UNAVAILABLE", "LAST.FM CONNECTION OFFLINE", "Could not load listening data from Last.fm");
    playerTrackLink.href = lastFmProfileUrl;
    setPlayerArtwork("");
  } finally {
    playerRequestPending = false;
  }
}

updateNowPlaying();
window.setInterval(updateNowPlaying, 30_000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") updateNowPlaying();
});

function setNightTheme(enabled) {
  document.body.classList.toggle("is-night", enabled);
  themeToggle?.setAttribute("aria-pressed", String(enabled));
  themeToggle?.setAttribute("aria-label", enabled ? "Вернуть исходную тему" : "Включить тёмную тему");
  themeColorMeta?.setAttribute("content", enabled ? "#090914" : "#050403");
  siteFavicon?.setAttribute("type", enabled ? "image/png" : "image/svg+xml");
  siteFavicon?.setAttribute("sizes", enabled ? "128x128" : "any");
  siteFavicon?.setAttribute("href", enabled ? "./assets/favicon-night.png?v=2" : "./assets/favicon.svg?v=3");
}

try {
  setNightTheme(window.localStorage.getItem(themeStorageKey) === "night");
} catch {
  setNightTheme(false);
}

themeToggle?.addEventListener("click", () => {
  const enabled = !document.body.classList.contains("is-night");
  setNightTheme(enabled);
  try {
    window.localStorage.setItem(themeStorageKey, enabled ? "night" : "default");
  } catch {
    // The switch still works for this visit if storage is unavailable.
  }
});

window.setTimeout(() => {
  document.body.classList.add("is-loaded");
  loadingScreen?.setAttribute("aria-hidden", "true");
  if (landingContent) {
    landingContent.inert = false;
    landingContent.removeAttribute("aria-hidden");
  }
}, 1500);
