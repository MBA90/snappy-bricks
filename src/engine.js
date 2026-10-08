/* ===================== engine: helpers, board model, rendering ===================== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[(Math.random() * a.length) | 0];
const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const IN_ARTIFACT = !!(window.claude && typeof window.claude.use === "function");
const MAXZ = 5;

function store(key, val){
  try {
    if (val === undefined){ const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
    localStorage.setItem(key, JSON.stringify(val)); return true;
  } catch(e){ return val === undefined ? null : false; }
}

function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (amt > 0){ r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
// light colors (white, yellow, sky...) need dark glitter flecks to show up
function isLight(hex){
  const n = parseInt(hex.slice(1), 16);
  return (n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114 > 200;
}
function sparkColor(c){ return isLight(c) ? shade(c, -.3) : "rgba(255,255,255,.9)"; }
// a second, rainbow-ish fleck so glitter catches the light like the real thing: pink-violet on light bricks, warm gold on the rest
function spark2Color(c){ return isLight(c) ? "rgba(176,92,255,.7)" : "rgba(255,226,140,.95)"; }
// light: the brick's colour mixed with lots of white, a soft pastel (kept as #hex so studs can shade it)
// the soft coloured light round each bulb of a light brick (dark colours lifted, like neon)
function lampColor(c, a){
  const n0 = parseInt(c.slice(1), 16), ch = [n0 >> 16, (n0 >> 8) & 255, n0 & 255];
  if (isLight(c) && Math.max(...ch) - Math.min(...ch) < 40) return `rgba(255,196,80,${a})`;   // white: a warm lamp
  const v = neonColor(c);
  if (v[0] !== "#") return v.replace("rgb(", "rgba(").replace(")", `,${a})`);
  const n = parseInt(v.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function pastel(c){
  const n = parseInt(c.slice(1), 16), m = v => Math.round(v + (255 - v) * .55).toString(16).padStart(2, "0");
  return "#" + m(n >> 16) + m((n >> 8) & 255) + m(n & 255);
}
// neon and glow: dark colors (black, brown) light up brighter so the light still shows
function neonColor(c){
  const n = parseInt(c.slice(1), 16);
  const l = (n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114;
  return l < 90 ? shade(c, .45) : c;
}
function neonGlass(c){ return shade(c, -.8); }
// jelly: the brick's colour see-through like a gummy sweet (a = how solid)
function jellyColor(c, amt, a){
  const v = amt ? shade(c, amt) : c;
  if (v[0] === "#"){ const n = parseInt(v.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  return v.replace("rgb(", "rgba(").replace(")", `,${a})`);
}
// the colour variables every brick, swatch and board needs, worked out once per colour
const varsCache = new Map();
function colorVars(c){
  let v = varsCache.get(c);
  if (!v){ v = [["--c", c], ["--neon", neonColor(c)], ["--glass", neonGlass(c)], ["--lt", shade(c, .3)], ["--dk", shade(c, -.24)], ["--spark", sparkColor(c)], ["--spark2", spark2Color(c)],
    ["--pl", pastel(c)], ["--plt", shade(pastel(c), .45)], ["--pdk", shade(pastel(c), -.16)], ["--glo", lampColor(c, .75)],
    ["--jel", jellyColor(c, 0, .8)], ["--jlt", jellyColor(c, .45, .9)], ["--jdk", jellyColor(c, -.35, .85)], ["--jsh", jellyColor(c, -.45, .4)]]; varsCache.set(c, v); }
  return v;
}
function paintVars(el, c){ for (const [k, v] of colorVars(c)) el.style.setProperty(k, v); }
function colorDist(a, b){
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  return Math.abs((x >> 16) - (y >> 16)) + Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)) + Math.abs((x & 255) - (y & 255));
}
function placeEl(el, b){
  el.style.left   = `calc(var(--cell) * ${b.x} + var(--gap, 1px))`;
  el.style.top    = `calc(var(--cell) * ${b.y} + var(--gap, 1px))`;
  el.style.width  = `calc(var(--cell) * ${b.w} - 2 * var(--gap, 1px))`;
  el.style.height = `calc(var(--cell) * ${b.h} - 2 * var(--gap, 1px))`;
}
// only touches what changed, so redrawing a board of thousands of bricks after one move stays quick
function styleBrickEl(el, b){
  const t = b.t || "std", z = b.z || 0;
  // on a board full of lamps only every fourth one twinkles (.tw), picked by its id so the sparkles stay put;
  // only one electric brick in five zaps (.zp), so a board of them crackles here and there and stays smooth
  if (el._t !== t){ el._t = t; el.className = "brick t-" + t + (t === "light" && b.id % 4 === 1 ? " tw" : "") + (t === "electric" && b.id % 5 === 1 ? " zp" : ""); }
  const pos = b.x + "," + b.y + "," + b.w + "," + b.h;
  if (el._pos !== pos){ el._pos = pos; placeEl(el, b); }
  if (el._c !== b.c){ el._c = b.c; paintVars(el, b.c); }
  if (el._z !== z){ el._z = z; el.style.setProperty("--z", z); el.style.zIndex = 1 + z * 10; }
}

// run fn once things have been quiet for ms: a paint swipe over a big board saves once, not once per brick
function later(fn, ms){
  let tm = 0;
  const run = () => { clearTimeout(tm); tm = 0; fn(); };
  const f = () => { clearTimeout(tm); tm = setTimeout(run, ms); };
  f.flush = () => { if (tm) run(); };
  f.cancel = () => { clearTimeout(tm); tm = 0; };
  return f;
}

/* ---- tiny event bus ---- */
const bus = {};
function on(ev, fn){ (bus[ev] = bus[ev] || []).push(fn); }
function emit(ev, data){ (bus[ev] || []).forEach(fn => { try { fn(data); } catch(e){ console.error(e); } }); }

