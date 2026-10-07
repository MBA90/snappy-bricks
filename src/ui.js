/* ===================== UI: tray, tools, dragging ===================== */
const settings = Object.assign({sound: true, talk: false, stack: false, mirror: "off", lang: "en", theme: "classic"}, store("snappy-settings") || {});
function saveSettings(){ store("snappy-settings", settings); }

let tool = "move";
let color = "#7FE3C0";
let brickStyle = "std";
let turned = false;
let selected = null;     // {kind:"brick",i} | {kind:"art",name} | {kind:"my",id}
let myStamps = (store("snappy-stamps") || []).map(s => ({...s, bricks: fitBricks(s.bricks || [])}));

/* ---- pieces ---- */
function brickPiece(i){
  let [w, h] = SHAPES[i]; if (turned) [w, h] = [h, w];
  return {w, h, single: true, bricks: [{x: 0, y: 0, w, h, c: color, t: brickStyle}]};
}
function artPiece(name){
  const pix = artToPix(ART[name].art);
  return {w: pix[0].length, h: pix.length, single: false,
          bricks: decompose(pix).map(b => ({...b, t: brickStyle === "round" ? "std" : brickStyle}))};
}
function myPiece(id){
  const s = myStamps.find(m => m.id === id); if (!s) return null;
  return {w: s.w, h: s.h, single: false, bricks: s.bricks.map(b => ({...b}))};
}
function pieceFor(sel){
  if (!sel) return null;
  if (sel.kind === "brick") return brickPiece(sel.i);
  if (sel.kind === "art") return artPiece(sel.name);
  if (sel.kind === "my") return myPiece(sel.id);
  return null;
}
function pieceEl(piece, px){
  const d = document.createElement("div"); d.className = "piece";
  d.style.setProperty("--cell", px + "px");
  d.style.width = piece.w * px + "px"; d.style.height = piece.h * px + "px";
  for (const b of piece.bricks){ const e = document.createElement("div"); styleBrickEl(e, b); d.appendChild(e); }
  return d;
}

/* ---- mirror ---- */
function mirrorFns(){
  const lr = r => ({...r, x: B.cols - r.x - r.w});
  const ud = r => ({...r, y: B.rows - r.y - r.h});
  if (settings.mirror === "lr") return [lr];
  if (settings.mirror === "four") return [lr, ud, r => lr(ud(r))];
  return [];
}
function drawMirrorLines(){
  plate.querySelectorAll(".mline").forEach(e => e.remove());
  if (settings.mirror === "off") return;
  const v = document.createElement("div"); v.className = "mline v"; plate.appendChild(v);
  if (settings.mirror === "four"){ const h = document.createElement("div"); h.className = "mline h"; plate.appendChild(h); }
}

/* ---- placing ---- */
function placePiece(piece, gx, gy, opts = {}){
  const res = canPlace(piece.bricks, gx, gy, 0);
  if (!res.ok) return 0;
  if (!opts.noHistory) pushHistory();
  const anim = new Map(); let n = 0;
  const add = (list, z0, delay0) => list.forEach((b, i) => {
    const nb = {id: nextId++, x: b.x, y: b.y, w: b.w, h: b.h, c: b.c, t: b.t || "std", z: z0 + (b.z || 0)};
    B.bricks.push(nb); anim.set(nb.id, piece.single ? delay0 : delay0 + i * 16); n++;
  });
  const abs = piece.bricks.map(b => ({...b, x: gx + b.x, y: gy + b.y}));
  add(abs, res.z, 0);
  if (!opts.noMirror){
    const orig = JSON.stringify(abs.map(b => [b.x, b.y, b.w, b.h]).sort());
    mirrorFns().forEach((fn, k) => {
      rebuildGrid();
      const m = abs.map(fn);
      if (JSON.stringify(m.map(b => [b.x, b.y, b.w, b.h]).sort()) === orig) return;
      const r2 = canPlace(m.map(b => ({...b, z: (b.z || 0)})), 0, 0, 0);
      if (r2.ok) add(m, r2.z, 90 * (k + 1));
    });
  }
  commit(anim);
  if (!opts.silent) sfx.snap();
  emit("placed", {n});
  return n;
}

