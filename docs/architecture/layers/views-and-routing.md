# Views and Routing

The app uses Wouter to navigate between two main pages: home and lessons. The shared layout holds app-level chrome (header, nav drawer, modals).

## Routing structure

`App.tsx` defines two routes:

- `/` renders `HomePage`, the course home page with progress and lesson list.
- `/learn/:lessonId` renders `LessonRoute`, which loads and displays a lesson.

```tsx
<CourseLayout>  {/* shared chrome: header, overlays */}
  <Switch>
    <Route path="/" component={HomePage} />
    <Route path="/learn/:lessonId" component={LessonRoute} />
  </Switch>
</CourseLayout>
```

## Lesson data loading and prefetching

`LessonRoute` loads lesson JSON dynamically via `useLessonData(lessonId)` (`src/hooks/useLessonData.ts`). The hook returns `{ data, loading, error }` and combines in-memory caching with prefetching so sequential navigation is instant.

### Data files

Each lesson is a static JSON file at `/data/lessons/{lessonId}.{contentHash}.json`, produced at build time by `scripts/build-lesson-data.ts`. The 8-character content hash enables long-lived HTTP caching. Clients never construct these filenames directly; they look up the `dataFile` field for a lesson in the curriculum tree.

### Curriculum tree

`/data/curriculum-tree.json` is the module/lesson index. It provides two things the data-loading layer needs:

- **`modules[].lessons[].dataFile`**, the hashed filename for each lesson's JSON.
- **`orderedLessonIds`**, a flat array of every lesson ID in course order, used to determine which lesson to prefetch next.

The tree is preloaded via `<link rel="preload">` in `index.html` and fetched eagerly at module-evaluation time in `useCurriculumTree.ts` (before React mounts). It is cached in a module-level variable for the lifetime of the JS bundle.

### In-memory cache

Two module-level `Map` objects in `useLessonData.ts`:

- **`cache`** (`Map<string, LessonData>`) stores resolved lesson data permanently (never evicted). A cache hit renders the lesson with no loading state.
- **`pending`** (`Map<string, Promise<LessonData>>`) deduplicates in-flight requests. If a fetch is already running for a lesson ID, callers get the same promise. On resolution the entry moves to `cache` and is removed from `pending`.

Because the app uses client-side routing, JS stays alive across navigations and the cache persists for the entire session.

### Prefetch strategy

The goal is that every sequential "next lesson" navigation is served from cache with no spinner. Prefetching happens in three places:

1. **Home page** (`src/views/Home.tsx`). Prefetches the user's "continue" lesson (the next incomplete one) on load, so the first lesson visited from home is instant.
2. **After every lesson change** (`useLessonData` effect). After the current lesson resolves or hits cache, the effect looks up the next ID in `orderedLessonIds` and calls `prefetchLesson()`. This runs on both fresh fetches and cache hits, so the chain continues across sequential navigation.
3. **`prefetchLesson()` export.** Any component can call it. It no-ops if the lesson is already cached or in-flight, looks up the `dataFile` from the curriculum tree, and starts the fetch.

### Loading flow (per lesson)

```
lessonId changes
  │
  ├─ tree not loaded yet → wait (effect re-runs when tree arrives)
  │
  ├─ cache hit → setData, setLoading(false)
  │                │
  │                └─ prefetch next lesson
  │
  └─ cache miss → setLoading(true), fetch lesson JSON
                    │
                    ├─ success → setData, setLoading(false)
                    │              │
                    │              └─ prefetch next lesson
                    │
                    └─ failure → setError(true)
```

### When a spinner still appears

A loading spinner shows when the lesson is not in cache at navigation time. Common cases:

- **First lesson of a session.** Nothing has been prefetched yet (unless the home page prefetch covered it).
- **Non-sequential navigation.** Jumping ahead by more than one lesson, or navigating backward. Only the immediate next lesson is prefetched.
- **Very fast navigation.** Advancing before the prefetch request completes (unlikely in practice; lesson JSONs are small).

## Shared layout

`CourseLayout` is the root wrapper. It contains:

- **Header.** Title, theme toggle, keyboard hints.
- **Overlays.** Nav drawer, shortcuts modal, settings modal (managed by the `courseChrome` pub/sub store).
- **Main content slot.** Pages render here via Wouter.

Because `courseChrome` is a module-level store (not React Context), the overlays work across route changes without prop-drilling. Wouter uses the browser location by default, so production does not need a router provider.

## Key views

| Component | Role |
|---|---|
| `HomePage` | Home page with progress bar, course tree, and continue button. Fetches curriculum tree via `useCurriculumTree()`. |
| `LessonRoute` | Data loader. Fetches lesson JSON, handles loading/error states, passes data to `LessonPage`. |
| `LessonPage` | Lesson page wrapper. Owns the instructions pane, terminal, checklist, and nav buttons. |
| `LessonWorkspace` | The lesson workspace (terminal + checklist). Orchestrates engine dispatch, progress tracking, and checklist evaluation. |

## Navigation

Programmatic navigation uses Wouter's `useLocation()`. The `next` button and keyboard shortcuts (`Alt+N`, `Alt+P`) navigate using its setter, `navigate('/learn/:lessonId')`.

Progress (checklist completion) is persisted to `localStorage` before navigation, so the browser back button or a reload preserves state.
