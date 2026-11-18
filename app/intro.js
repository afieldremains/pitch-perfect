// One bounded brand sequence: the P sends its I along an original illuminated path, then CONNECT assembles below it.
(() => {
  'use strict';
  const sp = document.getElementById('splash');
  if (!sp || !sp.classList.contains('rk') || !Element.prototype.animate) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || ['off', 'calm'].includes(document.documentElement.dataset.motion)) { sp.remove(); return; }
  const styles = ['light-path', 'fold', 'assemble'], selected = store.get('intro.style', 'light-path');
  const candidates = styles.filter((style) => style !== store.get('intro.last-style', ''));
  const style = selected === 'shuffle' ? candidates[Math.floor(Math.random() * candidates.length)] : styles.includes(selected) ? selected : 'light-path';
  store.set('intro.last-style', style); sp.dataset.intro = style;
  const timers = new Set();
  let cancelled = false;
  const cancel = () => {
    if (cancelled) return; cancelled = true;
    timers.forEach(clearTimeout); timers.clear();
    sp.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    removeEventListener('resize', interrupt); document.removeEventListener('visibilitychange', hidden);
    reduced.removeEventListener('change', motionChanged);
  };
  const interrupt = () => sp.dispatchEvent(new Event('prio:intro-skip'));
  const hidden = () => { if (document.hidden) interrupt(); };
  const motionChanged = () => { if (reduced.matches) interrupt(); };
  sp.addEventListener('prio:intro-cancel', cancel, { once: true });
  addEventListener('resize', interrupt); document.addEventListener('visibilitychange', hidden);
  reduced.addEventListener('change', motionChanged);
  const W = () => innerWidth, H = () => innerHeight, HOR = 0.6; // the horizon, as a share of the height
  const ii = sp.querySelector('.rk-i');
  // Where the falling I lands: the far middle of the ground, just under the horizon.
  const place = () => { const r = ii.getBoundingClientRect(); sp.style.setProperty('--landx', (W() / 2 - (r.left + r.width / 2)) + 'px'); sp.style.setProperty('--landy', (H() * (HOR + 0.03) - (r.top + r.height / 2)) + 'px'); };
  place();
  const WORD = 'CONNECT', F = Math.min(W() * 0.15, 220); // the final size: the word spans most of the screen
  const ground = (t) => H() * HOR + (H() * (1 - HOR) - 30) * t; // depth 0 = horizon, 1 = at your feet
  const spots = [...WORD].map((_, i) => { const t = 0.08 + i * 0.13; return { t, x: W() / 2 + Math.sin(i * 2.1 + 0.6) * W() * (0.07 + 0.22 * t), y: ground(t), s: (12 + 92 * t) / F }; });
  const layer = document.createElement('div'); layer.className = 'rk-ground'; layer.setAttribute('aria-hidden', 'true'); sp.append(layer);
  const hop = document.createElement('div'); hop.className = 'rk-hop'; hop.style.opacity = '0'; layer.append(hop);
  const tiles = spots.map((p) => {
    const tile = document.createElement('i'); tile.className = 'rk-tile';
    tile.style.width = Math.max(28, F * p.s * 1.4) + 'px';
    tile.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -40%) rotateX(58deg) rotateZ(45deg)`;
    layer.append(tile); return tile;
  });
  const letters = [...WORD].map((c) => { const n = document.createElement('span'); n.className = 'rk-l'; n.textContent = c; n.style.fontSize = F + 'px'; layer.append(n); return n; });
  const at = (n, x, y, s, flat) => `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${s}) ${flat ? 'scaleY(.55)' : ''}`;
  const LAND = 3600, STEP = 480;
  const go = (fn, ms) => {
    const timer = setTimeout(() => { timers.delete(timer); if (!cancelled && sp.isConnected && !sp.classList.contains('skip')) fn(); }, ms);
    timers.add(timer);
  };
  // The skips: from the landing point to each letter's place, a little higher and nearer each time.
  go(() => { place(); hop.style.opacity = '1'; ii.style.visibility = 'hidden'; }, LAND);
  let from = { x: W() / 2, y: ground(0.03), s: 0.06 };
  spots.forEach((p, i) => {
    const a = from; from = p;
    go(() => {
      const hs = (h) => `translate(${h.x}px, ${h.y}px) translate(-50%, -100%) scale(${0.25 + h.s * 3.2})`;
      const peak = { x: (a.x + p.x) / 2, y: Math.min(a.y, p.y) - (30 + 140 * p.t), s: (a.s + p.s) / 2 };
      hop.animate([{ transform: hs(a) }, { transform: hs(peak), offset: 0.5, easing: 'cubic-bezier(.3,0,.6,1)' }, { transform: hs(p) + ' scaleY(.8)' }], { duration: STEP, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
      go(() => {
        tiles[i].animate([{ opacity: 0 }, { opacity: .7, offset: .2 }, { opacity: .18 }], { duration: 1000, easing: 'ease-out', fill: 'forwards' });
        letters[i].animate([
          { transform: at(null, p.x, p.y, p.s * .65, true) + (style === 'fold' ? ' rotateY(85deg)' : ''), clipPath: style === 'assemble' ? 'inset(100% 0 0)' : 'inset(0)', opacity: 0 },
          { transform: at(null, p.x, p.y, p.s, true), clipPath: 'inset(0)', opacity: 1 }
        ], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      }, STEP - 20);
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
      const end = at(null, b.left + b.width / 2, b.bottom, 1, false);
      const middle = at(null, (p.x + b.left + b.width / 2) / 2, (p.y + b.bottom) / 2, .65, false);
      n.animate([{ transform: at(null, p.x, p.y, p.s, true), opacity: 1 },
        { transform: middle + (style === 'fold' ? ' rotateY(55deg)' : style === 'assemble' ? ` rotateZ(${i % 2 ? 12 : -12}deg) scale(1.12,.88)` : ' rotateX(25deg)'), opacity: 1, offset: .55 },
        { transform: end, opacity: 1 }],
        { duration: 1000, delay: i * 60, easing: 'cubic-bezier(.3,0,.1,1)', fill: 'forwards' });
    });
    tiles.forEach((tile) => tile.animate([{ opacity: .18 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }));
    sp.classList.add('lifted');
  }, LIFT);
  window.PRIO_INTRO_MS = LIFT + 2300;
  sp.style.setProperty('--intro-exit', window.PRIO_INTRO_MS + 'ms');
  go(cancel, window.PRIO_INTRO_MS + 800);
})();
