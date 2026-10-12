# Players online now

A tiny counter that powers the "N playing now" chip on the home screen. Plain Node.js, no packages, no database.

**How it counts:** every open copy of the game sends a random, made-up id every 25 seconds (and a goodbye when the
game is closed or put away). Anyone heard from in the last 70 seconds counts as playing. The id is new on every visit,
so nothing about a child is sent or kept, and the counter forgets everything when it restarts. One internet connection
can add at most 20 players, so nobody can pump the number up.

Until this counter is running, the chip simply stays hidden; the rest of the site is unaffected.

## Turn it on (DigitalOcean App Platform)

The website is already a Static Site in the `snappy-bricks` app. Add this counter to the same app:

1. Open the app in DigitalOcean and click **Add components → Create resources from source code**.
2. Pick **GitHub**, repository **MBA90/snappy-bricks**, branch **main**, and set **Source directory** to `/server`.
3. It should detect a **Web Service** (Node.js). Check:
   - **Run command:** `npm start`
   - **HTTP port:** `8080`
   - **HTTP route:** `/api`
   - **Instance size:** the smallest one, **1 instance** (the count lives in memory, so it must be exactly one).
4. Click **Create resources**. Within a few minutes the home screen at https://snappy-bricks.com shows the chip.

The smallest web service costs about $5 a month (check the price on that screen). The static site stays free.

Quick check once it's live: open https://snappy-bricks.com/api/presence; it should say `{"online":N}`.

## Try it locally

```bash
node server.js          # listens on port 8080
node test.js            # runs the counter checks
```
