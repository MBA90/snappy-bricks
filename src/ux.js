/* ===================== screens, grown-ups corner, hold-to-hear, name keyboard, welcome tour ===================== */
addStrings({
  lockAria: ["Grown-ups settings: press and hold for 3 seconds", "إعدادات الكبار: اضغط مطولًا 3 ثوانٍ"],
  grownUps: ["Grown-ups", "للكبار"],
  doorBuild: ["Build", "ابنِ"], doorBuildSub: ["Snap bricks and make anything", "ركّب المكعبات واصنع ما تحب"],
  doorGames: ["Play games", "العب"],
  doorCard: ["Make a card", "اصنع بطاقة"], doorCardSub: ["Send your picture to someone you love", "أرسل صورتك لمن تحب"],
  goHome: ["Go home", "الصفحة الرئيسية"], pickGame: ["Pick a game", "اختر لعبة"], games: ["Games", "الألعاب"],
  modeCopySub: ["Build the same picture", "ابنِ الصورة نفسها"], modeTraceSub: ["Fill a big letter with bricks", "املأ حرفًا كبيرًا بالمكعبات"],
  modeSpellSub: ["Tap the letters of the word", "اضغط على حروف الكلمة"], modeMathSub: ["Count the bumps", "عُدّ النتوءات"],
  save: ["Save", "حفظ"],
  kbBack: ["Delete a letter", "احذف حرفًا"], kbSpace: ["space", "مسافة"], kbType: ["Use the keyboard", "استخدم لوحة المفاتيح"],
  guTitle: ["For grown-ups", "للكبار"],
  guIntro: ["Settings for parents and teachers. Children can't open this without holding the lock for 3 seconds.", "إعدادات للآباء والمعلمين. لا يستطيع الأطفال فتحها إلا بالضغط على القفل 3 ثوانٍ."],
  guLanguage: ["Language", "اللغة"], guAge: ["Builder age", "عمر البنّاء"],
  ageLittle: ["Little (5–6)", "صغير (5–6)"], ageBig: ["Big (7–12)", "كبير (7–12)"],
  guTalk: ["Reading aloud", "القراءة بصوت عالٍ"], guSound: ["Sounds", "الأصوات"], boardSize: ["Board size", "حجم اللوحة"],
  guHand: ["Toy box side", "جهة صندوق الألعاب"], handRight: ["Right-handed", "باليد اليمنى"], handLeft: ["Left-handed", "باليد اليسرى"],
  guTour: ["Welcome tour", "جولة الترحيب"], guTourBtn: ["Show it again", "اعرضها مرة أخرى"],
  guReset: ["Start fresh", "البدء من جديد"], guResetBtn: ["Delete saved work on this device", "احذف الأعمال المحفوظة على هذا الجهاز"],
  guResetSure: ["Tap again to delete everything", "اضغط مرة أخرى لحذف كل شيء"],
  guPrivacy: ["Snappy Bricks collects nothing. Everything is saved only in this browser.", "مكعبات سنابي لا تجمع أي بيانات. كل شيء يُحفظ في هذا المتصفح فقط."],
  lockHint: ["Grown-ups: press and hold the lock for 3 seconds.", "للكبار: اضغطوا على القفل مطولًا 3 ثوانٍ."],
  homeHi: ["Hi {n}! What do you want to do today?", "مرحبًا يا {n}! ماذا تريد أن تفعل اليوم؟"],
  homeHiNoName: ["Hi! What do you want to do today?", "مرحبًا! ماذا تريد أن تفعل اليوم؟"],
  cardNeedBuild: ["Build a picture first. Then tap Save to make a card!", "ابنِ صورة أولًا، ثم اضغط حفظ لتصنع بطاقة!"],
  buildHi: ["Let's build! Drag a brick from the toy box.", "هيا نبني! اسحب مكعبًا من صندوق الألعاب."],
  idleHint: ["Pick a brick from the toy box and drag it onto the board!", "اختر مكعبًا من صندوق الألعاب واسحبه إلى اللوحة!"],
  tourAge: ["How old are you?", "كم عمرك؟"],
  tourName: ["Tap the letters of your name, then tap Build!", "اضغط على حروف اسمك، ثم اضغط ابنِ اسمي!"],
  tourDrag: ["Now drag a brick onto your board!", "الآن اسحب مكعبًا إلى لوحتك!"],
  tourHome: ["Great job! Tap the house to go home and find games.", "أحسنت! اضغط على البيت لتعود وتجد الألعاب."],
  tourDone: ["Let's play!", "هيا نلعب!"], skip: ["Skip", "تخطَّ"],
  years: ["{a}–{b} years", "{a}–{b} سنوات"],
});
const LITTLE_SHAPES = [1, 2, 3];   // 2×2, 2×3, 2×4: like a real starter set
const AR_TILES = "ا أ إ آ ب ت ة ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ى ء ئ ؤ".split(" ");
const EN_TILES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const TILE_COLORS = ["#FFD6E8", "#D6E9FF", "#FFF1B8", "#D8F5DF", "#E8DDFB", "#FFE2CC"];
if (!settings.age) settings.age = "big";
if (!settings.hand) settings.hand = "right";
let screen = "home";

