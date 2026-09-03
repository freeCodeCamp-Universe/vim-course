---
id: 6a7dbe380cec0eb56fe6a538
type: review
title: 'Capstone walkthrough'
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

Explains how the capstone puzzles could have been solved, including the final keys.

# --instructions--

If you have completed the capstone, congratulations!

The goal of the capstone was to bring together the skills you learned for managing files, searching for information, and editing text, which are what you generally would do in a real-world workflow.

This lesson is a walkthrough of the capstone, explaining how each puzzle can be solved. If you already solved the capstone, feel free to skip this one.

## Puzzle 1

This puzzle is a rune crossword.

:::tabs

### instructions.md

```md
Rows of stone and columns deep,
Translate the runes where secrets sleep.
Trace two matching groups of three;
The odd one out becomes the key.
```

### tablet.md

```md
ᛈ C A ᚱ ᛈ ᛃ
ᚹ C P ᚹ U V
D H W ᛃ L F
ᛗ ᛈ A R N K
ᛃ ᚱ J M Q D
X ᚹ I G ᛈ R
```

### tome.md

```md
ᚱ = S
ᛃ = O
ᛈ = E
ᛗ = B
ᚹ = T
```

:::

In this puzzle, you can either replace the runes with their English equivalents, or yank the entire mapping and paste it into the tablet file to see the English letters.

The completed grid looks like this:

```md
E C A S E O
T C P T U V
D H W O L F
B E A R N K
O S J M Q D
X T I G E R
```

The words that appear in the grid are: WOLF, BEAR, TIGER, CASE, CHEST, BOX, and STORM. The first six words can be grouped into two categories: beasts (WOLF, BEAR, TIGER) and containers (CASE, CHEST, BOX). The odd one out is STORM, which is the key.

## Puzzle 2

This puzzle involves the following steps:

- Identify the correct potion
- List the ingredients in the correct order; their occurrences should match the measure count
- Extract the letter by line: first letter of the first line, second letter of the second line, third letter of the third line, and so on.
- The letters spell out the key.

:::tabs

### instructions.md

```md
When the green gives no names and each herb looks the same,
Find what guides seekers, and bring it to flame.
Into the cauldron -- each count, every step as it's penned.
Follow what's written from beginning to end.

When the last herb is placed, let the ingredients alight:
First in the first reveals the initial sight.
Second in second, then third as it's grown,
Follow the pattern till the key is shown.
```

### sylvanglow-philtre.md

```md
# SYLVANGLOW PHILTRE

Sharpens a herbalist's senses, helps identify wild plants by scent, texture, and taste. Favored by foragers and apothecaries.

## Reagents

Sorrel -- 1 measure
Bluewort -- 1 measure
Lichenwort -- 2 measures
Yarrow -- 2 measures

## Preparation

The lichen opens.
The yarrow follows.
The blue binds.
The yarrow returns.
The lichen rises once more.
The sorrel seals.
```

:::

The riddle looks for a brew that strengthens a herbalist's senses. The Sylvanglow Philtre is the only brew that does this, so this is the correct potion.

`cauldron.md` is provided as a drafting space for the ingredients. If you write them in the order specified in the formula, you get the following lines:

```md
Lichenwort
Yarrow
Bluewort
Yarrow
Lichenwort
Sorrel
```

If you take the Nth letter of the Nth line, you get L-A-U-R-E-L, which is the key.

## Puzzle 3

This puzzle is a linguistics puzzle.

The given language has the following rules:

- No articles (the, a, an)
- Past tense adds `re-` to the verb

:::tabs

### instructions.md

```md
The liber holds a tongue no longer spoken:
Six pairs remain, by time left quite unbroken.
Follow the pattern that the text has woven.

Three phrases await. Translate each in turn,
And match the target tongue for which they yearn.

Let every finished phrase begin to speak:
The first of every word is what you seek.
Pool sixteen letters as the dark grows light;
The five-letter key takes its majestic flight.
```

### liber.md

```md
Reth velkath eska. - The wolf chases the elf.
Lorvath thelvyn arveth. - The troll outwits the archer.
Lorvath rethelvyn arveth. - The troll outwitted the archer.
Noreth lorvath redrovak trinthar eska. - The noble troll attacked the savage elf.
Laryn reth melvath sorath arveth. - The lurking wolf watches the cunning archer.
Noreth arveth pharom fyrath reth. - The noble archer pursues the fierce wolf.

----- ᝰ -----

Sorath arveth melvath. -

Noreth reth drovak laryn eska. -

The fierce troll pursued the savage archer. -
```

:::

The vocabulary is:

| Ancient language | English |
| ---------------- | ------- |
| arveth           | archer  |
| drovak           | attack  |
| eska             | elf     |
| fyrath           | fierce  |
| laryn            | lurking |
| lorvath          | troll   |
| melvath          | watches |
| noreth           | noble   |
| pharom           | pursue  |
| reth             | wolf    |
| sorath           | cunning |
| thelvyn          | outwit  |
| trinthar         | savage  |
| velkath          | chase   |

The three phrases translate as follows:

| Ancient language                            | English                                  |
| ------------------------------------------- | ---------------------------------------- |
| Sorath arveth melvath.                      | The cunning archer watches.              |
| Noreth reth drovak laryn eska.              | The noble wolf attacks the lurking elf.  |
| The fierce troll pursued the savage archer. | Fyrath lorvath repharom trinthar arveth. |

Taking the first letter of every word across all three answers, you have: T, C, A, W, T, N, W, A, T, L, E, F, L, R, T, A.

The five-letter word that can be formed from these letters and is a flying creature is CRANE.

## Summary

The final keys are:

- Key 1: STORM
- Key 2: LAUREL
- Key 3: CRANE
