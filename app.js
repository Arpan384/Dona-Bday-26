(() => {
  "use strict";
  const C = window.BDAY;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------------- time & locks ---------------- */
  const params = new URLSearchParams(location.search);
  const PREVIEW = params.get("preview") === C.previewKey;
  const fakeNow = PREVIEW && params.get("now");
  const offset = fakeNow ? new Date(fakeNow + ":00" + C.timezone).getTime() - Date.now() : 0;
  const now = () => (PREVIEW && !fakeNow ? Infinity : Date.now() + offset);

  const unlockAt = (p) => {
    const midnight = new Date(C.birthday + "T00:00:00" + C.timezone).getTime();
    const [h, m] = p.unlock.time.split(":").map(Number);
    return midnight + p.unlock.dayOffset * 864e5 + (h * 60 + m) * 6e4;
  };
  const isOpen = (i) => now() >= unlockAt(C.parts[i]);

  const fmt = (ms, opts) => new Intl.DateTimeFormat("en-IN", { timeZone: C.timezoneName, ...opts }).format(new Date(ms));
  const pad = (n) => String(n).padStart(2, "0");
  const countdown = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
  };

  /* ---------------- audio ---------------- */
  let audio = null, fadeTimer = null;
  const musicBtn = el("button", "ghost music-btn", "♪ tap for music");
  Object.assign(musicBtn.style, { position: "fixed", right: "16px", top: "16px", zIndex: 35, display: "none", background: "rgba(13,10,11,.6)" });
  document.body.appendChild(musicBtn);
  musicBtn.addEventListener("click", () => { if (audio) audio.play().then(() => (musicBtn.style.display = "none")).catch(() => {}); });

  function fadeTo(a, target, ms, done) {
    clearInterval(fadeTimer);
    const start = a.volume, t0 = performance.now();
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      try { a.volume = start + (target - start) * k; } catch (e) {}
      if (k >= 1) { clearInterval(fadeTimer); done && done(); }
    }, 40);
  }
  // "1:23", "83" or 83 -> seconds
  const toSec = (v) => {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return Math.max(0, v);
    return Math.max(0, String(v).split(":").reduce((acc, x) => acc * 60 + (parseFloat(x) || 0), 0));
  };
  const songStart = (i) => toSec(C.parts[i].songStart);

  // Songs are created once and reused, so a part's song is already buffered when she opens it.
  const songCache = {};
  function getSong(src) {
    if (!songCache[src]) { const a = new Audio(); a.preload = "auto"; a.src = src; songCache[src] = a; }
    unpark(songCache[src]);
    return songCache[src];
  }
  // "Parking" stops a song from downloading (so the film's photos and clips get the whole connection)
  // and remembers where it was; unparking picks it back up.
  function park(a) {
    if (!a || a._parked || !a.src) return;
    a._parked = { src: a.getAttribute("src"), at: a.currentTime || 0 };
    a.pause(); a.removeAttribute("src"); a.load();
  }
  function unpark(a) {
    if (!a || !a._parked) return;
    const { src, at } = a._parked; a._parked = null;
    a.src = src;
    if (at) a.addEventListener("loadedmetadata", () => { try { a.currentTime = at; } catch (e) {} }, { once: true });
  }
  // start downloading the songs of parts that are open (or opening within 30 min) — only while she's on the home screen
  function warmSongs() {
    if (typeof current !== "undefined" && current >= 0) return;
    C.parts.forEach((p, i) => {
      if (!p.song || now() < unlockAt(p) - 30 * 60e3) return;
      if (i === 1) preloadFilm();          // Part II: the whole film (song, photos, clips) is downloaded ahead
      else getSong(p.song);
    });
  }

  function playSong(src, loop, start = 0) {
    stopSong(true);
    if (!src) return null;
    const a = getSong(src);
    a.volume = 0;
    audio = a;
    // each time the section is opened, begin at the configured start time
    const seekStart = () => { try { a.currentTime = start; } catch (e) {} };
    if (a.readyState >= 1) seekStart();
    else a.addEventListener("loadedmetadata", seekStart, { once: true });
    a.loop = loop; // when the song finishes it loops from 0:00
    a.onerror = () => { if (audio === a) musicBtn.style.display = "none"; };
    const p = a.play();
    if (p) p.then(() => fadeTo(a, 1, 2200)).catch(() => { a.volume = 1; if (!a.error) musicBtn.style.display = "block"; });
    return a;
  }
  function stopSong(immediate) {
    musicBtn.style.display = "none";
    const a = audio; audio = null;
    if (!a) return;
    if (immediate) { a.pause(); return; }
    fadeTo(a, 0, 700, () => a.pause());
  }

  /* ---------------- background music (home screen) ----------------
     bg.mp3 is a reward: it only starts once all 5 archives are unlocked (with the bonus background).
     After the epilogue, its song keeps playing on the home screen (once, no loop), then hands over to bg.mp3. */
  const BG = C.bgMusic && C.bgMusic.src ? C.bgMusic : null;
  const bg = BG ? Object.assign(new Audio(), { preload: "none", loop: true, src: BG.src }) : null;
  let bgMuted = false, bgTimer = null, unlockedAudio = false, playerOpen = false;
  let homeTrack = null;                                   // the epilogue's song, finishing on the home screen
  const bgAllowed = () => { try { return allArchived(); } catch (e) { return false; } };
  const homeAudio = () => homeTrack || (bg && bgAllowed() ? bg : null);
  const homeLevel = (a) => a === bg ? (BG.volume != null ? BG.volume : 0.7) : ((C.epilogue && C.epilogue.musicVolume) || 0.9);
  function bgFade(target, ms, done, a = homeAudio()) {
    if (!a) return;
    clearInterval(bgTimer);
    const from = a.volume, t0 = performance.now();
    bgTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      try { a.volume = from + (target - from) * k; } catch (e) {}
      if (k >= 1) { clearInterval(bgTimer); done && done(); }
    }, 40);
  }
  // resumes from where it was paused
  function bgResume() {
    const a = homeAudio();
    if (!a || bgMuted || !unlockedAudio || current >= 0 || playerOpen) return;
    soundBtn.hidden = false;
    unpark(a);
    if (a === bg) a.preload = "auto";
    a.play().then(() => bgFade(homeLevel(a), 1800, null, a)).catch(() => {});
  }
  function bgPause(ms = 700) { [bg, homeTrack].forEach((a) => { if (a && !a.paused) bgFade(0, ms, () => a.pause(), a); }); }
  const soundBtn = $("#sound-toggle");
  soundBtn.hidden = true;                                 // appears with the music
  soundBtn.addEventListener("click", () => {
    bgMuted = !bgMuted; soundBtn.classList.toggle("off", bgMuted);
    soundBtn.setAttribute("aria-label", bgMuted ? "Play music" : "Mute music");
    bgMuted ? bgPause(400) : bgResume();
  });

  /* ---------------- home / posters ---------------- */
  const M = C.marquee || {};
  $("#m-studio").textContent = M.studio || "";
  $("#m-title").textContent = M.title || C.herName;
  $("#m-tag").textContent = M.tagline || "";
  $("#m-sub").textContent = M.sub || "";
  $("#m-billing").innerHTML = (M.billing || []).map((b) => `<span>${esc(b)}</span>`).join("");
  $("#m-rating").textContent = M.rating || ""; $("#m-rating").hidden = !M.rating;
  $("#curtain-studio").textContent = M.studio || "";
  $("#curtain-tag").textContent = M.tagline || "";
  setTimeout(() => $(".marquee").classList.remove("intro"), 4000);   // the entrance plays once, not every time she comes back

  const lockSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#d9b26f" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const posters = C.parts.map((p, i) => {
    const b = el("button", "poster locked");
    b.type = "button";
    b.innerHTML = `
      <div class="poster-art" style="background-image:url('${p.poster}')"></div>
      <span class="poster-lock">${lockSvg}</span>
      <span class="poster-stamp"></span>
      <div class="poster-body">
        <div class="poster-kicker">${esc(p.kicker)}${p.runtime ? `<span class="poster-runtime">runtime ${esc(p.runtime)}</span>` : ""}</div>
        <div class="poster-title">${esc(p.title)}</div>
        <p class="poster-tag">${esc(p.tagline)}</p>
        ${p.review ? `<p class="poster-review"><span class="rv-stars" aria-label="five stars">★★★★★</span> “${esc(p.review)}” <span class="by">— ${esc(C.fromName || "")}</span></p>` : ""}
        <div class="poster-meta"><span class="poster-when"><small>world premiere</small>${fmt(unlockAt(p), { day: "numeric", month: "short" })} · ${fmt(unlockAt(p), { hour: "numeric", minute: "2-digit", hour12: true })}</span><span class="poster-status"></span></div>
      </div>`;
    b.addEventListener("click", () => { if (isOpen(i)) { location.hash = "part" + (i + 1); route(); } });
    $("#posters").appendChild(b);
    return b;
  });

  const wasOpen = [];
  function tickPosters() {
    posters.forEach((b, i) => {
      const open = isOpen(i);
      b.classList.toggle("open", open);
      b.classList.toggle("locked", !open);
      b.setAttribute("aria-disabled", String(!open));
      $(".poster-status", b).textContent = open ? "watch ▸" : countdown(unlockAt(C.parts[i]) - now());
      $(".poster-stamp", b).textContent = open ? "now showing" : "coming soon";
      if (open && wasOpen[i] === false) { b.classList.add("just-opened"); setTimeout(() => b.classList.remove("just-opened"), 1700); }
      wasOpen[i] = open;
    });
  }
  tickPosters();
  setInterval(tickPosters, 1000);

  /* ---------------- curtain: the first tap starts the music ---------------- */
  const curtain = $("#curtain");
  $("#curtain-name").textContent = M.title || C.herName;
  function unlockAudio() {
    unlockedAudio = true;
    if (bg) bg.volume = 0;
    warmSongs();
    if (current >= 0) { if (audio && audio.paused) audio.play().then(() => fadeTo(audio, 1, 1500)).catch(() => {}); }
    else bgResume();
  }
  // tap → the drapes part → 3·2·1 film countdown → the posters. About 3 seconds; a second tap skips it.
  let showStage = 0;   // 0 waiting, 1 running, 2 done
  const showTimers = [];
  function endShow() {
    if (showStage === 2) return;
    showStage = 2; showTimers.forEach(clearTimeout);
    curtain.classList.add("gone");
    setTimeout(() => (curtain.hidden = true), 800);
  }
  function startShow() {
    if (showStage === 1) return endShow();
    if (showStage) return;
    showStage = 1;
    unlockAudio();                                  // music starts with the tap
    const quick = !C.theatreIntro || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quick) return endShow();
    curtain.classList.add("opening");
    const num = $("#leader-num");
    [[650, "2"], [1300, "1"]].forEach(([t, n]) => showTimers.push(setTimeout(() => {
      num.textContent = n; num.classList.remove("tick"); void num.offsetWidth; num.classList.add("tick");
    }, t)));
    showTimers.push(setTimeout(endShow, 2100));
  }
  if (!C.theatreIntro) curtain.classList.add("simple");
  if (bg) {
    curtain.hidden = false;
    curtain.addEventListener("click", startShow);
  }
  else unlockedAudio = true;
  setInterval(warmSongs, 60e3);

  /* ---------------- archive: birthday videos, each behind a little challenge ---------------- */
  const AR = C.archive;
  const archiveOpen = () => !!(AR && now() >= unlockAt(AR));
  const TEST = PREVIEW;                                   // preview runs never touch her real progress
  if (PREVIEW) {
    const tag = el("div", "preview-tag", `preview${fakeNow ? " · " + esc(params.get("now")).replace("T", " ") : " · everything open"}`);
    document.body.appendChild(tag);
  }
  const STORE = TEST ? "bday-archive-test" : "bday-archive";
  const OUTBOX = STORE + "-outbox";
  const readLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  // ?preview=…&reset=1 → start the archives (and the epilogue's reveal) from scratch for testing.
  // Earlier test answers stay in your Sheet's "Test" tab but are ignored from this moment on.
  const RESET_AT = STORE + "-resetAt";
  if (TEST && params.has("reset")) {
    const round = Date.now();
    writeLS(STORE, {}); writeLS(OUTBOX, []); writeLS(RESET_AT, round); writeLS(STORE + "-round", round);
    try { localStorage.removeItem("bday-encore-test-revealed"); } catch (e) {}
  }
  let unlocked = readLS(STORE, {});                       // { videoId: timestamp }
  const isUnlocked = (id) => !!unlocked[id];
  const cards = {};

  /* --- Google Sheet sync (Apps Script web app) --- */
  const device = () => {
    const ua = navigator.userAgent;
    const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "other";
    return `${os} · ${innerWidth}×${innerHeight}`;
  };
  let flushing = false;
  async function flushOutbox() {
    if (!AR || !AR.saveUrl) return;
    if (flushing) { setTimeout(flushOutbox, 1500); return; }   // one at a time, so nothing is sent twice
    flushing = true;
    try { await flushOnce(); } finally { flushing = false; }
  }
  async function flushOnce() {
    const box = readLS(OUTBOX, []);
    const sent = new Set();
    for (const rec of box) {
      try {
        // text/plain keeps this a "simple" request, which Apps Script accepts from any site
        const r = await fetch(AR.saveUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(rec) });
        const j = await r.json();
        if (j.ok) sent.add(rec.id + "|" + rec.at);
      } catch (e) {}
    }
    // keep anything not sent yet, including answers added while this was sending
    writeLS(OUTBOX, readLS(OUTBOX, []).filter((rec) => !sent.has(rec.id + "|" + rec.at)));
  }
  function record(it, kind, answer, details) {
    const round = TEST && !String(it.id).startsWith("__reset__") ? readLS(RESET_AT, 0) : 0;
    const rec = { key: AR.saveKey, test: TEST, id: round ? `${it.id}@${round}` : it.id, title: [it.title, it.note].filter(Boolean).join(" · "), kind, answer: answer || "", details: details || {}, device: device(), at: new Date().toISOString() };
    if (!AR.saveUrl) return;
    writeLS(OUTBOX, [...readLS(OUTBOX, []), rec]);
    flushOutbox();
  }
  async function pullState() {
    if (!AR || !AR.saveUrl) return;
    try {
      const r = await fetch(`${AR.saveUrl}?action=state&key=${encodeURIComponent(AR.saveKey)}${TEST ? "&test=1" : ""}`);
      const j = await r.json();
      if (j.ok && j.unlocked) {
        let remote = j.unlocked;
        if (TEST) {
          // In preview, each reset starts a new "round": answers are saved as "<video>@<round>", and only the
          // latest round counts — on ANY device (the reset itself is saved as a "__reset__<round>" row).
          const rounds = Object.keys(remote).filter((id) => id.startsWith("__reset__")).map((id) => +id.slice(9) || 0);
          const round = Math.max(readLS(RESET_AT, 0), ...rounds, 0);
          writeLS(RESET_AT, round);
          remote = Object.fromEntries(Object.entries(remote)
            .filter(([id]) => !id.startsWith("__reset__") && (round ? id.endsWith("@" + round) : !id.includes("@")))
            .map(([id, t]) => [id.split("@")[0], t]));
          if (round && readLS(STORE + "-round", 0) !== round) { unlocked = {}; writeLS(STORE + "-round", round); }   // a newer reset happened elsewhere
        }
        unlocked = { ...remote, ...unlocked }; writeLS(STORE, unlocked); paintCards();
      }
    } catch (e) {}
  }

  /* --- cards --- */
  const padSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  // every video unlocked → the home screen gets its new background, for good
  let bonusShown = false, bonusPending = false;   // pending = she just finished the last one; reveal after her video
  function checkAllUnlocked(celebrate) {
    if (!AR || !AR.allUnlockedBackground || bonusShown || (bonusPending && !celebrate)) return;
    if (!AR.items.every((it) => !it.lock || isUnlocked(it.id))) return;
    bonusShown = true; bonusPending = false;
    const hb = $("#home-bg");
    const img = new Image();
    img.onload = () => {
      hb.style.backgroundImage = `url('${AR.allUnlockedBackground}')`;
      document.body.classList.add("bonus");
      bgResume();                                         // …and the home music begins, as part of the reward
      if (celebrate) {
        const t = el("div", "toast", "every memory unlocked ♡ &nbsp;home looks a little different now");
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add("on"));
        setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 800); }, 5200);
      }
    };
    img.src = AR.allUnlockedBackground;
  }
  // reveal the new background as soon as she's back on the home screen (video closed, or message closed with ✕)
  function maybeCelebrate() {
    if (bonusPending && !playerOpen && ch.hidden && current < 0) paintCards(true);
  }
  function paintCards(celebrate) {
    if (!AR) return;
    checkAllUnlocked(celebrate);
    const open = archiveOpen();
    AR.items.forEach((it) => {
      const c = cards[it.id]; if (!c) return;
      const st = !open ? "soon" : isUnlocked(it.id) ? "open" : "locked";
      c.dataset.state = st;
      // the real name stays a secret until she unlocks it
      const reveal = st === "open" || !it.secretTitle;
      const tEl = $(".reel-title", c), nEl = $(".reel-note", c);
      const wasSecret = c.dataset.named === "secret";
      tEl.textContent = reveal ? it.title || "" : it.secretTitle;
      nEl.textContent = reveal ? it.note || "" : "";
      nEl.hidden = !nEl.textContent;
      c.dataset.named = reveal ? "real" : "secret";
      if (reveal && wasSecret) { tEl.classList.remove("renamed"); void tEl.offsetWidth; tEl.classList.add("renamed"); }
      $(".reel-status", c).innerHTML = st === "soon" ? "coming soon" : st === "locked" ? `${padSvg}<span>${esc(it.lock ? it.lock.hint || "a little challenge" : "")}</span>` : "watch ▸";
      c.setAttribute("aria-label", `${st === "open" || !it.secretTitle ? it.title + (it.note ? ", " + it.note : "") : it.secretTitle} — ${st === "open" ? "play" : st === "soon" ? "coming soon" : "locked: " + (it.lock && it.lock.hint)}`);
    });
  }
  if (AR && AR.items) {
    $("#archive").hidden = false;
    $("#archive-title").textContent = AR.title || "From the archives";
    $("#archive-sub").textContent = AR.subtitle || "";
    AR.items.forEach((it) => {
      const card = el("button", "reel-card");
      card.type = "button";
      card.innerHTML = `<span class="reel-thumb"><span class="reel-img" style="background-image:url('${it.poster || ""}')"></span><span class="reel-status"></span></span>
        <span class="reel-title"></span><span class="reel-note"></span>`;
      card.addEventListener("click", () => {
        const st = card.dataset.state;
        if (st === "soon") { card.classList.remove("nudge"); void card.offsetWidth; card.classList.add("nudge"); return; }
        if (st === "open" || !it.lock) openPlayer(it);
        else openChallenge(it);
      });
      cards[it.id] = card;
      $("#archive-row").appendChild(card);
    });
    if (TEST && params.has("reset")) record({ id: "__reset__" + readLS(RESET_AT, 0), title: "(preview reset)" }, "reset", "", {});
    paintCards(); setInterval(() => { paintCards(); maybeCelebrate(); }, 5000);
    flushOutbox(); pullState();
  }

  /* --- player --- */
  const player = $("#player"), pv = $("#player-video");
  let playerToken = 0;
  function openPlayer(it) {
    playerToken++;
    playerOpen = true;
    bgPause(500);
    $("#player-title").textContent = [it.title, it.note].filter(Boolean).join(" · ");
    pv.poster = it.poster || ""; pv.src = it.src;
    player.hidden = false; requestAnimationFrame(() => player.classList.add("on"));
    pv.play().catch(() => {});
  }
  function closePlayer() {
    if (!playerOpen) return;
    playerOpen = false; pv.pause();
    player.classList.remove("on");
    const tok = ++playerToken;
    if (bonusPending) setTimeout(maybeCelebrate, 700);
    setTimeout(() => { if (tok !== playerToken) return; player.hidden = true; pv.removeAttribute("src"); pv.load(); }, 400);
    bgResume();
  }
  $("#player-close").addEventListener("click", closePlayer);
  player.addEventListener("click", (e) => { if (e.target === player) closePlayer(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closePlayer(); closeChallenge(); } });

  /* --- challenge sheet --- */
  const ch = $("#challenge"), chBody = $("#ch-body");
  let chItem = null, chCleanup = null, winTimer = null;
  function openChallenge(it) {
    chItem = it;
    $("#ch-kicker").textContent = it.lock.kicker || "";
    $("#ch-prompt").textContent = it.lock.prompt || "";
    $("#ch-for").textContent = `unlocks · ${it.secretTitle || [it.title, it.note].filter(Boolean).join(" · ")}`;
    chBody.innerHTML = ""; ch.classList.remove("done");
    ch.hidden = false; requestAnimationFrame(() => ch.classList.add("on"));
    const games = { question: gameQuestion, unscramble: gameUnscramble, memory: gameMemory, hearts: gameHearts };
    chCleanup = (games[it.lock.type] || gameQuestion)(it, (answer, details) => win(it, answer, details));
  }
  function closeChallenge() {
    clearTimeout(winTimer);
    if (ch.hidden) return;
    if (chCleanup) { chCleanup(); chCleanup = null; }
    ch.classList.remove("on");
    setTimeout(() => { ch.hidden = true; chBody.innerHTML = ""; }, 400);
    if (bonusPending) setTimeout(maybeCelebrate, 900);   // if no video opens after the message
  }
  $("#ch-close").addEventListener("click", closeChallenge);
  ch.addEventListener("click", (e) => { if (e.target === ch) closeChallenge(); });

  function win(it, answer, details) {
    if (chCleanup) { chCleanup(); chCleanup = null; }
    unlocked[it.id] = new Date().toISOString(); writeLS(STORE, unlocked);
    record(it, it.lock.type, answer, details);
    chime(); sparkle(ch.querySelector(".ch-box"));
    ch.classList.add("done");
    chBody.innerHTML = "";
    const msg = el("p", "ch-after", esc(it.lock.after || ""));
    const go = el("button", "ghost", "watch ▶"); go.type = "button";
    chBody.append(msg, go);
    const card = cards[it.id];
    if (AR.items.every((x) => !x.lock || isUnlocked(x.id))) bonusPending = true;
    paintCards(); if (card) { card.classList.add("just-unlocked"); setTimeout(() => card.classList.remove("just-unlocked"), 2000); }
    // let the message be read, then play
    winTimer = setTimeout(openIt, 6000);
    function openIt() { clearTimeout(winTimer); closeChallenge(); setTimeout(() => openPlayer(it), 350); }
    go.addEventListener("click", openIt);
  }

  /* --- little effects --- */
  let actx = null;
  function chime() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0], [1318.5, .12], [1760, .26]].forEach(([f, d]) => {
        const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + d;
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.08, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + 1.4);
        o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + 1.5);
      });
    } catch (e) {}
  }
  function sparkle(box) {
    const b = box.getBoundingClientRect();
    for (let k = 0; k < 28; k++) {
      const s = el("span", "burst sparkle", Math.random() < .6 ? "✦" : "♥");
      const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 200;
      Object.assign(s.style, { left: b.left + b.width / 2 + "px", top: b.top + b.height / 3 + "px", fontSize: 8 + Math.random() * 14 + "px" });
      s.style.setProperty("--dx", Math.cos(a) * r + "px"); s.style.setProperty("--dy", Math.sin(a) * r + "px");
      document.body.appendChild(s); setTimeout(() => s.remove(), 1500);
    }
  }

  /* --- 1. free-text question --- */
  function gameQuestion(it, done) {
    const ta = Object.assign(el("textarea", "ch-input"), { rows: 4, maxLength: 2000, placeholder: "write anything… ♡" });
    const btn = el("button", "ghost", "send ♡"); btn.type = "button"; btn.disabled = true;
    const note = el("p", "ch-note", "your answer finds its way to me ♡");
    ta.addEventListener("input", () => { btn.disabled = ta.value.trim().length < 2; });
    btn.addEventListener("click", () => { if (!btn.disabled) done(ta.value.trim(), {}); });
    chBody.append(ta, el("div", "ch-actions"), note);
    chBody.querySelector(".ch-actions").appendChild(btn);
    setTimeout(() => ta.focus(), 450);
    return () => {};
  }

  /* --- 2. unscramble (tap a letter to place it, tap a placed letter to take it back) --- */
  function gameUnscramble(it, done) {
    const L = it.lock, t0 = Date.now();
    let hintLevel = 0, finished = false;
    chBody.appendChild(el("p", "ch-line", esc(L.line).replace(/_{2,}/g, '<span class="gap"></span>')));
    const words = L.words.map((w, wi) => {
      const row = el("div", "uns-word");
      const slots = el("div", "uns-slots"), tiles = el("div", "uns-tiles");
      const letters = [...(L.scrambled && L.scrambled[wi] ? L.scrambled[wi] : w.split("").sort(() => Math.random() - .5).join(""))];
      const state = { w, slots: Array(w.length).fill(null), slotEls: [], tileEls: [], solved: false, fixed: new Set() };
      for (let i = 0; i < w.length; i++) {
        const s = el("button", "uns-slot"); s.type = "button"; s.setAttribute("aria-label", `word ${wi + 1} letter ${i + 1}`);
        s.addEventListener("click", () => unplace(state, i)); slots.appendChild(s); state.slotEls.push(s);
      }
      letters.forEach((ch, ti) => {
        const t = el("button", "uns-tile", ch); t.type = "button";
        t.addEventListener("click", () => place(state, ti)); tiles.appendChild(t); state.tileEls.push(t);
      });
      row.append(el("span", "uns-label", `word ${wi + 1}`), slots, tiles);
      chBody.appendChild(row);
      return state;
    });
    const timer = el("div", "ch-timer", `<span></span>`), hintEl = el("p", "ch-note", L.footnote || "");
    chBody.append(timer, hintEl);
    function place(st, ti) {
      if (st.solved || finished) return;
      const i = st.slots.indexOf(null); if (i < 0) return;
      st.slots[i] = ti; st.slotEls[i].textContent = st.tileEls[ti].textContent; st.tileEls[ti].classList.add("used");
      st.slotEls[i].classList.add("filled");
      check(st);
    }
    function unplace(st, i) {
      if (st.solved || finished || st.slots[i] == null || st.fixed.has(i)) return;
      st.tileEls[st.slots[i]].classList.remove("used"); st.slots[i] = null;
      st.slotEls[i].textContent = ""; st.slotEls[i].classList.remove("filled");
    }
    function check(st) {
      if (st.slots.includes(null)) return;
      const guess = st.slots.map((ti) => st.tileEls[ti].textContent).join("");
      if (guess === st.w) {
        st.solved = true; st.slotEls.forEach((s) => s.classList.add("right"));
        if (words.every((w) => w.solved)) { finished = true; clearInterval(iv); setTimeout(() => done(L.words.join(" "), { seconds: Math.round((Date.now() - t0) / 1000), hintsUsed: hintLevel }), 900); }
      } else {
        const slotsRow = st.slotEls[0].parentElement; slotsRow.classList.remove("shake"); void slotsRow.offsetWidth; slotsRow.classList.add("shake");
        setTimeout(() => st.slots.forEach((_, i) => unplace(st, i)), 650);
      }
    }
    // hint: put the first letter of each word in place for her
    function hint(n) {
      words.forEach((st) => {
        if (st.solved) return;
        st.slots.forEach((_, i) => { if (!st.fixed.has(i)) unplace(st, i); });
        for (let i = 0; i < n && i < st.w.length; i++) {
          if (st.fixed.has(i)) continue;
          const ti = st.tileEls.findIndex((t, k) => t.textContent === st.w[i] && !st.slots.includes(k));
          if (ti < 0) continue;
          st.slots[i] = ti; st.slotEls[i].textContent = st.w[i]; st.slotEls[i].classList.add("filled", "fixed"); st.tileEls[ti].classList.add("used"); st.fixed.add(i);
        }
      });
    }
    const total = L.seconds || 30, hintAt = L.hintAt || 15;
    const iv = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      timer.firstChild.style.width = Math.max(0, 100 - (s / total) * 100) + "%";
      if (s >= hintAt && hintLevel < 1) { hintLevel = 1; hint(1); hintEl.textContent = "a little hint: the first letters ♡"; }
      if (s >= total && hintLevel < 2) { hintLevel = 2; hint(3); hintEl.textContent = "think of the song from Part II ♪"; clearInterval(iv); }
    }, 200);
    return () => clearInterval(iv);
  }

  /* --- 3. memory match --- */
  function gameMemory(it, done) {
    const pics = it.lock.photos || [];
    const deck = [...pics, ...pics].map((p, i) => ({ p, i })).sort(() => Math.random() - .5);
    const grid = el("div", "mem-grid"); grid.style.setProperty("--cols", deck.length > 12 ? 4 : deck.length > 6 ? 4 : 3);
    let first = null, busy = false, pairs = 0, moves = 0; const t0 = Date.now();
    const counter = el("p", "ch-note", `0 / ${pics.length} pairs`);
    deck.forEach((c) => {
      const b = el("button", "mem-card", `<span class="mem-in"><span class="mem-back">♡</span><span class="mem-face"><img alt="" loading="eager"></span></span>`);
      b.type = "button";
      const img = $("img", b);
      img.src = "assets/photos/thumbs/" + c.p;
      img.onerror = () => { img.onerror = null; img.src = "assets/photos/" + c.p; };
      b.addEventListener("click", () => {
        if (busy || b.classList.contains("up")) return;
        b.classList.add("up");
        if (!first) { first = { b, c }; return; }
        moves++;
        if (first.c.p === c.p) {
          first.b.classList.add("got"); b.classList.add("got"); first = null; pairs++;
          counter.textContent = `${pairs} / ${pics.length} pairs`;
          if (pairs === pics.length) setTimeout(() => done("all pairs found", { moves, seconds: Math.round((Date.now() - t0) / 1000) }), 900);
        } else {
          busy = true; const a = first.b; first = null;
          setTimeout(() => { a.classList.remove("up"); b.classList.remove("up"); busy = false; }, 850);
        }
      });
      grid.appendChild(b);
    });
    chBody.append(grid, counter);
    return () => {};
  }

  /* --- 4. catch the hearts --- */
  function gameHearts(it, done) {
    const L = it.lock, need = L.count || 11, secs = L.seconds || 20;
    const field = el("div", "hearts-field"), hud = el("div", "hearts-hud", `<span class="hrow" aria-hidden="true">${"<i>♥</i>".repeat(need)}</span><span class="hc">0 / ${need}</span><span class="ch-timer"><span></span></span>`);
    chBody.append(hud, field);
    let got = 0, rounds = 1, roundStart = Date.now(), over = false; const t0 = Date.now();
    const spawn = () => {
      if (over) return;
      const h = el("button", "fheart", Math.random() < .5 ? "♥" : "❤");
      h.type = "button"; h.setAttribute("aria-label", "catch heart");
      const dur = 3.6 + Math.random() * 2.4;
      Object.assign(h.style, { left: 6 + Math.random() * 82 + "%", fontSize: 26 + Math.random() * 18 + "px", animationDuration: dur + "s" });
      h.style.setProperty("--drift", (Math.random() * 80 - 40) + "px");
      h.addEventListener("pointerdown", (e) => {
        e.preventDefault(); if (over || h.classList.contains("pop")) return;
        const tf = getComputedStyle(h).transform; h.style.animation = "none"; h.style.transform = tf;   // freeze where she caught it
        void h.offsetWidth; h.classList.add("pop"); got++; $(".hc", hud).textContent = `${got} / ${need}`;
        const slot = hud.querySelectorAll(".hrow i")[got - 1]; if (slot) slot.classList.add("got");
        setTimeout(() => h.remove(), 400);
        if (got >= need) { over = true; clearInterval(sp); clearInterval(iv); setTimeout(() => done(`${need} hearts`, { seconds: Math.round((Date.now() - t0) / 1000), rounds }), 700); }
      });
      field.appendChild(h); setTimeout(() => h.remove(), dur * 1000 + 100);
    };
    const sp = setInterval(spawn, 520); spawn();
    const bar = $(".ch-timer span", hud);
    const iv = setInterval(() => {
      const s = (Date.now() - roundStart) / 1000;
      bar.style.width = Math.max(0, 100 - (s / secs) * 100) + "%";
      if (s >= secs) { rounds++; roundStart = Date.now(); hud.classList.remove("more"); void hud.offsetWidth; hud.classList.add("more"); }  // no penalty: time just refills
    }, 150);
    return () => { over = true; clearInterval(sp); clearInterval(iv); };
  }

  /* ---------------- routing ---------------- */
  const scenes = [0, 1, 2, 3].map((i) => $("#scene-" + i));
  const enter = [enterOne, enterTwo, enterThree, enterEncore];
  const leave = [leaveOne, leaveTwo, leaveThree, leaveEncore];
  const canOpen = (i) => (i === 3 ? encoreOpen() : isOpen(i));
  let current = -1;

  function route() {
    const m = location.hash.match(/^#part([123])$/);
    const idx = location.hash === "#encore" ? 3 : m ? Number(m[1]) - 1 : -1;
    if (idx >= 0 && !canOpen(idx)) { history.replaceState(null, "", location.pathname + location.search); return route(); }
    if (idx === current) return;
    if (current >= 0) { leave[current](); scenes[current].hidden = true; }
    current = idx;
    $("#home").hidden = idx >= 0;
    document.body.style.overflow = idx >= 0 ? "hidden" : "";
    document.body.classList.toggle("in-part", idx >= 0);
    document.body.classList.toggle("in-film", idx === 1 || idx === 3);   // lets the home background rest while a part is open
    if (idx >= 0) { bgPause(); scenes[idx].hidden = false; scenes[idx].scrollTop = 0; enter[idx](); }
    else { stopSong(); setTimeout(bgResume, 500); }
    soundBtn.hidden = idx >= 0 || !homeAudio();
  }
  window.addEventListener("hashchange", route);
  document.querySelectorAll(".back").forEach((b) => b.addEventListener("click", () => { location.hash = ""; route(); }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && current >= 0) location.hash = ""; });

  /* =========================================================
     PART I — message + scratch card
     ========================================================= */
  const P1 = C.part1;
  let heartTimer = null;
  /* split the letter into pages: whole paragraphs, ~charsPerPage each, "---" forces a break */
  function paginate(paras, budget) {
    const pages = [[]]; let size = 0;
    paras.forEach((t) => {
      if (String(t).trim() === "---") { if (pages.at(-1).length) { pages.push([]); size = 0; } return; }
      const len = String(t).length;
      if (pages.at(-1).length && size + len > budget) { pages.push([]); size = 0; }
      pages.at(-1).push(t); size += len;
    });
    return pages.filter((p) => p.length);
  }
  let page = 0, pageEls = [], dotEls = [];
  function showPage(k, first) {
    page = Math.max(0, Math.min(pageEls.length - 1, k));
    pageEls.forEach((p, i) => {
      p.classList.toggle("on", i === page);
      p.setAttribute("aria-hidden", String(i !== page));
      const kids = [...p.children];
      kids.forEach((n) => n.classList.remove("in"));
      if (i === page) kids.forEach((n, j) => setTimeout(() => n.classList.add("in"), (first ? 2300 : 250) + j * (first ? 900 : 450)));
    });
    dotEls.forEach((d, i) => d.classList.toggle("on", i === page));
    $("#p1-prev").style.visibility = page > 0 ? "visible" : "hidden";
    $("#p1-next").style.visibility = page < pageEls.length - 1 ? "visible" : "hidden";
  }
  $("#p1-next").addEventListener("click", () => showPage(page + 1));
  $("#p1-prev").addEventListener("click", () => showPage(page - 1));
  let lx = null;
  $("#p1-body").addEventListener("touchstart", (e) => { lx = e.touches[0].clientX; }, { passive: true });
  $("#p1-body").addEventListener("touchend", (e) => {
    if (lx == null) return; const dx = e.changedTouches[0].clientX - lx; lx = null;
    if (Math.abs(dx) > 50) showPage(page + (dx < 0 ? 1 : -1));
  });
  document.addEventListener("keydown", (e) => {
    if (current !== 0) return;
    if (e.key === "ArrowRight") showPage(page + 1);
    if (e.key === "ArrowLeft") showPage(page - 1);
  });

  // the little fan of extra photos behind the scratch card
  function buildFan() {
    const fan = $("#p1-fan"); fan.innerHTML = "";
    $("#scratch-wrap").classList.remove("fanned");
    (P1.extraPhotos || []).forEach((ph, i) => {
      const c = el("button", "fan-card", `<img alt="" src="${ph.src}">${ph.caption ? `<span>${esc(ph.caption)}</span>` : ""}`);
      c.type = "button"; c.style.setProperty("--i", i); c.setAttribute("aria-label", "photo " + (ph.caption || i + 1));
      c.addEventListener("click", () => {
        const was = c.classList.contains("front");
        fan.querySelectorAll(".front").forEach((x) => x.classList.remove("front"));
        if (!was) c.classList.add("front");
      });
      fan.appendChild(c);
    });
  }
  function fanOut() {
    if (!(P1.extraPhotos || []).length) return;
    setTimeout(() => $("#scratch-wrap").classList.add("fanned"), 700);
    $("#p1-fan").querySelectorAll(".fan-card").forEach((c, i) => setTimeout(() => c.classList.add("out"), 900 + i * 350));
  }

  function enterOne() {
    buildFan();
    $("#p1-eyebrow").textContent = P1.eyebrow;
    $("#p1-title").textContent = P1.title;
    $("#p1-caption").textContent = "";
    const body = $("#p1-body"); body.innerHTML = "";
    const pages = paginate(P1.paragraphs, P1.charsPerPage || 380);
    pageEls = pages.map((paras, i) => {
      const pg = el("div", "letter-page");
      paras.forEach((t) => pg.appendChild(el("p", "reveal-item", esc(t))));
      if (i === pages.length - 1 && P1.signoff) pg.appendChild(el("p", "signoff reveal-item", esc(P1.signoff)));
      body.appendChild(pg); return pg;
    });
    const dots = $("#p1-dots"); dots.innerHTML = "";
    dotEls = pages.map(() => dots.appendChild(el("span", "dot")));
    $("#p1-nav").hidden = pages.length < 2;
    const nav = $("#p1-nav");
    // reset instantly (no fade-out) so re-opening Part I doesn't flash the old text
    [$("#p1-eyebrow"), $("#p1-title"), nav].forEach((n) => { n.classList.add("no-anim"); n.classList.remove("in"); void n.offsetWidth; n.classList.remove("no-anim"); });
    [$("#p1-eyebrow"), $("#p1-title")].forEach((n, k) => setTimeout(() => n.classList.add("in"), 500 + k * 900));
    setTimeout(() => nav.classList.add("in"), 2300 + pages[0].length * 900);
    showPage(0, true);
    $("#p1-img").src = P1.scratchPhoto;
    requestAnimationFrame(() => (document.fonts ? document.fonts.ready.then(initScratch) : initScratch()));
    playSong(C.parts[0].song, true, songStart(0));
    const box = $("#scene-0 .hearts");
    heartTimer = setInterval(() => spawnHeart(box), 700);
  }
  function leaveOne() { clearInterval(heartTimer); $("#scene-0 .hearts").innerHTML = ""; }

  function spawnHeart(box) {
    const h = el("span", "heart", Math.random() < .5 ? "♡" : "♥");
    const dur = 9 + Math.random() * 7;
    Object.assign(h.style, { left: Math.random() * 100 + "vw", fontSize: 10 + Math.random() * 18 + "px", animationDuration: dur + "s" });
    h.style.setProperty("--drift", (Math.random() * 120 - 60) + "px");
    h.style.setProperty("--rot", (Math.random() * 90 - 45) + "deg");
    box.appendChild(h);
    setTimeout(() => h.remove(), dur * 1000);
  }
  function burst(x, y, n = 26) {
    for (let k = 0; k < n; k++) {
      const h = el("span", "burst", "♥");
      const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 180;
      Object.assign(h.style, { left: x + "px", top: y + "px", fontSize: 12 + Math.random() * 16 + "px" });
      h.style.setProperty("--dx", Math.cos(a) * r + "px");
      h.style.setProperty("--dy", Math.sin(a) * r + "px");
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 1500);
    }
  }

  let scratchBound = false;
  function initScratch() {
    const wrap = $("#scratch"), cv = $("#scratch-canvas"), ctx = cv.getContext("2d");
    wrap.classList.remove("done");
    const r = wrap.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    const g = ctx.createLinearGradient(0, 0, r.width, r.height);
    g.addColorStop(0, "#b8893f"); g.addColorStop(.35, "#f3d79e"); g.addColorStop(.55, "#c99a4f"); g.addColorStop(.8, "#f0cf8a"); g.addColorStop(1, "#a97a35");
    ctx.fillStyle = g; ctx.fillRect(0, 0, r.width, r.height);
    for (let k = 0; k < 900; k++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .12})`; ctx.fillRect(Math.random() * r.width, Math.random() * r.height, 1.5, 1.5); }
    ctx.fillStyle = "rgba(60,38,10,.75)"; ctx.textAlign = "center";
    ctx.font = `italic 500 ${Math.round(r.width / 9)}px "Playfair Display", Georgia, serif`;
    ctx.fillText("♡", r.width / 2, r.height / 2 - r.width / 14);
    ctx.font = `500 ${Math.max(13, Math.round(r.width / 22))}px Inter, sans-serif`;
    ctx.fillText(P1.scratchHint, r.width / 2, r.height / 2 + r.width / 12);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = Math.max(36, r.width / 7);

    if (scratchBound) return;
    scratchBound = true;
    let down = false, last = null, moves = 0;
    const pos = (e) => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    cv.addEventListener("pointerdown", (e) => { down = true; last = pos(e); cv.setPointerCapture(e.pointerId); draw(last); });
    cv.addEventListener("pointermove", (e) => { if (down) draw(pos(e)); });
    const up = () => { down = false; last = null; check(); };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    function draw(p) {
      if (wrap.classList.contains("done")) return;
      ctx.beginPath(); ctx.moveTo((last || p).x, (last || p).y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; if (++moves % 12 === 0) check();
    }
    function check() {
      if (wrap.classList.contains("done")) return;
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0, total = 0;
      for (let k = 3; k < d.length; k += 4 * 40) { total++; if (d[k] < 40) clear++; }
      if (clear / total > 0.5) {
        wrap.classList.add("done");
        const b = wrap.getBoundingClientRect();
        burst(b.left + b.width / 2, b.top + b.height / 2);
        $("#p1-caption").textContent = P1.revealCaption;
        fanOut();
      }
    }
  }
  window.addEventListener("resize", () => { if (current === 0 && !$("#scratch").classList.contains("done")) initScratch(); });

  /* =========================================================
     PART II — the film (synced to the song's clock)
     ========================================================= */
  const P2 = C.part2;
  const stage = $("#film-stage"), filmScene = $("#scene-1"), bar = $("#film-bar"), playBtn = $("#film-play");
  const lyricBox = $("#lyric"), lyricLines = [...lyricBox.children], timeEl = $("#film-time"), leak = $("#film-leak");
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const START_SEC = 4;
  const TRANSITIONS = ["fade", "blur", "zoom", "drift", "fade", "rise"];
  const MOTIONS = ["in", "left", "out", "right", "up", "in", "down", "out"];
  let items = [], total = 0, idx = -1, raf = 0, playing = false, started = false;
  let internalT = 0, lastFrame = 0, useAudioClock = false, idleTimer = null, curVideo = null, shownKey = "";
  const keyOf = (it) => it ? `${it.type}|${it.src || it.year || ""}` : "";
  function show(k) { idx = k; if (keyOf(items[k]) !== shownKey) render(k); }

  const isVid = (m) => !!m.video || /\.(mp4|webm|mov)$/i.test(m.src || "");
  const mediaSrc = (m) => {
    const p = m.video || m.src;
    if (p.startsWith("assets/")) return p;
    return (m.video ? "assets/clips/" : "assets/photos/") + p;
  };
  const mediaYear = (m) => String(m.year || (m.video || m.src).replace(/^.*\//, "").slice(0, 4));
  const clipLen = (m) => Math.max(1, (m.to != null ? m.to : (m.from || 0) + 4) - (m.from || 0));

  /* ---- caches so the next photos / clips are ready before they're needed ---- */
  const imgCache = {}, vidCache = {}, ready = {}, blobUrl = {};
  const loadImg = (src) => imgCache[src] || (imgCache[src] = Object.assign(new Image(), { decoding: "async", src: blobUrl[src] || src }));
  const localSrc = (src) => blobUrl[src] || src;

  /* ---- download the WHOLE film before it plays, so nothing depends on the network mid-film ----
     Starts quietly 30 min before Part II unlocks (while the site is open on the home screen),
     or when she opens Part II. The opening card shows the progress and starts at 100%. */
  const FILM = { started: false, done: 0, total: 1, finished: false, songUrl: null, promise: null, list: [], got: [], t0: 0, count: 0 };
  function filmList() {
    const seen = new Set();
    return P2.media.filter((m) => !m.off).map((m) => ({ type: isVid(m) ? "video" : "photo", src: mediaSrc(m) }))
      .filter((x) => !seen.has(x.src) && seen.add(x.src));
  }
  async function grab(src) {
    for (let attempt = 0; attempt < 3; attempt++) {           // a couple of retries for a flaky connection
      try { const r = await fetch(src); if (r.ok) return URL.createObjectURL(await r.blob()); } catch (e) {}
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
    return null;
  }
  // Opened straight from the computer (file://)? Browsers block downloading files there, so skip the
  // full download and play directly from the files (they're on the disk anyway, so there's nothing to wait for).
  const LOCAL_FILE = location.protocol === "file:";
  function preloadFilm() {
    if (FILM.promise) return FILM.promise;
    if (LOCAL_FILE) { FILM.started = FILM.finished = true; return (FILM.promise = Promise.resolve()); }
    FILM.started = true;
    const list = filmList(), song = C.parts[1].song, SONG_W = 12;   // the song counts like 12 photos in the progress
    FILM.list = list; FILM.got = list.map(() => false); FILM.t0 = performance.now();
    FILM.total = list.length + (song ? SONG_W : 0);
    const bump = (w) => { FILM.done += w; updateFilmProgress(); };
    // if the song can't be downloaded ahead, don't wait for it — it simply streams as usual
    const songP = song ? grab(song).then((u) => { FILM.songUrl = u; if (!u) FILM.songFailed = true; bump(SONG_W); }) : Promise.resolve();
    let i = 0;
    const worker = async () => {
      while (i < list.length) {
        const n = i++, it = list[n];
        if (!blobUrl[it.src]) { const u = await grab(it.src); if (u) { blobUrl[it.src] = u; if (it.type === "video") ready[it.src] = Promise.resolve(); } }
        FILM.got[n] = true; FILM.count++;
        bump(1);
      }
    };
    // the song gets most of the connection first (the film can't start without it); a second lane joins once it's in
    FILM.promise = Promise.all([songP, worker(), songP.then(worker)]).then(() => { FILM.finished = true; updateFilmProgress(); });
    return FILM.promise;
  }
  // Safe to start before 100%? Only if, at the measured download speed, every remaining photo/clip
  // will arrive well before its moment in the film (like a video player's "enough buffered").
  function filmCanStart() {
    if (FILM.finished) return true;
    if (C.parts[1].song && !FILM.songUrl && !FILM.songFailed) return false;
    const secs = (performance.now() - FILM.t0) / 1000;
    if (secs < 4 || FILM.count < 4) return false;
    const rate = FILM.count / secs;                                    // items per second
    const when = {}; items.forEach((x) => { if ((x.type === "photo" || x.type === "video") && when[x.src] == null) when[x.src] = x.t0; });
    let prefix = FILM.got.indexOf(false); if (prefix < 0) return true;
    for (let j = prefix; j < FILM.list.length; j++) {
      const needAt = when[FILM.list[j].src]; if (needAt == null) continue;
      const arrivesIn = (j - prefix + 1) / rate;                       // rough: the downloader keeps going in film order
      if (arrivesIn > needAt - 6) return false;                        // keep a 6-second safety margin
    }
    return true;
  }
  function updateFilmProgress() {
    const l = $("#film-loading");
    if (l && !l.classList.contains("done")) l.textContent = `getting our story ready… ${Math.min(100, Math.round((FILM.done / FILM.total) * 100))}%`;
  }
  // Fetch the next few photos/clips in the order they'll appear, two at a time, so the nearest one is always first.
  // Clips are downloaded completely (as a blob) so they play instantly — phones otherwise only fetch a sliver ahead.
  let queue = [], active = 0;
  function fetchMedia(it) {
    if (ready[it.src]) return ready[it.src];
    if (it.type === "photo") {
      const im = loadImg(it.src);
      ready[it.src] = (im.decode ? im.decode() : new Promise((r, j) => { im.onload = r; im.onerror = j; })).catch(() => {});
    } else {
      ready[it.src] = (blobUrl[it.src] || LOCAL_FILE) ? Promise.resolve()
        : fetch(it.src).then((r) => r.ok ? r.blob() : null).then((b) => { if (b) blobUrl[it.src] = URL.createObjectURL(b); }).catch(() => {});
    }
    return ready[it.src];
  }
  function pump() {
    while (active < 2 && queue.length) {
      const it = queue.shift(); active++;
      fetchMedia(it).finally(() => { active--; pump(); });
    }
  }
  function prefetchFrom(k, ahead = 12) {
    queue = items.slice(k + 1, k + 1 + ahead).filter((x) => (x.type === "photo" || x.type === "video") && !ready[x.src]);
    pump();
  }
  function loadVid(it) {
    if (vidCache[it.src]) {
      if (blobUrl[it.src] && !vidCache[it.src].src.startsWith("blob:")) vidCache[it.src].src = blobUrl[it.src];
      return vidCache[it.src];
    }
    const v = document.createElement("video");
    Object.assign(v, { muted: true, playsInline: true, preload: "auto" });
    v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
    v.src = blobUrl[it.src] || it.src;
    v.addEventListener("loadedmetadata", () => { try { v.currentTime = it.from; } catch (e) {} }, { once: true });
    return (vidCache[it.src] = v);
  }

  /* ---- lyrics ---- */
  function parseLyrics(txt) {
    let sec = ""; const out = [];
    String(txt || "").split(/\r?\n/).forEach((raw) => {
      const line = raw.trim(); let m;
      if ((m = line.match(/^#\s*(.+)/))) { sec = m[1].toLowerCase(); return; }
      if ((m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/))) out.push({ t: +m[1] * 60 + +m[2], text: m[3], chorus: /chorus/.test(sec) });
    });
    return out.sort((a, b) => a.t - b.t);
  }
  const LYR = parseLyrics(window.LYRICS_PART2);
  let lyrIdx = -2, lyrSlot = 0, ccOn = P2.lyrics !== false && LYR.length > 0;
  $("#film-cc").hidden = !LYR.length;
  function setLyric(line) {
    lyricLines[lyrSlot].classList.remove("on");
    lyrSlot ^= 1;
    const n = lyricLines[lyrSlot];
    n.textContent = line ? line.text : "";
    n.classList.toggle("chorus", !!(line && line.chorus));
    if (line && line.text) { void n.offsetWidth; n.classList.add("on"); }
  }
  function updateLyric(songT) {
    let k = -1;
    if (ccOn) for (let i = 0; i < LYR.length; i++) { if (LYR[i].t <= songT + 0.15) k = i; else break; }
    if (k === lyrIdx) return;
    lyrIdx = k; setLyric(k >= 0 ? LYR[k] : null);
  }
  $("#film-cc").addEventListener("click", (e) => {
    e.stopPropagation(); ccOn = !ccOn;
    $("#film-cc").classList.toggle("on", ccOn); lyrIdx = -2; poke();
  });

  /* ---- timeline ---- */
  function build(duration) {
    const list = P2.media.filter((m) => !m.off);
    const groups = [];
    list.forEach((m) => {
      const year = mediaYear(m);
      let g = groups[groups.length - 1];
      if (!g || g.year !== year) groups.push((g = { year, media: [] }));
      g.media.push(m);
    });
    const vidTime = list.filter(isVid).reduce((a, m) => a + clipLen(m), 0);
    const nPhotos = list.filter((m) => !isVid(m)).length || 1;
    const fixed = START_SEC + groups.length * P2.titleCardSeconds + P2.endCardSeconds;
    const per = Math.max(2.4, (duration - fixed - vidTime) / nPhotos);
    if (PREVIEW) console.info(`[film] ${nPhotos} photos × ${per.toFixed(2)}s, ${list.length - nPhotos} clips = ${vidTime.toFixed(1)}s, song ${duration.toFixed(1)}s`);
    const out = [{ type: "start", d: START_SEC }];
    let n = 0;
    groups.forEach((g, gi) => {
      out.push({ type: "title", year: g.year, ch: ROMAN[gi] || gi + 1, prev: gi ? groups[gi - 1].year : "", d: P2.titleCardSeconds });
      g.media.forEach((m) => {
        n++;
        const base = { year: g.year, src: mediaSrc(m), caption: m.caption || "", tr: TRANSITIONS[(n * 5) % TRANSITIONS.length], mo: MOTIONS[(n * 3) % MOTIONS.length], tilt: ((n * 37) % 7) - 3 };
        out.push(isVid(m) ? { ...base, type: "video", from: m.from || 0, to: (m.from || 0) + clipLen(m), d: clipLen(m) } : { ...base, type: "photo", d: per, n });
      });
    });
    out.push({ type: "end", d: P2.endCardSeconds });
    let t = 0; out.forEach((it) => { it.t0 = t; t += it.d; });
    items = out; total = t;
    // chapter ticks on the progress bar
    const prog = bar.parentElement;
    prog.querySelectorAll(".tick").forEach((x) => x.remove());
    items.forEach((it) => { if (it.type === "title") { const tk = el("i", "tick"); tk.style.left = (it.t0 / total) * 100 + "%"; prog.appendChild(tk); } });
  }

  const clock = () => (useAudioClock && audio ? Math.max(0, audio.currentTime - songStart(1)) : internalT);
  function seek(t) {
    t = Math.max(0, Math.min(total - 0.05, t));
    if (useAudioClock && audio) { try { audio.currentTime = songStart(1) + t; } catch (e) {} }
    internalT = t;
    const k = indexAt(t);
    if (k !== idx) show(k);
  }
  const indexAt = (t) => { for (let k = items.length - 1; k >= 0; k--) if (t >= items[k].t0) return k; return 0; };

  function layoutPhoto(s, img, it) {
    const ar = img.naturalWidth / img.naturalHeight, vr = innerWidth / innerHeight, r = ar / vr;
    // fill the screen edge-to-edge only for a landscape photo on a landscape screen with nearly the same shape;
    // on phones every photo stays whole and framed (filling a tall screen crops faces and hides captions)
    const cover = vr > 1 && ar > 1 && r > 0.8 && r < 1.25;
    const polaroid = !cover && vr > 1.1 && it.n % 4 === 2;  // now and then on wide screens: a polaroid
    s.classList.toggle("cover", cover);
    s.classList.toggle("framed", !cover);
    s.classList.toggle("pola", polaroid);
  }

  function render(k) {
    const it = items[k];
    shownKey = keyOf(it);
    const s = el("div", "slide");
    if (curVideo) { curVideo.pause(); curVideo = null; }
    if (it.type === "photo") {
      s.classList.add("photo", "t-" + it.tr, "m-" + it.mo);
      s.style.setProperty("--dur", it.d + 1.6 + "s");
      s.style.setProperty("--tilt", it.tilt + "deg");
      s.appendChild(Object.assign(el("div", "slide-bg"), { style: `background-image:url('${localSrc(it.src)}')` }));
      const img = loadImg(it.src);
      const fig = el("figure", "frame");
      const view = Object.assign(el("img", "slide-fg"), { src: localSrc(it.src), alt: it.caption || "" });
      fig.appendChild(view);
      if (!(img.complete && img.naturalWidth)) {
        // not ready yet: stay hidden, choose the layout once its real size is known, then fade in (no jump)
        s.classList.add("waiting");
        fetchMedia(it).then(() => { if (img.naturalWidth) layoutPhoto(s, img, it); s.classList.remove("waiting"); });
      }
      if (it.caption) fig.appendChild(el("figcaption", "pol-cap", esc(it.caption)));
      const inner = el("div", "slide-inner"); inner.appendChild(fig); s.appendChild(inner);
      s.classList.add("framed");
      if (img.complete && img.naturalWidth) layoutPhoto(s, img, it);
    } else if (it.type === "video") {
      s.classList.add("video", "t-" + it.tr);
      s.style.setProperty("--dur", it.d + 1.6 + "s");
      s.appendChild(el("div", "slide-bg vid-bg"));
      const v = loadVid(it); v.className = "slide-fg";
      const inner = el("div", "slide-inner"); inner.appendChild(v); s.appendChild(inner);
      const go = () => { try { v.currentTime = it.from; } catch (e) {} if (playing) v.play().catch(() => s.classList.add("still")); };
      v.readyState >= 1 ? go() : v.addEventListener("loadedmetadata", go, { once: true });
      v.ontimeupdate = () => { if (v.currentTime >= it.to - 0.05) v.pause(); };
      curVideo = v;
    } else if (it.type === "title") {
      s.classList.add("slide-title");
      const sub = (P2.years && P2.years[it.year]) || "";
      const digits = [...String(it.year)].map((d, i) => `<span style="--i:${i}">${d}</span>`).join("");
      s.appendChild(el("div", "tc", `<div class="ch">Chapter ${it.ch}</div><div class="yr">${digits}</div><div class="rule"></div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}`));
      leak.classList.remove("flash"); void leak.offsetWidth; leak.classList.add("flash");
    } else if (it.type === "start") {
      s.classList.add("slide-start");
      s.appendChild(el("div", "", `<p class="eyebrow">${esc(P2.introKicker || C.parts[1].kicker)}</p><h3>${esc(P2.introTitle || C.parts[1].title)}</h3><p>${esc(P2.introLine || C.parts[1].tagline)}</p><span class="loading" id="film-loading">getting our story ready…</span>`));
    } else {
      s.classList.add("slide-end");
      const inner = el("div", "", `<h3>${esc(P2.endTitle)}</h3><p>${esc(P2.endLine)}</p>`);
      const again = el("button", "ghost", "watch again"); again.type = "button";
      again.addEventListener("click", (e) => { e.stopPropagation(); seek(0); if (!playing) toggle(); if (audio && audio.paused) audio.play().catch(() => {}); });
      inner.appendChild(again); s.appendChild(inner);
    }
    if (it.type === "photo" || it.type === "video") {
      s.appendChild(el("div", "slide-meta", `<span class="slide-year">${it.year}</span>${it.caption ? `<span class="slide-cap">${esc(it.caption)}</span>` : ""}`));
    }
    stage.appendChild(s);
    void s.offsetWidth; s.classList.add("on");
    const old = [...stage.children].filter((c) => c !== s);
    old.forEach((o) => o.classList.add("leaving")); // captions & year label leave immediately
    setTimeout(() => old.forEach((o) => o.remove()), 1500);
    // get the next few ready
    prefetchFrom(k);
  }

  const fmtT = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
  function frame(ts) {
    const dt = lastFrame ? (ts - lastFrame) / 1000 : 0; lastFrame = ts;
    if (playing && !useAudioClock) internalT += dt;
    let t = clock();
    if (t >= total - 0.05) t = total - 0.05;
    const k = indexAt(t);
    if (k !== idx) show(k);
    bar.style.width = (t / total) * 100 + "%";
    if (useAudioClock && audio) {
      updateLyric(audio.currentTime);
      if (PREVIEW) timeEl.textContent = "song " + fmtT(audio.currentTime);
    }
    raf = requestAnimationFrame(frame);
  }

  function toggle() {
    if (!started) return;
    playing = !playing;
    playBtn.textContent = playing ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    if (audio) playing ? audio.play().catch(() => {}) : audio.pause();
    if (curVideo) playing ? curVideo.play().catch(() => {}) : curVideo.pause();
    poke();
  }
  function poke() {
    filmScene.classList.remove("idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (playing) filmScene.classList.add("idle"); }, 2600);
  }

  // bokeh: a few soft lights drifting over the film
  (() => {
    const box = $("#film-bokeh");
    const nB = innerWidth < 820 ? 6 : 12;
    for (let i = 0; i < nB; i++) {
      const b = el("span");
      const size = 40 + Math.random() * 120;
      Object.assign(b.style, { width: size + "px", height: size + "px", left: Math.random() * 100 + "%", top: Math.random() * 100 + "%",
        animationDuration: 18 + Math.random() * 22 + "s", animationDelay: -Math.random() * 30 + "s" });
      box.appendChild(b);
    }
  })();

  function whenReady() {
    updateFilmProgress();
    const all = preloadFilm();
    const minShow = new Promise((r) => setTimeout(r, 1800));      // let the opening card breathe
    // if it's taking long (very slow internet), offer to start anyway — it then streams like before
    const skip = new Promise((r) => {
      const t = setTimeout(() => {
        const l = $("#film-loading"); if (!l || FILM.finished) return;
        const b = el("button", "ghost film-skip", "start anyway ▸"); b.type = "button";
        b.addEventListener("click", (e) => { e.stopPropagation(); b.remove(); r(); });
        l.after(b);
      }, 25000);
      all.then(() => clearTimeout(t));
    });
    const enough = new Promise((r) => { const iv = setInterval(() => { if (filmCanStart()) { clearInterval(iv); r(); } }, 400); all.then(() => { clearInterval(iv); r(); }); });
    return Promise.race([Promise.all([enough, minShow]), skip]).then(() => { const b = $(".film-skip"); if (b) b.remove(); prefetchFrom(-1); });
  }

  let enterToken = 0;
  function enterTwo() {
    const token = ++enterToken;
    stage.innerHTML = ""; idx = -1; shownKey = ""; internalT = 0; lastFrame = 0; useAudioClock = false; started = false; playing = false;
    lyrIdx = -2; lyricLines.forEach((n) => { n.classList.remove("on"); n.textContent = ""; });
    timeEl.hidden = !PREVIEW;
    build(P2.songSeconds);
    playBtn.textContent = "❚❚";
    const src = C.parts[1].song, S = songStart(1);
    let a = null;
    if (src) {
      a = songCache[src] || (songCache[src] = Object.assign(new Audio(), { preload: "auto" }));
      a._parked = null;
      // unlock this audio element with her tap (phones require that) using a silent sound, so the real song isn't downloaded twice
      if (!a.getAttribute("src")) { a.src = FILM.songUrl || "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="; }
      a.muted = true; const p = a.play(); if (p) p.then(() => { if (!started) a.pause(); a.muted = false; }).catch(() => { a.muted = false; });
    }
    park(bg); Object.values(songCache).forEach((x) => { if (x !== a) park(x); });   // the film gets the whole connection
    raf = requestAnimationFrame(frame);
    whenReady().then(() => {
      if (token !== enterToken || current !== 1) return;
      const loading = $("#film-loading"); if (loading) loading.classList.add("done");
      if (a) { const want = FILM.songUrl || src; if (a.getAttribute("src") !== want) { a.pause(); a.src = want; } }
      const song = playSong(src, false, S);
      started = true; playing = true;
      const onMeta = () => {
        if (isFinite(song.duration) && song.duration - S > 30) { build(song.duration - S); useAudioClock = true; idx = -1; /* show() keeps the current slide if it's unchanged */ }
      };
      if (song) {
        song.readyState >= 1 ? onMeta() : song.addEventListener("loadedmetadata", onMeta, { once: true });
        song.addEventListener("error", () => { useAudioClock = false; }, { once: true });
      }
      poke();
    });
    poke();
  }
  function leaveTwo() {
    enterToken++;
    queue = [];
    cancelAnimationFrame(raf); clearTimeout(idleTimer); playing = false; started = false;
    if (curVideo) { curVideo.pause(); curVideo = null; }
    stage.innerHTML = "";
  }

  playBtn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  $("#film-prev").addEventListener("click", (e) => { e.stopPropagation(); if (started) seek(items[Math.max(0, idx - 1)].t0 + 0.01); poke(); });
  $("#film-next").addEventListener("click", (e) => { e.stopPropagation(); if (started) seek(items[Math.min(items.length - 1, idx + 1)].t0 + 0.01); poke(); });
  filmScene.addEventListener("pointermove", poke);
  filmScene.addEventListener("click", poke);
  document.addEventListener("keydown", (e) => {
    if (current !== 1) return;
    if (e.key === " ") { e.preventDefault(); toggle(); }
    if (e.key === "ArrowRight") $("#film-next").click();
    if (e.key === "ArrowLeft") $("#film-prev").click();
  });
  let tx = null;
  filmScene.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  filmScene.addEventListener("touchend", (e) => {
    if (tx == null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 60) (dx < 0 ? $("#film-next") : $("#film-prev")).click();
  });

  /* =========================================================
     PART III — goodnight reel
     ========================================================= */
  const P3 = C.part3;
  let reelTimers = [];
  const starBox = $("#scene-2 .stars");
  for (let k = 0; k < 90; k++) {
    const s = el("span", "star");
    Object.assign(s.style, { left: Math.random() * 100 + "%", top: Math.random() * 100 + "%", animationDuration: 2 + Math.random() * 4 + "s", animationDelay: -Math.random() * 5 + "s", opacity: .3 });
    if (Math.random() < .2) { s.style.width = s.style.height = "3px"; }
    starBox.appendChild(s);
  }

  function runReel() {
    reelTimers.forEach(clearTimeout); reelTimers = [];
    const box = $("#reel-stage"); box.innerHTML = "";
    $("#p3-sign").classList.remove("in"); $("#reel-replay").hidden = true;
    const lines = [...P3.lines, P3.finalLine];
    const step = P3.lineSeconds * 1000;
    lines.forEach((text, k) => {
      const isFinal = k === lines.length - 1;
      const n = el("div", "reel-line" + (isFinal ? " final" : ""), esc(text));
      box.appendChild(n);
      reelTimers.push(setTimeout(() => n.classList.add("in"), 1200 + k * step));
      if (!isFinal) reelTimers.push(setTimeout(() => { n.classList.remove("in"); n.classList.add("out"); }, 1200 + (k + 1) * step - 900));
    });
    // two photos: the first one shows during the message, the main one drops on top with the final line
    const pile = $("#p3-pile"); pile.classList.remove("swap");
    if (P3.firstPhoto) reelTimers.push(setTimeout(() => pile.classList.add("swap"), 1200 + (lines.length - 1) * step));
    const endAt = 1200 + (lines.length - 1) * step + 1800;
    reelTimers.push(setTimeout(() => $("#p3-sign").classList.add("in"), endAt));
    reelTimers.push(setTimeout(() => ($("#reel-replay").hidden = false), endAt + 2500));
  }
  function enterThree() {
    $("#p3-img").src = P3.photo;
    const first = $(".p3-first");
    first.hidden = !P3.firstPhoto; $("#p3-pile").classList.toggle("two", !!P3.firstPhoto);
    if (P3.firstPhoto) $("#p3-img2").src = P3.firstPhoto;
    $("#p3-sign").textContent = P3.signoff;
    playSong(C.parts[2].song, true, songStart(2));
    runReel();
  }
  function leaveThree() { reelTimers.forEach(clearTimeout); }
  $("#reel-replay").addEventListener("click", runReel);

  /* =========================================================
     ONE MORE THING — the epilogue
     Shows under the archives once all 5 are unlocked; opens at 11:55 PM.
     Plays as one continuous full-screen scene.
     ========================================================= */
  const EP = C.epilogue || null;
  const encoreSec = $("#encore");
  const allArchived = () => !!(AR && AR.items && AR.items.every((it) => !it.lock || isUnlocked(it.id)));
  const encoreVisible = () => !!EP && (allArchived() || (PREVIEW && params.has("encore")));
  function encoreOpen() { return encoreVisible() && now() >= unlockAt(EP); }
  const SEEN = (TEST ? "bday-encore-test" : "bday-encore") + "-revealed";
  let encoreState = "";

  // can this browser change audio volume? (iPhones can't — there the song pauses instead of dipping)
  const canSetVolume = (() => { try { const t = new Audio(); t.volume = 0.5; return Math.abs(t.volume - 0.5) < 0.01; } catch (e) { return false; } })();

  if (EP) {
    const K = EP.card || {};
    $("#enc-eyebrow").textContent = K.eyebrow || "";
    $("#enc-title").textContent = K.title || "One More Thing…";
    $("#enc-sub").textContent = K.sub || "";
    $("#enc-what").textContent = K.locked || "";
    $("#enc-pill").textContent = K.pill || "";
    $("#enc-begin").textContent = K.begin || "begin";
    $("#enc-date").textContent = fmt(unlockAt(EP), { day: "numeric", month: "long" }) + " · " + fmt(unlockAt(EP), { hour: "numeric", minute: "2-digit", hour12: true });
    // the whole card (and its button) opens it once it's unlocked
    $("#enc-card").addEventListener("click", () => { if (encoreOpen() && $("#enc-card").classList.contains("is-open")) { location.hash = "encore"; route(); } });
  }

  // the card's own little moment at 11:55: the lock fades, two lines appear, then "begin"
  function revealEncore(animate) {
    const card = $("#enc-card");
    const [l1, l2] = (EP.reveal || []);
    $(".enc-r1").textContent = l1 || ""; $(".enc-r2").textContent = l2 || "";
    let seen = false; try { seen = localStorage.getItem(SEEN) === "1"; } catch (e) {}
    if (!animate || seen) { card.className = "enc-card is-open"; return; }
    card.className = "enc-card is-revealing";
    setTimeout(() => card.classList.add("r1"), 900);
    setTimeout(() => card.classList.add("r2"), 3600);
    setTimeout(() => { card.className = "enc-card is-open just"; try { localStorage.setItem(SEEN, "1"); } catch (e) {} }, 7200);
  }
  function tickEncore() {
    if (!EP) return;
    const st = !encoreVisible() ? "hidden" : encoreOpen() ? "open" : "locked";
    if (st !== encoreState) {
      const prev = encoreState; encoreState = st;
      encoreSec.hidden = st === "hidden";
      if (prev === "hidden" || prev === "") { encoreSec.classList.remove("appear"); void encoreSec.offsetWidth; encoreSec.classList.add("appear"); }
      if (st === "locked") $("#enc-card").className = "enc-card is-locked";
      if (st === "open") revealEncore(true);
    }
    if (st === "locked") $("#enc-count").textContent = countdown(unlockAt(EP) - now());
    if (st !== "hidden" && current < 0 && now() >= unlockAt(EP) - 60 * 60e3) prefetchEncore();   // get it ready during the last hour
  }

  /* --- download everything ahead, like Part II, so it plays without a single stutter --- */
  const epUrl = {}; let epPrefetching = null;
  function prefetchEncore() {
    if (epPrefetching || !EP) return epPrefetching;
    if (LOCAL_FILE) return (epPrefetching = Promise.resolve());
    const list = [EP.then.src, EP.now.src, EP.after.poster, EP.message.src, EP.after.src, EP.song].filter(Boolean);
    epPrefetching = (async () => { for (const src of list) { const u = await grab(src); if (u) epUrl[src] = u; } })();
    return epPrefetching;
  }
  const epSrc = (src) => epUrl[src] || src;

  /* --- the scene --- */
  const L = (id) => $("#" + id);
  const layers = ["ep-title", "ep-tn", "ep-inf", "ep-msg", "ep-credits", "ep-standout", "ep-tbc", "ep-after", "ep-final"];
  let epRun = 0, epMusic = null;
  const msgV = $("#ep-msg-video"), afterV = $("#ep-after-video");

  function epAlign() {
    // lay out Then → Now so both photos share the same face positions
    const vw = innerWidth, vh = innerHeight;
    const Fh = Math.min(vh * 0.72, vw * 0.9 * 16 / 9), Fw = Fh * 9 / 16;
    const Lf = (vw - Fw) / 2, Tf = (vh - Fh) / 2 - vh * 0.03;
    const thenImg = $("#ep-then"), nowImg = $("#ep-now");
    Object.assign(thenImg.style, { left: Lf + "px", top: Tf + "px", width: Fw + "px", height: Fh + "px" });
    const W = nowImg.naturalWidth || 1200, H = nowImg.naturalHeight || 1600;
    const [a1, a2] = EP.then.faces, [b1, b2] = EP.now.faces;
    const P1 = [Lf + a1[0] * Fw, Tf + a1[1] * Fh], P2 = [Lf + a2[0] * Fw, Tf + a2[1] * Fh];
    const Q1 = [b1[0] * W, b1[1] * H], Q2 = [b2[0] * W, b2[1] * H];
    const s = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]) / Math.hypot(Q2[0] - Q1[0], Q2[1] - Q1[1]);
    const mx = (P1[0] + P2[0]) / 2, my = (P1[1] + P2[1]) / 2, qx = (Q1[0] + Q2[0]) / 2, qy = (Q1[1] + Q2[1]) / 2;
    const aligned = `translate(${mx - qx * s}px, ${my - qy * s}px) scale(${s})`;
    // final framing leaves room above for "Look how far we've come." and below for the year
    const e = Math.min((vw * 0.9) / W, (vh * 0.6) / H);
    const fit = `translate(${(vw - W * e) / 2}px, ${vh * 0.5 - (H * e) / 2}px) scale(${e})`;
    Object.assign(nowImg.style, { width: W + "px", height: H + "px" });
    $("#ep-tn-wrap").style.transformOrigin = `${mx}px ${my}px`;
    return { aligned, fit };
  }
  function rollYear(elm, to) {
    const from = elm.textContent;
    elm.innerHTML = [...to].map((d, i) => d === from[i] ? `<b>${d}</b>` : `<b class="roll"><i>${from[i] || ""}</i><i>${d}</i></b>`).join("");
  }
  function duck(on) {
    if (!epMusic) return;
    if (canSetVolume) fadeTo(epMusic, on ? (EP.duckTo ?? 0.04) : (EP.musicVolume ?? 0.9), on ? 1800 : 2600);
    else if (on) epMusic.pause(); else epMusic.play().catch(() => {});
  }
  function swell(level, ms) { if (epMusic && canSetVolume) fadeTo(epMusic, level, ms); }

  function resetScene() {
    layers.forEach((id) => L(id).classList.remove("on"));
    ["ep-tn", "ep-inf", "ep-credits", "ep-after", "ep-msg"].forEach((id) => L(id).className = "ep-layer " + id);
    msgV.pause(); afterV.pause();
    $("#ep-msg-play").hidden = true;
    $("#ep-now").style.transition = "none"; $("#ep-now").style.opacity = ""; $("#ep-tn-wrap").style.transition = "none"; $("#ep-tn-wrap").style.transform = "";
  }

  async function playEpilogue() {
    const run = ++epRun;
    const w = (ms) => new Promise((res, rej) => setTimeout(() => (run === epRun ? res() : rej(new Error("stop"))), ms));
    const alive = () => { if (run !== epRun) throw new Error("stop"); };
    const on = (id) => L(id).classList.add("on"), off = (id) => L(id).classList.remove("on");
    resetScene();
    try {
      // music: in from the configured point; loops for the whole scene
      epMusic = playSong(epSrc(EP.song), true, toSec(EP.songStart));
      if (epMusic && canSetVolume) setTimeout(() => swell(EP.musicVolume ?? 0.9, 1500), 2300);

      // 1. title
      await w(1400); on("ep-title"); await w(4600); off("ep-title"); await w(1600);

      // 2–3. Then → Now
      const nowImg = $("#ep-now");
      if (!nowImg.complete) await new Promise((r) => { nowImg.onload = nowImg.onerror = r; setTimeout(r, 4000); }); alive();
      const pos = epAlign();
      nowImg.style.transform = pos.aligned; void nowImg.offsetWidth;
      nowImg.style.transition = "opacity 3.2s ease";
      $("#ep-year").textContent = EP.then.year; $("#ep-tag").textContent = EP.then.label;
      on("ep-tn"); await w(1600);
      L("ep-tn").classList.add("push");                                   // slow push-in on the 2017 photo
      $("#ep-tn-wrap").style.transition = "transform 9s linear"; $("#ep-tn-wrap").style.transform = "scale(1.07)";
      await w(4200);
      L("ep-tn").classList.add("dissolve");                               // match dissolve into now
      rollYear($("#ep-year"), EP.now.year); $("#ep-tag").textContent = EP.now.label;
      await w(3300);
      nowImg.style.transition = "opacity 3.2s ease, transform 5s cubic-bezier(.45,0,.2,1)"; nowImg.style.transform = pos.fit;   // pull back to reveal all of now
      $("#ep-tn-wrap").style.transition = "transform 5s cubic-bezier(.45,0,.2,1)"; $("#ep-tn-wrap").style.transform = "scale(1)";
      L("ep-tn").classList.add("settled");
      await w(3000); L("ep-tn").classList.add("far"); await w(6000);
      off("ep-tn"); await w(1800);

      // 4. 8 → ∞
      on("ep-inf"); await w(2800);
      L("ep-inf").classList.add("tilt"); await w(2200);
      L("ep-inf").classList.add("b"); await w(4200);
      off("ep-inf"); await w(1600);

      // 5. your recorded video — the song dips to almost nothing
      msgV.src = epSrc(EP.message.src); msgV.muted = false; msgV.currentTime = 0;
      duck(true);
      on("ep-msg"); await w(900);
      const ended = new Promise((r) => { msgV.onended = r; });
      try { await msgV.play(); } catch (e) { $("#ep-msg-play").hidden = false; await new Promise((r) => { $("#ep-msg-play").onclick = () => { $("#ep-msg-play").hidden = true; msgV.play().catch(() => {}); r(); }; }); }
      alive();
      await Promise.race([ended, new Promise((_, rej) => { const iv = setInterval(() => { if (run !== epRun) { clearInterval(iv); rej(new Error("stop")); } }, 300); ended.then(() => clearInterval(iv)); })]);
      await w(1800);                                                      // hold on your last frame a moment…
      off("ep-msg"); await w(2600);                                       // …then a quiet, dark pause to let it sink in
      duck(false); swell((EP.musicVolume ?? 0.9) * 0.6, 3000);            // the song returns, gently
      await w(1200);

      // 6. credits, then the standout line on its own
      on("ep-credits"); const roll = $("#ep-roll");
      const dist = roll.offsetHeight + innerHeight;
      roll.style.transition = "none"; roll.style.transform = `translateY(${innerHeight}px)`; void roll.offsetWidth;
      roll.style.transition = `transform ${EP.creditsSeconds || 30}s linear`; roll.style.transform = `translateY(${innerHeight - dist}px)`;
      await w((EP.creditsSeconds || 30) * 1000);
      off("ep-credits"); on("ep-standout"); await w(7500); off("ep-standout"); await w(1800);

      // 7. To Be Continued…
      on("ep-tbc"); await w(7000); off("ep-tbc"); await w(3000);

      // 8. after-credits: "wait… one more scene" → she taps → the clip, with the song swelling over it
      on("ep-after"); await w(1400); L("ep-after").classList.add("card");
      afterV.src = epSrc(EP.after.src);
      await new Promise((r) => { $("#ep-after-card").onclick = () => r(); }); alive();
      L("ep-after").classList.add("playing");
      swell(1, 2500);
      const done = new Promise((r) => { afterV.onended = r; });
      afterV.currentTime = 0; afterV.play().catch(() => {});
      await done; alive(); await w(1500);
      off("ep-after"); await w(1600);

      // 9. the end
      swell(EP.musicVolume ?? 0.9, 2000);
      on("ep-final");
    } catch (e) { /* left the scene, or "play again" */ }
  }

  function enterEncore() {
    if (homeTrack) { homeTrack.onended = null; homeTrack = null; }
    // prime the videos with this tap so phones let them play later (with sound for your message)
    msgV.src = epSrc(EP.message.src); msgV.poster = EP.message.poster || "";
    msgV.muted = true; const p = msgV.play(); if (p) p.then(() => { msgV.pause(); msgV.muted = false; }).catch(() => { msgV.muted = false; });
    afterV.src = epSrc(EP.after.src);
    $("#ep-after-poster").src = epSrc(EP.after.poster);
    $("#ep-then").src = epSrc(EP.then.src); $("#ep-now").src = epSrc(EP.now.src);
    park(bg); Object.values(songCache).forEach((x) => { if (x.getAttribute("src") !== epSrc(EP.song)) park(x); });
    prefetchEncore();
    playEpilogue();
  }
  function leaveEncore() {
    epRun++;
    // the song keeps playing on the home screen (no more looping); when it ends, bg.mp3 takes over
    if (epMusic && audio === epMusic && !epMusic.paused) {
      const t = epMusic; t.loop = false; homeTrack = t; audio = null;
      t.onended = () => { if (homeTrack === t) { homeTrack = null; t.onended = null; bgResume(); } };
    }
    resetScene();
  }

  if (EP) {
    $("#ep-title-eyebrow").textContent = EP.titleEyebrow || "";
    $("#ep-title-text").textContent = EP.title || "";
    $("#ep-far").textContent = EP.farLine || "";
    $("#ep-inf-a").textContent = EP.infA || ""; $("#ep-inf-b").textContent = EP.infB || "";
    $("#ep-roll").innerHTML = (EP.credits || []).map(([r, n]) => `<div class="cr"><span class="cr-role">${esc(r)}</span><span class="cr-name">${esc(n)}</span></div>`).join("");
    $("#ep-standout-text").textContent = EP.standout || "";
    $("#ep-tbc-title").textContent = (EP.tbc || {}).title || ""; $("#ep-tbc-line").textContent = (EP.tbc || {}).line || ""; $("#ep-tbc-foot").textContent = (EP.tbc || {}).foot || "";
    $("#ep-wait").textContent = EP.afterLine || "";
    $("#ep-final-line").textContent = EP.finalLine || "";
    $("#ep-again").addEventListener("click", () => { playEpilogue(); });
    $("#ep-home").addEventListener("click", () => { location.hash = ""; route(); });
    msgV.addEventListener("timeupdate", () => { if (msgV.duration) $("#ep-msg-bar").style.width = (msgV.currentTime / msgV.duration) * 100 + "%"; });
    msgV.addEventListener("click", () => { msgV.paused ? msgV.play().catch(() => {}) : msgV.pause(); });   // tap to pause / resume
    tickEncore(); setInterval(tickEncore, 1000);
  }

  route();
})();
