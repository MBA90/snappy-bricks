/* ===================== words -> bricks ===================== */
const RASTER_FONT = '"Baloo Bhaijaan 2", "Baloo 2", "Noto Naskh Arabic", "Geeza Pro", Arial, sans-serif';
const MIN_FS = 17;
let nameMode = "rainbow";

function glyph(ch){ const g = FONT[ch]; if (!g) return null; const rows = g.split("|"); return {w: rows[0].length, rows}; }
function wordWidth(word){ const cs = [...word]; return cs.reduce((a, ch) => a + glyph(ch).w, 0) + cs.length - 1; }
function isPixelText(s){ return [...s].every(ch => FONT[ch] || ch === " "); }

function layoutLines(words, cols, breakWords){
  const parts = [];
  for (const w of words){
    if (wordWidth(w) <= cols){ parts.push(w); continue; }
    if (!breakWords) return null;
    let cur = "";
    for (const ch of w){ const tt = cur + ch; if (cur && wordWidth(tt) > cols){ parts.push(cur); cur = ch; } else cur = tt; }
    if (cur) parts.push(cur);
  }
  const lines = []; let line = [];
  const lw = arr => arr.reduce((a, w) => a + wordWidth(w), 0) + 3 * (arr.length - 1);
  for (const p of parts){ if (line.length && lw([...line, p]) > cols){ lines.push(line); line = [p]; } else line.push(p); }
  if (line.length) lines.push(line);
  return lines;
}
function lum(hex){
  const n = parseInt(hex.slice(1), 16);
  const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  return .2126 * f(n >> 16) + .7152 * f((n >> 8) & 255) + .0722 * f(n & 255);
}
// a letter color must stand out clearly from the board color
function readable(c, plateHex){
  const d = colorDist(c, plateHex), a = lum(c), b = lum(plateHex);
  const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  return d > 200 && (ratio >= 1.45 || d >= 330);
}
function textColors(mode, explicit){
  if (explicit) return explicit;
  if (mode === "one") return [color];
  const ok = c => readable(c, plateTone(B));
  let list = (mode === "pastel" ? CANDY : RAINBOW).filter(ok);
  if (!list.length) list = RAINBOW.filter(ok);
  return list.length ? list : ["#2E2A3A"];
}

/* ---- pixel-font path (A–Z, 0–9) ---- */
function composePixel(text, cols, rows, cl){
  const words = text.split(/ +/).filter(Boolean);
  let lines = layoutLines(words, cols, false);
  if (!lines || lines.length * 6 - 1 > rows) lines = layoutLines(words, cols, true);
  if (!lines || lines.length * 6 - 1 > rows) return null;
  const lineW = l => l.reduce((a, w) => a + wordWidth(w), 0) + 3 * (l.length - 1);
  const W = Math.max(...lines.map(lineW)), H = lines.length * 6 - 1;
  const bricks = [], letters = [];
  let n = 0;
  lines.forEach((l, li) => {
    let x = Math.floor((W - lineW(l)) / 2);
    l.forEach(word => {
      [...word].forEach(ch => {
        const g = glyph(ch), c = cl[n % cl.length];
        const pix = g.rows.map(r => [...r].map(p => p === "#" ? c : null));
        decompose(pix).forEach((b, k) => bricks.push({...b, x: x + b.x, y: li * 6 + b.y, delay: n * 140 + k * 22, li: n}));
        letters.push({ch, delay: n * 140});
        n++; x += g.w + 1;
      });
      x += 2;
    });
  });
  return {kind: "pixel", w: W, h: H, bricks, letters, rtl: false, fs: 99, dur: n * 140};
}