/* ---------- screens ---------- */
function showScreen(name){
  screen = name;
  $("#homeScreen").hidden = name !== "home";
  $("#gamesScreen").hidden = name !== "games";
  $("#studioScreen").hidden = name !== "studio";
  $("#mapScreen").hidden = name !== "map";
  document.body.dataset.screen = name;
  closeSheets();
  if (name === "home"){ document.body.dataset.area = "home"; refreshHome(); }
  if (name === "games"){ document.body.dataset.area = "games"; refreshGamesPick(); }
  if (name === "map") document.body.dataset.area = "map";
  if (name === "studio"){ refreshArea(); requestAnimationFrame(() => { fitCell(); requestAnimationFrame(fitCell); }); }
  pageScrollTo(0);
}
function refreshArea(){
  const m = currentMode;
  document.body.dataset.area = m === "free" ? "build" : m;
  $("#areaChip").textContent = t(m === "free" ? "doorBuild" : {copy: "modeCopy", trace: "modeTrace", spell: "modeSpell", math: "modeMath"}[m]);
  $("#gamesBtn").hidden = m === "free";
}
function refreshHome(){
  const n = settings.kidName;
  $("#homeBubble").textContent = n ? t("homeHi", {n}) : t("homeHiNoName");
  $("#homeBadgeCount").textContent = `${earned.size}/${BADGES.length}`;
}
function refreshGamesPick(){
  const a = gAlpha || LANG;
  $("#progCopy").textContent = `⭐ ${Object.keys(progress.puzzles).length}/${PUZZLES.length}`;
  $("#progTrace").textContent = `✓ ${progress.traced[a].length}/${TRACE[a].length}`;
  $("#progSpell").textContent = `✓ ${progress.spelled[a].length}/${spellList(a).length}`;
  $("#progMath").textContent = t("mathLevel", {n: progress.mathLevel || 1});
}
// every game or build switch lands in the studio
const _setMode = setMode;
setMode = function(m, quiet){
  if (screen !== "studio") showScreen("studio");
  _setMode(m, quiet);
  refreshArea();
  requestAnimationFrame(fitCell);
};
const _loadIntoFree = loadIntoFree;
loadIntoFree = function(cb){ _loadIntoFree(cb); if (screen !== "studio") showScreen("studio"); refreshArea(); };

$$("[data-go]").forEach(b => b.addEventListener("click", () => { sfx.click(); showScreen(b.dataset.go); if (b.dataset.go === "home") speakHome(); }));
function speakHome(){ speak($("#homeBubble").textContent, LANG, {fallback: t("homeHiNoName")}); }
$("#doorBuild").addEventListener("click", () => {
  sfx.click();
  showScreen("studio");
  if (currentMode !== "free") setMode("free", true); else refreshArea();
  say(t("buildHi"), {speak: true});
});
$("#doorGames").addEventListener("click", () => { sfx.click(); openMap(false); });
$("#doorCard").addEventListener("click", () => {
  sfx.click();
  if (currentMode !== "free") setMode("free", true);
  if (!FREE.bricks.length){ showScreen("studio"); say(t("cardNeedBuild"), {speak: true}); return; }
  openCardMaker();
});
$("#homeCreations").addEventListener("click", () => openGallery());
$("#homeBadges").addEventListener("click", () => openBadges());

