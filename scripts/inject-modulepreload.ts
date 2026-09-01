/**
 * Post-build script that injects `<link rel="modulepreload">` tags into the
 * built HTML pages. Astro does not emit modulepreload hints for `client:only`
 * islands, which creates a cascading request waterfall: the browser discovers
 * each dependency only after downloading and parsing its parent module.
 *
 * This script traces the static import graph of every JS module referenced by
 * `<astro-island>` elements and `<script type="module">` tags, then injects
 * preload hints so the browser fetches the full dependency tree in a single
 * parallel wave.
 *
 * Run after `astro build`: `pnpm build` calls this automatically.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const DIST = 'dist';

/** Extract static ES module imports from a built JS file. */
function getStaticImports(filePath: string): string[] {
  const code = readFileSync(filePath, 'utf-8');
  const imports: string[] = [];
  const regex = /from\s*"(\.\/[^"]+\.js)"/g;
  let match;
  while ((match = regex.exec(code))) {
    imports.push(match[1]);
  }
  return imports;
}

/** Recursively trace all transitive imports of a JS module URL. */
function traceImports(jsUrl: string, seen: Set<string>): void {
  if (seen.has(jsUrl)) {
    return;
  }
  seen.add(jsUrl);

  const filePath = join(DIST, jsUrl.replace(/^\//, ''));
  try {
    statSync(filePath);
  } catch {
    return;
  }

  const dir = dirname(jsUrl);
  for (const imp of getStaticImports(filePath)) {
    const resolved = imp.startsWith('./')
      ? `${dir}/${imp.slice(2)}`
      : imp;
    traceImports(resolved, seen);
  }
}

/** Collect all HTML files under a directory recursively. */
function collectHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const htmlFiles = collectHtmlFiles(DIST);
let totalInjected = 0;

for (const htmlFile of htmlFiles) {
  let html = readFileSync(htmlFile, 'utf-8');

  // Collect JS URLs from astro-island attributes and script[type=module] src.
  const entryUrls = new Set<string>();
  const islandRegex = /(component-url|renderer-url)="([^"]+)"/g;
  let match;
  while ((match = islandRegex.exec(html))) {
    entryUrls.add(match[2]);
  }
  const scriptRegex = /<script\s[^>]*type="module"[^>]*src="([^"]+)"/g;
  while ((match = scriptRegex.exec(html))) {
    entryUrls.add(match[1]);
  }

  if (entryUrls.size === 0) {
    continue;
  }

  // Trace the full import graph.
  const allModules = new Set<string>();
  for (const url of entryUrls) {
    traceImports(url, allModules);
  }

  // Build modulepreload tags for all discovered modules.
  const links = [...allModules]
    .sort()
    .map((url) => `<link rel="modulepreload" href="${url}">`)
    .join('\n    ');

  html = html.replace('</head>', `    ${links}\n  </head>`);
  writeFileSync(htmlFile, html);
  totalInjected += allModules.size;
}

const pageCount = htmlFiles.length;
const avgPerPage = pageCount > 0 ? Math.round(totalInjected / pageCount) : 0;
console.log(
  `Injected modulepreload hints: ${pageCount} pages, ${avgPerPage} modules/page`
);
