---
id: 6a75e416116f97fc366586c7
type: learn
title: 'Opening a known file'
---

# --author-notes--

## CAG

**Concept:**

- Recap: a known file can be opened with `vim <filename>` from the shell or with `:e <filename>` from inside a running Vim session (module 01).

- `ex`'s colon prompt is where that syntax comes from, and it's still the gateway into Vim's command-line mode today.
- `Ctrl-g` reports which file is currently open, without changing anything or requiring Enter — useful once several files have been opened in the same session.

**Activity:**
Open `colon.md` either by launching Vim with `vim colon.md` or by starting Vim and using `:e colon.md`, then press <kbd>Ctrl</kbd> + <kbd>g</kbd> to see which file is open.

**Goal:**
The learner refreshes both ways to open a known file, picks up where the colon prompt itself comes from, and learns how to check which file they're on.

## Notes

<!-- Some other notes -->

# --instructions--

This lesson is a refresher on opening a file that you already know exists.

You can open the file either by using `vim <filename>` from the command line, or by starting Vim first and then using the `:e <filename>` command.

By default, Vim hides the file name to maximize screen space. To check which file is currently open, you can press <kbd>Ctrl</kbd> + <kbd>g</kbd> (Linux/Windows) or <kbd>Control</kbd> + <kbd>g</kbd> (Mac). This isn't a command-line mode command, so it doesn't require pressing Enter. Vim will display the file name and the cursor position in the status bar at the bottom.

---

Open the `colon.md` file.

Once it's open, use <kbd>Ctrl</kbd> + <kbd>g</kbd> to see the file name.

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
  "start": "shell",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Open `colon.md`.",
      "hint": "You can type `vim colon.md` in the terminal, or start Vim and use `:e colon.md`.",
      "evaluateWhen": { "fileOpen": "colon.md" },
      "test": { "open": "colon.md" }
    },
    {
      "label": "Check which file is open.",
      "hint": "You should press <kbd>Ctrl</kbd> + <kbd>g</kbd> to report the open file.",
      "test": { "command": "Ctrl-g" }
    }
  ]
}
```