/* ---------- sheets ---------- */
function openSheet(id){
  closeSheets(); closeModal();
  const s = $("#" + id); s.hidden = false;
  const f = s.querySelector("[data-autofocus]") || s.querySelector(".sheet-x");
  if (f) f.focus();
}
function closeSheets(){ $$(".sheet").forEach(s => { s.hidden = true; }); }
$$("[data-close-sheet]").forEach(b => b.addEventListener("click", () => { sfx.click(); closeSheets(); }));
// close on a tap on the dark backdrop, but only when the press started there too
// (lifting the finger that held the grown-ups lock must not close the sheet it just opened)
$$(".sheet").forEach(s => {
  let downOnBackdrop = false;
  s.addEventListener("pointerdown", e => { downOnBackdrop = e.target === s; });
  s.addEventListener("click", e => { if (e.target === s && downOnBackdrop) closeSheets(); downOnBackdrop = false; });
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheets(); });
$("#saveMenuBtn").addEventListener("click", () => { sfx.click(); openSheet("saveSheet"); });
// any choice in the save sheet closes it before doing its job
$("#shareGrid").addEventListener("click", e => { if (e.target.closest("button")) closeSheets(); }, true);

/* ---------- name keyboard ---------- */
let kbLang = null;
function buildTiles(){
  const box = $("#nameTiles"); box.innerHTML = "";
  const list = kbLang === "ar" ? AR_TILES : EN_TILES;
  box.setAttribute("dir", kbLang === "ar" ? "rtl" : "ltr");
  list.forEach((ch, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "tile"; b.textContent = ch;
    b.style.setProperty("--tc", TILE_COLORS[i % TILE_COLORS.length]);
    b.addEventListener("click", () => {
      const inp = $("#nameInput"); if ([...inp.value].length >= 18) return;
      inp.value += ch; sfx.soft(); speak(ch, kbLang);
    });
    box.appendChild(b);
  });
  $("#kbSwitch").textContent = kbLang === "ar" ? "ABC" : "أ ب ت";
}
function openNameSheet(){
  kbLang = kbLang || LANG;
  warmVoice(LANG === "ar" ? "en" : "ar");          // names may be in either language
  buildTiles();
  const inp = $("#nameInput");
  if (coarse) inp.setAttribute("inputmode", "none"); else inp.removeAttribute("inputmode");
  openSheet("nameSheet");
  speak(t("writeName"), LANG);
}
$("#nameOpenBtn").addEventListener("click", () => { sfx.click(); openNameSheet(); });
$("#kbSwitch").addEventListener("click", () => { kbLang = kbLang === "ar" ? "en" : "ar"; warmVoice(kbLang); sfx.click(); buildTiles(); });
$("#kbSpace").addEventListener("click", () => { const inp = $("#nameInput"); if ([...inp.value].length < 18){ inp.value += " "; sfx.soft(); } });
$("#kbBack").addEventListener("click", () => { const inp = $("#nameInput"); inp.value = [...inp.value].slice(0, -1).join(""); sfx.click(); });
$("#kbType").addEventListener("click", () => { const inp = $("#nameInput"); inp.setAttribute("inputmode", "text"); inp.focus(); });
// building a name closes the keyboard and shows the board
$("#nameForm").addEventListener("submit", () => {
  const v = $("#nameInput").value.trim();
  if (!v) return;
  closeSheets();
  if (screen !== "studio") showScreen("studio");
}, true);
on("nameBuilt", r => { if (r && r.text && !settings.kidName){ settings.kidName = r.text; saveSettings(); } refreshArea(); });

/* ---------- Little / Big builders ---------- */
function applyAge(age, fromUser){
  settings.age = age === "little" ? "little" : "big"; saveSettings();
  document.body.dataset.age = settings.age;
  $$("#ageSeg [data-age]").forEach(b => b.setAttribute("aria-pressed", b.dataset.age === settings.age));
  if (settings.age === "little"){
    if (brickStyle !== "std"){ brickStyle = "std"; buildStyles(); }
    if (settings.stack) setStack(false, true);
    if (tool === "fill") setTool("move", true);
    if (selected && selected.kind === "brick" && !LITTLE_SHAPES.includes(selected.i)) selected = null;
    if (fromUser && !settings.talk) $("#talkBtn").click();
  }
  buildShapes(); buildStamps();
}
$$("#ageSeg [data-age]").forEach(b => b.addEventListener("click", () => { sfx.click(); applyAge(b.dataset.age, true); }));

