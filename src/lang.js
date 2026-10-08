/* ===================== language + talking ===================== */
let LANG = "en";
function t(key, vars){
  let s = (STR[LANG] && STR[LANG][key] != null) ? STR[LANG][key] : (STR.en[key] != null ? STR.en[key] : key);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
  return s;
}
function applyStatic(root = document){
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  root.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", t(el.dataset.i18nTitle)); });
}
function setLang(l, quiet){
  LANG = l; settings.lang = l; saveSettings();
  document.documentElement.lang = l;
  document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  document.title = t("appName");
  applyStatic();
  $("#langTxt").textContent = l === "ar" ? "English" : "عربي";
  $("#langTxt").className = l === "ar" ? "" : "ar";
  $("#logo").setAttribute("aria-label", t("appName"));
  $("#talkTxt").textContent = t(settings.talk ? "talkOn" : "talkOff");
  $("#soundTxt").textContent = t(settings.sound ? "soundOn" : "soundOff");
  buildSwatches(); buildStyles(); buildShapes(); buildStamps(); buildBoardControls(); buildLogo();
  render();
  emit("lang");
  if (!quiet) say(t("langSay"), {speak: true});
}

/* ---- read aloud (browser speech) ---- */
let voices = [];
const canSpeak = typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
function loadVoices(){ try { voices = speechSynthesis.getVoices() || []; } catch(e){ voices = []; } }
if (canSpeak){ loadVoices(); try { speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch(e){} }
function voiceFor(lang){
  const pref = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(lang));
  return pref.find(v => /female|samantha|zira|google/i.test(v.name)) || pref[0] || null;
}
function speak(text, lang = LANG, opts = {}){
  if (!canSpeak || !settings.talk || !text) return false;
  const v = voiceFor(lang);
  if (lang === "ar" && !v) return false;
  try {
    if (!opts.queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[♥★☆]/g, ""));
    u.lang = lang === "ar" ? "ar-SA" : "en-US";
    if (v) u.voice = v;
    u.rate = opts.rate || (lang === "ar" ? .9 : .95); u.pitch = 1.15;
    speechSynthesis.speak(u);
    return true;
  } catch(e){ return false; }
}
function speakHelper(text){ speak(text, LANG); }
function hasArabic(s){ return /[؀-ۿݐ-ݿࢠ-ࣿ]/.test(s); }
