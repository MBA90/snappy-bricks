/* ===================== phones: toy box tabs, board zoom (pinch or + / −) ===================== */
addStrings({
  toyBox: ["Toy box", "صندوق الألعاب"],
  tabBricks: ["Bricks", "مكعبات"], tabColors: ["Colors", "ألوان"], tabStyles: ["Style", "الشكل"],
  tabShapes: ["Shapes", "أشكال"], tabBoard: ["Board", "اللوحة"],
  zoomIn: ["Make the board bigger", "كبّر اللوحة"], zoomOut: ["Make the board smaller", "صغّر اللوحة"],
  zoomFit: ["Show the whole board", "اعرض اللوحة كلها"],
  turnSideways: ["Turn your screen sideways!", "أدر الشاشة على جنبها!"],
  turnWider: ["Make the window wider to play!", "وسّع النافذة لتلعب!"],
});

/* ---- Snappy Bricks plays sideways: where the browser allows it (an installed app, full screen),
   hold the screen sideways; elsewhere the turn-me screen (styles8.css) asks for it ---- */
(function stayLandscape(){
  const so = screen.orientation;
  if (!so || !so.lock) return;
  const lock = () => so.lock("landscape").catch(() => {});
  lock();
  document.addEventListener("fullscreenchange", lock);
  document.addEventListener("pointerdown", lock, {once: true});
})();

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
  setTab("bricks");

  // Paint and Fill need a colour: the toy box shows the colours (under the bricks) the moment either is pressed,
  // and goes back to the tab it was on when the tool is put away
  let before = null;
  on("tool", tl => {
    if (tl === "paint" || tl === "fill" || tl === "draw"){
      if (tray.dataset.tab !== "bricks"){ before = tray.dataset.tab; setTab("bricks"); }
      showSwatches();
    } else if (before && tray.dataset.tab === "bricks"){ setTab(before); before = null; }
    else before = null;
  });
  tabs.forEach(b => b.addEventListener("click", () => { before = null; }));
  function showSwatches(){
    const sec = $("#tray .sec-colors");
    // scroll only the toy box (never the page) so the whole colour list is in view
    for (let box = sec.parentElement; box && box !== document.body; box = box.parentElement){
      const st = getComputedStyle(box), r = box.getBoundingClientRect(), s = sec.getBoundingClientRect();
      const behavior = reduceMotion ? "auto" : "smooth";
      if (/auto|scroll/.test(st.overflowY) && (s.top < r.top || s.bottom > r.bottom))
        box.scrollBy({top: s.top < r.top || s.height > r.height ? s.top - r.top - 8 : s.bottom - r.bottom + 8, behavior});
      if (/auto|scroll/.test(st.overflowX) && (s.left < r.left || s.right > r.right))
        box.scrollBy({left: s.left < r.left || s.width > r.width ? s.left - r.left - 8 : s.right - r.right + 8, behavior});
      if (box === tray) break;
    }
    if (reduceMotion || !Element.prototype.animate) return;
    // a quick pop, one colour after another; only size and see-through change, so nothing else on the page moves
    $$("#swatches .swatch").forEach((w, i) => w.animate(
      [{transform: "scale(.55)", opacity: 0}, {transform: "scale(1.08)", opacity: 1, offset: .7}, {transform: "none", opacity: 1}],
      {duration: 260, delay: i * 12, easing: "ease-out", fill: "backwards"}));
  }
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
  const upright = matchMedia("(max-width:899px) and (min-height:541px)");
  const place = () => {
    const tools = $("#tools"), undo = $("#undoBtn");
    if (!upright.matches) tools.insertBefore(zb, undo);
    else home.insertBefore(zb, after);
    fitStale = true;                                   // the layout changed: every brick gets a new size, style them once
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
      else if (ptr.kind === "pencil") endPencil(true);   // drop the half-drawn line, or it stays stuck on the board
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

/* ---- a sign on the board while Paint, Eraser, Draw or Fill is on: the board's edge takes the tool's colour,
   and tapping the sign goes back to building ---- */
(function toolSign(){
  const col = $(".board-col"), wrap = $("#plateWrap");
  const sign = document.createElement("button");
  sign.type = "button"; sign.className = "tool-sign"; sign.hidden = true;
  col.appendChild(sign);
  // on the board's top edge: the board can sit lower than the top of its box (tablets, computers)
  const place = () => {
    if (sign.hidden) return;
    const c = col.getBoundingClientRect(), w = wrap.getBoundingClientRect(), p = $("#plate").getBoundingClientRect();
    sign.style.top = Math.round(Math.max(w.top, p.top) - c.top - col.clientTop) + "px";
  };
  const show = tl => {
    col.dataset.usingTool = tl;   // not data-tool: that marks the tool buttons
    const btn = $(`#tools [data-tool="${tl}"]`);
    if (tl === "move" || !btn){ sign.hidden = true; return; }
    const name = btn.querySelector(".txt").textContent;
    sign.innerHTML = btn.querySelector("svg").outerHTML + `<span class="ts-txt"></span><span class="ts-x" aria-hidden="true">✕</span>`;
    sign.querySelector(".ts-txt").textContent = name;
    sign.setAttribute("aria-label", name + " ✕");
    sign.hidden = false; place();
  };
  on("tool", show); on("lang", () => show(tool));
  sign.addEventListener("click", () => setTool("move"));
  on("resize", place); on("board", place);
})();

/* ---- swipe the toy box left or right for the next or last tab ---- */
// a quick sideways swipe changes the tab; if the row under the finger scrolled instead, the swipe was for scrolling.
// Touch events (not pointer events) because the browser takes over pointers once a row starts to scroll.
(function traySwipe(){
  const body = $("#trayBody"), tray = $("#tray");
  let s = null;
  body.addEventListener("touchstart", e => {
    if (e.touches.length !== 1){ s = null; return; }
    const t0 = e.touches[0], scrolls = [];
    for (let el = e.target; el && el !== tray; el = el.parentElement) scrolls.push([el, el.scrollLeft]);
    s = {x: t0.clientX, y: t0.clientY, at: performance.now(), scrolls};
  }, {passive: true});
  body.addEventListener("touchend", e => {
    const st = s; s = null;
    if (!st || e.changedTouches.length !== 1 || (ptr && ptr.moved)) return;
    const t1 = e.changedTouches[0], dx = t1.clientX - st.x, dy = t1.clientY - st.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 2 || performance.now() - st.at > 700) return;
    if (st.scrolls.some(([el, x]) => Math.abs(el.scrollLeft - x) > 2)) return;
    const tabs = $$("#trayTabs .ttab").filter(b => b.offsetParent);
    const i = tabs.findIndex(b => b.dataset.tab === tray.dataset.tab);
    const rtl = document.documentElement.dir === "rtl";
    const step = (dx < 0) !== rtl ? 1 : -1;                // finger to the left: the next tab (the other way in Arabic)
    const next = tabs[i + step]; if (!next) return;
    next.click();
    body.classList.remove("swipe-next", "swipe-back"); void body.offsetWidth;
    body.classList.add(dx < 0 ? "swipe-next" : "swipe-back");
  }, {passive: true});
  body.addEventListener("animationend", () => body.classList.remove("swipe-next", "swipe-back"));
})();

