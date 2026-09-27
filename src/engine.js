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
function paintVars(el, c){
  el.style.setProperty("--c", c);
  el.style.setProperty("--lt", shade(c, .3));
  el.style.setProperty("--dk", shade(c, -.24));
}
function colorDist(a, b){
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  return Math.abs((x >> 16) - (y >> 16)) + Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)) + Math.abs((x & 255) - (y & 255));
}
function placeEl(el, b){
  el.style.left   = `calc(var(--cell) * ${b.x} + 1px)`;
  el.style.top    = `calc(var(--cell) * ${b.y} + 1px)`;
  el.style.width  = `calc(var(--cell) * ${b.w} - 2px)`;
  el.style.height = `calc(var(--cell) * ${b.h} - 2px)`;
}
function styleBrickEl(el, b){
  el.className = "brick t-" + (b.t || "std");
  placeEl(el, b); paintVars(el, b.c);
  el.style.setProperty("--z", b.z || 0);
  el.style.zIndex = 1 + (b.z || 0) * 10;
}

/* ---- tiny event bus ---- */
const bus = {};
function on(ev, fn){ (bus[ev] = bus[ev] || []).push(fn); }
function emit(ev, data){ (bus[ev] || []).forEach(fn => { try { fn(data); } catch(e){ console.error(e); } }); }

/* ---- pixel pictures -> bricks ---- */
// pix: 2D array of color strings or null. maxRun: longest horizontal brick to use.
function decompose(pix, maxRun = 2){
  const H = pix.length, W = H ? pix[0].length : 0;
  const used = pix.map(r => r.map(() => false));
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    if (!pix[y][x] || used[y][x]) continue;
    let n = 1;
    while (n < maxRun && x + n < W && pix[y][x + n] === pix[y][x] && !used[y][x + n]) n++;
    if (n >= 2){ for (let k = 0; k < n; k++) used[y][x + k] = true; out.push({x, y, w: n, h: 1, c: pix[y][x]}); }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    if (!pix[y][x] || used[y][x]) continue;
    if (y + 1 < H && pix[y + 1][x] === pix[y][x] && !used[y + 1][x]){ used[y][x] = used[y + 1][x] = true; out.push({x, y, w: 1, h: 2, c: pix[y][x]}); }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (pix[y][x] && !used[y][x]){ used[y][x] = true; out.push({x, y, w: 1, h: 1, c: pix[y][x]}); }
  return out;
}
function artToPix(art, recolor){
  return art.split("|").map(r => [...r].map(ch => ch === "." ? null : (recolor || PAL[ch] || "#FBFAF5")));
}

/* ===================== boards ===================== */
function newBoard(cols, rows, plate){ return {cols, rows, plate, bricks: [], hist: []}; }
let FREE = newBoard(24, 18, "#FF2E8A");
let B = FREE;            // the board on screen
let nextId = 1;
let grid = [];           // grid[y][x] = stack of brick ids, lowest first
const byId = new Map();
let cell = 30;
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
function snapshot(){ return JSON.stringify({cols: B.cols, rows: B.rows, plate: B.plate, bricks: B.bricks}); }
function pushHistory(){
  B.hist.push(snapshot()); if (B.hist.length > 60) B.hist.shift();
  updateUndo();
}
function updateUndo(){ const u = $("#undoBtn"); if (u) u.disabled = !B.hist.length; }
function undo(){
  if (!B.hist.length) return;
  const d = JSON.parse(B.hist.pop());
  B.cols = d.cols; B.rows = d.rows; B.plate = d.plate; B.bricks = d.bricks;
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
      const keep = ["drop", "flash", "wiggle", "selected"].filter(c => el.classList.contains(c));
      styleBrickEl(el, b); keep.forEach(c => el.classList.add(c));
    }
    seen.add(b.id);
  }
  for (const [id, el] of els) if (!seen.has(id)){ el.remove(); els.delete(id); }
  const n = B.bricks.length;
  const cnt = $("#count"); if (cnt) cnt.textContent = t(n === 1 ? "oneBrick" : "nBricks", {n});
}
function clearEls(){ for (const el of els.values()) el.remove(); els.clear(); }
function switchBoard(board){
  if (B === board) return;
  cancelSelection();
  B = board; clearEls(); applyBoard(); commit(); updateUndo();
}
function applyBoard(){
  paintVars(plate, B.plate);
  plate.style.width  = `calc(var(--cell) * ${B.cols})`;
  plate.style.height = `calc(var(--cell) * ${B.rows})`;
  fitCell();
  drawMirrorLines();
  emit("board");
}
function fitCell(){
  const wrap = $("#plateWrap");
  const w = wrap.clientWidth - 16;
  const top = wrap.getBoundingClientRect().top + window.scrollY;
  let maxH;
  if (window.innerWidth > 1180) maxH = Math.max(300, window.innerHeight - top - 96);
  else maxH = Math.max(240, window.innerHeight * .6);
  cell = Math.floor(clamp(Math.min(w / B.cols, maxH / B.rows), 7, 46));
  plate.style.setProperty("--cell", cell + "px");
}

