# UX Decisions

Rationale behind non-obvious UI and interaction design choices. Each entry records the
decision, the alternatives considered, and why the chosen approach wins.

---

## Curriculum drawer slides from the end edge

**Decision:** The curriculum/lesson-list drawer opens from the inline-end (right in LTR)
edge. The outline drawer opens from the inline-start (left in LTR) edge.

**Why:**

- **Spatial separation of concerns.** The left side of the lesson layout owns the current
  lesson's content: the instruction panel and the outline (in-document TOC). The curriculum
  browser is cross-document navigation. Placing it on the opposite edge makes the two
  categories visually and spatially distinct so users build a reliable mental map: "left =
  this lesson, right = the broader course."
- **Reduced confusion from competing drawers.** Two drawers sliding from the same edge
  force the user to remember which one they will get, adding cognitive load.
- **Mobile gesture safety.** A left-edge swipe is often claimed by the OS or browser for
  back-navigation. Putting the curriculum drawer on the right avoids that conflict.
- **End-edge drawers read as supplementary.** In LTR layouts, right-side panels feel
  secondary, which matches the curriculum browser's role: it supports the primary task
  (reading or practicing the lesson) rather than competing with it.

---

## Keyboard-only UI elements hidden on touch devices

**Decision:** Any element that is only meaningful to keyboard users (shortcut trigger
buttons, shortcut settings toggles, kbd hint chips, shortcut hint text) is hidden on
touch devices and shown only on pointer devices that support hover.

**Condition:**

```css
.keyboard-only {
  display: none;
}

@media (width >= 768px) and (hover: hover) {
  .keyboard-only {
    display: <appropriate display value>;
  }
}
```

**Why:**

- **`hover: hover`** excludes touchscreens (phones and tablets) regardless of screen size.
  Keyboard shortcuts are irrelevant on devices without a physical keyboard.
- **`width >= 768px`** prevents showing keyboard hints in very narrow pointer-device windows
  where the extra elements would crowd the interface.
- A width-only breakpoint would incorrectly show keyboard UI on large tablets.