/* ---- pixel pictures -> bricks ---- */
// pix: 2D array of color strings or null.
// fill a picture with the toy-box brick sizes, biggest first, lying down before standing up
function decompose(pix){
  const H = pix.length, W = H ? pix[0].length : 0;
  const used = pix.map(r => r.map(() => false));
  const shapes = [];
  SHAPES.slice().sort((a, b) => b[0] * b[1] - a[0] * a[1]).forEach(([w, h]) => { shapes.push([w, h]); if (w !== h) shapes.push([h, w]); });
  const fits = (x, y, w, h, c) => {
    if (x + w > W || y + h > H) return false;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (used[y + j][x + i] || pix[y + j][x + i] !== c) return false;
    return true;
  };
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const c = pix[y][x]; if (!c || used[y][x]) continue;
    const [w, h] = shapes.find(([w, h]) => fits(x, y, w, h, c));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[y + j][x + i] = true;
    out.push({x, y, w, h, c});
  }
  return out;
}
// saved work may use styles and sizes that are gone: classic style, and split odd sizes into toy-box bricks
function fitBricks(list){
  const out = [];
  for (const b of list){
    const t = STYLES.some(s => s.id === b.t) ? b.t : "std";
    if (SHAPES.some(([w, h]) => (w === b.w && h === b.h) || (w === b.h && h === b.w))){ out.push({...b, t}); continue; }
    const pix = Array.from({length: b.h}, () => Array(b.w).fill(b.c));
    decompose(pix).forEach((p, k) => out.push({...b, t, x: b.x + p.x, y: b.y + p.y, w: p.w, h: p.h,
      ...(b.id != null ? {id: k ? nextId++ : b.id} : {})}));
  }
  return out;
}
function artToPix(art, recolor){
  return art.split("|").map(r => [...r].map(ch => ch === "." ? null : (recolor || PAL[ch] || "#FBFAF5")));
}

/* ===================== boards ===================== */
// board styles are the brick styles (Classic, Round, Glitter, Glow, Neon, Light) worn by the board itself
const plateStyle = v => STYLES.some(s => s.id === v) ? v : "std";
// the colour a board shows to the eye: neon boards are dark glass whatever their colour
function plateTone(board){ return plateStyle(board.ps) === "neon" ? neonGlass(board.plate) : board.plate; }
function newBoard(cols, rows, plate, ps = "std"){ return {cols, rows, plate, ps, bricks: [], hist: []}; }
let FREE = newBoard(24, 18, "#FF2E8A");
let B = FREE;            // the board on screen
let nextId = 1;
let grid = [];           // grid[y][x] = stack of brick ids, lowest first
const byId = new Map();
let cell = 30;
let boardZoom = 1, zoomMax = 1, zoomDims = "";
const ZOOM_CELL = 40;                               // zooming stops once a stud is this many pixels wide
const CALM_AT = 400;                                // more bricks than this: no endless shimmer, glow or flicker
const LAMPS_AT = 24;                                // more lamp bricks than this: only every fourth one twinkles
const plate = $("#plate");
const els = new Map();

function rebuildGrid(){
  grid = Array.from({length: B.rows}, () => Array.from({length: B.cols}, () => []));
  byId.clear();
  const sorted = [...B.bricks].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const b of sorted){
    byId.set(b.id, b);
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++)
      if (y >= 0 && y < B.rows && x >= 0 && x < B.cols) grid[y][x].push(b.id);
  }
}
function topAt(x, y, ignore){
  const st = grid[y] && grid[y][x]; if (!st) return null;
  for (let i = st.length - 1; i >= 0; i--) if (st[i] !== ignore) return byId.get(st[i]);
  return null;
}
function heightAt(x, y, ignore){ const b = topAt(x, y, ignore); return b ? (b.z || 0) + 1 : 0; }
// Where would these bricks land? {ok, z}
function canPlace(bricks, gx, gy, ignore = 0){
  let base = 0, rel = 0;
  for (const b of bricks){
    rel = Math.max(rel, b.z || 0);
    for (let y = gy + b.y; y < gy + b.y + b.h; y++) for (let x = gx + b.x; x < gx + b.x + b.w; x++){
      if (x < 0 || y < 0 || x >= B.cols || y >= B.rows) return {ok: false, out: true};
      base = Math.max(base, heightAt(x, y, ignore));
    }
  }
  if (settings.stack) return {ok: base + rel < MAXZ, z: base, full: base + rel >= MAXZ};
  return {ok: base === 0, z: 0, taken: base > 0};
}

/* ---- history ---- */
function snapshot(){ return JSON.stringify({cols: B.cols, rows: B.rows, plate: B.plate, ps: B.ps, bricks: B.bricks}); }
function pushHistory(){
  B.hist.push(snapshot()); if (B.hist.length > 60) B.hist.shift();
  updateUndo();
}
function updateUndo(){ const u = $("#undoBtn"); if (u) u.disabled = !B.hist.length; }
function undo(){
  if (!B.hist.length) return;
  const d = JSON.parse(B.hist.pop());
  B.cols = d.cols; B.rows = d.rows; B.plate = d.plate; B.ps = plateStyle(d.ps); B.bricks = d.bricks;
  applyBoard(); commit(); sfx.turn(); updateUndo();
  say(t("undone"));
}

/* ---- rendering ---- */
function commit(anim){ rebuildGrid(); render(anim); emit("change"); }
function render(anim){
  const seen = new Set();
  for (const b of B.bricks){
    let el = els.get(b.id);
    if (!el){
      el = document.createElement("div");
      el.dataset.id = b.id;
      plate.appendChild(el); els.set(b.id, el);
      styleBrickEl(el, b);
      if (anim && anim.has(b.id) && !reduceMotion){
        el.style.animationDelay = anim.get(b.id) + "ms";
        el.classList.add("drop");
        el.addEventListener("animationend", () => { el.classList.remove("drop"); el.style.animationDelay = ""; }, {once: true});
      }
    } else {
      const keep = el._t !== (b.t || "std") ? ["drop", "flash", "flash2", "wiggle", "wiggle2", "selected"].filter(c => el.classList.contains(c)) : null;
      styleBrickEl(el, b); if (keep) keep.forEach(c => el.classList.add(c));
    }
    seen.add(b.id);
  }
  for (const [id, el] of els) if (!seen.has(id)){ el.remove(); els.delete(id); }
  renderAuras(anim);
  const n = B.bricks.length;
  plate.classList.toggle("calm", n > CALM_AT);
  const cnt = $("#count"); if (cnt) cnt.textContent = t(n === 1 ? "oneBrick" : "nBricks", {n});
}
function clearEls(){ for (const el of els.values()) el.remove(); els.clear(); for (const a of auras.values()) a.remove(); auras.clear(); }

/* ---- the soft light round every lamp (Light) brick ----
   All the halos sit in one layer under the bricks, and that one layer breathes. A pulse on each brick
   of its own made the phone redo every lamp on every frame, so boards full of lamps stuttered. */
