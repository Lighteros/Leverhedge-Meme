/* Leverhedge — desk script. No external calls. */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const BULL = '#2ee68c', BEAR = '#ff3d55';

  /* ---------- copy CA (TBA => soon flash) ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const txt = $(b.dataset.copy).textContent.trim();
    if (b.dataset.soon) { b.textContent = 'Soon'; b.classList.add('soon-flash'); setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('soon-flash'); }, 1400); return; }
    navigator.clipboard?.writeText(txt).then(() => { b.textContent = 'Copied ✓'; setTimeout(() => b.textContent = 'Copy', 1400); });
  });

  /* ---------- desk clock (New York session) ---------- */
  const clock = $('#clock');
  const tick = () => { try { clock.textContent = 'NY ' + new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false }) + ' · DESK OPEN'; } catch (_) {} };
  tick(); setInterval(tick, 1000);

  /* ---------- candle engine ---------- */
  function makeSeries(n, start = 100, vol = 1) {
    const out = []; let p = start;
    for (let i = 0; i < n; i++) out.push(nextCandle(p, vol)), p = out[i].c;
    return out;
  }
  function nextCandle(p, vol, drift = 0) {
    const o = p, c = Math.max(5, o + (Math.random() - .5 + drift) * 4 * vol);
    return { o, c, h: Math.max(o, c) + Math.random() * 2 * vol, l: Math.min(o, c) - Math.random() * 2 * vol };
  }
  function drawCandles(ctx, w, h, data, opts = {}) {
    const pad = opts.pad ?? 10, n = data.length;
    let hi = -Infinity, lo = Infinity; data.forEach(d => { hi = Math.max(hi, d.h); lo = Math.min(lo, d.l); });
    const y = v => pad + (hi - v) / (hi - lo || 1) * (h - pad * 2);
    const cw = w / n;
    ctx.clearRect(0, 0, w, h);
    if (opts.grid) { ctx.strokeStyle = 'rgba(241,238,231,.06)'; ctx.lineWidth = 1; for (let g = 1; g < 6; g++) { ctx.beginPath(); ctx.moveTo(0, h * g / 6); ctx.lineTo(w, h * g / 6); ctx.stroke(); } }
    data.forEach((d, i) => {
      const x = i * cw + cw / 2, up = d.c >= d.o; ctx.strokeStyle = ctx.fillStyle = up ? BULL : BEAR;
      ctx.globalAlpha = opts.alpha ?? 1;
      ctx.beginPath(); ctx.moveTo(x, y(d.h)); ctx.lineTo(x, y(d.l)); ctx.lineWidth = Math.max(1, cw * .12); ctx.stroke();
      const top = y(Math.max(d.o, d.c)), bh = Math.max(1.5, Math.abs(y(d.o) - y(d.c)));
      ctx.fillRect(x - cw * .32, top, cw * .64, bh);
    });
    ctx.globalAlpha = 1;
    if (opts.liq) { const ly = y(opts.liq); if (ly > 0 && ly < h) { ctx.setLineDash([6, 6]); ctx.strokeStyle = BEAR; ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = BEAR; ctx.font = `600 ${11 * DPR}px "Martian Mono",monospace`; ctx.fillText('LIQ', 8, ly - 6); } }
    return { y, hi, lo };
  }
  function fit(cv) { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, r.width * DPR); cv.height = Math.max(1, r.height * DPR); return cv.getContext('2d'); }

  /* background tape */
  const tape = $('#tape'); let tctx = fit(tape); let tdata = makeSeries(90, 100, 1.4);
  /* hero monitor */
  const hc = $('#heroChart'); let hctx = fit(hc); let hdata = makeSeries(36, 100, 1);
  addEventListener('resize', () => { tctx = fit(tape); hctx = fit(hc); drawBG(); });
  function drawBG() { drawCandles(tctx, tape.width, tape.height, tdata, { alpha: .18, pad: tape.height * .25 }); drawCandles(hctx, hc.width, hc.height, hdata, { grid: true, pad: 14 * DPR }); }
  drawBG();
  if (!RM) setInterval(() => { tdata.push(nextCandle(tdata.at(-1).c, 1.4, .02)); tdata.shift(); hdata.push(nextCandle(hdata.at(-1).c, 1, .04)); hdata.shift(); drawBG(); }, 1100);

  /* ---------- THE LEVER ---------- */
  const svg = $('#leverSvg'), arm = $('#arm'), notches = $('#notches');
  const PX = 160, PY = 408, R = 300, AMIN = -28, AMAX = 28;
  const levOut = $('#levOut'), hedgeOut = $('#hedgeOut'), liqOut = $('#liqOut'), spineOut = $('#spineOut'), moodOut = $('#moodOut'), pnlOut = $('#pnlOut');
  const marks = [1, 2, 5, 10, 25, 50, 100];
  const angToT = a => (a - AMIN) / (AMAX - AMIN);
  const tToLev = t => Math.max(1, Math.round(1 + 99 * Math.pow(t, 2.2)));
  const levToT = l => Math.pow((l - 1) / 99, 1 / 2.2);
  marks.forEach(m => {
    const a = (AMIN + levToT(m) * (AMAX - AMIN)) * Math.PI / 180;
    const x1 = PX + Math.sin(a) * (R - 6), y1 = PY - Math.cos(a) * (R - 6), x2 = PX + Math.sin(a) * (R + 10), y2 = PY - Math.cos(a) * (R + 10);
    const ns = 'http://www.w3.org/2000/svg';
    const ln = document.createElementNS(ns, 'line'); ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2); notches.appendChild(ln);
    const tx = document.createElementNS(ns, 'text'); tx.setAttribute('x', PX + Math.sin(a) * (R + 26)); tx.setAttribute('y', PY - Math.cos(a) * (R + 26) + 3); tx.setAttribute('text-anchor', 'middle'); tx.textContent = m + 'x';
    if (m >= 50) tx.setAttribute('style', 'fill:#ff3d55'); notches.appendChild(tx);
  });

  let angle = AMIN, target = AMIN, lev = 1, liquidated = false, liqTimer = null;
  const gauge = $('#gauge'), gctx = gauge.getContext('2d');
  function drawGauge(t) {
    const w = gauge.width, h = gauge.height, cx = w / 2, cy = h - 30, r = Math.min(w / 2 - 30, h - 50);
    gctx.clearRect(0, 0, w, h);
    const seg = 40;
    for (let i = 0; i < seg; i++) {
      const a0 = Math.PI + i / seg * Math.PI, a1 = a0 + Math.PI / seg * .7, k = i / seg;
      gctx.beginPath(); gctx.arc(cx, cy, r, a0, a1); gctx.lineWidth = 22;
      const col = k < .5 ? BULL : k < .75 ? '#d8b27a' : BEAR;
      gctx.strokeStyle = k <= t ? col : 'rgba(241,238,231,.08)'; gctx.stroke();
    }
    const na = Math.PI + t * Math.PI;
    gctx.beginPath(); gctx.moveTo(cx, cy); gctx.lineTo(cx + Math.cos(na) * (r - 34), cy + Math.sin(na) * (r - 34)); gctx.lineWidth = 5; gctx.strokeStyle = '#f1eee7'; gctx.lineCap = 'round'; gctx.stroke();
    gctx.beginPath(); gctx.arc(cx, cy, 12, 0, Math.PI * 2); gctx.fillStyle = '#f1eee7'; gctx.fill();
    gctx.fillStyle = '#9b968c'; gctx.font = '600 16px "Martian Mono",monospace'; gctx.textAlign = 'left'; gctx.fillText('HEDGED', 14, h - 6); gctx.textAlign = 'right'; gctx.fillText('"HEDGED"', w - 14, h - 6);
  }
  const pnl = $('#pnl'), pctx = pnl.getContext('2d'); let pdata = makeSeries(48, 100, .6); let entry = pdata.at(-1).c;
  function drawPnl() {
    const last = pdata.at(-1).c, liqPx = entry * (1 - 1 / lev);
    drawCandles(pctx, pnl.width, pnl.height, pdata, { grid: true, pad: 16, liq: lev > 1 ? liqPx : null });
    const pct = ((last - entry) / entry) * lev * 100;
    pnlOut.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'; pnlOut.style.color = pct >= 0 ? BULL : BEAR;
    if (!liquidated && lev > 1 && last <= liqPx) liquidate();
  }
  function setLev(l) {
    lev = l; const t = levToT(l);
    levOut.textContent = l + 'x'; levOut.classList.toggle('hot', l >= 50);
    svg.setAttribute('aria-valuenow', l); svg.setAttribute('aria-valuetext', l + 'x');
    hedgeOut.textContent = l === 1 ? 'unhedged (sober)' : l < 5 ? 'lightly "hedged"' : l < 25 ? 'hedged (with leverage)' : l < 50 ? 'extremely hedged' : l < 100 ? 'hedge maxi' : 'fully hedged (lol)';
    liqOut.textContent = l === 1 ? '100%' : (100 / l).toFixed(l >= 50 ? 1 : 0) + '%';
    spineOut.textContent = l < 5 ? 'relaxed' : l < 25 ? 'perked' : l < 50 ? 'bristling' : 'FULL PORCUPINE';
    moodOut.textContent = l < 5 ? 'coffee' : l < 25 ? 'two coffees' : l < 50 ? 'sweaty paws' : l < 100 ? 'praying' : 'curled in a ball';
    drawGauge(t); drawPnl();
    if (l >= 100 && !liquidated) { clearTimeout(liqTimer); liqTimer = setTimeout(() => lev >= 100 && liquidate(), 1800); }
  }
  function render() {
    angle += (target - angle) * (RM ? 1 : .22);
    if (Math.abs(target - angle) < .05) angle = target;
    arm.style.transform = `rotate(${angle}deg)`;
    const l = tToLev(angToT(angle)); if (l !== lev) setLev(l);
    requestAnimationFrame(render);
  }
  function svgPoint(e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  let dragging = false;
  svg.addEventListener('pointerdown', e => { dragging = true; svg.classList.add('dragging'); svg.setPointerCapture(e.pointerId); move(e); });
  svg.addEventListener('pointermove', e => dragging && move(e));
  const up = () => { dragging = false; svg.classList.remove('dragging'); };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  function move(e) { const p = svgPoint(e); const a = Math.atan2(p.x - PX, PY - p.y) * 180 / Math.PI; target = Math.max(AMIN, Math.min(AMAX, a)); }
  svg.addEventListener('keydown', e => {
    const step = (AMAX - AMIN) / 30;
    if (['ArrowRight', 'ArrowUp'].includes(e.key)) target = Math.min(AMAX, target + step);
    else if (['ArrowLeft', 'ArrowDown'].includes(e.key)) target = Math.max(AMIN, target - step);
    else if (e.key === 'Home') target = AMIN; else if (e.key === 'End') target = AMAX; else return;
    e.preventDefault();
  });
  $('#levReset').addEventListener('click', () => { target = AMIN; });
  $('#levMax').addEventListener('click', () => { target = AMAX; });
  const liqEl = $('#liq');
  function liquidate() {
    liquidated = true; liqEl.hidden = false; document.body.classList.add('liquidated'); $('#liqClose').focus();
  }
  $('#liqClose').addEventListener('click', () => {
    liqEl.hidden = true; document.body.classList.remove('liquidated'); liquidated = false; target = AMIN;
    pdata = makeSeries(48, 100, .6); entry = pdata.at(-1).c; svg.focus();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !liqEl.hidden) $('#liqClose').click(); });
  setInterval(() => {
    if (liquidated) return;
    const vol = .6 + Math.log10(lev) * .35, drift = lev >= 50 ? -.08 : lev > 20 ? -.01 : .03;
    pdata.push(nextCandle(pdata.at(-1).c, vol, drift)); pdata.shift(); drawPnl();
  }, RM ? 2000 : 650);
  setLev(1); requestAnimationFrame(render);

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* ---------- nav active ---------- */
  const links = $$('.nav-links a');
  const so = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  ['lore', 'lever', 'manual', 'ticket', 'vault'].forEach(id => { const s = document.getElementById(id); s && so.observe(s); });

  /* ---------- Lenis + GSAP ---------- */
  if (RM) return;
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: .1, smoothWheel: true });
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -90 }); } }));
  }
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    gsap.from('.wordmark', { opacity: 0, y: 30, duration: 1, ease: 'expo.out' });
    gsap.from('.slogan:not(.sm), .lede, .ca, .hero .cta-row, .chips', { opacity: 0, y: 24, duration: .9, stagger: .08, delay: .15, ease: 'expo.out' });
    gsap.from('.hero-art .hog', { opacity: 0, scale: .94, rotate: -2, duration: 1.2, ease: 'expo.out' });
    gsap.from('.hud', { opacity: 0, scale: .6, stagger: .1, delay: .6, duration: .5, ease: 'back.out(2)' });
    gsap.to('.hero-art .hog', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.monitor', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    $$('h2[data-split]').forEach(h => gsap.from(h, { clipPath: 'inset(0 0 100% 0)', y: 40, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } }));
    gsap.from('.rig .panel', { y: 60, opacity: 0, stagger: .12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.rig', start: 'top 80%' } });
    gsap.from('.stamp', { scale: 3, opacity: 0, rotate: 20, duration: .5, ease: 'power4.in', scrollTrigger: { trigger: '.ticket', start: 'top 60%' } });
    gsap.from('.slot', { opacity: 0, y: 30, stagger: .06, duration: .6, scrollTrigger: { trigger: '.vault-grid', start: 'top 85%' } });
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const cards = $('#cards');
      const dist = () => Math.max(0, cards.scrollWidth - innerWidth);
      gsap.to(cards, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.manual', start: 'top top', end: () => '+=' + dist(), pin: '.manual-pin', scrub: .6, invalidateOnRefresh: true } });
    });
    mm.add('(max-width: 900px)', () => { $('#cards').style.flexWrap = 'wrap'; $('#cards').style.width = 'auto'; });
  }
})();
