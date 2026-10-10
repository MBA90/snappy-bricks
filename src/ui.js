/* ===================== UI: tray, tools, dragging ===================== */
const settings = Object.assign({sound: true, talk: false, stack: false, lang: "en", theme: "classic"}, store("snappy-settings") || {});
function saveSettings(){ store("snappy-settings", settings); }

let tool = "move";
let color = "#7FE3C0";
let brickStyle = "std";
let turned = false;
let selected = null;     // {kind:"brick",i} | {kind:"art",name}

/* ---- pieces ---- */
function brickPiece(i){
  let [w, h] = SHAPES[i]; if (turned) [w, h] = [h, w];
  return {w, h, single: true, bricks: [{x: 0, y: 0, w, h, c: color, t: brickStyle}]};
}
function artPiece(name){
  const pix = artToPix(ART[name].art);
  return {w: pix[0].length, h: pix.length, single: false,
          bricks: decompose(pix).map(b => ({...b, t: brickStyle}))};
}
function pieceFor(sel){
  if (!sel) return null;
  if (sel.kind === "brick") return brickPiece(sel.i);
  if (sel.kind === "art") return artPiece(sel.name);
  return null;
}
function pieceEl(piece, px){
  const d = document.createElement("div"); d.className = "piece";
  d.style.setProperty("--cell", px + "px");
  d.style.width = piece.w * px + "px"; d.style.height = piece.h * px + "px";
  for (const b of piece.bricks){ const e = document.createElement("div"); styleBrickEl(e, b); d.appendChild(e); }
  return d;
}


/* ---- placing ---- */
function placePiece(piece, gx, gy, opts = {}){
  const res = canPlace(piece.bricks, gx, gy, 0);
  if (!res.ok) return 0;
  if (!opts.noHistory) pushHistory();
  const anim = new Map();
  piece.bricks.forEach((b, i) => {
    const nb = {id: nextId++, x: gx + b.x, y: gy + b.y, w: b.w, h: b.h, c: b.c, t: b.t || "std", z: res.z + (b.z || 0)};
    B.bricks.push(nb); anim.set(nb.id, piece.single ? 0 : i * 16);
  });
  const n = piece.bricks.length;
  commit(anim);
  if (!opts.silent) sfx.snap();
  emit("placed", {n});
  return n;
}

/* ===================== tray UI ===================== */
const coarse = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
function trayCell(){ return window.innerWidth < 720 || window.innerHeight < 541 ? 14 : coarse ? 18 : 16; }
function buildSwatches(){
  const box = $("#swatches"); box.innerHTML = "";
  for (const c of COLORS){
    const b = document.createElement("button");
    b.className = "swatch"; b.type = "button"; b.dataset.hex = c.hex;
    b.setAttribute("aria-label", c[LANG]); b.title = c[LANG];
    b.setAttribute("aria-pressed", c.hex === color);
    const f = document.createElement("span"); f.className = "swatch-face"; paintVars(f, c.hex); b.appendChild(f);
    b.addEventListener("click", () => {
      color = c.hex; sfx.click();
      box.querySelectorAll(".swatch").forEach(s => s.setAttribute("aria-pressed", s.dataset.hex === color));
      buildShapes(); emit("color", color);
      say(t(tool === "draw" ? "drawReady" : tool === "paint" || tool === "fill" ? "paintReady" : "colorPicked", {c: c[LANG]}));
    });
    box.appendChild(b);
  }
}
function buildStyles(){
  const box = $("#styles"); box.innerHTML = "";
  for (const s of STYLES){
    const b = document.createElement("button"); b.type = "button"; b.className = "stylebtn";
    b.setAttribute("aria-pressed", s.id === brickStyle); b.title = s[LANG];
    const prev = pieceEl({w: 2, h: 2, bricks: [{x: 0, y: 0, w: 2, h: 2, c: color, t: s.id}]}, 14);
    b.appendChild(prev);
    const lab = document.createElement("span"); lab.textContent = s[LANG]; b.appendChild(lab);
    b.addEventListener("click", () => {
      brickStyle = s.id; sfx.click(); buildStyles(); buildShapes(); buildStamps();
      say(t("styleSay_" + s.id));
    });
    box.appendChild(b);
  }
}
function makeCard(piece, px, label, sel, ariaLabel){
  const card = document.createElement("div");
  card.className = "card"; card.tabIndex = 0; card.setAttribute("role", "button");
  card.setAttribute("aria-label", ariaLabel || label);
  card.setAttribute("aria-pressed", !!(selected && sameSel(selected, sel)));
  card.appendChild(pieceEl(piece, px));
  const lab = document.createElement("span"); lab.className = "size"; lab.textContent = label; card.appendChild(lab);
  card.addEventListener("pointerdown", e => startTrayDrag(e, sel));
  card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); toggleSelect(sel); } });
  return card;
}
function buildShapes(){
  const box = $("#shapes"); box.innerHTML = "";
  SHAPES.forEach((s, i) => {
    if (settings.age === "little" && !LITTLE_SHAPES.includes(i)) return;
    const p = brickPiece(i);
    const lab = `${Math.min(p.w, p.h)}×${Math.max(p.w, p.h)}`;
    box.appendChild(makeCard(p, trayCell(), lab, {kind: "brick", i}, t("brickAria", {s: lab})));
  });
  // colour the style previews too
  $$("#styles .brick").forEach(e => paintVars(e, color));
}
function buildStamps(){
  const box = $("#stamps"); box.innerHTML = "";
  const names = [...BASE_STAMPS, ...(THEMES[settings.theme] || THEMES.classic).stamps];
  for (const name of names){
    const p = artPiece(name);
    const px = Math.max(4, Math.min(8, Math.floor(56 / Math.max(p.w, p.h))));
    box.appendChild(makeCard(p, px, ART[name][LANG], {kind: "art", name}));
  }
}
function sameSel(a, b){ return !!(a && b && a.kind === b.kind && a.i === b.i && a.name === b.name); }
function toggleSelect(sel){
  selected = sameSel(selected, sel) ? null : sel;
  if (selected && tool !== "move") setTool("move", true);
  buildShapes(); buildStamps(); sfx.click();
  say(t(selected ? "tapToPlace" : "dragAnytime"));
}