const auras = new Map();
const auraLayer = document.createElement("div");
auraLayer.className = "auras";
plate.prepend(auraLayer);
function auraFor(id){ return auras.get(id); }
function renderAuras(anim){
  let n = 0; const lit = new Set();
  for (const b of B.bricks){
    if ((b.t || "std") !== "light") continue;
    n++;
    let a = auras.get(b.id);
    if (!a){
      a = document.createElement("div"); a.className = "aura"; auraLayer.appendChild(a); auras.set(b.id, a);
      if (anim && anim.has(b.id) && !reduceMotion){
        a.style.animationDelay = anim.get(b.id) + "ms"; a.classList.add("drop");
        a.addEventListener("animationend", () => { a.classList.remove("drop"); a.style.animationDelay = ""; }, {once: true});
      }
    }
    const pos = b.x + "," + b.y + "," + b.w + "," + b.h;
    if (a._pos !== pos){ a._pos = pos; placeEl(a, b); }
    if (a._c !== b.c){ a._c = b.c; a.style.setProperty("--glo", colorVars(b.c).find(v => v[0] === "--glo")[1]); }
    const z = b.z || 0;
    if (a._z !== z){ a._z = z; a.style.setProperty("--z", z); }
    lit.add(b.id);
  }
  for (const [id, a] of auras) if (!lit.has(id)){ a.remove(); auras.delete(id); }
  plate.classList.toggle("lamps", n > LAMPS_AT);
}
function switchBoard(board){
  if (B === board) return;
  cancelSelection();
  B = board; clearEls(); applyBoard(); commit(); updateUndo();
}
function applyBoard(){
  paintVars(plate, B.plate);
  plate.dataset.ps = plateStyle(B.ps);
  plate.style.width  = `calc(var(--cell) * ${B.cols})`;
  plate.style.height = `calc(var(--cell) * ${B.rows})`;
  fitCell();
  drawMirrorLines();
  emit("board");
}
let refitting = false;
// the studio was hidden, so its bricks have no styles yet: measure with them tucked away and
// style them once at the right size (measuring first used to style hundreds of bricks twice)
let fitStale = true;
function fitCell(){
  const wrap = $("#plateWrap");
  if (!wrap || $("#studioScreen").hidden){ fitStale = true; return; }
  const tuck = fitStale && !refitting;
  fitStale = false;
  if (tuck) plate.style.display = "none";
  try { if (fitBox(wrap) === false) fitStale = true; } finally { if (tuck) plate.style.display = ""; }
}
function fitBox(wrap){
  if (!wrap.offsetParent) return false;              // the studio is not on screen
  wrap.style.setProperty("--cols", B.cols); wrap.style.setProperty("--rows", B.rows);
  // phones lock the studio to the screen and give the board a box of its own: fill that box
  const cs = getComputedStyle(wrap);
  const boxed = cs.getPropertyValue("--fit").trim() === "box";
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const w = boxed ? wrap.clientWidth - padX : wrap.clientWidth - 12;
  // on upright tablets the toy box is a dock fixed to the bottom
  const tray = $("#tray");
  const docked = !!tray && getComputedStyle(tray).position === "fixed";
  const dock = docked ? tray.offsetHeight : 0;
  const below = docked || boxed && getComputedStyle(tray).getPropertyValue("--below").trim() === "1";
  document.body.style.setProperty("--dock-h", (below ? tray.offsetHeight : 0) + "px");
  const H = window.innerHeight;
  const top = wrap.getBoundingClientRect().top + window.scrollY;
  const zb = $("#zoomBar");
  const zbH = !boxed && zb && !zb.hidden && getComputedStyle(zb).position === "static" ? zb.offsetHeight : 0;
  const maxH = boxed ? wrap.clientHeight - padY : Math.max(H * .3, H - top - dock - 22 - zbH);
  const fit = Math.floor(clamp(Math.min(w / B.cols, maxH / B.rows), B.cols > 40 || B.rows > 40 ? 3 : 7, boxed ? 64 : 48));
  // zoom in on big boards on small screens (pinch, or the + / − buttons); a new board size starts fitted
  const dims = B.cols + "x" + B.rows;
  if (dims !== zoomDims){ zoomDims = dims; boardZoom = 1; }
  zoomMax = Math.max(1, ZOOM_CELL / fit);
  boardZoom = clamp(boardZoom, 1, zoomMax);
  if (boardZoom < 1.05) boardZoom = 1;
  const zoomed = boardZoom > 1;
  cell = zoomed ? Math.round(fit * boardZoom) : fit;
  wrap.classList.toggle("zoomed", zoomed);
  wrap.style.height = zoomed && !boxed ? (fit * B.rows + 28) + "px" : "";
  plate.style.setProperty("--cell", cell + "px");
  plate.classList.toggle("tiny", cell < 7);          // huge photo boards: plain tiles read better than tiny studs
  if (zb){
    const hide = zoomMax < 1.6;                       // only when the studs are small enough to be fiddly
    // showing or hiding the zoom buttons changes the board's box: fit once more
    if (zb.hidden !== hide){ zb.hidden = hide; if (boxed && !refitting){ refitting = true; fitCell(); refitting = false; } }
  }
  updateZoomBtns();
}
// the board's box changes size when a game panel or the selection bar comes and goes
if (window.ResizeObserver){
  let lastBox = "";
  new ResizeObserver(([e]) => {
    const box = Math.round(e.contentRect.width) + "x" + Math.round(e.contentRect.height);
    if (box === lastBox) return; lastBox = box;
    if (getComputedStyle(e.target).getPropertyValue("--fit").trim() === "box") requestAnimationFrame(fitCell);
  }).observe($("#plateWrap"));
}

/* ---- helper speech bubble ---- */
function say(text, opts = {}){
  $("#bubble").textContent = text;
  // two copies of the hop take turns, so it restarts without making the page work out its layout in the middle of a tap
  const b = $("#bricky"), again = b.classList.contains("hop");
  b.classList.remove("hop", "hop2"); b.classList.add(again ? "hop2" : "hop");
  if (opts.speak) speakHelper(text);
}

/* ===================== sound ===================== */
let actx = null;
function ac(){
  if (!settings.sound) return null;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
  } catch(e){ return null; }
  return actx;
}
function tone(f1, f2, dur, type = "sine", vol = .2, delay = 0){
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(Math.max(40, f2), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
}
const sfx = {
  snap(d = 0){ tone(1500, 600, .04, "square", .05, d); tone(320, 110, .09, "sine", .28, d); },
  soft(d = 0){ tone(900, 500, .03, "square", .025, d); tone(260, 120, .06, "sine", .12, d); },
  remove(){ tone(620, 180, .16, "triangle", .18); },
  turn(){ tone(620, 980, .08, "triangle", .14); },
  paint(){ tone(880, 1320, .06, "sine", .12); },
  nope(){ tone(210, 150, .14, "square", .06); },
  whoosh(){ tone(900, 120, .35, "sawtooth", .05); },
  cheer(d = 0){ [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, .18, "triangle", .16, d + i * .09)); },
  badge(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, .14, "sine", .14, i * .07)); },
  click(){ tone(700, 700, .03, "sine", .08); },
  fill(){ [400, 500, 600, 800].forEach((f, i) => tone(f, f * 1.2, .06, "sine", .1, i * .04)); },
};

