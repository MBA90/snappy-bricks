/* ===================== badges, replay, themes, gallery, cards ===================== */
addStrings({
  theme: ["Theme", "المظهر"], badges: ["Badges", "الأوسمة"], replay: ["Replay", "إعادة العرض"],
  pickTheme: ["Pick a theme", "اختر مظهرًا"],
  themeSay_classic: ["Back to the classic sky!", "عدنا إلى السماء الكلاسيكية!"],
  themeSay_space: ["Blast off! Welcome to space.", "انطلق! أهلًا بك في الفضاء."],
  themeSay_sea: ["Splash! Let's build under the sea.", "سبلاش! هيا نبني تحت البحر."],
  themeSay_birthday: ["Party time! Let's build for a birthday.", "وقت الحفلة! هيا نبني لعيد ميلاد."],
  themeSay_eid: ["Eid Mubarak! Let's build something special.", "عيد مبارك! هيا نبني شيئًا مميزًا."],
  badgeNew: ["New badge!", "وسام جديد!"],
  badgesTitle: ["My badges", "أوسمتي"],
  badgesSub: ["You have {a} of {b} badges. Keep building!", "لديك {a} من {b} وسامًا. واصل البناء!"],
  locked: ["Not yet", "ليس بعد"],
  replaySay: ["Watch how you built it!", "شاهد كيف بنيتها!"],
  replayDone: ["Ta-da! That's how you built it.", "تادا! هكذا بنيتها."],
  saveShare: ["Save and share", "احفظ وشارك"],
  saveCreation: ["Save to My creations", "احفظ في أعمالي"],
  myCreations: ["My creations", "أعمالي"],
  makeCard: ["Make a card", "اصنع بطاقة"],
  gallerySaved: ["Saved to My creations!", "حُفظت في أعمالي!"],
  galleryFull: ["There's no more room. Delete an old creation first.", "لا توجد مساحة. احذف عملًا قديمًا أولًا."],
  galleryEmpty: ["Nothing saved yet. Build something and tap Save to My creations!", "لا يوجد شيء محفوظ بعد. ابنِ شيئًا واضغط احفظ في أعمالي!"],
  open: ["Open", "افتح"], del: ["Delete", "احذف"], delSure: ["Sure?", "متأكد؟"],
  newBoard: ["New empty board", "لوحة جديدة فارغة"],
  opened: ["Here it is! Keep building.", "ها هي! واصل البناء."],
  newBoardSay: ["A fresh board. Let's build!", "لوحة جديدة. هيا نبني!"],
  cardTitle: ["Make a card", "اصنع بطاقة"],
  cardTo: ["To", "إلى"], cardHeading: ["Big words", "العنوان"], cardMsg: ["Message", "الرسالة"], cardFrom: ["From", "من"],
  cardToPh: ["Their name", "اسمه"], cardFromPh: ["Your name", "اسمك"],
  cardSave: ["Save card", "احفظ البطاقة"],
  cardSaved: ["Your card is saved. Send it with love!", "حُفظت بطاقتك. أرسلها بحب!"],
  toLine: ["To {n}", "إلى {n}"], fromLine: ["From {n}", "من {n}"],
  tpl_birthday: ["Birthday", "عيد ميلاد"], tpl_eid: ["Eid", "العيد"], tpl_thanks: ["Thank you", "شكرًا"],
  tpl_love: ["Love", "حب"], tpl_congrats: ["Well done", "أحسنت"],
  card_birthday_t: ["Happy Birthday!", "عيد ميلاد سعيد!"], card_birthday_m: ["Have the best day ever!", "أتمنى لك يومًا رائعًا!"],
  card_eid_t: ["Eid Mubarak!", "عيد مبارك!"], card_eid_m: ["Wishing you a happy Eid full of joy.", "كل عام وأنت بخير."],
  card_thanks_t: ["Thank you!", "شكرًا لك!"], card_thanks_m: ["You are the best!", "أنت الأفضل!"],
  card_love_t: ["I love you!", "أحبك!"], card_love_m: ["You make me so happy.", "أنت تسعدني كثيرًا."],
  card_congrats_t: ["Well done!", "أحسنت!"], card_congrats_m: ["I'm so proud of you!", "أنا فخور بك!"],
});
const BADGES = [
  {id: "first",   icon: "🧱", en: ["First brick", "Put your first brick on the board"], ar: ["أول مكعب", "ضع أول مكعب على اللوحة"]},
  {id: "b50",     icon: "🏗️", en: ["Busy builder", "Have 80 bricks on your board"], ar: ["بنّاء نشيط", "ضع 80 مكعبًا على لوحتك"]},
  {id: "b150",    icon: "🏰", en: ["Master builder", "Have 200 bricks on your board"], ar: ["بنّاء خبير", "ضع 200 مكعب على لوحتك"]},
  {id: "name",    icon: "✍️", en: ["My name!", "Build your name"], ar: ["اسمي!", "ابنِ اسمك"]},
  {id: "arabic",  icon: "🌙", en: ["Arabic writer", "Build a word in Arabic"], ar: ["كاتب بالعربية", "ابنِ كلمة بالعربية"]},
  {id: "colors",  icon: "🎨", en: ["Color party", "Use 10 colors on one board"], ar: ["حفلة الألوان", "استخدم 10 ألوان في لوحة واحدة"]},
  {id: "mirror",  icon: "🪞", en: ["Mirror magic", "Build with the mirror on"], ar: ["سحر المرآة", "ابنِ والمرآة مفعّلة"]},
  {id: "tower",   icon: "🗼", en: ["Tall tower", "Stack bricks 3 high"], ar: ["برج عالٍ", "كدّس 3 مكعبات فوق بعضها"]},
  {id: "stamp",   icon: "🔖", en: ["Stamp maker", "Make your own stamp"], ar: ["صانع الأختام", "اصنع ختمك الخاص"]},
  {id: "puzzle1", icon: "🖼️", en: ["Copycat", "Finish a picture puzzle"], ar: ["الناسخ الماهر", "أكمل لغز صورة"]},
  {id: "puzzle5", icon: "⭐", en: ["Star copier", "Get 3 stars on 5 puzzles"], ar: ["نجم النسخ", "احصل على 3 نجوم في 5 ألغاز"]},
  {id: "trace5",  icon: "✏️", en: ["Letter tracer", "Trace 5 letters"], ar: ["متتبّع الحروف", "تتبّع 5 حروف"]},
  {id: "spell3",  icon: "🔤", en: ["Speller", "Spell 3 words"], ar: ["المتهجّي", "تهجَّ 3 كلمات"]},
  {id: "math5",   icon: "➕", en: ["Brick counter", "Solve 5 brick sums"], ar: ["عدّاد المكعبات", "حُلّ 5 مسائل"]},
  {id: "saver",   icon: "📸", en: ["Photographer", "Save a picture or a card"], ar: ["المصوّر", "احفظ صورة أو بطاقة"]},
  {id: "theme",   icon: "🚀", en: ["Explorer", "Try a new theme"], ar: ["المستكشف", "جرّب مظهرًا جديدًا"]},
  {id: "gallery3",icon: "🗂️", en: ["Collector", "Save 3 creations"], ar: ["الجامع", "احفظ 3 أعمال"]},
  {id: "card",    icon: "💌", en: ["Card maker", "Make a greeting card"], ar: ["صانع البطاقات", "اصنع بطاقة تهنئة"]},
  {id: "replay",  icon: "🎬", en: ["Movie star", "Watch a build replay"], ar: ["نجم السينما", "شاهد إعادة عرض البناء"]},
];

