/* ===================== start-up + wiring ===================== */
const SAVE_KEY = "snappy-bricks-v2";
const saveFree = later(() => store(SAVE_KEY, {cols: FREE.cols, rows: FREE.rows, plate: FREE.plate, bricks: FREE.bricks}), 300);
on("change", () => { if (B === FREE) saveFree(); });
// never lose the last few moves when the tab is closed or put away
window.addEventListener("pagehide", saveFree.flush);
document.addEventListener("visibilitychange", () => { if (document.hidden) saveFree.flush(); });
function loadFree(){
  const d = store(SAVE_KEY) || store("snappy-bricks-v1");
  if (!d || !Array.isArray(d.bricks) || !isBoardSize(d.cols, d.rows)) return false;
  FREE.cols = d.cols; FREE.rows = d.rows; FREE.plate = typeof d.plate === "string" ? d.plate : "#FF2E8A";
  FREE.bricks = fitBricks(d.bricks.filter(b => b && [b.x, b.y, b.w, b.h].every(Number.isFinite) && typeof b.c === "string")
    .map(b => ({id: nextId++, x: b.x, y: b.y, w: b.w, h: b.h, c: b.c, t: b.t || "std", z: b.z || 0})));
  return true;
}
function starter(){
  FREE.cols = 24; FREE.rows = 18; FREE.plate = "#FF2E8A"; FREE.bricks = [];
  rebuildGrid();
  buildText("HELLO", {quiet: true, noHistory: true, y: 2, mode: "rainbow", style: "std"});
  const put = (name, gx, gy) => artPiece(name).bricks.forEach(b => FREE.bricks.push({id: nextId++, x: gx + b.x, y: gy + b.y, w: b.w, h: b.h, c: b.c, t: "std", z: 0}));
  put("heart", 3, 10); put("star", 14, 10);
  [[0,0,2,2,"#7FE3C0"],[22,0,2,2,"#A9A6F0"],[0,16,2,2,"#FFE838"],[22,16,2,2,"#FBFAF5"],[10,14,4,2,"#FFB3CF"]]
    .forEach(([x, y, w, h, c]) => FREE.bricks.push({id: nextId++, x, y, w, h, c, t: "std", z: 0}));
}
async function ensureFont(text){
  if (!document.fonts || !document.fonts.load) return;
  try { await Promise.race([document.fonts.load(`800 20px "Baloo Bhaijaan 2"`, text || "ب"), new Promise(r => setTimeout(r, 1500))]); } catch(e){}
}

/* ---- wiring ---- */
$("#langBtn").addEventListener("click", () => { sfx.click(); setLang(LANG === "ar" ? "en" : "ar"); });
$("#talkBtn").addEventListener("click", () => {
  settings.talk = !settings.talk; saveSettings();
  $("#talkBtn").setAttribute("aria-pressed", settings.talk);
  $("#talkTxt").textContent = t(settings.talk ? "talkOn" : "talkOff");
  sfx.click();
  if (!settings.talk) stopClips(); else warmVoice();
  if (settings.talk && LANG === "ar" && !voiceFor("ar") && VOICE.clips.ar && !hasVoicePack("ar")) say(t("noArabicVoice"));
  else say(t(settings.talk ? "talkSayOn" : "talkSayOff"), {speak: true});
});
$("#soundBtn").addEventListener("click", () => {
  settings.sound = !settings.sound; saveSettings();
  $("#soundBtn").setAttribute("aria-pressed", settings.sound);
  $("#soundTxt").textContent = t(settings.sound ? "soundOn" : "soundOff");
  if (settings.sound) sfx.click();
});
$$("[data-tool]").forEach(b => b.addEventListener("click", () => setTool(b.dataset.tool)));
$("#mirrorBtn").addEventListener("click", () => setMirror({off: "lr", lr: "four", four: "off"}[settings.mirror] || "off"));
$("#stackBtn").addEventListener("click", () => setStack(!settings.stack));
$("#turnBtn").addEventListener("click", toggleTurn);
$("#undoBtn").addEventListener("click", undo);
$("#clearBtn").addEventListener("click", clearBoard);
$("#saveBtn").addEventListener("click", savePicture);
$("#selStamp").addEventListener("click", makeStampFromSelection);
$("#selDelete").addEventListener("click", deleteSelection);
$("#selCancel").addEventListener("click", () => { cancelSelection(); sfx.click(); });
$("#nameInput").setAttribute("dir", "auto");
$("#nameForm").addEventListener("submit", async e => {
  e.preventDefault();
  const v = $("#nameInput").value;
  if (!isPixelText(v.toUpperCase())) await ensureFont(v);
  buildName(v);
});
$$("[data-ins]").forEach(b => b.addEventListener("click", () => {
  const inp = $("#nameInput"); if (inp.value.length >= 18) return;
  inp.value += b.dataset.ins; inp.focus(); sfx.click();
}));
$$("[data-mode]").forEach(b => b.addEventListener("click", () => {
  nameMode = b.dataset.mode; sfx.click();
  $$("[data-mode]").forEach(x => x.setAttribute("aria-pressed", x.dataset.mode === nameMode));
}));

// hide the tablet brick dock while the on-screen keyboard is up
document.addEventListener("focusin", e => { if (e.target.matches && e.target.matches("input, textarea")) document.body.classList.add("typing"); });
document.addEventListener("focusout", e => { if (e.target.matches && e.target.matches("input, textarea")) document.body.classList.remove("typing"); });
let rz;
window.addEventListener("resize", () => {
  clearTimeout(rz);
  rz = setTimeout(() => { buildLogo(); buildShapes(); buildStamps(); fitCell(); emit("resize"); }, 120);
});
window.addEventListener("orientationchange", () => setTimeout(() => { buildLogo(); fitCell(); }, 300));

/* ---- go ---- */
document.body.dataset.mode = "free";
LANG = settings.lang === "ar" ? "ar" : "en";
const hadSave = loadFree();
B = FREE;
$("#talkBtn").setAttribute("aria-pressed", settings.talk);
$("#soundBtn").setAttribute("aria-pressed", settings.sound);
setLang(LANG, true);
setStack(!!settings.stack, true);
applyBoard();
if (!hadSave) starter();
commit();
updateUndo();
emit("boot");
say(t(hadSave ? "welcomeBack" : "hello"), {silent: true});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitCell(); });
