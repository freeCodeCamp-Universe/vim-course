---
id: 6a7b8d5f1e5aa0cf31e40357
type: practice
title: 'Practice: Searching and editing across multiple files'
---

# --author-notes--

## CAG

**Concept:**
No new commands — applies `:vimgrep`, `:clist`, `:cnext`/`:cprev`, and `:cdo` from the previous three lessons.

**Setting:** Dallas City Directory. Eight files: a directory (`index.md`), background reading (`about.md`), and six content pages (`page-1.md` through `page-6.md`).

**Activity:**

1. Fix phone number formatting — the Plumbers section (`page-4.md`) and those same five businesses in the white pages (`page-1.md`) have `555_XXXX` instead of `555-XXXX`. Ten instances across two files. The learner uses `:vimgrep` to find all occurrences, `:clist` to survey, and `:cdo` to fix in bulk.

2. Move a misplaced entry — The Petal Cafe is listed under Florists (`page-3.md`). It belongs under Restaurants (`page-5.md`), alphabetically between Oak & Trinity and Ranch Dressing.

**Goal:**
The learner applies `:vimgrep` to search across multiple files, `:clist` to survey results, `:cnext`/`:cprev` to navigate, and either `:cdo` for bulk substitution or manual editing for structural changes — choosing the right tool for each task without scaffolding.

## Notes

<!-- Some other notes -->

# --instructions--

In this lesson, you'll practice searching and editing across multiple files.

You're provided with a telephone directory. This is a book that lists the phone numbers of people and businesses in a particular area.

There are two things that need to be corrected:

- Some phone numbers use an underscore (`_`) instead of a hyphen (`-`). For example, `555_0123` instead of `555-0123`.
- Petal Cafe is listed under Florists, but it should be under Restaurants, sorted alphabetically.

You may want to start from `index.md` to get an overview of the directory. The `:Explore` command could be useful for browsing the available files.

Save the files after you've made the changes.

# --files--

## index.md

```
DALLAS CITY DIRECTORY

  White Pages ................ page-1

  CLASSIFIED LISTINGS
  Computer Software .......... page-2
  Florists ................... page-3
  Plumbers ................... page-4
  Restaurants ................ page-5

  Community Pages ............ page-6
  About ...................... page-7
```

## page-1.md

```
WHITE PAGES
─────────────────────────────────────────────────────────
Residents and businesses listed alphabetically.
Entries beginning with "The" are filed under the following word.

Andrews Patricia          3712 Swiss Ave        (214) 555-8843
Brooks Angela             4521 Mockingbird Ln   (214) 555-2109
Cactus Makes Perfect      2156 Arroyo Dr        (214) 555-2847
Cold Boot Computing       1847 Toggle Rd        (214) 555-0319
Coleman James             891 Gaston Ave        (214) 555-3367
Cruz Valentina            2208 Henderson Ave    (214) 555-6150
Daisy Does It             1205 Corsage St       (214) 555-4193
Flow State Inc.           1522 Sluice Rd        (214) 555_3894
Flush Hour                844 Cascade Blvd      (214) 555_7416
Fork Worth                541 Tine St           (214) 555-4271
Free Code Camp Inc.       501 Third St          (214) 555-2014
Garza Miguel              317 Live Oak St       (214) 555-9284
Grill of My Dreams        1704 Hearth Ave       (214) 555-8936
Kowalski Diane            5540 Abrams Rd        (214) 555-1037
Leaky Business            2067 Sediment St      (214) 555_2583
Mori Kaito                109 Skillman St       (214) 555-4758
Oak & Trinity             29 Parlor St          (214) 555-3402
Petal Cafe                890 Trellis St        (214) 555-7362
PipeWorks Co.             38 Copper Ln          (214) 555_6731
Prairie Much              73 Lavender Blvd      (214) 555-1583
Ranch Dressing            967 Homestead Dr      (214) 555-7815
Rice & Shine              1388 Aurora St        (214) 555-2649
Rose to the Occasion      47 Verdant Ln         (214) 555-6204
Sullivan Frank            1631 Greenville Ave   (214) 555-5502
Turner Yvonne             724 Ross Ave          (214) 555-8873
Well Done Technologies    350 Integrated Blvd   (214) 555-5128
Wild About Flowers        318 Solstice Ave      (214) 555-3917
Workhorse Systems         2290 Conduit Ave      (214) 555-8364
Wrench Mob, The           115 Fitting Rd        (214) 555_9047
```

