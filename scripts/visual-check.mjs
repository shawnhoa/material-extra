import fs from "node:fs/promises";

const target = await (await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let serial = 0;
const pending = new Map();
const browserErrors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") {
    browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    browserErrors.push(message.params.entry.text);
  }
  if (!pending.has(message.id)) return;
  const task = pending.get(message.id);
  clearTimeout(task.timer);
  pending.delete(message.id);
  if (message.error) task.reject(new Error(JSON.stringify(message.error)));
  else task.resolve(message.result);
});

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout: ${method}`));
    }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result?.value;
}

async function waitFor(expression) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Readiness failed: ${expression}\n${browserErrors.join("\n")}`);
}

async function screenshot(name) {
  const result = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(new URL(`../artifacts/${name}.png`, import.meta.url), Buffer.from(result.data, "base64"));
}

await fs.mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });
await call("Page.enable");
await call("Runtime.enable");
await call("Log.enable");
await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await call("Page.navigate", { url: "http://127.0.0.1:4173/" });
await waitFor("document.readyState === 'complete' && document.querySelectorAll('.story-card').length === 6");
await evaluate(`if (document.documentElement.lang !== 'en') document.querySelector('#language-toggle').click()`);
await evaluate(`document.fonts.ready`);

const desktop = await evaluate(`(() => {
  const wordmark = getComputedStyle(document.querySelector('.theme-wordmark'));
  return {
    title: document.title,
    stories: document.querySelectorAll('.story-card').length,
    covers: document.querySelectorAll('.story-cover img').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    wordmarkFont: wordmark.fontFamily,
    wordmarkText: document.querySelector('.theme-wordmark').textContent.trim(),
    fontLoaded: document.fonts.check('400 28px "Big John"'),
    palette: document.documentElement.dataset.palette,
    mode: document.documentElement.dataset.mode,
    productionExample: Boolean(document.querySelector('a[href="https://shawnho.top/"]')),
    archivePages: document.querySelectorAll("#archive-grid .archive-card").length,
    friendCards: document.querySelectorAll("#friend-grid .friend-card").length,
    announcements: document.querySelectorAll("#announcement-grid .announcement-card").length,
    apiMode: document.body.dataset.contentMode,
  };
})()`);
if (desktop.stories !== 6 || desktop.covers !== 6 || desktop.archivePages < 1 || desktop.friendCards !== 6 || desktop.announcements !== 3 || desktop.apiMode !== "generated" || desktop.overflow > 1 || !desktop.productionExample || !desktop.title.startsWith("Meterial Extra")) {
  throw new Error(`Desktop render failed: ${JSON.stringify(desktop)}`);
}
if (!desktop.wordmarkFont.includes("Big John") || !desktop.fontLoaded || desktop.wordmarkText !== "METERIAL EXTRA") {
  throw new Error(`Theme wordmark font failed: ${JSON.stringify(desktop)}`);
}
await screenshot("meterial-extra-desktop");

await evaluate(`MeterialExtra.setColorMode('light'); document.querySelector('[data-palette="rose"]').click(); document.querySelector('#mode-toggle').click()`);
const switched = await evaluate(`({ palette: document.documentElement.dataset.palette, mode: document.documentElement.dataset.mode })`);
if (switched.palette !== "rose" || switched.mode !== "dark") throw new Error(`Theme switch failed: ${JSON.stringify(switched)}`);
await evaluate(`document.querySelector('#language-toggle').click()`);
const languageState = await evaluate(`({
  lang: document.documentElement.lang,
  hero: document.querySelector('#hero-title').textContent.trim(),
  firstStory: document.querySelector('.story-card h3')?.textContent || '',
  category: document.querySelector('[data-category="all"]')?.textContent || '',
})`);
if (languageState.lang !== "zh-CN" || !languageState.hero.includes("富有表现力") || !languageState.category.includes("全部")) {
  throw new Error(`Chinese language switch failed: ${JSON.stringify(languageState)}`);
}

await call("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenOrientation: { type: "portraitPrimary", angle: 0 }
});
await call("Page.reload", { ignoreCache: true });
await new Promise((resolve) => setTimeout(resolve, 500));
await waitFor("document.readyState === 'complete' && document.querySelectorAll('.story-card').length === 6");
const mobile = await evaluate(`(() => ({
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  navDisplay: getComputedStyle(document.querySelector('#nav-toggle')).display,
  cards: document.querySelectorAll('.story-card').length,
  covers: document.querySelectorAll('.story-cover img').length,
  lang: document.documentElement.lang,
}))()`);
if (mobile.overflow > 1 || mobile.navDisplay === "none" || mobile.covers !== 6 || mobile.lang !== "zh-CN") throw new Error(`Mobile render failed: ${JSON.stringify(mobile)}`);
await screenshot("meterial-extra-mobile");

console.log(JSON.stringify({ passed: true, desktop, switched, languageState, mobile }, null, 2));
await call("Page.close").catch(() => {});
socket.close();
