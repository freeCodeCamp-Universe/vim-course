---
id: 6a75e416116f97fc366586e3
type: review
title: 'Module review'
---

# --author-notes--

## CAG

**Concept:**
None new.

**Activity:**
Review.

**Goal:**
Review.

## Notes

<!-- Some other notes -->

# --instructions--

These are commands you've learned in this module.

## Single-file commands

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

## Multi-file commands

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
