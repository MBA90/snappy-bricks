#!/usr/bin/env python3
"""Bundle src/ into one HTML page.
   dist/snappy-bricks.html  -> artifact body (no doctype; the Artifact tool wraps it)
   dist/standalone.html     -> full document for hosting anywhere
   docs/index.html          -> the live website (GitHub Pages)
"""
import os, sys, re
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
JS_ORDER = ["turn.js", "data.js", "data2.js", "engine.js", "lang.js", "ui.js", "name.js", "games.js", "extras.js", "play.js", "classwall.js", "voice.js", "ux.js", "mobile.js", "photo.js", "map.js", "boot.js"]
FONTS = "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Baloo+Bhaijaan+2:wght@500;600;700;800&display=swap"

def read(name):
    p = os.path.join(SRC, name)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""

# ---- always sideways (see src/turn.js): every size @media rule also matches the same sizes turned upright ----
SIZE_FEATURE = re.compile(r"width|height|aspect-ratio|orientation")

def split_queries(q):
    out, d, cur = [], 0, ""
    for ch in q:
        if ch == "(": d += 1
        elif ch == ")": d -= 1
        if ch == "," and d == 0: out.append(cur); cur = ""
        else: cur += ch
    out.append(cur)
    return [x.strip() for x in out if x.strip()]

def swap_query(q):
    def f(m):
        ap, af, a, b, p, w = m.groups()
        if af == "aspect-ratio":
            return {"min-": "max-", "max-": "min-"}.get(ap or "", "") + f"aspect-ratio:{b}/{a}"
        if w: return (p or "") + ("height" if w == "width" else "width")
        return "orientation:portrait"
    return re.sub(r"(min-|max-)?(width|height|aspect-ratio)\s*:\s*([0-9.]+)\s*/\s*([0-9.]+)|(min-|max-)?(width|height)(?=\s*:)|orientation\s*:\s*landscape", f, q)

def turn_query(q):
    out = []
    for s in split_queries(q):
        if not SIZE_FEATURE.search(s) or re.search(r"orientation\s*:\s*portrait", s):
            out.append(s); continue
        out += [s + " and (orientation:landscape)", swap_query(s) + " and (orientation:portrait) and (pointer:coarse)"]
    return ", ".join(out)

def turn_css(css):
    css = re.sub(r"@media\s*([^{]*)\{", lambda m: "@media " + turn_query(m.group(1)) + "{", css)
    # screen units and the notch's safe areas follow the turn too (set in styles8.css)
    css = re.sub(r"(?<![\w.-])([0-9]*\.?[0-9]+)(vw|vh|dvh)\b", lambda m: f"calc({m.group(1)} * var(--u-{m.group(2)}))", css)
    css = re.sub(r"env\(safe-area-inset-(top|right|bottom|left)", r"var(--sa-\1", css)
    return css

# written after turn_css() so its own screen units stay as they are
TURN_CSS = """
:root{--u-vw:1vw;--u-vh:1vh;--u-dvh:1vh;
  --sa-top:env(safe-area-inset-top, 0px);--sa-right:env(safe-area-inset-right, 0px);--sa-bottom:env(safe-area-inset-bottom, 0px);--sa-left:env(safe-area-inset-left, 0px)}
@supports (height:1dvh){:root{--u-dvh:1dvh}}
/* held upright, the page turns a quarter turn clockwise to fill the screen sideways (--rw/--rh: the real screen, from turn.js) */
@media (orientation:portrait) and (pointer:coarse){
  :root{--u-vw:calc(var(--rh, 100vh) / 100);--u-vh:calc(var(--rw, 100vw) / 100);--u-dvh:calc(var(--rw, 100vw) / 100);
    --sa-left:env(safe-area-inset-top, 0px);--sa-right:env(safe-area-inset-bottom, 0px);--sa-top:env(safe-area-inset-right, 0px);--sa-bottom:env(safe-area-inset-left, 0px)}
  html{height:100%;overflow:hidden}
  body,body[data-screen]{
    position:fixed;top:0;left:0;margin:0;overflow:hidden;
    width:var(--rh, 100vh);height:var(--rw, 100vw);
    transform:translateX(var(--rw, 100vw)) rotate(90deg);transform-origin:0 0;
  }
  .app{height:100%;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain}
}
"""

def bundle(edition="public"):
    css = read("styles.css") + "\n" + read("styles2.css") + "\n" + read("styles3.css") + "\n" + read("styles4.css") + "\n" + read("styles5.css") + "\n" + read("styles6.css") + "\n" + read("styles7.css") + "\n" + read("styles8.css")
    css = turn_css(css) + TURN_CSS
    markup = read("markup.html")
    js = "\n".join(read(f) for f in JS_ORDER if f != "classwall.js" or edition == "class")
    title = "Snappy Bricks Classroom" if edition == "class" else "Snappy Bricks"
    head = (f'<title>{title}</title>\n'
            f'<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            f'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link href="{FONTS}" rel="stylesheet">\n')
    flag = f'const EDITION = "{edition}";\n'
    body = f"{head}<style>\n{css}\n</style>\n{markup}\n<script>\n(() => {{\n\"use strict\";\n{flag}{js}\n}})();\n</script>\n"
    return body

def standalone(body):
    extra = ('<meta name="theme-color" content="#5CC6FF">\n'
             '<link rel="manifest" href="manifest.webmanifest">\n'
             '<link rel="icon" href="icon-192.png">\n'
             '<link rel="apple-touch-icon" href="icon-192.png">\n'
             '<meta name="apple-mobile-web-app-capable" content="yes">\n'
             '<meta name="mobile-web-app-capable" content="yes">\n'
             '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
             '<meta name="apple-mobile-web-app-title" content="Snappy Bricks">\n'
             '<meta name="description" content="A colorful brick-building website for kids: snap bricks, play word and puzzle games, and build your name in English or Arabic.">\n')
    sw = ("<script>if('serviceWorker' in navigator && location.protocol.startsWith('http')){"
          "window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}</script>\n")
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            + extra + '</head>\n<body>\n' + body + sw + '</body>\n</html>\n')

if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    pub = bundle("public")
    open(os.path.join(ROOT, "dist", "snappy-bricks.html"), "w", encoding="utf-8").write(pub)
    if read("classwall.js"):
        open(os.path.join(ROOT, "dist", "snappy-class.html"), "w", encoding="utf-8").write(bundle("class"))
    site = standalone(bundle("standalone"))
    open(os.path.join(ROOT, "dist", "standalone.html"), "w", encoding="utf-8").write(site)
    # the live website (GitHub Pages serves the docs/ folder)
    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
    open(os.path.join(ROOT, "docs", "index.html"), "w", encoding="utf-8").write(site)
    # quick check for missing translation keys
    alljs = "".join(read(f) for f in JS_ORDER) + read("markup.html")
    keys = set(re.findall(r'\bt\("([A-Za-z0-9_]+)"', alljs)) | set(re.findall(r'data-i18n(?:-ph|-aria|-title)?="([A-Za-z0-9_]+)"', alljs))
    print("bytes:", len(pub), "| keys used:", len(keys))
    open(os.path.join(ROOT, "dist", "keys.txt"), "w").write("\n".join(sorted(keys)))
