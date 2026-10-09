/* ===================== Bricky's adventure map =====================
   Five islands with six stops each. Every stop is one game round; finishing it opens the next.
   Each island gives a sticker, and a daily challenge gives a surprise sticker. */
addStrings({
  doorAdv: ["Adventure", "المغامرة"], doorAdvSub: ["Play games on Bricky's islands", "العب على جزر بريكي"],
  mapTitle: ["Bricky's islands", "جزر بريكي"],
  mapHi: ["Tap the stop where I'm standing!", "اضغط على المحطة التي أقف عليها!"],
  mapLocked: ["Finish the stop before this one first.", "أنهِ المحطة التي قبلها أولًا."],
  allGames: ["All games", "كل الألعاب"],
  stickers: ["Stickers", "الملصقات"], stickerBook: ["My sticker book", "دفتر ملصقاتي"],
  stickerSub: ["Finish islands and daily challenges to fill your book!", "أنهِ الجزر وتحديات اليوم لتملأ دفترك!"],
  stickerNew: ["New sticker!", "ملصق جديد!"],
  islandDone: ["You finished the island! Here is a sticker.", "أنهيت الجزيرة! إليك ملصقًا."],
  mapBack: ["Map", "الخريطة"],
  stopNext: ["Next stop", "المحطة التالية"],
  daily: ["Today's challenge", "تحدي اليوم"], dailyPlay: ["Play", "العب"],
  dailyDone: ["Done! Come back tomorrow for a new sticker.", "أحسنت! عُد غدًا لملصق جديد."],
  dailyWin: ["You did today's challenge! Here is a surprise sticker.", "أنجزت تحدي اليوم! إليك ملصقًا مفاجئًا."],
  island1: ["Sunny Beach", "الشاطئ المشمس"], island2: ["Candy Forest", "غابة الحلوى"], island3: ["Star Mountain", "جبل النجوم"],
  island4: ["Coral Reef", "الشعاب المرجانية"], island5: ["Rocket Castle", "قلعة الصواريخ"],
  allDone: ["You finished every island! You are an adventure hero!", "أنهيت كل الجزر! أنت بطل المغامرة!"],
});
BADGES.push(
  {id: "island1", icon: "🏝️", en: ["Island explorer", "Finish the first island"], ar: ["مستكشف الجزر", "أنهِ الجزيرة الأولى"]},
  {id: "advHero", icon: "🦸", en: ["Adventure hero", "Finish all five islands"], ar: ["بطل المغامرة", "أنهِ الجزر الخمس"]},
  {id: "sticker5", icon: "📒", en: ["Sticker collector", "Collect 5 stickers"], ar: ["جامع الملصقات", "اجمع 5 ملصقات"]},
);
const ISLANDS = [
  {emoji: "🏖️", bg: "#FFE9A8", ground: "#FFD166"},
  {emoji: "🍭", bg: "#FFD6E8", ground: "#FF9CC2"},
  {emoji: "⛰️", bg: "#DCD6FF", ground: "#A9A6F0"},
  {emoji: "🐠", bg: "#CDEFFF", ground: "#7CC8F2"},
  {emoji: "🚀", bg: "#D8F5DF", ground: "#7FD99A"},
];
const DAILY_STICKERS = ["🦄", "🐙", "🦖", "🚂", "🍩", "🐼", "🦋", "🎈", "🐬", "🌈", "🍉", "🦁", "🐢", "🎠", "🪐", "🐝", "🍓", "🦒", "⚽", "🐧", "🌻", "🦊", "🍦", "🐳", "🎸", "🦜", "🧁", "🐞", "🚁", "🐨"];
const ICON = {copy: "🖼️", trace: "✏️", spell: "🔤", math: "➕"};
if (!progress.adv) progress.adv = {done: {}, stickers: [], daily: {}};

function advStops(){
  const little = settings.age === "little", lang = LANG;
  const copyIdx = little ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [0, 1, 3, 6, 7, 9, 10, 12, 13, 15];
  const words = SPELL[lang].map((w, i) => [i, [...w[0]].length]);
  const spellIdx = (little ? words.filter(w => w[1] <= 3).concat(words.filter(w => w[1] > 3)) : words).map(w => w[0]);
  const mathLv = little ? [1, 2, 2, 3, 3] : [1, 2, 4, 5, 7];
  let c = 0, tr = 0, sp = 0;
  const out = [];
  for (let i = 0; i < 5; i++){
    const plan = ["copy", "trace", "math", "spell", "copy", i % 2 ? "spell" : "trace"];
    plan.forEach((kind, j) => {
      const s = {id: `i${i}s${j}`, island: i, kind};
      if (kind === "copy") s.idx = copyIdx[c++ % copyIdx.length];
      if (kind === "trace") s.idx = tr++ % TRACE[lang].length;
      if (kind === "spell") s.idx = spellIdx[sp++ % spellIdx.length];
      if (kind === "math") s.level = mathLv[i];
      out.push(s);
    });
  }
  return out;
}
const stopKey = s => `${s.id}.${s.kind}`;
const stopStars = s => progress.adv.done[stopKey(s)] || 0;
function currentStopIndex(stops){ const i = stops.findIndex(s => !stopStars(s)); return i < 0 ? stops.length : i; }
function stopLabel(s){
  if (s.kind === "copy") return ART[PUZZLES[s.idx].art][LANG];
  if (s.kind === "trace") return TRACE[LANG][s.idx][0];
  if (s.kind === "spell") return SPELL[LANG][s.idx][1];
  return t("mathLevel", {n: s.level});
}
function stopTitle(s){
  if (s.kind === "copy") return t("copyTitle", {n: ART[PUZZLES[s.idx].art][LANG]});
  if (s.kind === "trace") return t("traceTitle", {l: TRACE[LANG][s.idx][0]});
  if (s.kind === "spell") return t("modeSpell");
  return t("modeMath");
}

