---
id: 6a75e416116f97fc366586df
type: practice
title: 'Practice: Decrypting a message'
---

# --author-notes--

## CAG

**Concept:**
No new commands — applies `:%s/pattern//gn` from the previous lesson alongside `/`, `n`/`N`, `:s`, `:%s`, and `r` in one realistic editing task.

**Activity:**
Decrypt a ciphered message by choosing the right substitution tool for each cipher character based on how often it appears.

**Goal:**
The learner chooses the right substitution tool for each part of the task without being told which to use.

## Notes

<!-- Some other notes -->

# --instructions--

You've learned multiple ways to substitute text in Vim:

- `cw` deletes a word and enters insert mode.
- `r` replaces a single character.
- `:s` substitutes on the current line.
- `:%s` substitutes across the entire file.

In this lesson, you're going to practice the commands by decrypting a message.

---

In the provided file, each letter has been swapped with a cipher character:

| Cipher | Plaintext |
| :----: | :-------: |
|  `+`   |    `a`    |
|  `#`   |    `e`    |
|  `=`   |    `i`    |
|  `;`   |    `o`    |
|  `@`   |    `t`    |

You can use the global replacement command `:%s` at most three times. Use that budget on the characters that appear most often.

You might want to use `:%s/pattern//gn` to count how many times a pattern appears in the file to plan your substitution tools.

Decrypt the message and save the file when you're done.

# --files--

## message.md

```md
"Wh#n =n d;ub@, us# bru@# f;rc#." - K#n Th;mps;n

In s;f@w+r#, @h#r# =s +lw+ys + @#mp@+@=;n @; r#+ch f;r @h# m;s@ s;ph=s@=c+@#d s;lu@=;n.

Th;mps;n's rul#: s@+r@ w=@h @h# m;s@ d=r#c@, #xh+us@=v# +ppr;+ch #v#n =f =@ f##ls crud#. A w;rk=ng s;lu@=;n y;u c+n m#+sur# =s w;r@h m;r# @h+n + cl#v#r ;n# @h+@ s@=ll #x=s@s =n y;ur h#+d.
```

# --expected--

## message.md

```md
"When in doubt, use brute force." - Ken Thompson

In software, there is always a temptation to reach for the most sophisticated solution.

Thompson's rule: start with the most direct, exhaustive approach even if it feels crude. A working solution you can measure is worth more than a clever one that still exists in your head.
```

# --config--

```json
{
  "start": "file",
  "open": "message.md",
  "cursor": [1, 1],
  "commandLimits": { "/^:%s\\/.*\\/.*\\/(?!.*n)[gi]*$/": 3 },
  "checklist": [
    {
      "label": "Replace all `+` characters.",
      "hint": "You can use `:s/+/a/g` to replace all `+` characters with `a` on each line.",
      "test": {
        "file": "message.md",
        "absent": ["+"],
        "contains": ["a"]
      }
    },
    {
      "label": "Replace all `#` characters.",
      "hint": "You can use `:%s/#/e/g` to replace all `#` characters with `e`.",
      "test": {
        "file": "message.md",
        "absent": ["#"],
        "contains": ["e"]
      }
    },
    {
      "label": "Replace all `;` characters.",
      "hint": "You can use `:%s/;/o/g` to replace all `;` characters with `o`.",
      "test": {
        "file": "message.md",
        "absent": [";"],
        "contains": ["o"]
      }
    },
    {
      "label": "Replace all `@` characters.",
      "hint": "You can use `:%s/@/t/g` to replace all `@` characters with `t`.",
      "test": {
        "file": "message.md",
        "absent": ["@"],
        "contains": ["t"]
      }
    },
    {
      "label": "Replace all `=` characters.",
      "hint": "You can use `:s/=/i/g` to replace all `=` characters with `i`.",
      "test": {
        "file": "message.md",
        "absent": ["="],
        "contains": ["i"]
      }
    },
    {
      "label": "Save the file.",
      "hint": "You can use `:w` to save the file.",
      "test": { "file": "message.md", "saved": true }
    },
    {
      "label": "`message.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "message.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