/* ---- font raster path (Arabic and anything else) ---- */
function rasterLine(text, fs){
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d", {willReadFrequently: true});
  const font = `700 ${fs}px ${RASTER_FONT}`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + fs * 2, h = Math.ceil(fs * 2.4);
  cv.width = w; cv.height = h;
  ctx.font = font; ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.direction = hasArabic(text) ? "rtl" : "ltr";
  ctx.fillText(text, w / 2, h / 2);
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  const m = Array.from({length: h}, () => new Uint8Array(w));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    if (d[(y * w + x) * 4 + 3] >= 118){ m[y][x] = 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  return {w: x1 - x0 + 1, h: y1 - y0 + 1, m: m.slice(y0, y1 + 1).map(r => r.slice(x0, x1 + 1))};
}
function splitWords(words, k){
  if (k === 1) return [words.join(" ")];
  if (words.length < k) return null;
  // balance by character count
  const total = words.join(" ").length; const out = []; let cur = [];
  for (const w of words){
    cur.push(w);
    if (out.length < k - 1 && cur.join(" ").length >= total / k){ out.push(cur.join(" ")); cur = []; }
  }
  if (cur.length) out.push(cur.join(" "));
  return out.length === k ? out : null;
}
function composeRaster(text, cols, rows, cl){
  const words = text.split(/\s+/).filter(Boolean);
  let best = null;
  for (let k = 1; k <= 3; k++){
    const lines = splitWords(words, k); if (!lines) continue;
    for (let fs = 34; fs >= 8; fs--){
      const r = lines.map(l => rasterLine(l, fs));
      if (r.some(x => !x)) break;
      const W = Math.max(...r.map(x => x.w)), H = r.reduce((a, x) => a + x.h, 0) + (k - 1);
      if (W <= cols && H <= rows){
        if (!best || fs > best.fs) best = {fs, r, W, H};
        break;
      }
    }
  }
  if (!best) return null;
  const {r, W, H} = best;
  const mask = Array.from({length: H}, () => new Uint8Array(W));
  let yy = 0;
  r.forEach(line => {
    const ox = Math.floor((W - line.w) / 2);
    line.m.forEach((row, y) => row.forEach((v, x) => { if (v) mask[yy + y][ox + x] = 1; }));
    yy += line.h + 1;
  });
  const rtl = hasArabic(text);
  // colour by connected pieces; tiny pieces (dots) take the colour of the nearest big piece
  const lab = Array.from({length: H}, () => new Int32Array(W).fill(-1));
  const comps = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    if (!mask[y][x] || lab[y][x] >= 0) continue;
    const id = comps.length, q = [[x, y]], cells = []; lab[y][x] = id;
    while (q.length){
      const [cx, cy] = q.pop(); cells.push([cx, cy]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && mask[ny][nx] && lab[ny][nx] < 0){ lab[ny][nx] = id; q.push([nx, ny]); }
      }
    }
    const mx = cells.reduce((a, c) => a + c[0], 0) / cells.length, my = cells.reduce((a, c) => a + c[1], 0) / cells.length;
    comps.push({id, cells, mx, my, big: cells.length >= Math.max(6, best.fs * .9)});
  }
  const bigs = comps.filter(c => c.big).sort((a, b) => rtl ? b.mx - a.mx : a.mx - b.mx);
  bigs.forEach((c, i) => { c.color = cl[i % cl.length]; });
  comps.filter(c => !c.big).forEach(c => {
    let near = bigs[0], d = 1e9;
    for (const b of bigs){ const dd = (b.mx - c.mx) ** 2 + (b.my - c.my) ** 2 * .3; if (dd < d){ d = dd; near = b; } }
    c.color = near ? near.color : cl[0];
  });
  const pix = Array.from({length: H}, () => Array(W).fill(null));
  comps.forEach(c => c.cells.forEach(([x, y]) => { pix[y][x] = c.color; }));
  const bricks = decompose(pix).map(b => ({...b, delay: (rtl ? (W - 1 - b.x) : b.x) * 26 + b.y * 6}));
  const dur = W * 26;
  return {kind: "raster", w: W, h: H, bricks, letters: [], rtl, fs: best.fs, dur};
}
function compose(text, cols, rows, mode, explicit){
  const cl = textColors(mode, explicit);
  const up = text.toUpperCase();
  if (!hasArabic(text) && isPixelText(up)) return composePixel(up, cols, rows, cl);
  return composeRaster(text, cols, rows, cl);
}

