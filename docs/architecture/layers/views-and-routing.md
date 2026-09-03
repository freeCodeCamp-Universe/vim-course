# Views and Routing

The app uses React Router to navigate between two main pages: home and lessons. The router is wrapped in a shared layout that holds app-level chrome (header, nav drawer, modals).

## Routing structure

`App.tsx` defines two routes:

- `/` — `HomePage` — displays the course home page with progress and lesson list.
- `/learn/:lessonId` — `LessonRoute` — loads and displays a lesson.

```tsx
<BrowserRouter>
  <CourseLayout>  {/* shared chrome: header, overlays */}
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/learn/:lessonId" element={<LessonRoute />} />
    </Routes>
  </CourseLayout>
</BrowserRouter>
```

## Lazy loading lesson data

`LessonRoute` loads lesson JSON dynamically via `useLessonData(lessonId)`. This hook:

1. Fetches `public/data/lessons/{lessonId}.{hash}.json` (built by the lesson-data prebuild)
2. Caches the result in memory
3. Returns `{ data, loading, error }`

While loading, it renders a loading state. If the fetch fails, it shows "Lesson not found."

Once data arrives, it passes the lesson to `LessonPage`.

## Shared layout

`CourseLayout` is the root wrapper. It contains:

- **Header** — title, theme toggle, keyboard hints
- **Overlays** — nav drawer, shortcuts modal, settings modal (managed by `courseChrome` pub/sub store)
- **Main content slot** — pages render here via React Router

Because `courseChrome` is a module-level store (not React Context), the overlays work across route changes without prop-drilling.

## Key views

| Component | Role |
|---|---|
| `HomePage` | Home page with progress bar, course tree, and continue button. Fetches curriculum tree via `useCurriculumTree()`. |
| `LessonRoute` | Data loader. Fetches lesson JSON, handles loading/error states, passes data to `LessonPage`. |
| `LessonPage` | Lesson page wrapper. Owns the instructions pane, terminal, checklist, and nav buttons. |
| `LessonWorkspace` | The lesson workspace (terminal + checklist). Orchestrates engine dispatch, progress tracking, and checklist evaluation. |

## Navigation

Programmatic navigation uses React Router's `useNavigate()`. The `next` button and keyboard shortcuts (`Alt+N`, `Alt+P`) navigate using `navigate('/learn/:lessonId')`.

Progress (checklist completion) is persisted to `localStorage` before navigation, so the browser back button or a reload preserves state.
