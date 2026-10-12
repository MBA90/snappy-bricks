/* Snappy Bricks: "players online now" counter.
   No database, no accounts, no personal data: each open copy of the game sends a random id
   every 25 seconds; anyone heard from in the last 70 seconds counts as playing. */
const http = require("http");

const PORT = process.env.PORT || 8080;
const ALIVE_MS = 70 * 1000;   // a little more than two missed heartbeats
const MAX_PER_IP = 20;        // one home can't pump the number up
const MAX_IDS = 50000;

const seen = new Map();       // id -> {at, ip}
const ID = /^[a-z0-9]{8,32}$/i;

function sweep(now){
  for (const [id, s] of seen) if (now - s.at > ALIVE_MS) seen.delete(id);
}
setInterval(() => sweep(Date.now()), 10 * 1000).unref();

function clientIp(req){
  return String(req.headers["do-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
}

function send(res, code, body){
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body == null ? "" : JSON.stringify(body));
}

function heartbeat(msg, ip, now){
  const id = msg && typeof msg.id === "string" && ID.test(msg.id) ? msg.id : null;
  if (!id) return false;
  if (msg.bye){ seen.delete(id); return true; }
  if (!seen.has(id)){
    if (seen.size >= MAX_IDS) return false;
    let mine = 0;
    for (const s of seen.values()) if (s.ip === ip && now - s.at <= ALIVE_MS && ++mine >= MAX_PER_IP) return false;
  }
  seen.set(id, {at: now, ip});
  return true;
}

function online(now){
  let n = 0;
  for (const s of seen.values()) if (now - s.at <= ALIVE_MS) n++;
  return n;
}

const server = http.createServer((req, res) => {
  const path = req.url.split("?")[0].replace(/\/+$/, "");
  if (req.method === "OPTIONS") return send(res, 204);
  // App Platform strips the /api route before it reaches us; locally both forms work
  if (!/(^|\/)presence$/.test(path)){
    if (req.method === "GET" && (path === "" || path === "/api")) return send(res, 200, {ok: true});
    return send(res, 404, {error: "not found"});
  }
  if (req.method === "GET") return send(res, 200, {online: online(Date.now())});
  if (req.method !== "POST") return send(res, 405, {error: "method"});
  let body = "";
  req.on("data", c => { body += c; if (body.length > 256) req.destroy(); });
  req.on("end", () => {
    let msg = null;
    try { msg = JSON.parse(body); } catch(e){}
    const now = Date.now();
    heartbeat(msg, clientIp(req), now);
    send(res, 200, {online: online(now)});
  });
});

if (require.main === module) server.listen(PORT, () => console.log(`presence listening on ${PORT}`));
module.exports = {server, seen};
