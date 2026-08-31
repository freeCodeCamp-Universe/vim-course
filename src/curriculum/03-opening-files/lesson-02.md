---
id: 6a75e416116f97fc366586c8
type: learn
title: "Opening a file that doesn't exist"
---

# --author-notes--

## CAG

**Concept:**

- Opening a filename that doesn't exist creates a new, empty buffer under that name instead of producing an error, as if starting a fresh file from scratch — there's just nothing on disk yet to load into it.

- A typo in a filename looks identical to a genuinely new file, which is why guessing without knowing exactly what's in a directory is risky.

**Activity:**
Starting from `colon.md` already open, open `Colon.md` and see the empty buffer it produces.

**Goal:**
The learner sees exactly what happens when Vim opens a nonexistent path, motivating the next lesson's directory browsing.

## Notes

<!-- Some other notes -->

# --instructions--

One common confusion is that, by default, Vim searches for files using case-sensitive matching. That means `colon.md` and `Colon.md` are treated as two different files.

If you point Vim at a filename that doesn't exist, Vim opens a new empty buffer with a `[New]` indicator at the bottom status bar. This new file will not be created on your system unless you save it with `:w`.

---

Try opening `Colon.md`.

# --files--

## colon.md

````md
In `ex`, launching the editor (for example, typing `ex file.txt`) didn't display the file's contents. Instead, the terminal printed a brief file status line followed by a colon (`:`) prompt. For example:

```
"file.txt" 14 lines, 342 characters
:
```

`vi` began as a visual mode built directly into `ex`, so it carried that colon prompt over as its own command-line mode.

As an expansion of `vi`, Vim kept the colon prompt as the standard entry into command-line mode, preserving its connection to `ex` decades later.
````

## exclamation-point.md

```md
Like the colon, the exclamation point (`!`) also comes from `ex`, where it's used after certain commands to force them through, overriding a safety check.

Before `ex`, the standard Unix editor was `ed`, written by Ken Thompson in 1969. `ed` was famously terse: if you tried to quit without saving, it refused and printed a single `?`. To quit anyway, you used a separate `Q` command, which skipped the unsaved-changes check.

Outside of computing, the exclamation point has always served that same purpose in written language: it signals emphasis, urgency, and a forceful command. Both `ex`'s `!` and `ed`'s `Q` borrow that sense of "do this anyway."

Vim carried the `!` forward. `:q!` forces a quit past the same protection `ed` and `ex` had.
```

## letters/G.md

```md
The `G` command in Vim traces back to the 1970s Unix editor `ex`, created by Bill Joy. The command jumps to a line: `10G` goes to line 10, while `G` alone goes to the end of the file.

The name likely comes from "Go to," echoing the GOTO statement in early languages like BASIC and Fortran. The default behavior — jumping to the end when no line number is given — made sense for a line editor where appending code at the bottom was common work.

When Vim released in 1991, it kept this behavior for compatibility with `vi`, cementing `G` as the standard way to reach the end of a file.
```

# --config--

```json
{
  "start": "splash",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Open `Colon.md`.",
      "hint": "You should can use `:e Colon.md` to open the file.",
      "test": { "open": "Colon.md" }
    }
  ]
}
```
