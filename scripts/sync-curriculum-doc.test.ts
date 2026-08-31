import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const scriptPath = resolve(import.meta.dirname, 'sync-curriculum-doc.ts');

describe('curriculum doc sync', () => {
  it('should report the master doc in sync with ordering.ts and lesson author-notes', () => {
    // `--check` exits non-zero when the generated fields (status, source links,
    // broadcast C/A/G) drift from the code side, which surfaces here as a throw.
    const runCheck = () =>
      execFileSync('tsx', [scriptPath, '--check'], { encoding: 'utf8', stdio: 'pipe' });

    expect(runCheck).not.toThrow();
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
