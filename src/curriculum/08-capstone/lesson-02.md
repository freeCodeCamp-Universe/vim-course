---
id: 6a75e416116f97fc366586ea
type: practice
title: 'Capstone challenge'
---

# --author-notes--

## CAG

**Concept:**
No new commands — this capstone synthesizes file navigation, search,

yank and paste, editing, and saving in a puzzle-driven task.

**Activity:**
The learner explores Maren's study and solves three independent

puzzles: a rune crossword whose odd word is STORM, a potion formula whose
diagonal extraction is LAUREL, and a Sylvan translation puzzle whose pooled
initials identify CRANE. They enter the three keys in order in `study.md`.

**Goal:**
The learner chooses and composes previously learned Vim commands to

complete a realistic multi-file challenge, then saves the final password without
being guided through a prescribed command sequence.

## Notes

<!-- Some other notes -->

# --instructions--

You are an apprentice mage to Maren. While cleaning her study, you accidentally triggered a protective ward that sealed the door shut.

Three puzzles are hidden around the room, each containing a key. You must find all three keys to break the ward.

Solve the puzzles and write each key on its matching line in `study.md`, then save the file.

# --files--

## study.md

<!-- prettier-ignore-start -->
```md
. ݁₊ ⊹༄ . ݁  ˖ ݁ . ⊹  . ݁ ⟡ ݁  . ࿔ 𓂃  ⋆✴︎  ˚ ｡ ⋆ ݁ ✧ ৎ⁺ ₊  *ੈ ˖.

"The world does not reveal its nature to the passive observer; you must explore to see."
— Mage Maren, Era of the Shattered Sky, Vol. I

----- ⚷ -----

Key 1: [key from puzzle 1]
Key 2: [key from puzzle 2]
Key 3: [key from puzzle 3]

⋆﹒༚𓂃⊹ ˖. ݁ ⟡ ݁  .ೃ࿔ . ✦ ˚  ౨﹒༚ ⋆  𖥔‧ ☾  ₊˚  ⋆ ˚ ꩜ ｡⋆ ₊⊹  *: ･
```
<!-- prettier-ignore-end -->

## puzzle-1/instructions.md

```md
Rows of stone and columns deep,
Translate the runes where secrets sleep.
Trace two matching groups of three;
The odd one out becomes the key.
```

## puzzle-1/tablet.md

```md
ᛈ C A ᚱ ᛈ ᛃ
ᚹ C P ᚹ U V
D H W ᛃ L F
ᛗ ᛈ A R N K
ᛃ ᚱ J M Q D
X ᚹ I G ᛈ R
```

## puzzle-1/tome.md

```md
ᚱ = S
ᛃ = O
ᛈ = E
ᛗ = B
ᚹ = T
```

## puzzle-1/hints.md

```md
- The runes may be easier to understand when their meanings are brought nearby.
- Look across the rows and down the columns for the hidden words.
- Find seven words: six belong to two groups of three, and one belongs to neither group.
```

## puzzle-2/instructions.md

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

## puzzle-2/sylvanglow-philtre.md

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

## puzzle-2/seedfire-tonic.md

```md
# SEEDFIRE TONIC

Accelerates germination and strengthens early root growth. Used in poor soil or late planting seasons.

## Reagents

Goldenbloom -- 2 measures
Groundwort -- 1 measure
Seedwort -- 2 measures

## Preparation

The seedwort wakes.
The goldenbloom follows.
The seedwort returns.
The groundwort settles.
The goldenbloom seals.
```

## puzzle-2/grimspore-tincture.md

```md
# GRIMSPORE TINCTURE

Spreads fungal blight rapidly through nearby soil. Difficult to contain once applied.

## Reagents

Grimleaf -- 3 measures
Copperleaf -- 1 measure
Ashroot -- 1 measure

## Preparation

The ashroot darkens.
The grimleaf spreads.
The copperleaf follows.
The grimleaf returns.
The grimleaf closes.
```

## puzzle-2/blightmoss-brew.md

