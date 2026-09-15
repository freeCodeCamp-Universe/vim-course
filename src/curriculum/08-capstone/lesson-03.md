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

The goal of the capstone is to bring together the skills you learned for managing files, searching for information, and editing text, which are what you generally would do in a real-world workflow.

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

- Find the recipe with a beneficial effect that contains Starshell.
- Extract the letter from each ingredient by line: first letter of the first ingredient, second letter of the second ingredient, third letter of the third ingredient, and so on.
- The letters spell out the key.

:::tabs

### instructions.md

```md
Six recipes rest upon the case,
Three bring harm, three grant sweet grace.
Seek the healing brew that holds Starshell,
Whose written steps let the secret spell:
First in the first brings the initial sign.
Second in second, then third down the line,
Follow the pattern till the key shall shine.
```

### sylvanglow-philtre.md

```md
# Sylvanglow Philtre

Nature: healing

Clears the senses and sharpens focus under pressure. Carried by scouts and combat mages.

## Preparation

Lichenwort
Yarrow
Bluewort
Starshell
Lichenwort
Sorrel
```

:::

You can search either by the nature of the recipes (healing) or by the specific ingredient (Starshell):

- `:vimgrep healing\c *.md`
- `:vimgrep starshell\c *.md`

Among the six recipes, only Sylvanglow Philtre meets both conditions.

The preparation section lists the ingredients in order:

```md
Lichenwort
Yarrow
Bluewort
Starshell
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

Two phrases await. Translate each in turn,
And match the target tongue for which they yearn.

Let every finished phrase begin to speak:
The first of every word is what you seek.
Pool twelve letters as the dark grows light;
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

Noreth reth velkath laryn eska. -

The fierce troll watched the savage archer. -
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

The two phrases translate as follows:

| Source                                      | Translation                               |
| ------------------------------------------- | ----------------------------------------- |
| Noreth reth velkath laryn eska.             | The noble wolf chases the lurking elf.    |
| The fierce troll watched the savage archer. | Fyrath lorvath remelvath trinthar arveth. |

Taking the first letter of every word across both answers, you have: T, N, W, C, T, L, E, F, L, R, T, A.

The five-letter word that can be formed from these letters and is a flying creature is CRANE.

## Summary

The final keys are:

- Key 1: STORM
- Key 2: LAUREL
- Key 3: CRANE
