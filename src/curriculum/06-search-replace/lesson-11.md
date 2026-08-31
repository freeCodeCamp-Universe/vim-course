---
id: 6a75e416116f97fc366586e2
type: learn
title: 'Batch replacing across files with `:cdo`'
---

# --author-notes--

## CAG

**Concept:**

- `:cdo {cmd}` runs a command on every entry in the quickfix list, applying a change to all matches at once.

**Activity:**
Run `:vimgrep /fork/ *.md` to collect all occurrences of `fork`, then use `:cdo s/fork/pipe/g | update` to replace and save every instance across all files in one command.

**Goal:**
The learner batch-fixes a consistent error across multiple files using `:cdo`, seeing how it replaces the manual `:cnext`/`:cprev` loop from the previous lesson.

## Notes

<!-- Some other notes -->

# --instructions--

In the previous lessons, you navigated the quickfix list entry by entry and file by file. That works, but it's repetitive when all the changes follow the same pattern.

The `:cdo` command can automate that loop. It runs a command on each quickfix entry, one after another:

```
:cdo {command}
```

You can chain commands with `|`. One of the most common patterns for a batch replace is:

```vim
:cdo s/old/new/g | update
```

Here:

- `s/old/new/g` replaces `old` with `new` on the line containing the match.
- `update` saves the file if it was changed.
- `:cdo` repeats these commands for every item in the quickfix list.

Note that `:cdo` requires the quickfix list to be populated first, meaning you need to run `:vimgrep` before it. Without a populated quickfix list, `:cdo` will return an `E42: No Errors` message.

---

You've already seen the term "fork" sprinkled throughout the files.

Run `:vimgrep` to collect all occurrences of `fork`.

Then, use `:cdo {command} | update` to replace all occurrences of `fork` with `pipe`.

To confirm that you've fixed all instances, you can run `:vimgrep` again to see if any matches remain. Vim should show an `E480: No match` message for `fork`.

# --files--

## text-processing-1.md

```markdown
In the 1970s, the PDP-11 memory constraints were 64 KB max, meaning it could only load a file smaller than 64 KB. At the time, the standard editor, `ed`, included a search functionality, but required loading files into memory. The size constraint was an obstacle as users couldn't open large datasets and run searches on the computer.

To solve this, Ken Thompson extracted the search logic from `ed` into a standalone tool called `grep`, named after `ed`'s internal command sequence `g/re/p` (global / regular expression / print). The key difference was how each program handled files: `ed` loaded the entire file into memory before doing anything, while `grep` streamed through the file line by line, printing matches as it went. This meant `grep` could search files far larger than the PDP-11's memory ceiling.

As a standalone utility, `grep` could be scripted and chained with other Unix commands. Users could fork `grep` into other programs, letting them build more complex workflows.
```

## text-processing-2.md

```markdown
`sed` (Stream Editor) was created in 1974 by Lee E. McMahon, evolving directly from `grep` and `ed`.

While `grep` could only find patterns, McMahon needed a tool to modify text streams on the fly without opening files manually. To achieve this, he combined `grep`'s powerful regular expression engine with `ed`'s editing commands, such as substitution (`s/old/new/`).

This evolution allowed users to fork the output of `grep` into `sed` to search and instantly modify large text streams sequentially.
```

## text-processing-3.md

```markdown
`awk` was created in 1977 by Alfred Aho, Peter Weinberger, and Brian Kernighan, with the name coming from the initials of its creators' last names. `awk` was designed to overcome the structural limitations of both `grep` and `sed`.

While `sed` was excellent for line-by-line substitutions, it struggled with complex logic, math, and columnar data formatting. To solve this, the authors designed `awk` as a full programming language that incorporated `grep`'s pattern matching and `sed`'s stream processing. Like `grep` and `sed`, `awk` is a highly composable tool, allowing data to fork in and out from other utilities.

By introducing variables, loops, arithmetic, and associative arrays, `awk` elevated text processing from simple editing into a sophisticated data extraction and reporting system.
```

## text-processing-4.md

```markdown
`grep`, `sed`, and `awk` are commonly referred to as the Unix trinity in the developer community because they form a complete text-processing pipeline.

The power of this combination relies entirely on the fork (`|`). Doug McIlroy envisioned this concept in 1964, describing the idea as "coupling programs like garden hose -- screw in another segment when it becomes necessary to massage data in another way."

Ken Thompson implemented forks in Version 3 Unix around 1972-1973, with the symbol `|` replacing an earlier notation. Instead of having to save data to temporary files, users can pass the standard output of one program into the standard input of the next. Each tool remains simple, while the overall system achieves high complexity through creative composition.
```

## text-processing-5.md

````markdown
This demonstrates piping data through `grep`, `sed`, and `awk`.

Given the following text (saved as `tools.txt`):

