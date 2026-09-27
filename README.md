# Snappy Bricks

**Play it:** https://mba90.github.io/snappy-bricks/

**Code:** https://github.com/MBA90/snappy-bricks


A 2D brick-building website for kids aged 5–12 (English and Arabic). It is plain HTML, CSS and JavaScript, with no frameworks and no server. About 3,000 lines in total.

## Folder layout

```
build.py            Joins the files in src/ into finished pages in dist/ and docs/
voice-tools/        Records Bricky's voice (make_voice.py, texts.json, texts.js); run by .github/workflows/voice.yml
src/
  markup.html       Page structure: home, adventure map, games picker, studio, and the sheets (name, photo, save, grown-ups)
  styles.css        Main look: bricks, studs, buttons
  styles2.css       Games, themes, badges, gallery, cards, class wall
  styles3.css       Touch and tablet comforts
  styles4.css       Screens and zones: home doors, toy box | board | tools, sheets, picture keyboard, welcome tour
  styles5.css       Photo to bricks and the adventure map
  data.js           Colors, brick sizes, brick styles, pixel pictures, pixel font, themes, and English/Arabic text
  data2.js          Game content: puzzles, letters to trace, spelling words, game text
  engine.js         Board model, stacking layers, drawing bricks, undo, sounds, confetti, picture export
  lang.js           Language switch (English/Arabic, right-to-left) and device read-aloud
  ui.js             Tray, tools (move/paint/fill/erase/stamp), mirror, stack, drag and drop, saving files
  name.js           Turns names into bricks (pixel font for A–Z, font-to-bricks for Arabic)
  games.js          Copy it, Trace letters, Spell it, Brick math
  extras.js         Badges, replay, themes, My creations gallery, greeting cards
  classwall.js      Class wall and teacher words (Classroom edition only)
  voice.js          Plays Bricky's recorded voice from docs/voice/*.json, falls back to the device voice
  ux.js             Screens, grown-ups corner, press-and-hold to hear, picture keyboard, welcome tour
  photo.js          Photo to bricks (all on the device)
  map.js            Bricky's islands: adventure map, stickers, daily challenge
  boot.js           Start-up: loads the saved board, wires the buttons
docs/               The live website that GitHub Pages serves (index.html is made by build.py)
  voice/en.json     Bricky's English voice clips (MP3, base64)
  voice/ar.json     Bricky's Arabic voice clips
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

`build.py` also updates `docs/index.html`, which is the live website. After changing anything in `src/`, run `python3 build.py` and upload the new `docs/index.html`. The offline helper (`docs/sw.js`) always fetches the newest page first, so you don't need to change it for normal updates. `HOSTING.md` has notes on other hosts and privacy.

## Common changes

- **Add a color:** add an entry to `COLORS` in `data.js`.
- **Add a picture (stamp or puzzle):** add it to `ART` in `data.js`. Each letter is one stud (see `PAL` for the color letters) and `.` is empty. List it in `BASE_STAMPS`, a theme's `stamps`, or `PUZZLES` in `data2.js`.
- **Add spelling words or letters to trace:** edit `SPELL` or `TRACE` in `data2.js`.
- **Change or translate text:** every sentence is an `[English, Arabic]` pair inside an `addStrings({...})` block. Search for the English wording to find it.
- **Add a badge:** add it to `BADGES` in `extras.js`, then call `award("id")` where it is earned.

## Bricky's voice

Bricky speaks with recorded clips in `docs/voice/en.json` and `docs/voice/ar.json`, made with the open Supertonic 3 text-to-speech model by Supertone (OpenRAIL-M licence). Arabic clips are checked with the Whisper speech recogniser and recorded again when unclear. The app plays a clip when the text matches one it has; anything else (for example a child's name) uses the device's own voice.

To record new text after changing the app:

1. Run `python3 build.py`, then `node voice-tools/texts.js` to update `voice-tools/texts.json` (needs Node and Playwright).
2. Upload `voice-tools/texts.json`, open the **Actions** tab, choose **Make Bricky's voice** and press **Run workflow**. It takes up to about an hour and saves the clips to `docs/voice/`. Clips from earlier runs are reused, so later runs are quicker.

## Where things are saved

Everything is saved in the browser's local storage, under keys that start with `snappy-`: the board, settings, stamps, progress, badges and gallery. Nothing is sent to a server, except class wall posts in the Classroom edition.
