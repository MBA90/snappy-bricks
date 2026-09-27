/* ===================== games ===================== */
let currentMode = "free";
const G = {};
const progress = Object.assign({puzzles: {}, traced: {en: [], ar: []}, spelled: {en: [], ar: []}, mathLevel: 1, mathSolved: 0,
  puzzleIdx: 0, traceIdx: {en: 0, ar: 0}, spellIdx: {en: 0, ar: 0}, solvedCount: 0}, store("snappy-progress") || {});
function saveProgress(){ store("snappy-progress", progress); }
const mod = (i, n) => ((i % n) + n) % n;
const starText = n => "★".repeat(n) + "☆".repeat(3 - n);
let gAlpha = null;
let CLASS_WORDS = [];
function spellList(alpha){
  const extra = CLASS_WORDS.map(w => String(w).trim()).filter(Boolean).map(w => hasArabic(w) ? (alpha === "ar" ? [w, "⭐"] : null)
    : (alpha === "en" && /^[A-Za-z]{2,10}$/.test(w) ? [w.toUpperCase(), "⭐"] : null)).filter(Boolean);
  return [...extra, ...SPELL[alpha]];
}

function clearHints(cls){ plate.querySelectorAll(cls ? ".hintcell." + cls : ".hintcell").forEach(e => e.remove()); }
function addHint(x, y, cls, bg){
  const d = document.createElement("div"); d.className = "hintcell " + cls;
  placeEl(d, {x, y, w: 1, h: 1}); if (bg) d.style.setProperty("--hc", bg);
  plate.appendChild(d); return d;
}
function setProgress(a, b, text){
  $("#gBarFill").style.width = (b ? Math.round(100 * Math.min(a, b) / b) : 0) + "%";
  $("#gProg").textContent = text;
}
function gameBoard(cols, rows, plateHex){
  G.board = newBoard(cols, rows, plateHex);
  const same = B === G.board; switchBoard(G.board); if (same) applyBoard();
  clearHints();
}

