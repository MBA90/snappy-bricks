/* ===================== phones: toy box tabs, board zoom (pinch or + / −) ===================== */
addStrings({
  toyBox: ["Toy box", "صندوق الألعاب"],
  tabBricks: ["Bricks", "مكعبات"], tabColors: ["Colors", "ألوان"], tabStyles: ["Style", "الشكل"],
  tabShapes: ["Shapes", "أشكال"], tabBoard: ["Board", "اللوحة"],
  zoomIn: ["Make the board bigger", "كبّر اللوحة"], zoomOut: ["Make the board smaller", "صغّر اللوحة"],
  zoomFit: ["Show the whole board", "اعرض اللوحة كلها"],
});

/* ---- toy box tabs (only shown on phones, where the toy box is a short dock) ---- */
(function trayTabs(){
  const tray = $("#tray");
  const tabs = $$("#trayTabs .ttab");
  function setTab(name){
    tray.dataset.tab = name;
    tabs.forEach(b => b.setAttribute("aria-selected", b.dataset.tab === name));
    $("#trayBody").scrollLeft = 0;
  }
  tabs.forEach(b => b.addEventListener("click", () => { sfx.click(); setTab(b.dataset.tab); }));
  const dot = $("#trayTabs .ttab-dot");
  const showColor = c => paintVars(dot, c);
  on("color", showColor); showColor(color);
  setTab("bricks");
})();

/* ---- board zoom ---- */
const plateWrap = $("#plateWrap");
// keep the board point under (cx, cy) in place while the zoom changes
function zoomTo(z, cx, cy){
  const r0 = plate.getBoundingClientRect(), c0 = cell;
  if (cx == null){ const w = plateWrap.getBoundingClientRect(); cx = w.left + w.width / 2; cy = w.top + w.height / 2; }
  const ax = (cx - r0.left) / c0, ay = (cy - r0.top) / c0;
  boardZoom = clamp(z, 1, zoomMax); fitCell();
  const r1 = plate.getBoundingClientRect();
  plateWrap.scrollLeft += r1.left - (cx - ax * cell);
  plateWrap.scrollTop += r1.top - (cy - ay * cell);
  updateZoomBtns();
}
function updateZoomBtns(){
  $("#zoomOutBtn").disabled = boardZoom <= 1;
  $("#zoomFitBtn").disabled = boardZoom <= 1;
  $("#zoomInBtn").disabled = boardZoom >= zoomMax - .01;
}
// when the tools stand in a column beside the board, the zoom buttons move into it, above Undo, so they never cover the board
(function zoomHome(){
  const zb = $("#zoomBar"), home = zb.parentNode, after = zb.nextSibling;
  const upright = matchMedia("(orientation:portrait), (max-width:899px) and (min-height:541px)");
  const place = () => {
    if (!upright.matches) $("#tools").insertBefore(zb, $("#undoBtn"));
    else home.insertBefore(zb, after);
    fitStale = true;                                   // the phone turned: every brick gets a new size, style them once
    fitCell();
  };
  upright.addEventListener ? upright.addEventListener("change", place) : upright.addListener(place);
  place();
})();
$("#zoomInBtn").addEventListener("click", () => { sfx.click(); zoomTo(boardZoom * 1.6); });
$("#zoomOutBtn").addEventListener("click", () => { sfx.click(); zoomTo(boardZoom / 1.6); });
$("#zoomFitBtn").addEventListener("click", () => { sfx.click(); zoomTo(1); });
on("board", () => requestAnimationFrame(updateZoomBtns));
on("resize", updateZoomBtns);
plateWrap.addEventListener("wheel", e => {
  if (!e.ctrlKey || $("#zoomBar").hidden) return;      // trackpad pinch / ctrl + wheel
  e.preventDefault(); zoomTo(boardZoom * Math.exp(-e.deltaY / 200), e.clientX, e.clientY);
}, {passive: false});

/* two fingers on the board: pinch to zoom, slide to move around. One finger still builds.
   While the fingers move, the board is only stretched (a cheap picture scale); the bricks are
   redrawn at their new size once, when the fingers lift. Redrawing every brick on every frame
   made pinching a big board stutter on phones. */
(function pinch(){
  const pts = new Map(); let g = null, want = null, raf = 0;
  // fingers report many moves per frame; the preview moves at most once per frame
  const apply = () => {
    raf = 0; if (!g || !want) return;
    const {z, m} = want; want = null;
    g.zEnd = clamp(z, 1, zoomMax); g.mEnd = m;
    const s = g.zEnd / g.z;
    plate.style.transform = `translate(${m.x - g.r.left - s * g.ax * g.c}px, ${m.y - g.r.top - s * g.ay * g.c}px) scale(${s})`;
  };
  // fingers lifted: drop the stretch and draw the board at the new zoom, the same spot under the fingers
  const finish = () => {
    if (raf){ cancelAnimationFrame(raf); raf = 0; apply(); }
    const {zEnd, mEnd, ax, ay} = g; g = null; want = null;
    plate.style.transform = ""; plate.style.transformOrigin = ""; plate.style.willChange = "";
    if (zEnd == null) return;
    boardZoom = zEnd; fitCell();
    const r1 = plate.getBoundingClientRect();
    plateWrap.scrollLeft += r1.left + ax * cell - mEnd.x;
    plateWrap.scrollTop += r1.top + ay * cell - mEnd.y;
    updateZoomBtns();
  };
  const two = () => [...pts.values()].slice(0, 2);
  const mid = ([a, b]) => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
  const dist = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y) || 1;
  plateWrap.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch") return;
    pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (pts.size !== 2 || $("#zoomBar").hidden) return;
    if (ptr && ptr.kind === "drag" && ptr.moved) return;  // second finger turns a dragged brick
    if (ptr){
      // the first finger's action becomes part of the pinch: undo what it started
      if (ptr.kind === "brush" && ptr.changed){ ptr = null; undo(); }
      else if (ptr.kind === "select"){ ptr = null; cancelSelection(); }
      ptr = null;
    }
    e.preventDefault(); e.stopPropagation();
    const p = two(), m = mid(p), r = plate.getBoundingClientRect();
    g = {d: dist(p), z: boardZoom, r, c: cell, ax: (m.x - r.left) / cell, ay: (m.y - r.top) / cell};
    plate.style.transformOrigin = "0 0"; plate.style.willChange = "transform";
  }, true);
  window.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (!g || pts.size < 2) return;
    e.preventDefault();
    const p = two();
    want = {z: g.z * dist(p) / g.d, m: mid(p)};
    if (!raf) raf = requestAnimationFrame(apply);
  }, {passive: false});
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2 && g) finish(); };
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
})();