/* ===================== tools ===================== */
// no tool on ("move") is plain building: drag bricks around, tap one to turn it
function setTool(tl, quiet){
  if (!quiet && tl === tool) tl = "move";            // tap the tool that is on to put it away
  tool = tl;
  $$("[data-tool]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tool === tl));
  plate.className = plate.className.replace(/tool-\w+/g, "").trim() + " tool-" + tl;
  if (tl !== "move" && selected){ selected = null; buildShapes(); buildStamps(); }
  emit("tool", tl);
  if (quiet) return;
  sfx.click(); say(t(tl === "move" ? "dragAnytime" : "tool_" + tl));
}
function setStack(on, quiet){
  settings.stack = on; saveSettings();
  $("#stackBtn").setAttribute("aria-pressed", on);
  if (!quiet){ sfx.click(); say(t(on ? "stackOn" : "stackOff")); }
}

/* ===================== pointer handling ===================== */
let ptr = null, ghostEl = null, floatEl = null;
const trash = $("#trash");
function overEl(el, x, y){ const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
function cellFromEvent(e){
  const r = plate.getBoundingClientRect();
  return {x: Math.floor((e.clientX - r.left) / cell), y: Math.floor((e.clientY - r.top) / cell)};
}

function startTrayDrag(e, sel){
  if (e.button > 0 || ptr) return;
  e.preventDefault();
  const piece = pieceFor(sel); if (!piece) return;
  ptr = {kind: "drag", id: e.pointerId, sel, piece, source: "tray", sx: e.clientX, sy: e.clientY, moved: false,
         grabX: piece.w * cell / 2, grabY: piece.h * cell / 2, lift: e.pointerType === "touch" ? cell * 1.4 : 0, target: null};
  waitForHold(e);
}
function startBoardDrag(e, b){
  const r = plate.getBoundingClientRect();
  ptr = {kind: "drag", id: e.pointerId, source: "board", brick: b, sx: e.clientX, sy: e.clientY, moved: false,
         piece: {w: b.w, h: b.h, single: true, bricks: [{x: 0, y: 0, w: b.w, h: b.h, c: b.c, t: b.t}]},
         grabX: e.clientX - (r.left + b.x * cell), grabY: e.clientY - (r.top + b.y * cell), lift: e.pointerType === "touch" ? cell * 1.4 : 0, target: null};
  waitForHold(e);
}
// On touch screens a brick or shape is picked up only after the finger rests on it for a moment:
// a quick touch or swipe never grabs one by accident (a tap still selects or turns it). A mouse drags straight away.
const HOLD_MS = 300;
function waitForHold(e){
  if (e.pointerType === "mouse") return;
  const p = ptr; p.hold = true; p.lx = e.clientX; p.ly = e.clientY;
  p.timer = setTimeout(() => {
    if (ptr !== p) return;
    pickUp({clientX: p.lx, clientY: p.ly, pointerType: e.pointerType});
    if (navigator.vibrate) try { navigator.vibrate(12); } catch(err){}
  }, HOLD_MS);
}
function pickUp(e){
  ptr.moved = true; emit("pickup"); showFloat(); if (e.pointerType !== "mouse") showSpin();
  if (e.pointerType === "touch" && ptr.piece.single && ptr.piece.w !== ptr.piece.h && !store("snappy-tip-turn")){ store("snappy-tip-turn", 1); say(t("tipTwoFinger")); }
  moveFloat(e); computeTarget(e);
}
function showFloat(){
  floatEl = document.createElement("div"); floatEl.className = "floating";
  floatEl.appendChild(pieceEl(ptr.piece, cell)); document.body.appendChild(floatEl);
  if (ptr.source === "board"){ const el = els.get(ptr.brick.id); if (el) el.classList.add("lifted"); const a = auraFor(ptr.brick.id); if (a) a.classList.add("lifted"); }
}
// the held piece floats a little up and to the side of where it will land, so its landing shadow peeks out underneath
function moveFloat(e){
  ptr.last = {clientX: e.clientX, clientY: e.clientY};
  const up = Math.min(20, cell * .5);
  floatEl.style.transform = `translate(${e.clientX - ptr.grabX - up * .6}px, ${e.clientY - ptr.grabY - ptr.lift - up}px)`;
}
function hideGhost(){ if (ghostEl){ ghostEl.remove(); ghostEl = null; } }
function computeTarget(e){
  const r = plate.getBoundingClientRect();
  const cx = e.clientX, cy = e.clientY - ptr.lift;
  const trayEl = $("#tray");
  const overTray = ptr.source === "board" && overEl(trayEl, e.clientX, e.clientY);
  const inTrash = overTray || overEl(trash, e.clientX, e.clientY);
  trash.classList.toggle("hot", inTrash && !overTray);
  trayEl.classList.toggle("hot", overTray);
  const wrapEl = $("#plateWrap");
  const near = cx > r.left - cell && cx < r.right + cell && cy > r.top - cell && cy < r.bottom + cell
    && (!wrapEl.classList.contains("zoomed") || overEl(wrapEl, cx, cy));   // a zoomed board hides its edges
  ptr.inTrash = inTrash;
  if (!near || inTrash){ ptr.target = null; hideGhost(); return; }
  const p = ptr.piece;
  let gx = Math.round((cx - ptr.grabX - r.left) / cell);
  let gy = Math.round((cy - ptr.grabY - r.top) / cell);
  gx = clamp(gx, 0, Math.max(0, B.cols - p.w)); gy = clamp(gy, 0, Math.max(0, B.rows - p.h));
  const res = canPlace(p.bricks, gx, gy, ptr.source === "board" ? ptr.brick.id : 0);
  ptr.target = {gx, gy, ...res};
  // the landing shadow: a see-through copy of the piece, in its own colours and shape, where it will snap
  if (!ghostEl){
    ghostEl = document.createElement("div"); ghostEl.className = "ghost";
    ghostEl.appendChild(pieceEl(p, cell)); ghostEl.appendChild(document.createElement("b"));
    plate.appendChild(ghostEl);
  }
  // most finger moves land on the same spot: only touch the ghost when it really changes
  const look = [gx, gy, p.w, p.h, res.ok, res.ok && res.z > 0 ? "▲" + (res.z + 1) : ""].join();
  if (ghostEl._look === look) return;
  ghostEl._look = look;
  ghostEl.style.left = `calc(var(--cell) * ${gx})`; ghostEl.style.top = `calc(var(--cell) * ${gy})`;
  ghostEl.classList.toggle("bad", !res.ok);
  ghostEl.lastChild.textContent = res.ok && res.z > 0 ? "▲" + (res.z + 1) : "";
}
function endDrag(e, cancelled){
  const p = ptr; ptr = null; clearTimeout(p.timer);
  hideGhost(); hideSpin(); trash.classList.remove("hot"); $("#tray").classList.remove("hot");
  if (floatEl){ floatEl.remove(); floatEl = null; }
  if (p.source === "board"){ const el = els.get(p.brick.id); if (el) el.classList.remove("lifted"); const a = auraFor(p.brick.id); if (a) a.classList.remove("lifted"); }
  if (cancelled) return;
  if (!p.moved){
    if (p.source === "tray") toggleSelect(p.sel); else tapBrick(p.brick);
    return;
  }
  if (p.source === "tray"){
    if (p.target && p.target.ok){
      if (tool !== "move") setTool("move", true);      // a new brick from the toy box: back to building
      placePiece(p.piece, p.target.gx, p.target.gy);
      if (Math.random() < .25) say(pick(t("cheers").split("|")));
    } else if (p.target){ sfx.nope(); say(t(p.target.full ? "tooHigh" : "spotTaken")); }
    return;
  }
  const b = p.brick;
  if (p.target && p.target.ok){
    pushHistory(); b.x = p.target.gx; b.y = p.target.gy; b.z = p.target.z; commit(); sfx.snap();
  } else if (p.inTrash || !p.target){
    removeBrick(b.id); say(t("byeBrick"));
  } else { sfx.nope(); const el = els.get(b.id); if (el) wiggle(el); if (!settings.stack) say(t("spotTaken")); }
}
function wiggle(el){ const again = el.classList.contains("wiggle"); el.classList.remove("wiggle", "wiggle2"); el.classList.add(again ? "wiggle2" : "wiggle"); }
// big boards skip the flash: repainting it under a fast paint swipe made the swipe lag
// two copies of the same flash take turns, so it restarts without making the page work out its whole layout again
function flash(el){
  if (!el || reduceMotion || plate.classList.contains("calm")) return;
  const again = el.classList.contains("flash");
  el.classList.remove("flash", "flash2"); el.classList.add(again ? "flash2" : "flash");
}

function removeBrick(id, noHistory){
  const i = B.bricks.findIndex(b => b.id === id); if (i < 0) return;
  if (!noHistory) pushHistory();
  B.bricks.splice(i, 1);
  const el = els.get(id);
  if (el){ els.delete(id); if (reduceMotion) el.remove(); else { el.classList.add("poof"); setTimeout(() => el.remove(), 300); } }
  commit(); sfx.remove();
}
function tapBrick(b){
  const el = els.get(b.id);
  if (b.w === b.h){ sfx.nope(); if (el) wiggle(el); say(t("squareTurn")); return; }
  const nw = b.h, nh = b.w;
  const tries = [
    [b.x + Math.round((b.w - nw) / 2), b.y + Math.round((b.h - nh) / 2)],
    [b.x, b.y], [b.x + b.w - nw, b.y], [b.x, b.y + b.h - nh], [b.x + b.w - nw, b.y + b.h - nh],
  ];
  const wasStack = settings.stack; if ((b.z || 0) > 0) settings.stack = true;
  for (const [x, y] of tries){
    const res = canPlace([{x: 0, y: 0, w: nw, h: nh}], x, y, b.id);
    if (res.ok){
      settings.stack = wasStack;
      pushHistory(); b.x = x; b.y = y; b.w = nw; b.h = nh; b.z = res.z; commit(); sfx.turn(); flash(els.get(b.id));
      return;
    }
  }
  settings.stack = wasStack;
  sfx.nope(); if (el) wiggle(el); say(t("noRoomTurn"));
}

/* ---- paint / erase brush ---- */
function brushOp(b){
  if (!b || ptr.done.has(b.id)) return;
  ptr.done.add(b.id);
  if (tool === "erase"){
    if (!ptr.changed){ pushHistory(); ptr.changed = true; }
    removeBrick(b.id, true);
  } else if (tool === "paint" && (b.c !== color || (b.t || "std") !== brickStyle)){
    if (!ptr.changed){ pushHistory(); ptr.changed = true; }
    b.c = color; b.t = brickStyle; const el = els.get(b.id); if (el){ styleBrickEl(el, b); flash(el); }
    renderAuras(); emit("change"); sfx.paint();
  }
}
function brushAt(e){
  // the board grid knows which brick is on top under the finger: no hit test of the whole page on every move.
  // A phone reports the finger about once a frame, so a quick swipe jumps over studs: walk from the last spot
  // in small steps (as the pencil does) so the eraser and paint touch every brick the finger passed over.
  // A swiping eraser is as wide as a fingertip (a third of a stud each way), so thin pencil lines don't slip past
  // its corners; a tap still takes off just the brick under the finger.
  const r = plate.getBoundingClientRect(), p = ptr, last = p.last, rad = tool === "erase" && last ? .35 : 0;
  const fx = (e.clientX - r.left) / cell, fy = (e.clientY - r.top) / cell;
  const steps = last ? Math.max(1, Math.ceil(Math.hypot(fx - last[0], fy - last[1]) / .3)) : 1;
  for (let i = 1; i <= steps; i++){
    const x = last ? last[0] + (fx - last[0]) * i / steps : fx, y = last ? last[1] + (fy - last[1]) * i / steps : fy;
    for (let gy = Math.floor(y - rad); gy <= Math.floor(y + rad); gy++)
      for (let gx = Math.floor(x - rad); gx <= Math.floor(x + rad); gx++) brushOp(topAt(gx, gy));
  }
  p.last = [fx, fy];
}

/* ---- fill bucket ---- */
function fillAt(x, y, opts = {}){
  if (x < 0 || y < 0 || x >= B.cols || y >= B.rows) return 0;
  const target = topAt(x, y);
  if (!target){
    // flood the empty floor
    const seen = new Set([y * 1000 + x]), q = [[x, y]], cells = [];
    while (q.length && cells.length < 900){
      const [cx, cy] = q.shift(); cells.push([cx, cy]);
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx = cx + dx, ny = cy + dy, k = ny * 1000 + nx;
        if (nx < 0 || ny < 0 || nx >= B.cols || ny >= B.rows || seen.has(k)) continue;
        seen.add(k); if (!grid[ny][nx].length) q.push([nx, ny]);
      }
    }
    const pix = Array.from({length: B.rows}, () => Array(B.cols).fill(null));
    cells.forEach(([cx, cy]) => { pix[cy][cx] = color; });
    if (!opts.noHistory) pushHistory();
    const anim = new Map();
    decompose(pix).forEach(b => {
      const nb = {id: nextId++, ...b, t: brickStyle, z: 0};
      B.bricks.push(nb); anim.set(nb.id, Math.min(500, (Math.abs(b.x - x) + Math.abs(b.y - y)) * 18));
    });
    commit(anim);
    return cells.length;
  }
  // recolour connected bricks of the same colour
  const from = target.c;
  if (from === color && (target.t || "std") === brickStyle) return 0;
  const seen = new Set(), q = [[x, y]], hit = new Set();
  seen.add(y * 1000 + x);
  while (q.length){
    const [cx, cy] = q.shift();
    const b = topAt(cx, cy); if (!b || b.c !== from) continue;
    hit.add(b);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = cx + dx, ny = cy + dy, k = ny * 1000 + nx;
      if (nx < 0 || ny < 0 || nx >= B.cols || ny >= B.rows || seen.has(k)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  if (!opts.noHistory) pushHistory();
  hit.forEach(b => { b.c = color; b.t = brickStyle; const el = els.get(b.id); if (el){ styleBrickEl(el, b); flash(el); } });
  renderAuras(); emit("change");
  return hit.size;
}
/* ---- brick pencil: draw with a finger, and the line turns into bricks; a closed loop fills in ---- */
let pencilSvg = null;
function startPencil(e){
  if (B.locked){ sfx.nope(); return; }
  const thick = settings.age === "little" ? 2 : 1;
  ptr = {kind: "pencil", id: e.pointerId, pts: [], cells: new Set(), thick};
  pencilSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  pencilSvg.setAttribute("class", "pencil-line"); pencilSvg.setAttribute("viewBox", `0 0 ${B.cols} ${B.rows}`);
  pencilSvg.setAttribute("preserveAspectRatio", "none");
  pencilSvg.innerHTML = `<path fill="none" stroke="${color}" stroke-width="${thick}" stroke-linecap="round" stroke-linejoin="round"/>`;
  plate.appendChild(pencilSvg);
  pencilAt(e);
}
// the studs a pencil stroke covers from point a to point b: walk in small steps so a fast swipe leaves no gaps
function pencilLine(p, a, b){
  const steps = a ? Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .3) : 1;
  for (let i = 1; i <= steps; i++){
    const x = a ? a[0] + (b[0] - a[0]) * i / steps : b[0], y = a ? a[1] + (b[1] - a[1]) * i / steps : b[1];
    // a thick pencil covers the 2×2 studs nearest the finger
    const x0 = p.thick === 2 ? Math.round(x) - 1 : Math.floor(x), y0 = p.thick === 2 ? Math.round(y) - 1 : Math.floor(y);
    for (let dy = 0; dy < p.thick; dy++) for (let dx = 0; dx < p.thick; dx++){
      const cx = clamp(x0 + dx, 0, B.cols - 1), cy = clamp(y0 + dy, 0, B.rows - 1);
      p.cells.add(cy * B.cols + cx);
    }
  }
}
function pencilAt(e){
  const r = plate.getBoundingClientRect(), p = ptr;
  const fx = clamp((e.clientX - r.left) / cell, 0, B.cols - .01), fy = clamp((e.clientY - r.top) / cell, 0, B.rows - .01);
  const last = p.pts[p.pts.length - 1];
  if (last && Math.hypot(fx - last[0], fy - last[1]) < .25) return;
  pencilLine(p, last, [fx, fy]);
  p.pts.push([fx, fy]);
  pencilSvg.firstChild.setAttribute("d", "M" + p.pts.map(q => q[0].toFixed(2) + " " + q[1].toFixed(2)).join("L") + (p.pts.length === 1 ? "l.01 0" : ""));
}
function endPencil(cancelled){
  const p = ptr; ptr = null;
  if (pencilSvg){ pencilSvg.remove(); pencilSvg = null; }
  if (cancelled || !p.cells.size) return;
  const W = B.cols, H = B.rows, cells = p.cells;
  // a line that ends near where it started is a loop: fill its inside too
  const a = p.pts[0], z = p.pts[p.pts.length - 1];
  const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]);
  if (p.pts.length > 6 && Math.hypot(a[0] - z[0], a[1] - z[1]) <= 2.5 * p.thick
      && Math.max(...xs) - Math.min(...xs) >= 3 && Math.max(...ys) - Math.min(...ys) >= 3){
    // close the little gap between the end and the start, or the fill leaks out through it and nothing fills
    pencilLine(p, z, a);
    const out = new Uint8Array(W * H), stack = [];
    for (let x = 0; x < W; x++){ stack.push(x, (H - 1) * W + x); }
    for (let y = 0; y < H; y++){ stack.push(y * W, y * W + W - 1); }
    while (stack.length){
      const i = stack.pop(); if (out[i] || cells.has(i)) continue; out[i] = 1;
      const x = i % W, y = (i - x) / W;
      if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
    }
    for (let i = 0; i < W * H; i++) if (!out[i]) cells.add(i);
  }
  // only empty studs get bricks; cover them with the biggest bricks that fit, then 1×1s at the edges
  const free = new Uint8Array(W * H);
  for (const i of cells){ const x = i % W, y = (i - x) / W; if (!grid[y][x].length) free[i] = 1; }
  const sizes = [[4, 2], [2, 4], [3, 2], [2, 3], [2, 2], [1, 1]];
  const fits = (x, y, w, h) => { if (x + w > W || y + h > H) return false; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!free[(y + j) * W + x + i]) return false; return true; };
  const made = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    if (!free[y * W + x]) continue;
    const [w, h] = sizes.find(([w, h]) => fits(x, y, w, h));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) free[(y + j) * W + x + i] = 0;
    made.push({x, y, w, h});
  }
  if (!made.length){ sfx.nope(); say(t("spotTaken")); return; }
  pushHistory();
  const anim = new Map(), gap = Math.max(4, Math.min(24, Math.round(600 / made.length)));
  made.forEach((m, i) => { const nb = {id: nextId++, ...m, c: color, t: brickStyle, z: 0}; B.bricks.push(nb); anim.set(nb.id, i * gap); });
  commit(anim); sfx.snap(); if (made.length > 3) sfx.fill();
  emit("placed", {n: made.length});
}

