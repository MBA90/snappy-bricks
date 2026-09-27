# Snappy Bricks: website files

This folder is the complete Snappy Bricks website. It is a plain HTML site with no server code, no database and no accounts, so any static web host can serve it.

| File | What it does |
|---|---|
| `index.html` | The whole app: the building board, games, Arabic/English, badges, gallery and cards |
| `manifest.webmanifest` | Lets tablets and phones install it like an app ("Add to Home Screen") |
| `sw.js` | Keeps it working offline after the first visit |
| `icon-192.png`, `icon-512.png` | App icons |

## Put it online (pick one)

**Netlify Drop (easiest, about 2 minutes)**
1. Go to app.netlify.com/drop and sign in.
2. Drag this whole folder onto the page.
3. You get a link like `something.netlify.app`. Rename it in Site settings.

**GitHub Pages**
1. Create a new repository and upload these files to it.
2. Open Settings → Pages, choose the `main` branch and the root folder, then save.
3. The site appears at `yourname.github.io/repository-name`.

**Cloudflare Pages**
1. Create a project, choose "Direct upload" and upload this folder.

**Your own web address (for example snappybricks.com)**
Buy the name from any domain seller, then add it in your host's "Custom domain" settings. All three hosts above give free HTTPS.

## Try it on your own computer
Double-clicking `index.html` works for playing. Installing and offline mode only work once the site is served over `https://` (or `http://localhost`). For a quick local server run `python3 -m http.server` in this folder and open `http://localhost:8000`.

## Updating
Replace `index.html` with the new version. When you change files, also change the `CACHE` name in `sw.js` (for example `snappy-bricks-v2`) so devices pick up the new version.

## Privacy notes for a kids' site
- The site collects nothing. Creations, badges and settings are stored only in the child's own browser.
- There are no ads, no trackers, no sign-in, and no chat.
- Fonts load from Google Fonts. For zero third-party requests, download the "Baloo 2" and "Baloo Bhaijaan 2" fonts, put the files next to `index.html`, and replace the Google Fonts `<link>` with your own `@font-face` rules.
- If you later add accounts, analytics or sharing, check the children's privacy rules where you operate (for example COPPA in the US and the UAE's personal data protection law) before launching.
