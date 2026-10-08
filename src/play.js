/* ===================== Bricky plays on your build ===================== */
// Press Play and Bricky drops onto the board, walks along the bricks, hops up steps and turns at walls,
// collecting the stars on top of the build. Only Bricky and the stars move (one transform each a frame),
// and nothing runs until Play is pressed. Kids can keep building while he plays: he reads the board every frame.
let play = null;
function solidAt(x, y){
  if (x < 0 || x >= B.cols || y >= B.rows) return true;     // the board's sides and bottom are walls and floor
  if (y < 0) return false;
  return grid[y][x].length > 0;
}
function hits(px, py, s){
  const e = .001;
  const x0 = Math.floor(px + e), x1 = Math.floor(px + s - e), y0 = Math.floor(py + e), y1 = Math.floor(py + s - e);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (solidAt(x, y)) return true;
  return false;
}
// the top of the build in a column (or the floor), where a star can sit
function surfaceAt(x, s){
  for (let y = 0; y < B.rows; y++) for (let i = 0; i < s && x + i < B.cols; i++) if (grid[y][x + i].length) return y;
  return B.rows;
}
function startPlay(){
  if (play){ stopPlay(); return; }
  if (!B.bricks.length){ sfx.nope(); say(t("playEmpty")); return; }
  const s = clamp(Math.round(B.cols / 12), 2, 4);           // Bricky's size in studs: bigger on bigger boards
  const el = document.createElement("div"); el.className = "player";
  const art = $("#bricky").cloneNode(true); art.removeAttribute("id"); el.appendChild(art);
  plate.appendChild(el);
  // three stars on top of the build, spread across the board
  const cols = [];
  for (let x = 0; x + s <= B.cols; x++) if (surfaceAt(x, s) < B.rows) cols.push(x);
  const picks = [];
  for (const x of cols.sort(() => Math.random() - .5)) if (picks.every(p => Math.abs(p - x) >= s * 2) && picks.length < 3) picks.push(x);
  while (picks.length < 3){ const x = Math.floor(Math.random() * (B.cols - s)); if (picks.every(p => Math.abs(p - x) >= s)) picks.push(x); else if (Math.random() < .1) picks.push(x); }
  const stars = picks.map(x => {
    const y = Math.max(0, surfaceAt(x, s) - s), st = document.createElement("div");
    st.className = "pstar"; st.textContent = "⭐"; plate.appendChild(st);
    return {x, y, el: st, got: false};
  });
  play = {el, s, x: 1, y: -s, vx: 0, vy: 0, dir: 1, ground: false, stars, got: 0, t0: performance.now(), last: performance.now(),
          cols: B.cols, rows: B.rows, done: 0, raf: 0};
  $("#playBtn").setAttribute("aria-pressed", "true");
  sfx.whoosh(); say(t("playStart"));
  play.raf = requestAnimationFrame(stepPlay);
}
function stopPlay(quiet){
  if (!play) return;
  cancelAnimationFrame(play.raf);
  play.el.remove(); play.stars.forEach(st => st.el.remove());
  play = null;
  $("#playBtn").setAttribute("aria-pressed", "false");
  if (!quiet) sfx.click();
}
function stepPlay(now){
  const p = play; if (!p) return;
  // leaving the studio or changing the board size ends the game
  if ($("#studioScreen").hidden || B.cols !== p.cols || B.rows !== p.rows){ stopPlay(true); return; }
  const dt = Math.min(.05, (now - p.last) / 1000); p.last = now;
  const s = p.s, G = 38, speed = 2.2 + s * .6, jumpH = s + 1.2, jumpV = Math.sqrt(2 * G * jumpH);
  // a brick dropped on top of Bricky pushes him up out of the way
  for (let k = 0; k < 8 && hits(p.x, p.y, s); k++) p.y -= 1;
  if (p.done){
    // all the stars found: little happy hops on the spot, then goodbye
    if (p.ground){ p.vy = -jumpV * .6; p.ground = false; }
    if (now - p.done > 2600){ stopPlay(true); return; }
  } else {
    // walk; at a step he can climb he hops, at a high wall he turns round
    const nx = p.x + p.dir * speed * dt;
    if (hits(nx, p.y, s)){
      let climb = 0;
      for (let h = 1; h <= Math.ceil(jumpH); h++) if (!hits(nx, p.y - h, s)){ climb = h; break; }
      if (p.ground && climb) { p.vy = -Math.sqrt(2 * G * (climb + .4)); p.ground = false; }
      else if (p.ground || !climb) p.dir = -p.dir;
    } else p.x = nx;
    if (p.ground && Math.random() < dt * .35){ p.vy = -jumpV * .8; p.ground = false; }   // now and then a happy hop
  }
  // fall, and land on whatever is below
  p.vy = Math.min(p.vy + G * dt, 30);
  const ny = p.y + p.vy * dt;
  if (hits(p.x, ny, s)){
    if (p.vy > 0){ p.y = Math.floor(ny + s) - s; let k = 0; while (hits(p.x, p.y, s) && k++ < 4) p.y -= 1; p.ground = true; }
    else p.y = Math.ceil(ny);
    p.vy = 0;
  } else { p.y = ny; p.ground = false; }
  // stars
  for (const st of p.stars){
    if (st.got) continue;
    if (Math.abs(st.x - p.x) < s * .8 && Math.abs(st.y - p.y) < s * .8){
      st.got = true; p.got++; st.el.classList.add("got"); sfx.paint();
      if (p.got === p.stars.length){ p.done = now; sfx.cheer(); confetti(); say(t("playWin")); }
    }
  }
  if (!p.done && now - p.t0 > 40000){ say(t("playBye")); stopPlay(true); return; }
  // draw: one transform for Bricky, and the stars follow the board's stud size
  const c = cell, tilt = p.ground ? Math.sin(now / 90) * 6 : -8 * p.dir;
  p.el.style.width = p.el.style.height = s * c + "px";
  p.el.style.transform = `translate(${p.x * c}px, ${p.y * c}px) scaleX(${p.dir}) rotate(${tilt}deg)`;
  for (const st of p.stars){
    if (st._c !== c){ st._c = c; st.el.style.cssText = `width:${s * c}px;height:${s * c}px;font-size:${s * c * .8}px;transform:translate(${st.x * c}px, ${st.y * c}px)`; }
  }
  p.raf = requestAnimationFrame(stepPlay);
}
$("#playBtn").addEventListener("click", () => startPlay());
