// node test.js : checks the counter counts, forgets, says goodbye and limits one home
const assert = require("assert");
const {server, seen} = require("./server");

server.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, msg, ip = "1.1.1.1") => fetch(base + path, {method: "POST", headers: {"Content-Type": "text/plain", "DO-Connecting-IP": ip}, body: JSON.stringify(msg)}).then(r => r.json());
  try {
    assert.deepStrictEqual(await fetch(base + "/presence").then(r => r.json()), {online: 0});
    assert.strictEqual((await post("/presence", {id: "aaaaaaaa1"})).online, 1);
    assert.strictEqual((await post("/api/presence", {id: "bbbbbbbb2"}, "2.2.2.2")).online, 2);
    assert.strictEqual((await post("/presence", {id: "aaaaaaaa1"})).online, 2, "same player twice counts once");
    assert.strictEqual((await post("/presence", {id: "<bad>"})).online, 2, "bad id ignored");
    assert.strictEqual((await post("/presence", {id: "bbbbbbbb2", bye: true})).online, 1, "goodbye removes");
    for (let i = 0; i < 40; i++) await post("/presence", {id: "flood" + String(i).padStart(4, "0")}, "9.9.9.9");
    assert.strictEqual((await post("/presence", {})).online, 21, "one home adds at most 20");
    seen.get("aaaaaaaa1").at -= 71000;
    assert.strictEqual((await fetch(base + "/presence").then(r => r.json())).online, 20, "quiet players drop off");
    const r = await fetch(base + "/presence", {method: "OPTIONS"});
    assert.strictEqual(r.headers.get("access-control-allow-origin"), "*");
    console.log("presence server: all checks passed");
  } catch(e){ console.error(e); process.exitCode = 1; }
  server.close();
});
