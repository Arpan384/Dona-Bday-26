# Dona-Bday-26

A birthday site told in three parts, styled as movie posters. Each part unlocks at a set time, always in India time.

| Part | Unlocks | What it shows |
|---|---|---|
| I · Midnight | 11:55 PM, the night before | A message with a scratch-to-reveal photo and song 1 |
| II · Eight Years | 11:00 AM on the day | A film of 2017–2026 photos, timed to song 2 |
| III · Goodnight | 11:30 PM on the day | A text reel with a polaroid and song 3 |

## To do before the day

1. **`config.js`**: set `birthday`, then fill in every line marked ✏️ (your messages, the reel lines and the optional year subtitles).
2. **Songs**: put `part1.mp3`, `part2.mp3` and `part3.mp3` in `assets/music/`. To start a song partway through, set `songStart` (for example `"0:45"`) next to it in `config.js`. The song starts there each time she opens that part, and when it loops it starts again from 0:00. Part II reads the song's real length and spreads the photos across it.
3. **Preview**: open `/?preview=dona-test` to unlock everything. Add `&now=2026-12-01T10:59` to see how the page looks at a given time. Change `previewKey` in `config.js` to something only you know.
4. **Publish**: push to GitHub, then go to Settings → Pages → Deploy from branch → `main` / root.

## Things to know

- The time locks only run in the browser. Anyone who reads the page's source could see the content early. The page is also hidden from search engines (`noindex`).
- The photos are resized, and their location (GPS) data was removed before they were added here.
- Browsers only play music after a tap. Tapping a poster counts, so the song starts when she opens a part.

## Media

- **Clips** for Part II live in `assets/clips/`: web-ready, muted, 720p copies of `assets/videos/<year>/`. In `config.js` each clip has `from`/`to` (seconds) to choose the part that plays.
- **Archive** videos live in `assets/archive/`: 720p copies of `assets/videos/ashes/`, with a thumbnail for each.
- **Lyrics** are in `assets/music/part2-lyrics.js`, as `[mm:ss.xx] line`. With `?preview=…`, the film shows the song's current time so you can adjust them.
- **Raw files:** `assets/videos/` is git-ignored, so only the web copies go to GitHub. The raw photos in `assets/photos/extra` and `other` are already web-ready in `assets/photos/new/` and can be removed from the repo.

## Trimmed clips & originals

- `assets/clips/` now holds **trimmed** clips: just the part that plays, plus ½ s either side. In `config.js` each clip's `from`/`to` refers to the trimmed file, and `orig` notes the range in the original.
- The untrimmed originals are kept in `assets/clips-full/`, the original `part1.mp3` is in `assets/music-originals/`, and full-size photos are in `assets/photos-full/` (the site uses lighter 1280px copies). All three folders are git-ignored, so they stay on your computer and are never deployed.
- To use a different moment from a clip, re-trim it from `assets/clips-full/` with the new range (or ask Claude to).
