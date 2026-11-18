// The opening, second half. The CSS has already shown the P and launched its I (yellow, with a red dot) up out of the
// counter; it falls and lands far back on the ground, a receding line grid after Superstudio's supersurface and Trevor
// Jackson's op-art sleeves for Soulwax. Here the I skips forward across the ground toward you, leaving a letter where it
// lands each time, C O N N E C T, until the word lifts off the ground and fills the screen as the app arrives.
// app.js decides whether the opening plays at all (Calm skips it, Off removes it) and when it leaves.
(() => {
  'use strict';
  const sp = document.getElementById('splash');
  if (!sp || !sp.classList.contains('rk') || !Element.prototype.animate) return;
  const W = () => innerWidth, H = () => innerHeight, HOR = 0.6; // the horizon, as a share of the height
  const ii = sp.querySelector('.rk-i');
  // Where the falling I lands: the far middle of the ground, just under the horizon.
  const place = () => { const r = ii.getBoundingClientRect(); sp.style.setProperty('--landx', (W() / 2 - (r.left + r.width / 2)) + 'px'); sp.style.setProperty('--landy', (H() * (HOR + 0.03) - (r.top + r.height / 2)) + 'px'); };
  place();
  const WORD = 'CONNECT', F = Math.min(W() * 0.15, 220); // the final size: the word spans most of the screen
  const ground = (t) => H() * HOR + (H() * (1 - HOR) - 30) * t; // depth 0 = horizon, 1 = at your feet
  const spots = [...WORD].map((_, i) => { const t = 0.08 + i * 0.13; return { t, x: W() / 2 + Math.sin(i * 2.1 + 0.6) * W() * (0.07 + 0.22 * t), y: ground(t), s: (12 + 92 * t) / F }; });
  const layer = document.createElement('div'); layer.className = 'rk-ground'; sp.append(layer);
  const hop = document.createElement('div'); hop.className = 'rk-hop'; hop.style.opacity = '0'; layer.append(hop);
  const letters = [...WORD].map((c) => { const n = document.createElement('span'); n.className = 'rk-l'; n.textContent = c; n.style.fontSize = F + 'px'; layer.append(n); return n; });
  const at = (n, x, y, s, flat) => `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${s}) ${flat ? 'scaleY(.55)' : ''}`;
  const LAND = 2500, STEP = 300;
  const go = (fn, ms) => setTimeout(() => { if (sp.isConnected && !sp.classList.contains('skip')) fn(); }, ms);
  // The skips: from the landing point to each letter's place, a little higher and nearer each time.
  go(() => { place(); hop.style.opacity = '1'; ii.style.visibility = 'hidden'; }, LAND);
  let from = { x: W() / 2, y: ground(0.03), s: 0.06 };
  spots.forEach((p, i) => {
    const a = from; from = p;
    go(() => {
      const hs = (h) => `translate(${h.x}px, ${h.y}px) translate(-50%, -100%) scale(${0.25 + h.s * 3.2})`;
      const peak = { x: (a.x + p.x) / 2, y: Math.min(a.y, p.y) - (30 + 140 * p.t), s: (a.s + p.s) / 2 };
      hop.animate([{ transform: hs(a) }, { transform: hs(peak), offset: 0.5, easing: 'cubic-bezier(.3,0,.6,1)' }, { transform: hs(p) + ' scaleY(.8)' }], { duration: STEP, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
      go(() => letters[i].animate([{ transform: at(null, p.x, p.y, p.s * 0.6, true), opacity: 0 }, { transform: at(null, p.x, p.y, p.s, true), opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }), STEP - 20);
    }, LAND + 120 + i * STEP);
  });
  // The lift: the I pops toward you and is gone; the word stands up off the ground, lines up and fills the screen.
  const LIFT = LAND + 120 + WORD.length * STEP + 180;
  go(() => {
    hop.animate([{ opacity: 1 }, { transform: `translate(${W() / 2}px, ${H() * 1.2}px) translate(-50%, -100%) scale(30)`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    const row = document.createElement('div'); row.className = 'rk-row'; row.style.fontSize = F + 'px'; row.innerHTML = [...WORD].map((c) => '<span>' + c + '</span>').join(''); layer.append(row);
    const boxes = [...row.children].map((s) => s.getBoundingClientRect()); row.remove();
    letters.forEach((n, i) => {
      const p = spots[i], b = boxes[i];
      n.animate([{ transform: at(null, p.x, p.y, p.s, true), opacity: 1 }, { transform: at(null, b.left + b.width / 2, b.bottom, 1, false), opacity: 1 }],
        { duration: 700, delay: i * 35, easing: 'cubic-bezier(.3,0,.1,1)', fill: 'forwards' });
    });
    sp.classList.add('lifted');
  }, LIFT);
  window.PRIO_INTRO_MS = LIFT + 1300; // app.js waits this long before the app shows through
})();