/* ===================== tray UI ===================== */
const coarse = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
function trayCell(){ return window.innerWidth < 720 ? 14 : coarse ? 18 : 16; }
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
      say(tool === "paint" || tool === "fill" ? t("paintReady", {c: c[LANG]}) : t("colorPicked", {c: c[LANG]}));
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
  const mine = $("#myStamps"); mine.innerHTML = "";
  $("#myStampsWrap").hidden = !myStamps.length;
  for (const s of myStamps){
    const p = myPiece(s.id);
    const px = Math.max(3, Math.min(8, Math.floor(56 / Math.max(p.w, p.h))));
    const card = makeCard(p, px, t("myStamp"), {kind: "my", id: s.id});
    const x = document.createElement("button"); x.type = "button"; x.className = "card-x"; x.setAttribute("aria-label", t("deleteStamp")); x.textContent = "×";
    x.addEventListener("pointerdown", e => e.stopPropagation());
    x.addEventListener("click", e => {
      e.stopPropagation();
      myStamps = myStamps.filter(m => m.id !== s.id); store("snappy-stamps", myStamps);
      if (selected && selected.kind === "my" && selected.id === s.id) selected = null;
      buildStamps(); sfx.remove();
    });
    card.appendChild(x);
    mine.appendChild(card);
  }
}
function sameSel(a, b){ return !!(a && b && a.kind === b.kind && a.i === b.i && a.name === b.name && a.id === b.id); }
function toggleSelect(sel){
  selected = sameSel(selected, sel) ? null : sel;
  if (selected && tool !== "move") setTool("move", true);
  buildShapes(); buildStamps(); sfx.click();
  say(t(selected ? "tapToPlace" : "dragAnytime"));
}

