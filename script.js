const loadingScreen = document.querySelector(".loading-screen");
const landingContent = document.querySelector(".landing-content");
const themeToggle = document.querySelector("#theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
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

const birthdayTitle = document.querySelector("#landing-title");
const birthdayCountdown = document.querySelector("#birthday-countdown");
const birthdayCelebration = document.querySelector("#birthday-celebration");
const birthdaySubtitle = document.querySelector("#landing-subtitle");
const birthdayFireworksCanvas = document.querySelector("#birthday-fireworks");
const birthdayFireworksContext = birthdayFireworksCanvas?.getContext("2d");
const birthdayReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const debugPanel = document.querySelector("#debug-panel");
const debugPanelToggle = document.querySelector("#debug-panel-toggle");
const debugPanelClose = document.querySelector("#debug-panel-close");
const fireworksTestButton = document.querySelector("#fireworks-test");
const themeTestButton = document.querySelector("#theme-test");
const debugMode = new URLSearchParams(window.location.search).get("debug") === "1";
const moscowDateFormatter = new Intl.DateTimeFormat("en-US", {
  calendar: "gregory",
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});
const defaultBirthdaySubtitle = birthdaySubtitle?.textContent || "";
const birthdayCountdownValues = {
  days: birthdayCountdown?.querySelector("[data-countdown-days]"),
  hours: birthdayCountdown?.querySelector("[data-countdown-hours]"),
  minutes: birthdayCountdown?.querySelector("[data-countdown-minutes]"),
  seconds: birthdayCountdown?.querySelector("[data-countdown-seconds]"),
};
const birthdayFireworkColors = ["#f0ad0b", "#f08b83", "#ca8a0a", "#f5dfaf", "#b9adff", "#75d8cb"];
let birthdayMode = "normal";
let birthdayAnimationFrame = 0;
let birthdayLastLaunch = 0;
let birthdayCanvasWidth = 0;
let birthdayCanvasHeight = 0;
let birthdayRockets = [];
let birthdayParticles = [];

function getMoscowDateParts(date) {
  const parts = moscowDateFormatter.formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  );
}

function getMoscowMidnight(year, monthIndex, day) {
  const targetUtc = Date.UTC(year, monthIndex, day);
  const partsAtUtcGuess = getMoscowDateParts(new Date(targetUtc));
  const representedAsUtc = Date.UTC(
    partsAtUtcGuess.year,
    partsAtUtcGuess.month - 1,
    partsAtUtcGuess.day,
    partsAtUtcGuess.hour,
    partsAtUtcGuess.minute,
    partsAtUtcGuess.second,
  );
  const offset = representedAsUtc - targetUtc;
  return new Date(targetUtc - offset);
}

function setBirthdayMode(mode) {
  if (birthdayMode === mode) return;
  birthdayMode = mode;

  if (birthdayTitle) birthdayTitle.hidden = mode !== "normal";
  if (birthdayCountdown) birthdayCountdown.hidden = mode !== "countdown";
  if (birthdayCelebration) birthdayCelebration.hidden = mode !== "birthday";
  document.body.classList.toggle("is-birthday", mode === "birthday");

  if (birthdaySubtitle) {
    birthdaySubtitle.hidden = mode === "countdown";
    birthdaySubtitle.textContent = mode === "birthday"
      ? "ALL SIGNALS POINT TO YOU // HAPPY BIRTHDAY"
      : defaultBirthdaySubtitle;
  }

  if (mode === "birthday") {
    birthdayFireworksCanvas?.removeAttribute("hidden");
    if (!birthdayReducedMotion.matches) startBirthdayFireworks();
  } else {
    stopBirthdayFireworks();
    birthdayFireworksCanvas?.setAttribute("hidden", "");
  }
}

