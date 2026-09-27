/* ===================== Bricky's recorded voice =====================
   Clips live in voice/en.json and voice/ar.json: {"clips": {"<key>": "<base64 mp3>"}}.
   A clip is found by a normalised key made from the text, so any text we recorded
   (a message, a button name, a letter, a word) plays in Bricky's voice.
   Anything we did not record falls back to the device voice. */
const VOICE_V = "1";   // bump when the clips are regenerated
const VOICE = {clips: {en: null, ar: null}, loading: {}, audio: null, urls: new Map(), token: 0};
function vkey(text){
  return String(text).toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/ـ/g, "")
    .replace(/\s+/g, " ").trim();
}
function loadVoice(lang){
  if (VOICE.clips[lang]) return Promise.resolve(VOICE.clips[lang]);
  if (VOICE.loading[lang]) return VOICE.loading[lang];
  VOICE.loading[lang] = fetch(`voice/${lang}.json?v=${VOICE_V}`)
    .then(r => r.ok ? r.json() : null)
    .then(j => (VOICE.clips[lang] = (j && j.clips) || {}))
    .catch(() => (VOICE.clips[lang] = {}));
  return VOICE.loading[lang];
}
function hasVoicePack(lang){ const c = VOICE.clips[lang]; return !!c && Object.keys(c).length > 0; }
function clipUrl(lang, key){
  const id = lang + ":" + key;
  if (VOICE.urls.has(id)) return VOICE.urls.get(id);
  const b64 = VOICE.clips[lang][key]; const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], {type: "audio/mpeg"}));
  VOICE.urls.set(id, url);
  return url;
}
// whole text first, then sentence by sentence
function clipKeys(text, lang){
  const c = VOICE.clips[lang]; if (!c) return null;
  const whole = vkey(text);
  if (!whole) return null;
  if (c[whole]) return [whole];
  const parts = String(text).split(/(?<=[.!?؟…:])\s+/).map(vkey).filter(Boolean);
  if (parts.length > 1 && parts.every(p => c[p])) return parts;
  return null;
}
function stopClips(){
  VOICE.token++;
  if (VOICE.audio){ try { VOICE.audio.pause(); } catch(e){} }
}
function playClips(lang, keys, onFail){
  stopClips();
  const my = VOICE.token;
  if (!VOICE.audio){ VOICE.audio = new Audio(); VOICE.audio.preload = "auto"; }
  const a = VOICE.audio; let i = 0;
  const next = () => {
    if (my !== VOICE.token || i >= keys.length) return;
    a.src = clipUrl(lang, keys[i++]);
    a.onended = () => setTimeout(next, 120);
    const p = a.play();
    if (p && p.catch) p.catch(() => { if (my === VOICE.token && i === 1 && onFail) onFail(); });
  };
  next();
}
const deviceSpeak = speak;
speak = function(text, lang = LANG, opts = {}){
  if (!settings.talk || !text) return false;
  lang = lang === "ar" ? "ar" : "en";
  const go = () => {
    const keys = clipKeys(text, lang) || (opts.fallback ? clipKeys(opts.fallback, lang) : null);
    if (keys){ try { speechSynthesis.cancel(); } catch(e){} playClips(lang, keys, () => deviceSpeak(text, lang, opts)); return true; }
    stopClips();
    return deviceSpeak(text, lang, opts);
  };
  if (VOICE.clips[lang]) return go();
  // the pack is still on its way: wait a moment rather than switching voices
  const my = ++VOICE.token;
  let done = false;
  loadVoice(lang).then(() => { if (!done && my === VOICE.token){ done = true; go(); } });
  setTimeout(() => { if (!done && my === VOICE.token){ done = true; deviceSpeak(text, lang, opts); } }, 1500);
  return true;
};
function warmVoice(){ if (settings.talk){ loadVoice(LANG); setTimeout(() => loadVoice(LANG === "ar" ? "en" : "ar"), 4000); } }
on("boot", () => setTimeout(warmVoice, 800));
on("lang", () => loadVoice(LANG));