/* ---------- toasts + badges ---------- */
const toastQ = []; let toastOn = false;
function toast(icon, title, sub){ toastQ.push([icon, title, sub]); if (!toastOn) nextToast(); }
function nextToast(){
  const n = toastQ.shift(); if (!n){ toastOn = false; return; }
  toastOn = true;
  const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status");
  el.innerHTML = `<span class="medal" aria-hidden="true">${n[0]}</span><div>${esc(n[1])}<small>${esc(n[2])}</small></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); nextToast(); }, 3000);
}
let earned = new Set(store("snappy-badges") || []);
function updateBadgeCount(){ $("#badgeCount").textContent = `${earned.size}/${BADGES.length}`; }
function award(id){
  if (earned.has(id)) return;
  const bd = BADGES.find(b => b.id === id); if (!bd) return;
  earned.add(id); store("snappy-badges", [...earned]); updateBadgeCount();
  toast(bd.icon, t("badgeNew"), bd[LANG][0]); setTimeout(() => sfx.badge(), 200);
  setTimeout(() => speak(`${t("badgeNew")} ${bd[LANG][0]}`, LANG), 2400);
}
on("placed", () => { award("first"); if (settings.mirror !== "off") award("mirror"); });
const buildBadges = later(() => {
  const n = FREE.bricks.length;
  if (n >= 80) award("b50");
  if (n >= 200) award("b150");
  if (new Set(FREE.bricks.map(b => b.c)).size >= 10) award("colors");
  if (FREE.bricks.some(b => (b.z || 0) >= 2)) award("tower");
}, 400);
on("change", () => { if (B === FREE) buildBadges(); });
on("nameBuilt", r => { award("name"); if (r && r.rtl) award("arabic"); });
on("stampMade", () => award("stamp"));
on("gameWin", ({kind}) => {
  if (kind === "copy"){ award("puzzle1"); if (Object.values(progress.puzzles).filter(v => v === 3).length >= 5) award("puzzle5"); }
  if (kind === "trace" && progress.traced.en.length + progress.traced.ar.length >= 5) award("trace5");
  if (kind === "spell" && progress.spelled.en.length + progress.spelled.ar.length >= 3) award("spell3");
  if (kind === "math" && (progress.mathSolved || 0) >= 5) award("math5");
});
on("saved", () => award("saver"));
on("themeChanged", () => award("theme"));
on("gallerySaved", n => { if (n >= 3) award("gallery3"); });
on("cardMade", () => award("card"));
on("replay", () => award("replay"));
on("lang", updateBadgeCount);
function openBadges(){
  let html = `<h2>${esc(t("badgesTitle"))}</h2><p>${esc(t("badgesSub", {a: earned.size, b: BADGES.length}))}</p><div class="badge-grid">`;
  for (const bd of BADGES){
    const got = earned.has(bd.id);
    html += `<div class="badge${got ? " got" : ""}"><span class="bi" aria-hidden="true">${bd.icon}</span><strong>${esc(bd[LANG][0])}</strong><small>${esc(got ? bd[LANG][1] : t("locked") + " · " + bd[LANG][1])}</small></div>`;
  }
  html += `</div><div class="modal-actions"><button class="btn white" data-close>${esc(t("close"))}</button></div>`;
  openModal(html, t("badgesTitle"));
  sfx.click();
}
$("#badgesBtn").addEventListener("click", openBadges);

/* ---------- themes ---------- */
function applyTheme(id, fromUser){
  if (!THEMES[id]) id = "classic";
  settings.theme = id; saveSettings();
  document.body.dataset.kit = id;
  buildStamps();
  if (!fromUser) return;
  if (B === FREE && FREE.plate !== THEMES[id].plate){ pushHistory(); FREE.plate = THEMES[id].plate; applyBoard(); emit("change"); }
  sfx.cheer(); say(t("themeSay_" + id), {speak: true});
  emit("themeChanged");
}
function openThemes(){
  let html = `<h2>${esc(t("pickTheme"))}</h2><div class="theme-grid">`;
  for (const id in THEMES){
    const th = THEMES[id];
    html += `<button class="theme-card" data-theme-id="${id}" data-theme-preview="${id}" aria-pressed="${settings.theme === id}">
      <span class="theme-sw"></span><strong>${esc(th[LANG])}</strong><span class="theme-stamps"></span></button>`;
  }
  html += `</div><div class="modal-actions"><button class="btn white" data-close>${esc(t("close"))}</button></div>`;
  const card = openModal(html, t("pickTheme"));
  card.querySelectorAll(".theme-card").forEach(b => {
    const id = b.dataset.themeId;
    const sw = b.querySelector(".theme-sw"); sw.style.setProperty("--pl", THEMES[id].plate);
    const st = b.querySelector(".theme-stamps");
    (THEMES[id].stamps.length ? THEMES[id].stamps : ["heart", "star"]).slice(0, 3).forEach(n => st.appendChild(pieceEl(artPiece(n), 5)));
    b.addEventListener("click", () => { closeModal(); applyTheme(id, true); });
  });
  sfx.click();
}
$("#themeBtn").addEventListener("click", openThemes);

/* ---------- replay ---------- */
let replaying = false;
function replay(){
  if (replaying) return;
  if (!B.bricks.length){ say(t("buildFirst")); return; }
  replaying = true; cancelSelection();
  const list = [...B.bricks];
  // at most about 240 steps: a photo with thousands of bricks lands a handful at a time
  const per = Math.ceil(list.length / 240), steps = Math.ceil(list.length / per);
  const step = clamp(Math.round(4200 / steps), 18, 260);
  list.forEach(b => { const el = els.get(b.id); if (el) el.classList.add("hidden-replay"); });
  plate.style.pointerEvents = "none"; auraLayer.style.visibility = "hidden";   // lamps light up again when the replay ends
  say(t("replaySay"));
  for (let i = 0; i < steps; i++) setTimeout(() => {
    for (const b of list.slice(i * per, (i + 1) * per)){
      const el = els.get(b.id); if (!el) continue;
      el.classList.remove("hidden-replay");
      if (!reduceMotion && per <= 4){ if (el.classList.contains("drop")){ el.classList.remove("drop"); void el.offsetWidth; } el.classList.add("drop"); el.addEventListener("animationend", () => el.classList.remove("drop"), {once: true}); }
    }
    if (i % Math.max(1, Math.round(60 / step)) === 0) sfx.soft();
  }, i * step);
  setTimeout(() => {
    replaying = false; plate.style.pointerEvents = ""; auraLayer.style.visibility = "";
    $$(".brick.hidden-replay").forEach(e => e.classList.remove("hidden-replay"));
    sfx.cheer(); say(t("replayDone")); emit("replay");
  }, steps * step + 500);
}
$("#replayBtn").addEventListener("click", replay);

/* ---------- my creations (gallery) ---------- */
let gallery = store("snappy-gallery") || [];
function compactBoard(bd){ return {cols: bd.cols, rows: bd.rows, plate: bd.plate, b: bd.bricks.map(b => [b.x, b.y, b.w, b.h, b.c, b.t || "std", b.z || 0])}; }
function expandBricks(cb){ return fitBricks(cb.b.map(a => ({id: nextId++, x: a[0], y: a[1], w: a[2], h: a[3], c: a[4], t: a[5] || "std", z: a[6] || 0}))); }
function saveToGallery(){
  if (!B.bricks.length){ say(t("buildFirst")); return; }
  const item = {id: "g" + Date.now().toString(36), at: Date.now(), thumb: thumbData(B), board: compactBoard(B)};
  gallery.unshift(item); gallery = gallery.slice(0, 30);
  if (!store("snappy-gallery", gallery)){ gallery.shift(); sfx.nope(); say(t("galleryFull")); return; }
  sfx.cheer(); say(t("gallerySaved")); emit("gallerySaved", gallery.length);
}
function loadIntoFree(cb){
  if (currentMode !== "free") setMode("free", true);
  pushHistory();
  FREE.cols = cb.cols; FREE.rows = cb.rows; FREE.plate = cb.plate; FREE.bricks = expandBricks(cb);
  clearEls(); applyBoard(); commit();
}
function openGallery(){
  const fmt = ts => { try { return new Date(ts).toLocaleDateString(LANG === "ar" ? "ar" : "en", {day: "numeric", month: "short"}); } catch(e){ return ""; } };
  let html = `<h2>${esc(t("myCreations"))}</h2><div class="modal-actions" style="justify-content:flex-start"><button class="btn mint" id="gNew">${esc(t("newBoard"))}</button></div>`;
  if (!gallery.length) html += `<p>${esc(t("galleryEmpty"))}</p>`;
  html += `<div class="gal-grid">` + gallery.map(g => `<div class="gal-item" data-id="${g.id}">
      <img alt="" src="${g.thumb}"><span class="gal-date">${esc(fmt(g.at))}</span>
      <div class="gal-actions"><button class="btn small mint" data-open>${esc(t("open"))}</button><button class="btn small warn" data-del>${esc(t("del"))}</button></div></div>`).join("") + `</div>`;
  html += `<div class="modal-actions"><button class="btn white" data-close>${esc(t("close"))}</button></div>`;
  const card = openModal(html, t("myCreations"), "wide");
  card.querySelector("#gNew").addEventListener("click", () => {
    closeModal(); if (currentMode !== "free") setMode("free", true); else if (typeof showScreen === "function") showScreen("studio");
    pushHistory(); FREE.bricks = []; leavePhotoBoard(); commit(); sfx.whoosh(); say(t("newBoardSay"));
  });
  card.querySelectorAll(".gal-item").forEach(it => {
    const g = gallery.find(x => x.id === it.dataset.id);
    it.querySelector("[data-open]").addEventListener("click", () => { closeModal(); loadIntoFree(g.board); sfx.cheer(); say(t("opened")); });
    const del = it.querySelector("[data-del]");
    del.addEventListener("click", () => {
      if (!del.dataset.armed){ del.dataset.armed = "1"; del.textContent = t("delSure"); setTimeout(() => { delete del.dataset.armed; del.textContent = t("del"); }, 2500); return; }
      gallery = gallery.filter(x => x.id !== g.id); store("snappy-gallery", gallery); it.remove(); sfx.remove();
    });
  });
  sfx.click();
}
$("#gallerySaveBtn").addEventListener("click", saveToGallery);
$("#galleryBtn").addEventListener("click", openGallery);

/* ---------- greeting cards ---------- */
const CARDS = {
  birthday: {icon: "🎂", bg: "#FFD6E7", ink: "#2B1E5C", border: RAINBOW},
  eid:      {icon: "🌙", bg: "#0F4C3A", ink: "#FFE08A", border: ["#FFE838", "#3DC45A", "#FBFAF5", "#FF9A1F"]},
  thanks:   {icon: "💐", bg: "#D9F7EC", ink: "#2B1E5C", border: ["#7FE3C0", "#FFB3CF", "#A9A6F0", "#FFE838"]},
  love:     {icon: "❤️", bg: "#FFE3E3", ink: "#7A1133", border: ["#F2383A", "#FFB3CF", "#FF2E8A", "#FBFAF5"]},
  congrats: {icon: "🏆", bg: "#FFF3B0", ink: "#2B1E5C", border: ["#FF9A1F", "#FFE838", "#2F8CF0", "#3DC45A"]},
};
let cardTpl = "birthday";
function fitFont(ctx, text, max, size, weight = 800){
  let s = size;
  do { ctx.font = `${weight} ${s}px "Baloo 2", "Baloo Bhaijaan 2", sans-serif`; s -= 2; } while (ctx.measureText(text).width > max && s > 14);
}
function textLine(ctx, text, x, y, max, size, color){
  if (!text) return;
  ctx.save(); ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.direction = hasArabic(text) ? "rtl" : "ltr";
  fitFont(ctx, text, max, size); ctx.fillText(text, x, y); ctx.restore();
}
// pic: the board picture, drawn once per card maker (big boards take a moment to draw)
function drawCard(f, pic){
  const tp = CARDS[f.tpl], W = 1200, H = 900, c = 30;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = tp.bg; ctx.fillRect(0, 0, W, H);
  // brick border
  let k = 0;
  const brick = (x, y, w, h) => {
    const col = tp.border[k++ % tp.border.length];
    ctx.fillStyle = shade(col, -.24); rrect(ctx, x + 1, y + 1, w - 2, h - 2, 5); ctx.fill();
    ctx.fillStyle = col; rrect(ctx, x + 1, y + 1, w - 2, h - 5, 5); ctx.fill();
    for (let yy = 0; yy < h / c; yy++) for (let xx = 0; xx < w / c; xx++) stud(ctx, x + xx * c, y + yy * c, c, col);
  };
  for (let x = 0; x < W; x += 2 * c){ brick(x, 0, 2 * c, c); brick(x, H - c, 2 * c, c); }
  for (let y = c; y < H - c; y += 2 * c){ brick(0, y, c, Math.min(2 * c, H - c - y)); brick(W - c, y, c, Math.min(2 * c, H - c - y)); }
  const cx = W / 2;
  textLine(ctx, f.to ? t("toLine", {n: f.to}) : "", cx, 88, 1000, 38, tp.ink);
  textLine(ctx, f.title, cx, 160, 1040, 84, tp.ink);
  // the board picture
  const bh = 470;
  pic = pic || cardPic();
  ctx.drawImage(pic, cx - pic.width / 2, 215 + (bh - pic.height) / 2);
  textLine(ctx, f.msg, cx, 735, 1040, 46, tp.ink);
  textLine(ctx, f.from ? t("fromLine", {n: f.from}) : "", cx, 805, 1000, 36, tp.ink);
  return cv;
}
function cardPic(){
  const cs = Math.max(4, Math.floor(Math.min((980 - 24) / B.cols, (470 - 24) / B.rows)));
  return boardCanvas(B, cs, {pad: 12, foot: 0, transparent: true});
}
function openCardMaker(){
  if (!B.bricks.length){ say(t("buildFirst")); return; }
  const tplBtns = Object.keys(CARDS).map(id => `<button class="btn small" type="button" data-tpl="${id}" aria-pressed="${id === cardTpl}"><span aria-hidden="true">${CARDS[id].icon}</span> ${esc(t("tpl_" + id))}</button>`).join("");
  const html = `<h2>${esc(t("cardTitle"))}</h2>
    <div class="seg" id="tplRow">${tplBtns}</div>
    <div class="card-form">
      <label>${esc(t("cardTo"))}<input id="cTo" dir="auto" maxlength="24" placeholder="${esc(t("cardToPh"))}"></label>
      <label>${esc(t("cardHeading"))}<input id="cTitle" dir="auto" maxlength="32"></label>
      <label>${esc(t("cardMsg"))}<input id="cMsg" dir="auto" maxlength="60"></label>
      <label>${esc(t("cardFrom"))}<input id="cFrom" dir="auto" maxlength="24" placeholder="${esc(t("cardFromPh"))}"></label>
    </div>
    <div class="card-preview" id="cPrev"></div>
    <div class="modal-actions"><button class="btn white" data-close>${esc(t("close"))}</button><button class="btn pink" id="cSave">${esc(t("cardSave"))}</button></div>`;
  const card = openModal(html, t("cardTitle"), "wide");
  const setTpl = id => {
    cardTpl = id;
    card.querySelectorAll("[data-tpl]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tpl === id));
    card.querySelector("#cTitle").value = t(`card_${id}_t`);
    card.querySelector("#cMsg").value = t(`card_${id}_m`);
    draw();
  };
  const fields = () => ({tpl: cardTpl, to: card.querySelector("#cTo").value.trim(), title: card.querySelector("#cTitle").value.trim(),
    msg: card.querySelector("#cMsg").value.trim(), from: card.querySelector("#cFrom").value.trim()});
  let cv = null, tm, pic = null;
  const draw = async () => {
    const f = fields();
    if (hasArabic(f.to + f.title + f.msg + f.from)) await ensureFont(f.to + f.title + f.msg + f.from);
    cv = drawCard(f, pic = pic || cardPic()); const prev = card.querySelector("#cPrev"); if (!prev) return;
    prev.innerHTML = ""; cv.className = "card-canvas"; prev.appendChild(cv);
  };
  card.querySelectorAll("[data-tpl]").forEach(b => b.addEventListener("click", () => { sfx.click(); setTpl(b.dataset.tpl); }));
  card.querySelectorAll("input").forEach(i => i.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(draw, 150); }));
  card.querySelector("#cSave").addEventListener("click", async () => {
    await draw();
    const blob = await new Promise(r => cv.toBlob(r, "image/png"));
    const res = await saveFile(blob, "my-brick-card.png", () => cv.toDataURL("image/png"));
    if (res !== "declined"){ emit("cardMade"); emit("saved"); if (res === "saved"){ closeModal(); sfx.cheer(); say(t("cardSaved")); } }
  });
  setTpl(cardTpl);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  sfx.click();
}
$("#cardBtn").addEventListener("click", openCardMaker);

on("boot", () => { updateBadgeCount(); applyTheme(settings.theme, false); });
