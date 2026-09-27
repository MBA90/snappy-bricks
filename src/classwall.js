/* ===================== class wall (classroom edition only) ===================== */
addStrings({
  classWall: ["Class wall", "لوحة الصف"],
  wallTitle: ["Our class wall", "لوحة صفّنا"],
  wallOff: ["The class wall works when your teacher shares this page with the class.", "تعمل لوحة الصف عندما يشارك المعلم هذه الصفحة مع الصف."],
  wallNick: ["Your first name", "اسمك الأول"],
  wallPost: ["Post my build", "انشر عملي"],
  wallPrivacy: ["Only your first name and your picture are shared with your class. Never write your full name or address.", "يُشارك اسمك الأول وصورتك فقط مع صفّك. لا تكتب اسمك الكامل أو عنوانك أبدًا."],
  wallPosted: ["Posted! Your class can see it now.", "تم النشر! يستطيع صفّك رؤيته الآن."],
  wallNickFirst: ["Type your first name first.", "اكتب اسمك الأول أولًا."],
  wallCant: ["You can look at the wall, but only class members can post.", "يمكنك مشاهدة اللوحة، لكن النشر لأعضاء الصف فقط."],
  wallFullErr: ["The wall is full. Ask your teacher to remove old posts.", "اللوحة ممتلئة. اطلب من المعلم حذف المنشورات القديمة."],
  wallErr: ["That didn't work. Try again in a moment.", "لم ينجح ذلك. حاول مرة أخرى بعد قليل."],
  wallEmpty: ["No builds yet. Be the first!", "لا توجد أعمال بعد. كن الأول!"],
  wallCopy: ["Copy to my board", "انسخ إلى لوحتي"],
  wallRemove: ["Remove", "إزالة"],
  teacherTitle: ["Teacher corner", "ركن المعلم"],
  teacherWords: ["Spelling words for the class (one per line). They show up first in Spell it.", "كلمات التهجئة للصف (كلمة في كل سطر). تظهر أولًا في لعبة التهجئة."],
  teacherSave: ["Save words", "احفظ الكلمات"],
  teacherSaved: ["Words saved for the whole class.", "حُفظت الكلمات للصف كله."],
});
let cwDb = null, cwUser = null, cwMe = null, cwTeach = false, cwPosts = [], cwCanPost = null;
(async () => {
  if (!IN_ARTIFACT) return;
  try { cwDb = await window.claude.use("db"); } catch(e){ cwDb = null; }
  try { cwUser = await window.claude.use("user"); } catch(e){ cwUser = null; }
  if (cwUser){
    try { cwMe = await cwUser.id(); } catch(e){}
    try { cwTeach = await cwUser.canEdit(); } catch(e){}
    try { cwCanPost = await cwUser.can("data.write"); } catch(e){}
  }
  if (!cwDb) return;
  try {
    cwDb.doc("teacher/settings").onSnapshot(s => {
      const d = s.exists ? s.data() : null;
      CLASS_WORDS = d && Array.isArray(d.words) ? d.words.filter(w => typeof w === "string").slice(0, 40) : [];
      emit("classWords");
    }, () => {});
    cwDb.collection("wall").orderBy("at", "desc").limit(60).onSnapshot(s => {
      cwPosts = s.docs.map(d => ({id: d.id, ...d.data()}));
      emit("wall");
    }, () => {});
  } catch(e){ /* stay offline */ }
})();

(function addWallButton(){
  const b = document.createElement("button");
  b.className = "btn lav"; b.id = "wallBtn"; b.type = "button";
  b.innerHTML = `<span aria-hidden="true">🏫</span><span data-i18n="classWall">${esc(t("classWall"))}</span>`;
  b.addEventListener("click", openWall);
  $("#shareGrid").appendChild(b);
})();