```md
# BLIGHTMOSS BREW

Produces toxic spores lethal to seedlings. Hazardous to breathe in enclosed spaces.

## Reagents

Darkwort -- 2 measures
Frostmoss -- 1 measure
Grimleaf -- 2 measures

## Preparation

The grimleaf spreads.
The darkwort smolders.
The frostmoss chills.
The grimleaf returns.
The darkwort seals.
```

## puzzle-2/cauldron.md

```md

```

## puzzle-2/hints.md

```md
- Find the formula that helps an herbalist tell plants apart.
- Match each shortened name to its ingredient. Fill the cauldron one measure per line, following the verse.
- Take letter one from line one, letter two from line two, and so on.
```

## puzzle-3/instructions.md

```md
The liber holds a tongue no longer spoken:
Six pairs remain, by time left quite unbroken.
Follow the pattern that the text has woven.

Three phrases follow. Translate each in turn,
And match the target tongue for which they yearn.

Let every finished phrase begin to speak:
The first of every word is what you seek.
Pool sixteen letters as the dark grows light;
The five-letter key takes its majestic flight.
```

## puzzle-3/liber.md

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

## puzzle-3/hints.md

```md
- Study the pairs to uncover the old language's rules.
- Translate all three phrases, then gather the first letter of every word.
- Use the sixteen available letters to assemble the five-letter word for a flying creature.
```

# --config--

```json
{
  "start": "file",
  "open": "study.md",
  "unsupportedMessage": "{sequence} has no effect within this chamber",
  "completionScene": "capstone-congrats",
  "disallowedCommands": [":q", ":q!", ":wq", "@arrows"],
  "checklist": [
    {
      "label": "Enter the correct key 1.",
      "hint": "You should write the correct key from puzzle 1 after `Key 1:` in `study.md`. Refer to `puzzle-1/hints.md` for help if needed.",
      "attemptsBeforeHint": 3,
      "targetLine": "Key 1:",
      "evaluateWhen": { "fileChanged": "study.md", "absent": "[key from puzzle 1]" },
      "test": {
        "file": "study.md",
        "contains": ["/^Key[ \\t]*1[ \\t]*:[ \\t]*STORM[ \\t]*$/im"]
      }
    },
    {
      "label": "Enter the correct key 2.",
      "hint": "You should write the correct key from puzzle 2 after `Key 2:` in `study.md`. Refer to `puzzle-2/hints.md` for help if needed.",
      "attemptsBeforeHint": 3,
      "targetLine": "Key 2:",
      "evaluateWhen": { "fileChanged": "study.md", "absent": "[key from puzzle 2]" },
      "test": {
        "file": "study.md",
        "contains": ["/^Key[ \\t]*2[ \\t]*:[ \\t]*LAUREL[ \\t]*$/im"]
      }
    },
    {
      "label": "Enter the correct key 3.",
      "hint": "You should write the correct key from puzzle 3 after `Key 3:` in `study.md`. Refer to `puzzle-3/hints.md` for help if needed.",
      "attemptsBeforeHint": 3,
      "targetLine": "Key 3:",
      "evaluateWhen": { "fileChanged": "study.md", "absent": "[key from puzzle 3]" },
      "test": {
        "file": "study.md",
        "contains": ["/^Key[ \\t]*3[ \\t]*:[ \\t]*CRANE[ \\t]*$/im"]
      }
    },
    {
      "label": "`study.md` should have all three keys and be saved.",
      "hint": "You should save `study.md`.",
      "test": {
        "file": "study.md",
        "saved": true,
        "contains": [
          "/^Key[ \\t]*1[ \\t]*:[ \\t]*STORM[ \\t]*$/im",
          "/^Key[ \\t]*2[ \\t]*:[ \\t]*LAUREL[ \\t]*$/im",
          "/^Key[ \\t]*3[ \\t]*:[ \\t]*CRANE[ \\t]*$/im"
        ],
        "matchAgainstSaved": true
      }
    }
  ]
}
```