## page-2.md

```
COMPUTER SOFTWARE
─────────────────────────────────────────────────────────
See also: Data Processing — Computer Repairs & Service

Cold Boot Computing       1847 Toggle Rd        (214) 555-0319
Free Code Camp Inc.       501 Third St          (214) 555-2014
Well Done Technologies    350 Integrated Blvd   (214) 555-5128
Workhorse Systems         2290 Conduit Ave      (214) 555-8364
```

## page-3.md

```
FLORISTS
─────────────────────────────────────────────────────────
See also: Gift Shops — Wedding Supplies

Cactus Makes Perfect      2156 Arroyo Dr        (214) 555-2847
Daisy Does It             1205 Corsage St       (214) 555-4193
Petal Cafe                890 Trellis St        (214) 555-7362
Prairie Much              73 Lavender Blvd      (214) 555-1583
Rose to the Occasion      47 Verdant Ln         (214) 555-6204
Wild About Flowers        318 Solstice Ave      (214) 555-3917
```

## page-4.md

```
PLUMBERS
─────────────────────────────────────────────────────────
See also: Pipe Fitting — Plumbing Fixtures

Flow State Inc.           1522 Sluice Rd        (214) 555_3894
Flush Hour                844 Cascade Blvd      (214) 555_7416
Leaky Business            2067 Sediment St      (214) 555_2583
PipeWorks Co.             38 Copper Ln          (214) 555_6731
The Wrench Mob            115 Fitting Rd        (214) 555_9047
```

## page-5.md

```
RESTAURANTS
─────────────────────────────────────────────────────────
See also: Caterers — Bars & Taverns

Fork Worth                541 Tine St           (214) 555-4271
Grill of My Dreams        1704 Hearth Ave       (214) 555-8936
Oak & Trinity             29 Parlor St          (214) 555-3402
Ranch Dressing            967 Homestead Dr      (214) 555-7815
Rice & Shine              1388 Aurora St        (214) 555-2649
```

## page-6.md

```
COMMUNITY PAGES
─────────────────────────────────────────────────────────

EMERGENCY
  Police (non-emergency)                        (214) 555-4444
  Fire Department                               (214) 555-4511
  Poison Control Center                         (214) 555-5000

CITY OF DALLAS
  City Hall                                     (214) 555-3011
  Public Works                                  (214) 555-3241
  Water Utilities                               (214) 555-1441
  Dallas Public Library                         (214) 555-1400

DALLAS COUNTY
  County Courthouse                             (214) 555-7011
  County Health Department                      (214) 555-1820
```

## page-7.md

```
Up until the early 2010s, physical phone books were an indispensable utility in nearly every household. They served as the primary local registry for contact information, organized into distinct, color-coded sections.

The white pages contained an alphabetical index of all residents and businesses within the region, listing each entry with an address and phone number. The yellow pages were structured by service category, grouping local businesses under specific industry classifications for easy comparison. Many directories also included blue pages, listing contact information for local, state, and
federal government offices.

With the rise of search engines, mobile devices, and privacy concerns, printed directories declined and centralized public phone registries largely disappeared.
```

# --expected--

## page-1.md