function doFill(e){
  const {x, y} = cellFromEvent(e);
  pushHistory();
  const n = fillAt(x, y, {noHistory: true});
  rebuildGrid(); render();
  if (n){ sfx.fill(); emit("placed", {n: 0}); } else { B.hist.pop(); updateUndo(); sfx.nope(); }
}


/* ---- board pointer events ---- */
// while a finger is on the board or the toy box, the endless glow, twinkle and shimmer of the bricks wait where they are:
// every frame drawn while they run restyles each glowing brick, which made drags and paint swipes stutter on phones.
// They are paused one by one (a class on the board would make the page restyle every brick twice per touch).
(function holdShimmer(){
  const down = new Set(); let held = [];
  const canAnimate = !!plate.getAnimations;
  window.addEventListener("pointerdown", e => {
    if (!canAnimate || !e.target.closest || !e.target.closest("#plateWrap, #tray")) return;
    down.add(e.pointerId);
    if (held.length || plate.classList.contains("calm")) return;
    held = plate.getAnimations({subtree: true}).filter(a => a.effect && a.effect.pseudoElement && a.playState === "running")
      .map(a => { a.pause(); const el = a.effect.target; return [a, el, el._t]; });
  }, true);
  const up = e => {
    if (!down.delete(e.pointerId) || down.size) return;
    // only bricks still on the board with the same style get their shimmer back; asking each
    // animation for its state here would make the page restyle once per brick
    const calm = plate.classList.contains("calm");
    for (const [a, el, t] of held) if (!calm && el.isConnected && el._t === t) a.play(); else a.cancel();
    held = [];
  };
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointercancel", up, true);
})();
plate.addEventListener("pointerdown", e => {
  if (e.button > 0 || ptr) return;
  e.preventDefault();
  if (tool === "paint" || tool === "erase"){ ptr = {kind: "brush", id: e.pointerId, done: new Set(), changed: false}; brushAt(e); return; }
  if (tool === "fill"){ doFill(e); return; }
  if (tool === "draw"){ startPencil(e); return; }
  const el = e.target.closest(".brick");
  if (el && el.parentElement === plate){ const b = byId.get(+el.dataset.id); if (b && !B.locked) startBoardDrag(e, b); return; }
  const c = cellFromEvent(e);
  ptr = {kind: "tap", id: e.pointerId, sx: e.clientX, sy: e.clientY, gx: c.x, gy: c.y};
});
window.addEventListener("pointermove", e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (ptr.kind === "brush"){ const ev = e.getCoalescedEvents ? e.getCoalescedEvents() : []; (ev.length ? ev : [e]).forEach(brushAt); return; }
  if (ptr.kind === "pencil"){ e.preventDefault(); const ev = e.getCoalescedEvents ? e.getCoalescedEvents() : []; (ev.length ? ev : [e]).forEach(pencilAt); return; }
  if (ptr.kind === "tap") return;
  if (!ptr.moved){
    const far = Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy);
    if (ptr.hold){
      // still waiting for the hold: moving away first means it was a swipe, so leave the brick alone
      ptr.lx = e.clientX; ptr.ly = e.clientY;
      if (far > 10){ clearTimeout(ptr.timer); ptr = null; }
      return;
    }
    if (far < 7) return;
    pickUp(e); return;
  }
  e.preventDefault();
  moveFloat(e); computeTarget(e);
}, {passive: false});
window.addEventListener("pointerup", e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (ptr.kind === "brush"){ ptr = null; emit("change"); return; }
  if (ptr.kind === "pencil"){ endPencil(false); return; }
  if (ptr.kind === "tap"){
    const tp = ptr; ptr = null;
    if (Math.hypot(e.clientX - tp.sx, e.clientY - tp.sy) > 12) return;
    const piece = pieceFor(selected);
    if (!piece){ say(t("tapHint")); return; }
    const gx = clamp(tp.gx - Math.floor((piece.w - 1) / 2), 0, Math.max(0, B.cols - piece.w));
    const gy = clamp(tp.gy - Math.floor((piece.h - 1) / 2), 0, Math.max(0, B.rows - piece.h));
    if (!placePiece(piece, gx, gy)){ sfx.nope(); say(t(settings.stack ? "tooHigh" : "noRoomThere")); }
    return;
  }
  endDrag(e, false);
});
// a brick picked up from the toy box follows the finger: the toy box doesn't scroll under it
$("#tray").addEventListener("touchmove", e => { if (ptr && ptr.kind === "drag" && ptr.moved && e.cancelable) e.preventDefault(); }, {passive: false});
window.addEventListener("pointercancel", e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (ptr.kind === "drag") endDrag(e, true);
  else if (ptr.kind === "pencil") endPencil(true);
  else ptr = null;
});

