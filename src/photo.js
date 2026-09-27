/* ===================== photo to bricks =====================
   A photo is cropped, shrunk to one pixel per stud, matched to the brick colours,
   and laid out with real brick sizes. Everything happens on the device. */
addStrings({
  photoOpen: ["Brick my photo", "صورتي بالمكعبات"],
  photoPick: ["Choose a photo", "اختر صورة"],
  photoTake: ["Take a photo", "التقط صورة"],
  photoSample: ["Try Bricky", "جرّب بريكي"],
  photoHint: ["Pick a photo and I'll turn it into bricks!", "اختر صورة وسأحوّلها إلى مكعبات!"],
  photoColors: ["Colors", "الألوان"],
  colorsFew: ["4 colors", "4 ألوان"], colorsSome: ["8 colors", "8 ألوان"], colorsAll: ["All colors", "كل الألوان"],
  photoView: ["Picture", "الصورة"], viewWhole: ["Whole photo", "الصورة كاملة"], viewZoom: ["Zoom in", "تكبير"],
  photoBuild: ["Build it!", "ابنِها!"],
  photoPrivacy: ["Your photo stays on this device. It is never uploaded.", "صورتك تبقى على هذا الجهاز ولا تُرفع أبدًا."],
  photoDone: ["Ta-da! Your photo is made of bricks.", "تادا! صورتك صارت من المكعبات."],
  photoBad: ["I couldn't open that picture. Try another one.", "لم أستطع فتح هذه الصورة. جرّب صورة أخرى."],
  photoBricks: ["{n} bricks", "{n} مكعبًا"],
});
BADGES.push({id: "photo", icon: "📷", en: ["Photo artist", "Turn a photo into bricks"], ar: ["فنان الصور", "حوّل صورة إلى مكعبات"]});

