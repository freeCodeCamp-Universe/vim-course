---
id: 6a75e416116f97fc366586e4
type: practice
title: 'Practice: Completing a DNA strand'
---

# --author-notes--

## CAG

**Concept:**
None new — use `V`, `o`, `y`, and `p` to copy content between files, then complete a sequence.

**Activity:**
Copy the strand data from `strands.md` into `dna.md`, then use `guide.md` as reference to complete the incomplete Opposite Strand. When selecting multiple lines in `strands.md`, `o` lets the user swap to the top of the selection and trim if they overshoot.

**Goal:**
The learner copies content between files using visual mode and completes a real DNA sequence using a reference file.

## Notes

<!-- Some other notes -->

# --instructions--

In this lesson, you'll practice copying and pasting lines of text using the commands you've learned.

You're on `dna.md`.

Switch to `strands.md` and copy the entire content into `dna.md`.

Also, the Opposite Strand is incomplete. Use `guide.md` for reference and complete it.

Save the file when you're done.

# --files--

## dna.md

```md
Before 1977, scientists didn't use computers to analyze DNA because genetic fragments were often just 5 to 10 letters long, short enough for researchers to translate by hand. By 1977, scientists began sequencing complete viral genomes. Computers became essential as they could produce more data faster and more accurately.

The first ever DNA code processed completely by a computer was Phi X174, a bacteria-killing virus discovered in 1935 in Paris sewers, packing 5,386 letters. This virus has since become a standard research model, helping scientists understand how bacteriophages work and used to develop phage therapies that target antibiotic-resistant bacteria.

While harmless to humans, this virus is lethal to bacteria. To attack, it attaches to the outside of a bacterium and injects its single strand of DNA inside. The virus then forces the host bacterium to build a complementary DNA strand. This mirroring process is required for the virus to make copies of itself.

After creating this double-stranded DNA copy, the virus activates a specific "kill-switch" section called Gene E. This gene produces a protein that stops the bacterium's cell-wall production. A bacterium without a working cell wall cannot contain its own internal pressure. The cell expands until it eventually ruptures.

Below is a 30-letter snapshot of that "kill-switch" sequence:
```

## strands.md

```md
Virus Strand:

A T G G T A C G C T G G A C T T T G T G G G A T A C C C T C

Opposite Strand:

T A C C A T G C G A C C T G A A A C A C C
```

## guide.md

```md
Each nucleotide pairs with its complement:

A → T
T → A
G → C
C → G
```

# --config--

```json
{
  "start": "file",
  "open": "dna.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "`dna.md` should contain the Virus Strand.",
      "hint": "You can open `strands.md`, press <kbd>Shift</kbd> + <kbd>v</kbd> to start visual line selection, select and yank the lines with <kbd>y</kbd>, then open `dna.md` and paste with <kbd>p</kbd>.",
      "evaluateWhen": { "fileOpen": "dna.md" },
      "test": {
        "file": "dna.md",
        "contains": [
          "/Virus Strand:[\\s\\S]*A T G G T A C G C T G G A C T T T G T G G G A T A C C C T C/"
        ]
      }
    },
    {
      "label": "`dna.md` should contain the Opposite Strand.",
      "hint": "You can open `strands.md`, press <kbd>Shift</kbd> + <kbd>v</kbd> to start visual line selection, select and yank the lines with <kbd>y</kbd>, then open `dna.md` and paste with <kbd>p</kbd>.",
      "evaluateWhen": { "fileOpen": "dna.md" },
      "test": {
        "file": "dna.md",
        "contains": ["/Opposite Strand:[\\s\\S]*T A C C A T G C G A C C T G A A A C A C C/"]
      }
    },
    {
      "label": "Complete the remaining letters of the Opposite Strand.",
      "hint": "You can use `guide.md` as a reference for the corresponding letters of the Opposite Strand.",
      "evaluateWhen": { "fileOpen": "dna.md" },
      "test": {
        "file": "dna.md",
        "contains": [
          "/T\\s*A\\s*C\\s*C\\s*A\\s*T\\s*G\\s*C\\s*G\\s*A\\s*C\\s*C\\s*T\\s*G\\s*A\\s*A\\s*A\\s*C\\s*A\\s*C\\s*C\\s*C\\s*T\\s*A\\s*T\\s*G\\s*G\\s*G\\s*A\\s*G/i"
        ]
      }
    },
    {
      "label": "Save `dna.md`.",
      "hint": "You can use `:w` to save.",
      "evaluateWhen": { "fileOpen": "dna.md" },
      "test": { "file": "dna.md", "saved": true }
    },
    {
      "label": "`dna.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "evaluateWhen": { "fileOpen": "dna.md" },
      "test": {
        "file": "dna.md",
        "matches": "/^Before 1977, scientists didn't use computers to analyze DNA because genetic fragments were often just 5 to 10 letters long, short enough for researchers to translate by hand\\. By 1977, scientists began sequencing complete viral genomes\\. Computers became essential as they could produce more data faster and more accurately\\.\\n\\nThe first ever DNA code processed completely by a computer was Phi X174, a bacteria-killing virus discovered in 1935 in Paris sewers, packing 5,386 letters\\. This virus has since become a standard research model, helping scientists understand how bacteriophages work and used to develop phage therapies that target antibiotic-resistant bacteria\\.\\n\\nWhile harmless to humans, this virus is lethal to bacteria\\. To attack, it attaches to the outside of a bacterium and injects its single strand of DNA inside\\. The virus then forces the host bacterium to build a complementary DNA strand\\. This mirroring process is required for the virus to make copies of itself\\.\\n\\nAfter creating this double-stranded DNA copy, the virus activates a specific \"kill-switch\" section called Gene E\\. This gene produces a protein that stops the bacterium's cell-wall production\\. A bacterium without a working cell wall cannot contain its own internal pressure\\. The cell expands until it eventually ruptures\\.\\n\\nBelow is a 30-letter snapshot of that \"kill-switch\" sequence:\\n\\n?Virus Strand:\\n\\n?A T G G T A C G C T G G A C T T T G T G G G A T A C C C T C\\n\\n?Opposite Strand:\\n\\n?[Tt][ \\\\t]*[Aa][ \\\\t]*[Cc][ \\\\t]*[Cc][ \\\\t]*[Aa][ \\\\t]*[Tt][ \\\\t]*[Gg][ \\\\t]*[Cc][ \\\\t]*[Gg][ \\\\t]*[Aa][ \\\\t]*[Cc][ \\\\t]*[Cc][ \\\\t]*[Tt][ \\\\t]*[Gg][ \\\\t]*[Aa][ \\\\t]*[Aa][ \\\\t]*[Aa][ \\\\t]*[Cc][ \\\\t]*[Aa][ \\\\t]*[Cc][ \\\\t]*[Cc][ \\\\t]*[Cc][ \\\\t]*[Tt][ \\\\t]*[Aa][ \\\\t]*[Tt][ \\\\t]*[Gg][ \\\\t]*[Gg][ \\\\t]*[Gg][ \\\\t]*[Aa][ \\\\t]*[Gg]\\n?$/",
        "matchAgainstSaved": true
      }
    }
  ]
}
```