```
WHITE PAGES
─────────────────────────────────────────────────────────
Residents and businesses listed alphabetically.
Entries beginning with "The" are filed under the following word.

Andrews Patricia          3712 Swiss Ave        (214) 555-8843
Brooks Angela             4521 Mockingbird Ln   (214) 555-2109
Cactus Makes Perfect      2156 Arroyo Dr        (214) 555-2847
Cold Boot Computing       1847 Toggle Rd        (214) 555-0319
Coleman James             891 Gaston Ave        (214) 555-3367
Cruz Valentina            2208 Henderson Ave    (214) 555-6150
Daisy Does It             1205 Corsage St       (214) 555-4193
Flow State Inc.           1522 Sluice Rd        (214) 555-3894
Flush Hour                844 Cascade Blvd      (214) 555-7416
Fork Worth                541 Tine St           (214) 555-4271
Free Code Camp Inc.       501 Third St          (214) 555-2014
Garza Miguel              317 Live Oak St       (214) 555-9284
Grill of My Dreams        1704 Hearth Ave       (214) 555-8936
Kowalski Diane            5540 Abrams Rd        (214) 555-1037
Leaky Business            2067 Sediment St      (214) 555-2583
Mori Kaito                109 Skillman St       (214) 555-4758
Oak & Trinity             29 Parlor St          (214) 555-3402
Petal Cafe                890 Trellis St        (214) 555-7362
PipeWorks Co.             38 Copper Ln          (214) 555-6731
Prairie Much              73 Lavender Blvd      (214) 555-1583
Ranch Dressing            967 Homestead Dr      (214) 555-7815
Rice & Shine              1388 Aurora St        (214) 555-2649
Rose to the Occasion      47 Verdant Ln         (214) 555-6204
Sullivan Frank            1631 Greenville Ave   (214) 555-5502
Turner Yvonne             724 Ross Ave          (214) 555-8873
Well Done Technologies    350 Integrated Blvd   (214) 555-5128
Wild About Flowers        318 Solstice Ave      (214) 555-3917
Workhorse Systems         2290 Conduit Ave      (214) 555-8364
Wrench Mob, The           115 Fitting Rd        (214) 555-9047
```

## page-3.md

```
FLORISTS
─────────────────────────────────────────────────────────
See also: Gift Shops — Wedding Supplies

Cactus Makes Perfect      2156 Arroyo Dr        (214) 555-2847
Daisy Does It             1205 Corsage St       (214) 555-4193
Prairie Much              73 Lavender Blvd      (214) 555-1583
Rose to the Occasion      47 Verdant Ln         (214) 555-6204
Wild About Flowers        318 Solstice Ave      (214) 555-3917
```

## page-4.md

```
PLUMBERS
─────────────────────────────────────────────────────────
See also: Pipe Fitting — Plumbing Fixtures

Flow State Inc.           1522 Sluice Rd        (214) 555-3894
Flush Hour                844 Cascade Blvd      (214) 555-7416
Leaky Business            2067 Sediment St      (214) 555-2583
PipeWorks Co.             38 Copper Ln          (214) 555-6731
The Wrench Mob            115 Fitting Rd        (214) 555-9047
```

## page-5.md

```
RESTAURANTS
─────────────────────────────────────────────────────────
See also: Caterers — Bars & Taverns

Fork Worth                541 Tine St           (214) 555-4271
Grill of My Dreams        1704 Hearth Ave       (214) 555-8936
Oak & Trinity             29 Parlor St          (214) 555-3402
Petal Cafe                890 Trellis St        (214) 555-7362
Ranch Dressing            967 Homestead Dr      (214) 555-7815
Rice & Shine              1388 Aurora St        (214) 555-2649
```

# --config--

```json
{
  "start": "shell",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Fix all incorrectly formatted phone numbers.",
      "hint": "You can use `:vimgrep` to find every incorrect phone number, then use `:cdo s/555_/555-/g | update` to fix and save all matches.",
      "evaluateWhen": { "fileChanged": ["page-1.md", "page-4.md"] },
      "test": {
        "files": ["page-1.md", "page-4.md"],
        "matchAgainstSaved": true,
        "equalsExpectedNormalizingWhitespace": true
      }
    },
    {
      "label": "Remove Petal Cafe from Florists category and save the file.",
      "hint": "You should find the line with \"Petal Cafe\", delete it and save the file.",
      "evaluateWhen": { "fileChanged": ["page-3.md"] },
      "test": {
        "file": "page-3.md",
        "absent": ["Petal Cafe"]
      }
    },
    {
      "label": "Add Petal Cafe under Restaurants category alphabetically and save the file.",
      "hint": "You should add Petal Cafe alphabetically between Oak & Trinity and Ranch Dressing, then save the file.",
      "evaluateWhen": { "fileChanged": ["page-5.md"] },
      "test": {
        "file": "page-5.md",
        "matches": "/Oak & Trinity\\s+.*\\nPetal Cafe\\s+.*\\nRanch Dressing/"
      }
    },
    {
      "label": "Save all files.",
      "hint": "You should save all files after making the changes.",
      "test": {
        "files": ["page-1.md", "page-3.md", "page-4.md", "page-5.md"],
        "matchAgainstSaved": true,
        "equalsExpectedNormalizingWhitespace": true
      }
    }
  ]
}
```