const PHOTO = {img: null, size: "l", colors: 8, zoom: false, pix: null, bricks: null};
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function toLab([r, g, b]){
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = lin(r), G = lin(g), Bl = lin(b);
  let X = (R * 0.4124 + G * 0.3576 + Bl * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + Bl * 0.0722, Z = (R * 0.0193 + G * 0.1192 + Bl * 0.9505) / 1.08883;
  const f = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  X = f(X); Y = f(Y); Z = f(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const PAL_LAB = () => COLORS.map(c => ({hex: c.hex, lab: toLab(hexRgb(c.hex))}));

// 1. crop and shrink: one averaged colour per stud
function photoPixels(img, cols, rows, zoom){
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const ar = cols / rows;
  let sw = iw, sh = iw / ar; if (sh > ih){ sh = ih; sw = ih * ar; }
  if (zoom){ sw *= .62; sh *= .62; }
  let sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  if (zoom) sy = Math.max(0, (ih - sh) * .35);           // faces sit a little above the middle
  // shrink in halves for a smooth result
  let src = img, W = sw, H = sh, cx = sx, cy = sy;
  const S = 4, tw = cols * S, th = rows * S;
  while (W / 2 > tw && H / 2 > th){
    const c = document.createElement("canvas"); c.width = Math.round(W / 2); c.height = Math.round(H / 2);
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
    x.drawImage(src, cx, cy, W, H, 0, 0, c.width, c.height);
    src = c; W = c.width; H = c.height; cx = 0; cy = 0;
  }
  const cv = document.createElement("canvas"); cv.width = tw; cv.height = th;
  const x = cv.getContext("2d", {willReadFrequently: true}); x.imageSmoothingQuality = "high";
  x.fillStyle = "#fff"; x.fillRect(0, 0, tw, th);
  x.drawImage(src, cx, cy, W, H, 0, 0, tw, th);
  const d = x.getImageData(0, 0, tw, th).data;
  const out = [];
  for (let y = 0; y < rows; y++){
    const row = [];
    for (let X = 0; X < cols; X++){
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++){
        const k = ((y * S + j) * tw + (X * S + i)) * 4; r += d[k]; g += d[k + 1]; b += d[k + 2];
      }
      const n = S * S; r /= n; g /= n; b /= n;
      // a little more colour and contrast, so the bricks look bright
      const m = (r + g + b) / 3, sat = 1.3, con = 1.08;
      r = (m + (r - m) * sat - 128) * con + 128; g = (m + (g - m) * sat - 128) * con + 128; b = (m + (b - m) * sat - 128) * con + 128;
      row.push([clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)]);
    }
    out.push(row);
  }
  return out;
}
// 2. match to brick colours; with fewer colours, pick the set that fits the photo best
function quantize(px, k){
  const pal = PAL_LAB(), labs = px.flat().map(toLab);
  const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const D = labs.map(l => pal.map(p => dist(l, p.lab)));
  let chosen = [], best = labs.map(() => Infinity);
  k = Math.min(k, pal.length);
  while (chosen.length < k){
    let pick = -1, score = Infinity;
    for (let p = 0; p < pal.length; p++){
      if (chosen.includes(p)) continue;
      let s = 0; for (let i = 0; i < labs.length; i++) s += Math.min(best[i], D[i][p]);
      if (s < score){ score = s; pick = p; }
    }
    chosen.push(pick); best = best.map((b, i) => Math.min(b, D[i][pick]));
  }
  const cols = px[0].length;
  const grid = px.map((row, y) => row.map((_, x) => {
    const i = y * cols + x; let bp = chosen[0];
    for (const p of chosen) if (D[i][p] < D[i][bp]) bp = p;
    return pal[bp].hex;
  }));
  // tidy lonely specks
  const H = grid.length, W = cols, out = grid.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const me = grid[y][x], nb = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([a, b]) => (grid[y + b] || [])[x + a]).filter(Boolean);
    if (nb.includes(me)) continue;
    const cnt = {}; nb.forEach(c => cnt[c] = (cnt[c] || 0) + 1);
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 3) out[y][x] = top[0];
  }
  return out;
}
// 3. real brick sizes, biggest first
function mosaicBricks(pix){
  const H = pix.length, W = pix[0].length, used = pix.map(r => r.map(() => false)), out = [];
  const shapes = [];
  [[6, 2], [4, 2], [3, 2], [2, 2], [4, 1], [3, 1], [2, 1], [1, 1]].forEach(([w, h]) => { shapes.push([w, h]); if (w !== h) shapes.push([h, w]); });
  const fits = (x, y, w, h, c) => {
    if (x + w > W || y + h > H) return false;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (used[y + j][x + i] || pix[y + j][x + i] !== c) return false;
    return true;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    if (used[y][x]) continue;
    const c = pix[y][x];
    for (const [w, h] of shapes){
      if (!fits(x, y, w, h, c)) continue;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[y + j][x + i] = true;
      out.push({x, y, w, h, c});
      break;
    }
  }
  return out;
}
function photoDims(){
  const s = SIZES.find(z => z.id === PHOTO.size) || SIZES[2];
  const iw = PHOTO.img.naturalWidth || PHOTO.img.width, ih = PHOTO.img.naturalHeight || PHOTO.img.height;
  return ih > iw * 1.1 ? [s.rows, s.cols] : [s.cols, s.rows];      // tall photos get a tall board
}
function photoMake(){
  if (!PHOTO.img) return;
  const [cols, rows] = photoDims();
  PHOTO.pix = quantize(photoPixels(PHOTO.img, cols, rows, PHOTO.zoom), PHOTO.colors);
  PHOTO.bricks = mosaicBricks(PHOTO.pix);
  drawPhotoPreview();
}
function drawPhotoPreview(){
  const cv = $("#photoCanvas"), pix = PHOTO.pix; if (!pix) return;
  const rows = pix.length, cols = pix[0].length;
  const box = $("#photoStage").clientWidth || 480;
  const maxH = Math.max(170, Math.min(window.innerHeight * .36, 400));
  const c = Math.max(4, Math.floor(Math.min(box / cols, maxH / rows)));
  const dpr = window.devicePixelRatio || 1;
  cv.width = cols * c * dpr; cv.height = rows * c * dpr; cv.style.width = cols * c + "px"; cv.style.height = rows * c + "px";
  const x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const b of PHOTO.bricks){
    x.fillStyle = b.c; x.fillRect(b.x * c, b.y * c, b.w * c, b.h * c);
    x.strokeStyle = "rgba(0,0,0,.28)"; x.lineWidth = 1; x.strokeRect(b.x * c + .5, b.y * c + .5, b.w * c - 1, b.h * c - 1);
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++){
      const cx = (b.x + i + .5) * c, cy = (b.y + j + .5) * c;
      x.beginPath(); x.arc(cx, cy, c * .3, 0, Math.PI * 2);
      x.fillStyle = "rgba(255,255,255,.28)"; x.fill();
      x.strokeStyle = "rgba(0,0,0,.18)"; x.stroke();
    }
  }
  $("#photoCount").textContent = t("photoBricks", {n: PHOTO.bricks.length});
  $("#photoStage").classList.add("ready");
  $("#photoBuildBtn").disabled = false;
}
function photoLoad(src, revoke){
  const img = new Image();
  img.onload = () => { PHOTO.img = img; photoMake(); if (revoke) URL.revokeObjectURL(src); sfx.snap(); };
  img.onerror = () => { sfx.nope(); $("#photoMsg").textContent = t("photoBad"); speak(t("photoBad"), LANG); };
  img.src = src;
}
function photoSample(){
  const svg = $("#bricky").outerHTML.replace('id="bricky"', 'xmlns="http://www.w3.org/2000/svg" width="560" height="420"')
    .replace(/viewBox="[^"]*"/, 'viewBox="-14 -4 92 69"');
  const wrapped = svg.replace(/(<svg[^>]*>)/, '$1<rect x="-14" y="-4" width="92" height="69" fill="#8FD3FF"/><rect x="-14" y="52" width="92" height="13" fill="#3DC45A"/>');
  photoLoad("data:image/svg+xml;charset=utf-8," + encodeURIComponent(wrapped));
}
function openPhotoSheet(){
  PHOTO.size = (settings.age === "little") ? "m" : "l";
  syncPhotoSegs();
  $("#photoMsg").textContent = t("photoHint");
  openSheet("photoSheet");
  speak(t("photoHint"), LANG);
  if (PHOTO.img) requestAnimationFrame(photoMake);
}
function buildPhotoSizes(){
  const box = $("#photoSizeSeg"); box.innerHTML = "";
  SIZES.forEach(z => {
    const b = document.createElement("button"); b.className = "btn"; b.type = "button"; b.dataset.size = z.id; b.textContent = z[LANG];
    b.addEventListener("click", () => { PHOTO.size = z.id; sfx.click(); syncPhotoSegs(); photoMake(); });
    box.appendChild(b);
  });
  syncPhotoSegs();
}
buildPhotoSizes();
function syncPhotoSegs(){
  $$("#photoSizeSeg [data-size]").forEach(b => b.setAttribute("aria-pressed", b.dataset.size === PHOTO.size));
  $$("#photoColorSeg [data-k]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.k === PHOTO.colors));
  $$("#photoViewSeg [data-zoom]").forEach(b => b.setAttribute("aria-pressed", (b.dataset.zoom === "1") === PHOTO.zoom));
}
function buildPhoto(){
  if (!PHOTO.bricks) return;
  const [cols, rows] = photoDims();
  const st = brickStyle === "round" ? "std" : brickStyle;
  closeSheets();
  if (currentMode !== "free") setMode("free", true);
  showScreen("studio");
  pushHistory();
  FREE.cols = cols; FREE.rows = rows; FREE.plate = "#FBFAF5";
  FREE.bricks = PHOTO.bricks.map(b => ({id: nextId++, ...b, t: st, z: 0}));
  B = FREE; clearEls(); applyBoard(); commit(new Map(FREE.bricks.map(b => [b.id, Math.min(1400, b.y * 45 + b.x * 8)])));
  sfx.cheer(); say(t("photoDone"), {speak: true});
  award("photo");
  emit("photoBuilt", FREE.bricks.length);
  requestAnimationFrame(fitCell);
}
$("#photoOpenBtn").addEventListener("click", () => { sfx.click(); openPhotoSheet(); });
["#photoFile", "#photoCam"].forEach(id => $(id).addEventListener("change", e => {
  const f = e.target.files && e.target.files[0]; e.target.value = "";
  if (f) photoLoad(URL.createObjectURL(f), true);
}));
$("#photoPickBtn").addEventListener("click", () => $("#photoFile").click());
$("#photoCamBtn").addEventListener("click", () => $("#photoCam").click());
$("#photoCamBtn").hidden = !coarse;
$("#photoSampleBtn").addEventListener("click", () => { sfx.click(); photoSample(); });
$$("#photoColorSeg [data-k]").forEach(b => b.addEventListener("click", () => { PHOTO.colors = +b.dataset.k; sfx.click(); syncPhotoSegs(); photoMake(); }));
$$("#photoViewSeg [data-zoom]").forEach(b => b.addEventListener("click", () => { PHOTO.zoom = b.dataset.zoom === "1"; sfx.click(); syncPhotoSegs(); photoMake(); }));
$("#photoBuildBtn").addEventListener("click", buildPhoto);
on("resize", () => { if (!$("#photoSheet").hidden) drawPhotoPreview(); });
on("lang", () => { buildPhotoSizes(); if (PHOTO.bricks) $("#photoCount").textContent = t("photoBricks", {n: PHOTO.bricks.length}); });
