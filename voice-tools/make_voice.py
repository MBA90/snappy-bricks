#!/usr/bin/env python3
"""Record Bricky's voice.

Reads voice-tools/texts.json (every sentence, button name, letter and word the app may say),
speaks each one with the Supertonic 3 text-to-speech model (Supertone, OpenRAIL-M licence),
checks Arabic clips with the Whisper speech recogniser and retries unclear ones,
and writes docs/voice/en.json and docs/voice/ar.json (MP3 clips, base64).

Clips are kept in voice-tools/cache, so running it again only records new text.
Run by the "Make Bricky's voice" GitHub Action, or on your own computer:
  pip install sherpa-onnx soundfile numpy   (and install ffmpeg)
  python3 voice-tools/make_voice.py --models path/to/models
"""
import argparse, base64, difflib, hashlib, json, os, re, subprocess, sys, tempfile, time, unicodedata
import numpy as np, soundfile as sf, sherpa_onnx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument("--models", default=os.path.join(ROOT, "models"))
ap.add_argument("--no-check", action="store_true", help="skip the Whisper check")
args = ap.parse_args()
TTS_DIR = os.path.join(args.models, "sherpa-onnx-supertonic-3-tts-int8-2026-05-11")
ASR_DIR = os.path.join(args.models, "sherpa-onnx-whisper-small")
CACHE = os.path.join(ROOT, "voice-tools", "cache")
OUT = os.path.join(ROOT, "docs", "voice")
SID, SPEED, STEPS, KBPS = 1, 0.92, 8, 24      # voice 1: a bright, friendly voice; a little slower for children

# ---------- text keys (must match vkey() in src/voice.js) ----------
def vkey(text):
    s = str(text).lower()
    s = "".join(ch if (unicodedata.category(ch)[0] in "LN" or ch.isspace()) else " " for ch in s)
    return re.sub(r"\s+", " ", s.replace("ـ", "")).strip()

EN_LETTERS = dict(zip("abcdefghijklmnopqrstuvwxyz", ["ay", "bee", "see", "dee", "ee", "eff", "jee", "aitch", "eye", "jay", "kay", "ell", "em", "en", "oh", "pee", "cue", "are", "ess", "tee", "you", "vee", "double you", "ex", "why", "zee"]))
AR_LETTERS = {"ا": "ألِف", "أ": "ألِف هَمْزة", "إ": "ألِف هَمْزة تَحْت", "آ": "ألِف مَدّ", "ب": "باء", "ت": "تاء", "ة": "تاء مَرْبوطة", "ث": "ثاء", "ج": "جيم", "ح": "حاء", "خ": "خاء", "د": "دال", "ذ": "ذال", "ر": "راء", "ز": "زاي", "س": "سين", "ش": "شين", "ص": "صاد", "ض": "ضاد", "ط": "طاء", "ظ": "ظاء", "ع": "عَيْن", "غ": "غَيْن", "ف": "فاء", "ق": "قاف", "ك": "كاف", "ل": "لام", "م": "ميم", "ن": "نون", "ه": "هاء", "و": "واو", "ي": "ياء", "ى": "ألِف مَقْصورة", "ء": "هَمْزة", "ئ": "ياء هَمْزة", "ؤ": "واو هَمْزة"}
ONES = ["صفر", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"]
TENS = {20: "عشرون", 30: "ثلاثون", 40: "أربعون", 50: "خمسون", 60: "ستون", 70: "سبعون", 80: "ثمانون", 90: "تسعون"}
def ar_num(n):
    n = int(n)
    if n < 20: return ONES[n]
    if n < 100:
        t, o = n - n % 10, n % 10
        return TENS[t] if o == 0 else f"{ONES[o]} و{TENS[t]}"
    if n == 100: return "مئة"
    if n < 1000:
        h = {1: "مئة", 2: "مئتان"}.get(n // 100, ONES[n // 100] + " مئة"); r = n % 100
        return h if r == 0 else f"{h} و{ar_num(r)}"
    return str(n)
def synth_text(text, lang):
    k = vkey(text)
    if lang == "en" and len(k) == 1 and k in EN_LETTERS: return EN_LETTERS[k]
    if lang == "ar" and len(k) == 1 and k in AR_LETTERS: return AR_LETTERS[k]
    s = str(text).translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
    s = re.sub(r"(\d)\s*[×x]\s*(\d)", r"\1 في \2" if lang == "ar" else r"\1 by \2", s)
    s = s.replace("×", " في " if lang == "ar" else " by ")
    s = re.sub(r"(\d)\s*[–-]\s*(\d)", r"\1 إلى \2" if lang == "ar" else r"\1 to \2", s)
    if lang == "ar": s = re.sub(r"\d+", lambda m: ar_num(m.group()), s)
    s = "".join(ch if (unicodedata.category(ch)[0] in "LNM" or ch.isspace() or ch in ".,!?؟،:;'’-") else " " for ch in s)
    s = re.sub(r"\s+", " ", s).strip(" -:;")
    if lang == "en" and s.isupper() and len(s) > 1: s = s.capitalize()
    return s
def clip_path(lang, syn):
    h = hashlib.sha1(f"{lang}|{syn}|{SID}|{SPEED}|{STEPS}|{KBPS}".encode()).hexdigest()[:16]
    return os.path.join(CACHE, f"{lang}_{h}.mp3")

# ---------- models ----------
def load_tts():
    d = TTS_DIR
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
            duration_predictor=f"{d}/duration_predictor.int8.onnx", text_encoder=f"{d}/text_encoder.int8.onnx",
            vector_estimator=f"{d}/vector_estimator.int8.onnx", vocoder=f"{d}/vocoder.int8.onnx",
            tts_json=f"{d}/tts.json", unicode_indexer=f"{d}/unicode_indexer.bin", voice_style=f"{d}/voice.bin"),
        num_threads=os.cpu_count() or 2, provider="cpu"), max_num_sentences=1)
    return sherpa_onnx.OfflineTts(cfg)