/* ===================== confetti ===================== */
function confetti(){
  if (reduceMotion) return;
  const cv = document.createElement("canvas"); cv.className = "confetti";
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; document.body.appendChild(cv);
  const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
  const cols = ["#F2383A", "#FF9A1F", "#FFE838", "#3DC45A", "#2F8CF0", "#8A4DE0", "#FFB3CF", "#7FE3C0", "#FFFFFF"];
  const parts = Array.from({length: 140}, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * innerWidth * .5, y: innerHeight * .35,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 8 + Math.random() * 10,
    r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: pick(cols), wide: Math.random() < .5
  }));
  const t0 = performance.now();
  (function frame(tm){
    const k = (tm - t0) / 1800;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts){
      p.vy += .45; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - k * k);
      const w = p.wide ? p.s * 2 : p.s, h = p.s;
      ctx.fillStyle = p.c; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      for (let i = 0; i < (p.wide ? 2 : 1); i++){ ctx.beginPath(); ctx.arc(-w / 2 + p.s * (i + .5), 0, p.s * .28, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    if (k < 1) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

/* ===================== picture drawing (canvas) ===================== */
function rrect(ctx, x, y, w, h, r){
  w = Math.max(0, w); h = Math.max(0, h);
  r = Math.max(0, Math.min(r, w / 2, h / 2));          // a negative radius throws
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// matches the CSS studs: cast shadow, side wall, lit rim, top face, gloss (light from the top left).
// Each kind of stud is drawn once into a little tile and then stamped, which keeps big pictures quick.
const studTiles = new Map();
function stud(ctx, x, y, c, col, flat){
  const key = c + "|" + col + "|" + (flat ? 1 : 0);
  let tile = studTiles.get(key);
  if (!tile){
    if (studTiles.size > 300) studTiles.clear();
    const s = Math.ceil(c);
    tile = document.createElement("canvas"); tile.width = s; tile.height = s;
    drawStud(tile.getContext("2d"), 0, 0, c, col, flat);
    studTiles.set(key, tile);
  }
  ctx.drawImage(tile, x, y);
}
function drawStud(ctx, x, y, c, col, flat){
  const cx = x + c * .5, cy = y + c * .5, r = c * (flat ? .22 : .24);
  const sh = ctx.createRadialGradient(x + c * (flat ? .55 : .56), y + c * (flat ? .59 : .61), 0, x + c * (flat ? .55 : .56), y + c * (flat ? .59 : .61), c * (flat ? .29 : .32));
  sh.addColorStop(0, `rgba(30,10,50,${flat ? .24 : .34})`); sh.addColorStop(.7, `rgba(30,10,50,${flat ? .24 : .34})`); sh.addColorStop(1, "rgba(30,10,50,0)");
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x + c * (flat ? .55 : .56), y + c * (flat ? .59 : .61), c * (flat ? .29 : .32), 0, 7); ctx.fill();
  ctx.fillStyle = shade(col, -.24); ctx.beginPath(); ctx.arc(x + c * .52, y + c * .54, r + c * .005, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${flat ? .5 : .75})`; ctx.beginPath(); ctx.arc(x + c * .48, y + c * .475, r, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, shade(col, .3)); g.addColorStop(flat ? .36 : .5, shade(col, .3)); g.addColorStop(1, col);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r - c * .005, 0, 7); ctx.fill();
  if (!flat){
    // the faint embossed ring on top of a real stud
    ctx.strokeStyle = shade(col, .3); ctx.lineWidth = c * .012;
    ctx.beginPath(); ctx.arc(cx, cy, c * .163, 0, 7); ctx.stroke();
  }
  const gx = x + c * .41, gy = y + c * .37, gr = c * (flat ? .09 : .1);
  const gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
  gl.addColorStop(0, `rgba(255,255,255,${flat ? .55 : .9})`); gl.addColorStop(.3, `rgba(255,255,255,${flat ? .55 : .9})`); gl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 7); ctx.fill();
}
// the soft top-left-to-bottom-right light across a whole brick or board
function sheen(ctx, x, y, w, h, a, b){
  const g = ctx.createLinearGradient(x, y, x + w * .42, y + h);
  g.addColorStop(0, `rgba(255,255,255,${a * 1.38})`); g.addColorStop(.14, `rgba(255,255,255,${a * .54})`); g.addColorStop(.42, "rgba(255,255,255,0)");
  g.addColorStop(.62, "rgba(30,10,60,0)"); g.addColorStop(1, `rgba(30,10,60,${b})`);
  return g;
}
// a gummy stud: a soft shadow, a see-through dome darker at its rim, and a bright gloss dot (r: dome size in studs)
function jellyStud(ctx, sx, sy, c, col, r){
  const sh = ctx.createRadialGradient(sx + c * .05, sy + c * .09, 0, sx + c * .05, sy + c * .09, c * .29);
  sh.addColorStop(0, "rgba(30,10,50,.2)"); sh.addColorStop(.7, "rgba(30,10,50,.2)"); sh.addColorStop(1, "rgba(30,10,50,0)");
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(sx + c * .05, sy + c * .09, c * .29, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, c * r);
  g.addColorStop(0, jellyColor(col, .45, .9)); g.addColorStop(.5, jellyColor(col, .45, .9)); g.addColorStop(.88, jellyColor(col, 0, .85)); g.addColorStop(1, jellyColor(col, -.35, .9));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, c * r, 0, 7); ctx.fill();
  const gx = sx - c * .1, gy = sy - c * .14, gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, c * .085);
  gl.addColorStop(0, "rgba(255,255,255,.95)"); gl.addColorStop(.4, "rgba(255,255,255,.95)"); gl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(gx, gy, c * .085, 0, 7); ctx.fill();
}
// a stud like a little plasma ball: white-hot middle, glowing in the brick's colour, a thin white ring (k: brightness size)
function plasmaStud(ctx, sx, sy, c, col, k){
  ctx.fillStyle = shade(col, -.24); ctx.beginPath(); ctx.arc(sx, sy, c * .25 * k, 0, 7); ctx.fill();
  const r = c * .215 * k, g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  g.addColorStop(0, "#fff"); g.addColorStop(.26, "#fff"); g.addColorStop(.42, shade(col, .3)); g.addColorStop(.74, neonColor(col)); g.addColorStop(1, shade(col, -.24));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = c * .016; ctx.beginPath(); ctx.arc(sx, sy, c * .22 * k, 0, 7); ctx.stroke();
}
// the lightning crack across an electric brick (the same zigzag as --crack in styles8.css)
const CRACK = [[-.02, .24], [.3, .56], [.42, .3], [.72, .7], [1.02, .38]];
function crack(ctx, x, y, w, h, c){
  ctx.beginPath(); CRACK.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + px * w, y + py * h));
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255,214,40,.55)"; ctx.lineWidth = Math.max(2, c * .13); ctx.stroke();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, c * .045); ctx.stroke();
}
// a little lightning bolt between the studs of an electric board (the same as --bolts in styles8.css), c = one stud
const BOLT = [[110, 62], [82, 106], [100, 106], [88, 140], [120, 92], [102, 92], [114, 62]];
function bolt(ctx, x, y, c){
  ctx.beginPath(); BOLT.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + px * c / 100, y + py * c / 100)); ctx.closePath();
  ctx.fillStyle = "#FFF39A"; ctx.fill();
  ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(70,30,0,.45)"; ctx.lineWidth = c * .03; ctx.stroke();
}
// the board under the bricks in each board style (matches styles7.css; Classic is the plain board)
function drawPlate(ctx, board, ox, oy, c){
  const bw = board.cols * c, bh = board.rows * c, ps = plateStyle(board.ps), col = board.plate;
  const rad = ps === "round" ? c * .9 : ps === "jelly" ? c * .6 : c * .3, path = () => rrect(ctx, ox, oy, bw, bh, rad);
  const each = fn => { for (let y = 0; y < board.rows; y++) for (let x = 0; x < board.cols; x++) fn(ox + (x + .5) * c, oy + (y + .5) * c, x, y); };
  // glow, neon, light and electric boards shine out past their edge in their own colour
  if (ps === "glow" || ps === "neon" || ps === "light" || ps === "electric"){
    ctx.save(); ctx.shadowColor = ps === "light" ? lampColor(col, .75) : neonColor(col); ctx.shadowBlur = c * (ps === "neon" || ps === "electric" ? .8 : 1.1);
    ctx.fillStyle = ps === "neon" ? neonGlass(col) : col; path(); ctx.fill(); ctx.restore();
  }
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = ps === "neon" ? neonGlass(col) : ps === "light" ? pastel(col) : col; ctx.fillRect(ox, oy, bw, bh);
  if (ps === "glow"){
    const g = ctx.createRadialGradient(ox + bw / 2, oy + bh * .45, 0, ox + bw / 2, oy + bh * .45, Math.max(bw, bh) * .62);
    g.addColorStop(0, "rgba(255,255,255,.8)"); g.addColorStop(.45, shade(col, .3)); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fillRect(ox, oy, bw, bh);
  } else if (ps === "neon"){
    ctx.fillStyle = sheen(ctx, ox, oy, bw, bh, .14, 0); ctx.fillRect(ox, oy, bw, bh);
  } else if (ps === "jelly"){
    const vg = ctx.createLinearGradient(ox, oy, ox, oy + bh);
    vg.addColorStop(0, "rgba(255,255,255,.22)"); vg.addColorStop(.3, "rgba(255,255,255,0)"); vg.addColorStop(.78, "rgba(255,255,255,0)"); vg.addColorStop(1, "rgba(255,255,255,.16)");
    ctx.fillStyle = vg; ctx.fillRect(ox, oy, bw, bh);
    ctx.save(); ctx.translate(ox + bw * .3, oy + bh * .09); ctx.scale(bw * .55, bh * .2);
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gl.addColorStop(0, "rgba(255,255,255,.7)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gl; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  } else if (ps === "electric"){
    const g = ctx.createRadialGradient(ox + bw / 2, oy + bh * .45, 0, ox + bw / 2, oy + bh * .45, Math.max(bw, bh) * .7);
    g.addColorStop(0, shade(col, .3)); g.addColorStop(.65, col); g.addColorStop(1, shade(col, -.24));
    ctx.fillStyle = g; ctx.fillRect(ox, oy, bw, bh);
    for (let ty = 0; ty < board.rows; ty += 3) for (let tx = 0; tx < board.cols; tx += 4){ bolt(ctx, ox + tx * c, oy + ty * c, c); bolt(ctx, ox + (tx + 2) * c, oy + (ty + 1) * c, c); }
  } else if (ps === "light"){
    const wg = ctx.createLinearGradient(ox, oy, ox + bw * .17, oy + bh);
    wg.addColorStop(0, "rgba(255,255,255,.55)"); wg.addColorStop(.5, "rgba(255,255,255,0)");
    ctx.fillStyle = wg; ctx.fillRect(ox, oy, bw, bh);
  } else {
    ctx.fillStyle = sheen(ctx, ox, oy, bw, bh, .14, .1); ctx.fillRect(ox, oy, bw, bh);
  }
  if (ps === "round"){
    // a pillow: lit on the top left, a darker rim
    const dg = ctx.createRadialGradient(ox + bw * .3, oy + bh * .22, 0, ox + bw * .3, oy + bh * .22, Math.max(bw, bh) * .75);
    dg.addColorStop(0, "rgba(255,255,255,.3)"); dg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = dg; ctx.fillRect(ox, oy, bw, bh);
    ctx.save(); ctx.translate(ox + bw / 2, oy + bh / 2); ctx.scale(bw / 2, bh / 2);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); rg.addColorStop(.8, "rgba(30,10,60,0)"); rg.addColorStop(1, "rgba(30,10,60,.14)");
    ctx.fillStyle = rg; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  }
  if (ps === "glitter"){
    // flecks under the studs, seeded so the same board always gets the same glitter
    let sd = board.cols * 7919 + board.rows * 104729;
    const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280), n = board.cols * board.rows;
    for (const [m, r, f] of [[7, .03, sparkColor(col)], [4, .02, spark2Color(col)], [6, .014, "rgba(255,255,255,.75)"]]){
      ctx.fillStyle = f;
      for (let i = 0; i < n * m; i++){ ctx.beginPath(); ctx.arc(ox + rnd() * bw, oy + rnd() * bh, c * r * (.7 + rnd() * .6), 0, 7); ctx.fill(); }
    }
  }
  // a little depth at the board's edges (a lit rim on the light board, a glowing tube on neon)
  if (ps === "light"){
    ctx.shadowColor = "rgba(255,255,255,.9)"; ctx.shadowBlur = c * 1.4; ctx.lineWidth = c; ctx.strokeStyle = "rgba(255,255,255,.5)";
  } else if (ps === "neon"){
    ctx.shadowColor = neonColor(col); ctx.shadowBlur = c * .8; ctx.lineWidth = c * .24; ctx.strokeStyle = neonColor(col);
  } else if (ps === "jelly"){
    ctx.shadowColor = jellyColor(col, -.35, .85); ctx.shadowBlur = c * 1.6; ctx.lineWidth = c; ctx.strokeStyle = jellyColor(col, -.35, .35);
  } else if (ps === "electric"){
    ctx.shadowColor = "rgba(255,255,255,.9)"; ctx.shadowBlur = c * .9; ctx.lineWidth = c * .12; ctx.strokeStyle = "rgba(255,255,255,.85)";
  } else {
    ctx.shadowColor = "rgba(20,5,40,.32)"; ctx.shadowBlur = c * 1.4; ctx.lineWidth = c; ctx.strokeStyle = "rgba(20,5,40,.16)";
  }
  if (ps === "neon" || ps === "electric"){ path(); ctx.stroke(); ctx.stroke(); }
  else { rrect(ctx, ox - c / 2, oy - c / 2, bw + c, bh + c, rad + c * .5); ctx.stroke(); }
  ctx.restore();
  if (ps === "neon"){
    // the tube's white-hot core, then ring studs (dimmer than a neon brick's, so bricks stay the brightest)
    const nc = neonColor(col);
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = Math.max(1, c * .03);
    rrect(ctx, ox + c * .04, oy + c * .04, bw - c * .08, bh - c * .08, rad - c * .04); ctx.stroke();
    ctx.strokeStyle = nc; ctx.lineWidth = c * .03; ctx.beginPath(); each((sx, sy) => { ctx.moveTo(sx + c * .175, sy); ctx.arc(sx, sy, c * .175, 0, 7); }); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = c * .015; ctx.beginPath(); each((sx, sy) => { ctx.moveTo(sx + c * .138, sy); ctx.arc(sx, sy, c * .138, 0, 7); }); ctx.stroke();
  } else if (ps === "light"){
    // every stud a little bulb, drawn once and stamped
    const key = "bulb|" + c + "|" + col;
    let tile = studTiles.get(key);
    if (!tile){
      const s = Math.ceil(c); tile = document.createElement("canvas"); tile.width = s; tile.height = s;
      const tc = tile.getContext("2d"), m = c / 2;
      const bg = tc.createRadialGradient(m, m, 0, m, m, c * .32);
      bg.addColorStop(0, "#fff"); bg.addColorStop(.19, "#fff"); bg.addColorStop(.31, "rgba(255,255,255,.85)");
      bg.addColorStop(.56, lampColor(col, .75)); bg.addColorStop(1, "rgba(255,255,255,0)");
      tc.fillStyle = bg; tc.beginPath(); tc.arc(m, m, c * .32, 0, 7); tc.fill();
      tc.strokeStyle = "rgba(255,255,255,.7)"; tc.lineWidth = c * .015; tc.beginPath(); tc.arc(m, m, c * .222, 0, 7); tc.stroke();
      studTiles.set(key, tile);
    }
    each((sx, sy) => ctx.drawImage(tile, sx - c / 2, sy - c / 2));
  } else if (ps === "jelly" || ps === "electric"){
    // gummy or plasma studs, drawn once and stamped
    const key = ps + "|" + c + "|" + col;
    let tile = studTiles.get(key);
    if (!tile){
      const s = Math.ceil(c); tile = document.createElement("canvas"); tile.width = s; tile.height = s;
      const tc = tile.getContext("2d");
      if (ps === "jelly") jellyStud(tc, c / 2, c / 2, c, col, .21); else plasmaStud(tc, c / 2, c / 2, c, col, .88);
      studTiles.set(key, tile);
    }
    each((sx, sy) => ctx.drawImage(tile, sx - c / 2, sy - c / 2));
  } else each((sx, sy) => stud(ctx, sx - c / 2, sy - c / 2, c, col, true));
  if (ps === "glitter"){
    // a few twinkles caught mid-sparkle
    let sd = board.cols * 31 + board.rows * 17;
    const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
    ctx.save(); ctx.fillStyle = "#fff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = c * .2;
    for (let i = 0; i < Math.round(board.cols * board.rows / 9); i++){
      const kx = ox + rnd() * bw, ky = oy + rnd() * bh, kr = c * (.12 + rnd() * .1);
      ctx.beginPath(); ctx.moveTo(kx, ky - kr); ctx.quadraticCurveTo(kx, ky, kx + kr, ky); ctx.quadraticCurveTo(kx, ky, kx, ky + kr);
      ctx.quadraticCurveTo(kx, ky, kx - kr, ky); ctx.quadraticCurveTo(kx, ky, kx, ky - kr); ctx.fill();
    }
    ctx.restore();
  }
}
function drawBoard(ctx, board, ox, oy, c){
  drawPlate(ctx, board, ox, oy, c);
  const list = [...board.bricks].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const b of list){
    const z = b.z || 0, t = b.t || "std";
    // the gap between bricks shrinks on tiny pictures (thumbnails of big boards), so 1×1 bricks still show
    const gap = Math.min(1.5, c * .2);
    const x = ox + b.x * c + gap - z * 2, y = oy + b.y * c + gap - z * 3, w = b.w * c - 2 * gap, h = b.h * c - 2 * gap;
    const rad = t === "round" ? Math.min(w, h) / 2 : t === "jelly" ? c * .32 : t === "light" ? c * .24 : c * .14;
    const col = t === "light" ? pastel(b.c) : b.c;       // light bricks are drawn in their pastel
    ctx.save();
    ctx.save(); ctx.shadowColor = t === "light" ? "rgba(30,10,60,.2)" : "rgba(30,10,60,.34)"; ctx.shadowBlur = (t === "light" ? 8 : 4) + z * 3;
    ctx.shadowOffsetX = 1 + z; ctx.shadowOffsetY = (t === "light" ? 4 : 3) + z * 3;
    ctx.fillStyle = "rgba(30,10,60,.2)"; rrect(ctx, x, y, w, h, rad); ctx.fill(); ctx.restore();
    if (t === "neon"){
      // dark glass, a glowing tube of light round the edge with a white-hot core, and ring studs
      const nc = neonColor(b.c), lw = Math.max(2, c * .07);
      ctx.fillStyle = neonGlass(b.c); rrect(ctx, x, y, w, h, rad); ctx.fill();
      ctx.fillStyle = sheen(ctx, x, y, w, h, .16, 0); rrect(ctx, x, y, w, h, rad); ctx.fill();
      // a thin streak of reflection across the glass
      const rf = ctx.createLinearGradient(x, y, x + w, y + h * .58);
      rf.addColorStop(.58, "rgba(255,255,255,0)"); rf.addColorStop(.58, "rgba(255,255,255,.09)");
      rf.addColorStop(.66, "rgba(255,255,255,.09)"); rf.addColorStop(.66, "rgba(255,255,255,0)");
      ctx.fillStyle = rf; rrect(ctx, x, y, w, h, rad); ctx.fill();
      ctx.save(); ctx.shadowColor = nc; ctx.shadowBlur = c * .45; ctx.strokeStyle = nc; ctx.lineWidth = lw;
      rrect(ctx, x + lw / 2, y + lw / 2, w - lw, h - lw, Math.max(0, rad - lw / 2)); ctx.stroke(); ctx.stroke();
      ctx.lineWidth = Math.max(1, c * .025); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.shadowBlur = 0;
      rrect(ctx, x + c * .025, y + c * .025, w - c * .05, h - c * .05, Math.max(0, rad - c * .025)); ctx.stroke();
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++){
        const sx = x - gap + (xx + .5) * c, sy = y - gap + (yy + .5) * c;
        ctx.shadowColor = nc; ctx.shadowBlur = c * .2;
        ctx.strokeStyle = nc; ctx.lineWidth = c * .065; ctx.beginPath(); ctx.arc(sx, sy, c * .185, 0, 7); ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = c * .028;
        ctx.beginPath(); ctx.arc(sx, sy, c * .14, 0, 7); ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
      continue;
    }
    if (t === "jelly"){
      // see-through gummy: darker where the light bends at the edge, a glossy top, squishy studs
      ctx.fillStyle = jellyColor(b.c, 0, .8); rrect(ctx, x, y, w, h, rad); ctx.fill();
      ctx.save(); rrect(ctx, x, y, w, h, rad); ctx.clip();
      const eg = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * .28, x + w / 2, y + h / 2, Math.max(w, h) * .75);
      eg.addColorStop(0, jellyColor(b.c, -.35, 0)); eg.addColorStop(1, jellyColor(b.c, -.35, .7));
      ctx.fillStyle = eg; ctx.fillRect(x, y, w, h);
      const vg = ctx.createLinearGradient(x, y, x, y + h);
      vg.addColorStop(0, "rgba(255,255,255,.28)"); vg.addColorStop(.38, "rgba(255,255,255,0)"); vg.addColorStop(.72, "rgba(255,255,255,0)"); vg.addColorStop(1, "rgba(255,255,255,.2)");
      ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);
      ctx.translate(x + w * .27, y + h * .19); ctx.scale(w * .4, h * .26);
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gl.addColorStop(0, "rgba(255,255,255,.75)"); gl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gl; ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) jellyStud(ctx, x - gap + (xx + .5) * c, y - gap + (yy + .5) * c, c, b.c, .215);
      ctx.strokeStyle = "rgba(30,10,60,.16)"; ctx.lineWidth = 1;
      rrect(ctx, x - .5, y - .5, w + 1, h + 1, rad); ctx.stroke();
      ctx.restore();
      continue;
    }
    if (t === "electric"){
      // charged up: a halo, bright in the middle, a lightning crack across, plasma-ball studs and a white-hot edge
      ctx.save(); ctx.shadowColor = neonColor(b.c); ctx.shadowBlur = c * .3;
      ctx.fillStyle = b.c; rrect(ctx, x, y, w, h, rad); ctx.fill(); ctx.restore();
      const g = ctx.createRadialGradient(x + w / 2, y + h * .45, 0, x + w / 2, y + h * .45, Math.max(w, h) * .7);
      g.addColorStop(0, shade(b.c, .3)); g.addColorStop(.6, b.c); g.addColorStop(1, shade(b.c, -.24));
      ctx.fillStyle = g; rrect(ctx, x, y, w, h, rad); ctx.fill();
      ctx.save(); rrect(ctx, x, y, w, h, rad); ctx.clip();
      crack(ctx, x, y, w, h, c);
      ctx.restore();
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) plasmaStud(ctx, x - gap + (xx + .5) * c, y - gap + (yy + .5) * c, c, b.c, 1);
      const lw = Math.max(1, c * .035);
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = lw;
      rrect(ctx, x + lw / 2, y + lw / 2, w - lw, h - lw, Math.max(0, rad - lw / 2)); ctx.stroke();
      ctx.strokeStyle = "rgba(30,10,60,.3)"; ctx.lineWidth = 1;
      rrect(ctx, x - .5, y - .5, w + 1, h + 1, rad); ctx.stroke();
      ctx.restore();
      continue;
    }
    if (t === "glow"){
      // soft halo in the brick's own color (lifted for dark bricks), then a body that is white-hot in the middle
      ctx.save(); ctx.shadowColor = neonColor(b.c); ctx.shadowBlur = c * .55;
      ctx.fillStyle = b.c; rrect(ctx, x, y, w, h, rad); ctx.fill();
      ctx.restore();
      ctx.fillStyle = shade(b.c, -.24); rrect(ctx, x, y, w, h, rad); ctx.fill();
      const g = ctx.createRadialGradient(x + w / 2, y + h * .45, 0, x + w / 2, y + h * .45, Math.max(w, h) * .6);
      g.addColorStop(0, "rgba(255,255,255,.92)"); g.addColorStop(.42, shade(b.c, .3)); g.addColorStop(1, b.c);
      ctx.fillStyle = g; rrect(ctx, x, y, w, h - c * .07, rad); ctx.fill();
    } else {
      if (t === "light"){
        // the lamp's soft coloured aura, then a frosted wash from the top and a soft white inner rim
        ctx.save(); ctx.shadowColor = lampColor(b.c, .75); ctx.shadowBlur = c * .6;
        ctx.fillStyle = col; rrect(ctx, x, y, w, h, rad); ctx.fill(); ctx.restore();
        ctx.fillStyle = shade(col, -.16); rrect(ctx, x, y, w, h, rad); ctx.fill();
        ctx.fillStyle = col; rrect(ctx, x, y, w, h - c * .07, rad); ctx.fill();
        const ig = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * .25, x + w / 2, y + h / 2, Math.max(w, h) * .72);
        ig.addColorStop(0, "rgba(255,255,255,0)"); ig.addColorStop(1, "rgba(255,255,255,.6)");
        ctx.fillStyle = ig; rrect(ctx, x, y, w, h, rad); ctx.fill();
        const wg = ctx.createLinearGradient(x, y, x + w * .17, y + h);
        wg.addColorStop(0, "rgba(255,255,255,.55)"); wg.addColorStop(.45, "rgba(255,255,255,0)");
        ctx.fillStyle = wg; rrect(ctx, x, y, w, h, rad); ctx.fill();
        const lw = Math.max(1, c * .04);
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = lw;
        rrect(ctx, x + lw / 2, y + lw / 2, w - lw, h - lw, Math.max(0, rad - lw / 2)); ctx.stroke();
      } else {
        ctx.fillStyle = shade(col, -.24); rrect(ctx, x, y, w, h, rad); ctx.fill();
        ctx.fillStyle = col; rrect(ctx, x, y, w, h - c * .09, rad); ctx.fill();
        ctx.fillStyle = sheen(ctx, x, y, w, h, .26, .12); rrect(ctx, x, y, w, h, rad); ctx.fill();
        if (t === "round"){
          // domed button: a highlight on the top left and a darker rim
          const cx = x + w / 2, cy = y + h / 2;
          const dg = ctx.createRadialGradient(x + w * .34, y + h * .28, 0, x + w * .34, y + h * .28, Math.max(w, h) * .7);
          dg.addColorStop(0, "rgba(255,255,255,.34)"); dg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = dg; rrect(ctx, x, y, w, h, rad); ctx.fill();
          ctx.save(); rrect(ctx, x, y, w, h, rad); ctx.clip(); ctx.translate(cx, cy); ctx.scale(w / 2, h / 2);
          const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
          rg.addColorStop(.72, "rgba(30,10,60,0)"); rg.addColorStop(1, "rgba(30,10,60,.16)");
          ctx.fillStyle = rg; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
        }
        // bevels that grow with the brick: lit top and left edges, a shaded right edge
        const bt = Math.max(1.5, c * .05), bl = Math.max(1.5, c * .04);
        ctx.save(); rrect(ctx, x, y, w, h, rad); ctx.clip();
        ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(x, y, w, bt);
        ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(x, y + bt, bl, h - bt);
        ctx.fillStyle = "rgba(30,10,60,.1)"; ctx.fillRect(x + w - bl, y, bl, h);
        ctx.restore();
      }
    }
    if (t === "glitter"){
      // fine flecks under the studs, sized to the stud grid (like the board)
      let s = b.id * 9301 + 49297;
      const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      ctx.save(); rrect(ctx, x, y, w, h - c * .09, rad); ctx.clip();
      ctx.fillStyle = sparkColor(b.c);
      for (let i = 0; i < b.w * b.h * 12; i++){ ctx.beginPath(); ctx.arc(x + rnd() * w, y + rnd() * h, c * (.018 + rnd() * .022), 0, 7); ctx.fill(); }
      ctx.fillStyle = spark2Color(b.c);
      for (let i = 0; i < b.w * b.h * 8; i++){ ctx.beginPath(); ctx.arc(x + rnd() * w, y + rnd() * h, c * (.014 + rnd() * .012), 0, 7); ctx.fill(); }
      ctx.fillStyle = "rgba(255,255,255,.75)";
      for (let i = 0; i < b.w * b.h * 10; i++){ ctx.beginPath(); ctx.arc(x + rnd() * w, y + rnd() * h, c * .014, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    if (t === "light"){
      // each stud is a glowing bulb, and a sparkle twinkles on the top corner
      const glo = lampColor(b.c, .75);
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++){
        const sx = x - gap + (xx + .5) * c, sy = y - gap + (yy + .5) * c;
        const bg = ctx.createRadialGradient(sx, sy, 0, sx, sy, c * .38);
        bg.addColorStop(0, "#fff"); bg.addColorStop(.21, "#fff"); bg.addColorStop(.32, "rgba(255,255,255,.95)");
        bg.addColorStop(.53, glo); bg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(sx, sy, c * .38, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = c * .018;
        ctx.beginPath(); ctx.arc(sx, sy, c * .232, 0, 7); ctx.stroke();
      }
      const kx = LANG === "ar" ? x + c * .13 : x + w - c * .13, ky = y + c * .13, kr = c * .25;
      ctx.save(); ctx.shadowColor = glo; ctx.shadowBlur = 3; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(kx, ky - kr); ctx.quadraticCurveTo(kx, ky, kx + kr, ky); ctx.quadraticCurveTo(kx, ky, kx, ky + kr);
      ctx.quadraticCurveTo(kx, ky, kx - kr, ky); ctx.quadraticCurveTo(kx, ky, kx, ky - kr); ctx.fill(); ctx.restore();
    } else for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) stud(ctx, x - gap + xx * c, y - gap + yy * c, c, col);
    // faint outline so light bricks read on light boards
    ctx.strokeStyle = "rgba(30,10,60,.2)"; ctx.lineWidth = 1;
    rrect(ctx, x - .5, y - .5, w + 1, h + 1, rad); ctx.stroke();
    ctx.restore();
  }
}
function boardCanvas(board, c = 40, opts = {}){
  const pad = opts.pad != null ? opts.pad : 36, foot = opts.foot != null ? opts.foot : 58;
  const W = board.cols * c + pad * 2, H = board.rows * c + pad * 2 + foot;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  if (!opts.transparent){ ctx.fillStyle = opts.bg || "#5CC6FF"; ctx.fillRect(0, 0, W, H); }
  if (pad > 0){ ctx.fillStyle = "#2B1E5C"; rrect(ctx, pad - 4, pad - 4, board.cols * c + 8, board.rows * c + 14, c * .4); ctx.fill(); }
  drawBoard(ctx, board, pad, pad, c);
  if (foot > 0){
    ctx.fillStyle = "#2B1E5C"; ctx.font = `800 ${Math.round(foot * .48)}px "Baloo 2", "Baloo Bhaijaan 2", sans-serif`;
    ctx.textBaseline = "middle"; ctx.direction = LANG === "ar" ? "rtl" : "ltr";
    ctx.textAlign = LANG === "ar" ? "right" : "left";
    ctx.fillText(t("builtWith"), LANG === "ar" ? W - pad : pad, H - foot / 2 - 4);
  }
  return cv;
}
function thumbData(board, size = 180){
  const c = Math.max(3, Math.floor(size / Math.max(board.cols, board.rows)));
  const cv = boardCanvas(board, c, {pad: 0, foot: 0, bg: "#ffffff"});
  try { return cv.toDataURL("image/jpeg", .8); } catch(e){ return ""; }
}