/* ---- put text on the board on screen ---- */
function buildText(raw, opts = {}){
  const text = (raw || "").trim().replace(/\s+/g, " ");
  if (!text) return {ok: false, reason: "empty"};
  const up = text.toUpperCase();
  const shown = (!hasArabic(text) && isPixelText(up)) ? up : text;
  // names grow through the normal sizes only; on a photo's Poster board they are written in place
  const startIdx = Math.max(0, SIZES.indexOf(sizeOf()));
  const sizes = opts.grow && !isPhotoBoard() ? SIZES.slice(startIdx) : [sizeOf()];
  let plan = null, size = null;
  for (const s of sizes){
    const p = compose(text, s.cols, s.rows, opts.mode || nameMode, opts.colors);
    if (p && (p.kind === "pixel" || p.fs >= MIN_FS || s === sizes[sizes.length - 1])){ plan = p; size = s; break; }
  }
  if (!plan) return {ok: false, reason: "tooLong"};
  if (!opts.noHistory) pushHistory();
  if (size.cols !== B.cols || size.rows !== B.rows) setSize(size, false);
  rebuildGrid();
  const gx = opts.x != null ? opts.x : Math.floor((B.cols - plan.w) / 2);
  const rel = plan.bricks.map(b => ({...b, x: b.x + gx}));
  let dy;
  if (opts.y != null) dy = opts.y;
  else {
    const mid = Math.floor((B.rows - plan.h) / 2);
    const tries = []; for (let y = 0; y <= B.rows - plan.h; y++) tries.push(y);
    tries.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    const free = opts.overwrite ? null : tries.find(y => rel.every(b => {
      for (let yy = y + b.y; yy < y + b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) if (grid[yy][xx].length) return false;
      return true;
    }));
    dy = free != null ? free : mid;
  }
  const taken = new Set();
  rel.forEach(b => { b.y += dy; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) taken.add(y * 1000 + x); });
  B.bricks = B.bricks.filter(b => {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (taken.has(y * 1000 + x)) return false;
    return true;
  });
  const anim = new Map();
  const st = opts.style || (brickStyle === "round" ? "std" : brickStyle);
  rel.forEach(b => {
    const nb = {id: nextId++, x: b.x, y: b.y, w: b.w, h: b.h, c: b.c, t: st, z: 0};
    B.bricks.push(nb); anim.set(nb.id, opts.fast ? Math.min(b.delay, 300) : b.delay);
  });
  commit(opts.noAnim ? null : anim);
  if (!opts.quiet){
    if (plan.kind === "pixel"){
      plan.letters.forEach(l => setTimeout(() => { sfx.snap(); if (settings.talk && !opts.noSpeak) speak(l.ch === "♥" ? "heart" : l.ch === "★" ? "star" : l.ch, "en"); }, reduceMotion ? 0 : l.delay));
    } else {
      for (let i = 0; i < Math.min(12, plan.w / 3); i++) sfx.soft(i * .08);
    }
    const end = reduceMotion ? 0 : plan.dur + 350;
    if (!opts.noSpeak) setTimeout(() => speak(shown, plan.rtl ? "ar" : "en"), end + (plan.kind === "pixel" ? 150 : 0));
    if (opts.celebrate !== false) setTimeout(() => { sfx.cheer(); confetti(); }, end);
  }
  return {ok: true, text: shown, rtl: plan.rtl, plan, x: gx, y: dy};
}

/* ---- the name form ---- */
function buildName(raw){
  if (typeof currentMode !== "undefined" && currentMode !== "free") setMode("free", true);
  const res = buildText(raw, {grow: true});
  if (!res.ok){
    sfx.nope();
    say(t(res.reason === "empty" ? "typeFirst" : "tooLong"), {speak: true});
    return;
  }
  say(t("nameWow", {n: res.text}));
  emit("nameBuilt", res);
}

/* ---- logo made of bricks ---- */
function buildLogo(){
  const logo = $("#logo");
  const px = window.innerWidth < 520 ? 9 : window.innerWidth < 900 ? 12 : 14;
  const words = ["SNAPPY", "BRICKS"];
  const W = Math.max(...words.map(wordWidth)), H = 11;
  logo.style.setProperty("--cell", px + "px");
  logo.style.width = W * px + "px"; logo.style.height = H * px + 2 + "px";
  logo.innerHTML = "";
  let n = 0;
  words.forEach((word, li) => {
    let x = Math.floor((W - wordWidth(word)) / 2);
    [...word].forEach(ch => {
      const g = glyph(ch); const c = LOGO_COLORS[n++ % LOGO_COLORS.length];
      const pix = g.rows.map(r => [...r].map(p => p === "#" ? c : null));
      decompose(pix).forEach(b => {
        const e = document.createElement("div"); e.className = "brick";
        e.style.left = (x + b.x) * px + .5 + "px"; e.style.top = (li * 6 + b.y) * px + .5 + "px";
        e.style.width = b.w * px - 1 + "px"; e.style.height = b.h * px - 1 + "px";
        paintVars(e, c); logo.appendChild(e);
      });
      x += g.w + 1;
    });
  });
}
