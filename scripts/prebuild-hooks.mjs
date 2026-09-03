/**
 * Node.js module hooks for the prebuild script (build-lesson-data.ts).
 *
 * Two problems prevent importing src/curriculum/loader.ts in a plain tsx/Node
 * context:
 *
 * 1. `const SHOW_UPCOMING_LESSONS = import.meta.env.SHOW_UPCOMING_LESSONS === 'true'` —
 *    Vite-specific API. `import.meta.env` is undefined in Node, so this throws at
 *    module load time.
 *
 * 2. `const markdownModules = normalizeMarkdownModules(import.meta.glob(...))` —
 *    Vite-specific API called at module scope. Node.js has `import.meta` but not
 *    `import.meta.glob`, so calling it throws at load time.
 *
 * This file registers a load hook that patches both after tsx compiles loader.ts:
 *   - Replaces `import.meta.env` with `process.env` so env var reads fall through
 *     to the Node.js process environment (SHOW_UPCOMING_LESSONS, DEV, etc.).
 *   - Replaces the `import.meta.glob(...)` call with `{}` so the module initialises
 *     without error. buildCurriculum() receives its markdownByPath map as an argument
 *     and never reads the module-level `markdownModules`, so the empty replacement is safe.
 *
 * Usage: node --import tsx/esm --import ./scripts/prebuild-register.mjs scripts/build-lesson-data.ts
 */

export async function load(url, context, next) {
  const result = await next(url, context);

  if (url.includes('/src/curriculum/loader') && result.source != null) {
    const raw =
      typeof result.source === 'string'
        ? result.source
        : Buffer.from(result.source).toString('utf-8');

    // Replace import.meta.env with process.env so Vite env reads work in Node.
    const patched1 = raw.replace(/import\.meta\.env/g, 'process.env');
    // Replace the import.meta.glob(...) call with an empty object so the module
    // loads without error. buildCurriculum() ignores the module-level variable.
    const patched2 = patched1.replace(/import\.meta\.glob\([\s\S]*?\)/g, '{}');

    return { ...result, source: patched2 };
  }

  return result;
}
