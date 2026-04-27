// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.

/**
 * Prepend license headers to first-party source files. Re-run when adding new paths.
 * Usage: node scripts/apply-license-headers.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const EXCLUDE_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  ".git",
  "coverage",
  ".turbo",
]);

const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".prisma",
  ".yml",
  ".yaml",
  ".html",
]);

function readHeaderFile(name) {
  return fs.readFileSync(path.join(ROOT, "docs", "license-headers", name), "utf8");
}

const HEADERS = {
  cStyle: readHeaderFile("typescript-javascript.txt"),
  hash: readHeaderFile("hash-style.txt"),
  css: readHeaderFile("css.txt") + "\n",
  html: readHeaderFile("markdown.txt") + "\n",
};

function hasLicenseHeader(raw) {
  let s = raw;
  if (s.startsWith("#!")) {
    const idx = s.indexOf("\n");
    if (idx !== -1) s = s.slice(idx + 1);
  }
  s = s.trimStart();
  return (
    s.startsWith("// SPDX-License-Identifier: MIT") ||
    s.startsWith("# SPDX-License-Identifier: MIT") ||
    s.startsWith("/* SPDX-License-Identifier: MIT") ||
    s.startsWith("<!--\nSPDX-License-Identifier: MIT") ||
    s.startsWith("<!--\r\nSPDX-License-Identifier: MIT")
  );
}

function shouldScanDir(name) {
  return !EXCLUDE_DIR_NAMES.has(name);
}

function* walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (shouldScanDir(e.name)) yield* walkFiles(full);
    } else {
      yield full;
    }
  }
}

function headerForFile(filePath) {
  const ext = path.extname(filePath);
  const base = path.basename(filePath);
  if (base === "Dockerfile" || base.startsWith("Dockerfile.")) {
    return HEADERS.hash;
  }
  if (ext === ".css") return HEADERS.css;
  if (ext === ".html") return HEADERS.html;
  if (ext === ".yml" || ext === ".yaml") return HEADERS.hash;
  if (ext === ".prisma" || EXTENSIONS.has(ext)) {
    return HEADERS.cStyle;
  }
  return null;
}

function needsShebangHandling(filePath) {
  const ext = path.extname(filePath);
  if (ext === ".prisma" || ext === ".css" || ext === ".html" || ext === ".yml" || ext === ".yaml")
    return false;
  const base = path.basename(filePath);
  if (base === "Dockerfile" || base.startsWith("Dockerfile.")) return false;
  return true;
}

function prependToContent(raw, header, filePath) {
  if (hasLicenseHeader(raw)) return raw;
  if (!needsShebangHandling(filePath)) {
    return header + raw;
  }
  const firstBreak = raw.indexOf("\n");
  const firstLine = firstBreak === -1 ? raw : raw.slice(0, firstBreak);
  if (firstLine.startsWith("#!")) {
    const rest = firstBreak === -1 ? "" : raw.slice(firstBreak + 1);
    const restTrimmed = rest.replace(/^\n*/, "");
    return firstLine + "\n\n" + header + (restTrimmed ? restTrimmed : "");
  }
  return header + raw;
}

function processFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (rel.startsWith("..")) return;
  const header = headerForFile(filePath);
  if (!header) return;
  const ext = path.extname(filePath);
  const base = path.basename(filePath);
  if (!EXTENSIONS.has(ext) && base !== "Dockerfile" && !base.startsWith("Dockerfile.")) {
    return;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const next = prependToContent(raw, header, filePath);
  if (next !== raw) {
    fs.writeFileSync(filePath, next, "utf8");
    console.log("updated", rel);
  }
}

function main() {
  for (const filePath of walkFiles(ROOT)) {
    processFile(filePath);
  }
}

main();
