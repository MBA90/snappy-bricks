/* ===================== players online now ===================== */
// Each open copy of the game sends a random, made-up id to a tiny counter (server/ in the repo) every 25 seconds
// and shows how many are playing. Nothing about the child is sent. With no counter reachable (offline, a host
// without it) the chip simply stays hidden.
addStrings({
  playingNow: ["{n} playing now", "{n} يلعبون الآن"],
  playingOne: ["{n} playing now", "{n} يلعب الآن"],
});
(function players(){
  const chip = $("#onlineChip"), num = $("#onlineNum");
  if (!chip || !location.protocol.startsWith("http")) return;
  const host = location.hostname;
  const URL_ = /(^|\.)snappy-bricks\.com$|\.ondigitalocean\.app$/.test(host) ? "/api/presence" : "https://snappy-bricks.com/api/presence";
  const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join("");
  const EVERY = 25000, RETRY = 120000;
  let timer = 0, last = 0;
  const show = n => {
    last = n;
    num.textContent = t(n === 1 ? "playingOne" : "playingNow", {n});
    chip.hidden = false;
  };
  const beat = () => {
    clearTimeout(timer);
    if (document.hidden) return;
    fetch(URL_, {method: "POST", body: JSON.stringify({id}), cache: "no-store"})
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (!d || !Number.isFinite(d.online)) throw 0;
        show(Math.max(1, d.online));   // you're always playing, even before the counter has heard from you
        timer = setTimeout(beat, EVERY);
      })
      .catch(() => { chip.hidden = true; timer = setTimeout(beat, RETRY); });
  };
  // put away or closed: say goodbye so the number drops at once; back again: say hello
  const bye = () => { clearTimeout(timer); fetch(URL_, {method: "POST", body: JSON.stringify({id, bye: true}), keepalive: true}).catch(() => {}); };
  document.addEventListener("visibilitychange", () => { if (document.hidden) bye(); else beat(); });
  window.addEventListener("pagehide", bye);
  on("lang", () => { if (!chip.hidden) show(last); });
  beat();
})();
