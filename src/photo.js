/* ===================== photo to bricks =====================
   A photo is framed (drag to move, + / − or pinch to zoom), shrunk to one colour per stud,
   tidied (levels, colour, sharpness), matched to all the brick colours with a colour
   difference that follows the eye (CIEDE2000), shaded with error diffusion on a
   Poster-size board (96×72), and laid out with real brick sizes using as few bricks as it can. Everything happens
   on the device. */
addStrings({
  photoOpen: ["Brick my photo", "صورتي بالمكعبات"],
  photoPick: ["Choose a photo", "اختر صورة"],
  photoTake: ["Take a photo", "التقط صورة"],
  photoSample: ["Try Bricky", "جرّب بريكي"],
  photoHint: ["Pick a photo and I'll turn it into bricks!", "اختر صورة وسأحوّلها إلى مكعبات!"],
  photoMove: ["Drag the picture to move it. Press + to zoom in.", "اسحب الصورة لتحريكها. اضغط + للتكبير."],
  photoView: ["Picture", "الصورة"], viewWhole: ["Whole photo", "الصورة كاملة"], viewZoom: ["Zoom in", "تكبير"],
  viewZoomOut: ["Zoom out", "تصغير"], photoFlip: ["Flip", "اقلب"], photoTurn: ["Turn the board", "أدر اللوحة"],
  photoPeek: ["See my photo", "شاهد صورتي"], photoPeekBack: ["See the bricks", "شاهد المكعبات"],
  photoParts: ["Bricks you need", "المكعبات التي تحتاجها"],
  photoBuild: ["Build it!", "ابنِها!"],
  photoPrivacy: ["Your photo stays on this device. It is never uploaded.", "صورتك تبقى على هذا الجهاز ولا تُرفع أبدًا."],
  photoDone: ["Ta-da! Your photo is made of bricks.", "تادا! صورتك صارت من المكعبات."],
  photoBad: ["I couldn't open that picture. Try another one.", "لم أستطع فتح هذه الصورة. جرّب صورة أخرى."],
  photoBricks: ["{n} bricks", "{n} مكعبًا"],
});
BADGES.push({id: "photo", icon: "📷", en: ["Photo artist", "Turn a photo into bricks"], ar: ["فنان الصور", "حوّل صورة إلى مكعبات"]});

