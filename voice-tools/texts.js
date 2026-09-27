// Lists every text Snappy Bricks may say out loud (both languages) into voice-tools/texts.json.
// Run after `python3 build.py`:  npm i playwright && npx playwright install chromium && node voice-tools/texts.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const TMP = path.join(os.tmpdir(), 'snappy-texts.html');
(async () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'dist', 'snappy-bricks.html'), 'utf8')
    .replace('"use strict";\nconst EDITION', '"use strict";\nwindow.__dbg = () => ({STR, COLORS, PLATES, SIZES, STYLES, ART, THEMES, PUZZLES, TRACE, SPELL, BADGES, LEVEL_AGES, AR_TILES, EN_TILES, AR_LETTERS, EXTRA_SPOKEN: (typeof EXTRA_SPOKEN !== "undefined" ? EXTRA_SPOKEN : null), setLang, showScreen, openGallery, openBadges});\nconst EDITION');
  fs.writeFileSync(TMP, '<!doctype html><html><head><meta charset="utf-8"></head><body>' + src + '</body></html>');
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 900}});
  await ctx.addInitScript(() => localStorage.setItem('snappy-settings', JSON.stringify({toured: true})));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + TMP); await p.waitForTimeout(800);
  const out = {en: [], ar: []};
  for (const lang of ['en', 'ar']) {
    const got = await p.evaluate(async (lang) => {
      const D = window.__dbg(); const L = lang === 'ar' ? 1 : 0; const S = D.STR[lang]; const T = new Set();
      const add = s => { if (s != null && String(s).trim()) T.add(String(s)); };
      const fill = (k, v) => String(S[k] || D.STR.en[k] || '').replace(/\{(\w+)\}/g, (m, x) => v[x] != null ? v[x] : m);
      for (const k in S) if (!/\{/.test(S[k])) add(S[k]);
      for (const c of [...D.COLORS, ...D.PLATES, ...D.SIZES, ...D.STYLES]) add(c[lang]);
      for (const k in D.ART) add(D.ART[k][lang]);
      for (const k in D.THEMES) add(D.THEMES[k][lang]);
      for (const bd of D.BADGES) { add(bd[lang][0]); add(bd[lang][1]); }
      for (const k in D.LEVEL_AGES) add(D.LEVEL_AGES[k][L]);
      for (const p of D.PUZZLES) { const n = D.ART[p.art][lang]; add(fill('copyTitle', {n})); }
      const letters = lang === 'ar' ? [...new Set([...D.AR_TILES, ...D.AR_LETTERS])] : D.EN_TILES;
      for (const l of letters) { add(l); add(fill('traceTitle', {l})); }
      for (const [l, w] of D.TRACE[lang]) { add(l); add(w); }
      for (const a of ['en', 'ar']) for (const [w] of D.SPELL[a]) if ((a === 'ar') === (lang === 'ar')) add(w);
      for (let n = 1; n <= 40; n++) { add(fill('mathTitle', {n})); add(String(n)); }
      for (let n = 1; n <= 12; n++) add(fill('mathLevel', {n}));
      for (const [a, bb] of [[5, 6], [7, 9], [10, 12]]) add(fill('years', {a, b: bb}));
      add(fill('homeHiNoName', {}));
      if (lang === 'en') { add('heart'); add('star'); }
      if (D.EXTRA_SPOKEN) for (const s of (D.EXTRA_SPOKEN[lang] || [])) add(s);
      // every button label, as press-and-hold reads it
      D.setLang(lang, true);
      const labelOf = n => (n.dataset.say || n.getAttribute('aria-label') || n.title || n.textContent || '').replace(/\s+/g, ' ').trim();
      const grab = () => document.querySelectorAll('button, .card, .swatch, [data-say]').forEach(n => { const s = labelOf(n); if (s) add(s.replace(/×/g, lang === 'ar' ? ' في ' : ' by ')); });
      grab();
      for (const fn of [D.openGallery, D.openBadges]) { try { fn(); await new Promise(r => setTimeout(r, 150)); grab(); document.querySelectorAll('.modal .x, .modal [data-close]').forEach(x => x.click()); document.querySelectorAll('.modal-wrap, .modal').forEach(m => m.remove()); } catch (e) {} }
      return [...T];
    }, lang);
    out[lang] = got;
  }
  fs.writeFileSync(path.join(__dirname, 'texts.json'), JSON.stringify(out, null, 1));
  console.log('en', out.en.length, 'ar', out.ar.length, 'errors', errs);
  await b.close();
})();