```
grep 1974 Search for lines matching a pattern
sed 1974 Edit text streams using substitution rules
awk 1977 Extract and format data by column
sort 1971 Sort lines alphabetically or numerically
wc 1971 Count lines, words, or characters
cut 1982 Extract specific fields from each line
tr 1971 Translate or delete individual characters
```

Running:

```
grep "1971" tools.txt | sed 's/ 1971//' | awk '{$1=$1":"; print}'
```

Will filter the stream to tools introduced in 1971, strip the year, and reformat each line as a labeled entry:

```
sort: Sort lines alphabetically or numerically
wc: Count lines, words, or characters
tr: Translate or delete individual characters
```

Each stage reshapes the stream:

- `grep "1971"` keeps only lines that contain the year 1971, discarding the rest.
- `sed 's/ 1971//'` removes the year from each surviving line.
- `awk '{$1=$1":"; print}'` appends a colon to the tool name and prints the full line.
````

# --expected--

## text-processing-1.md

```markdown
In the 1970s, the PDP-11 memory constraints were 64 KB max, meaning it could only load a file smaller than 64 KB. At the time, the standard editor, `ed`, included a search functionality, but required loading files into memory. The size constraint was an obstacle as users couldn't open large datasets and run searches on the computer.

To solve this, Ken Thompson extracted the search logic from `ed` into a standalone tool called `grep`, named after `ed`'s internal command sequence `g/re/p` (global / regular expression / print). The key difference was how each program handled files: `ed` loaded the entire file into memory before doing anything, while `grep` streamed through the file line by line, printing matches as it went. This meant `grep` could search files far larger than the PDP-11's memory ceiling.

As a standalone utility, `grep` could be scripted and chained with other Unix commands. Users could pipe `grep` into other programs, letting them build more complex workflows.
```

## text-processing-2.md

```markdown
`sed` (Stream Editor) was created in 1974 by Lee E. McMahon, evolving directly from `grep` and `ed`.

While `grep` could only find patterns, McMahon needed a tool to modify text streams on the fly without opening files manually. To achieve this, he combined `grep`'s powerful regular expression engine with `ed`'s editing commands, such as substitution (`s/old/new/`).

This evolution allowed users to pipe the output of `grep` into `sed` to search and instantly modify large text streams sequentially.
```

## text-processing-3.md

```markdown
`awk` was created in 1977 by Alfred Aho, Peter Weinberger, and Brian Kernighan, with the name coming from the initials of its creators' last names. `awk` was designed to overcome the structural limitations of both `grep` and `sed`.

While `sed` was excellent for line-by-line substitutions, it struggled with complex logic, math, and columnar data formatting. To solve this, the authors designed `awk` as a full programming language that incorporated `grep`'s pattern matching and `sed`'s stream processing. Like `grep` and `sed`, `awk` is a highly composable tool, allowing data to pipe in and out from other utilities.

By introducing variables, loops, arithmetic, and associative arrays, `awk` elevated text processing from simple editing into a sophisticated data extraction and reporting system.
```

## text-processing-4.md

```markdown
`grep`, `sed`, and `awk` are commonly referred to as the Unix trinity in the developer community because they form a complete text-processing pipeline.

The power of this combination relies entirely on the pipe (`|`). Doug McIlroy envisioned this concept in 1964, describing the idea as "coupling programs like garden hose -- screw in another segment when it becomes necessary to massage data in another way."

Ken Thompson implemented pipes in Version 3 Unix around 1972-1973, with the symbol `|` replacing an earlier notation. Instead of having to save data to temporary files, users can pass the standard output of one program into the standard input of the next. Each tool remains simple, while the overall system achieves high complexity through creative composition.
```

# --config--

```json
{
  "start": "splash",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Search for `fork` across all files with `:vimgrep`.",
      "hint": "You can run `:vimgrep fork *.md`.",
      "test": {
        "anyOfCommands": [":vimgrep /fork/ *.md", ":vimgrep fork *.md"],
        "quickfix": { "count": 5, "contains": "fork" }
      }
    },
    {
      "label": "Replace all `fork` occurrences with `pipe` at once using `:cdo`.",
      "hint": "You should run `:cdo s/fork/pipe/g | update`.",
      "test": { "anyOfCommands": [":cdo s/fork/pipe/g | update", ":cdo s/fork/pipe/gi | update"] }
    },
    {
      "label": "`text-processing-1.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "test": { "file": "text-processing-1.md", "equalsExpected": true, "matchAgainstSaved": true }
    },
    {
      "label": "`text-processing-2.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "test": { "file": "text-processing-2.md", "equalsExpected": true, "matchAgainstSaved": true }
    },
    {
      "label": "`text-processing-3.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "test": { "file": "text-processing-3.md", "equalsExpected": true, "matchAgainstSaved": true }
    },
    {
      "label": "`text-processing-4.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "test": { "file": "text-processing-4.md", "equalsExpected": true, "matchAgainstSaved": true }
    }
  ]
}
```
