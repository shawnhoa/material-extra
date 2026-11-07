import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version;
const staging = path.join(root, "dist", `meterial-extra-${version}`);
const archive = path.join(root, "dist", `meterial-extra-${version}.tar.gz`);
const entries = [".dockerignore", ".env.example", ".gitignore", "CODE_OF_CONDUCT.md", "CONTRIBUTING.md", "Dockerfile", "LICENSE", "README.md", "SECURITY.md", "compose.yaml", "package.json", "run.ps1", "run.sh", "app", "docs", "scripts"];

await fs.rm(path.join(root, "dist"), { recursive: true, force: true });
await fs.mkdir(staging, { recursive: true });
for (const entry of entries) {
  await fs.cp(path.join(root, entry), path.join(staging, entry), { recursive: true });
}

const result = spawnSync("tar", ["-czf", archive, "-C", path.dirname(staging), path.basename(staging)], {
  stdio: "inherit"
});
if (result.status !== 0) throw new Error("Could not create the release archive");

const stats = await fs.stat(archive);
console.log(JSON.stringify({
  version,
  archive: path.relative(root, archive),
  bytes: stats.size,
  filesIncluded: entries.length
}, null, 2));
