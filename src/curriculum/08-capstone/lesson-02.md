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
Six recipes rest upon the case,
Three bring harm, three grant sweet grace.
Seek the healing brew that holds Starshell,
Whose written steps let the secret spell:
First in the first brings the initial sign.
Second in second, then third down the line,
Follow the pattern till the key shall shine.
```

## puzzle-2/sylvanglow-philtre.md

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

## puzzle-2/embersap-tonic.md

```md
# Embersap Tonic

Nature: healing

Kindles a sustained inner warmth that eases fatigue and quickens recovery. Favored by soldiers and long-distance travelers.

## Preparation

Seedwort
Goldenbloom
Seedwort
Groundwort
Goldenbloom
```

## puzzle-2/rotspore-tincture.md

```md
# Rotspore Tincture

Nature: harmful

Induces severe nausea and disorientation when ingested. Difficult to neutralize once absorbed into the body.

## Preparation

Ashroot
Grimleaf
Copperleaf
Starshell
Goldenbloom
Grimleaf
```

## puzzle-2/blightmoss-brew.md

```md
# Blightmoss Brew

Nature: harmful

Releases a dense vapor that clouds vision and causes respiratory distress. Hazardous in enclosed spaces.

## Preparation

Grimleaf
Darkwort
Frostmoss
Grimleaf
Starshell
Darkwort
```

## puzzle-2/verdant-draught.md

```md
# Verdant Draught

Nature: healing

Reduces fever and calms inflammation. Brewed and stored by village healers for common ailments.

## Preparation

Feverwort
Cloverleaf
Meadowbloom
Sorrel
Yarrow
```

## puzzle-2/thornblight-extract.md

```md
# Thornblight Extract

Nature: harmful

Weakens the joints and causes muscle tremors with repeated exposure. Historically used to disable captives.

## Preparation

Voidmoss
Grimleaf
Ashroot
Darkwort
Frostmoss
```

## puzzle-2/hints.md

```md
- Find the recipe with a beneficial effect that contains a specific ingredient.
- Follow the preparation steps, take letter one from line one, letter two from line two, and so on.
```

## puzzle-3/instructions.md

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

## puzzle-3/liber.md

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

## puzzle-3/hints.md

```md
- Study the pairs to uncover the old language's rules.
- Translate both phrases, then gather the first letter of every word.
- Use the twelve available letters to assemble the five-letter word for a flying creature.
```

# --config--

```json
{
  "start": "file",
  "open": "study.md",
  "unsupportedMessage": "{sequence} has no effect within this chamber",
  "completionScene": "capstone-congrats",
  "disallowedCommands": [":q", ":q!", ":wq", "@arrows"],
  "decorativeRanges": [
    { "file": "study.md", "lines": [1, 1] },
    { "file": "study.md", "lines": [6, 6] },
    { "file": "study.md", "lines": [12, 12] }
  ],
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
