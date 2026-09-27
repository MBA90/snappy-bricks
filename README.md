# Snappy Bricks

**Play it:** https://mba90.github.io/snappy-bricks/

**Code:** https://github.com/MBA90/snappy-bricks


A 2D brick-building website for kids aged 5–12 (English and Arabic). It is plain HTML, CSS and JavaScript, with no frameworks and no server. About 3,000 lines in total.

## Folder layout

```
build.py            Joins the files in src/ into finished pages in dist/
src/
  markup.html       Page structure (header, tray, board, name panel)
  part_*.html       Extra markup slotted into markup.html (game bar, game panel, header chips, toolbar, share box)
  styles.css        Main look: bricks, studs, buttons, layout, phone layout
  styles2.css       Games, themes, badges, gallery, cards, class wall
  data.js           Colors, brick sizes, brick styles, pixel pictures, pixel font, themes, and English/Arabic text
  data2.js          Game content: puzzles, letters to trace, spelling words, game text
  engine.js         Board model, stacking layers, drawing bricks, undo, sounds, confetti, picture export
  lang.js           Language switch (English/Arabic, right-to-left) and read-aloud
  ui.js             Tray, tools (move/paint/fill/erase/stamp), mirror, stack, drag and drop, saving files
  name.js           Turns names into bricks (pixel font for A–Z, font-to-bricks for Arabic)
  games.js          Copy it, Trace letters, Spell it, Brick math
  extras.js         Badges, replay, themes, My creations gallery, greeting cards
  classwall.js      Class wall and teacher words (Classroom edition only)
  boot.js           Start-up: loads the saved board, wires the buttons
docs/               The live website that GitHub Pages serves (index.html is made by build.py)
```

## Build

You need Python 3.

```
python3 build.py
```

This creates three pages in `dist/`:

| File | Use |
|---|---|
| `snappy-bricks.html` | Main edition, as published on claude.ai |
| `snappy-class.html` | Classroom edition (adds the class wall) |
| `standalone.html` | Full web page for your own hosting. Copy it to `site/index.html` |

`build.py` also updates `docs/index.html`, which is the live website. After changing anything in `src/`, run `python3 build.py` and upload the new `docs/index.html`. When you do, also change the `CACHE` name in `docs/sw.js` (for example `snappy-bricks-v2`) so devices get the new version. `HOSTING.md` has notes on other hosts and privacy.

## Common changes

- **Add a color:** add an entry to `COLORS` in `data.js`.
- **Add a picture (stamp or puzzle):** add it to `ART` in `data.js`. Each letter is one stud (see `PAL` for the color letters) and `.` is empty. List it in `BASE_STAMPS`, a theme's `stamps`, or `PUZZLES` in `data2.js`.
- **Add spelling words or letters to trace:** edit `SPELL` or `TRACE` in `data2.js`.
- **Change or translate text:** every sentence is an `[English, Arabic]` pair inside an `addStrings({...})` block. Search for the English wording to find it.
- **Add a badge:** add it to `BADGES` in `extras.js`, then call `award("id")` where it is earned.

## Where things are saved

Everything is saved in the browser's local storage, under keys that start with `snappy-`: the board, settings, stamps, progress, badges and gallery. Nothing is sent to a server, except class wall posts in the Classroom edition.