window.addEventListener("keydown", e => {
  const typing = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing){ e.preventDefault(); undo(); return; }
  if (e.key === "Escape"){ closeModal(); }
  if (typing) return;
  if (e.key.toLowerCase() === "r"){
    if (ptr && ptr.kind === "drag" && ptr.moved && ptr.piece.single) turnDragged();
    else toggleTurn();
  }
});
function turnDragged(){
  const p = ptr.piece; [p.w, p.h] = [p.h, p.w]; p.bricks[0].w = p.w; p.bricks[0].h = p.h;
  [ptr.grabX, ptr.grabY] = [p.w * cell / 2, p.h * cell / 2];
  floatEl.innerHTML = ""; floatEl.appendChild(pieceEl(p, cell)); sfx.turn(); hideGhost();
  if (ptr.last){ moveFloat(ptr.last); computeTarget(ptr.last); }
  if (spinEl.classList.contains("on")){ spinEl.classList.remove("spun", "spun2"); spinEl.classList.add(spinEl._n = spinEl._n === "spun" ? "spun2" : "spun"); }
}
// on touch screens a big turn button shows while a long brick is held: tap it with the other hand to turn the brick
// (the two-finger handler below does the turning). It sits in the board's bottom corner on the side of the free hand.
const spinEl = document.createElement("button");
spinEl.type = "button"; spinEl.className = "spin"; spinEl.tabIndex = -1;
spinEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>';
document.body.appendChild(spinEl);
function showSpin(){
  const p = ptr.piece; if (!p.single || p.w === p.h) return;
  spinEl.setAttribute("aria-label", t("turnBricks"));
  const r = $("#plateWrap").getBoundingClientRect(), size = 76, pad = 12;
  const left = settings.hand === "left";
  spinEl.style.left = (left ? r.right - size - pad : r.left + pad) + "px";
  spinEl.style.top = Math.min(r.bottom, window.innerHeight) - size - pad + "px";
  spinEl.classList.add("on");
}
function hideSpin(){ spinEl.classList.remove("on", "spun", "spun2"); }
// on a tablet: while one finger drags a brick, tap anywhere with another finger to turn it
window.addEventListener("pointerdown", e => {
  if (!ptr || ptr.kind !== "drag" || !ptr.moved || e.pointerId === ptr.id || e.pointerType === "mouse") return;
  e.preventDefault(); e.stopPropagation();
  if (ptr.piece.single) turnDragged();
}, true);
function toggleTurn(){
  turned = !turned;
  buildShapes(); sfx.turn(); say(t(turned ? "turnedUp" : "turnedDown"));
}

