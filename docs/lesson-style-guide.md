# Lesson writing style guide

Conventions for authoring and revising vim-course lessons.

## Instructions (`# --instructions--`)

- **Concept is the anchor, not the checklist.** The prose explains the idea behind a
  command (what it does, why it exists, how it differs from something already taught),
  not a recipe of keystrokes to complete the lesson. Concept can cover more ground than
  the lesson actually exercises — a lesson introducing `a` might explain `i`, `a`, and
  `A` together conceptually while the checklist only drills the new commands.
- **One command's explanation, then the invitation to try it.** Pattern: 1-3 short
  paragraphs of explanation, then a final sentence that names the concrete action —
  "Try that now," "Try it by typing...", "Open `notes.md` with..., then enter insert
  mode and type some text." The instructions always end pointing at the activity, never
  at a summary.
- **Recap, don't re-teach.** Previously taught commands are named in passing ("Open
  `notes.md` with the `vim <filename>` command" or "using one of the commands you
  previously learned") rather than re-explained. The new lesson's prose budget goes to
  the new concept.
- **Plain, direct sentences.** No filler, no rhetorical questions, short paragraphs
  (1-3 sentences). Command names and keys are in backticks. Second person ("you"),
  present tense, calm and matter-of-fact register — closer to a lab manual than
  marketing copy.
- **Instructions don't restate the full checklist.** They set up the scenario and the
  first/main action; they don't walk through every checklist item mechanically. E.g.
  instructions introducing `o` describe the command conceptually, then say to use it and
  save — they don't spell out "press Esc, then type :w."

## Files (`# --files--`)

- Full seed content every lesson, never inherited. Continuity across a module is
  achieved by authoring lesson N's seed as lesson N-1's *end state* (e.g., if lesson N
  fixes a typo, lesson N+1's seed already has that fix applied).

## Config / checklist (`# --config--`)

- **`label` = plain-English goal, not the command.** Labels describe the outcome or
  action in ordinary words: "Fix the "off" typo," "Return to normal mode," "Save the
  file," "Add a new line below `Hello, world!`." They deliberately avoid repeating the
  exact syntax already given in the instructions (a label never says `:w` — it says
  "Save the file").
- **`hint` = the answer, spoken as an instruction, shown only on failure.** Hints do
  restate the specific command/key needed, phrased as "You should press/type X..." They
  exist precisely to give away the syntax once a learner is stuck, which is why labels
  stay generic and hints stay concrete. Hints are per-step and imperative, never a
  lesson-wide summary.
- Not every item needs a hint. When the action is unambiguous — e.g. "Make a change in
  insert mode" — omit the hint rather than stating the obvious.
- `allowedCommands` lists exactly the commands relevant to that lesson (new command(s)
  plus anything needed to complete the flow, like `Esc` or a save/quit command already
  taught).

## Frontmatter / activity framing

- `type: workshop` for guided step-by-step lessons introducing specific commands.
- Title is short and names the command or concept plainly ("Saving with `:w`",
  "Opening new lines").

## Spaced repetition in practice

- **Every checklist re-performs the prerequisite chain, not just the new command.**
  A lesson's checklist isn't "one item for the new skill" — it's the full sequence
  needed to reach and use it, with every prior step still a required, testable item.
  For example, a lesson introducing `:w` still makes the learner open the file, enter
  insert mode, and `Esc` back out before the new save step. This is what makes it
  *practice* rather than *mention*: recap commands must be physically retyped to
  progress, not just referenced in prose.
- **Recap steps quietly drop once a skill is assumed mastered, not commanded again.**
  The recap chain isn't fixed — it shrinks as the module goes on. Early lessons use
  `"start": "shell"` and test the `vim`/`vim <filename>` open command because opening is
  still being taught. Once that skill has been drilled enough, `start` is omitted (the
  file opens already loaded) and the open-file checklist item disappears — that skill
  has graduated out of the tested recap and just becomes ambient setup.
- **New lessons build recap directly from the immediately preceding lesson, not the
  whole history.** The prose calls this out explicitly — "a recap from last lesson."
  A lesson recaps whatever command was taught most recently, not whichever command was
  introduced earliest in the module, because proximity is what keeps it fresh.
- **One new thing per lesson, layered on the full path to reach it.** The lesson never
  introduces two unrelated new commands at once. Closely related commands (like `a`/`A`,
  or `o`/`O`) may be introduced together as one family. Everything else in the checklist
  is old.
- **Explicit "you missed this" catch-up call-outs.** When a skill didn't get enough
  practice, later prose says so directly rather than silently re-drilling it — e.g.,
  "You didn't get a chance to practice `O`," folding a skipped rep into a later lesson's
  instructions text (not just the checklist). This is the one place spacing is named out
  loud to the learner instead of just structurally engineered.
- **Lab/practice and review lessons are the widest-interval rep.** Practice labs
  deliberately stop constraining *which* command is used ("nothing here checks which
  command you used, only the result"), letting the learner freely recall and choose from
  everything taught in the module so far. This is the spaced-out, interleaved recall
  step after the tightly sequenced per-lesson reps. Module review lessons (prose-only)
  then verbally recap the full command list one more time, with no re-execution required
  — pure recall, zero retyping.