/* ---------- left / right handed ---------- */
function applyHand(h){
  settings.hand = h === "left" ? "left" : "right"; saveSettings();
  document.body.dataset.hand = settings.hand;
  $$("#handSeg [data-hand]").forEach(b => b.setAttribute("aria-pressed", b.dataset.hand === settings.hand));
  requestAnimationFrame(fitCell);
}
$$("#handSeg [data-hand]").forEach(b => b.addEventListener("click", () => { sfx.click(); applyHand(b.dataset.hand); }));

/* ---------- grown-ups corner: hold the lock for 3 seconds ---------- */
(function lockSetup(){
  const lock = $("#lockBtn"); let raf = 0, start = 0, opened = false;
  const reset = () => { cancelAnimationFrame(raf); raf = 0; lock.style.setProperty("--p", "0%"); };
  const begin = () => {
    if (raf) return; opened = false; start = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - start) / 3000);
      lock.style.setProperty("--p", p * 100 + "%");
      if (p >= 1){ reset(); opened = true; sfx.badge(); openSheet("grownups"); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  lock.addEventListener("pointerdown", e => { e.preventDefault(); begin(); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => lock.addEventListener(ev, () => {
    const was = raf && !opened; reset();
    if (was && ev === "pointerup"){ $("#homeBubble").textContent = t("lockHint"); }
  }));
  lock.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); begin(); } });
  lock.addEventListener("keyup", e => { if (e.key === "Enter" || e.key === " ") reset(); });
  lock.addEventListener("contextmenu", e => e.preventDefault());
})();
$("#tourBtn").addEventListener("click", () => { closeSheets(); showScreen("home"); setTimeout(startTour, 200); });
(function resetSetup(){
  const b = $("#resetBtn"); let armed = null;
  b.addEventListener("click", () => {
    if (!armed){ b.textContent = t("guResetSure"); armed = setTimeout(() => { armed = null; b.textContent = t("guResetBtn"); }, 3000); return; }
    clearTimeout(armed); saveFree.cancel();
    try { Object.keys(localStorage).filter(k => k.startsWith("snappy-")).forEach(k => localStorage.removeItem(k)); } catch(e){}
    location.reload();
  });
})();

/* ---------- press and hold any button to hear what it does ---------- */
(function holdToHear(){
  let timer = 0, el = null, xy = null, held = null;
  const labelOf = n => (n.dataset.say || n.getAttribute("aria-label") || n.title || n.textContent || "").replace(/\s+/g, " ").trim();
  document.addEventListener("pointerdown", e => {
    const n = e.target.closest && e.target.closest("button, .card, .swatch, [data-say]");
    if (!n || n.id === "lockBtn" || n.closest("#plate")) return;
    el = n; xy = [e.clientX, e.clientY]; clearTimeout(timer);
    timer = setTimeout(() => {
      if (ptr && ptr.kind === "drag" && ptr.moved) return;    // the hold picked up a brick: no talking over it
      const txt = labelOf(n); if (!txt) return;
      n.classList.remove("saying"); void n.offsetWidth; n.classList.add("saying");
      speak(txt.replace(/×/g, LANG === "ar" ? " في " : " by "), LANG);
      held = n;
    }, 650);
  }, true);
  document.addEventListener("pointermove", e => {
    if (el && xy && Math.hypot(e.clientX - xy[0], e.clientY - xy[1]) > 10){ clearTimeout(timer); el = null; }
  }, true);
  ["pointerup", "pointercancel"].forEach(ev => document.addEventListener(ev, () => { clearTimeout(timer); el = null; }, true));
  // after a long press, don't also run the button
  document.addEventListener("click", e => {
    if (held && held.contains(e.target)){ e.preventDefault(); e.stopPropagation(); }
    held = null;
  }, true);
  document.addEventListener("contextmenu", e => { if (e.target.closest && e.target.closest("button, .card, .swatch")) e.preventDefault(); });
})();