def say(tts, text, lang, speed):
    g = sherpa_onnx.GenerationConfig(); g.sid = SID; g.speed = speed; g.num_steps = STEPS; g.extra = {"lang": lang}
    a = tts.generate(text, g)
    return np.asarray(a.samples, np.float32), a.sample_rate
_asr = {}
def heard(x, sr, lang):
    if lang not in _asr:
        d = ASR_DIR
        _asr[lang] = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{d}/small-encoder.int8.onnx", decoder=f"{d}/small-decoder.int8.onnx",
            tokens=f"{d}/small-tokens.txt", language=lang, task="transcribe", num_threads=os.cpu_count() or 2)
    r = _asr[lang]; s = r.create_stream()
    s.accept_waveform(sr, np.concatenate([np.zeros(sr // 2, np.float32), x, np.zeros(sr // 2, np.float32)])); r.decode_stream(s)
    return s.result.text.strip()
def plain_ar(s):
    s = re.sub(r"[ً-ْٰـ]", "", s)
    for a, b in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ة", "ه"), ("ى", "ي")): s = s.replace(a, b)
    return re.sub(r"[^\w]", "", s)
def miss(target, got, lang):
    a, b = (plain_ar(target), plain_ar(got)) if lang == "ar" else (vkey(target).replace(" ", ""), vkey(got).replace(" ", ""))
    return 1 - difflib.SequenceMatcher(None, a, b).ratio()
def trim(x, sr):
    env = np.abs(x); th = max(0.01, float(env.max()) * 0.03); idx = np.where(env > th)[0]
    if len(idx) == 0: return x
    return x[max(0, idx[0] - int(sr * .04)): min(len(x), idx[-1] + int(sr * .08))]

# ---------- main ----------
def main():
    os.makedirs(CACHE, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    texts = json.load(open(os.path.join(ROOT, "voice-tools", "texts.json"), encoding="utf-8"))
    tts = None
    for lang in ("en", "ar"):
        items = {}
        for text in texts[lang]:
            k = vkey(text)
            if k and k not in items: items[k] = synth_text(text, lang)
        todo = [(k, s) for k, s in items.items() if not os.path.exists(clip_path(lang, s))]
        print(f"{lang}: {len(items)} clips, {len(todo)} to record", flush=True)
        t0 = time.time()
        for i, (k, syn) in enumerate(todo):
            if tts is None: tts = load_tts()
            short = len(vkey(syn).replace(" ", "")) <= 4
            check = not args.no_check and (lang == "ar" or short)
            best = None
            for sp in (SPEED, SPEED - 0.04, SPEED + 0.04):
                x, sr = say(tts, syn, lang, sp); x = trim(x, sr)
                score = miss(syn, heard(x, sr, lang), lang) if check else 0.0
                if best is None or score < best[0]: best = (score, x, sr)
                if score <= (0.34 if short else 0.2): break
            _, x, sr = best
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f: wav = f.name
            sf.write(wav, x, sr)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", "22050", "-codec:a", "libmp3lame", "-b:a", f"{KBPS}k", clip_path(lang, syn)], check=True)
            os.remove(wav)
            if (i + 1) % 25 == 0: print(f"  {lang} {i + 1}/{len(todo)}  {round(time.time() - t0)}s", flush=True)
        clips = {k: base64.b64encode(open(clip_path(lang, s), "rb").read()).decode() for k, s in items.items()}
        data = {"v": 1, "voice": "Bricky (Supertonic 3 by Supertone, OpenRAIL-M)", "clips": clips}
        with open(os.path.join(OUT, f"{lang}.json"), "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print(f"{lang}: wrote docs/voice/{lang}.json with {len(clips)} clips", flush=True)

if __name__ == "__main__":
    main()
