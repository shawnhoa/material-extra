import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version;
const staging = path.join(root, "dist", `meterial-extra-${version}`);
const archive = path.join(root, "dist", `meterial-extra-${version}.tar.gz`);
const entries = [".dockerignore", ".env.example", ".gitignore", "CODE_OF_CONDUCT.md", "CONTRIBUTING.md", "Dockerfile", "LICENSE", "README.md", "SECURITY.md", "compose.yaml", "package.json", "run.ps1", "run.sh", "app", "docs", "scripts"];
const ignoredNames = new Set(["__pycache__", ".DS_Store", "Thumbs.db"]);

function includeInArchive(source) {
  const name = path.basename(source);
  return !ignoredNames.has(name) && !name.endsWith(".pyc");
}

await fs.rm(path.join(root, "dist"), { recursive: true, force: true });
await fs.mkdir(staging, { recursive: true });
for (const entry of entries) {
  await fs.cp(path.join(root, entry), path.join(staging, entry), {
    recursive: true,
    filter: includeInArchive
  });
}

async function findUnexpectedFiles(directory) {
  const unexpected = [];
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) {
      if (item.name === "__pycache__") unexpected.push(fullPath);
      else unexpected.push(...await findUnexpectedFiles(fullPath));
    } else if (item.name.endsWith(".pyc")) {
      unexpected.push(fullPath);
    }
  }
  return unexpected;
}

const unexpectedFiles = await findUnexpectedFiles(staging);
if (unexpectedFiles.length) {
  throw new Error(`Unexpected runtime files in release staging: ${unexpectedFiles.join(", ")}`);
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
