import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html",
  "LICENSE",
  "README.md",
  "README_zh_CN.md",
  "RELEASE_NOTES_v0.1.0.md",
  "API_TEMPLATE.md",
  "CONTRIBUTING.md",
  "DEPLOYMENT.md",
  "Dockerfile",
  "nginx.conf",
  "config.js",
  "config.example.js",
  "run.ps1",
  "run.sh",
  "scripts/package-release.mjs",
  "scripts/package-release.ps1",
  "src/css/tokens.css",
  "src/css/theme.css",
  "src/css/site.css",
  "src/js/app.js",
  "src/js/theme.js",
  "src/data/demo.js",
  "public/assets/logo.svg",
  "public/assets/theme-name-mask.png",
  "public/assets/fonts/big-john.ttf",
  "public/assets/demo/systems.svg",
  "public/assets/demo/portrait.svg",
  "public/assets/demo/palette.svg",
  "public/assets/demo/baseline.svg",
  "public/assets/demo/editorial.svg",
  "public/assets/demo/drawer.svg",
  "docs/images/wordmark-light.png",
  "docs/images/wordmark-dark.png",
  "docs/images/demo-desktop.png",
  "docs/images/demo-mobile.png"
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

for (const file of ["src/js/app.js", "src/js/api.js", "src/js/theme.js", "src/data/demo.js", "scripts/serve.mjs", "scripts/package-release.mjs"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `Syntax error in ${file}`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const externalUrls = html.match(/https?:\/\/[^"' <]+/g) || [];
const unexpectedUrl = externalUrls.find((url) => (
  !url.startsWith("https://github.com/shawnhoa/meterial-extra")
  && !url.startsWith("https://shawnho.top/")
  && !/^https:\/\/(?:[a-z0-9-]+\.)*example\.com(?:\/|$)/i.test(url)
));
if (unexpectedUrl) {
  throw new Error(`Unexpected external URL in demo: ${unexpectedUrl}`);
}

console.log(`Checked ${required.length} required files. No production content detected.`);