/* ===================== toolbar actions ===================== */
let clearArmed = null;
function clearBoard(){
  if (!B.bricks.length){ say(t("alreadyEmpty")); return; }
  if (!clearArmed){
    $("#clearTxt").textContent = t("sure"); say(t("clearAgain")); sfx.click();
    clearArmed = setTimeout(() => { clearArmed = null; $("#clearTxt").textContent = t("clear"); }, 3000);
    return;
  }
  clearTimeout(clearArmed); clearArmed = null; $("#clearTxt").textContent = t("clear");
  pushHistory(); sfx.whoosh();
  const old = B.bricks; B.bricks = [];
  if (!reduceMotion){
    for (const b of old){
      const el = els.get(b.id); if (!el) continue; els.delete(b.id);
      el.classList.add("fly");
      el.style.transform = `translate(${(Math.random() - .5) * 400}px, ${-200 - Math.random() * 300}px) rotate(${(Math.random() - .5) * 720}deg)`;
      setTimeout(() => el.remove(), 520);
    }
  }
  leavePhotoBoard(); commit(); say(t("allClear"));
}

/* ---- saving files ---- */
const capDownloads = IN_ARTIFACT ? Promise.resolve(window.claude.use("downloads")).catch(() => null) : Promise.resolve(null);
// preview() makes the picture for the "hold to save" fallback, only when it is needed
async function saveFile(blob, filename, preview){
  if (!IN_ARTIFACT && coarse && navigator.canShare && navigator.share){
    try {
      const file = new File([blob], filename, {type: blob.type || "image/png"});
      if (navigator.canShare({files: [file]})){ await navigator.share({files: [file]}); return "saved"; }
    } catch(e){ if (e && e.name === "AbortError") return "declined"; }
  }
  if (!IN_ARTIFACT){
    try {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      return "saved";
    } catch(e){ /* fall through to preview */ }
  } else {
    const d = await Promise.race([capDownloads, new Promise(r => setTimeout(() => r(null), 1500))]);
    if (d){
      try { await d.save({filename, data: blob}); return "saved"; }
      catch(err){ if (err && err.code === "declined") return "declined"; }
    }
  }
  openModal(`<p>${esc(t("holdToSave"))}</p><img alt="" src="${preview()}"><div class="modal-actions"><button class="btn" data-close>${esc(t("close"))}</button></div>`, t("yourPicture"));
  return "preview";
}
async function savePicture(){
  if (!B.bricks.length){ say(t("buildFirst")); return; }
  sfx.click();
  const cv = boardCanvas(B, Math.min(40, Math.floor(2600 / Math.max(B.cols, B.rows))));
  const blob = await new Promise(res => cv.toBlob(res, "image/png"));
  const r = await saveFile(blob, "my-brick-picture.png", () => cv.toDataURL("image/png"));
  if (r === "saved"){ say(t("savedPic")); sfx.cheer(); emit("saved"); }
  else if (r === "declined") say(t("noPic"));
  else { say(t("picReady")); emit("saved"); }
}