/* ===================== tools ===================== */
function setTool(tl, quiet){
  tool = tl;
  $$("[data-tool]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tool === tl));
  plate.className = plate.className.replace(/tool-\w+/g, "").trim() + " tool-" + tl;
  if (tl !== "select") cancelSelection();
  if (tl !== "move" && selected){ selected = null; buildShapes(); buildStamps(); }
  if (quiet) return;
  sfx.click(); say(t("tool_" + tl));
}
function setMirror(m, quiet){
  settings.mirror = m; saveSettings();
  const btn = $("#mirrorBtn");
  btn.setAttribute("aria-pressed", m !== "off");
  btn.dataset.mode = m;
  $("#mirrorTxt").textContent = t("mirror_" + m);
  drawMirrorLines();
  if (!quiet){ sfx.turn(); say(t("mirrorSay_" + m)); if (m !== "off") emit("mirrorOn"); }
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
}
function startBoardDrag(e, b){
  const r = plate.getBoundingClientRect();
  ptr = {kind: "drag", id: e.pointerId, source: "board", brick: b, sx: e.clientX, sy: e.clientY, moved: false,
         piece: {w: b.w, h: b.h, single: true, bricks: [{x: 0, y: 0, w: b.w, h: b.h, c: b.c, t: b.t}]},
         grabX: e.clientX - (r.left + b.x * cell), grabY: e.clientY - (r.top + b.y * cell), lift: 0, target: null};
}
function showFloat(){
  floatEl = document.createElement("div"); floatEl.className = "floating";
  floatEl.appendChild(pieceEl(ptr.piece, cell)); document.body.appendChild(floatEl);
  if (ptr.source === "board"){ const el = els.get(ptr.brick.id); if (el) el.classList.add("lifted"); }
}
function moveFloat(e){ floatEl.style.transform = `translate(${e.clientX - ptr.grabX}px, ${e.clientY - ptr.grabY - ptr.lift}px)`; }
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
  if (!ghostEl){ ghostEl = document.createElement("div"); ghostEl.className = "ghost"; plate.appendChild(ghostEl); }
  placeEl(ghostEl, {x: gx, y: gy, w: p.w, h: p.h});
  ghostEl.classList.toggle("bad", !res.ok);
  ghostEl.textContent = res.ok && res.z > 0 ? "▲" + (res.z + 1) : "";
}
function endDrag(e, cancelled){
  const p = ptr; ptr = null;
  hideGhost(); trash.classList.remove("hot"); $("#tray").classList.remove("hot");
  if (floatEl){ floatEl.remove(); floatEl = null; }
  if (p.source === "board"){ const el = els.get(p.brick.id); if (el) el.classList.remove("lifted"); }
  if (cancelled) return;
  if (!p.moved){
    if (p.source === "tray") toggleSelect(p.sel); else tapBrick(p.brick);
    return;
  }
  if (p.source === "tray"){
    if (p.target && p.target.ok){
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
function wiggle(el){ el.classList.remove("wiggle"); void el.offsetWidth; el.classList.add("wiggle"); }
// big boards skip the flash: repainting it under a fast paint swipe made the swipe lag
function flash(el){ if (!el || reduceMotion || plate.classList.contains("calm")) return; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }

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

/* ---- paint / erase brush (with mirror) ---- */
function brushOp(b){
  if (!b || ptr.done.has(b.id)) return;
  ptr.done.add(b.id);
  if (tool === "erase"){
    if (!ptr.changed){ pushHistory(); ptr.changed = true; }
    removeBrick(b.id, true);
  } else if (tool === "paint" && (b.c !== color || (b.t || "std") !== brickStyle)){
    if (!ptr.changed){ pushHistory(); ptr.changed = true; }
    b.c = color; b.t = brickStyle; const el = els.get(b.id); if (el){ styleBrickEl(el, b); flash(el); }
    emit("change"); sfx.paint();
  }
}
function brushAt(e){
  const hit = document.elementFromPoint(e.clientX, e.clientY);
  const el = hit && hit.closest && hit.closest(".brick");
  if (!el || el.parentElement !== plate) return;
  const b = byId.get(+el.dataset.id); if (!b || ptr.done.has(b.id)) return;
  const mirrors = mirrorFns().map(fn => fn(b));
  brushOp(b);
  for (const r of mirrors){
    const b2 = topAt(r.x + ((r.w - 1) >> 1), r.y + ((r.h - 1) >> 1));
    brushOp(b2);
  }
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
  emit("change");
  return hit.size;
}
function doFill(e){
  const {x, y} = cellFromEvent(e);
  pushHistory();
  let n = fillAt(x, y, {noHistory: true});
  for (const fn of mirrorFns()){ rebuildGrid(); const r = fn({x, y, w: 1, h: 1}); n += fillAt(r.x, r.y, {noHistory: true}); }
  rebuildGrid(); render();
  if (n){ sfx.fill(); emit("placed", {n: 0}); } else { B.hist.pop(); updateUndo(); sfx.nope(); }
}

/* ---- select -> stamp ---- */
let selBox = null, selBricks = [];
function cancelSelection(){
  selBricks.forEach(b => { const el = els.get(b.id); if (el) el.classList.remove("selected"); });
  selBricks = []; if (selBox){ selBox.remove(); selBox = null; }
  const bar = $("#selbar"); if (bar) bar.hidden = true;
}
function drawSelBox(x0, y0, x1, y1){
  if (!selBox){ selBox = document.createElement("div"); selBox.className = "selbox"; plate.appendChild(selBox); }
  const x = Math.min(x0, x1), y = Math.min(y0, y1);
  placeEl(selBox, {x, y, w: Math.abs(x1 - x0) + 1, h: Math.abs(y1 - y0) + 1});
}
function finishSelection(x0, y0, x1, y1){
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1), ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  selBricks = B.bricks.filter(b => b.x >= xa && b.y >= ya && b.x + b.w - 1 <= xb && b.y + b.h - 1 <= yb);
  if (!selBricks.length){ cancelSelection(); say(t("selectNone")); return; }
  selBricks.forEach(b => { const el = els.get(b.id); if (el) el.classList.add("selected"); });
  $("#selbar").hidden = false;
  $("#selCount").textContent = t(selBricks.length === 1 ? "oneBrick" : "nBricks", {n: selBricks.length});
  say(t("selectDone"));
}
function makeStampFromSelection(){
  if (!selBricks.length) return;
  const mx = Math.min(...selBricks.map(b => b.x)), my = Math.min(...selBricks.map(b => b.y));
  const mz = Math.min(...selBricks.map(b => b.z || 0));
  const bricks = selBricks.map(b => ({x: b.x - mx, y: b.y - my, w: b.w, h: b.h, c: b.c, t: b.t || "std", z: (b.z || 0) - mz}));
  const w = Math.max(...bricks.map(b => b.x + b.w)), h = Math.max(...bricks.map(b => b.y + b.h));
  const s = {id: "s" + Date.now().toString(36), w, h, bricks};
  myStamps.unshift(s); myStamps = myStamps.slice(0, 12); store("snappy-stamps", myStamps);
  cancelSelection(); setTool("move", true);
  selected = {kind: "my", id: s.id}; buildShapes(); buildStamps();
  sfx.cheer(); say(t("stampMade")); emit("stampMade");
}
function deleteSelection(){
  if (!selBricks.length) return;
  pushHistory();
  const ids = new Set(selBricks.map(b => b.id));
  B.bricks = B.bricks.filter(b => !ids.has(b.id));
  selBricks.forEach(b => { const el = els.get(b.id); if (el){ els.delete(b.id); el.classList.add("poof"); setTimeout(() => el.remove(), 300); } });
  selBricks = []; cancelSelection(); commit(); sfx.remove();
}

/* ---- board pointer events ---- */
plate.addEventListener("pointerdown", e => {
  if (e.button > 0 || ptr) return;
  e.preventDefault();
  if (tool === "paint" || tool === "erase"){ ptr = {kind: "brush", id: e.pointerId, done: new Set(), changed: false}; brushAt(e); return; }
  if (tool === "fill"){ doFill(e); return; }
  if (tool === "select"){
    cancelSelection();
    const c = cellFromEvent(e);
    ptr = {kind: "select", id: e.pointerId, x0: clamp(c.x, 0, B.cols - 1), y0: clamp(c.y, 0, B.rows - 1)};
    ptr.x1 = ptr.x0; ptr.y1 = ptr.y0; drawSelBox(ptr.x0, ptr.y0, ptr.x1, ptr.y1);
    return;
  }
  const el = e.target.closest(".brick");
  if (el && el.parentElement === plate){ const b = byId.get(+el.dataset.id); if (b && !B.locked) startBoardDrag(e, b); return; }
  const c = cellFromEvent(e);
  ptr = {kind: "tap", id: e.pointerId, sx: e.clientX, sy: e.clientY, gx: c.x, gy: c.y};
});
window.addEventListener("pointermove", e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (ptr.kind === "brush"){ brushAt(e); return; }
  if (ptr.kind === "select"){
    const c = cellFromEvent(e);
    ptr.x1 = clamp(c.x, 0, B.cols - 1); ptr.y1 = clamp(c.y, 0, B.rows - 1);
    drawSelBox(ptr.x0, ptr.y0, ptr.x1, ptr.y1); return;
  }
  if (ptr.kind === "tap") return;
  if (!ptr.moved){
    if (Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) < 7) return;
    ptr.moved = true; showFloat();
    if (e.pointerType === "touch" && ptr.piece.single && ptr.piece.w !== ptr.piece.h && !store("snappy-tip-turn")){ store("snappy-tip-turn", 1); say(t("tipTwoFinger")); }
  }
  e.preventDefault();
  moveFloat(e); computeTarget(e);
}, {passive: false});
window.addEventListener("pointerup", e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (ptr.kind === "brush"){ ptr = null; emit("change"); return; }
  if (ptr.kind === "select"){ const p = ptr; ptr = null; finishSelection(p.x0, p.y0, p.x1, p.y1); return; }
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
window.addEventListener("pointercancel", e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (ptr.kind === "drag") endDrag(e, true);
  else if (ptr.kind === "select"){ ptr = null; cancelSelection(); }
  else ptr = null;
});

