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
// candy: white stripes, or pink ones on white and pale grey bricks so they still show
function candyStripe(c){
  const n = parseInt(c.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
  return isLight(c) && Math.max(...ch) - Math.min(...ch) < 40 ? "#FF7AB0" : "rgba(255,255,255,.92)";
}
// rainbow: five colours round the colour wheel starting from the brick's own colour; black, white and grey
// have no colour of their own, so they get the usual rainbow from red
function rainbowOf(c, light = 62){
  const n = parseInt(c.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > .16){ h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  const hsl = k => `hsl(${Math.round((h + k * 62 + 360) % 360)},${light < 62 ? 94 : 88}%,${light}%)`;
  return [0, 1, 2, 3, 4].map(hsl);
}
// boards wear their colour thick: more saturated and a little deeper than the colour picked, so the board reads
// as a strong colour under the bricks (near-white boards, like the photo board, stay white)
function richPlate(c){
  const n = parseInt(c.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0, l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  if (d) h = (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  if (l > .9){ l -= .02; } else { s = Math.min(1, s + (1 - s) * .4); l -= l > .35 ? .07 : .02; }
  const k = m => { const v = (m + h / 30) % 12, x = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(v - 3, 9 - v, 1));
    return Math.round(x * 255).toString(16).padStart(2, "0"); };
  return "#" + k(0) + k(8) + k(4);
}
// ice: the brick's colour frozen, mixed with a cold blue-white so every colour reads as ice
function iceColor(c){
  const n = parseInt(c.slice(1), 16), m = (v, w) => Math.round(v + (w - v) * .5).toString(16).padStart(2, "0");
  return "#" + m(n >> 16, 228) + m((n >> 8) & 255, 244) + m(n & 255, 255);
}
// galaxy: deep space with a hint of the brick's colour, and the colour itself as a soft cloud of light (a nebula)
function galaxyColor(c){
  const v = neonColor(c), n = v[0] === "#" ? parseInt(v.slice(1), 16) : null;
  const [r, g, b] = n === null ? v.match(/\d+/g).map(Number) : [n >> 16, (n >> 8) & 255, n & 255];
  const m = (x, w) => Math.round(w + (x - w) * .26).toString(16).padStart(2, "0");
  return "#" + m(r, 18) + m(g, 12) + m(b, 48);
}
function nebulaColor(c, a){ return jellyColor(neonColor(c), 0, a); }
// the pastel of the Light and Candy boards: less white than a light brick's, so the board keeps its colour
function boardPastel(c){
  const n = parseInt(c.slice(1), 16), m = v => Math.round(v + (255 - v) * .3).toString(16).padStart(2, "0");
  return "#" + m(n >> 16) + m((n >> 8) & 255) + m(n & 255);
}
// the colour variables every brick, swatch and board needs, worked out once per colour
const varsCache = new Map();
function colorVars(c){
  let v = varsCache.get(c);
  if (!v){ v = [["--c", c], ["--neon", neonColor(c)], ["--glass", neonGlass(c)], ["--lt", shade(c, .3)], ["--dk", shade(c, -.24)], ["--spark", sparkColor(c)], ["--spark2", spark2Color(c)],
    ["--pl", pastel(c)], ["--plt", shade(pastel(c), .45)], ["--pdk", shade(pastel(c), -.16)], ["--glo", lampColor(c, .75)],
    ["--jel", jellyColor(c, 0, .8)], ["--jlt", jellyColor(c, .45, .9)], ["--jdk", jellyColor(c, -.35, .85)], ["--jsh", jellyColor(c, -.45, .4)],
    ["--cs", candyStripe(c)], ["--ice", iceColor(c)], ["--idk", shade(iceColor(c), -.2)], ["--gx", galaxyColor(c)], ["--gxn", nebulaColor(c, .6)], ["--gxf", nebulaColor(c, .26)], ...rainbowOf(c).map((r, i) => ["--r" + i, r])]; varsCache.set(c, v); }
  return v;
}
function paintVars(el, c){ for (const [k, v] of colorVars(c)) el.style.setProperty(k, v); }
// a board's variables: its rich colour, deeper stud shading, denser pastels, more colour in the neon glass
// and a deeper rainbow
const boardCache = new Map();
function boardVars(c){
  let v = boardCache.get(c);
  if (!v){ const r = richPlate(c), p = boardPastel(r);
    v = [...colorVars(r).filter(([k]) => !/^--(lt|dk|pl|plt|pdk|glass|r\d)$/.test(k)), ["--lt", shade(r, .42)], ["--dk", shade(r, -.34)],
      ["--pl", p], ["--plt", shade(p, .5)], ["--pdk", shade(p, -.24)], ["--glass", shade(r, -.68)], ...rainbowOf(r, 54).map((x, i) => ["--r" + i, x])];
    boardCache.set(c, v); }
  return v;
}
function paintBoardVars(el, c){ for (const [k, v] of boardVars(c)) el.style.setProperty(k, v); }
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
  // on a busy board only every fourth shimmering brick keeps moving (.tw), picked by a shuffle of its id so the
  // sparkles stay put and are spread over every style on a board of mixed bricks
  if (el._t !== t){ el._t = t; el.className = "brick t-" + t + (ASTYLES.has(t) && Math.imul(b.id, 0x9E3779B1) >>> 30 === 1 ? " tw" : ""); }
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
// board styles are the brick styles (Classic, Glitter, Glow, Neon, Light, Jelly, Candy, Rainbow, Pixel, Ice, Galaxy, Comic) worn by the board itself
const plateStyle = v => STYLES.some(s => s.id === v) ? v : "std";
// the colour a board shows to the eye: neon boards are dark glass whatever their colour
function plateTone(board){ const r = richPlate(board.plate); return plateStyle(board.ps) === "neon" ? shade(r, -.68) : r; }
const boardSize = v => BOARD_SIZES.some(s => s.id === v) ? v : "m";
function newBoard(cols, rows, plate, ps = "std"){ return {cols, rows, plate, ps, bs: "m", bricks: [], hist: []}; }
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
// styles whose every brick has a moving part of its own (glitter sweep, glow breathing, neon flicker, lamp twinkle).
// Each moving part is a picture the phone or a 4K screen redraws on every frame: with more than BUSY_AT of them
// only every fourth one moves, and the rest keep their look standing still
const ASTYLES = new Set(["glitter", "glow", "neon", "light"]);
const BUSY_AT = 40;
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
function snapshot(){ return JSON.stringify({cols: B.cols, rows: B.rows, plate: B.plate, ps: B.ps, bs: B.bs, bricks: B.bricks}); }
function pushHistory(){
  B.hist.push(snapshot()); if (B.hist.length > 60) B.hist.shift();
  updateUndo();
}
function updateUndo(){ const u = $("#undoBtn"); if (u) u.disabled = !B.hist.length; }
function undo(){
  if (!B.hist.length) return;
  const d = JSON.parse(B.hist.pop());
  B.cols = d.cols; B.rows = d.rows; B.plate = d.plate; B.ps = plateStyle(d.ps); B.bs = boardSize(d.bs); B.bricks = d.bricks;
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
        // a comic brick put down on its own says POW! (not when a fill or shape lands many at once)
        if (b.t === "comic" && anim.size === 1) el.classList.add("pow");
        el.addEventListener("animationend", () => { el.classList.remove("drop", "pow"); el.style.animationDelay = ""; }, {once: true});
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
  let n = 0, moving = 0; const lit = new Set();
  for (const b of B.bricks){
    if (ASTYLES.has(b.t)) moving++;
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
  plate.classList.toggle("busy", moving > BUSY_AT);
}
function switchBoard(board){
  if (B === board) return;
  B = board; clearEls(); applyBoard(); commit(); updateUndo();
}
function applyBoard(){
  paintBoardVars(plate, B.plate);
  plate.dataset.ps = plateStyle(B.ps);
  plate.style.width  = `calc(var(--cell) * ${B.cols})`;
  plate.style.height = `calc(var(--cell) * ${B.rows})`;
  fitCell();
  emit("board");
}
let refitting = false;
// the studio was hidden, so its bricks have no styles yet: measure with them tucked away and
// style them once at the right size (measuring first used to style hundreds of bricks twice)
let fitStale = true;
// screen pixels to a CSS pixel (1 on most computer screens, 2 on retina and 4K, 3 on many phones; browser zoom changes it)
function screenDensity(){ return Math.min(4, Math.max(1, window.devicePixelRatio || 1)); }
// pictures drawn for the screen (puzzle pictures, saved boards) are drawn this many times bigger, so they stay sharp
function hiDpi(){ return Math.min(3, Math.ceil(screenDensity() - .1)); }
// dragging the window to a sharper screen, or zooming the page, changes the screen's pixels: fit the studs again
(function watchDensity(){
  const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  const again = () => { mq.removeEventListener ? mq.removeEventListener("change", again) : mq.removeListener(again); fitCell(); watchDensity(); };
  mq.addEventListener ? mq.addEventListener("change", again) : mq.addListener(again);
})();
function fitCell(){
  const wrap = $("#plateWrap");
  if (!wrap || $("#studioScreen").hidden){ fitStale = true; return; }
  const tuck = fitStale && !refitting;
  fitStale = false;
  if (tuck) plate.style.display = "none";
  try { if (fitBox(wrap) === false) fitStale = true; } finally { if (tuck) plate.style.display = ""; }
}
// the space the board was last given; the building board's studs across and down are worked out from it
let fitRoom = null;
function autoWidth(){ return B === FREE && fitRoom && fitRoom.w > 0 && fitRoom.h > 0 && boardZoom <= 1 && !isPhotoBoard(); }
// the board size picks how many studs (Mouse 64 … Elephant 1024) and the board always fills the same space:
// studs stay square, so the board takes the shape of the space with as close to that many studs as the shape
// allows, filling the space first. The board never gets smaller than the bricks on it; when bricks make it
// wider than the screen allows, extra rows fill the height instead.
function fitDims(ignoreBricks){
  const want = BOARD_SIZES.find(s => s.id === boardSize(B.bs)).studs;
  const needC = ignoreBricks ? 0 : B.bricks.reduce((m, b) => Math.max(m, b.x + b.w), 0);
  const needR = ignoreBricks ? 0 : B.bricks.reduce((m, b) => Math.max(m, b.y + b.h), 0);
  const W = fitRoom.w, H = fitRoom.h, r0 = Math.sqrt(want * H / W);
  let best = null;
  for (let r = Math.max(4, Math.floor(r0) - 2); r <= Math.ceil(r0) + 2; r++){
    const c0 = r * W / H;
    for (let c = Math.max(4, Math.floor(c0) - 1); c <= Math.ceil(c0) + 1; c++){
      const cell = Math.min(W / c, H / r), fill = c * r * cell * cell / (W * H);
      const score = 3 * (1 - fill) + Math.abs(c * r - want) / want;
      if (!best || score < best.score) best = {c, r, score};
    }
  }
  let rows = clamp(Math.max(best.r, needR), 4, 120);
  let cols = clamp(Math.max(best.c, needC), 4, 120);
  if (cols > best.c || rows > best.r){
    // bricks reach past the chosen board: keep the space's shape around them
    cols = clamp(Math.max(cols, Math.floor(W / (H / rows))), 4, 120);
    rows = clamp(Math.max(rows, Math.floor(H / (W / cols))), 4, 120);
  }
  return [cols, rows];
}
// a new board size always gives the board that many studs: a build that is too big moves into the corner,
// and bricks that still don't fit come off (Undo brings them back). Returns how many came off.
function resizeBoard(){
  if (!autoWidth()) return 0;
  const [cols, rows] = fitDims(true);
  if (!B.bricks.length) return 0;
  const minX = Math.min(...B.bricks.map(b => b.x)), minY = Math.min(...B.bricks.map(b => b.y));
  const maxX = Math.max(...B.bricks.map(b => b.x + b.w)), maxY = Math.max(...B.bricks.map(b => b.y + b.h));
  // slide the build back onto the board only as far as it has to go
  const dx = maxX > cols ? Math.max(cols - maxX, -minX) : 0, dy = maxY > rows ? Math.max(rows - maxY, -minY) : 0;
  const before = B.bricks.length;
  B.bricks = B.bricks.filter(b => { b.x += dx; b.y += dy; return b.x + b.w <= cols && b.y + b.h <= rows; });
  return before - B.bricks.length;
}
function fitBox(wrap){
  if (!wrap.offsetParent) return false;              // the studio is not on screen
  wrap.style.setProperty("--cols", B.cols); wrap.style.setProperty("--rows", B.rows);
  // phones lock the studio to the screen and give the board a box of its own: fill that box
  // beside the board on computers the board's column hugs the board (--bw); measure the full space first
  const studio = wrap.closest(".studio"), bar = studio && studio.parentNode.querySelector(":scope > .topbar");
  if (studio){ studio.style.removeProperty("--bw"); studio.style.removeProperty("--bh"); bar.style.removeProperty("--sw"); bar.style.removeProperty("--free"); }
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
  // the building board grows or shrinks sideways, a column of studs at a time, to fill the space it is given
  fitRoom = boxed ? {w, h: maxH} : null;
  if (autoWidth()){
    const [c, r] = fitDims();
    if (c !== B.cols || r !== B.rows){
      B.cols = c; B.rows = r;
      plate.style.width = `calc(var(--cell) * ${B.cols})`; plate.style.height = `calc(var(--cell) * ${B.rows})`;
      if (studio) studio.style.removeProperty("--bw");
      commit(); emit("board");
    }
  }
  // studs are a whole number of the screen's own pixels (a retina or 4K screen has 2 or 3 to a CSS pixel), so every
  // stud is drawn the same, with sharp edges, and the board still fills its box to within a screen pixel a row
  const dpr = screenDensity();
  const fit = Math.floor(dpr * clamp(Math.min(w / B.cols, maxH / B.rows), B.cols > 40 || B.rows > 40 ? 3 : 7, boxed ? 240 : 48)) / dpr;
  // zoom in on big boards on small screens (pinch, or the + / − buttons); a new board size starts fitted
  const dims = B.cols + "x" + B.rows;
  if (dims !== zoomDims){ zoomDims = dims; boardZoom = 1; }
  zoomMax = Math.max(1, ZOOM_CELL / fit);
  boardZoom = clamp(boardZoom, 1, zoomMax);
  if (boardZoom < 1.05) boardZoom = 1;
  const zoomed = boardZoom > 1;
  cell = zoomed ? Math.round(fit * boardZoom * dpr) / dpr : fit;
  wrap.classList.toggle("zoomed", zoomed);
  wrap.style.height = zoomed && !boxed ? (fit * B.rows + 28) + "px" : "";
  plate.style.setProperty("--cell", cell + "px");
  // huge photo boards: plain tiles read better than tiny studs; the building board always shows every stud,
  // even an Elephant board on a small phone
  plate.classList.toggle("tiny", cell < 7 && (B !== FREE || isPhotoBoard()));
  // sideways phones keep the board's column while zoomed in, so the toy box and tools don't jump about
  if (studio && boxed && zoomed && getComputedStyle(studio).getPropertyValue("--hold-bw").trim() === "1")
    studio.style.setProperty("--bw", Math.ceil(fit * B.cols + plate.offsetWidth - cell * B.cols + padX) + "px");
  if (studio && boxed && !zoomed){
    // a board narrower than its box (iPads on their side): the toy box, board and tools all take the board's height (--bh)
    const col = wrap.parentNode, spare = wrap.clientHeight - padY - plate.offsetHeight;
    const bh = Math.ceil(col.offsetHeight - Math.max(0, spare));
    studio.style.setProperty("--bh", bh + "px");
    const gs = getComputedStyle(studio), rows = gs.gridTemplateRows.split(" ").map(parseFloat);
    if (rows[rows.length - 1] === bh){                // the layout uses --bh: centre the group on the screen
      const used = rows.reduce((a, b) => a + b, 0) + (parseFloat(gs.rowGap) || 0) * (rows.length - 1);
      bar.style.setProperty("--free", Math.max(0, Math.floor((studio.clientHeight - used) / 2)) + "px");
    }
    studio.style.setProperty("--bw", Math.ceil(plate.offsetWidth + padX) + "px");
    // the top bar lines up with the toy box, board and tools below it (--sw: their total width)
    const g = getComputedStyle(studio), cols = g.gridTemplateColumns.split(" ").map(parseFloat).filter(n => n > 0);
    if (g.display === "grid" && cols.length > 1)
      bar.style.setProperty("--sw", Math.ceil(cols.reduce((a, b) => a + b, 0) + (parseFloat(g.columnGap) || 0) * (cols.length - 1)) + "px");
  }
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
  sh.addColorStop(0, `rgba(30,10,50,${flat ? .3 : .34})`); sh.addColorStop(.7, `rgba(30,10,50,${flat ? .3 : .34})`); sh.addColorStop(1, "rgba(30,10,50,0)");
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x + c * (flat ? .55 : .56), y + c * (flat ? .59 : .61), c * (flat ? .29 : .32), 0, 7); ctx.fill();
  ctx.fillStyle = shade(col, flat ? -.34 : -.24); ctx.beginPath(); ctx.arc(x + c * .52, y + c * .54, r + c * .005, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${flat ? .5 : .75})`; ctx.beginPath(); ctx.arc(x + c * .48, y + c * .475, r, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  const hi = shade(col, flat ? .42 : .3); g.addColorStop(0, hi); g.addColorStop(flat ? .36 : .5, hi); g.addColorStop(1, col);
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
// a stud of white sugar glass, so a rainbow shows through it
function glassStud(ctx, sx, sy, c){
  const sh = ctx.createRadialGradient(sx + c * .05, sy + c * .1, 0, sx + c * .05, sy + c * .1, c * .3);
  sh.addColorStop(0, "rgba(30,10,50,.28)"); sh.addColorStop(.7, "rgba(30,10,50,.28)"); sh.addColorStop(1, "rgba(30,10,50,0)");
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(sx + c * .05, sy + c * .1, c * .3, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.arc(sx, sy, c * .2, 0, 7); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = c * .03; ctx.beginPath(); ctx.arc(sx, sy, c * .22, 0, 7); ctx.stroke();
  const gx = sx - c * .09, gy = sy - c * .13, gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, c * .1);
  gl.addColorStop(0, "rgba(255,255,255,.95)"); gl.addColorStop(.3, "rgba(255,255,255,.95)"); gl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(gx, gy, c * .1, 0, 7); ctx.fill();
}
// the rainbow running across a brick or board (angle as in styles8.css)
function rainbowFill(ctx, col, x, y, w, h, deg, light){
  const a = deg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = x + w / 2, cy = y + h / 2, g = ctx.createLinearGradient(cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2);
  rainbowOf(col, light).forEach((r, i) => g.addColorStop(i / 4, r));
  return g;
}
// candy stripes across a brick, clipped to it by the caller
function candyStripes(ctx, col, x, y, w, h, c){
  ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = candyStripe(col);
  const p = c * .42 * Math.SQRT2, sw = c * .14 * Math.SQRT2;
  for (let s = -h; s < w + h; s += p){ ctx.beginPath(); ctx.moveTo(x + s, y); ctx.lineTo(x + s + sw, y); ctx.lineTo(x + s + sw - h, y + h); ctx.lineTo(x + s - h, y + h); ctx.fill(); }
}
// a pixel stud: a square with a hard light top-left edge and a hard shadow (the same as --pxstud in styles9.css);
// x, y is the top left of the stud's cell. board: the flatter studs and grid lines of a Pixel board
function pixelStud(ctx, x, y, c, board){
  const u = c / 20, r = (a, b, w, h, f) => { ctx.fillStyle = f; ctx.fillRect(x + a * u, y + b * u, w * u, h * u); };
  if (board){
    r(0, 0, 20, 1, "rgba(30,10,50,.12)"); r(0, 1, 1, 19, "rgba(30,10,50,.12)");
    r(7, 7, 8, 8, "rgba(30,10,50,.24)"); r(6, 6, 8, 8, "rgba(255,255,255,.14)");
    r(6, 6, 8, 2, "rgba(255,255,255,.32)"); r(6, 8, 2, 6, "rgba(255,255,255,.18)");
    return;
  }
  r(6.5, 6.5, 9, 9, "rgba(30,10,50,.22)"); r(5, 5, 9, 9, "rgba(255,255,255,.3)");
  r(5, 5, 9, 1.6, "rgba(255,255,255,.7)"); r(5, 6.6, 1.6, 7.4, "rgba(255,255,255,.45)");
  r(6.6, 12.4, 7.4, 1.6, "rgba(30,10,50,.22)"); r(12.4, 6.6, 1.6, 5.8, "rgba(30,10,50,.12)");
}
// an ice stud (as --flake and --icestud in styles9.css): a frosted dome with a snowflake on bricks, a plain
// frosted dome with a glint on the board. x, y is the top left of the stud's cell
function iceStud(ctx, x, y, c, board){
  const u = c / 20, dot = (cx, cy, r, f) => { ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x + cx * u, y + cy * u, r * u, 0, 7); ctx.fill(); };
  if (board){
    dot(10.8, 11.4, 4.8, "rgba(40,80,140,.1)"); dot(10, 10, 4.4, "rgba(255,255,255,.22)");
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = .5 * u; ctx.beginPath(); ctx.arc(x + 10 * u, y + 10 * u, 4.4 * u, 0, 7); ctx.stroke();
    dot(8.6, 8.4, 1.1, "rgba(255,255,255,.7)");
    return;
  }
  dot(11, 11.7, 5.3, "rgba(40,80,140,.2)"); dot(10, 10, 5, "rgba(255,255,255,.32)");
  ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = .5 * u; ctx.beginPath(); ctx.arc(x + 10 * u, y + 10 * u, 5 * u, 0, 7); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineCap = "round"; ctx.lineWidth = u;
  const ln = (a, b, e, f) => { ctx.moveTo(x + a * u, y + b * u); ctx.lineTo(x + e * u, y + f * u); };
  ctx.beginPath(); ln(10, 6.4, 10, 13.6); ln(6.9, 8.2, 13.1, 11.8); ln(6.9, 11.8, 13.1, 8.2); ctx.stroke();
  ctx.lineWidth = .6 * u; ctx.beginPath(); ln(8.9, 6.9, 10, 7.9); ln(10, 7.9, 11.1, 6.9); ln(8.9, 13.1, 10, 12.1); ln(10, 12.1, 11.1, 13.1); ctx.stroke();
}
// frosty cracks in the ice (as --cracks in styles9.css), one pattern per n×n studs, clipped by the caller
const CRACKS = [[[2, 31], [11, 24], [14, 27], [23, 17], [27, 18]], [[11, 24], [9, 17]], [[23, 17], [24, 11]], [[27, 39], [33, 33], [39, 34]], [[33, 33], [32, 28]]];
function iceCracks(ctx, x, y, w, h, c, n, a){
  const u = c * n / 40;
  ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = .7 * u; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();
  for (let ty = 0; ty < h; ty += c * n) for (let tx = 0; tx < w; tx += c * n)
    for (const line of CRACKS) line.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + tx + px * u, y + ty + py * u));
  ctx.stroke();
}
// the stars of a galaxy (as --stars in styles9.css): x, y, size, brightness per 2×2 studs, and one sparkle
const STARS = [[5, 7, .6, .95], [17, 3, .4, .7], [31, 9, .7, .9], [24, 19, .45, .6], [9, 27, .5, .8], [36, 25, .4, .6], [19, 35, .6, .85], [3, 17, .35, .5], [29, 33, .3, .5], [14, 14, .3, .5], [38, 3, .35, .6]];
function sparkle(ctx, x, y, r){
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * .3, y - r * .3); ctx.lineTo(x + r, y); ctx.lineTo(x + r * .3, y + r * .3);
  ctx.lineTo(x, y + r); ctx.lineTo(x - r * .3, y + r * .3); ctx.lineTo(x - r, y); ctx.lineTo(x - r * .3, y - r * .3); ctx.fill();
}
// stars over an area, one pattern per n×n studs (k: star size, a: brightness), clipped by the caller
function galaxyStars(ctx, x, y, w, h, c, n, k, a){
  const u = c * n / 40;
  for (let ty = 0; ty < h; ty += c * n) for (let tx = 0; tx < w; tx += c * n){
    for (const [sx, sy, r, al] of STARS){ ctx.fillStyle = `rgba(255,255,255,${al * a})`; ctx.beginPath(); ctx.arc(x + tx + sx * u, y + ty + sy * u, r * k * u, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#fff"; sparkle(ctx, x + tx + 13 * u, y + ty + 23 * u, 1.3 * u);
  }
}
// a little planet stud in the brick's colour with a white ring (sx, sy: its middle)
function planetStud(ctx, sx, sy, c, col){
  const px = sx - c * .06, py = sy - c * .08, pg = ctx.createRadialGradient(px, py, 0, px, py, c * .16);
  pg.addColorStop(0, shade(col, .3)); pg.addColorStop(.2, shade(col, .3)); pg.addColorStop(.75, neonColor(col)); pg.addColorStop(1, shade(col, -.24));
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(sx, sy, c * .15, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(-22 * Math.PI / 180); ctx.scale(1, 1.5 / 5.6);
  ctx.beginPath(); ctx.arc(0, 0, c * .28, 0, 7); ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = c * .035; ctx.stroke();
}
// comic: halftone dots in a colour, one small tile stamped as a pattern, so even big boards draw quickly
const halftones = new Map();
function halftone(ctx, col, c){
  const key = col + "|" + c;
  let p = halftones.get(key);
  if (!p){
    if (halftones.size > 60) halftones.clear();
    const t = document.createElement("canvas"), s = Math.max(2, Math.round(c * .25)); t.width = s; t.height = s;
    const tc = t.getContext("2d"); tc.fillStyle = col; tc.beginPath(); tc.arc(s / 2, s / 2, Math.max(.5, c * .04), 0, 7); tc.fill();
    p = ctx.createPattern(t, "repeat"); halftones.set(key, p);
  }
  return p;
}
const INK2 = "#1E1730";
// the sprinkles between a candy board's studs (the same as --sprinkles in styles8.css), per 3×3 studs
const SPRINKLES = [["#FF4F9A", 90, 94, 110, 106], ["#3D9BFF", 192, 108, 208, 92], ["#36C46A", 89, 200, 111, 200], ["#FFB800", 200, 189, 200, 211]];
// the board under the bricks in each board style (matches styles7.css; Classic is the plain board)
function drawPlate(ctx, board, ox, oy, c){
  const bw = board.cols * c, bh = board.rows * c, ps = plateStyle(board.ps), col = richPlate(board.plate), glass = shade(col, -.68);
  const rad = ps === "jelly" ? c * .6 : ps === "pixel" ? 0 : ps === "comic" ? c * .12 : c * .3, path = () => rrect(ctx, ox, oy, bw, bh, rad);
  const each = fn => { for (let y = 0; y < board.rows; y++) for (let x = 0; x < board.cols; x++) fn(ox + (x + .5) * c, oy + (y + .5) * c, x, y); };
  // glow, neon and light boards shine out past their edge in their own colour
  if (ps === "glow" || ps === "neon" || ps === "light"){
    ctx.save(); ctx.shadowColor = ps === "light" ? lampColor(col, .75) : neonColor(col); ctx.shadowBlur = c * (ps === "neon" ? .8 : 1.1);
    ctx.fillStyle = ps === "neon" ? glass : col; path(); ctx.fill(); ctx.restore();
  }
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = ps === "neon" ? glass : ps === "light" ? boardPastel(col) : ps === "ice" ? iceColor(col) : ps === "galaxy" ? galaxyColor(col) : ps === "comic" ? boardPastel(col) : col; ctx.fillRect(ox, oy, bw, bh);
  if (ps === "glow"){
    const g = ctx.createRadialGradient(ox + bw / 2, oy + bh * .45, 0, ox + bw / 2, oy + bh * .45, Math.max(bw, bh) * .62);
    g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(.45, shade(col, .18)); g.addColorStop(1, col);
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
  } else if (ps === "candy"){
    ctx.fillStyle = boardPastel(col); ctx.fillRect(ox, oy, bw, bh);
    const sg = ctx.createLinearGradient(ox, oy, ox + bw * .17, oy + bh);
    sg.addColorStop(0, "rgba(255,255,255,.3)"); sg.addColorStop(.4, "rgba(255,255,255,0)");
    ctx.fillStyle = sg; ctx.fillRect(ox, oy, bw, bh);
    ctx.lineCap = "round"; ctx.lineWidth = c * .09;
    for (let ty = 0; ty < board.rows; ty += 3) for (let tx = 0; tx < board.cols; tx += 3)
      for (const [f, x1, y1, x2, y2] of SPRINKLES){ ctx.strokeStyle = f; ctx.beginPath(); ctx.moveTo(ox + tx * c + x1 * c / 100, oy + ty * c + y1 * c / 100); ctx.lineTo(ox + tx * c + x2 * c / 100, oy + ty * c + y2 * c / 100); ctx.stroke(); }
  } else if (ps === "rainbow"){
    ctx.fillStyle = rainbowFill(ctx, col, ox, oy, bw, bh, 120, 54); ctx.fillRect(ox, oy, bw, bh);
    const wg = ctx.createLinearGradient(ox, oy, ox + bw * .17, oy + bh);
    wg.addColorStop(0, "rgba(255,255,255,.22)"); wg.addColorStop(1, "rgba(255,255,255,.05)");
    ctx.fillStyle = wg; ctx.fillRect(ox, oy, bw, bh);
  } else if (ps === "galaxy"){
    // two soft nebulas in the board's colour, faint stars and a few bigger ones mid-twinkle
    for (const [ex, ey, rx, ry] of [[.3, .3, .6, .45], [.78, .75, .5, .4]]){
      ctx.save(); ctx.translate(ox + bw * ex, oy + bh * ey); ctx.scale(bw * rx, bh * ry);
      const ng = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); ng.addColorStop(0, nebulaColor(col, .26)); ng.addColorStop(1, nebulaColor(col, 0));
      ctx.fillStyle = ng; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    }
    galaxyStars(ctx, ox, oy, bw, bh, c, 3, .8, .7);
    ctx.fillStyle = "#fff";
    for (let ty = 0; ty < bh; ty += c * 5) for (let tx = 0; tx < bw; tx += c * 7)
      for (const [sx, sy, r] of [[12, 13, 4], [47, 33, 3.2], [60, 8, 2.4], [27, 43, 2.4]]) sparkle(ctx, ox + tx + sx * c / 10, oy + ty + sy * c / 10, r * c / 10);
    const vg = ctx.createRadialGradient(ox + bw / 2, oy + bh / 2, Math.min(bw, bh) * .35, ox + bw / 2, oy + bh / 2, Math.max(bw, bh) * .75);
    vg.addColorStop(0, "rgba(0,0,20,0)"); vg.addColorStop(1, "rgba(0,0,20,.45)");
    ctx.fillStyle = vg; ctx.fillRect(ox, oy, bw, bh);
  } else if (ps === "comic"){
    ctx.fillStyle = halftone(ctx, col, c); ctx.save(); ctx.translate(ox, oy); ctx.fillRect(0, 0, bw, bh); ctx.restore();
  } else if (ps === "pixel"){
    // a flat game screen: the grid and studs are drawn with the studs below
  } else if (ps === "ice"){
    const ig = ctx.createLinearGradient(ox, oy, ox + bw * .26, oy + bh);
    ig.addColorStop(0, "rgba(255,255,255,.55)"); ig.addColorStop(.35, "rgba(255,255,255,.1)"); ig.addColorStop(.55, "rgba(255,255,255,0)"); ig.addColorStop(1, "rgba(90,140,210,.18)");
    ctx.fillStyle = ig; ctx.fillRect(ox, oy, bw, bh);
    iceCracks(ctx, ox, oy, bw, bh, c, 3, .3);
  } else if (ps === "light"){
    const wg = ctx.createLinearGradient(ox, oy, ox + bw * .17, oy + bh);
    wg.addColorStop(0, "rgba(255,255,255,.4)"); wg.addColorStop(.5, "rgba(255,255,255,0)");
    ctx.fillStyle = wg; ctx.fillRect(ox, oy, bw, bh);
  } else {
    ctx.fillStyle = sheen(ctx, ox, oy, bw, bh, .14, .1); ctx.fillRect(ox, oy, bw, bh);
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
  } else if (ps === "candy" || ps === "ice"){
    ctx.shadowColor = "rgba(255,255,255,.9)"; ctx.shadowBlur = c * .8; ctx.lineWidth = c * .5; ctx.strokeStyle = "rgba(255,255,255,.6)";
  } else {
    ctx.shadowColor = "rgba(20,5,40,.32)"; ctx.shadowBlur = c * 1.4; ctx.lineWidth = c; ctx.strokeStyle = "rgba(20,5,40,.16)";
  }
  if (ps === "neon"){ path(); ctx.stroke(); ctx.stroke(); }
  else if (ps === "comic"){
    // a thick ink panel border
    const e = Math.max(3, c * .14);
    ctx.strokeStyle = INK2; ctx.lineWidth = e * 2; path(); ctx.stroke();
  }
  else if (ps === "galaxy"){
    ctx.strokeStyle = nebulaColor(col, .6); ctx.lineWidth = Math.max(2, c * .06) * 2; path(); ctx.stroke();
  }
  else if (ps === "pixel"){
    // hard steps of light and shadow round the edge, no blur
    const e = Math.max(3, c * .14);
    ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(ox, oy, bw, e);
    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(ox, oy + e, e, bh - e);
    ctx.fillStyle = "rgba(30,10,60,.26)"; ctx.fillRect(ox, oy + bh - e, bw, e);
    ctx.fillStyle = "rgba(30,10,60,.16)"; ctx.fillRect(ox + bw - e, oy, e, bh - e);
  }
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
  } else if (ps === "rainbow"){
    each((sx, sy) => glassStud(ctx, sx, sy, c));
  } else if (ps === "galaxy"){
    // dim little planets: a soft glow with a bright middle
    const key = "gxb|" + c + "|" + col;
    let tile = studTiles.get(key);
    if (!tile){
      const sz = Math.ceil(c); tile = document.createElement("canvas"); tile.width = sz; tile.height = sz;
      const tc = tile.getContext("2d"), m = c * .46, g = tc.createRadialGradient(m, c * .44, 0, m, c * .44, c * .12);
      g.addColorStop(0, nebulaColor(col, .6)); g.addColorStop(.33, nebulaColor(col, .6)); g.addColorStop(1, nebulaColor(col, 0));
      tc.fillStyle = g; tc.beginPath(); tc.arc(m, c * .44, c * .12, 0, 7); tc.fill();
      studTiles.set(key, tile);
    }
    each((sx, sy) => ctx.drawImage(tile, sx - c / 2, sy - c / 2));
  } else if (ps === "comic"){
    ctx.fillStyle = boardPastel(col); ctx.strokeStyle = "rgba(30,23,48,.5)"; ctx.lineWidth = c * .02;
    each((sx, sy) => { ctx.beginPath(); ctx.arc(sx, sy, c * .16, 0, 7); ctx.fill(); ctx.stroke(); });
  } else if (ps === "pixel" || ps === "ice"){
    // drawn once and stamped
    const key = ps + "b|" + c;
    let tile = studTiles.get(key);
    if (!tile){
      const sz = Math.ceil(c); tile = document.createElement("canvas"); tile.width = sz; tile.height = sz;
      (ps === "pixel" ? pixelStud : iceStud)(tile.getContext("2d"), 0, 0, c, true);
      studTiles.set(key, tile);
    }
    each((sx, sy) => ctx.drawImage(tile, sx - c / 2, sy - c / 2));
  } else if (ps === "jelly"){
    // gummy studs, drawn once and stamped
    const key = ps + "|" + c + "|" + col;
    let tile = studTiles.get(key);
    if (!tile){
      const s = Math.ceil(c); tile = document.createElement("canvas"); tile.width = s; tile.height = s;
      const tc = tile.getContext("2d");
      jellyStud(tc, c / 2, c / 2, c, col, .21);
      studTiles.set(key, tile);
    }
    each((sx, sy) => ctx.drawImage(tile, sx - c / 2, sy - c / 2));
  } else each((sx, sy) => stud(ctx, sx - c / 2, sy - c / 2, c, ps === "candy" ? boardPastel(col) : col, true));
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
    const rad = t === "jelly" ? c * .32 : t === "light" || t === "candy" ? c * .24 : t === "pixel" ? 0 : t === "ice" ? c * .18 : t === "galaxy" ? c * .16 : t === "comic" ? c * .1 : c * .14;
    const col = t === "light" ? pastel(b.c) : b.c;       // light bricks are drawn in their pastel
    ctx.save();
    ctx.save(); ctx.shadowColor = t === "light" ? "rgba(30,10,60,.2)" : "rgba(30,10,60,.34)"; ctx.shadowBlur = t === "pixel" || t === "comic" ? 0 : (t === "light" ? 8 : 4) + z * 3;
    ctx.shadowOffsetX = (t === "pixel" ? 2 : 1) + z; ctx.shadowOffsetY = (t === "light" ? 4 : 3) + z * 3;
    ctx.fillStyle = "rgba(30,10,60,.2)"; rrect(ctx, x, y, w, h, rad); ctx.fill(); ctx.restore();
    if (t === "pixel"){
      // flat colour, hard steps of light and shadow, a hard outline and square studs
      const e = Math.max(2, c * .1);
      ctx.fillStyle = b.c; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(x, y, w, e);
      ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(x, y + e, e, h - e);
      ctx.fillStyle = "rgba(30,10,60,.32)"; ctx.fillRect(x, y + h - e, w, e);
      ctx.fillStyle = "rgba(30,10,60,.18)"; ctx.fillRect(x + w - e, y + e, e, h - 2 * e);
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) pixelStud(ctx, x - gap + xx * c, y - gap + yy * c, c);
      ctx.strokeStyle = "rgba(30,10,60,.6)"; ctx.lineWidth = Math.max(1, c * .04);
      ctx.strokeRect(x - ctx.lineWidth / 2, y - ctx.lineWidth / 2, w + ctx.lineWidth, h + ctx.lineWidth);
      ctx.restore();
      continue;
    }
    if (t === "galaxy"){
      // deep space with a nebula of the brick's colour, stars, and planet studs
      ctx.save(); rrect(ctx, x, y, w, h, rad); ctx.clip();
      ctx.fillStyle = galaxyColor(b.c); ctx.fillRect(x, y, w, h);
      ctx.save(); ctx.translate(x + w * .3, y + h * .3); ctx.scale(w * .75, h * .65);
      const ng = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); ng.addColorStop(0, nebulaColor(b.c, .6)); ng.addColorStop(1, nebulaColor(b.c, 0));
      ctx.fillStyle = ng; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
      const sg = ctx.createLinearGradient(x, y, x + w * .34, y + h);
      sg.addColorStop(0, "rgba(255,255,255,.18)"); sg.addColorStop(.35, "rgba(255,255,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
      galaxyStars(ctx, x - gap, y - gap, w + gap, h + gap, c, 2, 1, 1);
      ctx.fillStyle = "rgba(0,0,20,.35)"; ctx.fillRect(x, y + h - c * .08, w, c * .08);
      ctx.strokeStyle = nebulaColor(b.c, .6); ctx.lineWidth = Math.max(2, c * .07); rrect(ctx, x, y, w, h, rad); ctx.stroke();
      ctx.restore();
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) planetStud(ctx, x - gap + (xx + .5) * c, y - gap + (yy + .5) * c, c, b.c);
      ctx.strokeStyle = "rgba(20,10,50,.5)"; ctx.lineWidth = 1;
      rrect(ctx, x - .5, y - .5, w + 1, h + 1, rad); ctx.stroke();
      ctx.restore();
      continue;
    }
    if (t === "comic"){
      // flat colour under halftone dots, a white shine in the corner, a thick ink outline, a hard ink shadow
      // and studs drawn in ink
      const ow = Math.max(1.5, c * .06);
      ctx.fillStyle = INK2;
      rrect(ctx, x - ow + 2 + z, y - ow + 3 + z * 3, w + ow * 2, h + ow * 2, rad + ow); ctx.fill();
      rrect(ctx, x - ow, y - ow, w + ow * 2, h + ow * 2, rad + ow); ctx.fill();
      ctx.save(); rrect(ctx, x, y, w, h, rad); ctx.clip();
      ctx.fillStyle = b.c; ctx.fillRect(x, y, w, h);
      ctx.save(); ctx.translate(x - gap, y - gap); ctx.fillStyle = halftone(ctx, shade(b.c, -.24), c); ctx.fillRect(gap, gap, w, h); ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (w + h) * .17, y); ctx.lineTo(x, y + (w + h) * .17); ctx.fill();
      ctx.restore();
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++){
        const sx = x - gap + (xx + .5) * c, sy = y - gap + (yy + .5) * c;
        ctx.fillStyle = INK2; ctx.beginPath(); ctx.arc(sx + c * .06, sy + c * .08, c * .2, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, c * .205, 0, 7); ctx.fill();
        ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(sx, sy, c * .155, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx - c * .1, sy - c * .13, c * .05, 0, 7); ctx.fill();
      }
      ctx.restore();
      continue;
    }
    if (t === "ice"){
      // frozen colour, a frosty light from the top left, cracks inside, a white frost rim and snowflake studs
      ctx.save(); rrect(ctx, x, y, w, h, rad); ctx.clip();
      ctx.fillStyle = iceColor(b.c); ctx.fillRect(x, y, w, h);
      ctx.fillStyle = shade(iceColor(b.c), -.2); ctx.fillRect(x, y + h - c * .08, w, c * .08);
      const fg = ctx.createLinearGradient(x, y, x + w * .36, y + h);
      fg.addColorStop(0, "rgba(255,255,255,.7)"); fg.addColorStop(.28, "rgba(255,255,255,.18)"); fg.addColorStop(.5, "rgba(255,255,255,0)"); fg.addColorStop(.7, "rgba(90,140,210,0)"); fg.addColorStop(1, "rgba(90,140,210,.2)");
      ctx.fillStyle = fg; ctx.fillRect(x, y, w, h);
      iceCracks(ctx, x - gap, y - gap, w + gap, h + gap, c, 2, .75);
      ctx.shadowColor = "rgba(255,255,255,.8)"; ctx.shadowBlur = c * .3; ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = Math.max(3, c * .1);
      rrect(ctx, x, y, w, h, rad); ctx.stroke();
      ctx.restore();
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) iceStud(ctx, x - gap + xx * c, y - gap + yy * c, c);
      ctx.strokeStyle = "rgba(40,70,130,.28)"; ctx.lineWidth = 1;
      rrect(ctx, x - .5, y - .5, w + 1, h + 1, rad); ctx.stroke();
      ctx.restore();
      continue;
    }
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
    if (t === "candy" || t === "rainbow"){
      // a striped sweet, or the colours of the rainbow, under a sugary shine with lit edges
      ctx.save(); rrect(ctx, x, y, w, h, rad); ctx.clip();
      if (t === "candy") candyStripes(ctx, b.c, x, y, w, h, c);
      else { ctx.fillStyle = rainbowFill(ctx, b.c, x, y, w, h, 110); ctx.fillRect(x, y, w, h); }
      ctx.fillStyle = "rgba(30,10,60,.22)"; ctx.fillRect(x, y + h - c * .09, w, c * .09);
      const sg = ctx.createLinearGradient(x, y, x + w * .26, y + h);
      sg.addColorStop(0, `rgba(255,255,255,${t === "candy" ? .5 : .4})`); sg.addColorStop(.38, "rgba(255,255,255,0)"); sg.addColorStop(.65, "rgba(30,10,60,0)"); sg.addColorStop(1, "rgba(30,10,60,.13)");
      ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
      const bt = Math.max(1.5, c * .05), bl = Math.max(1.5, c * .04);
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(x, y, w, bt);
      ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(x, y + bt, bl, h - bt);
      ctx.restore();
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++){
        if (t === "candy") stud(ctx, x - gap + xx * c, y - gap + yy * c, c, b.c); else glassStud(ctx, x - gap + (xx + .5) * c, y - gap + (yy + .5) * c, c);
      }
      ctx.strokeStyle = "rgba(30,10,60,.2)"; ctx.lineWidth = 1;
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