/* ---- helper speech bubble ---- */
function say(text, opts = {}){
  $("#bubble").textContent = text;
  const b = $("#bricky"); b.classList.remove("hop"); void b.getBoundingClientRect(); b.classList.add("hop");
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
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function stud(ctx, x, y, c, col, flat){
  const r = c * (flat ? .27 : .29);
  ctx.fillStyle = "rgba(30,10,50,.3)";
  ctx.beginPath(); ctx.arc(x + c * .57, y + c * .61, r, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(x + c * .5, y + c * .5, 0, x + c * .5, y + c * .5, r);
  g.addColorStop(0, shade(col, .3)); g.addColorStop(.7, shade(col, .3)); g.addColorStop(1, col);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + c * .5, y + c * .5, r, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.beginPath(); ctx.arc(x + c * .42, y + c * .38, c * .07, 0, 7); ctx.fill();
}
function drawBoard(ctx, board, ox, oy, c){
  ctx.fillStyle = board.plate; rrect(ctx, ox, oy, board.cols * c, board.rows * c, c * .3); ctx.fill();
  for (let y = 0; y < board.rows; y++) for (let x = 0; x < board.cols; x++) stud(ctx, ox + x * c, oy + y * c, c, board.plate, true);
  const list = [...board.bricks].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const b of list){
    const z = b.z || 0, t = b.t || "std";
    const x = ox + b.x * c + 1.5 - z * 2, y = oy + b.y * c + 1.5 - z * 3, w = b.w * c - 3, h = b.h * c - 3;
    const rad = t === "round" ? Math.min(w, h) / 2 : c * .14;
    ctx.save();
    if (t === "clear") ctx.globalAlpha = .62;
    ctx.fillStyle = "rgba(30,10,60,.3)"; rrect(ctx, x + z, y + 3 + z * 2, w, h, rad); ctx.fill();
    ctx.fillStyle = shade(b.c, -.24); rrect(ctx, x, y, w, h, rad); ctx.fill();
    ctx.fillStyle = b.c; rrect(ctx, x, y, w, h - c * .09, rad); ctx.fill();
    if (t === "tile"){
      const g = ctx.createLinearGradient(x, y, x + w * .5, y + h * .5);
      g.addColorStop(0, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; rrect(ctx, x, y, w, h - c * .09, rad); ctx.fill();
    } else {
      for (let yy = 0; yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) stud(ctx, x - 1.5 + xx * c, y - 1.5 + yy * c, c, b.c);
    }
    if (t === "glitter"){
      let s = b.id * 9301 + 49297;
      const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      for (let i = 0; i < b.w * b.h * 6; i++){ ctx.beginPath(); ctx.arc(x + rnd() * w, y + rnd() * h, 1 + rnd() * 1.5, 0, 7); ctx.fill(); }
    }
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
