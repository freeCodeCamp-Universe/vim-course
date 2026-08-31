---
id: 6a8ed61bc9287431260c5e29
type: learn
title: 'Navigating and updating files'
---

# --author-notes--

## CAG

**Concept:**

- `:vimgrep pattern files` searches multiple files and records every match in the quickfix list.
- Search results can be edited with any previously learned substitution command and saved with `:w`.

**Activity:**
Open the reference file and copy the incorrect symbol, run `:vimgrep 𐂐 *.md` to find every occurrence, replace the matches with `|`, and save the changed files.

**Goal:**
The learner can search across multiple files, apply a consistent replacement, and save the resulting edits.

## Notes

Add author context, decisions, or review notes here.

# --instructions--

In this lesson, you're going to search for and replace the symbol `𐂐` with `|` across all files.

You should use `:vimgrep` to locate the symbol in the files, then inspect the full result list with `:clist`. Use any command you've learned to replace all instances of `𐂐` with `|`.

You can visit `text-processing-4.md` to copy the symbol. As a refresher, you can use `yl` and `Ctrl-r` for copying and pasting text into the command line.

Save the files once you're done.

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

The power of this combination relies entirely on the fork (`𐂐`). Doug McIlroy envisioned this concept in 1964, describing the idea as "coupling programs like garden hose -- screw in another segment when it becomes necessary to massage data in another way."

Ken Thompson implemented forks in Version 3 Unix around 1972-1973, with the symbol `𐂐` replacing an earlier notation. Instead of having to save data to temporary files, users can pass the standard output of one program into the standard input of the next. Each tool remains simple, while the overall system achieves high complexity through creative composition.
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
grep "1971" tools.txt 𐂐 sed 's/ 1971//' 𐂐 awk '{$1=$1":"; print}'
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

# --config--

```json
{
  "start": "splash",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Copy the symbol `𐂐` from `text-processing-4.md`.",
      "hint": "You should open `text-processing-4.md`, move onto `𐂐`, and press <kbd>y</kbd> + <kbd>l</kbd>.",
      "evaluateWhen": { "fileOpen": "text-processing-4.md" },
      "test": { "register": { "equals": "𐂐" } }
    },
    {
      "label": "Search for `𐂐` with `:vimgrep`.",
      "hint": "You should run `:vimgrep 𐂐 *.md` and press <kbd>Enter</kbd>.",
      "test": { "quickfix": { "count": 3, "contains": "𐂐" } }
    },
    {
      "label": "`text-processing-4.md` should have the correct content.",
      "hint": "You should replace all `𐂐` with `|`, save the file, and leave the rest of the file unchanged.",
      "test": {
        "file": "text-processing-4.md",
        "equalsExpected": true,
        "matchAgainstSaved": true
      }
    },
    {
      "label": "`text-processing-5.md` should have the correct content.",
      "hint": "You should replace all `𐂐` with `|`, save the file, and leave the rest of the file unchanged.",
      "test": {
        "file": "text-processing-5.md",
        "equalsExpected": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