/* ---------- gentle nudge when nothing happens for a while ---------- */
(function idleNudge(){
  let last = Date.now(), nudges = 0;
  document.addEventListener("pointerdown", () => { last = Date.now(); }, true);
  setInterval(() => {
    if (screen !== "studio" || currentMode !== "free" || document.hidden || $(".sheet:not([hidden])") || $(".modal")) return;
    if (Date.now() - last > 25000 && nudges < 3){
      nudges++; last = Date.now();
      const tr = $("#tray"); tr.classList.remove("nudge"); void tr.offsetWidth; tr.classList.add("nudge");
      setTimeout(() => tr.classList.remove("nudge"), 1200);
      say(t("idleHint"), {speak: nudges === 1});
    }
  }, 5000);
})();

/* ---------- welcome tour ---------- */
const BRICKY_SVG = $("#bricky").outerHTML.replace('id="bricky"', "");
let coachEl = null, handEl = null, handAnim = null, tourStep = null;
function tourSheet(html){
  let s = $("#tourSheet");
  if (!s){ s = document.createElement("div"); s.className = "sheet"; s.id = "tourSheet"; document.body.appendChild(s); }
  s.innerHTML = `<div class="sheet-card" role="dialog" aria-modal="true">${html}</div>`;
  s.hidden = false;
  return s;
}
function closeTourSheet(){ const s = $("#tourSheet"); if (s) s.hidden = true; }
function coach(text, buttons = []){
  clearCoach();
  coachEl = document.createElement("div"); coachEl.className = "coach"; coachEl.setAttribute("role", "status");
  coachEl.innerHTML = `${BRICKY_SVG}<p></p>`;
  coachEl.querySelector("p").textContent = text;
  buttons.forEach(([label, cls, fn]) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "btn small " + cls; b.textContent = label;
    b.addEventListener("click", fn); coachEl.appendChild(b);
  });
  document.body.appendChild(coachEl);
  speak(text, LANG);
}
function clearCoach(){
  if (coachEl){ coachEl.remove(); coachEl = null; }
  if (handAnim){ handAnim.cancel(); handAnim = null; }
  if (handEl){ handEl.remove(); handEl = null; }
  $$(".pointing").forEach(e => e.classList.remove("pointing"));
}
function showHand(fromEl, toEl){
  handEl = document.createElement("div"); handEl.className = "hand"; handEl.textContent = "👆"; handEl.setAttribute("aria-hidden", "true");
  document.body.appendChild(handEl);
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  const p1 = [a.left + a.width / 2 - 14, a.top + a.height / 2 - 6], p2 = [b.left + b.width / 2 - 14, b.top + b.height / 2 - 6];
  if (reduceMotion){ handEl.style.transform = `translate(${p1[0]}px, ${p1[1]}px)`; return; }
  handAnim = handEl.animate([
    {transform: `translate(${p1[0]}px, ${p1[1]}px) scale(1)`, opacity: 0},
    {transform: `translate(${p1[0]}px, ${p1[1]}px) scale(.85)`, opacity: 1, offset: .15},
    {transform: `translate(${p2[0]}px, ${p2[1]}px) scale(.85)`, opacity: 1, offset: .75},
    {transform: `translate(${p2[0]}px, ${p2[1]}px) scale(1)`, opacity: 0},
  ], {duration: 2200, iterations: Infinity, easing: "ease-in-out"});
}
function finishTour(){
  clearCoach(); closeTourSheet(); tourStep = null;
  settings.toured = true; saveSettings();
}
function startTour(){
  tourStep = "lang";
  const s = tourSheet(`
    <div class="tour-head">${BRICKY_SVG}<h2>Hello! · مرحبًا!<br><small>Pick your language · اختر لغتك</small></h2></div>
    <div class="big-choices">
      <button class="big-choice" data-l="en" style="background:#D6E9FF"><span class="em">🔤</span>English</button>
      <button class="big-choice" data-l="ar" style="background:#FFF1B8"><span class="em">🌙</span>العربية</button>
    </div>
    <div class="modal-actions"><button class="btn white small" data-skip>Skip · تخطَّ</button></div>`);
  s.querySelectorAll("[data-l]").forEach(b => b.addEventListener("click", () => { sfx.click(); setLang(b.dataset.l, true); tourAge(); }));
  s.querySelector("[data-skip]").addEventListener("click", finishTour);
}
function tourAge(){
  tourStep = "age";
  const s = tourSheet(`
    <div class="tour-head">${BRICKY_SVG}<h2>${esc(t("tourAge"))}</h2></div>
    <div class="big-choices">
      <button class="big-choice" data-age="little" style="background:#FFD6E8"><span class="em">🐣</span>${esc(t("years", {a: 5, b: 6}))}</button>
      <button class="big-choice" data-age="big" style="background:#D8F5DF"><span class="em">🐥</span>${esc(t("years", {a: 7, b: 9}))}</button>
      <button class="big-choice" data-age="big" style="background:#E8DDFB"><span class="em">🦅</span>${esc(t("years", {a: 10, b: 12}))}</button>
    </div>
    <div class="modal-actions"><button class="btn white small" data-skip>${esc(t("skip"))}</button></div>`);
  speak(t("tourAge"), LANG);
  s.querySelectorAll("[data-age]").forEach(b => b.addEventListener("click", () => { sfx.click(); applyAge(b.dataset.age, true); tourName(); }));
  s.querySelector("[data-skip]").addEventListener("click", finishTour);
}
function tourName(){
  tourStep = "name";
  closeTourSheet();
  showScreen("studio");
  if (currentMode !== "free") setMode("free", true);
  if (FREE.bricks.length){ pushHistory(); FREE.bricks = []; commit(); }
  $("#nameInput").value = "";
  openNameSheet();
  coach(t("tourName"), [[t("skip"), "white", () => { closeSheets(); tourDrag(); }]]);
}
on("nameBuilt", () => { if (tourStep === "name"){ clearCoach(); setTimeout(tourDrag, reduceMotion ? 300 : 2600); } });
function tourDrag(){
  tourStep = "drag";
  closeSheets();
  const card = $$("#shapes .card").find(c => c.offsetParent) ;
  coach(t("tourDrag"), [[t("skip"), "white", tourHome]]);
  if (card) requestAnimationFrame(() => showHand(card, $("#plate")));
}
on("placed", () => { if (tourStep === "drag") setTimeout(tourHome, 700); });
function tourHome(){
  if (tourStep === "home" || !tourStep) return;
  tourStep = "home";
  clearCoach();
  const home = $("#studioScreen .tb-home"); home.classList.add("pointing");
  coach(t("tourHome"), [[t("tourDone"), "mint", finishTour]]);
  home.classList.add("pointing");
}
$$("#studioScreen [data-go='home']").forEach(b => b.addEventListener("click", () => { if (tourStep === "home") finishTour(); }));

/* ---------- door pictures, made of bricks ---------- */
function doorPics(){
  const pic = (id, names, px) => {
    const box = $("#" + id); box.innerHTML = "";
    names.forEach(n => {
      const pix = artToPix(ART[n].art);
      box.appendChild(pieceEl({w: pix[0].length, h: pix.length, bricks: decompose(pix).map(b => ({...b, t: "std"}))}, px));
    });
  };
  const px = window.innerWidth < 700 || window.innerHeight <= 540 ? 6 : 11;
  pic("picBuild", ["house", "tree"], px);
  pic("picGames", ["star", "smile"], px);
  pic("picCard", ["heart", "flower"], px);
}

/* ---------- start ---------- */
on("boot", () => {
  document.body.dataset.age = settings.age;
  document.body.dataset.hand = settings.hand;
  applyAge(settings.age, false);
  applyHand(settings.hand);
  doorPics();
  showScreen("home");
  if (!settings.toured) setTimeout(startTour, 500);
});
on("lang", () => { if (screen === "home") refreshHome(); if (screen === "games") refreshGamesPick(); if (screen === "studio") refreshArea(); if ($("#nameSheet") && !$("#nameSheet").hidden) buildTiles(); });
on("resize", () => { doorPics(); });