/* ---------- drawing the map ---------- */
function renderMap(){
  const stops = advStops(), cur = currentStopIndex(stops), box = $("#mapIslands");
  box.innerHTML = "";
  for (let i = 0; i < 5; i++){
    const isl = ISLANDS[i], mine = stops.filter(s => s.island === i);
    const done = mine.every(s => stopStars(s));
    const sec = document.createElement("section"); sec.className = "island" + (done ? " done" : ""); sec.style.setProperty("--isl", isl.bg); sec.style.setProperty("--gnd", isl.ground);
    const first = stops.indexOf(mine[0]);
    const locked = first > cur;
    if (locked) sec.classList.add("locked");
    sec.innerHTML = `<header class="isl-head"><span class="isl-emoji" aria-hidden="true">${isl.emoji}</span><h3>${esc(t("island" + (i + 1)))}</h3>
      <span class="isl-sticker${done ? " got" : ""}" aria-label="${esc(t("stickers"))}">${done ? isl.emoji : "?"}</span></header><div class="isl-path"></div>`;
    const path = sec.querySelector(".isl-path");
    mine.forEach((s, j) => {
      const idx = stops.indexOf(s), st = stopStars(s), here = idx === cur, open = idx <= cur;
      const b = document.createElement("button"); b.type = "button";
      b.className = `stop k-${s.kind}${st ? " done" : ""}${here ? " here" : ""}${open ? "" : " shut"}`;
      b.style.setProperty("--row", j);
      b.dataset.say = `${stopTitle(s)}`;
      b.setAttribute("aria-label", `${stopTitle(s)}${st ? " " + starText(st) : ""}`);
      b.innerHTML = `<span class="stop-ic" aria-hidden="true">${open ? ICON[s.kind] : "🔒"}</span>
        <span class="stop-lb">${esc(open ? stopLabel(s) : "")}</span>
        <span class="stop-st" aria-hidden="true">${st ? starText(st) : ""}</span>
        ${here ? `<span class="stop-me" aria-hidden="true">${BRICKY_SVG}</span>` : ""}`;
      b.addEventListener("click", () => {
        if (!open){ sfx.nope(); say(t("mapLocked")); speak(t("mapLocked"), LANG); b.classList.remove("wiggle"); void b.offsetWidth; b.classList.add("wiggle"); return; }
        sfx.click(); playStop(s);
      });
      path.appendChild(b);
    });
    box.appendChild(sec);
  }
  $("#stickerCount").textContent = progress.adv.stickers.length;
  renderDaily();
}
function scrollToCurrent(){
  const here = $("#mapIslands .stop.here") || $("#mapIslands .island:last-child");
  if (!here) return;
  const r = here.getBoundingClientRect();
  pageScrollTo(Math.max(0, pageScrollY() + r.top - window.innerHeight / 2 + r.height / 2), reduceMotion ? "auto" : "smooth");
}