function wallGrid(){
  if (!cwPosts.length) return `<p>${esc(t("wallEmpty"))}</p>`;
  return `<div class="gal-grid">` + cwPosts.map(p => `<button class="wall-item" data-id="${esc(p.id)}">
      <img alt="" src="${typeof p.thumb === "string" && p.thumb.startsWith("data:image/") ? p.thumb : ""}">
      <strong dir="auto">${esc(String(p.nick || "").slice(0, 20))}</strong></button>`).join("") + `</div>`;
}
function openWall(){
  sfx.click();
  if (!cwDb){ openModal(`<h2>${esc(t("wallTitle"))}</h2><p>${esc(t("wallOff"))}</p><div class="modal-actions"><button class="btn white" data-close>${esc(t("close"))}</button></div>`, t("wallTitle")); return; }
  const nick = store("snappy-nick") || "";
  let html = `<h2>${esc(t("wallTitle"))}</h2>
    <div class="wall-post">
      <label class="card-form" style="grid-template-columns:1fr"><span>${esc(t("wallNick"))}</span><input id="wNick" dir="auto" maxlength="20" value="${esc(nick)}"></label>
      <button class="btn big" id="wPost" type="button">${esc(t("wallPost"))}</button>
      <p class="hint" style="margin:0">${esc(t("wallPrivacy"))}</p>
    </div>
    <div id="wGrid">${wallGrid()}</div>`;
  if (cwTeach){
    html += `<div class="teacher"><h3>${esc(t("teacherTitle"))}</h3><p class="hint" style="margin:0">${esc(t("teacherWords"))}</p>
      <textarea id="wWords" rows="4" dir="auto">${esc(CLASS_WORDS.join("\n"))}</textarea>
      <div class="modal-actions" style="justify-content:flex-start"><button class="btn mint" id="wSaveWords" type="button">${esc(t("teacherSave"))}</button></div></div>`;
  }
  html += `<div class="modal-actions"><button class="btn white" data-close>${esc(t("close"))}</button></div>`;
  const card = openModal(html, t("wallTitle"), "wide");
  const bindGrid = () => card.querySelectorAll(".wall-item").forEach(b => b.addEventListener("click", () => openPost(b.dataset.id)));
  bindGrid();
  const refresh = () => { const g = card.querySelector("#wGrid"); if (g && document.body.contains(g)){ g.innerHTML = wallGrid(); bindGrid(); } };
  on("wall", refresh);
  if (cwCanPost === false) card.querySelector("#wPost").disabled = true;
  card.querySelector("#wPost").addEventListener("click", async () => {
    const n = card.querySelector("#wNick").value.trim();
    if (!n){ say(t("wallNickFirst")); card.querySelector("#wNick").focus(); return; }
    if (!B.bricks.length){ say(t("buildFirst")); return; }
    store("snappy-nick", n);
    const btn = card.querySelector("#wPost"); btn.disabled = true;
    try {
      const board = B.bricks.length <= 1500 ? compactBoard(B) : null;
      await cwDb.collection("wall").add({nick: n.slice(0, 20), thumb: thumbData(B, 200), board, author: cwMe, at: Date.now()});
      sfx.cheer(); say(t("wallPosted")); emit("saved");
    } catch(e){
      sfx.nope();
      say(t(e && e.code === "quota_exceeded" ? "wallFullErr" : e && e.code === "invalid_argument" ? "wallCant" : "wallErr"));
    }
    btn.disabled = false;
  });
  const sw = card.querySelector("#wSaveWords");
  if (sw) sw.addEventListener("click", async () => {
    const words = card.querySelector("#wWords").value.split(/[\n,]+/).map(w => w.trim()).filter(Boolean).slice(0, 40);
    try { await cwDb.doc("teacher/settings").set({words}); sfx.cheer(); say(t("teacherSaved")); }
    catch(e){ sfx.nope(); say(t("wallErr")); }
  });
}
function openPost(id){
  const p = cwPosts.find(x => x.id === id); if (!p) return;
  const mine = cwMe && p.author === cwMe;
  const html = `<h2 dir="auto">${esc(String(p.nick || ""))}</h2>
    <img alt="" src="${typeof p.thumb === "string" && p.thumb.startsWith("data:image/") ? p.thumb : ""}" style="max-width:520px;margin-inline:auto;background:#fff">
    <div class="modal-actions">
      ${(cwTeach || mine) ? `<button class="btn warn" id="pDel">${esc(t("wallRemove"))}</button>` : ""}
      ${p.board ? `<button class="btn mint" id="pCopy">${esc(t("wallCopy"))}</button>` : ""}
      <button class="btn white" data-close>${esc(t("close"))}</button></div>`;
  const card = openModal(html, String(p.nick || ""));
  const c = card.querySelector("#pCopy");
  if (c) c.addEventListener("click", () => {
    const bd = p.board;
    if (!bd || !Array.isArray(bd.b) || !SIZES.some(s => s.cols === bd.cols && s.rows === bd.rows)) return;
    bd.plate = /^#[0-9A-Fa-f]{6}$/.test(bd.plate) ? bd.plate : "#FF2E8A";
    bd.b = bd.b.filter(a => Array.isArray(a) && a.length >= 5 && a.slice(0, 4).every(Number.isFinite) && a[2] > 0 && a[3] > 0 && /^#[0-9A-Fa-f]{6}$/.test(a[4]))
      .map(a => [a[0], a[1], a[2], a[3], a[4], STYLES.some(s => s.id === a[5]) ? a[5] : "std", Number.isFinite(a[6]) ? clamp(a[6], 0, MAXZ - 1) : 0]);
    closeModal(); loadIntoFree(bd); sfx.cheer(); say(t("opened"));
  });
  const d = card.querySelector("#pDel");
  if (d) d.addEventListener("click", async () => {
    try { await cwDb.doc("wall/" + p.id).delete(); closeModal(); sfx.remove(); } catch(e){ say(t("wallErr")); }
  });
}
