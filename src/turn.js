/* ===================== always sideways ===================== */
/* A phone or tablet held upright still shows Snappy Bricks sideways: the whole page is turned a quarter turn
   (TURN_CSS in build.py) and everything that measures the screen is told the turned sizes, so the
   sideways layouts, dragging, drawing and pinching work as if the device were on its side.
   build.py gives every size @media rule a turned twin; turnQuery() below does the same for matchMedia().
   Computers with a tall window are not turned: they show the "make the window wider" sign instead. */
const realMatchMedia = window.matchMedia.bind(window);
const turnedQ = realMatchMedia("(orientation:portrait) and (pointer:coarse)");
const pageTurned = () => turnedQ.matches;
const SIZE_FEATURE = /width|height|aspect-ratio|orientation/;
function splitQueries(q){
  const out = []; let d = 0, cur = "";
  for (const ch of q){
    if (ch === "(") d++; else if (ch === ")") d--;
    if (ch === "," && !d){ out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur); return out.map(s => s.trim()).filter(Boolean);
}
function swapQuery(q){
  return q.replace(/(min-|max-)?(width|height|aspect-ratio)\s*:\s*([0-9.]+)\s*\/\s*([0-9.]+)|(min-|max-)?(width|height)(?=\s*:)|orientation\s*:\s*landscape/g,
    (m, ap, af, a, b, p, f) => {
      if (af === "aspect-ratio") return (ap === "min-" ? "max-" : ap === "max-" ? "min-" : "") + "aspect-ratio:" + b + "/" + a;
      if (f) return (p || "") + (f === "width" ? "height" : "width");
      return "orientation:portrait";
    });
}
// a size query keeps its meaning on a sideways screen, and gets a twin that matches the same sizes turned upright
function turnQuery(q){
  return splitQueries(q).flatMap(s => {
    if (!SIZE_FEATURE.test(s) || /orientation\s*:\s*portrait/.test(s)) return [s];
    return [s + " and (orientation:landscape)", swapQuery(s) + " and (orientation:portrait) and (pointer:coarse)"];
  }).join(", ");
}
window.matchMedia = q => realMatchMedia(turnQuery(q));

(function turnTheScreen(){
  const root = document.documentElement;
  const W = Object.getOwnPropertyDescriptor(window, "innerWidth") || Object.getOwnPropertyDescriptor(Window.prototype, "innerWidth");
  const H = Object.getOwnPropertyDescriptor(window, "innerHeight") || Object.getOwnPropertyDescriptor(Window.prototype, "innerHeight");
  if (!W || !H || !W.get || !H.get) return;
  const realW = () => W.get.call(window), realH = () => H.get.call(window);
  // the real screen size, for the turned page's width and height (styles8.css)
  const size = () => { root.style.setProperty("--rw", realW() + "px"); root.style.setProperty("--rh", realH() + "px"); };
  size(); window.addEventListener("resize", size); window.addEventListener("orientationchange", size);
  Object.defineProperty(window, "innerWidth", {configurable: true, get: () => pageTurned() ? realH() : realW()});
  Object.defineProperty(window, "innerHeight", {configurable: true, get: () => pageTurned() ? realW() : realH()});
  // the page is turned clockwise: a spot (x, y) on the turned page sits at (screen width - y, x) on the glass
  const toPage = (x, y) => [y, realW() - x];
  const toGlass = (x, y) => [realW() - y, x];
  const patchXY = (proto, xs, ys) => {
    if (!proto) return;
    xs.forEach((xk, i) => {
      const yk = ys[i], dx = Object.getOwnPropertyDescriptor(proto, xk), dy = Object.getOwnPropertyDescriptor(proto, yk);
      if (!dx || !dy || !dx.get || !dy.get) return;
      Object.defineProperty(proto, xk, {configurable: true, enumerable: true, get(){ const x = dx.get.call(this); return pageTurned() ? toPage(x, dy.get.call(this))[0] : x; }});
      Object.defineProperty(proto, yk, {configurable: true, enumerable: true, get(){ const y = dy.get.call(this); return pageTurned() ? toPage(dx.get.call(this), y)[1] : y; }});
    });
  };
  patchXY(window.MouseEvent && MouseEvent.prototype, ["clientX", "pageX", "x", "screenX"], ["clientY", "pageY", "y", "screenY"]);
  patchXY(window.Touch && Touch.prototype, ["clientX", "pageX", "screenX"], ["clientY", "pageY", "screenY"]);
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function(){
    const r = rect.call(this);
    if (!pageTurned()) return r;
    const w = realW();
    return new DOMRect(r.top, w - r.right, r.height, r.width);
  };
  const atPoint = Document.prototype.elementFromPoint, allAtPoint = Document.prototype.elementsFromPoint;
  Document.prototype.elementFromPoint = function(x, y){ return pageTurned() ? atPoint.apply(this, toGlass(x, y)) : atPoint.call(this, x, y); };
  if (allAtPoint) Document.prototype.elementsFromPoint = function(x, y){ return pageTurned() ? allAtPoint.apply(this, toGlass(x, y)) : allAtPoint.call(this, x, y); };
})();

// the page itself does not scroll while turned; the app inside it does
function pageScroller(){ return pageTurned() ? document.querySelector(".app") : null; }
function pageScrollY(){ const s = pageScroller(); return s ? s.scrollTop : window.scrollY; }
function pageScrollTo(top, behavior){ const s = pageScroller(); (s || window).scrollTo({top, behavior: behavior || "auto"}); }
