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

  function playSong(src, loop, start = 0) {
    stopSong(true);
    if (!src) return null;
    const a = new Audio(src);
    a.preload = "auto"; a.volume = 0;
    audio = a;
    // each time the section is opened, begin at the configured start time
    try { a.currentTime = start; } catch (e) {}
    a.addEventListener("loadedmetadata", () => {
      if (start > 0 && start < a.duration && Math.abs(a.currentTime - start) > 0.5) { try { a.currentTime = start; } catch (e) {} }
    }, { once: true });
    a.loop = loop; // when the song finishes it loops from 0:00
    a.addEventListener("error", () => { if (audio === a) musicBtn.style.display = "none"; });
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

  /* ---------------- home / posters ---------------- */
  $("#home-name").textContent = C.herName;
  $("#home-sub").textContent = fmt(new Date(C.birthday + "T12:00:00" + C.timezone).getTime(), { day: "numeric", month: "long", year: "numeric" });

  const lockSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#d9b26f" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const posters = C.parts.map((p, i) => {
    const b = el("button", "poster locked");
    b.type = "button";
    b.innerHTML = `
      <div class="poster-art" style="background-image:url('${p.poster}')"></div>
      <span class="poster-lock">${lockSvg}</span>
      <div class="poster-body">
        <div class="poster-kicker">${esc(p.kicker)}</div>
        <div class="poster-title">${esc(p.title)}</div>
        <p class="poster-tag">${esc(p.tagline)}</p>
        <div class="poster-meta"><span class="poster-when">${fmt(unlockAt(p), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}</span><span class="poster-status"></span></div>
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
      $(".poster-status", b).textContent = open ? "now showing ▸" : "opens in " + countdown(unlockAt(C.parts[i]) - now());
      if (open && wasOpen[i] === false) { b.classList.add("just-opened"); setTimeout(() => b.classList.remove("just-opened"), 1700); }
      wasOpen[i] = open;
    });
  }
  tickPosters();
  setInterval(tickPosters, 1000);

  /* ---------------- routing ---------------- */
  const scenes = [0, 1, 2].map((i) => $("#scene-" + i));
  const enter = [enterOne, enterTwo, enterThree];
  const leave = [leaveOne, leaveTwo, leaveThree];
  let current = -1;

  function route() {
    const m = location.hash.match(/^#part([123])$/);
    const idx = m ? Number(m[1]) - 1 : -1;
    if (idx >= 0 && !isOpen(idx)) { history.replaceState(null, "", location.pathname + location.search); return route(); }
    if (idx === current) return;
    if (current >= 0) { leave[current](); scenes[current].hidden = true; }
    current = idx;
    $("#home").hidden = idx >= 0;
    document.body.style.overflow = idx >= 0 ? "hidden" : "";
    if (idx >= 0) { scenes[idx].hidden = false; scenes[idx].scrollTop = 0; enter[idx](); }
    else stopSong();
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

  function enterOne() {
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
      }
    }
  }
  window.addEventListener("resize", () => { if (current === 0 && !$("#scratch").classList.contains("done")) initScratch(); });

  /* =========================================================
     PART II — the film (synced to the song's clock)
     ========================================================= */
  const P2 = C.part2;
  const stage = $("#film-stage"), filmScene = $("#scene-1"), bar = $("#film-bar"), playBtn = $("#film-play");
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const START_SEC = 4;
  let items = [], total = 0, idx = -1, raf = 0, playing = false, ended = false;
  let internalT = 0, lastFrame = 0, useAudioClock = false, idleTimer = null;

  function build(duration) {
    const groups = [];
    P2.media.forEach((m) => {
      const year = m.src.slice(0, 4);
      let g = groups[groups.length - 1];
      if (!g || g.year !== year) groups.push((g = { year, media: [] }));
      g.media.push(m);
    });
    const fixed = START_SEC + groups.length * P2.titleCardSeconds + P2.endCardSeconds;
    const per = Math.max(2.8, (duration - fixed) / P2.media.length);
    const list = [{ type: "start", d: START_SEC }];
    groups.forEach((g, gi) => {
      list.push({ type: "title", year: g.year, ch: ROMAN[gi] || gi + 1, d: P2.titleCardSeconds });
      g.media.forEach((m) => list.push({ type: /\.mp4$/i.test(m.src) ? "video" : "photo", year: g.year, src: "assets/photos/" + m.src, caption: m.caption || "", d: per }));
    });
    list.push({ type: "end", d: P2.endCardSeconds });
    let t = 0; list.forEach((it) => { it.t0 = t; t += it.d; });
    items = list; total = t;
  }

  const clock = () => (useAudioClock && audio ? Math.max(0, audio.currentTime - songStart(1)) : internalT);
  function seek(t) {
    t = Math.max(0, Math.min(total - 0.05, t));
    if (useAudioClock && audio) { try { audio.currentTime = songStart(1) + t; } catch (e) {} }
    internalT = t;
    ended = false;
    const k = indexAt(t);
    if (k !== idx) { idx = k; render(k); }
  }
  const indexAt = (t) => { for (let k = items.length - 1; k >= 0; k--) if (t >= items[k].t0) return k; return 0; };

  function render(k) {
    const it = items[k];
    const s = el("div", "slide");
    if (it.type === "photo" || it.type === "video") {
      if (k % 2) s.classList.add("alt");
      s.style.setProperty("--dur", it.d + 1.4 + "s");
      s.appendChild(Object.assign(el("div", "slide-bg"), { style: it.type === "photo" ? `background-image:url('${it.src}')` : "background:#000" }));
      const inner = el("div", "slide-inner");
      if (it.type === "photo") inner.appendChild(Object.assign(el("img", "slide-fg"), { src: it.src, alt: it.caption || "" }));
      else {
        const v = Object.assign(el("video", "slide-fg"), { src: it.src, muted: true, loop: true, autoplay: true, playsInline: true });
        v.setAttribute("playsinline", ""); inner.appendChild(v); v.play().catch(() => {});
      }
      if (it.caption) inner.appendChild(el("div", "slide-cap", esc(it.caption)));
      s.appendChild(inner);
      s.appendChild(el("div", "slide-year", it.year));
    } else if (it.type === "title") {
      s.classList.add("slide-title");
      const sub = (P2.years && P2.years[it.year]) || "";
      s.appendChild(el("div", "", `<div class="ch">Chapter ${it.ch}</div><div class="yr">${it.year}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}`));
    } else if (it.type === "start") {
      s.classList.add("slide-start");
      s.appendChild(el("div", "", `<p class="eyebrow">${esc(C.parts[1].kicker)}</p><h3>${esc(C.parts[1].title)}</h3><p>${esc(C.parts[1].tagline)}</p>`));
    } else {
      s.classList.add("slide-end");
      const inner = el("div", "", `<h3>${esc(P2.endTitle)}</h3><p>${esc(P2.endLine)}</p>`);
      const again = el("button", "ghost", "watch again"); again.type = "button";
      again.addEventListener("click", (e) => { e.stopPropagation(); seek(0); if (!playing) toggle(); if (audio && audio.paused) audio.play().catch(() => {}); });
      inner.appendChild(again); s.appendChild(inner);
    }
    stage.appendChild(s);
    void s.offsetWidth; s.classList.add("on");
    const old = [...stage.children].filter((c) => c !== s);
    old.forEach((o) => o.classList.add("leaving")); // captions & year label leave immediately
    setTimeout(() => old.forEach((o) => o.remove()), 1300);
    // preload upcoming photos
    items.slice(k + 1, k + 4).forEach((n) => { if (n.type === "photo") new Image().src = n.src; });
  }

  function frame(ts) {
    const dt = lastFrame ? (ts - lastFrame) / 1000 : 0; lastFrame = ts;
    if (playing && !useAudioClock) internalT += dt;
    let t = clock();
    if (t >= total - 0.05) { t = total - 0.05; if (!ended) { ended = true; } }
    const k = indexAt(t);
    if (k !== idx) { idx = k; render(k); }
    bar.style.width = (t / total) * 100 + "%";
    raf = requestAnimationFrame(frame);
  }

  function toggle() {
    playing = !playing;
    playBtn.textContent = playing ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    if (audio) playing ? audio.play().catch(() => {}) : audio.pause();
    poke();
  }
  function poke() {
    filmScene.classList.remove("idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (playing) filmScene.classList.add("idle"); }, 2600);
  }

  function enterTwo() {
    stage.innerHTML = ""; idx = -1; internalT = 0; lastFrame = 0; ended = false; useAudioClock = false;
    build(P2.songSeconds);
    playing = true; playBtn.textContent = "❚❚";
    const S = songStart(1);
    const a = playSong(C.parts[1].song, false, S);
    if (a) {
      a.addEventListener("loadedmetadata", () => {
        if (isFinite(a.duration) && a.duration - S > 30) { build(a.duration - S); useAudioClock = true; try { a.currentTime = S + internalT; } catch (e) {} idx = -1; }
      });
      a.addEventListener("error", () => { useAudioClock = false; });
    }
    raf = requestAnimationFrame(frame);
    poke();
  }
  function leaveTwo() { cancelAnimationFrame(raf); clearTimeout(idleTimer); playing = false; stage.innerHTML = ""; }

  playBtn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  $("#film-prev").addEventListener("click", (e) => { e.stopPropagation(); seek(items[Math.max(0, idx - 1)].t0 + 0.01); poke(); });
  $("#film-next").addEventListener("click", (e) => { e.stopPropagation(); seek(items[Math.min(items.length - 1, idx + 1)].t0 + 0.01); poke(); });
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
    const endAt = 1200 + (lines.length - 1) * step + 1800;
    reelTimers.push(setTimeout(() => $("#p3-sign").classList.add("in"), endAt));
    reelTimers.push(setTimeout(() => ($("#reel-replay").hidden = false), endAt + 2500));
  }
  function enterThree() {
    $("#p3-img").src = P3.photo;
    $("#p3-sign").textContent = P3.signoff;
    playSong(C.parts[2].song, true, songStart(2));
    runReel();
  }
  function leaveThree() { reelTimers.forEach(clearTimeout); }
  $("#reel-replay").addEventListener("click", runReel);

  route();
})();
