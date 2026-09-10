---
id: 6a75e416116f97fc366586eb
type: review
title: 'Command reference'
---

# --author-notes--

## CAG

**Concept:**
None new — a read-only reference of the full committed command set, organized by category (modes, motion, editing, visual, search, counts/text objects, quitting).

**Activity:**
None (read-only).

**Goal:**
The learner has a single page to return to going into the escape room, and after.

## Notes

<!-- Some other notes -->

# --instructions--

You've reached the end of the course.

There is a capstone project that will test your ability to apply what you've learned in a practical scenario.

This lesson provides a reference of all the commands taught in this course. You can use this as a cheatsheet for the the capstone project, and as a reference for future use.

## Starting Vim and entering insert mode

| Command          | Description                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `vim`            | Launch the editor from the terminal.                                 |
| `:e <filename>`  | Open a file from inside Vim.                                         |
| `vim <filename>` | Open a specific file directly.                                       |
| `i`              | Enter insert mode and place the cursor before the current character. |
| `a`              | Enter insert mode and place the cursor after the current character.  |
| `A`              | Enter insert mode and place the cursor at the end of the line.       |
| `o`              | Open a new line below the current line and enter insert mode.        |
| `O`              | Open a new line above the current line and enter insert mode.        |
| `Esc`            | Return to normal mode.                                               |
| `:w`             | Save.                                                                |
| `:q`             | Quit.                                                                |
| `:q!`            | Quit without saving.                                                 |
| `:wq`            | Save and quit together.                                              |

## Navigation

| Command | Description                                                     |
| ------- | --------------------------------------------------------------- |
| `h`     | Move left.                                                      |
| `j`     | Move down.                                                      |
| `k`     | Move up.                                                        |
| `l`     | Move right.                                                     |
| `w`     | Jump to the start of the next word.                             |
| `b`     | Jump to the start of the previous word.                         |
| `0`     | Jump to the start of the line.                                  |
| `$`     | Jump to the end of the line.                                    |
| `gg`    | Jump to the first line of the file.                             |
| `G`     | Jump to the last line of the file. Note: `G` must be uppercase. |
| `{n}G`  | Jump to line `{n}`. Note: `G` must be uppercase.                |

## Opening files

| Command         | Description                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `:e <filename>` | Open a file by name. If the file doesn't exist, open a new empty buffer; the new file is not saved unless you explicitly save it with `:w`. |
| `:Explore`      | Open a read-only directory listing. Note: `:Explore` must be capitalized.                                                                   |
| `Ctrl-g`        | Report the name of the currently open file and the cursor position in the status bar.                                                       |

## Editing

| Command  | Description                                                                 |
| -------- | --------------------------------------------------------------------------- |
| `x`      | Delete the character under the cursor.                                      |
| `r`      | Replace the character under the cursor with the next key pressed.           |
| `dw`     | Delete from the cursor to the start of the next word.                       |
| `dd`     | Delete the entire current line.                                             |
| `D`      | Delete from the cursor to the end of the line. Note: `D` must be uppercase. |
| `yy`     | Yank (copy) the current line.                                               |
| `p`      | Paste the yanked or deleted text after the cursor or current line.          |
| `u`      | Undo the last change.                                                       |
| `Ctrl-r` | Redo a change you just undid.                                               |
| `cw`     | Delete a word and enter insert mode to type its replacement.                |
| `cc`     | Delete the current line and enter insert mode to type its replacement.      |

## Visual mode

| Command | Description                                                           |
| ------- | --------------------------------------------------------------------- |
| `v`     | Start character-wise visual mode.                                     |
| `V`     | Start line-wise visual mode.                                          |
| `~`     | Toggle the case of the selected text.                                 |
| `d`     | Cut the selected text.                                                |
| `y`     | Yank (copy) the selected text.                                        |
| `c`     | Delete the selected text and enter insert mode to type a replacement. |

## Search and replace in a single file

### Jumping to matching delimiters

| Command | Description                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------------- |
| `%`     | Jump to the matching bracket `[]`, parenthesis `()`, or brace `{}`.                                         |
| `d%`    | Delete from the cursor through the matching delimiter, including the delimiters themselves.                 |
| `c%`    | Delete the text from the cursor through the matching delimiter, then enter insert mode.                     |
| `v%`    | Enter visual mode and select text from the cursor through the matching delimiter, including the delimiters. |

### Finding text

| Command         | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| `/pattern`      | Search for a pattern and jump to the first match.                    |
| `/pattern\c`    | Search for a pattern case-insensitively and jump to the first match. |
| `n` (lowercase) | Jump to the next match.                                              |
| `N` (uppercase) | Jump to the previous match.                                          |

### Replacing on the current line

| Command        | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `:s/old/new/`  | Replace the first occurrence of `old` with `new` on the line.         |
| `:s/old/new/g` | Replace all occurrences of `old` with `new` on the line.              |
| `:s/old/new/i` | Replace the first occurrence of `old` with `new`, case-insensitively. |

### Replacing in the entire file

| Command           | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `:%s/old/new/`    | Replace the first occurrence of `old` with `new` on every line in the file. |
| `:%s/old/new/g`   | Replace all occurrences of `old` with `new` in the entire file.             |
| `:%s/pattern//gn` | Count all matches of `pattern` in the file without making changes.          |

### Copy and paste helpers

| Command                 | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `yl`                    | Yank the character under the cursor into the unnamed register.    |
| `Ctrl-r` (command line) | Paste the contents of the unnamed register into the command line. |

## Search and replace in multiple files

### Searching across files

| Command                  | Description                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| `:vimgrep pattern files` | Search for `pattern` across `files` and load all matches into the quickfix list. |

### Navigating search results

| Command          | Description                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `:cnext` (`:cn`) | Jump to the next entry in the quickfix list.                                                                                              |
| `:cprev` (`:cp`) | Jump to the previous entry in the quickfix list.                                                                                          |
| `:clist` (`:cl`) | Display all entries in the quickfix list.                                                                                                 |
| `:cc {number}`   | Jump to a specific entry in the quickfix list by its number.                                                                              |
| `:cdo {command}` | Run a command on every entry in the quickfix list.<br/><br/>Note: `:cdo` requires the quickfix list to be populated first via `:vimgrep`. |
