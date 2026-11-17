// Plates: abstract compositions drawn from five designers' principles, made fresh for each prospect from a seed (their
// name), so every kit has its own and it is the same each time. Used by the app's screens and by the deck's art.
// Each returns SVG markup (or, with { inner: true }, just the shapes, for an SVG the caller owns).
//
//  overprint   Karel Martens: translucent geometric shapes overprinted in a few luminous inks, density that varies.
//  halftone    Wolfgang Weingart: a halftone dot field layered over itself at an angle, so the moiré becomes the image.
//  concentric  Josef Müller-Brockmann: concentric curves on a strict modular grid, set off-centre.
//  planes      El Lissitzky: floating planes, a bar and a disc rotating around one point on a diagonal.
//  cutpaper    Saul Bass: flat shapes with hand-cut edges, reduced and overlapping like paper.
// And three pairings of a minimalist with a 3D designer, blended in the same spirit:
//  clay        Massimo Vignelli × Peter Tarka: soft, clay-like primitives (spheres, pills, arches) on a strict grid.
//  void        Kenya Hara × Six N. Five: one object in a vast, quiet space, a horizon and a pool of light.
//  mech        Dieter Rams × Andreas Wannerstedt: precise slotted dials around a soft knob, one accent dot; in the app
//              each ring turns the other way from the one inside it, a calm loop.
(function (root) {
  const rng = (seed) => { let h = 2166136261; for (const ch of String(seed == null ? 'prime' : seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } let x = (h >>> 0) || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
  const n0 = (v) => Math.round(v * 10) / 10;
  const hex = (c) => (String(c || '').charAt(0) === '#' || /^(rgb|hsl|var)/.test(String(c)) ? c : '#' + c);
  const wrap = (W, H, body, o) => (o.inner ? body : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="' + (o.fit || 'xMidYMid slice') + '" aria-hidden="true" focusable="false">' + body + '</svg>');
  const cls = (o, i) => (o.animate ? ' class="pl-s" style="--i:' + i + '"' : '');
  // A shape's own rotation lives on an outer group, so an entrance animation (CSS scale) never cancels it.
  const turn = (t, inner) => (t ? '<g transform="' + t + '">' + inner + '</g>' : inner);

  function overprint(seed, cols, o = {}) {
    const r = rng(seed + ':over'), W = o.w || 1600, H = o.h || 900, C = (cols && cols.length ? cols : ['F7C400', 'E1251B', '1D4ED8']).map(hex);
    const blend = o.blend || 'multiply', op = o.opacity || 0.78, n = o.n || 7, band = o.band || [0.35, 1];
    let s = '';
    for (let i = 0; i < n; i++) {
      // Density varies: most shapes gather in one band, a few stray outside it.
      const inBand = r() < 0.8, x = (inBand ? band[0] + r() * (band[1] - band[0]) : r()) * W, y = (0.15 + r() * 0.7) * H, size = (0.12 + r() * 0.2) * Math.min(W, H) * 1.6;
      const fill = C[i % C.length], k = Math.floor(r() * 4), st = ' fill="' + fill + '" style="mix-blend-mode:' + blend + ';opacity:' + op + '"';
      if (k === 0) s += '<circle' + cls(o, i) + ' cx="' + n0(x) + '" cy="' + n0(y) + '" r="' + n0(size / 2) + '"' + st + '/>';
      else if (k === 1) s += turn('rotate(' + (r() < 0.5 ? 0 : 45) + ' ' + n0(x) + ' ' + n0(y) + ')', '<rect' + cls(o, i) + ' x="' + n0(x - size / 2) + '" y="' + n0(y - size / 2) + '" width="' + n0(size) + '" height="' + n0(size) + '"' + st + '/>');
      else if (k === 2) s += turn('rotate(' + Math.floor(r() * 4) * 90 + ' ' + n0(x) + ' ' + n0(y) + ')', '<path' + cls(o, i) + ' d="M' + n0(x - size / 2) + ' ' + n0(y) + ' A' + n0(size / 2) + ' ' + n0(size / 2) + ' 0 0 1 ' + n0(x + size / 2) + ' ' + n0(y) + ' Z"' + st + '/>');
      else s += '<circle' + cls(o, i) + ' cx="' + n0(x) + '" cy="' + n0(y) + '" r="' + n0(size * 0.38) + '" fill="none" stroke="' + fill + '" stroke-width="' + n0(size * 0.16) + '" style="mix-blend-mode:' + blend + ';opacity:' + op + '"/>';
    }
    return wrap(W, H, s, o);
  }

  function halftone(seed, col, o = {}) {
    const r = rng(seed + ':half'), W = o.w || 1600, H = o.h || 900, step = o.step || 22, c = hex(col || '1D4ED8');
    const fx = (0.55 + r() * 0.4) * W, fy = (0.2 + r() * 0.6) * H, reach = Math.hypot(W, H) * 0.55;
    const layer = (ang, op, k) => {
      let d = '';
      for (let yy = -step; yy < H + step; yy += step) for (let xx = -step; xx < W + step; xx += step) {
        const rr = Math.max(0, 1 - Math.hypot(xx - fx, yy - fy) / reach) * step * 0.48 * k;
        if (rr > 0.6) d += 'M' + n0(xx - rr) + ' ' + yy + 'a' + n0(rr) + ' ' + n0(rr) + ' 0 1 0 ' + n0(rr * 2) + ' 0a' + n0(rr) + ' ' + n0(rr) + ' 0 1 0 ' + n0(-rr * 2) + ' 0';
      }
      return '<path' + (o.animate ? ' class="pl-h"' : '') + ' d="' + d + '" fill="' + c + '" opacity="' + op + '" transform="rotate(' + ang + ' ' + n0(fx) + ' ' + n0(fy) + ')"/>';
    };
    return wrap(W, H, layer(0, o.opacity || 0.5, 1) + layer(o.angle || 7.5, (o.opacity || 0.5) * 0.8, 0.85), o);
  }

  function concentric(seed, cols, o = {}) {
    const r = rng(seed + ':conc'), W = o.w || 1600, H = o.h || 900, C = (cols && cols.length ? cols : ['111827', 'E1251B']).map(hex);
    // The centre sits off the page on a grid line (thirds), the rings step outward in a fixed module.
    const cx = W * [0.66, 0.75, 0.83][Math.floor(r() * 3)], cy = H * (1 + r() * 0.15), mod = Math.min(W, H) / (o.rings || 9);
    let s = '';
    for (let i = 1; i <= (o.rings || 9) + 3; i++) {
      const sw = Math.max(2, mod * (0.42 - i * 0.025));
      s += '<circle' + cls(o, i) + ' cx="' + n0(cx) + '" cy="' + n0(cy) + '" r="' + n0(i * mod) + '" fill="none" stroke="' + (i % 4 === 0 ? C[1 % C.length] : C[0]) + '" stroke-width="' + n0(sw) + '" opacity="' + (o.opacity || 0.9) + '"/>';
    }
    return wrap(W, H, s, o);
  }

  function planes(seed, cols, o = {}) {
    const r = rng(seed + ':planes'), W = o.w || 1600, H = o.h || 900, C = (cols && cols.length ? cols : ['E1251B', '111827', 'F7C400']).map(hex);
    const px = W * (0.55 + r() * 0.25), py = H * (0.4 + r() * 0.25), A = -24 - r() * 14, U = Math.min(W, H);
    const g = (body, ang, i) => turn('rotate(' + n0(ang) + ' ' + n0(px) + ' ' + n0(py) + ')', '<g' + cls(o, i) + '>' + body + '</g>');
    let s = '';
    s += g('<rect x="' + n0(px - W * 0.62) + '" y="' + n0(py - U * 0.018) + '" width="' + n0(W * 1.1) + '" height="' + n0(U * 0.036) + '" fill="' + C[1 % C.length] + '"/>', A, 0);
    s += g('<rect x="' + n0(px + U * 0.06) + '" y="' + n0(py - U * 0.32) + '" width="' + n0(U * 0.3) + '" height="' + n0(U * 0.2) + '" fill="' + C[0] + '"/>', A, 1);
    s += g('<rect x="' + n0(px - U * 0.42) + '" y="' + n0(py + U * 0.06) + '" width="' + n0(U * 0.2) + '" height="' + n0(U * 0.1) + '" fill="none" stroke="' + C[1 % C.length] + '" stroke-width="' + n0(U * 0.012) + '"/>', A + 90, 2);
    s += g('<rect x="' + n0(px - U * 0.12) + '" y="' + n0(py + U * 0.12) + '" width="' + n0(U * 0.09) + '" height="' + n0(U * 0.09) + '" fill="' + C[2 % C.length] + '"/>', A + 12, 3);
    s += '<circle' + cls(o, 4) + ' cx="' + n0(px - U * 0.05) + '" cy="' + n0(py - U * 0.1) + '" r="' + n0(U * 0.1) + '" fill="' + C[0] + '" opacity=".9"/>';
    s += g('<line x1="' + n0(px - W) + '" y1="' + n0(py + U * 0.2) + '" x2="' + n0(px + W) + '" y2="' + n0(py + U * 0.2) + '" stroke="' + C[1 % C.length] + '" stroke-width="' + n0(U * 0.004) + '"/>', A + 8, 5);
    return wrap(W, H, s, o);
  }

  function cutpaper(seed, cols, o = {}) {
    const r = rng(seed + ':cut'), W = o.w || 1600, H = o.h || 900, C = (cols && cols.length ? cols : ['E1251B', 'F7C400', '1D4ED8', '111827']).map(hex), U = Math.min(W, H);
    // A hand-cut edge: every side broken into short runs that wander a little off the straight line.
    const rough = (pts) => { const out = []; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length], seg = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / (U * 0.06)));
      for (let k = 0; k < seg; k++) { const t = k / seg, j = U * 0.008; out.push([x1 + (x2 - x1) * t + (r() - 0.5) * j, y1 + (y2 - y1) * t + (r() - 0.5) * j]); } } return 'M' + out.map((p) => n0(p[0]) + ' ' + n0(p[1])).join('L') + 'Z'; };
    let s = '';
    const n = o.n || 5;
    for (let i = 0; i < n; i++) {
      const cx = (0.15 + r() * 0.75) * W, cy = (0.2 + r() * 0.6) * H, sz = U * (0.18 + r() * 0.3), k = i === 0 ? 0 : Math.floor(r() * 3), rot = (r() - 0.5) * 30;
      let pts;
      if (k === 0) pts = [[cx - sz * 0.8, cy - sz * 0.5], [cx + sz * 0.8, cy - sz * 0.5], [cx + sz * 0.8, cy + sz * 0.5], [cx - sz * 0.8, cy + sz * 0.5]];
      else if (k === 1) pts = Array.from({ length: 22 }, (_, q) => { const a = q / 22 * Math.PI * 2, rr = sz * 0.5 * (0.94 + r() * 0.1); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
      else pts = [[cx, cy - sz * 0.6], [cx + sz * 0.55, cy + sz * 0.45], [cx - sz * 0.55, cy + sz * 0.45]];
      s += turn('rotate(' + n0(rot) + ' ' + n0(cx) + ' ' + n0(cy) + ')', '<path' + cls(o, i) + ' d="' + rough(pts) + '" fill="' + C[i % C.length] + '"/>');
    }
    return wrap(W, H, s, o);
  }

  // Colour helpers for the soft (3D) styles: mix toward white for the lit side, toward black for the shade.
  const rgb = (c) => { const h = String(c).replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const uid = (r) => 'p' + Math.floor(r() * 1e9).toString(36);

  function clay(seed, cols, o = {}) {
    const r = rng(seed + ':clay'), W = o.w || 1600, H = o.h || 900, C = (cols && cols.length ? cols : ['F7C400', 'E1251B', '1D4ED8']).map(hex).map((c) => (c.charAt(0) === '#' && c.length === 7 ? c : '#888888'));
    const id = uid(r), M = W / 12, n = o.n || 4;
    let defs = '<filter id="' + id + 's" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + n0(M * 0.18) + '"/></filter>', s = '';
    const used = [];
    for (let i = 0; i < n; i++) {
      const c = C[i % C.length], k = i === 0 ? 0 : Math.floor(r() * 3);
      // A free slot on the 12 × 6 grid (right two-thirds), at least three modules from every form already placed.
      let x = 0, y = 0;
      for (let t = 0; t < 40; t++) { x = (5 + Math.floor(r() * 6)) * M; y = (1 + Math.floor(r() * 4)) * (H / 6); if (!used.some(([ux, uy]) => Math.hypot(ux - x, uy - y) < M * 3)) break; }
      used.push([x, y]);
      const g = id + 'g' + i;
      defs += '<radialGradient id="' + g + '" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="' + mix(c, '#ffffff', 0.5) + '"/><stop offset=".45" stop-color="' + c + '"/><stop offset="1" stop-color="' + mix(c, '#000000', 0.38) + '"/></radialGradient>';
      const sh = (cx, cy, rx) => '<ellipse cx="' + n0(cx) + '" cy="' + n0(cy) + '" rx="' + n0(rx) + '" ry="' + n0(rx * 0.22) + '" fill="#000" opacity=".22" filter="url(#' + id + 's)"/>';
      let body;
      if (k === 0) { const rr = M * (1.1 + r() * 0.6); body = sh(x, y + rr * 1.02, rr * 0.9) + '<circle cx="' + n0(x) + '" cy="' + n0(y) + '" r="' + n0(rr) + '" fill="url(#' + g + ')"/>'; }
      else if (k === 1) { const w = M * (2.4 + r()), h = M * 0.9; body = sh(x, y + h * 0.75, w * 0.48) + '<rect x="' + n0(x - w / 2) + '" y="' + n0(y - h / 2) + '" width="' + n0(w) + '" height="' + n0(h) + '" rx="' + n0(h / 2) + '" fill="url(#' + g + ')"/>'; }
      else { const w = M * 1.8, h = M * 2; body = sh(x, y + h / 2 + M * 0.05, w * 0.55) + '<path d="M' + n0(x - w / 2) + ' ' + n0(y + h / 2) + 'V' + n0(y) + 'A' + n0(w / 2) + ' ' + n0(w / 2) + ' 0 0 1 ' + n0(x + w / 2) + ' ' + n0(y) + 'V' + n0(y + h / 2) + 'Z" fill="url(#' + g + ')"/>'; }
      s += '<g' + cls(o, i) + '>' + body + '</g>';
    }
    return wrap(W, H, '<defs>' + defs + '</defs>' + s, o);
  }

  function voidspace(seed, cols, o = {}) {
    const r = rng(seed + ':void'), W = o.w || 1600, H = o.h || 900, C = (cols && cols.length ? cols : ['F7C400', 'FFFFFF', '1D4ED8']).map(hex).map((c) => (c.charAt(0) === '#' && c.length === 7 ? c : '#888888'));
    const id = uid(r), hz = H * (o.hz || 0.6 + r() * 0.08), x = W * (o.x != null ? o.x : [0.68, 0.72, 0.62][Math.floor(r() * 3)]), c = C[0], R = Math.min(W, H) * (o.size || 0.11);
    const defs = '<radialGradient id="' + id + 'l" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="' + (C[1] || '#ffffff') + '" stop-opacity=".55"/><stop offset="1" stop-color="' + (C[1] || '#ffffff') + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'o" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="' + mix(c, '#ffffff', 0.55) + '"/><stop offset=".5" stop-color="' + c + '"/><stop offset="1" stop-color="' + mix(c, '#000000', 0.42) + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + (C[2] || c) + '" stop-opacity="0"/><stop offset=".5" stop-color="' + (C[2] || c) + '" stop-opacity=".5"/><stop offset="1" stop-color="' + (C[2] || c) + '" stop-opacity="0"/></linearGradient>' +
      '<filter id="' + id + 'b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + n0(R * 0.25) + '"/></filter>';
    let s = '<line x1="0" y1="' + n0(hz) + '" x2="' + W + '" y2="' + n0(hz) + '" stroke="url(#' + id + 'h)" stroke-width="1.5"/>';
    s += '<ellipse' + cls(o, 0) + ' cx="' + n0(x) + '" cy="' + n0(hz + R * 0.35) + '" rx="' + n0(R * 3.2) + '" ry="' + n0(R * 0.7) + '" fill="url(#' + id + 'l)"/>';
    s += '<ellipse cx="' + n0(x - R * 1.4) + '" cy="' + n0(hz + R * 0.12) + '" rx="' + n0(R * 2.2) + '" ry="' + n0(R * 0.16) + '" fill="#000" opacity=".28" filter="url(#' + id + 'b)"/>';
    const k = Math.floor(r() * 3);
    if (k === 0) s += '<circle' + cls(o, 1) + ' cx="' + n0(x) + '" cy="' + n0(hz - R) + '" r="' + n0(R) + '" fill="url(#' + id + 'o)"/>';
    else if (k === 1) s += '<path' + cls(o, 1) + ' d="M' + n0(x - R) + ' ' + n0(hz) + 'V' + n0(hz - R * 1.3) + 'A' + n0(R) + ' ' + n0(R) + ' 0 0 1 ' + n0(x + R) + ' ' + n0(hz - R * 1.3) + 'V' + n0(hz) + 'Z" fill="url(#' + id + 'o)"/>';
    else s += '<circle' + cls(o, 1) + ' cx="' + n0(x) + '" cy="' + n0(hz - R * 1.05) + '" r="' + n0(R * 0.82) + '" fill="none" stroke="url(#' + id + 'o)" stroke-width="' + n0(R * 0.36) + '"/>';
    return wrap(W, H, '<defs>' + defs + '</defs>' + s, o);
  }

  function mech(seed, cols, o = {}) {
    const r = rng(seed + ':mech'), W = o.w || 1600, H = o.h || 900, C = (cols && cols.length ? cols : ['F7C400', 'E1251B', '1D4ED8', '111827']).map(hex);
    const id = uid(r), cx = W * (o.x != null ? o.x : 0.62 + r() * 0.16), cy = H * (0.45 + r() * 0.12), U = Math.min(W, H) * (o.size || 1), ink = C[3] || C[2] || '#111827', knob = (C[0].length === 7 ? C[0] : '#F7C400');
    let s = '';
    const rings = o.rings || 5;
    for (let i = 0; i < rings; i++) {
      const rad = U * (0.1 + i * 0.075), sw = U * (i % 2 ? 0.012 : 0.026), circ = 2 * Math.PI * rad, nSlot = [6, 24, 12, 48, 18, 60][i % 6], dash = circ / nSlot;
      const col = i === rings - 2 ? C[1] || ink : ink, dur = (18 + i * 7), dir = i % 2 ? 'reverse' : 'normal';
      s += '<circle class="pl-r" cx="' + n0(cx) + '" cy="' + n0(cy) + '" r="' + n0(rad) + '" fill="none" stroke="' + col + '" stroke-width="' + n0(sw) + '" stroke-dasharray="' + n0(dash * (i % 2 ? 0.18 : 0.62)) + ' ' + n0(dash * (i % 2 ? 0.82 : 0.38)) + '" opacity="' + (i % 2 ? 0.55 : 0.85) + '" style="transform-origin:' + n0(cx) + 'px ' + n0(cy) + 'px;--dur:' + dur + 's;--dir:' + dir + '"/>';
    }
    const defs = '<radialGradient id="' + id + 'k" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="' + mix(knob, '#ffffff', 0.5) + '"/><stop offset=".55" stop-color="' + knob + '"/><stop offset="1" stop-color="' + mix(knob, '#000000', 0.35) + '"/></radialGradient>';
    s += '<circle' + cls(o, 0) + ' cx="' + n0(cx) + '" cy="' + n0(cy) + '" r="' + n0(U * 0.06) + '" fill="url(#' + id + 'k)"/>';
    const a = r() * Math.PI * 2; s += '<circle' + cls(o, 1) + ' cx="' + n0(cx + Math.cos(a) * U * 0.42) + '" cy="' + n0(cy + Math.sin(a) * U * 0.42) + '" r="' + n0(U * 0.016) + '" fill="' + (C[1] || '#E1251B') + '"/>';
    return wrap(W, H, '<defs>' + defs + '</defs>' + s, o);
  }

  // ---------- a name set in dots ----------
  // Five rows of dots, a letter a few dots wide: the prospect's name as a dot pattern. Used for the growth dots on
  // the deck's opening slide and for the drawing behind a kit's page in the app.
  const GLYPH = {
    A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.', E: '###|#..|##.|#..|###',
    F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#', I: '#|#|#|#|#', J: '..#|..#|..#|#.#|.#.',
    K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###', M: '#...#|##.##|#.#.#|#...#|#...#', N: '#..#|##.#|#.##|#..#|#..#', O: '.#.|#.#|#.#|#.#|.#.',
    P: '##.|#.#|##.|#..|#..', Q: '.#.|#.#|#.#|###|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
    U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#...#|#...#|#.#.#|##.##|#...#', X: '#.#|#.#|.#.|#.#|#.#', Y: '#.#|#.#|.#.|.#.|.#.',
    Z: '###|..#|.#.|#..|###', 0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.',
    4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.', 8: '###|#.#|###|#.#|###',
    9: '###|#.#|###|..#|##.', "'": '#|#|.|.|.', '-': '...|...|###|...|...', '.': '.|.|.|.|#', '&': '.#.|#.#|.#.|#.#|.##', ' ': '..|..|..|..|..'
  };
  // The name's dots: { cols, rows: 5, on: [[col, row]...], text }. Letters it cannot set are left out; a name too long
  // for maxCols falls back to its first word, then to as many letters as fit. Empty when nothing can be set.
  function dotname(text, maxCols) {
    const clean = (t) => String(t || '').toUpperCase().replace(/[‘’`]/g, "'").split('').filter((ch) => GLYPH[ch]).join('').replace(/\s+/g, ' ').trim();
    const width = (t) => t.split('').reduce((n, ch) => n + GLYPH[ch].split('|')[0].length + 1, -1);
    let t = clean(text); const max = maxCols || 64;
    if (t && width(t) > max) t = t.split(' ')[0];
    while (t && width(t) > max) t = t.slice(0, -1).trim();
    const on = []; let x = 0;
    t.split('').forEach((ch) => { const rows = GLYPH[ch].split('|'); rows.forEach((row, r) => row.split('').forEach((b, c) => { if (b === '#') on.push([x + c, r]); })); x += rows[0].length + 1; });
    return { text: t, cols: Math.max(0, x - 1), rows: 5, on };
  }
  // The name as a picture: its dots run from one ink to another across the word (a gradient), over a faint field of
  // unlit dots; opts { pad, field, star } add rows and columns of unlit dots around it and a star after the last letter.
  function namedots(text, inks, o = {}) {
    const N = dotname(text, o.maxCols || 60); if (!N.cols) return '';
    const pad = o.pad == null ? 2 : o.pad, cols = N.cols + pad * 2 + (o.star ? 4 : 0), rows = 5 + pad * 2, lit = new Set(N.on.map((p) => p.join(',')));
    const [c0, c1] = [hex((inks && inks[0]) || '#F7C400'), hex((inks && inks[1]) || '#2656D9')], dim = hex(o.dim || '#8A8A86');
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const isOn = lit.has((c - pad) + ',' + (r - pad)), t = N.cols > 1 ? Math.min(1, Math.max(0, (c - pad) / (N.cols - 1))) : 0;
      s += isOn ? '<circle class="nd-on" cx="' + (c + 0.5) + '" cy="' + (r + 0.5) + '" r=".36" fill="color-mix(in srgb, ' + c1 + ' ' + Math.round(t * 100) + '%, ' + c0 + ')"/>'
        : (o.field === false ? '' : '<circle cx="' + (c + 0.5) + '" cy="' + (r + 0.5) + '" r=".12" fill="' + dim + '" opacity=".5"/>');
    }
    if (o.star) { const sx = pad + N.cols + 2.2, sy = pad + 0.9; s += '<path class="nd-star" transform="translate(' + n0(sx) + ' ' + n0(sy) + ')" d="M0 -1.3C.12 -.4 .4 -.12 1.3 0C.4 .12 .12 .4 0 1.3C-.12 .4 -.4 .12 -1.3 0C-.4 -.12 -.12 -.4 0 -1.3Z" fill="' + hex(o.starFill || '#5FB4E8') + '"/>'; }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + cols + ' ' + rows + '" width="' + cols * 20 + '" height="' + rows * 20 + '" aria-hidden="true">' + (o.style ? '<style>' + o.style + '</style>' : '') + '<g class="nd">' + s + '</g></svg>';
  }

  const Plates = { overprint, halftone, concentric, planes, cutpaper, clay, void: voidspace, mech, rng, dotname, namedots };
  root.Plates = Plates;
  if (typeof module !== 'undefined' && module.exports) module.exports = Plates;
})(typeof window !== 'undefined' ? window : globalThis);