function setMode(m, quiet){
  if (m === currentMode && m === "free") return;
  currentMode = m; document.body.dataset.mode = m;
  $$("[data-gmode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.gmode === m));
  clearHints();
  if (m === "free"){
    $("#gamePanel").hidden = true; switchBoard(FREE);
    if (!quiet){ sfx.click(); say(t("freeBack")); }
    return;
  }
  $("#gamePanel").hidden = false;
  if (!gAlpha) gAlpha = LANG;
  sfx.click();
  startGame(m);
}
async function startGame(m, idx){
  Object.assign(G, {ready: false, kind: m, solved: false, hints: 0, mistakes: 0, warned: false, warnedK: false, wrong: []});
  $("#gStars").textContent = ""; $("#gLetters").innerHTML = ""; $("#gNext").classList.remove("pulse");
  $("#gAlpha").hidden = !(m === "trace" || m === "spell");
  $("#gAlpha").textContent = gAlpha === "ar" ? "ABC" : "أ ب ت";
  $("#gAlpha").setAttribute("aria-label", t("letterSet"));
  if (gAlpha === "ar" && (m === "trace" || m === "spell")) await ensureFont(AR_LETTERS);
  if (m === "copy") startCopy(idx != null ? idx : progress.puzzleIdx);
  if (m === "trace") startTrace(idx != null ? idx : progress.traceIdx[gAlpha]);
  if (m === "spell") startSpell(idx != null ? idx : progress.spellIdx[gAlpha]);
  if (m === "math") startMath();
  requestAnimationFrame(() => { fitCell(); requestAnimationFrame(fitCell); });
}
function refreshGameText(){ if (currentMode !== "free" && G.refresh) G.refresh(); }
on("lang", () => {
  $$("[data-gmode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.gmode === currentMode));
  refreshGameText();
});
on("change", () => { if (currentMode !== "free" && G.ready && B === G.board && !G.solved) checkGame(); });
function checkGame(){
  if (G.kind === "copy") checkCopy();
  else if (G.kind === "trace") checkTrace();
  else if (G.kind === "math") checkMath();
}
function win(key, vars, n){
  G.solved = true;
  const s = starText(n);
  $("#gStars").textContent = s;
  progress.solvedCount = (progress.solvedCount || 0) + 1; saveProgress();
  setTimeout(() => { sfx.cheer(); confetti(); }, 250);
  say(t(key, {...vars, s}));
  $("#gNext").classList.add("pulse");
  emit("gameWin", {kind: G.kind, stars: n});
}

/* ---------- Copy the picture ---------- */
function plateFor(colors){
  const opts = ["#2F9BF0", "#FF2E8A", "#3DC45A", "#8F7FEA", "#FFD23F"];
  let best = opts[0], bd = -1;
  for (const p of opts){ const d = Math.min(...colors.map(c => colorDist(c, p))); if (d > bd){ bd = d; best = p; } }
  return best;
}
function artCanvas(pix, plateHex, c){
  const tmp = {cols: pix[0].length + 2, rows: pix.length + 2, plate: plateHex,
    bricks: decompose(pix).map((b, i) => ({...b, id: i + 1, x: b.x + 1, y: b.y + 1, t: "std", z: 0}))};
  const cv = boardCanvas(tmp, c, {pad: 0, foot: 0, bg: "#ffffff"});
  cv.className = "gp-canvas"; return cv;
}
function startCopy(i){
  i = mod(i, PUZZLES.length); progress.puzzleIdx = i; saveProgress();
  const pz = PUZZLES[i], pix = artToPix(ART[pz.art].art);
  const h = pix.length, w = pix[0].length;
  const colors = [...new Set(pix.flat().filter(Boolean))];
  gameBoard(16, 12, plateFor(colors));
  Object.assign(G, {pz, pix, ox: Math.floor((16 - w) / 2), oy: Math.floor((12 - h) / 2)});
  pix.forEach((r, y) => r.forEach((c, x) => {
    if (!c) return;
    if (pz.lvl === "easy") addHint(G.ox + x, G.oy + y, "ghost-color", c);
    if (pz.lvl === "medium") addHint(G.ox + x, G.oy + y, "ghost-line");
  }));
  const tg = $("#gTarget"); tg.innerHTML = ""; tg.appendChild(artCanvas(pix, B.plate, 16));
  G.refresh = () => {
    $("#gTitle").textContent = t("copyTitle", {n: ART[pz.art][LANG]});
    $("#gText").textContent = `${t("copyText_" + pz.lvl)} (${t(pz.lvl)} · ${LEVEL_AGES[pz.lvl][LANG === "ar" ? 1 : 0]})`;
  };
  G.refresh();
  color = colors[0]; buildSwatches(); buildShapes();
  G.ready = true; checkCopy();
  say(t("gameStart", {t: $("#gTitle").textContent}), {speak: true});
}
function checkCopy(){
  let right = 0, total = 0; const wrong = [];
  G.pix.forEach((r, y) => r.forEach((c, x) => {
    const b = topAt(G.ox + x, G.oy + y), bc = b ? b.c : null;
    if (c){ total++; if (bc === c) right++; else wrong.push([G.ox + x, G.oy + y]); }
    else if (bc) wrong.push([G.ox + x, G.oy + y]);
  }));
  G.wrong = wrong;
  setProgress(right, total, t("progStuds", {a: right, b: total}));
  if (!wrong.length){
    const n = G.hints === 0 ? 3 : G.hints <= 2 ? 2 : 1;
    const key = G.pz.art;
    progress.puzzles[key] = Math.max(progress.puzzles[key] || 0, n); saveProgress();
    clearHints();
    win("copyWin", {n: ART[key][LANG]}, n);
  }
}

/* ---------- Trace letters ---------- */
function startTrace(i){
  const list = TRACE[gAlpha]; i = mod(i, list.length); progress.traceIdx[gAlpha] = i; saveProgress();
  const [L, word, emo] = list[i];
  gameBoard(16, 12, "#2F9BF0");
  const cells = [];
  if (gAlpha === "en"){
    const g = glyph(L), ox = Math.floor((16 - g.w * 2) / 2), oy = 1;
    g.rows.forEach((r, y) => [...r].forEach((p, x) => {
      if (p === "#") for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) cells.push([ox + x * 2 + dx, oy + y * 2 + dy]);
    }));
  } else {
    let best = null;
    for (let fs = 40; fs >= 8; fs--){ const r = rasterLine(L, fs); if (r && r.w <= 14 && r.h <= 10){ best = r; break; } }
    if (best){
      const ox = Math.floor((16 - best.w) / 2), oy = Math.floor((12 - best.h) / 2);
      best.m.forEach((row, y) => row.forEach((v, x) => { if (v) cells.push([ox + x, oy + y]); }));
    }
  }
  Object.assign(G, {cells, L, word, emo});
  cells.forEach(([x, y]) => addHint(x, y, "ghost-line"));
  $("#gTarget").innerHTML = `<div class="gp-emoji" aria-hidden="true">${emo}</div><div class="gp-word" dir="auto">${esc(L)} · ${esc(word)}</div>`;
  G.refresh = () => { $("#gTitle").textContent = t("traceTitle", {l: L}); $("#gText").textContent = t("traceText"); };
  G.refresh();
  G.ready = true; checkTrace();
  say(t("traceTitle", {l: L})); speak(L, gAlpha);
}
function checkTrace(){
  let a = 0; const miss = [];
  G.cells.forEach(([x, y]) => { if (topAt(x, y)) a++; else miss.push([x, y]); });
  G.wrong = miss;
  setProgress(a, G.cells.length, t("progCover", {a, b: G.cells.length}));
  if (!miss.length && G.cells.length){
    const inside = new Set(G.cells.map(([x, y]) => y * 1000 + x));
    let extra = 0;
    for (let y = 0; y < B.rows; y++) for (let x = 0; x < B.cols; x++) if (topAt(x, y) && !inside.has(y * 1000 + x)) extra++;
    const n = extra <= 3 ? 3 : extra <= 10 ? 2 : 1;
    if (!progress.traced[gAlpha].includes(G.L)) progress.traced[gAlpha].push(G.L);
    saveProgress(); clearHints();
    win("traceWin", {l: G.L, w: G.word}, n);
    setTimeout(() => speak(`${G.L}. ${G.word}`, gAlpha), 700);
  }
}

/* ---------- Spell it ---------- */
function startSpell(i){
  const list = spellList(gAlpha); i = mod(i, list.length); progress.spellIdx[gAlpha] = i; saveProgress();
  const [word, emo] = list[i];
  gameBoard(24, 18, "#3DC45A");
  Object.assign(G, {word, emo, letters: [...word], pos: 0});
  if (gAlpha === "en") G.plan = compose(word, 24, 18, "rainbow");
  const pool = gAlpha === "en" ? "ABCDEFGHIJKLMNOPRSTUVWY" : AR_LETTERS;
  const uniq = [...new Set(G.letters)];
  const decoys = [...pool].filter(c => !uniq.includes(c)).sort(() => Math.random() - .5).slice(0, Math.max(2, 6 - uniq.length));
  const opts = [...uniq, ...decoys].sort(() => Math.random() - .5);
  const box = $("#gLetters"); box.innerHTML = "";
  opts.forEach(l => {
    const b = document.createElement("button"); b.type = "button"; b.className = "gletter"; b.textContent = l; b.dataset.l = l;
    b.addEventListener("click", () => tapLetter(l, b));
    box.appendChild(b);
  });
  G.refresh = () => { $("#gTitle").textContent = t("spellTitle"); $("#gText").textContent = t("spellText"); renderSlots(); };
  G.refresh(); G.ready = true;
  say(t("spellText")); speak(word, gAlpha);
}
function renderSlots(){
  const shown = G.letters.map((l, i) => i < G.pos ? l : "_");
  $("#gTarget").innerHTML = `<div class="gp-emoji" aria-hidden="true">${G.emo}</div><div class="gp-slots" dir="${gAlpha === "ar" ? "rtl" : "ltr"}">${shown.map(s => `<span>${esc(s)}</span>`).join("")}</div>`;
  setProgress(G.pos, G.letters.length, t("progLetters", {a: G.pos, b: G.letters.length}));
}
function tapLetter(l, btn){
  if (G.solved) return;
  const need = G.letters[G.pos];
  if (l !== need){ G.mistakes++; sfx.nope(); btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake"); say(t("spellWrong")); return; }
  G.pos++; sfx.snap(); speak(l, gAlpha);
  renderSlots(); drawSpell();
  if (G.pos === G.letters.length){
    const n = G.mistakes === 0 ? 3 : G.mistakes <= 2 ? 2 : 1;
    if (!progress.spelled[gAlpha].includes(G.word)) progress.spelled[gAlpha].push(G.word);
    saveProgress();
    setTimeout(() => { win("spellWin", {w: G.word}, n); speak(G.word, gAlpha); }, 650);
  }
}
function drawSpell(){
  if (gAlpha === "en" && G.plan){
    const gx = Math.floor((B.cols - G.plan.w) / 2), gy = Math.floor((B.rows - G.plan.h) / 2);
    const anim = new Map();
    G.plan.bricks.filter(b => b.li === G.pos - 1).forEach((b, k) => {
      const nb = {id: nextId++, x: gx + b.x, y: gy + b.y, w: b.w, h: b.h, c: b.c, t: "std", z: 0};
      B.bricks.push(nb); anim.set(nb.id, k * 22);
    });
    commit(anim);
  } else {
    B.bricks = []; rebuildGrid();
    buildText(G.letters.slice(0, G.pos).join(""), {noHistory: true, quiet: true, overwrite: true, mode: "rainbow", fast: true});
  }
}
function spellHint(){
  const l = G.letters[G.pos]; if (!l) return;
  G.mistakes++;
  say(t("hintSpell", {l})); speak(l, gAlpha);
  $$("#gLetters .gletter").forEach(b => { if (b.dataset.l === l){ b.classList.remove("glow"); void b.offsetWidth; b.classList.add("glow"); } });
}

/* ---------- Brick math ---------- */
function startMath(){
  const L = progress.mathLevel || 1, r = n => Math.floor(Math.random() * n);
  let n, k = null;
  if (L <= 3) n = 2 + r(9);
  else if (L <= 6) n = 10 + r(11);
  else { n = 12 + r(25); k = clamp(Math.ceil(n / 8) + r(2), 2, 5); }
  Object.assign(G, {n, k, L});
  gameBoard(16, 12, "#8F7FEA");
  $("#gTarget").innerHTML = `<div class="gp-num">${n}</div>`;
  G.refresh = () => {
    $("#gTitle").textContent = `${t("mathTitle", {n})} · ${t("mathLevel", {n: L})}`;
    $("#gText").textContent = k ? t("mathTextK", {k, n}) : t("mathText", {n});
  };
  G.refresh(); G.ready = true; checkMath();
  say(t("mathTitle", {n}), {speak: true});
}
function checkMath(){
  const vals = B.bricks.map(b => b.w * b.h), sum = vals.reduce((a, v) => a + v, 0), cnt = vals.length;
  const eq = cnt ? (cnt > 10 ? `… = ${sum}` : `${vals.join(" + ")} = ${sum}`) : "";
  setProgress(Math.min(sum, G.n), G.n, `${sum} / ${G.n} ${t("bumps")}` + (G.k ? ` · 🧱 ${cnt} / ${G.k}` : ""));
  $("#gLetters").innerHTML = eq ? `<div class="gp-eq" dir="ltr">${esc(eq)}</div>` : "";
  if (sum > G.n){ if (!G.warned){ G.warned = true; say(t("mathTooMany"), {speak: true}); } }
  else G.warned = false;
  if (sum === G.n && (!G.k || cnt === G.k)){
    progress.mathLevel = G.L + 1; progress.mathSolved = (progress.mathSolved || 0) + 1; saveProgress();
    win("mathWin", {eq}, 3);
  } else if (sum === G.n && G.k && !G.warnedK){ G.warnedK = true; say(t("mathBricks", {k: G.k})); }
}

/* ---------- panel buttons ---------- */
$$("[data-gmode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.gmode)));
$("#gNext").addEventListener("click", () => {
  if (G.kind === "copy") startGame("copy", progress.puzzleIdx + 1);
  else if (G.kind === "trace") startGame("trace", progress.traceIdx[gAlpha] + 1);
  else if (G.kind === "spell") startGame("spell", progress.spellIdx[gAlpha] + 1);
  else startGame("math");
  sfx.click();
});
$("#gReset").addEventListener("click", () => {
  if (G.kind === "copy") startGame("copy", progress.puzzleIdx);
  else if (G.kind === "trace") startGame("trace", progress.traceIdx[gAlpha]);
  else if (G.kind === "spell") startGame("spell", progress.spellIdx[gAlpha]);
  else { B.bricks = []; commit(); }
  sfx.whoosh();
});
$("#gHint").addEventListener("click", () => {
  if (G.solved) return;
  sfx.click();
  if (G.kind === "spell"){ spellHint(); return; }
  if (G.kind === "math"){ say(t("hintMath"), {speak: true}); return; }
  G.hints++;
  clearHints("wrong");
  (G.wrong || []).forEach(([x, y]) => { const d = addHint(x, y, "wrong"); setTimeout(() => d.remove(), 1700); });
  say(t("hintSay"), {speak: true});
});
$("#gAlpha").addEventListener("click", () => {
  gAlpha = gAlpha === "ar" ? "en" : "ar"; sfx.click(); startGame(G.kind);
});
$("#gLevels").addEventListener("click", openLevels);

function openLevels(){
  let html = "";
  if (G.kind === "copy"){
    html = `<h2>${esc(t("pickPicture"))}</h2>`;
    for (const lvl of ["easy", "medium", "hard"]){
      html += `<h3 class="lv-h">${esc(t(lvl))} <small>${esc(LEVEL_AGES[lvl][LANG === "ar" ? 1 : 0])}</small></h3><div class="lv-grid">`;
      PUZZLES.forEach((p, i) => {
        if (p.lvl !== lvl) return;
        const st = progress.puzzles[p.art] || 0;
        html += `<button class="lv-item" data-i="${i}"><span class="lv-pic" data-art="${p.art}"></span><span>${esc(ART[p.art][LANG])}</span><span class="lv-stars">${st ? starText(st) : "☆☆☆"}</span></button>`;
      });
      html += `</div>`;
    }
  } else if (G.kind === "trace"){
    html = `<h2>${esc(t("pickLetter"))}</h2><div class="lv-grid letters">`;
    TRACE[gAlpha].forEach(([L], i) => {
      const done = progress.traced[gAlpha].includes(L);
      html += `<button class="lv-item lv-letter${done ? " done" : ""}" data-i="${i}">${esc(L)}${done ? "<small>✓</small>" : ""}</button>`;
    });
    html += `</div>`;
  } else if (G.kind === "spell"){
    html = `<h2>${esc(t("pickWord"))}</h2><div class="lv-grid">`;
    spellList(gAlpha).forEach(([w, e], i) => {
      const done = progress.spelled[gAlpha].includes(w);
      html += `<button class="lv-item${done ? " done" : ""}" data-i="${i}"><span class="lv-emo">${e}</span><span dir="auto">${esc(w)}</span>${done ? "<small>✓</small>" : ""}</button>`;
    });
    html += `</div>`;
  } else {
    html = `<h2>${esc(t("levels"))}</h2><div class="lv-grid">` +
      [[1, "easy"], [4, "medium"], [7, "hard"]].map(([lv, k]) => `<button class="lv-item" data-lv="${lv}"><span class="lv-emo">${lv === 1 ? "1️⃣" : lv === 4 ? "🔟" : "🧮"}</span><span>${esc(t(k))}</span><small>${esc(t("mathLevel", {n: lv + "+"}))}</small></button>`).join("") + `</div>`;
  }
  html += `<div class="modal-actions"><button class="btn white" data-close>${esc(t("close"))}</button></div>`;
  const card = openModal(html, t("levels"), "levels");
  card.querySelectorAll(".lv-pic").forEach(el => {
    const pix = artToPix(ART[el.dataset.art].art);
    el.appendChild(artCanvas(pix, plateFor([...new Set(pix.flat().filter(Boolean))]), 8));
  });
  card.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => { closeModal(); startGame(G.kind, +b.dataset.i); }));
  card.querySelectorAll("[data-lv]").forEach(b => b.addEventListener("click", () => { closeModal(); progress.mathLevel = +b.dataset.lv; saveProgress(); startGame("math"); }));
}