/* ---- modal ---- */
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])); }
let modalEl = null;
function openModal(html, label, cls = ""){
  closeModal();
  modalEl = document.createElement("div"); modalEl.className = "modal";
  modalEl.innerHTML = `<div class="modal-card ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label || "")}">${html}</div>`;
  modalEl.addEventListener("click", e => { if (e.target === modalEl || e.target.closest("[data-close]")) closeModal(); });
  document.body.appendChild(modalEl);
  const f = modalEl.querySelector("[data-autofocus]") || modalEl.querySelector("button, input");
  if (f) f.focus();
  return modalEl.querySelector(".modal-card");
}
function closeModal(){ if (modalEl){ modalEl.remove(); modalEl = null; } }

/* ---- board settings ---- */
function buildBoardControls(){
  const pl = $("#plates"); pl.innerHTML = "";
  for (const p of PLATES){
    const b = document.createElement("button"); b.type = "button"; b.className = "swatch"; b.dataset.hex = p.hex;
    b.setAttribute("aria-label", p[LANG]); b.title = p[LANG];
    const f = document.createElement("span"); f.className = "swatch-face"; paintBoardVars(f, p.hex); b.appendChild(f);
    b.addEventListener("click", () => {
      if (B.plate === p.hex) return;
      pushHistory(); B.plate = p.hex; applyBoard(); emit("change"); sfx.click();
      say(t("plateSay", {c: p[LANG]}));
    });
    pl.appendChild(b);
  }
  // board styles: the same buttons as the brick styles, each with a little board wearing that style
  const ps = $("#plateStyles"); ps.innerHTML = "";
  for (const s of STYLES){
    const b = document.createElement("button"); b.type = "button"; b.className = "stylebtn"; b.dataset.ps = s.id; b.title = s[LANG];
    const prev = document.createElement("span"); prev.className = "plate pprev"; prev.dataset.ps = s.id; b.appendChild(prev);
    const lab = document.createElement("span"); lab.textContent = s[LANG]; b.appendChild(lab);
    b.addEventListener("click", () => {
      if (plateStyle(B.ps) === s.id) return;
      pushHistory(); B.ps = s.id; applyBoard(); emit("change"); sfx.click();
      say(t("plateStyleSay_" + s.id));
    });
    ps.appendChild(b);
  }
  // board sizes: the same space every time, with fewer or more studs in it
  const bz = $("#boardSizes"); bz.innerHTML = "";
  for (const s of BOARD_SIZES){
    const b = document.createElement("button"); b.type = "button"; b.className = "sizebtn"; b.dataset.bs = s.id; b.title = s[LANG];
    const prev = document.createElement("span"); prev.className = "plate pprev sprev"; prev.style.setProperty("--n", s.n); b.appendChild(prev);
    const ic = document.createElement("span"); ic.className = "sizeic"; ic.textContent = s.ic; ic.setAttribute("aria-hidden", "true"); b.appendChild(ic);
    const lab = document.createElement("span"); lab.textContent = s[LANG]; b.appendChild(lab);
    b.addEventListener("click", () => {
      if (boardSize(B.bs) === s.id) return;
      pushHistory(); B.bs = s.id; applyBoard(); emit("change"); sfx.click();
      say(t("boardSizeSay_" + s.id));
    });
    bz.appendChild(b);
  }
  syncBoardControls();
}
function syncBoardControls(){
  // games and photo boards keep their own size: the size picker is for building only
  $(".sec-plates").classList.toggle("fixed-size", B !== FREE || isPhotoBoard());
  $$("#boardSizes .sizebtn").forEach(b => b.setAttribute("aria-pressed", b.dataset.bs === boardSize(B.bs)));
  $$("#boardSizes .pprev").forEach(e => { paintBoardVars(e, B.plate); e.dataset.ps = plateStyle(B.ps); });
  $$("#plates .swatch").forEach(b => b.setAttribute("aria-pressed", b.dataset.hex === B.plate));
  $$("#plateStyles .stylebtn").forEach(b => b.setAttribute("aria-pressed", b.dataset.ps === plateStyle(B.ps)));
  $$("#plateStyles .pprev").forEach(e => paintBoardVars(e, B.plate));
}
// boards can also stand upright (tall photos), so a size matches either way round
const sizeFits = (s, cols, rows) => (s.cols === cols && s.rows === rows) || (s.cols === rows && s.rows === cols);
// the building board's size follows the screen, so a saved board can have any number of studs
function isBoardSize(cols, rows){
  return ALL_SIZES.some(s => sizeFits(s, cols, rows)) || [cols, rows].every(n => Number.isInteger(n) && n >= 4 && n <= 120);
}
function isPhotoBoard(){ return PHOTO_SIZES.some(s => sizeFits(s, B.cols, B.rows)); }
// an emptied Poster board turns back into a normal Large board for building by hand
function leavePhotoBoard(){
  if (!isPhotoBoard()) return;
  const s = SIZES.find(z => z.id === "l"); B.cols = s.cols; B.rows = s.rows; applyBoard();
}
on("board", syncBoardControls);
