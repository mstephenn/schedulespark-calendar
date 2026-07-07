import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const packageDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = join(packageDir, "dist");
const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

// Byte ceilings per tracked entry point and for the tracked total. These cover
// each export's own compiled size (imports of shared modules are separate
// files under unbundled ESM output, not inlined here) — a regression usually
// means an entry point started re-exporting something it shouldn't.
const MAX_ENTRY_BYTES = 20 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024;

const targets = trackedJsEntries(pkg);
let totalBytes = 0;
let exceeded = false;

for (const target of targets) {
  const filePath = join(distDir, target);
  const { size } = statSync(filePath);
  totalBytes += size;
  console.log(`${target}: ${formatKiB(size)} KiB`);
  if (size > MAX_ENTRY_BYTES) {
    console.error(`✖ ${target} is ${formatKiB(size)} KiB, exceeding the ${formatKiB(MAX_ENTRY_BYTES)} KiB per-entry limit`);
    exceeded = true;
  }
}

console.log(`total tracked output: ${formatKiB(totalBytes)} KiB`);
console.log(`runtime dependencies: ${Object.keys(pkg.dependencies ?? {}).join(", ") || "none"}`);

if (totalBytes > MAX_TOTAL_BYTES) {
  console.error(`✖ total tracked output is ${formatKiB(totalBytes)} KiB, exceeding the ${formatKiB(MAX_TOTAL_BYTES)} KiB limit`);
  exceeded = true;
}

const unexpectedFiles = readdirSync(distDir).filter((name) => name.endsWith(".js") && !targets.includes(name));
if (unexpectedFiles.length > 0) {
  console.log(`other dist entries: ${unexpectedFiles.join(", ")}`);
}

if (exceeded) {
  console.error("Bundle size check failed — see limits above.");
  process.exit(1);
}

/**
 * Formats bytes as KiB for bundle reporting.
 */
function formatKiB(bytes) {
  return (bytes / 1024).toFixed(1);
}

/**
 * Returns dist-relative .js entry point paths declared in package.json exports,
 * so tracked entries stay in sync with what the package actually publishes.
 */
function trackedJsEntries(packageJson) {
  const entries = [];
  for (const value of Object.values(packageJson.exports ?? {})) {
    const importPath = typeof value === "string" ? value : value.import;
    if (typeof importPath === "string" && importPath.endsWith(".js")) {
      entries.push(importPath.replace(/^\.\/dist\//, ""));
    }
  }
  return entries;
}
