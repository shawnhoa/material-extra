const STORAGE_KEY = "meterial-extra-preferences";
const palettes = new Set(["lilac", "rose", "ocean", "moss"]);
const modes = new Set(["light", "dark"]);
const radii = new Set(["soft", "rounded", "expressive"]);

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function notify(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

const state = {
  palette: "lilac",
  mode: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  radius: "expressive"
};

function apply() {
  const root = document.documentElement;
  root.dataset.palette = state.palette;
  root.dataset.mode = state.mode;
  root.dataset.radius = state.radius;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    getComputedStyle(root).getPropertyValue("--me-surface").trim()
  );
  document.querySelector("#mode-toggle")?.setAttribute(
    "aria-label",
    state.mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
  document.querySelectorAll("[data-palette]").forEach((button) => {
    const active = button.dataset.palette === state.palette;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const radiusSelect = document.querySelector("#radius-select");
  if (radiusSelect) radiusSelect.value = state.radius;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Preferences remain available for the current page.
  }
}

function setPalette(value) {
  if (!palettes.has(value)) return false;
  state.palette = value;
  apply();
  notify(`Palette changed to ${value}`);
  return true;
}

function setColorMode(value) {
  if (!modes.has(value)) return false;
  state.mode = value;
  apply();
  notify(`${value === "dark" ? "Dark" : "Light"} mode enabled`);
  return true;
}

function setRadius(value) {
  if (!radii.has(value)) return false;
  state.radius = value;
  apply();
  notify(`Corner style: ${value}`);
  return true;
}

function openNavigation(open = !document.body.classList.contains("nav-open")) {
  document.body.classList.toggle("nav-open", open);
  const toggle = document.querySelector("#nav-toggle");
  toggle?.setAttribute("aria-expanded", String(open));
  const scrim = document.querySelector("#nav-scrim");
  if (scrim) scrim.hidden = !open;
}

export function initTheme() {
  Object.assign(state, readPreferences());
  if (!palettes.has(state.palette)) state.palette = "lilac";
  if (!modes.has(state.mode)) state.mode = "light";
  if (!radii.has(state.radius)) state.radius = "expressive";
  apply();
}

export const MeterialExtra = {
  initTheme,
  setPalette,
  setColorMode,
  setRadius,
  openNavigation,
  getState: () => ({ ...state })
};

window.MeterialExtra = MeterialExtra;
