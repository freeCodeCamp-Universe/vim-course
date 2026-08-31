---
id: 6a75e416116f97fc366586c9
type: learn
title: 'Browsing to find the right file'
---

# --author-notes--

## CAG

**Concept:**

- `:Explore` opens a read-only directory listing inside the editor.

- `:Explore` must be capitalized. Vim requires user-defined commands like this one to start with an uppercase letter, so `:explore` doesn't exist at all and errors instead.
- The listing reuses ordinary movement keys — `j`/`k` move the selection down/up, no new motion commands to learn.
- Pressing <kbd>Enter</kbd> on a highlighted entry opens that file, the same result as typing `:e <filename>` yourself.

**Activity:**
From the empty `exclamation.md` buffer (recap of last lesson's mistaken guess), open the directory listing with `:Explore`, move to `exclamation-point.md` with `j`/`k`, and open it with <kbd>Enter</kbd>. Then browse into the `letters` subdirectory and open `G.md`.

**Goal:**
The learner finds and opens files whose exact names or locations they didn't already know, instead of guessing at `:e`.

## Notes

<!-- Some other notes -->

# --instructions--

There are some additional files available for this lesson. Let's browse them.

You can use the `:Explore` command, which opens a listing of the files and subdirectories in the current directory. Note that `:Explore` must be capitalized, and since this is a command-line mode command, you need to press <kbd>Enter</kbd> after typing it.

Once the listing is open, you can move through it using the <kbd>Up</kbd>/<kbd>Down</kbd> arrow keys or <kbd>k</kbd>/<kbd>j</kbd> to move the selection up and down, then press <kbd>Enter</kbd> to open the file.

---

Vim has already started. Use `:Explore` to open the directory listing, then select and open:

- `exclamation-point.md`
- `G.md`, which is located in the `letters` subdirectory.

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
      "label": "Browse the directory with `:Explore`.",
      "hint": "You should type `:Explore` and press <kbd>Enter</kbd>.",
      "test": { "command": ":Explore" }
    },
    {
      "label": "Open the `exclamation-point.md` file.",
      "hint": "You should use the <kbd>Up</kbd>/<kbd>Down</kbd> arrow keys or <kbd>k</kbd>/<kbd>j</kbd> to select `exclamation-point.md`. Be sure to press <kbd>Enter</kbd> to open the file.",
      "test": { "open": "exclamation-point.md" }
    },
    {
      "label": "Open the `G.md` file in the `letters` subdirectory.",
      "hint": "You should use the <kbd>Up</kbd>/<kbd>Down</kbd> arrow keys or <kbd>k</kbd>/<kbd>j</kbd> to select the `letters` subdirectory, press <kbd>Enter</kbd>, then select `G.md` and press <kbd>Enter</kbd> again.",
      "evaluateWhen": { "fileOpen": "letters/G.md" },
      "test": { "open": "letters/G.md" }
    }
  ]
}
```