const PHOTO = {
  img: null, work: null, tall: false,
  mirror: false, zoom: 1, cx: .5, cy: .5, peek: false, pix: null, bricks: null, crop: null,
};
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function toLab([r, g, b]){
  const lin = v => { v = clamp(v, 0, 255) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = lin(r), G = lin(g), Bl = lin(b);
  let X = (R * 0.4124 + G * 0.3576 + Bl * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + Bl * 0.0722, Z = (R * 0.0193 + G * 0.1192 + Bl * 0.9505) / 1.08883;
  const f = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  X = f(X); Y = f(Y); Z = f(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
// CIEDE2000: how different two colours look to people (better than plain Lab distance for skin, sky and greys)
function de2000(a, b){
  const [L1, a1, b1] = a, [L2, a2, b2] = b, rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = .5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const ap1 = a1 * (1 + G), ap2 = a2 * (1 + G);
  const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hp = (x, y) => { if (!x && !y) return 0; const h = Math.atan2(y, x) / rad; return h < 0 ? h + 360 : h; };
  const h1 = hp(ap1, b1), h2 = hp(ap2, b2);
  const dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2){ dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * rad / 2);
  const Lm = (L1 + L2) / 2, Cpm = (Cp1 + Cp2) / 2;
  let hm = h1 + h2;
  if (Cp1 * Cp2){ hm = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2; }
  const T = 1 - .17 * Math.cos((hm - 30) * rad) + .24 * Math.cos(2 * hm * rad) + .32 * Math.cos((3 * hm + 6) * rad) - .2 * Math.cos((4 * hm - 63) * rad);
  const SL = 1 + .015 * (Lm - 50) ** 2 / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + .045 * Cpm, SH = 1 + .015 * Cpm * T;
  const RT = -2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
let palLab = null;
// nearest brick colour for each rounded Lab colour, kept between rebuilds so dragging and zooming stay smooth
const nearMemo = new Map();

// 0. a smaller working copy of the photo, made once, so moving and zooming stay quick
function halveTo(src, sx, sy, sw, sh, tw, th){
  let s = src, W = sw, H = sh, x0 = sx, y0 = sy;
  while (W / 2 >= tw && H / 2 >= th){
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(W / 2)); c.height = Math.max(1, Math.round(H / 2));
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
    x.drawImage(s, x0, y0, W, H, 0, 0, c.width, c.height);
    s = c; W = c.width; H = c.height; x0 = 0; y0 = 0;
  }
  return {s, x0, y0, W, H};
}
function makeWork(img){
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const k = Math.min(1, 1100 / Math.max(iw, ih));
  const tw = Math.max(1, Math.round(iw * k)), th = Math.max(1, Math.round(ih * k));
  const h = halveTo(img, 0, 0, iw, ih, tw, th);
  const c = document.createElement("canvas"); c.width = tw; c.height = th;
  const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
  x.fillStyle = "#fff"; x.fillRect(0, 0, tw, th);            // see-through pictures sit on white
  x.drawImage(h.s, h.x0, h.y0, h.W, h.H, 0, 0, tw, th);
  return c;
}
// the part of the photo inside the frame
function photoCrop(cols, rows){
  const W = PHOTO.work.width, H = PHOTO.work.height, ar = cols / rows;
  let bw = W, bh = W / ar; if (bh > H){ bh = H; bw = H * ar; }
  const sw = bw / PHOTO.zoom, sh = bh / PHOTO.zoom;
  const cx = clamp(PHOTO.cx * W, sw / 2, W - sw / 2), cy = clamp(PHOTO.cy * H, sh / 2, H - sh / 2);
  PHOTO.cx = cx / W; PHOTO.cy = cy / H;
  return {sx: cx - sw / 2, sy: cy - sh / 2, sw, sh};
}
// 1. shrink: one averaged colour per stud
function photoPixels(cols, rows){
  const S = 4, tw = cols * S, th = rows * S, cr = PHOTO.crop = photoCrop(cols, rows);
  const h = halveTo(PHOTO.work, cr.sx, cr.sy, cr.sw, cr.sh, tw, th);
  const cv = document.createElement("canvas"); cv.width = tw; cv.height = th;
  const x = cv.getContext("2d", {willReadFrequently: true}); x.imageSmoothingQuality = "high";
  if (PHOTO.mirror){ x.translate(tw, 0); x.scale(-1, 1); }
  x.drawImage(h.s, h.x0, h.y0, h.W, h.H, 0, 0, tw, th);
  const d = x.getImageData(0, 0, tw, th).data, out = [];
  for (let y = 0; y < rows; y++){
    const row = [];
    for (let X = 0; X < cols; X++){
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++){
        const k = ((y * S + j) * tw + (X * S + i)) * 4; r += d[k]; g += d[k + 1]; b += d[k + 2];
      }
      const n = S * S; row.push([r / n, g / n, b / n]);
    }
    out.push(row);
  }
  return out;
}
// 2. tidy the colours: stretch dull photos, livelier colour, crisper edges
function tune(px){
  const H = px.length, W = px[0].length, lum = p => .299 * p[0] + .587 * p[1] + .114 * p[2];
  const ls = px.flat().map(lum).sort((a, b) => a - b);
  const lo = ls[Math.floor(ls.length * .02)], hi = ls[Math.ceil(ls.length * .98) - 1];
  const nlo = lo * .25, nhi = 255 - (255 - hi) * .25, gain = hi - lo > 8 ? (nhi - nlo) / (hi - lo) : 1;
  const sat = 1.12;
  let out = px.map(row => row.map(p => {
    let [r, g, b] = p.map(v => clamp(nlo + (v - lo) * gain, 0, 255));
    const m = lum([r, g, b]);
    // boost dull colours more than bright ones, so skin stays natural
    const s0 = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const k = 1 + (sat - 1) * (1 - s0);
    return [r, g, b].map(v => m + (v - m) * k);
  }));
  // a gentle sharpen so eyes, mouths and outlines survive the shrink
  const amt = Math.min(.45, 9 / Math.max(W, H));
  out = out.map((row, y) => row.map((p, x) => {
    const s = [0, 0, 0]; let n = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++){
      const q = (out[y + j] || [])[x + i]; if (!q) continue;
      s[0] += q[0]; s[1] += q[1]; s[2] += q[2]; n++;
    }
    return p.map((v, c) => clamp(v + amt * (v - s[c] / n), 0, 255));
  }));
  return out;
}
// 3. match to brick colours
function quantize(px){
  const H = px.length, W = px[0].length;
  const L = px.flat().map(toLab);
  const pal = palLab = palLab || COLORS.map(c => ({hex: c.hex, lab: toLab(hexRgb(c.hex))}));
  // remembered by rounded colour: big boards repeat the same colours a lot
  const nearest = l => {
    const key = Math.round(l[0]) * 1e6 + Math.round(l[1] + 128) * 1e3 + Math.round(l[2] + 128);
    let bi = nearMemo.get(key); if (bi !== undefined) return bi;
    let bd = Infinity; bi = 0;
    pal.forEach((p, i) => { const d = de2000(l, p.lab); if (d < bd){ bd = d; bi = i; } });
    if (nearMemo.size > 200000) nearMemo.clear();
    nearMemo.set(key, bi); return bi;
  };
  const grid = Array.from({length: H}, () => new Array(W));
  // Floyd–Steinberg in Lab, back and forth, with softened error so flat areas stay calm
  const str = .6, lim = [18, 24, 24];
  for (let y = 0; y < H; y++){
    const rtl = y % 2 === 1;
    for (let s = 0; s < W; s++){
      const x = rtl ? W - 1 - s : s, i = y * W + x, cur = L[i];
      const bi = nearest(cur); grid[y][x] = pal[bi].hex;
      const e = cur.map((v, c) => clamp((v - pal[bi].lab[c]) * str, -lim[c], lim[c]));
      const dx = rtl ? -1 : 1;
      [[dx, 0, 7], [-dx, 1, 3], [0, 1, 5], [dx, 1, 1]].forEach(([ox, oy, w]) => {
        const X = x + ox, Y = y + oy; if (X < 0 || X >= W || Y >= H) return;
        const q = L[Y * W + X]; for (let c = 0; c < 3; c++) q[c] += e[c] * w / 16;
      });
    }
  }
  return grid;
}
// 4. real brick sizes: try a few ways of filling and keep the one with the fewest bricks
function mosaicBricks(pix){
  const H = pix.length, W = pix[0].length;
  const byArea = SHAPES.slice().sort((a, b) => b[0] * b[1] - a[0] * a[1] || b[0] - a[0]);
  const lying = [], standing = [];
  byArea.forEach(([w, h]) => { lying.push([w, h]); if (w !== h) lying.push([h, w]); standing.push([h, w]); if (w !== h) standing.push([w, h]); });
  const run = (shapes, colFirst) => {
    const used = pix.map(r => r.map(() => false)), out = [];
    const fits = (x, y, w, h, c) => {
      if (x + w > W || y + h > H) return false;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (used[y + j][x + i] || pix[y + j][x + i] !== c) return false;
      return true;
    };
    const visit = (x, y) => {
      if (used[y][x]) return;
      const c = pix[y][x];
      for (const [w, h] of shapes){
        if (!fits(x, y, w, h, c)) continue;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[y + j][x + i] = true;
        out.push({x, y, w, h, c}); return;
      }
    };
    if (colFirst){ for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) visit(x, y); }
    else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) visit(x, y);
    return out;
  };
  return [run(lying, false), run(standing, true), run(standing, false), run(lying, true)]
    .reduce((a, b) => b.length < a.length ? b : a);
}
function photoDims(){
  const s = PHOTO_SIZES.find(z => z.id === "p");          // always the Poster board: enough studs to recognise the photo
  return PHOTO.tall ? [s.rows, s.cols] : [s.cols, s.rows];
}
let photoQueued = false;
function photoMake(){
  if (!PHOTO.work || photoQueued) return;
  photoQueued = true;
  requestAnimationFrame(() => {
    photoQueued = false;
    const [cols, rows] = photoDims();
    PHOTO.pix = quantize(tune(photoPixels(cols, rows)));
    PHOTO.bricks = mosaicBricks(PHOTO.pix);
    drawPhotoPreview();
  });
}
function drawPhotoPreview(){
  const cv = $("#photoCanvas"), pix = PHOTO.pix; if (!pix) return;
  const rows = pix.length, cols = pix[0].length;
  const box = ($("#photoStage").clientWidth || 480) - 24;
  const maxH = Math.max(170, Math.min(window.innerHeight * .38, 420));
  const c = Math.max(2, Math.floor(Math.min(box / cols, maxH / rows)));
  const dpr = window.devicePixelRatio || 1;
  cv.width = cols * c * dpr; cv.height = rows * c * dpr; cv.style.width = cols * c + "px"; cv.style.height = rows * c + "px";
  const x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (PHOTO.peek && PHOTO.crop){
    const cr = PHOTO.crop; x.imageSmoothingQuality = "high";
    x.save(); if (PHOTO.mirror){ x.translate(cols * c, 0); x.scale(-1, 1); }
    x.drawImage(PHOTO.work, cr.sx, cr.sy, cr.sw, cr.sh, 0, 0, cols * c, rows * c); x.restore();
  } else {
    for (const b of PHOTO.bricks){
      const X = b.x * c, Y = b.y * c, w = b.w * c, h = b.h * c;
      x.fillStyle = b.c; x.fillRect(X, Y, w, h);
      if (c >= 6){
        x.fillStyle = "rgba(255,255,255,.22)"; x.fillRect(X, Y, w, Math.max(1, c * .1)); x.fillRect(X, Y, Math.max(1, c * .1), h);
        x.fillStyle = "rgba(0,0,0,.16)"; x.fillRect(X, Y + h - Math.max(1, c * .1), w, Math.max(1, c * .1)); x.fillRect(X + w - Math.max(1, c * .1), Y, Math.max(1, c * .1), h);
      }
      if (c >= 4){ x.strokeStyle = "rgba(0,0,0,.3)"; x.lineWidth = 1; x.strokeRect(X + .5, Y + .5, w - 1, h - 1); }
      if (c >= 6) for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++){
        const cx = X + (i + .5) * c, cy = Y + (j + .5) * c;
        x.beginPath(); x.arc(cx + c * .04, cy + c * .06, c * .3, 0, Math.PI * 2); x.fillStyle = "rgba(0,0,0,.18)"; x.fill();
        x.beginPath(); x.arc(cx, cy, c * .3, 0, Math.PI * 2); x.fillStyle = b.c; x.fill();
        x.fillStyle = "rgba(255,255,255,.3)"; x.fill();
      }
    }
  }
  $("#photoCount").textContent = t("photoBricks", {n: PHOTO.bricks.length});
  $("#photoStage").classList.add("ready");
  $("#photoBuildBtn").disabled = false;
  drawParts();
}
// the shopping list: how many bricks of each colour
function drawParts(){
  const box = $("#photoParts"); box.innerHTML = "";
  if (!PHOTO.bricks) return;
  const by = new Map();
  PHOTO.bricks.forEach(b => { const e = by.get(b.c) || {n: 0, sizes: {}}; e.n++; const k = `${Math.max(b.w, b.h)}×${Math.min(b.w, b.h)}`; e.sizes[k] = (e.sizes[k] || 0) + 1; by.set(b.c, e); });
  const h = document.createElement("span"); h.className = "pp-title"; h.textContent = t("photoParts"); box.appendChild(h);
  [...by].sort((a, b) => b[1].n - a[1].n).forEach(([hex, e]) => {
    const col = COLORS.find(c => c.hex === hex), chip = document.createElement("span");
    chip.className = "pp-chip";
    const name = col ? col[LANG] : hex;
    chip.title = name + ": " + Object.entries(e.sizes).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} × ${k}`).join(", ");
    chip.setAttribute("aria-label", `${name} ${e.n}`);
    const sw = document.createElement("i"); sw.style.background = hex; chip.appendChild(sw);
    chip.appendChild(document.createTextNode("×" + e.n));
    box.appendChild(chip);
  });
}
function photoLoad(src, revoke){
  const img = new Image();
  img.onload = () => {
    if (revoke) URL.revokeObjectURL(src);
    try { PHOTO.work = makeWork(img); } catch(e){ img.onerror(); return; }
    PHOTO.img = img; PHOTO.zoom = 1; PHOTO.cx = .5; PHOTO.cy = .5; PHOTO.peek = false;
    PHOTO.tall = PHOTO.work.height > PHOTO.work.width * 1.1;            // tall photos get a tall board
    syncPhotoSegs(); photoMake(); sfx.snap();
    $("#photoMsg").textContent = t("photoMove");
  };
  img.onerror = () => { if (revoke) URL.revokeObjectURL(src); sfx.nope(); $("#photoMsg").textContent = t("photoBad"); speak(t("photoBad"), LANG); };
  img.src = src;
}
function photoSample(){
  const svg = $("#bricky").outerHTML.replace('id="bricky"', 'xmlns="http://www.w3.org/2000/svg" width="560" height="420"')
    .replace(/viewBox="[^"]*"/, 'viewBox="-14 -4 92 69"');
  const wrapped = svg.replace(/(<svg[^>]*>)/, '$1<rect x="-14" y="-4" width="92" height="69" fill="#8FD3FF"/><rect x="-14" y="52" width="92" height="13" fill="#3DC45A"/>');
  photoLoad("data:image/svg+xml;charset=utf-8," + encodeURIComponent(wrapped));
}
function openPhotoSheet(){
  syncPhotoSegs();
  $("#photoMsg").textContent = PHOTO.work ? t("photoMove") : t("photoHint");
  openSheet("photoSheet");
  speak(t("photoHint"), LANG);
  if (PHOTO.work) photoMake();
}
function syncPhotoSegs(){
  $("#photoWholeBtn").setAttribute("aria-pressed", PHOTO.zoom === 1);
  $("#photoFlipBtn").setAttribute("aria-pressed", PHOTO.mirror);
  $("#photoZoomOutBtn").disabled = PHOTO.zoom <= 1;
  const pk = $("#photoPeekBtn"); pk.hidden = !PHOTO.work; pk.setAttribute("aria-pressed", PHOTO.peek);
  pk.lastElementChild.textContent = t(PHOTO.peek ? "photoPeekBack" : "photoPeek");
  pk.firstElementChild.textContent = PHOTO.peek ? "🧱" : "👀";
}
function setZoom(z, fx, fy){
  const old = PHOTO.zoom; PHOTO.zoom = clamp(z, 1, 6);
  if (PHOTO.zoom === 1){ PHOTO.cx = .5; PHOTO.cy = .5; }
  else if (fx != null && PHOTO.crop && PHOTO.work){
    // keep the point under the fingers in place
    const W = PHOTO.work.width, H = PHOTO.work.height, cr = PHOTO.crop, r = old / PHOTO.zoom;
    const px = cr.sx + fx * cr.sw, py = cr.sy + fy * cr.sh;
    PHOTO.cx = (px + (cr.sx + cr.sw / 2 - px) * r) / W; PHOTO.cy = (py + (cr.sy + cr.sh / 2 - py) * r) / H;
  }
  syncPhotoSegs(); photoMake();
}
function buildPhoto(){
  if (!PHOTO.bricks) return;
  const [cols, rows] = photoDims();
  const st = brickStyle;
  closeSheets();
  if (currentMode !== "free") setMode("free", true);
  showScreen("studio");
  pushHistory();
  FREE.cols = cols; FREE.rows = rows; FREE.plate = "#FBFAF5";
  FREE.bricks = PHOTO.bricks.map(b => ({id: nextId++, ...b, t: st, z: 0}));
  B = FREE; clearEls(); applyBoard();
  // the brick-by-brick drop is lovely on small boards but too much work for thousands of bricks
  commit(FREE.bricks.length <= 900 ? new Map(FREE.bricks.map(b => [b.id, Math.min(1400, b.y * 45 + b.x * 8)])) : undefined);
  sfx.cheer(); say(t("photoDone"), {speak: true});
  award("photo");
  emit("photoBuilt", FREE.bricks.length);
  requestAnimationFrame(fitCell);
}

/* ---- move and zoom by dragging, pinching or the mouse wheel ---- */
(function photoGestures(){
  const cv = $("#photoCanvas"), pts = new Map();
  let last = null;
  const rel = e => { const r = cv.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)]; };
  cv.addEventListener("pointerdown", e => {
    if (!PHOTO.work) return;
    cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = null;
    cv.classList.add("grab");
  });
  cv.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId) || !PHOTO.crop) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    const r = cv.getBoundingClientRect();
    if (pts.size === 1){
      if (PHOTO.zoom === 1 && PHOTO.crop.sw >= PHOTO.work.width - 1 && PHOTO.crop.sh >= PHOTO.work.height - 1) return;
      const dx = (e.clientX - prev[0]) / r.width * PHOTO.crop.sw * (PHOTO.mirror ? -1 : 1), dy = (e.clientY - prev[1]) / r.height * PHOTO.crop.sh;
      PHOTO.cx -= dx / PHOTO.work.width; PHOTO.cy -= dy / PHOTO.work.height;
      photoMake();
    } else if (pts.size === 2){
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (last){
        const mx = clamp(((a[0] + b[0]) / 2 - r.left) / r.width, 0, 1), my = clamp(((a[1] + b[1]) / 2 - r.top) / r.height, 0, 1);
        setZoom(PHOTO.zoom * d / last, PHOTO.mirror ? 1 - mx : mx, my);
      }
      last = d;
    }
  });
  const up = e => { pts.delete(e.pointerId); last = null; if (!pts.size) cv.classList.remove("grab"); };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", e => {
    if (!PHOTO.work) return;
    e.preventDefault();
    const [fx, fy] = rel(e);
    setZoom(PHOTO.zoom * Math.exp(-e.deltaY * .0015), PHOTO.mirror ? 1 - fx : fx, fy);
  }, {passive: false});
})();

$("#photoOpenBtn").addEventListener("click", () => { sfx.click(); openPhotoSheet(); });
["#photoFile", "#photoCam"].forEach(id => $(id).addEventListener("change", e => {
  const f = e.target.files && e.target.files[0]; e.target.value = "";
  if (f) photoLoad(URL.createObjectURL(f), true);
}));
$("#photoPickBtn").addEventListener("click", () => $("#photoFile").click());
$("#photoCamBtn").addEventListener("click", () => $("#photoCam").click());
$("#photoCamBtn").hidden = !coarse;
$("#photoSampleBtn").addEventListener("click", () => { sfx.click(); photoSample(); });
$("#photoZoomInBtn").addEventListener("click", () => {
  sfx.click();
  if (PHOTO.zoom === 1 && PHOTO.work && PHOTO.work.height >= PHOTO.work.width * .7) PHOTO.cy = .4;   // faces sit a little above the middle
  setZoom(PHOTO.zoom * 1.35);
});
$("#photoZoomOutBtn").addEventListener("click", () => { sfx.click(); setZoom(PHOTO.zoom / 1.35 < 1.05 ? 1 : PHOTO.zoom / 1.35); });
$("#photoWholeBtn").addEventListener("click", () => { sfx.click(); setZoom(1); });
$("#photoTurnBtn").addEventListener("click", () => { PHOTO.tall = !PHOTO.tall; sfx.turn(); photoMake(); });
$("#photoFlipBtn").addEventListener("click", () => { PHOTO.mirror = !PHOTO.mirror; sfx.turn(); syncPhotoSegs(); photoMake(); });
$("#photoPeekBtn").addEventListener("click", () => { PHOTO.peek = !PHOTO.peek; sfx.click(); syncPhotoSegs(); drawPhotoPreview(); });
$("#photoBuildBtn").addEventListener("click", buildPhoto);
on("resize", () => { if (!$("#photoSheet").hidden) drawPhotoPreview(); });
on("lang", () => { if (PHOTO.bricks){ $("#photoCount").textContent = t("photoBricks", {n: PHOTO.bricks.length}); drawParts(); } });
