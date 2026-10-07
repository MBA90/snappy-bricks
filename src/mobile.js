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
$("#zoomInBtn").addEventListener("click", () => { sfx.click(); zoomTo(boardZoom * 1.6); });
$("#zoomOutBtn").addEventListener("click", () => { sfx.click(); zoomTo(boardZoom / 1.6); });
$("#zoomFitBtn").addEventListener("click", () => { sfx.click(); zoomTo(1); });
on("board", () => requestAnimationFrame(updateZoomBtns));
on("resize", updateZoomBtns);
plateWrap.addEventListener("wheel", e => {
  if (!e.ctrlKey || $("#zoomBar").hidden) return;      // trackpad pinch / ctrl + wheel
  e.preventDefault(); zoomTo(boardZoom * Math.exp(-e.deltaY / 200), e.clientX, e.clientY);
}, {passive: false});

/* two fingers on the board: pinch to zoom, slide to move around. One finger still builds. */
(function pinch(){
  const pts = new Map(); let g = null;
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
    const p = two(); g = {d: dist(p), z: boardZoom, m: mid(p)};
  }, true);
  window.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (!g || pts.size < 2) return;
    e.preventDefault();
    const p = two(), m = mid(p);
    zoomTo(g.z * dist(p) / g.d, m.x, m.y);
    plateWrap.scrollLeft -= m.x - g.m.x; plateWrap.scrollTop -= m.y - g.m.y;
    g.m = m;
  }, {passive: false});
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) g = null; };
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
})();
