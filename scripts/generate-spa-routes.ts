/**
 * Post-build script: generates per-lesson index.html files so the static host
 * resolves deep links like /learn/<id> to a real file.
 *
 * For each lesson ID in the curriculum tree, copies dist/index.html to
 * dist/learn/<id>/index.html. The copied file is byte-identical to the root
 * entry point, so React Router handles the route once JS loads.
 *
 * Run after `vite build`:
 *   node --import tsx/esm scripts/generate-spa-routes.ts
 */

import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const distDir = join(projectRoot, 'dist');

const treePath = join(distDir, 'data', 'curriculum-tree.json');
const tree = JSON.parse(readFileSync(treePath, 'utf-8'));

const lessonIds: string[] = tree.orderedLessonIds;
const indexPath = join(distDir, 'index.html');

for (const id of lessonIds) {
  const dir = join(distDir, 'learn', id);
  mkdirSync(dir, { recursive: true });
  cpSync(indexPath, join(dir, 'index.html'));
}

console.log(`Generated ${lessonIds.length} route files → dist/learn/<id>/index.html`);
