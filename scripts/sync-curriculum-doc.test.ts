import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const scriptPath = resolve(import.meta.dirname, 'sync-curriculum-doc.ts');
const lessonPath = resolve(import.meta.dirname, '../src/curriculum/01-modes/lesson-05.md');
const docPath = resolve(import.meta.dirname, '../docs/curriculum/curriculum-outline.md');

describe('curriculum doc sync', () => {
  it('should report the master doc in sync with ordering.ts and lesson author-notes', () => {
    // `--check` exits non-zero when generated fields (including lesson headings,
    // status, source links, and broadcast C/A/G) drift from the code side.
    const runCheck = () =>
      execFileSync('tsx', [scriptPath, '--check'], { encoding: 'utf8', stdio: 'pipe' });

    expect(runCheck).not.toThrow();
  });

  it('should sync a lesson heading title from frontmatter', () => {
    const lessonTitle = /^title:\s*['"](.+)['"]$/m.exec(readFileSync(lessonPath, 'utf8'))?.[1];
    const docTitle = /^#### 5\.\s+\*\*(.*?)\*\*/m.exec(readFileSync(docPath, 'utf8'))?.[1];

    expect(lessonTitle).toBe('The `a` and `A` commands');
    expect(docTitle).toBe(lessonTitle);
  });

  it('should accept an explicit curriculum source', () => {
    const runCheck = () =>
      execFileSync('tsx', [scriptPath, '--source=curriculum', '--check'], {
        encoding: 'utf8',
        stdio: 'pipe',
      });

    expect(runCheck).not.toThrow();
  });

  it('should reject an unknown source', () => {
    const runCheck = () =>
      execFileSync('tsx', [scriptPath, '--source=unknown', '--check'], {
        encoding: 'utf8',
        stdio: 'pipe',
      });

    expect(runCheck).toThrow();
  });
});