/* ---------- playing a stop ---------- */
let advPending = null;
function playStop(s){
  gAlpha = LANG;
  if (s.kind === "copy") progress.puzzleIdx = s.idx;
  if (s.kind === "trace") progress.traceIdx[gAlpha] = s.idx;
  if (s.kind === "spell") progress.spellIdx[gAlpha] = s.idx;
  if (currentMode !== "free") setMode("free", true);    // restart cleanly
  advPending = {...s};
  setMode(s.kind);
}
const _setModeAdv = setMode;
setMode = function(m, quiet){
  G.adv = m === "free" ? null : advPending;
  advPending = null;
  _setModeAdv(m, quiet);
  refreshMapBtn();
};
function refreshMapBtn(){
  const adv = !!G.adv && currentMode !== "free";
  $("#mapBtn").hidden = !adv;
  if (adv) $("#gamesBtn").hidden = true;
  $("#gNextTxt").textContent = t(adv ? (G.adv.daily ? "mapBack" : "stopNext") : "next");
}
on("gameWin", ({kind, stars}) => {
  const a = G.adv; if (!a || a.kind !== kind) return;
  if (a.daily){
    const today = dayKey();
    if (progress.adv.daily.date !== today || !progress.adv.daily.done){
      progress.adv.daily = {date: today, done: true};
      const pick = DAILY_STICKERS.find(s => !progress.adv.stickers.includes(s)) || DAILY_STICKERS[hashStr(today) % DAILY_STICKERS.length];
      giveSticker(pick, t("dailyWin"));
    }
    saveProgress(); return;
  }
  const key = stopKey(a), before = stopStars(a);
  progress.adv.done[key] = Math.max(before, stars || 1);
  const stops = advStops(), mine = stops.filter(s => s.island === a.island);
  if (!before && mine.every(s => stopStars(s))){
    giveSticker(ISLANDS[a.island].emoji, t("islandDone"));
    if (a.island === 0) award("island1");
    if (stops.every(s => stopStars(s))){ award("advHero"); setTimeout(() => say(t("allDone"), {speak: true}), 3500); }
  }
  saveProgress();
});
function giveSticker(emo, msg){
  if (!progress.adv.stickers.includes(emo)) progress.adv.stickers.push(emo);
  if (progress.adv.stickers.length >= 5) award("sticker5");
  setTimeout(() => { toast(emo, t("stickerNew"), msg); say(msg, {speak: true}); }, 1600);
}
// "Next" goes back to the map, where Bricky walks to the next stop
$("#gamePanel").addEventListener("click", e => {
  if (!G.adv || !e.target.closest("#gNext")) return;
  e.stopImmediatePropagation();
  sfx.click();
  const wasSolved = G.solved;
  setMode("free", true);
  openMap(wasSolved);
}, true);
function openMap(walk){
  showScreen("map");
  renderMap();
  requestAnimationFrame(() => { scrollToCurrent(); if (walk){ const h = $("#mapIslands .stop.here"); if (h){ h.classList.add("arrive"); } } });
  speak(t("mapHi"), LANG);
}

/* ---------- daily challenge ---------- */
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function hashStr(s){ let h = 2166136261; for (const ch of s){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function dailyStop(){
  const h = hashStr(dayKey() + LANG), kinds = ["copy", "trace", "spell", "math"], kind = kinds[h % 4];
  const s = {id: "daily", kind, daily: true};
  const little = settings.age === "little";
  if (kind === "copy") s.idx = (h >>> 3) % (little ? 6 : PUZZLES.length);
  if (kind === "trace") s.idx = (h >>> 3) % TRACE[LANG].length;
  if (kind === "spell"){ const ok = SPELL[LANG].map((w, i) => [i, [...w[0]].length]).filter(w => !little || w[1] <= 3); s.idx = ok[(h >>> 3) % ok.length][0]; }
  if (kind === "math") s.level = little ? 1 + (h >>> 3) % 3 : 1 + (h >>> 3) % 7;
  return s;
}
function renderDaily(){
  const s = dailyStop(), done = progress.adv.daily.date === dayKey() && progress.adv.daily.done;
  const box = $("#mapDaily");
  box.classList.toggle("done", done);
  box.innerHTML = `<span class="dly-ic" aria-hidden="true">${done ? "✅" : "🎁"}</span>
    <div class="dly-txt"><strong>${esc(t("daily"))}</strong><span>${esc(done ? t("dailyDone") : `${ICON[s.kind]} ${stopTitle(s)}${s.kind === "spell" ? " " + SPELL[LANG][s.idx][1] : ""}`)}</span></div>
    ${done ? "" : `<button class="btn sun" type="button" id="dailyBtn">${esc(t("dailyPlay"))}</button>`}`;
  const btn = $("#dailyBtn");
  if (btn) btn.addEventListener("click", () => { sfx.click(); playStop(s); });
  box.dataset.say = done ? t("dailyDone") : `${t("daily")}: ${stopTitle(s)}`;
}

/* ---------- sticker book ---------- */
function openStickers(){
  const got = progress.adv.stickers;
  const all = [...ISLANDS.map(i => i.emoji), ...DAILY_STICKERS];
  let html = `<h2>${esc(t("stickerBook"))}</h2><p>${esc(t("stickerSub"))}</p><div class="sticker-grid">`;
  all.forEach((e, i) => {
    const has = got.includes(e);
    const label = i < 5 ? t("island" + (i + 1)) : "";
    html += `<div class="sticker${has ? " got" : ""}${i < 5 ? " isl" : ""}"><span aria-hidden="true">${has ? e : "?"}</span>${label ? `<small>${esc(label)}</small>` : ""}</div>`;
  });
  html += `</div><div class="modal-actions"><button class="btn white" data-close>${esc(t("close"))}</button></div>`;
  openModal(html, t("stickerBook"), "sticker-modal");
  sfx.click();
}

$("#stickerBtn").addEventListener("click", openStickers);
$("#allGamesBtn").addEventListener("click", () => { sfx.click(); showScreen("games"); speak(t("pickGame"), LANG); });
$("#mapBtn").addEventListener("click", () => { sfx.click(); setMode("free", true); openMap(false); });
on("lang", () => { if (screen === "map") renderMap(); refreshMapBtn(); });
on("boot", () => refreshMapBtn());