function updateBirthdayCountdown(now, year) {
  const birthdayInstant = getMoscowMidnight(year, 10, 9);
  const totalSeconds = Math.max(0, Math.floor((birthdayInstant.getTime() - now.getTime()) / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  for (const [unit, value] of Object.entries({ days, hours, minutes, seconds })) {
    if (birthdayCountdownValues[unit]) birthdayCountdownValues[unit].textContent = String(value).padStart(2, "0");
  }
}

function updateBirthdayExperience() {
  const now = new Date();
  const moscowToday = getMoscowDateParts(now);
  const countdownWeek = moscowToday.month === 11 && moscowToday.day >= 2 && moscowToday.day < 9;
  const isBirthday = moscowToday.month === 11 && moscowToday.day === 9;

  if (isBirthday) {
    setBirthdayMode("birthday");
  } else if (countdownWeek) {
    setBirthdayMode("countdown");
    updateBirthdayCountdown(now, moscowToday.year);
  } else {
    setBirthdayMode("normal");
  }
}

function resizeBirthdayCanvas() {
  if (!birthdayFireworksCanvas || !birthdayFireworksContext) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  birthdayCanvasWidth = window.innerWidth;
  birthdayCanvasHeight = window.innerHeight;
  birthdayFireworksCanvas.width = Math.round(birthdayCanvasWidth * pixelRatio);
  birthdayFireworksCanvas.height = Math.round(birthdayCanvasHeight * pixelRatio);
  birthdayFireworksContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function launchBirthdayFirework() {
  const color = birthdayFireworkColors[Math.floor(Math.random() * birthdayFireworkColors.length)];
  const x = birthdayCanvasWidth * (0.08 + Math.random() * 0.84);
  const targetY = birthdayCanvasHeight * (0.16 + Math.random() * 0.42);
  birthdayRockets.push({ x, y: birthdayCanvasHeight + 8, targetY, speed: 4.5 + Math.random() * 2.2, color });
}

function burstBirthdayFirework(rocket) {
  const particleCount = 72 + Math.floor(Math.random() * 24);
  for (let index = 0; index < particleCount; index += 1) {
    const angle = (Math.PI * 2 * index) / particleCount + (Math.random() - 0.5) * 0.08;
    const speed = 1.7 + Math.random() * 4.2;
    const life = 56 + Math.random() * 36;
    birthdayParticles.push({
      x: rocket.x,
      y: rocket.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 0.035 + Math.random() * 0.025,
      life,
      maxLife: life,
      color: rocket.color,
      size: 1.5 + Math.random() * 2.1,
    });
  }
}

function drawBirthdayFireworks(timestamp) {
  if (!birthdayFireworksContext) return;
  const context = birthdayFireworksContext;
  context.clearRect(0, 0, birthdayCanvasWidth, birthdayCanvasHeight);

  if (timestamp - birthdayLastLaunch > 380) {
    launchBirthdayFirework();
    birthdayLastLaunch = timestamp;
  }

  for (let index = birthdayRockets.length - 1; index >= 0; index -= 1) {
    const rocket = birthdayRockets[index];
    const previousY = rocket.y;
    rocket.y -= rocket.speed;
    context.globalAlpha = 0.8;
    context.strokeStyle = rocket.color;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(rocket.x, previousY + 9);
    context.lineTo(rocket.x, rocket.y);
    context.stroke();

    if (rocket.y <= rocket.targetY) {
      burstBirthdayFirework(rocket);
      birthdayRockets.splice(index, 1);
    }
  }

  context.globalAlpha = 1;
  for (let index = birthdayParticles.length - 1; index >= 0; index -= 1) {
    const particle = birthdayParticles[index];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += particle.gravity;
    particle.vx *= 0.986;
    particle.vy *= 0.986;
    particle.life -= 1;

    if (particle.life <= 0) {
      birthdayParticles.splice(index, 1);
      continue;
    }

    context.globalAlpha = particle.life / particle.maxLife;
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  birthdayAnimationFrame = window.requestAnimationFrame(drawBirthdayFireworks);
}

function startBirthdayFireworks() {
  if (!birthdayFireworksCanvas || !birthdayFireworksContext || birthdayAnimationFrame || birthdayReducedMotion.matches) return;
  resizeBirthdayCanvas();
  window.addEventListener("resize", resizeBirthdayCanvas);
  birthdayLastLaunch = 0;
  birthdayAnimationFrame = window.requestAnimationFrame(drawBirthdayFireworks);
}

function stopBirthdayFireworks() {
  if (birthdayAnimationFrame) window.cancelAnimationFrame(birthdayAnimationFrame);
  birthdayAnimationFrame = 0;
  birthdayRockets = [];
  birthdayParticles = [];
  window.removeEventListener("resize", resizeBirthdayCanvas);
  birthdayFireworksContext?.clearRect(0, 0, birthdayCanvasWidth, birthdayCanvasHeight);
}

updateBirthdayExperience();
window.setInterval(updateBirthdayExperience, 1000);

let fireworksTestTimeout = 0;

function setDebugPanelOpen(open) {
  if (!debugPanel || !debugPanelToggle) return;
  debugPanel.classList.toggle("is-open", open);
  debugPanel.setAttribute("aria-hidden", String(!open));
  debugPanel.inert = !open;
  debugPanelToggle.setAttribute("aria-expanded", String(open));
  debugPanelToggle.setAttribute("aria-label", open ? "Закрыть панель отладки" : "Открыть панель отладки");
  if (open) debugPanel.removeAttribute("hidden");
}

function updateDebugThemeButton() {
  if (!themeTestButton) return;
  themeTestButton.textContent = document.body.classList.contains("is-night") ? "TO DAY" : "TO NIGHT";
}

if (debugMode) {
  document.body.classList.add("debug-mode");
  debugPanel?.removeAttribute("hidden");
  debugPanelToggle?.removeAttribute("hidden");
  updateDebugThemeButton();
}

debugPanelToggle?.addEventListener("click", () => {
  setDebugPanelOpen(debugPanel?.getAttribute("aria-hidden") === "true");
});

debugPanelClose?.addEventListener("click", () => {
  setDebugPanelOpen(false);
  debugPanelToggle?.focus({ preventScroll: true });
});

themeTestButton?.addEventListener("click", () => themeToggle?.click());
themeToggle?.addEventListener("click", updateDebugThemeButton);

fireworksTestButton?.addEventListener("click", () => {
  if (!debugMode || fireworksTestButton.disabled) return;
  if (birthdayReducedMotion.matches) {
    fireworksTestButton.textContent = "MOTION REDUCED";
    fireworksTestButton.disabled = true;
    window.setTimeout(() => {
      fireworksTestButton.textContent = "LAUNCH";
      fireworksTestButton.disabled = false;
    }, 1600);
    return;
  }

  fireworksTestButton.disabled = true;
  fireworksTestButton.textContent = "FIRING…";
  birthdayFireworksCanvas?.removeAttribute("hidden");
  startBirthdayFireworks();
  if (fireworksTestTimeout) window.clearTimeout(fireworksTestTimeout);
  fireworksTestTimeout = window.setTimeout(() => {
    if (birthdayMode !== "birthday") {
      stopBirthdayFireworks();
      birthdayFireworksCanvas?.setAttribute("hidden", "");
    }
    fireworksTestButton.disabled = false;
    fireworksTestButton.textContent = "LAUNCH";
    fireworksTestTimeout = 0;
  }, 7000);
});

window.setTimeout(() => {
  document.body.classList.add("is-loaded");
  loadingScreen?.setAttribute("aria-hidden", "true");
  if (landingContent) {
    landingContent.inert = false;
    landingContent.removeAttribute("aria-hidden");
  }
}, 1500);