window.addEventListener("keydown", e => {
  const typing = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing){ e.preventDefault(); undo(); return; }
  if (e.key === "Escape"){ closeModal(); cancelSelection(); }
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
}
// on a tablet: while one finger drags a brick, tap anywhere with another finger to turn it
window.addEventListener("pointerdown", e => {
  if (!ptr || ptr.kind !== "drag" || !ptr.moved || e.pointerId === ptr.id || e.pointerType === "mouse") return;
  e.preventDefault(); e.stopPropagation();
  if (ptr.piece.single) turnDragged();
}, true);
function toggleTurn(){
  turned = !turned; $("#turnBtn").setAttribute("aria-pressed", turned);
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
  pushHistory(); sfx.whoosh(); cancelSelection();
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
  const sz = $("#sizes"); sz.innerHTML = "";
  for (const s of SIZES){
    const b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.dataset.size = s.id;
    b.textContent = s[LANG]; b.title = `${s.cols} × ${s.rows}`;
    b.addEventListener("click", () => setSize(s, true));
    sz.appendChild(b);
  }
  const pl = $("#plates"); pl.innerHTML = "";
  for (const p of PLATES){
    const b = document.createElement("button"); b.type = "button"; b.className = "swatch"; b.dataset.hex = p.hex;
    b.setAttribute("aria-label", p[LANG]); b.title = p[LANG];
    const f = document.createElement("span"); f.className = "swatch-face"; paintVars(f, p.hex); b.appendChild(f);
    b.addEventListener("click", () => {
      if (B.plate === p.hex) return;
      pushHistory(); B.plate = p.hex; applyBoard(); emit("change"); sfx.click();
      say(t("plateSay", {c: p[LANG]}));
    });
    pl.appendChild(b);
  }
  syncBoardControls();
}
function syncBoardControls(){
  $$("#sizes .btn").forEach(b => b.setAttribute("aria-pressed", b.dataset.size === sizeOf().id));
  $$("#plates .swatch").forEach(b => b.setAttribute("aria-pressed", b.dataset.hex === B.plate));
}
// boards can also stand upright (tall photos), so a size matches either way round
const sizeFits = (s, cols, rows) => (s.cols === cols && s.rows === rows) || (s.cols === rows && s.rows === cols);
function isBoardSize(cols, rows){ return ALL_SIZES.some(s => sizeFits(s, cols, rows)); }
function isPhotoBoard(){ return PHOTO_SIZES.some(s => sizeFits(s, B.cols, B.rows)); }
// an emptied Poster board turns back into a normal Large board for building by hand
function leavePhotoBoard(){
  if (!isPhotoBoard()) return;
  const s = SIZES.find(z => z.id === "l"); B.cols = s.cols; B.rows = s.rows; applyBoard();
}
function sizeOf(){ return ALL_SIZES.find(s => sizeFits(s, B.cols, B.rows)) || SIZES.find(z => z.id === "m"); }
function setSize(s, fromUser){
  if (s.cols === B.cols && s.rows === B.rows) return;
  if (fromUser && sizeFits(s, B.cols, B.rows)) return;
  const tall = fromUser && B.rows > B.cols;          // an upright photo board stays upright
  if (fromUser) pushHistory();
  const before = B.bricks.length;
  B.cols = tall ? s.rows : s.cols; B.rows = tall ? s.cols : s.rows;
  B.bricks = B.bricks.filter(b => b.x + b.w <= B.cols && b.y + b.h <= B.rows);
  applyBoard(); commit();
  if (fromUser){ sfx.click(); say(before > B.bricks.length ? t("sizeCut") : t("sizeSay", {s: s[LANG], c: s.cols, r: s.rows})); }
}
on("board", syncBoardControls);
