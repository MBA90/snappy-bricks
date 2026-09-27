#!/usr/bin/env python3
"""Bundle src/ into one HTML page.
   dist/snappy-bricks.html  -> artifact body (no doctype; the Artifact tool wraps it)
   dist/standalone.html     -> full document for hosting anywhere
   docs/index.html          -> the live website (GitHub Pages)
"""
import os, sys, re
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
JS_ORDER = ["data.js", "data2.js", "engine.js", "lang.js", "ui.js", "name.js", "games.js", "extras.js", "classwall.js", "boot.js"]
FONTS = "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Baloo+Bhaijaan+2:wght@500;600;700;800&display=swap"

def read(name):
    p = os.path.join(SRC, name)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""

def bundle(edition="public"):
    css = read("styles.css") + "\n" + read("styles2.css")
    markup = read("markup.html")
    for part in ["HEADER_EXTRA", "MODEBAR", "GAMEPANEL", "TOOLBAR_EXTRA", "SIDE_EXTRA"]:
        markup = markup.replace(f"<!--{part}-->", read(f"part_{part.lower()}.html"))
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
    alljs = "".join(read(f) for f in JS_ORDER) + read("markup.html") + "".join(read(f"part_{p}.html") for p in ["header_extra","modebar","gamepanel","toolbar_extra","side_extra"])
    keys = set(re.findall(r'\bt\("([A-Za-z0-9_]+)"', alljs)) | set(re.findall(r'data-i18n(?:-ph|-aria|-title)?="([A-Za-z0-9_]+)"', alljs))
    print("bytes:", len(pub), "| keys used:", len(keys))
    open(os.path.join(ROOT, "dist", "keys.txt"), "w").write("\n".join(sorted(keys)))
