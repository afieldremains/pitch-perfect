// Prio Connect, the window. Everything that touches the computer goes through window.studio (preload.js).
'use strict';

const S = window.studio;
const RUN_COST = 'about 7 minutes and about $2 of research';
const store = {
  get(k, d) { try { const v = localStorage.getItem('pp.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pp.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  del(k) { try { localStorage.removeItem('pp.' + k); } catch (e) { /* ignore */ } }
};

// ---------- appearance: theme, accent and motion, chosen in Settings and remembered on this computer ----------
// Three modes: Light (black and white; only the Prio Connect mark and the decks keep their color), Dark (the original
// Prio Connect look) and Shuffle (a new color scheme every roll, named, always readable).
const THEMES = [['studio', 'Studio', 'Paper white and ink. Color only means something: blue to act, red to stop, yellow for what is new'], ['warm', 'Notebook', 'A composition notebook: marbled cover, dot-grid pages that turn, the three Prio Connect inks'], ['light', 'Light', 'Black on white. Only Prio Connect and the decks in color'], ['black', 'Black', 'White on true black. Only Prio Connect and the decks in color'], ['dark', 'Dark', 'Prio Connect at night: deep navy, no white'], ['shuffle', 'Shuffle', 'A new color scheme every roll'], ['custom', 'Custom', 'Your own colors, or one of 48 ready-made themes']];
const calmOS = matchMedia('(prefers-reduced-motion: reduce)');
// Warm is the look the app opens in. Anyone coming from an earlier version is moved to it once (and told how to go back).
if (store.get('look', 0) < 2) { if (store.get('theme', '')) store.set('look.moved', store.get('theme', '')); store.set('theme', 'warm'); store.set('look', 2); }
// Studio is the look the app opens in from 0.36: quiet surfaces, one signal color. Notebook is a click away in Settings.
if (store.get('look', 0) < 3) { if (store.get('theme', '') && store.get('theme', '') !== 'warm') store.set('look.moved', store.get('theme', '')); store.set('theme', 'studio'); const u = store.get('ui', {}); if (!u.turn || u.turn === 'curl') store.set('ui', Object.assign({}, u, { turn: 'fade', paper: 'plain' })); store.set('look', 3); }
const themeNow = () => { const t = store.get('theme', 'studio'); return THEMES.some((x) => x[0] === t) ? t : 'studio'; };
// Warm draws with cut paper and clay where the other modes draw grids and dials.
const soft = () => themeNow() === 'warm';

// ---------- Shuffle: color theory in a roll ----------
// A base hue and a harmony (analogous, complementary, split, triadic) give the ground, the rail and the accent; every
// text color is checked against its background (WCAG contrast) and nudged until it reads.
const rng = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hsl = (h, sat, l) => { h = ((h % 360) + 360) % 360; sat /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = sat * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// Moves a color's lightness away from its background until the pair reads (min ratio).
const readable = (h, sat, l, bg, min) => { const dir = lum(bg) > 0.4 ? -1 : 1; let c = hsl(h, sat, l); for (let i = 0; i < 40 && contrast(c, bg) < min; i++) { l = Math.max(2, Math.min(98, l + dir * 2.5)); c = hsl(h, sat, l); } return c; };
const HUES = [[0, 'Ember'], [18, 'Copper'], [36, 'Saffron'], [52, 'Citrine'], [75, 'Lime'], [110, 'Fern'], [150, 'Jade'], [175, 'Lagoon'], [195, 'Glacier'], [215, 'Cobalt'], [238, 'Indigo'], [262, 'Violet'], [285, 'Orchid'], [310, 'Fuchsia'], [332, 'Flamingo'], [350, 'Ruby'], [360, 'Ember']];
const ADJ = { dark: ['Midnight', 'Velvet', 'Neon', 'Electric', 'Cosmic', 'Smoky', 'Deep', 'After-hours'], light: ['Morning', 'Sunlit', 'Pastel', 'Paper', 'Coastal', 'Soft', 'Bright', 'Gallery'] };
// Families widen the range: each sets how dark the ground is, how much colour the surfaces carry, how loud the accent
// is and which harmonies it uses. Classic is the original roll; the others are moods (jewel tones at night, neon on
// near-black, dusk in the mid-tones, pastels, warm paper, earth, one hue, a vivid duotone rail, candy, ocean depths).
const FAMILIES = [
  { id: 'classic', w: 3, name: null },
  { id: 'jewel', w: 2, dark: 1, gL: [5, 9], gS: [40, 65], aS: [80, 95], harm: ['complementary', 'triadic', 'split'], adj: ['Sapphire', 'Emerald', 'Garnet', 'Amethyst', 'Topaz'] },
  { id: 'neon', w: 1.6, dark: 1, gL: [2.5, 5], gS: [25, 50], aS: [96, 100], aL: 62, harm: ['complementary', 'split', 'triadic'], adj: ['Neon', 'Arcade', 'Laser', 'Electric'] },
  { id: 'dusk', w: 1.6, dark: 1, gL: [13, 19], gS: [22, 42], aS: [70, 90], harm: ['analogous', 'complementary', 'split'], adj: ['Dusk', 'Twilight', 'Ember-hour', 'Moonrise'] },
  { id: 'ocean', w: 1.2, dark: 1, hue: [180, 235], gL: [5, 10], gS: [45, 70], aS: [75, 95], harm: ['complementary', 'split'], adj: ['Deep-sea', 'Abyssal', 'Tidal'] },
  { id: 'pastel', w: 2, dark: 0, gL: [90, 94], gS: [50, 80], cardL: 98, aS: [62, 82], harm: ['analogous', 'triadic', 'tetradic'], adj: ['Pastel', 'Sorbet', 'Macaron', 'Cotton'] },
  { id: 'paper', w: 1.4, dark: 0, hue: [28, 52], gL: [94.5, 97], gS: [18, 35], aS: [70, 90], harm: ['complementary', 'split'], adj: ['Paper', 'Linen', 'Gallery', 'Press'] },
  { id: 'earth', w: 1.4, hues: [[18, 42], [70, 130]], gS: [14, 30], aS: [42, 62], harm: ['analogous', 'complementary'], adj: ['Clay', 'Moss', 'Terracotta', 'Canyon', 'Olive'] },
  { id: 'candy', w: 1.1, dark: 0, gL: [93, 96], gS: [70, 95], aS: [88, 100], harm: ['tetradic', 'triadic'], rail: 'vivid', adj: ['Candy', 'Pop', 'Bubblegum', 'Confetti'] },
  { id: 'mono', w: 1, harm: ['mono'], adj: ['Monotone', 'Single-ink', 'Tonal'] },
  { id: 'duotone', w: 1.4, harm: ['complementary', 'split'], rail: 'vivid', adj: ['Duotone', 'Poster', 'Riso'] },
  { id: 'logo', w: 3 }
];
const pickW = (r, list) => { const t = list.reduce((a, x) => a + x.w, 0); let x = r() * t; for (const f of list) { x -= f.w; if (x <= 0) return f; } return list[0]; };
const span = (r, a, b) => a + r() * (b - a);
// ---------- the logo palettes ----------
const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => '#' + hex2(a).map((v, i) => Math.round(v + (hex2(b)[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
const hslOf = (hex) => { const [r, g, b] = hex2(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l * 100]; const sat = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, sat * 100, l * 100]; };
const readableHex = (hex, bg, min) => { if (contrast(hex, bg) >= min) return hex; const [h, sat, l] = hslOf(hex); return readable(h, sat, l, bg, min); };
const vivid = (hex) => hslOf(hex)[1] > 35 && lum(hex) > 0.02 && lum(hex) < 0.85;
// A full app scheme from one logo palette: the logo's background becomes the rail (or the page, when it is a light
// paper), its ring the accent, its stem the second ink, and every text color is checked for contrast as with a roll.
function logoScheme(L, seed) {
  const bg = L.bg, dark = lum(bg) < 0.12, paper = lum(bg) > 0.62, v = {};
  if (dark) {
    v.ground = bg; v.card = mixHex(bg, '#FFFFFF', 0.06); v.field = mixHex(bg, '#FFFFFF', 0.04); v.hover = mixHex(bg, '#FFFFFF', 0.1);
    v.line = mixHex(bg, '#FFFFFF', 0.16); v['line-2'] = mixHex(bg, '#FFFFFF', 0.26); v.chip = mixHex(bg, '#FFFFFF', 0.12);
    v.rail = mixHex(bg, '#000000', 0.35); v['rail-2'] = mixHex(bg, '#FFFFFF', 0.1); v.stage = mixHex(bg, '#000000', 0.5);
  } else {
    v.ground = paper ? bg : mixHex(bg, '#FFFFFF', 0.86); v.card = paper ? mixHex(bg, '#FFFFFF', 0.7) : mixHex(bg, '#FFFFFF', 0.95); v.field = '#FFFFFF'; v.hover = mixHex(v.ground, '#000000', 0.03);
    v.line = mixHex(v.ground, '#000000', 0.1); v['line-2'] = mixHex(v.ground, '#000000', 0.2); v.chip = mixHex(v.ground, '#000000', 0.05);
    v.rail = paper ? (lum(L.stem) < 0.3 ? L.stem : L.word) : bg; v['rail-2'] = mixHex(v.rail, '#FFFFFF', 0.12); v.stage = mixHex(v.rail, '#000000', 0.6);
  }
  const ink = dark ? '#FFFFFF' : L.word && lum(L.word) < 0.1 ? L.word : '#121218';
  v.ink = readableHex(ink, v.card, 12); v['ink-2'] = readableHex(mixHex(ink, v.card, 0.18), v.card, 8);
  v.muted = readableHex(mixHex(ink, v.card, 0.45), v.card, 4.6); v.faint = readableHex(mixHex(ink, v.card, 0.6), v.card, 3);
  v.muted = readableHex(v.muted, v.ground, 4.6); v.faint = readableHex(v.faint, v.ground, 3);
  // The rail keeps the logo's color as far as it can; if neither white nor near-black reads on it at 7:1, the rail
  // deepens (or lightens) step by step until one does.
  const bestOn = (bg) => (contrast('#FFFFFF', bg) >= contrast('#121218', bg) ? '#FFFFFF' : '#121218');
  for (let i = 0; i < 30 && contrast(bestOn(v.rail), v.rail) < 7; i++) v.rail = mixHex(v.rail, bestOn(v.rail) === '#FFFFFF' ? '#000000' : '#FFFFFF', 0.06);
  v['rail-2'] = mixHex(v.rail, '#FFFFFF', 0.12); v.stage = mixHex(v.rail, '#000000', 0.6);
  const railInk = bestOn(v.rail);
  v['rail-ink'] = railInk; v['rail-mute'] = readableHex(mixHex(railInk, v.rail, 0.2), v.rail, 4.6); v['rail-faint'] = readableHex(mixHex(railInk, v.rail, 0.38), v.rail, 3); v['rail-edge'] = mixHex(v.rail, railInk, 0.18);
  // The accent is the ring's color when it has one; a white or black ring (the bold tiles) hands it to the stem or star.
  const acc = [L.ring, L.stem, L.star, bg].find((c) => c && vivid(c) && contrast(c, v.ground) > 1.6) || L.ring;
  v.accent = readableHex(acc, v.ground, 3);
  const inkOn = contrast('#FFFFFF', v.accent) >= contrast('#0A0A0A', v.accent) ? '#FFFFFF' : '#0A0A0A';
  if (contrast(inkOn, v.accent) < 4.6) { const [h, sat] = hslOf(v.accent); v.accent = readable(h, sat, hslOf(v.accent)[2], inkOn, 4.6); }
  v['accent-ink'] = inkOn; v['accent-glow'] = v.accent + '59';
  v.yellow = readableHex(vivid(L.star) ? L.star : [L.stem, L.ring].find((c) => c !== acc && vivid(c)) || v.accent, v.card, 1.4);
  v.blue = readableHex(vivid(L.stem) ? L.stem : v.accent, v.card, 3); v.red = readableHex(vivid(L.ring) ? L.ring : v.accent, v.card, 3);
  v.link = readableHex(v.blue, v.card, 4.6); v['fit-bg'] = mixHex(v.card, v.accent, dark ? 0.22 : 0.12); v['fit-ink'] = readableHex(v.accent, v['fit-bg'], 6);
  v.note = mixHex(v.card, v.accent, dark ? 0.18 : 0.1); v['note-ink'] = readableHex(ink, v.note, 7); v['note-ok'] = v.note; v['note-ok-ink'] = v['note-ink'];
  v.scheme = dark ? 'dark' : 'light';
  return { seed, name: L.name, family: 'logo', harmony: 'logo', dark, vars: v, logo: L };
}
const logoById = (id) => (typeof LOGO_SCHEMES !== 'undefined' ? LOGO_SCHEMES.find((x) => x.id === id) : null);
function makeScheme(seed) {
  if (typeof seed === 'string' && /^logo:/.test(seed)) { const L = logoById(seed.slice(5)); if (L) return logoScheme(L, seed); seed = 20261106; }
  const r = rng(seed), F = pickW(r, typeof LOGO_SCHEMES === 'undefined' ? FAMILIES.filter((f) => f.id !== 'logo') : FAMILIES);
  if (F.id === 'logo') return logoScheme(LOGO_SCHEMES[Math.floor(r() * LOGO_SCHEMES.length)], seed);
  let h = r() * 360;
  if (F.hue) h = span(r, F.hue[0], F.hue[1]); else if (F.hues) { const band = F.hues[Math.floor(r() * F.hues.length)]; h = span(r, band[0], band[1]); }
  const dark = F.dark == null ? r() < 0.55 : !!F.dark;
  const harmony = (F.harm || ['analogous', 'complementary', 'split', 'triadic'])[Math.floor(r() * (F.harm || [0, 0, 0, 0]).length)];
  const off = { analogous: 35, complementary: 180, split: 150, triadic: 120, tetradic: 90, mono: 0 }[harmony];
  const ha = h + off * (r() < 0.5 ? 1 : -1), sat = F.gS ? span(r, F.gS[0], F.gS[1]) : 35 + r() * 35;
  const v = {};
  if (dark) {
    const gl = F.gL ? span(r, F.gL[0], F.gL[1]) : 6 + r() * 4;
    v.ground = hsl(h, sat * 0.8, gl); v.card = hsl(h, sat * 0.7, gl + 5 + r() * 2); v.field = hsl(h, sat * 0.7, gl + 3); v.hover = hsl(h, sat * 0.6, gl + 9);
    v.line = hsl(h, sat * 0.5, gl + 13); v['line-2'] = hsl(h, sat * 0.5, gl + 21); v.chip = hsl(h, sat * 0.6, gl + 11);
    v.rail = F.rail === 'vivid' ? hsl(ha, 70, 16) : hsl(h, sat, Math.max(2, gl - 3 + r() * 2)); v['rail-2'] = hsl(h, sat * 0.8, gl + 7); v.stage = hsl(h, sat, Math.max(2, gl - 2));
  } else {
    const gl = F.gL ? span(r, F.gL[0], F.gL[1]) : 94 + r() * 3, gs = F.gS ? sat : 30 + r() * 40;
    v.ground = hsl(h, gs, gl); v.card = hsl(h, F.id === 'pastel' || F.id === 'candy' ? 70 : 60, F.cardL || 99); v.field = F.id === 'paper' ? hsl(h, 40, 98.5) : '#FFFFFF'; v.hover = hsl(h, 40, Math.min(97, gl + 2));
    v.line = hsl(h, 25, Math.min(88, gl - 7)); v['line-2'] = hsl(h, 22, Math.min(79, gl - 16)); v.chip = hsl(h, 40, Math.min(93, gl - 2));
    v.rail = F.rail === 'vivid' ? hsl(ha, 72 + r() * 15, 17 + r() * 8) : hsl(h + (r() < 0.5 ? 0 : 180), sat + 15, 14 + r() * 8); v['rail-2'] = hsl(F.rail === 'vivid' ? ha : h, sat, 24); v.stage = hsl(h, sat, 8);
  }
  v.ink = readable(h, 20, dark ? 94 : 10, v.card, 12); v['ink-2'] = readable(h, 18, dark ? 82 : 24, v.card, 8);
  v.muted = readable(h, 14, dark ? 68 : 40, v.card, 4.6); v.faint = readable(h, 12, dark ? 52 : 56, v.card, 3);
  v['rail-ink'] = readable(h, 20, 96, v.rail, 12); v['rail-mute'] = readable(h, 18, 78, v.rail, 7); v['rail-faint'] = readable(h, 14, 58, v.rail, 4); v['rail-edge'] = hsl(h, 30, dark ? 18 : 30);
  // The accent stands out from the ground, and its button label (white or near-black, whichever reads better) passes 4.5:1.
  const aS = F.aS ? span(r, F.aS[0], F.aS[1]) : 85, hA = harmony === 'mono' ? h : ha;
  let al = F.aL || (dark ? 60 : 50); v.accent = readable(hA, aS, al, v.ground, 3);
  const inkOn = contrast('#FFFFFF', v.accent) >= contrast('#0A0A0A', v.accent) ? '#FFFFFF' : '#0A0A0A';
  al = Math.round(lum(v.accent) > 0.18 ? 60 : 45);
  for (let i = 0; i < 40 && contrast(inkOn, v.accent) < 4.6; i++) { al = Math.max(8, Math.min(92, al + (inkOn === '#FFFFFF' ? -2 : 2))); v.accent = hsl(hA, aS, al); }
  v['accent-ink'] = inkOn;
  v['accent-glow'] = v.accent + '59'; v.yellow = v.accent;
  const second = harmony === 'tetradic' ? hA + 90 : harmony === 'mono' ? h + 12 : hA + 25, third = harmony === 'tetradic' ? hA + 180 : harmony === 'mono' ? h - 12 : hA - 40;
  v.blue = readable(second, Math.min(95, aS), dark ? 58 : 45, v.card, 3); v.red = readable(third, Math.min(95, aS + 5), dark ? 62 : 46, v.card, 3);
  v.link = readable(hA, 80, dark ? 70 : 38, v.card, 4.6); v['fit-bg'] = hsl(hA, 50, dark ? 18 : 93); v['fit-ink'] = readable(hA, 70, dark ? 82 : 28, v['fit-bg'], 6);
  v.note = hsl(hA, 60, dark ? 16 : 93); v['note-ink'] = readable(hA, 50, dark ? 85 : 20, v.note, 7); v['note-ok'] = v.note; v['note-ok-ink'] = v['note-ink'];
  v.scheme = dark ? 'dark' : 'light';
  const hueName = HUES.reduce((a, x) => (Math.abs(x[0] - ((h % 360) + 360) % 360) < Math.abs(a[0] - ((h % 360) + 360) % 360) ? x : a))[1];
  const adj = F.adj ? F.adj[Math.floor(r() * F.adj.length)] : ADJ[dark ? 'dark' : 'light'][Math.floor(r() * 8)];
  return { seed, name: adj + ' ' + hueName, family: F.id, harmony, dark, vars: v };
}
const SCHEME_KEYS = ['ground', 'card', 'field', 'hover', 'line', 'line-2', 'chip', 'rail', 'rail-2', 'stage', 'ink', 'ink-2', 'muted', 'faint', 'rail-ink', 'rail-mute', 'rail-faint', 'rail-edge', 'accent', 'accent-ink', 'accent-glow', 'yellow', 'blue', 'red', 'link', 'fit-bg', 'fit-ink', 'note', 'note-ink', 'note-ok', 'note-ok-ink', 'scheme'];
const schemeNow = () => makeScheme(store.get('seed', 20261106));
// A custom theme: eight colors in, a full checked scheme out (the same rules as the logo palettes).
function customScheme(T) {
  T = Object.assign({}, THEME_PRESETS[0], T || {});
  const L = { bg: T.ground, stem: T.blue, ring: T.red, star: T.yellow, word: T.ink, name: T.name || 'Custom' };
  const sc = logoScheme(L, 'custom');
  const v = sc.vars, dark = lum(T.ground) < 0.12;
  v.ground = T.ground; v.card = T.card; v.field = dark ? mixHex(T.card, '#FFFFFF', 0.03) : '#FFFFFF'; v.hover = mixHex(T.card, T.ink, 0.05);
  v.line = mixHex(T.card, T.ink, 0.13); v['line-2'] = mixHex(T.card, T.ink, 0.24); v.chip = mixHex(T.card, T.ink, 0.07);
  v.rail = T.rail; const bestOn = (bg) => (contrast('#FFFFFF', bg) >= contrast('#121218', bg) ? '#FFFFFF' : '#121218');
  for (let i = 0; i < 30 && contrast(bestOn(v.rail), v.rail) < 7; i++) v.rail = mixHex(v.rail, bestOn(v.rail) === '#FFFFFF' ? '#000000' : '#FFFFFF', 0.06);
  const ri = bestOn(v.rail); v['rail-ink'] = ri; v['rail-mute'] = readableHex(mixHex(ri, v.rail, 0.2), v.rail, 4.6); v['rail-faint'] = readableHex(mixHex(ri, v.rail, 0.38), v.rail, 3); v['rail-edge'] = mixHex(v.rail, ri, 0.18); v['rail-2'] = mixHex(v.rail, ri, 0.1); v.stage = mixHex(v.rail, '#000000', 0.5);
  v.ink = readableHex(T.ink, T.card, 12); v['ink-2'] = readableHex(mixHex(v.ink, T.card, 0.18), T.card, 8);
  v.muted = readableHex(readableHex(mixHex(v.ink, T.card, 0.45), T.card, 4.6), T.ground, 4.6); v.faint = readableHex(readableHex(mixHex(v.ink, T.card, 0.6), T.card, 3), T.ground, 3);
  v.accent = readableHex(T.accent, T.ground, 3);
  const inkOn = contrast('#FFFFFF', v.accent) >= contrast('#0A0A0A', v.accent) ? '#FFFFFF' : '#0A0A0A';
  if (contrast(inkOn, v.accent) < 4.6) { const [h, sat, l] = hslOf(v.accent); v.accent = readable(h, sat, l, inkOn, 4.6); }
  v['accent-ink'] = inkOn; v['accent-glow'] = v.accent + '59';
  v.blue = readableHex(T.blue, T.card, 3); v.red = readableHex(T.red, T.card, 3); v.yellow = T.yellow; v.link = readableHex(v.blue, T.card, 4.6);
  v['fit-bg'] = mixHex(T.card, v.accent, dark ? 0.22 : 0.12); v['fit-ink'] = readableHex(v.accent, v['fit-bg'], 6);
  v.note = mixHex(T.card, v.accent, dark ? 0.18 : 0.1); v['note-ink'] = readableHex(v.ink, v.note, 7); v['note-ok'] = v.note; v['note-ok-ink'] = v['note-ink'];
  v.scheme = dark ? 'dark' : 'light';
  return { seed: 'custom', name: T.name || 'Custom', family: 'custom', dark, vars: v, logo: { stem: T.blue, ring: T.red, star: T.yellow } };
}
const customNow = () => customScheme(store.get('custom', null));
// Everything else about the look: type, corners, paper, cover, size and how pages turn.
const uiNow = () => Object.assign({}, UI_DEFAULTS, store.get('ui', {}));
function applyUi() {
  const r = document.documentElement, u = uiNow(), O = UI_OPTIONS;
  const font = (id) => ((O.fonts.find((f) => f[0] === id) || O.fonts[0])[2]) + ", 'Segoe UI', system-ui, sans-serif";
  r.style.setProperty('--display', font(u.head)); r.style.setProperty('--body', font(u.body));
  const c = O.corners.find((x) => x[0] === u.corners) || O.corners[1]; r.style.setProperty('--r', c[2] + 'px'); r.style.setProperty('--r-sm', c[3] + 'px');
  r.dataset.paper = u.paper; r.dataset.cover = u.cover; r.dataset.turn = u.turn; r.style.setProperty('--cover-c', u.coverColor);
  r.style.zoom = String((O.size.find((x) => x[0] === u.size) || O.size[1])[2]);
}
function applyLook() {
  const r = document.documentElement, theme = themeNow();
  r.dataset.theme = theme; r.dataset.motion = motionLevel(); delete r.dataset.accent;
  SCHEME_KEYS.forEach((k) => r.style.removeProperty('--' + k));
  let dark = theme === 'dark' || theme === 'black';
  let L = null;
  if (theme === 'shuffle' || theme === 'custom') { const sc = theme === 'custom' ? customNow() : schemeNow(); SCHEME_KEYS.forEach((k) => r.style.setProperty('--' + k, sc.vars[k])); dark = sc.dark; L = sc.logo || { stem: sc.vars.blue, ring: sc.vars.red, star: sc.vars.yellow }; }
  applyUi();
  // The P marks in the app (the rail, the cover, the guide) wear the palette's logo colors, or Prio Connect's own.
  r.style.setProperty('--lg-stem', L ? L.stem : '#2656D9'); r.style.setProperty('--lg-ring', L ? L.ring : '#E22622'); r.style.setProperty('--lg-star', L ? L.star : '#FAC800');
  r.dataset.scheme = dark ? 'dark' : 'light';
  const dice = document.getElementById('dice'); if (dice) dice.hidden = theme !== 'shuffle';
  if (S.setTheme) S.setTheme(dark ? 'dark' : 'light', getComputedStyle(r).getPropertyValue('--ground').trim());
}
// A roll: the new colors sweep across the app from where you clicked (a view transition), then the name is announced.
function rollColors(from) {
  const recent = store.get('recentSeeds', []), seed = Math.floor(Math.random() * 2 ** 31);
  store.set('recentSeeds', [store.get('seed', 20261106), ...recent.filter((x) => x !== seed)].slice(0, 6)); store.set('seed', seed);
  if (themeNow() !== 'shuffle') store.set('theme', 'shuffle');
  setScheme(from);
}
function setScheme(from) {
  const sc = schemeNow(), t = themeNow(), done = () => toast(t === 'shuffle' && sc.logo ? sc.name + ': colors from the Prio Connect logo.' : t === 'shuffle' ? sc.name + (sc.dark ? ' · dark' : ' · light') + ', ' + (sc.family && sc.family !== 'classic' ? sc.family + ', ' : '') + sc.harmony + ' colors.' : ({ warm: 'Notebook: marbled cover, dot-grid pages.', light: 'Light: black on white.', black: 'Black: white on true black.', dark: 'Dark: Prio Connect at night.', custom: customNow().name + ': your theme.' }[t] || ''));
  if (!moving() || !document.startViewTransition) { applyLook(); done(); if (pages.settings && /settings/.test(location.hash)) route(); return; }
  const r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const x = r.left + r.width / 2, y = r.top + r.height / 2, R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const html = document.documentElement; html.classList.add('recolor'); html.style.setProperty('--rx', x + 'px'); html.style.setProperty('--ry', y + 'px'); html.style.setProperty('--rr', R + 'px');
  const vt = document.startViewTransition(() => { applyLook(); if (/settings/.test(location.hash)) return route(); });
  vt.finished.finally(() => { html.classList.remove('recolor'); done(); });
}
const motionLevel = () => store.get('motion', calmOS.matches ? 'off' : 'full');
const moving = () => motionLevel() !== 'off';
calmOS.addEventListener('change', applyLook);
applyLook();

// ---------- helpers ----------
const $ = (s) => document.querySelector(s);
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
  return n;
}
function toast(m) { if (!m) return; const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3500); }
const errText = (e) => String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const urlish = (s) => /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(s.trim()) && !/\s/.test(s.trim());
const mb = (n) => (n / 1048576).toFixed(n > 1048576 ? 1 : 2) + ' MB';
const when = (stamp) => stamp.replace(/ imported$/, '').replace(/^(\d{4})-(\d\d)-(\d\d) (\d\d)(\d\d)$/, (m, y, mo, d, h, mi) => new Date(+y, +mo - 1, +d, +h, +mi).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
const initials = (n) => n.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(the|of|and|&)$/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
const modelChip = (k) => el('span', { class: 'chip' + (k.model === 'faith' ? ' faith' : ''), text: k.model === 'faith' ? 'Faith' + (k.bible ? ' · ' + k.bible : '') : k.model === 'secular' ? 'Secular' : 'Kit' });
const swatch = (colors) => (colors && colors.length ? el('span', { class: 'swatch', title: 'Their colors' }, colors.map((c) => el('i', { style: 'background:#' + String(c).replace('#', '') }))) : null);

// A little Markdown for the kit summary; "Check before you send" becomes a checklist that remembers its ticks.
function md(text, checksKey) {
  const box = el('div', { class: 'md' }), done = checksKey ? store.get(checksKey, {}) : {};
  const inline = (s) => {
    const out = [], re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`/g; let i = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > i) out.push(s.slice(i, m.index));
      if (m[1] != null) out.push(el('strong', {}, ...inline(m[1])));
      else if (m[2] != null) { const u = m[3]; out.push(el('a', { href: '#', onclick: (e) => { e.preventDefault(); S.openLink(u); } }, m[2])); }
      else out.push(el('code', {}, m[4]));
      i = re.lastIndex;
    }
    if (i < s.length) out.push(s.slice(i));
    return out;
  };
  const check = (t) => { const c = el('input', { type: 'checkbox' }); c.checked = !!done[t]; c.addEventListener('change', () => { done[t] = c.checked; store.set(checksKey, done); }); return el('li', {}, el('label', {}, c, el('span', {}, ...inline(t)))); };
  let list = null, para = [], last = '';
  const flush = () => { if (para.length) { last = para.join(' '); box.append(el('p', {}, ...inline(last))); para = []; } };
  for (const line of String(text || '').replace(/\r/g, '').split('\n')) {
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (h) { flush(); list = null; last = ''; box.append(el('h2', {}, ...inline(h[1]))); continue; }
    const li = line.match(/^\s*[-*]\s+(.*)/);
    if (li) { flush(); if (!list) { const ck = !!checksKey && /check before you send/i.test(last); list = el('ul', { class: ck ? 'checks' : null }); list.ck = ck; box.append(list); } list.append(list.ck ? check(li[1]) : el('li', {}, ...inline(li[1]))); continue; }
    if (!line.trim()) { flush(); list = null; continue; }
    para.push(line.trim());
  }
  flush();
  return box;
}
// The talk track: "SAY:", "CLICK 1:", "TIME:" become cue labels.
function talk(text) {
  const out = String(text || '').split(/\r?\n/).filter((l) => l.trim()).map((l) => {
    const m = l.match(/^([A-Z][A-Z0-9 ,'’\-]{1,40}):\s*(.*)$/);
    return m ? el('p', {}, el('span', { class: 'cue', text: m[1] }), m[2]) : el('p', { text: l });
  });
  return out.length ? out : [el('p', { class: 'muted', text: 'No talk track on this slide.' })];
}

// ---------- graphics helpers ----------
// Numbers count up to their value (Full motion), so a page arrives with a little life.
function countTo(node, n, fmt = (v) => Math.round(v).toLocaleString()) {
  if (!moving() || !n) { node.textContent = fmt(n); return; }
  const t0 = performance.now(), dur = motionLevel() === 'calm' ? 300 : 900;
  const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); node.textContent = fmt(n * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// A card tilts toward the cursor and catches the light (Full motion only).
function tilt(card) {
  card.addEventListener('pointermove', (e) => {
    if (motionLevel() !== 'full') return;
    const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.classList.add('tilting');
    card.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg'); card.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
    card.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  });
  card.addEventListener('pointerleave', () => { card.classList.remove('tilting'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
}

// The opening slide of the deck, drawn live from the New prospect form: their name, their logo and their color.
function liveCover() {
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 160 90'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
  [['#E1251B', 0.5, 30], ['#1D4ED8', 0.6, 38], ['#F7C400', 0.55, 46]].forEach(([c, o, y], j) => {
    const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', 'M -10 ' + (95 - j * 3) + ' Q 80 ' + y + ' 170 ' + (95 - j * 3)); p.setAttribute('stroke', c); p.setAttribute('opacity', o);
    p.style.cssText = 'stroke-dasharray:260;animation:draw 2s cubic-bezier(.2,.7,.2,1) both ' + j * 0.2 + 's'; svg.append(p);
  });
  const chip = el('span', { class: 'chip2' }), kick = el('span'), hello = el('div', { class: 'hello' }), h = el('div', { class: 'h' }), sub = el('div', { class: 'sub' });
  const home = el('div', { class: 'home' }), hn = el('div', { class: 'hn' }), dl = el('div', { class: 'dl' });
  const box = el('div', { class: 'lc', role: 'img', 'aria-label': 'Live preview of the opening slide' }, svg,
    el('div', { class: 't' }, chip, el('span', { class: 'pb' }, el('img', { src: 'icons/prime-mark.png', alt: '' })), kick, el('span', { class: 'date', text: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() })),
    hello, h, sub, el('div', { class: 'dots' }), dl, el('div', { class: 'deck' }), el('div', { class: 'tile' }, el('img', { src: 'icons/prime-mark.png', alt: '' })),
    el('div', { class: 'pills' }, el('span', { text: 'Be seen' }), el('span', { text: 'Be trusted' }), el('span', { text: 'Be chosen' })), el('div', { class: 'ring' }), home, hn,
    el('div', { class: 'foot' }, 'BE SEEN · BE TRUSTED · ', el('b', { text: 'BE CHOSEN' })),
    // Amaze: their markets as overprinted ink with their logo at the centre, and the red bar that drives to it.
    el('div', { class: 'ov' }, el('i'), el('i'), el('i')), el('i', { class: 'abar' }));
  let last = {}, logoKey = '', lastDesign = '';
  const set = (node, text) => { if (node.textContent !== text) { node.textContent = text; node.classList.remove('flash'); void node.offsetWidth; if (moving()) node.classList.add('flash'); } };
  async function update(d) {
    const name = String(d.name || '').trim() || 'Your prospect', short = name.replace(/^the\s+/i, '').split(/\s+/)[0] || name;
    const church = d.type === 'ministry' || /church|ministr|parish/i.test(name);
    const hex = (String(d.logo || '').match(/#?[0-9a-f]{6}\b/i) || [''])[0].replace('#', '');
    // The deck style picked on the form: Amaze has its own opening; the others open the same way.
    const design = d.design === 'amaze' ? 'amaze' : 'std';
    if (design !== lastDesign) { box.classList.toggle('amaze', design === 'amaze'); if (lastDesign && moving()) { box.classList.remove('restyle'); void box.offsetWidth; box.classList.add('restyle'); } lastDesign = design; }
    box.style.setProperty('--la', hex ? '#' + hex : '#F7C400');
    box.style.setProperty('--lov', hex ? '#' + hex : '#9AA6FF');
    box.style.setProperty('--lg', hex ? 'linear-gradient(160deg, color-mix(in oklab, #' + hex + ' 38%, #071034), #050A24)' : 'linear-gradient(160deg, #102266, #060E33)');
    set(kick, 'PRIO CONNECT  ×  ' + name.toUpperCase());
    set(hello, 'Hello, ' + short + '. We\'re Prio Connect.');
    set(h, 'Let\'s carry your invitation to every new ' + (church ? 'neighbor' : 'homeowner') + '.');
    const where = String(d.area || d.city || '').trim();
    set(sub, 'We\'d be honored to help carry that invitation to every new household' + (where ? ' in ' + where.replace(/,\s*[A-Z]{2}$/, '') : ' around you') + '.');
    set(hn, short.toUpperCase()); set(dl, (church ? 'NEIGHBORS' : 'RESIDENTS') + ', AND GROWING');
    // Their logo: a file they chose, or a logo link; otherwise their initials.
    const url = (String(d.logo || '').match(/https:\/\/\S+\.(png|jpe?g|webp|svg)\b\S*/i) || [''])[0];
    const key = (d.logoFile || '') + '|' + url + '|' + name;
    if (key !== logoKey) {
      logoKey = key;
      const src = d.logoFile ? await S.imageData(d.logoFile) : url;
      const ini = initials(name) || 'P';
      home.replaceChildren(src ? el('img', { src, alt: '' }) : ini); chip.replaceChildren(src ? el('img', { src, alt: '' }) : el('b', { text: ini, style: 'color:#0E1F62;font:800 1.3cqw/1 var(--display)' }));
    }
    last = d;
  }
  return { box, update };
}

// ---------- a turn of a key unlocks everything ----------
// The Prio Connect P is a key (its ring the bow, its stem the blade), as in the opening. Buttons that unlock something (build,
// present, save to the deck, check the key, refresh the decks) carry it; pressing one turns the key with a click before
// the action runs. Ctrl K, the key to every action, wears it too.
function keyGlyph(cls) {
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 24'); svg.setAttribute('class', 'kg' + (cls ? ' ' + cls : '')); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<g class="kg-k"><rect x="15" y="9" width="30" height="6" rx="3" fill="#2F63FF"/><rect x="35" y="14" width="3.2" height="5" rx="1" fill="#2F63FF"/><rect x="40.4" y="14" width="3.2" height="6.5" rx="1" fill="#2F63FF"/><circle cx="10" cy="12" r="6.6" fill="none" stroke="#E1251B" stroke-width="5"/><path d="M10 9.4l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" fill="#fff"/></g>';
  return svg;
}
const keyed = (btn) => { btn.classList.add('keyed'); btn.prepend(keyGlyph()); return btn; };
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('.keyed');
  if (!b || b.disabled || b.dataset.turning === 'go' || !moving()) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (b.dataset.turning) return;
  b.dataset.turning = '1'; b.classList.add('turn');
  setTimeout(() => { b.dataset.turning = 'go'; b.click(); delete b.dataset.turning; setTimeout(() => b.classList.remove('turn'), 250); }, motionLevel() === 'calm' ? 140 : 330);
}, true);
// A padlock: shut until something is unlocked (a working Claude key), then its shackle springs open.
function lockGlyph(open) {
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 28'); svg.setAttribute('class', 'lk' + (open ? ' open' : '')); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path class="lk-s" d="M7 13V8.5a5 5 0 0 1 10 0V13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="3" y="12" width="18" height="14" rx="4" fill="#F7C400"/><circle cx="12" cy="18" r="2.2" fill="#111827"/><rect x="11" y="18" width="2" height="4.4" rx="1" fill="#111827"/>';
  return svg;
}
// Toggles slide like a switch: one thumb glides to the pressed choice (any .seg, wherever it appears).
function segThumb(seg) {
  if (!seg || !seg.isConnected) return;
  let th = seg.querySelector(':scope > .seg-thumb'); const on = seg.querySelector(':scope > button[aria-pressed="true"]');
  if (!th) { th = el('i', { class: 'seg-thumb', 'aria-hidden': 'true' }); seg.prepend(th); seg.classList.add('has-thumb'); th.style.transition = 'none'; requestAnimationFrame(() => { th.style.transition = ''; }); }
  if (!on) { th.style.opacity = '0'; return; }
  Object.assign(th.style, { opacity: '1', left: on.offsetLeft + 'px', top: on.offsetTop + 'px', width: on.offsetWidth + 'px', height: on.offsetHeight + 'px' });
}
new MutationObserver((list) => {
  const segs = new Set();
  list.forEach((m) => {
    if (m.type === 'attributes') { const sg = m.target.closest && m.target.closest('.seg'); if (sg) segs.add(sg); }
    else m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return; if (n.matches('.seg')) segs.add(n); n.querySelectorAll && n.querySelectorAll('.seg').forEach((x) => segs.add(x)); });
  });
  if (segs.size) requestAnimationFrame(() => segs.forEach(segThumb));
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed'] });
addEventListener('resize', () => document.querySelectorAll('.seg.has-thumb').forEach(segThumb));

// ---------- echolocation: searching sends out a ping; what it finds answers with an echo, timed by its distance ----------
const hashStr = (t) => { let h = 2166136261; for (const c of String(t)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function sonarPing(host, x, y, R = 900, n = 3) {
  if (!moving() || !host) return;
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'sonar'); svg.setAttribute('aria-hidden', 'true');
  for (let k = 0; k < n; k++) { const c = document.createElementNS(svgNS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 0); c.style.cssText = '--R:' + R + 'px;animation-delay:' + (k * 0.13) + 's'; svg.append(c); }
  host.append(svg); setTimeout(() => svg.remove(), 1800);
}
// The research, live, as a sonar scope: every search pings out from the centre; each source found lights up where the
// ping reaches it and sends its echo back. Searches blue, sources read red, their own site yellow, findings in ink.
function sonarScope() {
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'scope'); svg.setAttribute('viewBox', '-120 -120 240 240'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'What the research has found so far');
  const mk = (tag, attrs, parent) => { const n = document.createElementNS(svgNS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); (parent || svg).append(n); return n; };
  [30, 60, 90, 116].forEach((r) => mk('circle', { class: 'rg', r }));
  mk('line', { class: 'rg', x1: -116, y1: 0, x2: 116, y2: 0 }); mk('line', { class: 'rg', x1: 0, y1: -116, x2: 0, y2: 116 });
  const pings = mk('g', {}), dots = mk('g', {});
  mk('circle', { class: 'src', r: 5 }); mk('circle', { class: 'src-p', r: 5 });
  const ping = (reach = 118) => { if (!moving()) return; const c = mk('circle', { class: 'pg', r: 0 }, pings); c.style.setProperty('--R', reach + 'px'); setTimeout(() => c.remove(), 1700); };
  const blip = (kind, text) => {
    const h = hashStr(text), a = (h % 3600) / 3600 * Math.PI * 2, d = 26 + ((h >>> 12) % 86), x = Math.cos(a) * d, y = Math.sin(a) * d;
    ping(d + 8);
    setTimeout(() => {
      const g = mk('g', { class: 'bl k-' + kind }, dots); mk('title', {}, g).textContent = text;
      mk('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: kind === 'k' ? 4.5 : 3.4, class: 'dot' }, g);
      if (moving()) { const e = mk('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 0, class: 'ec' }, g); e.style.setProperty('--R', '16px'); const back = mk('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 0, class: 'rt' }, g); back.style.setProperty('--R', d.toFixed(0) + 'px'); setTimeout(() => { e.remove(); back.remove(); }, 1500); }
      while (dots.children.length > 48) dots.firstChild.remove();
    }, moving() ? Math.round(d / 118 * 700) : 0);
  };
  const idle = setInterval(() => { if (!svg.isConnected) { clearInterval(idle); return; } ping(); }, 2800);
  return { el: svg, blip, ping };
}

// ---------- the Prio Connect badge, alive: its four pieces morph into the five designers' compositions and back ----------
// Built on the badge's own geometry (512 grid), so it always returns to the true logo: tile, stem, ring and spark.
// Martens (overprinted discs), Lissitzky (a bar and planes on a diagonal), Müller-Brockmann (concentric rings), Bass (cut
// paper). Each state: tile/stem [x, y, w, h, rx, rotate], ring [cx, cy, r, stroke], spark [dx, dy, scale, rotate].
const MORPH = {
  badge: { tile: [0, 0, 512, 512, 96, 0], stem: [146, 98, 76, 310, 38, 0], ring: [275, 205, 75, 64], spark: [0, 0, 1, 0] },
  overprint: { tile: [24, 150, 300, 300, 150, 0], stem: [214, 36, 256, 256, 128, 0], ring: [318, 336, 64, 128], spark: [178, -150, 1.5, 45] },
  planes: { tile: [292, 52, 168, 168, 0, 14], stem: [6, 292, 500, 30, 6, -24], ring: [146, 176, 54, 108], spark: [196, 170, 1.3, 90] },
  rings: { tile: [76, 76, 360, 360, 180, 0], stem: [222, 222, 68, 68, 34, 0], ring: [256, 256, 172, 14], spark: [58, 49, 1.1, 0] },
  cut: { tile: [64, 150, 256, 256, 12, -9], stem: [304, 46, 98, 384, 8, 7], ring: [196, 360, 58, 44], spark: [162, -110, 1.7, 20] }
};
const MORPH_ORDER = ['overprint', 'planes', 'rings', 'cut'];
primeMorph.n = 0;
function primeMorph(size, o = {}) {
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '-40 -40 592 592'); svg.setAttribute('class', 'pm st-badge' + (o.cls ? ' ' + o.cls : '')); svg.setAttribute('aria-hidden', 'true');
  svg.style.width = svg.style.height = size + 'px';
  const mk = (tag, attrs) => { const n = document.createElementNS(svgNS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); svg.append(n); return n; };
  // Soft, clay-like light (Tarka) on the badge's flat primaries (Vignelli): each piece lit from the top left.
  const gid = 'pm' + (++primeMorph.n), defs = document.createElementNS(svgNS, 'defs');
  defs.innerHTML = '<radialGradient id="' + gid + 't" cx="30%" cy="22%" r="95%"><stop offset="0" stop-color="#FFE266"/><stop offset=".5" stop-color="#F7C400"/><stop offset="1" stop-color="#D9A900"/></radialGradient>' +
    '<linearGradient id="' + gid + 's" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4A78FF"/><stop offset=".55" stop-color="#1D4ED8"/><stop offset="1" stop-color="#163CA8"/></linearGradient>' +
    '<linearGradient id="' + gid + 'r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5A4F"/><stop offset=".5" stop-color="#E1251B"/><stop offset="1" stop-color="#B51A12"/></linearGradient>';
  svg.append(defs);
  const tile = mk('rect', { class: 'pm-tile', fill: 'url(#' + gid + 't)' }), stem = mk('rect', { class: 'pm-stem', fill: 'url(#' + gid + 's)' }), ring = mk('circle', { class: 'pm-ring', fill: 'none', stroke: 'url(#' + gid + 'r)' });
  const spark = mk('path', { class: 'pm-spark', d: 'M198 179 L203.5 201.5 L226 207 L203.5 212.5 L198 235 L192.5 212.5 L170 207 L192.5 201.5 Z' });
  const rect = (n, [x, y, w, h, rx, rot]) => { Object.assign(n.style, { x: x + 'px', y: y + 'px', width: w + 'px', height: h + 'px', rx: rx + 'px', ry: rx + 'px', transform: 'rotate(' + rot + 'deg)' }); };
  const set = (name) => { const S = MORPH[name]; rect(tile, S.tile); rect(stem, S.stem); Object.assign(ring.style, { cx: S.ring[0] + 'px', cy: S.ring[1] + 'px', r: S.ring[2] + 'px', strokeWidth: S.ring[3] + 'px' });
    spark.style.transform = 'translate(' + S.spark[0] + 'px,' + S.spark[1] + 'px) rotate(' + S.spark[3] + 'deg) scale(' + S.spark[2] + ')';
    svg.setAttribute('class', 'pm st-' + name + (o.cls ? ' ' + o.cls : '')); svg.dataset.state = name; };
  set('badge'); svg.morphTo = set;
  if (!moving()) return svg;
  let k = Math.floor(Math.random() * MORPH_ORDER.length), timer = null, live = !o.hover;
  const hold = o.hold || 2300, rest = o.rest || 1500;
  const step = () => {
    if (o.hover ? !live : !svg.isConnected && svg.dataset.started) { set('badge'); return; }
    svg.dataset.started = '1';
    if (svg.dataset.state === 'badge') { set(MORPH_ORDER[k++ % MORPH_ORDER.length]); timer = setTimeout(step, hold); }
    else { set('badge'); timer = setTimeout(step, o.hover ? 260 : rest); }
  };
  if (o.hover) {
    const host = o.hoverHost || svg;
    host.addEventListener('pointerenter', () => { live = true; clearTimeout(timer); step(); });
    host.addEventListener('pointerleave', () => { live = false; clearTimeout(timer); set('badge'); });
  } else timer = setTimeout(step, o.delay || 900);
  return svg;
}

const withTilt = (card) => { tilt(card); return card; };
// A deck of cards, quietly: kits are cards (versions stack like a deck, a kit with no cover shows a card back), the
// Library deals its kits onto the table, and every tab change is dealt like a hand of poker.
// ---------- plates: abstract compositions after five designers (plates.js), one voice per screen ----------
// Martens (overprint) on a kit, Weingart (halftone moiré) while building, Müller-Brockmann (grid, concentric curves)
// in the Library and Settings, Lissitzky (floating planes) on New prospect, Bass (cut paper) on card backs and empties.
const PRIME_INKS = ['#F7C400', '#E1251B', '#1D4ED8', '#111827'];
function inks() {
  if (themeNow() !== 'shuffle') return PRIME_INKS;
  const cs = getComputedStyle(document.documentElement), tv = (k) => cs.getPropertyValue('--' + k).trim();
  return [tv('accent') || PRIME_INKS[0], tv('red') || PRIME_INKS[1], tv('blue') || PRIME_INKS[2], tv('ink') || PRIME_INKS[3]];
}
function plate(kind, seed, cols, o = {}, extra = '') {
  const d = el('div', { class: 'plate pl-' + kind + (extra ? ' ' + extra : ''), 'aria-hidden': 'true' });
  try { if (window.Plates) d.innerHTML = window.Plates[kind](seed, cols, Object.assign({ animate: moving() }, o)); } catch (e) { /* decoration only */ }
  return d;
}
// No slide previews yet: their logo on a white chip over an overprint plate in their own colors (Martens).
const hexOf = (c) => '#' + String(c || '').replace('#', '');
const logoCover = (v, seed) => { const cs = (v.colors || []).map(hexOf); return el('span', { class: 'logocover', style: cs[0] ? '--k:' + cs[0] : '' }, plate('overprint', seed, cs.length ? cs.concat(['#F7C400']) : PRIME_INKS, { w: 400, h: 225, n: 6, blend: 'screen', opacity: 0.7, animate: false }), el('span', { class: 'lc-chip' }, el('img', { src: v.logoSrc, alt: '', loading: 'lazy' }))); };
const cardBack = (ini, seed) => el('span', { class: 'cardback' }, plate('cutpaper', seed || ini || 'P', PRIME_INKS, { w: 400, h: 300, n: 4, animate: false }), el('b', { text: ini || 'P' }));
function deal(grid) {
  if (motionLevel() !== 'full') return;
  grid.classList.add('dealing');
  // The page itself is dealt first; the kits follow once it has landed.
  [...grid.children].forEach((c) => { c.style.opacity = '0'; });
  setTimeout(() => requestAnimationFrame(() => {
    [...grid.children].forEach((c) => { c.style.opacity = ''; });
    const g = grid.getBoundingClientRect(), ox = g.left + g.width / 2, oy = g.top - 30;
    [...grid.children].forEach((c, i) => {
      if (!c.animate) return;
      const r = c.getBoundingClientRect(), dx = ox - (r.left + r.width / 2), dy = oy - (r.top + r.height / 2), rot = (i % 2 ? 1 : -1) * (6 + (i * 7) % 9);
      c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(.55)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'none', opacity: 1 }],
        { duration: 720, delay: Math.min(i, 14) * 70, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
    });
    setTimeout(() => grid.classList.remove('dealing'), 1800);
  }), document.startViewTransition ? 560 : 0);
}
// The Library at a glance: prospects, versions, faith and secular, slides ready to present, average fit.
function libraryStats(all) {
  const latest = all.map((g) => g.latest), fits = latest.map((v) => parseFloat(v.fit)).filter((n) => n > 0);
  const avg = fits.length ? fits.reduce((a, b) => a + b, 0) / fits.length : 0;
  const tiles = [
    ['Prospects', all.length, '#1D4ED8', 100],
    ['Versions built', all.reduce((a, g) => a + g.versions.length, 0), '#7C3AED', 100],
    ['Faith, secular', null, '#F7C400', all.length ? latest.filter((v) => v.model === 'faith').length / all.length * 100 : 0],
    ['Slides to present', latest.reduce((a, v) => a + v.previews.length, 0), '#0EA5E9', 100],
    ['Average fit', avg, '#16A34A', avg * 10]
  ];
  const faith = latest.filter((v) => v.model === 'faith').length;
  return el('div', { class: 'stats' }, tiles.map(([label, n, c, w], i) => {
    const b = el('b'), bar = el('i');
    if (n == null) { const f = el('span', { style: 'font:inherit;color:inherit;letter-spacing:inherit;text-transform:none' }), g = el('span', { style: 'font:inherit;color:var(--muted);letter-spacing:inherit;text-transform:none' }); b.append(f, ' · ', g); countTo(f, faith); countTo(g, all.length - faith); }
    else countTo(b, n, label === 'Average fit' ? (v) => (n ? v.toFixed(1) : '–') : undefined);
    setTimeout(() => { bar.style.width = w + '%'; }, 80 + i * 90);
    return el('div', { class: 'stat', style: '--c:' + c }, b, el('span', { text: label }), bar);
  }));
}

// ---------- pages ----------
const view = $('#view'), pages = {};
let leave = null;
// Page changes cross-fade; a kit opened from its Library cover morphs from that cover into the deck (view transitions).
let morph = false;
// ---------- the prospect's name, dot to dot ----------
// Behind a kit's page (and the build screen) the prospect's name is set in dots on the notebook's grid and joined by
// pencil, its dots running from Prio Connect yellow to blue across the word, with the star after it. Still: faint, behind
// the work. Busy: it breathes. Draw: the pencil joins it in from the first letter, then it breathes.
function nameArt(text, mode) {
  const N = window.Plates && Plates.dotname ? Plates.dotname(text, 60) : null;
  if (!N || N.cols < 3) return '';
  const pad = 1, W = N.cols + pad * 2 + 4, H = 5 + pad * 2, lit = new Set(N.on.map((q) => q.join(','))), on = (c, r) => lit.has(c + ',' + r);
  const dark = document.documentElement.dataset.scheme === 'dark', pencil = dark ? '#DCE3EE' : '#3A3A38';
  const mix = (t) => { const a = [250, 200, 0], b = [38, 86, 217]; return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const X = (c) => (c + pad + 0.5).toFixed(1), Y = (r) => (r + pad + 0.5).toFixed(1), at = (c) => (c / N.cols * 1.6).toFixed(2);
  let lines = '', dots = '';
  N.on.forEach(([c, r]) => {
    const link = (c2, r2) => { lines += '<line x1="' + X(c) + '" y1="' + Y(r) + '" x2="' + X(c2) + '" y2="' + Y(r2) + '" pathLength="1" style="animation-delay:' + at(c) + 's"/>'; };
    if (on(c + 1, r)) link(c + 1, r);
    if (on(c, r + 1)) link(c, r + 1);
    if (on(c + 1, r + 1) && !on(c + 1, r) && !on(c, r + 1)) link(c + 1, r + 1);
    if (on(c - 1, r + 1) && !on(c - 1, r) && !on(c, r + 1)) link(c - 1, r + 1);
    dots += '<circle cx="' + X(c) + '" cy="' + Y(r) + '" r=".3" fill="' + mix(N.cols > 1 ? c / (N.cols - 1) : 0) + '" style="animation-delay:' + at(c) + 's"/>';
  });
  const sx = (N.cols + pad + 2.2).toFixed(1), star = '<g transform="translate(' + sx + ' ' + (pad + 0.9) + ')"><path class="st" d="M0 -1.3C.12 -.4 .4 -.12 1.3 0C.4 .12 .12 .4 0 1.3C-.12 .4 -.4 .12 -1.3 0C-.4 -.12 -.12 -.4 0 -1.3Z" fill="#FAC800" stroke="#FF7A1A" stroke-width=".15"/></g>';
  const css = mode === 'still' ? '' : '@keyframes p{0%,100%{opacity:.5}50%{opacity:1}}@keyframes d{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes o{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}' +
    'circle,.st{transform-box:fill-box;transform-origin:center}' + (mode === 'draw' ? 'line{stroke-dasharray:1;animation:d .45s ease-out both}circle{animation:o .35s cubic-bezier(.2,1.6,.4,1) both}.st{animation:o .5s cubic-bezier(.2,1.7,.35,1) 1.9s both}.g{animation:p 1.6s ease-in-out 2.4s infinite}' : '.g{animation:p 1.6s ease-in-out infinite}');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W * 24 + '" height="' + H * 24 + '">' + (css ? '<style>' + css + '</style>' : '') +
    '<g class="g" opacity="' + (mode === 'still' ? '.42' : '1') + '"><g fill="none" stroke="' + pencil + '" stroke-width=".1" stroke-linecap="round" opacity=".45">' + lines + '</g>' + dots + star + '</g></svg>';
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}
// Put a name behind this page (or, with no name, the Prio Connect P again).
function pageName(text, drawing) {
  const m = document.querySelector('main'); if (!m) return;
  const still = text ? nameArt(text, 'still') : '';
  if (!still) { ['--sketch', '--sketch-busy', '--sk-size', '--sk-pos'].forEach((v) => m.style.removeProperty(v)); return; }
  m.style.setProperty('--sketch', still);
  m.style.setProperty('--sketch-busy', nameArt(text, drawing ? 'draw' : 'busy'));
  m.style.setProperty('--sk-size', 'min(calc(100vw - 360px), 980px) auto');
  m.style.setProperty('--sk-pos', 'right 4vw bottom 7vh');
}

async function route() {
  if (leave) { leave(); leave = null; }
  pageName('');
  const h = location.hash.slice(1), [page, ...rest] = h.split('/');
  let name = pages[page] ? page : '';
  if (!name) { const all = await S.kits(); name = all.length || (await S.starterKits().catch(() => [])).length ? 'library' : 'new'; }
  const paint = async () => {
    $('#nav-new').classList.toggle('on', name === 'new');
    document.querySelectorAll('.rail nav a').forEach((a) => a.classList.toggle('on', a.dataset.tab === (name === 'kit' ? 'library' : name)));
    view.replaceChildren(); view.scrollTop = 0;
    await pages[name](decodeURIComponent(rest.join('/')));
  };
  // While the opening is on screen there is no page transition: its snapshots are drawn above everything, the opening too.
  if (moving() && document.startViewTransition && !document.hidden && !document.getElementById('splash') && (morph || uiNow().turn !== 'none')) {
    if (morph) document.documentElement.classList.add('morphing');
    // A page turn (not a morph): the curl, a sheet laid exactly over the page, shows the turning leaf's back and shadow.
    const curl = document.getElementById('curl'), turn = !morph && motionLevel() === 'full' && uiNow().turn === 'curl' && curl;
    if (turn) { const r = view.getBoundingClientRect(), z = parseFloat(document.documentElement.style.zoom) || 1; Object.assign(curl.style, { left: r.left / z + 'px', top: r.top / z + 'px', width: r.width / z + 'px', height: r.height / z + 'px' }); } // the page is zoomed for larger text; the curl sits inside that zoom
    const vt = document.startViewTransition(async () => { await paint(); if (turn) document.documentElement.classList.add('turning'); });
    vt.finished.finally(() => document.documentElement.classList.remove('morphing', 'turning'));
    await vt.updateCallbackDone.catch(() => {});
    vt.finished.finally(() => { morph = false; document.querySelectorAll('[style*="view-transition-name"]').forEach((n) => { n.style.viewTransitionName = ''; }); });
  } else { await paint(); morph = false; if (moving() && view.firstElementChild) view.firstElementChild.classList.add('enter'); }
  // The page's number, at its foot (the notebook look shows it).
  const folio = document.getElementById('folio'); if (folio) folio.textContent = String(({ library: 1, kit: 2, new: 3, run: 4, crm: 5, ads: 6, brand: 7, company: 8, settings: 9 })[name] || 1);
  view.focus({ preventScroll: true });
}
// Prio Connect's media pricing: shown on every deck's Media options slide and beside the mock ads.
function pricingCard() {
  const rows = el('div', { class: 'pr-rows' }), card = el('section', { class: 'card' }, el('h2', { text: 'Prio Connect pricing' }),
    el('p', { class: 'small muted', text: 'Media pricing on every deck\'s Media options slide and beside the mock ads. New decks use it at once; the button below brings decks already made up to date.' }), rows);
  const row = (o) => { const k = el('input', { type: 'text', value: o.kind || '', 'aria-label': 'Option name', placeholder: 'VIDEO' }), c = el('input', { type: 'text', inputmode: 'numeric', value: o.cost ? String(o.cost) : '', 'aria-label': 'Price in dollars', placeholder: '5200' }), n = el('input', { type: 'text', value: o.note || '', 'aria-label': 'What it is', placeholder: 'Audience-focused video campaign' });
    const r = el('div', { class: 'pr-row' }, k, el('span', { class: 'pr-cur' }, '$', c), n); r.get = () => ({ kind: k.value, cost: Number(String(c.value).replace(/[^\d.]/g, '')), note: n.value }); return r; };
  const save = el('button', { class: 'btn dark', type: 'button' }, 'Save prices'), apply = el('button', { class: 'btn ghost', type: 'button' }, 'Update every kit\'s deck');
  S.pricing().then((p) => { rows.replaceChildren(...p.media.map(row), row({})); rows.after(el('div', { class: 'actions' }, save, apply)); });
  save.addEventListener('click', async () => { try { const r = await S.setPricing([...rows.children].map((x) => x.get()).filter((o) => o.kind && o.cost)); toast('Saved: ' + r.options.map((o) => o.kind.toLowerCase() + ' $' + o.cost.toLocaleString('en-US')).join(', ') + '. New decks use these prices.'); } catch (e) { toast(errText(e)); } });
  apply.addEventListener('click', async () => { apply.disabled = true; apply.textContent = 'Updating the decks…'; try { const r = await S.applyPricing(); toast('Updated ' + r.updated + ' of ' + r.total + ' animated decks with the current prices.'); } catch (e) { toast(errText(e)); } finally { apply.disabled = false; apply.textContent = 'Update every kit\'s deck'; } });
  return card;
}
async function addPrimeKits() {
  try { const r = await S.addStarter(); toast(r.added.length ? 'Added ' + r.added.length + ' Prio Connect kit' + (r.added.length > 1 ? 's' : '') + '. Their decks are being built now.' : r.total ? 'Every Prio Connect kit is already in your Library.' : 'This copy of the app has no Prio Connect kits inside.'); refreshCount(); if (r.added.length) { location.hash = 'library'; route(); } }
  catch (e) { toast(errText(e)); }
}
// Drop kits anywhere: kit zips, kit folders, a folder of kits, or a deck and its PDFs. (The Studio's photo rows
// take their own drops first.)
(() => {
  const veil = el('div', { class: 'dropveil', hidden: true }, el('div', {}, el('b', { text: 'Drop to add to your Library' }), el('span', { text: 'Kit zips, kit folders, a folder of kits, or a deck and its PDFs' })));
  document.body.append(veil);
  let depth = 0;
  const files = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  addEventListener('dragenter', (e) => { if (!files(e) || e.target.closest && e.target.closest('.studio')) return; depth++; veil.hidden = false; });
  addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; veil.hidden = true; } });
  addEventListener('dragover', (e) => { if (files(e)) e.preventDefault(); });
  addEventListener('drop', async (e) => {
    depth = 0; veil.hidden = true;
    if (!files(e) || e.defaultPrevented || (e.target.closest && e.target.closest('.studio'))) return;
    e.preventDefault();
    const paths = [...e.dataTransfer.files].map((f) => S.filePath(f)).filter(Boolean);
    if (!paths.length) return;
    toast('Adding…');
    try {
      const r = await S.importDropped(paths);
      toast(r.added.length ? 'Added ' + r.added.map((k) => k.name).join(', ') + '.' : r.skipped.length ? 'Already in your Library: ' + r.skipped.join(', ') + '.' : 'No kits found there. Drop a kit zip, a kit folder, or a deck and its PDFs.');
      if (r.added.length) { refreshCount(); if (r.added.length === 1) location.hash = 'kit/' + encodeURIComponent(r.added[0].dir); else { location.hash = 'library'; route(); } }
    } catch (err) { toast(errText(err)); }
  });
})();
async function refreshCount() { const all = await S.kits(); $('#kit-count').textContent = all.length ? String(all.length) : ''; }

// New prospect: the same fields as the New prospect form on GitHub.
const BIBLES = ['NIV', 'ESV', 'NASB', 'NKJV', 'KJV', 'CSB', 'NLT', 'NABRE'];
pages.new = async () => {
  // Who is pitching: Prio Connect gets its own options (faith model, Bible, pilot); any other company gets its own kit.
  const co = window.activeCompany ? await window.activeCompany().catch(() => null) : null, isPrime = !co || co.prime;
  const set = await S.settings();
  const d = Object.assign({ type: 'auto', model: 'auto', bible: 'auto', design: 'abstract' }, store.get('draft', {}));
  const live = liveCover(), inputs = {};
  const save = () => { store.set('draft', d); live.update(d); };
  const field = (id, label, o = {}) => {
    const i = el(o.multi ? 'textarea' : 'input', { id: 'f-' + id, type: o.multi ? null : o.type || 'text', placeholder: o.ph, autocomplete: 'off', spellcheck: o.url ? 'false' : null });
    i.value = d[id] || '';
    i.addEventListener('input', () => { d[id] = i.value; save(); if (o.on) o.on(i); });
    inputs[id] = i;
    return el('div', { class: 'field' + (o.big ? ' big' : '') }, el('label', { for: 'f-' + id }, label, o.hint && el('span', { class: 'hint', text: o.hint })), i);
  };
  const seg = (id, label, opts, after) => {
    const btns = opts.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(d[id] === v), onclick: () => { d[id] = v; save(); btns.forEach((b, k) => b.setAttribute('aria-pressed', String(opts[k][0] === v))); if (after) after(); } }, t));
    return el('div', { class: 'field' }, el('span', { class: 'label', text: label }), el('div', { class: 'seg', role: 'group', 'aria-label': label }, btns));
  };
  const bible = el('select', { id: 'f-bible' }, el('option', { value: 'auto', text: 'Find it in the research' }), BIBLES.map((b) => el('option', { value: b, text: b })));
  bible.value = d.bible || 'auto'; bible.addEventListener('change', () => { d.bible = bible.value; save(); });
  const bibleField = el('div', { class: 'field' }, el('label', { for: 'f-bible' }, 'Bible translation', el('span', { class: 'hint', text: 'Faith model only. Pick it if you know which Bible they read from.' })), bible);
  const showBible = () => { bibleField.hidden = d.model === 'secular'; }; showBible();
  const filled = (ids) => ids.some((k) => String(d[k] || '').trim());
  // Their logo as a file wins over whatever their home page shows (a dealer badge can look like a logo).
  const logoPick = () => {
    const name = el('span', { class: 'path', text: d.logoFile || 'None chosen: the logo on their home page is used' });
    const clear = el('button', { class: 'btn ghost', type: 'button', hidden: !d.logoFile, onclick: () => { d.logoFile = ''; save(); name.textContent = 'None chosen: the logo on their home page is used'; clear.hidden = true; } }, 'Clear');
    return el('div', { class: 'field' }, el('span', { class: 'label', text: 'Their logo as a file' }),
      el('div', { class: 'actions' }, el('button', { class: 'btn ghost', type: 'button', onclick: async () => { const p = await S.pickPhoto('logo'); if (p) { d.logoFile = p; save(); name.textContent = p; clear.hidden = false; } } }, 'Choose their logo…'), clear, name));
  };
  const btn = set.hasKey ? keyed(el('button', { class: 'btn primary', type: 'button', onclick: () => submit() }, 'Build the kit'))
    : el('button', { class: 'btn primary', type: 'button', title: 'The research needs your key, once', onclick: () => { location.hash = 'settings'; } }, lockGlyph(false), 'Add your research key');
  async function submit() {
    d.name = (d.name || '').trim();
    if (!set.hasKey) { toast('Add your research key in Settings first.'); location.hash = 'settings'; return; }
    if (!d.name) { inputs.name.focus(); toast('Add the prospect\'s name first.'); return; }
    if (!navigator.onLine) { toast('This computer is offline. The research needs the internet: connect, then build the kit.'); return; }
    btn.disabled = true; btn.textContent = 'Starting…';
    const input = { name: d.name, website: d.website, city: d.city, hq: d.hq, area: d.area, offer: d.offer, people: d.people, logo: d.logo, logoFile: d.logoFile, photos: d.photos, social: d.social, notes: d.notes,
      type: d.type, model: d.model, design: d.design || 'abstract', bible: d.model === 'secular' ? 'auto' : d.bible, meeting: d.meeting, kickoff: d.kickoff, fee: d.fee };
    try { await S.start(input); store.del('draft'); location.hash = 'run'; } catch (e) { btn.disabled = false; btn.replaceChildren(keyGlyph(), 'Build the kit'); toast(errText(e)); }
  }
  view.append(el('div', { class: 'wrap' },
    el('div', { class: 'head plated' }, (soft() ? plate('cutpaper', 'new prospect', inks(), { w: 900, h: 300, n: 5, fit: 'xMaxYMid meet' }) : plate('planes', 'new prospect', inks(), { w: 900, h: 300, fit: 'xMaxYMid meet' })), el('div', {}, el('div', { class: 'eyebrow', text: 'Research, deck and documents' }), el('h1', { text: 'New prospect' }), el('p', { class: 'muted', text: 'Fill in what you know. The research does the rest, and the kit lands in your Library.' }))),
    el('div', { class: 'newgrid' }, el('div', { style: 'min-width:0' }),
    set.hasKey ? null : el('div', { class: 'note' }, 'One-time setup: add your research key in ', el('a', { href: '#settings' }, 'Settings'), ' before the first kit.'),
    el('section', { class: 'card' },
      field('name', 'Who are we meeting?', { big: true, ph: 'Prospect name', on: (i) => { if (urlish(i.value) && !d.website) { d.website = inputs.website.value = i.value.trim(); d.name = i.value = ''; save(); toast('Moved the link to Website. Now their name?'); } } }),
      el('div', { class: 'grid2' }, field('website', 'Website', { ph: 'kingdomroofinginc.com', url: true, hint: 'The research reads their site first: logo, colors, photos.' }), field('city', 'City and state', { ph: 'Venice, FL' }))),
    isPrime ? null : el('div', { class: 'note co-as' }, 'Pitching as ', el('b', { text: co.name }), '. The deck, talk track and leave-behind use its offer, prices, proof, voice and colors. ', el('a', { href: '#company' }, 'Change')),
    !isPrime ? null : el('section', { class: 'card' },
      seg('type', 'Kind', [['ministry', 'Church or ministry'], ['business', 'Business'], ['auto', 'Not sure']]),
      seg('model', 'Model', [['auto', 'Decide from research'], ['faith', 'Faith'], ['secular', 'Secular']], showBible),
      bibleField,
      seg('design', 'Deck style', [['abstract', 'Abstract'], ['amaze', 'Amaze'], ['standard', 'Bridge standard']])),
    el('details', { class: 'card', open: filled(['hq', 'area', 'offer', 'people', 'logo', 'logoFile', 'photos', 'social', 'notes']) },
      el('summary', {}, el('span', {}, 'What we know', el('span', { class: 'eyebrow', text: 'optional' }))),
      el('p', { class: 'muted small', text: 'Anything here saves research time and makes the kit more accurate. Their mission, slogan or jingle is gold.' }),
      el('div', { class: 'grid2' }, field('hq', 'Headquarters address'), field('area', 'Towns they serve', { ph: 'Venice, North Port, Englewood' })),
      el('div', { style: 'height:16px' }),
      el('div', { class: 'grid2' }, field('offer', 'What they offer'), field('people', 'Who we\'re meeting', { ph: 'Sean Worthington (co-founder)' })),
      el('div', { style: 'height:16px' }),
      el('div', { class: 'grid2' }, field('logo', 'Logo link and brand colors', { ph: 'https://…/logo.png  #393C99', url: true, hint: 'Main color, then button color, then their dark band.' }), field('social', 'Social pages', { url: true })),
      el('div', { style: 'height:16px' }),
      logoPick(),
      field('photos', 'Page with good photos', { url: true }),
      field('notes', 'Anything else', { multi: true, ph: 'Their mission or slogan, Google rating, years in business, how we met them' })),
    !isPrime ? el('section', { class: 'card' }, field('meeting', 'Meeting date', { ph: 'November 12, 2026' })) : el('details', { class: 'card', open: filled(['meeting', 'kickoff', 'fee']) },
      el('summary', {}, el('span', {}, 'The meeting and the deal', el('span', { class: 'eyebrow', text: 'optional' }))),
      el('div', { class: 'grid2' }, field('meeting', 'Meeting date', { ph: 'November 12, 2026' }), field('kickoff', 'Pilot kickoff', { type: 'date', hint: 'Empty: the Monday about 2½ weeks out.' })),
      el('div', { style: 'height:16px' }),
      field('fee', 'Pilot fee', { ph: '15000', hint: 'Empty: $15,000.' })),
    el('div', { class: 'bar' }, el('span', { class: 'muted small', text: 'Takes ' + RUN_COST + '.' }), btn))));
  // The form is built as the grid's children; it all moves into the first column, and the live cover takes the second.
  const grid = view.querySelector('.newgrid'), col = grid.firstElementChild;
  if (!isPrime) grid.classList.add('nonprime');
  while (col.nextSibling) col.append(col.nextSibling);
  grid.append(el('aside', { 'aria-label': 'Live preview of the opening slide' }, live.box,
    el('p', { class: 'lccap', text: 'Your opening slide, live as you type. The finished deck takes their logo, colors and photos from their website.' })));
  live.update(d);
  if (!d.name) setTimeout(() => inputs.name && inputs.name.focus(), 0);
};

// Live progress, from the engine's own log lines.
const STEPS = [['Reading their website', 'Pages, photos, logo and colors'], ['Researching', 'Census numbers, growth, news and reviews'], ['Writing', 'The deck, assessment and cheat sheet'], ['Building the deck', 'Slides, animations and the talk track'], ['Printing the documents', 'Assessment, cheat sheet and leave-behind']];
const STEP_LINES = [[0, /\] (Reading|Starting)/], [1, /\] Researching /], [2, /\] Writing the brief/], [3, /\] Building the deck/], [4, /\] Printing /], [5, /\] Done\./]];
const CHANGE = [['Applying your changes', 'Notes, links, photo and colors'], ['Building the deck', 'Slides, animations and the talk track'], ['Printing the documents', 'Assessment, cheat sheet and leave-behind']];
const CHANGE_LINES = [[0, /\] Changing/], [1, /\] Building the deck/], [2, /\] Printing /], [3, /\] Done\./]];
pages.run = async () => {
  const wrap = el('div', { class: 'wrap narrow' }); view.append(wrap);
  const st = await S.status();
  if (!st.running) { wrap.append(el('div', { class: 'empty' }, el('div', { class: 'pm-host' }, primeMorph(150, { hold: 2000, rest: 1300 })), el('h2', { text: 'Nothing is building right now.' }), el('div', { class: 'actions' }, el('a', { class: 'btn primary', href: '#new' }, 'New prospect'), el('a', { class: 'btn ghost', href: '#library' }, 'Library')))); return; }
  pageName(st.name, true);
  const lines = st.lines.slice(), STEPS_NOW = st.kind === 'change' ? CHANGE : STEPS, LINES_NOW = st.kind === 'change' ? CHANGE_LINES : STEP_LINES;
  let reached = 0;
  const time = el('div', { class: 'clock' }), log = el('pre', { class: 'log' }), steps = el('ol', { class: 'steps' });
  // The build as a bridge: one pylon per step, the deck fills as steps land and the P rides across to their door.
  const N = STEPS_NOW.length, at = (k) => 4 + 92 * (k / N);
  const svgNS = 'http://www.w3.org/2000/svg', arcs = document.createElementNS(svgNS, 'svg');
  arcs.setAttribute('class', 'arcs'); arcs.setAttribute('viewBox', '0 0 800 150'); arcs.setAttribute('preserveAspectRatio', 'none'); arcs.setAttribute('aria-hidden', 'true');
  // Three arcs rise over the deck like the rainbow arcs on the deck covers, drawn in as the page opens.
  [['#E1251B', 0.35, -70], ['#1D4ED8', 0.4, -46], ['#F7C400', 0.55, -22]].forEach(([c, o, h], j) => {
    const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', 'M 0 93 Q 400 ' + h + ' 800 93'); p.setAttribute('stroke', c); p.setAttribute('opacity', o); p.setAttribute('vector-effect', 'non-scaling-stroke');
    p.style.setProperty('--len', '1100'); p.style.animationDelay = j * 0.25 + 's'; arcs.append(p);
  });
  const fill = el('div', { class: 'fill' }), pylons = STEPS_NOW.map((_, k) => el('div', { class: 'pylon', style: 'left:' + at(k) + '%' }, String(k + 1)));
  const rider = el('div', { class: 'rider', style: 'left:' + at(0) + '%' }, primeMorph(46, { hold: 1500, rest: 900 })), home = el('div', { class: 'home', title: 'Their door' }, '🏠');
  const labels = el('div', { class: 'labels' }, STEPS_NOW.map(([t], k) => el('span', { style: 'left:' + (at(k) - 4) / 0.92 + '%', text: t })));
  const bridge = el('div', { class: 'bridge', role: 'img', 'aria-label': 'Build progress' }, plate('halftone', st.name || 'build', inks()[2], { w: 1200, h: 220, step: 14, opacity: 0.32 }), arcs, el('div', { class: 'deck' }, fill), ...pylons, rider, home, labels);
  const nowline = el('div', { class: 'nowline', 'aria-live': 'polite' });
  const paint = () => {
    LINES_NOW.forEach(([k, re]) => { if (lines.some((l) => re.test(l))) reached = Math.max(reached, k); });
    const failed = lines.some((l) => /\] ERROR/.test(l)), done = reached >= N;
    steps.replaceChildren(...STEPS_NOW.map(([t, s], k) => el('li', { class: k < reached ? 'done' : k === reached ? (failed ? 'fail' : 'now') : null },
      el('span', { class: 'dot', text: k < reached ? '✓' : failed && k === reached ? '!' : String(k + 1) }), el('div', {}, t, el('small', { text: s })))));
    pylons.forEach((p, k) => { p.className = 'pylon' + (k < reached ? ' done' : k === reached ? (failed ? ' fail' : ' now') : ''); p.textContent = k < reached ? '✓' : failed && k === reached ? '!' : String(k + 1); });
    labels.querySelectorAll('span').forEach((x, k) => x.classList.toggle('on', k <= reached));
    fill.style.width = (done ? 100 : (at(reached) - 4) / 0.92) + '%';
    rider.style.left = done ? 'calc(100% - 27px)' : at(reached) + '%'; home.classList.toggle('done', done);
    const cur = STEPS_NOW[Math.min(reached, N - 1)];
    nowline.replaceChildren(failed ? 'Stopped while ' + cur[0].toLowerCase() : done ? 'Done. Opening the kit…' : cur[0] + '…', el('small', { text: failed ? 'The log below says why.' : done ? '' : cur[1] }));
    log.textContent = lines.join('\n'); log.scrollTop = log.scrollHeight;
  };
  wrap.append(el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: st.kind === 'new' ? 'Building the kit · usually about 7 minutes' : 'Changing the kit · usually under a minute' }), el('h1', { text: st.name }))),
    el('section', { class: 'card' }, el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-end;gap:16px' }, el('div', {}, el('div', { class: 'eyebrow', text: 'Running for' }), time), nowline), bridge,
      el('details', {}, el('summary', { class: 'muted small' }, 'Every step'), steps), el('details', {}, el('summary', { class: 'muted small' }, 'The full log'), log)));
  const tick = setInterval(() => { time.textContent = clock(Date.now() - st.t0); }, 1000); time.textContent = clock(Date.now() - st.t0);
  paint();
  // What Claude is doing, live: every search and page read lands as a chip; the counters keep score.
  const n = { site: 0, photos: 0, searches: 0, reads: 0 }, cn = {}, cloud = el('div', { class: 'cloud', 'aria-live': 'off' });
  const counter = (k, label) => { cn[k] = el('b', { text: '0' }); return el('div', {}, cn[k], el('span', { text: label })); };
  const scope = sonarScope();
  const feed = el('section', { class: 'card feed', hidden: true }, el('h2', { text: 'What is happening' }),
    el('div', { class: 'counters' }, counter('site', 'Their pages read'), counter('photos', 'Photos found'), counter('searches', 'Searches'), counter('reads', 'Sources read')), el('div', { class: 'sonarrow' }, scope.el, cloud));
  wrap.append(feed);
  const chip = (kind, icon, text, extra) => { feed.hidden = false; scope.blip(kind, text); cloud.prepend(el('span', { class: kind, title: text }, el('i', { text: icon }), el('em', { text }), extra || null)); while (cloud.children.length > 40) cloud.lastChild.remove(); };
  const bump = (k, to) => { const v = to != null ? to : n[k] + 1; if (v === n[k]) return; n[k] = v; cn[k].textContent = String(v); if (moving() && cn[k].animate) cn[k].animate([{ transform: 'scale(1.25)', color: 'var(--accent)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,1.35,.35,1)' }); };
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') + new URL(u).pathname.replace(/\/$/, '').slice(0, 40); } catch (x) { return u; } };
  const take = (line) => {
    let m;
    if ((m = line.match(/Read (\d+) pages of their website; found (\d+) photos/))) { bump('site', +m[1]); bump('photos', +m[2]); chip('w', 'W', 'Read ' + m[1] + ' pages of their website'); }
    else if ((m = line.match(/searching: (.+)$/))) { bump('searches'); chip('s', '?', m[1]); }
    else if ((m = line.match(/reading (https?:\/\/\S+)/))) { bump('reads'); chip('r', '↗', host(m[1])); }
    else if ((m = line.match(/\]\s+Logo: (.+?)( \(|$)/))) chip('k', '★', 'Logo: ' + m[1]);
    else if ((m = line.match(/Colors: (.+)\.$/))) chip('k', '◐', 'Their colors', el('span', { style: 'display:inline-flex;gap:3px' }, (m[1].match(/#[0-9A-F]{6}/gi) || []).map((c) => el('span', { class: 'sw', style: 'background:' + c }))));
    else if ((m = line.match(/Research done: (\d+) searches, (\d+) pages read/))) { bump('searches', +m[1]); bump('reads', +m[2]); chip('k', '✓', 'Research done'); }
  };
  lines.forEach(take);
  const offLog = S.onLog(({ line }) => { lines.push(line); take(line); paint(); });
  const offDone = S.onDone((r) => {
    clearInterval(tick); paint();
    if (r.ok) { reached = N; paint(); store.set('celebrate', r.dir); setTimeout(() => { location.hash = 'kit/' + encodeURIComponent(r.dir); }, moving() ? 1100 : 0); }
    else { log.parentElement.open = true; wrap.append(el('div', { class: 'note err', text: 'The kit stopped: ' + r.error }), el('div', { class: 'actions' }, el('a', { class: 'btn ghost', href: '#new' }, 'Back to the form'))); }
  });
  leave = () => { clearInterval(tick); offLog(); offDone(); };
};

// The Library: every kit as its cover slide.
let dealtAt = 0;
// While the Prio Connect kits (or imported kits) are being finished on this computer: what is happening, and how far along.
function setupBanner() {
  const bar = el('div', { class: 'adbar' }, el('i')), head = el('b'), sub = el('span', { class: 'muted small' });
  const box = el('div', { class: 'setup', hidden: true, role: 'status' }, el('div', { class: 'sp-mini', 'aria-hidden': 'true' }), el('div', { style: 'min-width:0;flex:1' }, head, sub, bar));
  const paint = (d) => {
    box.hidden = !d.running; if (!d.running) return;
    const n = Math.max(d.total, 1), i = Math.min(d.done + 1, n);
    head.textContent = 'Building ' + (d.name || 'a kit') + (n > 1 ? '  (' + i + ' of ' + n + ')' : '');
    sub.textContent = (d.msg ? d.msg.replace(/^\s*/, '') + '  ·  ' : '') + 'From saved research, on this computer: no cost. Open any kit while you wait.';
    bar.firstChild.style.width = Math.round((d.done / n) * 100) + '%';
  };
  S.setupStatus().then(paint);
  const off = S.onSetup((d) => { if (!box.isConnected) { off(); return; } paint(d); if (d.finished || d.seeded) { off(); route(); } });
  return box;
}
pages.library = async () => {
  const all = await S.kits();
  const q = el('input', { type: 'text', placeholder: 'Search by name or city', 'aria-label': 'Search the library' });
  const grid = el('div', { class: 'grid' });
  const doImport = async (kind) => {
    const r = await S.importKits(kind);
    if (r.canceled) return;
    if (!r.added.length) { toast(r.skipped.length ? 'Already in your Library: ' + r.skipped.join(', ') + '.' : 'No kits found there. Choose a kit zip, a kit folder, or a deck and its PDFs.'); return; }
    toast('Imported ' + r.added.length + ' kit' + (r.added.length > 1 ? 's' : '') + (r.skipped.length ? ' (' + r.skipped.length + ' already here)' : '') + '.');
    route(); refreshCount();
  };
  // Filter by model and sort, remembered between visits.
  let kind = store.get('lib.kind', 'all'), sort = store.get('lib.sort', 'new');
  const kinds = [['all', 'All'], ['faith', 'Faith'], ['secular', 'Secular']];
  const segBtns = kinds.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(kind === v), onclick: () => { kind = v; store.set('lib.kind', v); segBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(kinds[i][0] === v))); paint(); } }, t));
  const sortSel = el('select', { 'aria-label': 'Sort the library' }, [['new', 'Newest first'], ['name', 'Name A–Z'], ['fit', 'Best fit first']].map(([v, t]) => el('option', { value: v, text: t })));
  sortSel.value = sort; sortSel.addEventListener('change', () => { sort = sortSel.value; store.set('lib.sort', sort); paint(); });
  const fitOf = (g) => parseFloat(g.latest.fit) || 0;
  let first = true;
  const paint = () => {
    const s = q.value.trim().toLowerCase();
    const shown = all.filter((g) => (!s || (g.name + ' ' + g.latest.city).toLowerCase().includes(s)) && (kind === 'all' || g.latest.model === kind))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'fit' ? fitOf(b) - fitOf(a) : 0));
    grid.replaceChildren(...shown.map((g, i) => { const v = g.latest, nv = g.versions.length; return withTilt(el('a', { class: 'kitcard' + (nv > 1 ? ' stack' : '') + (nv > 2 ? ' stack2' : ''), style: '--i:' + Math.min(i, 12), href: '#kit/' + encodeURIComponent(v.dir), onclick: (e) => { const c = e.currentTarget.querySelector('.cover img'); if (c && v.cover) { c.style.viewTransitionName = 'deck'; morph = true; } } },
      el('div', { class: 'cover' }, v.cover ? el('img', { src: v.cover, alt: '', loading: 'lazy' }) : v.logoSrc ? logoCover(v, g.name) : cardBack(initials(g.name), g.name), nv > 1 ? el('span', { class: 'tag', text: nv + ' versions' }) : null),
      el('div', { class: 'meta' }, el('span', { class: 'name', text: g.name }), el('span', { class: 'sub', text: [v.city, when(v.stamp)].filter(Boolean).join(' · ') }),
        el('div', { class: 'chips' }, modelChip(v), v.fit ? el('span', { class: 'chip fit', text: 'Fit ' + v.fit }) : null, v.ads && v.ads.length ? el('span', { class: 'chip', title: 'Mock ads made for this kit', text: '▷ ' + v.ads.length + ' ad' + (v.ads.length === 1 ? '' : 's') }) : null, swatch(v.colors))))); }));
    if (echo && moving()) { const o = echo; [...grid.children].forEach((c) => { const b = c.getBoundingClientRect(), dist = Math.hypot(b.left + b.width / 2 - o.x, b.top + b.height / 2 - o.y); c.style.setProperty('--echo', Math.min(900, Math.round(dist * 0.8)) + 'ms'); c.classList.add('echo'); if (c.classList.contains('kitcard')) c.append(el('i', { class: 'echo-ring', 'aria-hidden': 'true' })); }); }
    echo = false;
    if (first) { first = false; if (Date.now() - dealtAt > 90000) { dealtAt = Date.now(); deal(grid); } }
    if (all.length && !shown.length) grid.replaceChildren(el('p', { class: 'muted', text: s ? 'Nothing matches "' + q.value.trim() + '".' : 'No ' + kind + ' kits yet.' }));
  };
  // Typing pings out from the search box; each kit that answers lands when the wave reaches it, with its own echo ring.
  let echo = false;
  q.addEventListener('input', () => {
    const wrapEl = grid.closest('.wrap'), wr = wrapEl.getBoundingClientRect(), r = q.getBoundingClientRect(), ox = r.left - wr.left + r.width / 2, oy = r.top - wr.top + r.height / 2;
    sonarPing(wrapEl, ox, oy, Math.max(wr.width, 900)); echo = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; paint();
  });
  // New slide previews (made in the background after a build or import) replace a card's placeholder.
  let again = null;
  const offPrev = S.onPreviews((what, d) => { if (what !== 'done' || !d.ok) return; clearTimeout(again); again = setTimeout(() => { if (!q.value && location.hash.replace('#', '') === 'library') route(); }, 900); });
  leave = () => { offPrev(); clearTimeout(again); };
  const wrap = el('div', { class: 'wrap grid12' }, setupBanner(),
    el('div', { class: 'head mb' }, el('span', { class: 'mb-num', 'aria-hidden': 'true', text: String(all.length).padStart(2, '0') }), el('div', { class: 'mb-title' }, primeMorph(58, { delay: 2400 }), el('div', {}, el('div', { class: 'eyebrow', text: all.length + ' kit' + (all.length === 1 ? '' : 's') + ' on this computer' }), el('h1', { text: 'Library' }))),
      el('div', { class: 'actions' }, el('button', { class: 'btn ghost', type: 'button', onclick: () => doImport('folder') }, 'Import a folder…'), el('button', { class: 'btn dark', type: 'button', onclick: () => doImport('files') }, 'Import kits…'))));
  if (!all.length) wrap.append(el('div', { class: 'empty' }, el('div', { class: 'pm-host' }, primeMorph(150, { hold: 2000, rest: 1300 })), el('h2', { text: 'Your kits will live here.' }),
    el('p', { text: 'Add the Prio Connect kits that come with the app, build a new one, or drop any kit zip, kit folder or deck onto this window.' }),
    el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'button', onclick: addPrimeKits }, 'Add the Prio Connect kits'), el('a', { class: 'btn dark', href: '#new' }, 'New prospect'), el('button', { class: 'btn ghost', type: 'button', onclick: () => doImport('files') }, 'Import kits…'))));
  else { wrap.append(libraryStats(all)); wrap.append(el('div', { class: 'toolbar' }, q, el('div', { class: 'seg', role: 'group', 'aria-label': 'Show' }, segBtns), el('span', { class: 'grow' }), sortSel), grid); paint(); }
  view.append(wrap);
};

// One kit: the deck on the stage with its talk track, the files, the checklist, Change this kit, and other versions.
const label = (n) => /-web-deck\.html$/i.test(n) ? 'Animated deck: click to present' : /-deck\.pdf$/i.test(n) ? 'The deck as a PDF (to email or print)' : /-deck-video\.(mp4|webm)$/i.test(n) ? 'Deck video' : /\.pptx$/i.test(n) ? 'Growth deck (PowerPoint)' : /assessment/i.test(n) ? 'Prospect assessment (internal)' : /cheat/i.test(n) ? 'Cheat sheet for the presenter' : /leave/i.test(n) ? 'Leave-behind for the client' : /calculator|\.xlsx$/i.test(n) ? 'Impact calculator' : /\.mp4$/i.test(n) ? 'Video clip' : n;
const rank = (n) => /-web-deck\.html$/i.test(n) ? -2 : /-deck\.pdf$/i.test(n) ? -1.5 : /-deck-video\./i.test(n) ? -1 : /\.pptx$/i.test(n) ? 0 : /leave/i.test(n) ? 1 : /cheat/i.test(n) ? 2 : /assessment/i.test(n) ? 3 : 5;
pages.kit = async (dir) => {
  const k = await S.kit(dir);
  const wrap = el('div', { class: 'wrap' }); view.append(wrap);
  if (!k) { wrap.append(el('div', { class: 'note err', text: 'This kit folder is gone or empty.' }), el('a', { class: 'btn ghost', href: '#library' }, 'Back to the Library')); return; }
  pageName(k.name);
  // Where this prospect is in Clients: open their page there, or add them.
  const crmBtn = el('button', { class: 'btn ghost', type: 'button', text: 'Clients' });
  if (window.crmForKit) window.crmForKit(k).then((p) => {
    const labels = { lead: 'Lead', researched: 'Researched', meeting: 'Meeting set', pitched: 'Pitched', pilot: 'Pilot', client: 'Client', lost: 'Lost' };
    if (p) { crmBtn.textContent = 'In Clients: ' + labels[p.stage]; crmBtn.onclick = () => { location.hash = 'crm/' + p.id; }; }
    else { crmBtn.textContent = 'Add to Clients'; crmBtn.onclick = async () => { if (crmBtn.disabled) return; crmBtn.disabled = true; try { const n = await window.crmAddKit(k); toast(k.name + ' added to Clients.'); location.hash = 'crm/' + n.id; } catch (e) { crmBtn.disabled = false; toast(errText(e)); } }; }
  }).catch(() => crmBtn.remove());
  const all = await S.kits(), group = all.find((g) => g.versions.some((v) => v.dir === k.dir));
  const files = k.files.slice().sort((a, b) => rank(a.name) - rank(b.name)), deck = files.find((f) => /\.pptx$/i.test(f.name)), web = files.find((f) => /-web-deck\.html$/i.test(f.name));
  // The kit opens in the prospect's own colors: their dark color as the ground, their accent as the glow, their logo up front.
  const cs = (k.colors || []).map((c) => '#' + String(c).replace('#', ''));
  const rehearseBtn = el('button', { class: 'btn ghost', type: 'button', hidden: !k.previews.length, title: 'Rehearse (R)', onclick: () => rehearse(curKit, idx) }, 'Rehearse');
  let curKit = k;
  const hero = el('div', { class: 'hero', style: (cs[0] ? '--k1:' + cs[0] + ';' : '') + (cs[1] ? '--k2:' + cs[1] + ';' : '') + (cs[2] ? '--k3:' + cs[2] + ';' : '') },
    plate('overprint', k.name, cs.length ? cs.concat(cs.length < 3 ? ['#F7C400'] : []) : PRIME_INKS.slice(0, 3), { blend: 'screen', opacity: 0.9, n: 9, band: [0.45, 1], w: 1600, h: 320 }), el('i', { class: 'shine' }),
    el('div', { class: 'top' },
      el('div', { class: 'who' }, el('div', { class: 'mark' }, k.logoSrc ? el('img', { src: k.logoSrc, alt: k.name + ' logo' }) : el('b', { text: initials(k.name) })),
        el('div', { style: 'min-width:0' }, el('div', { class: 'eyebrow', text: [k.kind, k.city, 'Built ' + when(k.stamp)].filter(Boolean).join(' · ') }), el('h1', { text: k.name }),
          el('div', { class: 'chips' }, modelChip(k), k.fit ? el('span', { class: 'chip fit', text: 'Fit ' + k.fit }) : null, swatch(k.colors), k.note ? el('span', { class: 'muted small', text: k.note }) : null))),
      el('div', { class: 'actions' }, crmBtn, el('button', { class: 'btn ghost', type: 'button', onclick: () => S.reveal(deck ? deck.path : k.dir) }, 'Show in folder'), rehearseBtn,
        deck ? el('button', { class: 'btn ghost', type: 'button', title: 'Open the PowerPoint deck', onclick: () => S.open(deck.path) }, 'PowerPoint') : null,
        web && k.canChange ? el('button', { class: 'btn ghost', type: 'button', title: 'Edit words right on the slides, the talk track, slide order, colors, photos, art and typeface, with a live preview', onclick: () => openStudio(k) }, 'Edit the deck') : null,
        web ? videoBtn(k) : null,
        web ? keyed(el('button', { class: 'btn primary', type: 'button', title: 'Present the animated deck. With a second screen, your talk track and clock stay on this one.', onclick: () => presentDeck(web.path) }, 'Present'))
          : k.pending ? el('button', { class: 'btn primary', type: 'button', disabled: true }, 'Building the decks…') : k.canChange ? makeDeckBtn(k) : null)),
    cs.length ? el('div', { class: 'bar3' }, cs.map((c) => el('i', { style: 'background:' + c }))) : null);
  // The light follows the cursor across their colors.
  hero.addEventListener('pointermove', (e) => { if (!moving()) return; const r = hero.getBoundingClientRect(); hero.style.setProperty('--sx', (e.clientX - r.left) + 'px'); hero.style.setProperty('--sy', (e.clientY - r.top) + 'px'); });
  wrap.append(hero);
  // Just built: a moment of celebration, then the work.
  if (store.get('celebrate', '') === k.dir) { store.del('celebrate'); wrap.append(el('div', { class: 'ready' }, 'The kit is ready. Slide previews are on their way; check the list below before you send anything.')); burst(); }

  // The deck, slide by slide.
  const stageBox = el('div');
  wrap.append(stageBox);
  let idx = store.get('pos.' + k.dir, 0), keyHandler = null;
    const drawViewer = async (fresh) => {
    const kk = fresh || k; curKit = kk;
    if (!kk.previews.length) {
      const b = await S.previewsBusy(), busy = k.pending || b.now === k.dir || b.queued.includes(k.dir), fail = !busy && b.failed && b.failed[k.dir];
      const retry = el('button', { class: 'btn primary', type: 'button', onclick: async () => { await S.makePreviews(k.dir); drawViewer(); } }, fail ? 'Try again' : 'Make previews');
      // Until the previews are drawn, the animated deck's opening plays behind the message (its own motion, live).
      const liveSrc = kk.webSrc && !k.pending ? kk.webSrc.replace('?v=', '?mini&loop&v=') + '#1' : '';
      stageBox.replaceChildren(el('div', { class: 'viewer solo' + (busy ? ' making' : '') + (liveSrc ? ' haslive' : '') }, el('div', { class: 'stage' }, liveSrc ? el('iframe', { class: 'livecover', src: liveSrc, title: 'The opening slide, live', sandbox: 'allow-scripts', tabindex: '-1', 'aria-hidden': 'true' }) : null, el('div', { class: 'noprev' }, el('div', {},
        el('b', { text: k.pending ? 'Building this kit on this computer…' : busy ? 'Making slide previews…' : fail ? 'The slide previews did not work' : 'No slide previews yet' }),
        el('span', { text: k.pending ? 'Its PowerPoint, animated deck and previews are being made from its saved research: about a minute, no cost.' : busy ? 'Drawing each finished slide. This takes under a minute.' : fail ? fail.reason : 'Previews show every finished slide here, with its talk track.' }),
        fail && !fail.deckBad ? el('span', { class: 'muted small', text: 'The deck itself is fine: Open the deck shows it in PowerPoint.' }) : null,
        // No PowerPoint here? The animated deck draws its own previews.
        !busy && fail && !web && k.canChange ? el('span', { class: 'small', style: 'display:block;margin-top:10px', text: 'No PowerPoint needed: make the animated deck and the app draws the previews itself.' }) : null,
        busy ? null : el('div', { class: 'actions', style: 'justify-content:center;margin-top:14px' }, !web && k.canChange && fail ? makeDeckBtn(k) : null, fail && fail.deckBad ? null : retry,
          fail && fail.log ? el('button', { class: 'btn ghost', type: 'button', onclick: () => S.reveal(fail.log) }, 'Show the log') : null))))));
      return;
    }
    const P = kk.previews, img = el('img', { alt: '' }), count = el('span', { class: 'count' }), tag = el('span', { class: 'tag' });
    const prev = el('button', { type: 'button', 'aria-label': 'Previous slide', text: '‹' }), next = el('button', { type: 'button', 'aria-label': 'Next slide', text: '›' });
    const strip = el('div', { class: 'strip' }, P.map((p, i) => el('button', { type: 'button', 'aria-label': 'Slide ' + (i + 1), onclick: () => show(i) }, el('img', { src: p.src, alt: '', loading: 'lazy' }), el('span', { text: String(i + 1) }))));
    const lines = el('div', { class: 'lines' }), clicks = el('span', { class: 'eyebrow' });
    const close = P.findIndex((p) => /TOTAL TALK/.test(p.notes));
    function show(i) {
      const from = idx;
      idx = Math.max(0, Math.min(P.length - 1, i)); store.set('pos.' + k.dir, idx);
      img.src = P[idx].src; img.alt = k.name + ', slide ' + (idx + 1);
      // Slides glide in from the side they come from.
      if (moving() && from >= 0 && from !== idx && img.animate) { const d = idx > from ? 1 : -1; img.animate([{ opacity: 0.2, transform: 'translateX(' + 28 * d + 'px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: motionLevel() === 'calm' ? 160 : 320, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
      count.replaceChildren(el('b', { text: String(idx + 1) }), ' / ' + P.length);
      tag.textContent = close >= 0 && idx > close ? 'Backup slide' : idx === close ? 'The close' : idx === 0 ? 'Opening' : '';
      clicks.textContent = P[idx].states > 1 ? P[idx].states + ' clicks' : '';
      lines.replaceChildren(...talk(P[idx].notes));
      prev.disabled = idx === 0; next.disabled = idx === P.length - 1;
      [...strip.children].forEach((b, j) => b.setAttribute('aria-current', String(j === idx)));
      const cur = strip.children[idx]; if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    prev.addEventListener('click', () => show(idx - 1)); next.addEventListener('click', () => show(idx + 1));
    stageBox.replaceChildren(el('div', { class: 'viewer' },
      el('div', { style: 'min-width:0' }, el('div', { class: 'stage' }, el('div', { class: 'frame' }, img), el('div', { class: 'controls' }, count, tag, el('div', { class: 'nav' }, prev, next))), strip),
      el('aside', { class: 'talk', 'aria-label': 'Talk track' }, el('div', { class: 'top' }, el('span', { class: 'eyebrow', text: 'Talk track' }), clicks), lines)));
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = (e) => { if (e.target.closest('input, textarea, select') || $('.present') || e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === 'ArrowRight' || e.key === 'PageDown') { show(idx + 1); e.preventDefault(); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') { show(idx - 1); e.preventDefault(); } if (e.key === 'r' || e.key === 'R') { rehearse(kk, idx); e.preventDefault(); } };
    document.addEventListener('keydown', keyHandler);
    rehearseBtn.hidden = false;
    // Opened from its Library cover: this slide is where the cover lands.
    if (morph) img.style.viewTransitionName = 'deck';
    const keep = idx; idx = -1; show(keep);
  };
  await drawViewer();
  const offPrev = S.onPreviews(async (what, d) => {
    if (d.dir !== k.dir) return;
    if (what === 'done') { if (d.ok) { toast('Slide previews ready.'); drawViewer(await S.kit(k.dir)); } else { toast(d.reason || 'Could not make previews.'); drawViewer(); } }
    else drawViewer();
  });
  const offSetup = k.pending ? S.onSetup((d) => { if (d.finished === k.dir) route(); }) : () => {};
  leave = () => { offPrev(); offSetup(); if (keyHandler) document.removeEventListener('keydown', keyHandler); };

  // Files, then the summary beside the other versions.
  wrap.append(el('section', { class: 'card' }, el('div', { class: 'kithead' }, el('h2', { text: 'The kit' }),
      el('div', { class: 'actions' },
        web ? el('button', { class: 'btn ghost sm', type: 'button', title: 'Save the animated deck somewhere to email or share it (one file, works offline)', onclick: async () => { try { const r = await S.saveCopy(web.path); if (r.saved) toast('Saved: ' + r.file.split(/[\\/]/).pop()); } catch (e) { toast(errText(e)); } } }, 'Save the deck to share…') : null,
        web ? exportBtn('PDF', 'Every slide finished, one per page: to email or print', async (b) => { const off = S.onExport((d) => { if (d.dir === k.dir) b.textContent = 'Making the PDF… ' + d.pct + '%'; }); try { const r = await S.deckPdf(k.dir); toast('PDF ready: ' + r.pages + ' pages, ' + r.mb + ' MB.'); S.reveal(r.file); route(); } finally { off(); } }) : null,
        web && k.canChange ? exportBtn('PowerPoint copy', 'A PowerPoint copy for anyone who asks (no motion: PowerPoint cannot keep it)', async (b) => { b.textContent = 'Making the PowerPoint copy…'; const r = await S.deckPptx(k.dir); toast('PowerPoint copy ready (' + r.slides + ' slides). It has no motion; present from the app.'); route(); }) : null,
        el('button', { class: 'btn ghost sm', type: 'button', title: 'Every file in this kit as one zip, for your team (it includes the internal assessment)', onclick: async (ev) => { const b = ev.currentTarget; b.disabled = true; b.textContent = 'Exporting…'; try { const r = await S.exportKit(k.dir); if (r.saved) toast('Kit exported. It includes the internal assessment: for your team only.'); } catch (e) { toast(errText(e)); } finally { b.disabled = false; b.textContent = 'Export for your team…'; } } }, 'Export for your team…'),
        el('button', { class: 'btn ghost sm danger', type: 'button', onclick: async () => { try { const r = await S.trashKit(k.dir); if (r.deleted) { toast('Moved to the Recycle Bin.'); refreshCount(); location.hash = 'library'; } } catch (e) { toast(errText(e)); } } }, 'Delete this version…'))),
    el('div', { class: 'files' }, files.map((f) => el('button', { class: 'file', type: 'button', title: /-web-deck\.html$/i.test(f.name) ? 'Present ' + f.name : 'Open ' + f.name, onclick: () => (/-web-deck\.html$/i.test(f.name) ? presentDeck(f.path) : S.open(f.path)) },
      el('span', { class: 'ext ' + f.name.split('.').pop().toLowerCase(), text: f.name.split('.').pop().toUpperCase() }), el('div', {}, el('b', { text: label(f.name) }), el('span', { class: 'muted', text: mb(f.size) })))))));
  if (k.canChange || k.ads.length) wrap.append(adsCard(k));
  if (k.canChange) wrap.append(followCard(k));
  const others = group ? group.versions.filter((v) => v.dir !== k.dir) : [];
  wrap.append(el('div', { class: 'two' },
    el('div', { style: 'min-width:0' }, k.summary ? el('section', { class: 'card' }, md(k.summary.replace(/^- \*\*Files:\*\*.*$/m, ''), 'checks.' + k.dir)) : null),
    el('div', { style: 'min-width:0' },
      k.canChange ? changeCard(k) : el('section', { class: 'card' }, el('h2', { text: 'Change this kit' }), el('p', { class: 'muted small', text: 'This kit was built by hand, so it has no saved research to rebuild from. Open the deck in PowerPoint to edit it.' })),
      others.length ? el('section', { class: 'card' }, el('h2', { text: 'Other versions' }), el('div', { class: 'list' }, others.map((v) => el('a', { class: 'row', href: '#kit/' + encodeURIComponent(v.dir) }, el('div', { class: 'grow' }, el('b', { text: when(v.stamp) }), el('span', { class: 'muted small', text: v.stamp + ' · ' + v.files.length + ' files' })))))) : null)));
};

// Change a kit without new research: notes, links to read, their photo, their look.
function changeCard(k) {
  const notes = el('textarea', { id: 'c-notes', placeholder: 'Close on their slogan, "If air runs through it, we can do it." Use their mission word for word.' });
  const read = el('input', { id: 'c-read', type: 'text', placeholder: 'https://their-site.com/about-us/', spellcheck: 'false' });
  const logo = el('input', { id: 'c-logo', type: 'text', placeholder: '#393C99 #F2A900  or  https://…/logo.png', spellcheck: 'false' });
  const restyle = el('input', { id: 'c-restyle', type: 'checkbox' });
  let photo = '', logoFile = '';
  const photoName = el('span', { class: 'path', text: 'None chosen' }), logoName = el('span', { class: 'path', text: 'None chosen' });
  const go = el('button', { class: 'btn dark', type: 'button' }, 'Rebuild with these changes');
  go.addEventListener('click', async () => {
    const input = { from: k.dir, name: k.name, revise: notes.value.trim(), read: read.value.trim(), logo: logo.value.trim(), logoFile, photo, restyle: restyle.checked };
    if (!input.revise && !input.read && !input.logo && !input.logoFile && !input.photo && !input.restyle) { toast('Add a note, a link, a logo, a photo or a color first.'); return; }
    go.disabled = true;
    try { await S.change(input); location.hash = 'run'; } catch (e) { go.disabled = false; toast(errText(e)); }
  });
  const look = el('div', { class: 'look' },
    k.logoSrc ? el('div', { class: 'logo' }, el('img', { src: k.logoSrc, alt: 'The logo in this deck' })) : el('div', { class: 'logo none', text: k.logoLink ? 'Logo from a link' : 'No logo: the deck shows their name' }),
    el('div', {}, el('b', { text: 'The logo in this deck' }), el('span', { class: 'muted small', text: k.logoSrc || k.logoLink ? 'Not theirs? Choose their logo below and rebuild.' : 'Add it below and rebuild.' })));
  return el('details', { class: 'card', open: !k.logoSrc && !k.logoLink }, el('summary', {}, 'Change this kit'),
    look,
    el('p', { class: 'muted small', text: 'Uses the research already done: no new searches. Notes cost a few cents; the rest is free. The new version is saved beside this one.' }),
    el('div', { class: 'field' }, el('label', { for: 'c-notes' }, 'Notes', el('span', { class: 'hint', text: 'What to change, in plain words. Quote their words exactly when you want them used.' })), notes),
    el('div', { class: 'field' }, el('label', { for: 'c-read' }, 'Links to read', el('span', { class: 'hint', text: 'Their About page, a news story. Separate several with spaces.' })), read),
    el('div', { class: 'field' }, el('span', { class: 'label', text: 'Their vehicle or product photo' }), el('div', { class: 'actions' }, el('button', { class: 'btn ghost', type: 'button', onclick: async () => { const p = await S.pickPhoto(); if (p) { photo = p; photoName.textContent = p; } } }, 'Choose a photo…'), photoName)),
    el('div', { class: 'field' }, el('span', { class: 'label', text: 'Their logo' }), el('div', { class: 'actions' }, el('button', { class: 'btn ghost', type: 'button', onclick: async () => { const p = await S.pickPhoto('logo'); if (p) { logoFile = p; logoName.textContent = p; } } }, 'Choose their logo…'), logoName),
      el('span', { class: 'hint', text: 'Right-click the logo on their website, Save image as, then choose it here. A PNG with a clear background looks best.' })),
    el('div', { class: 'field' }, el('label', { for: 'c-logo' }, 'Brand colors or a logo link', el('span', { class: 'hint', text: 'Main color, then button color, then their dark band. A link to their logo image works here too.' })), logo),
    el('div', { class: 'field' }, el('label', { class: 'check', for: 'c-restyle' }, restyle, 'Read their website again for the logo, colors and vehicle')),
    el('div', { class: 'actions' }, go));
}

pages.settings = async () => {
  const set = await S.settings();
  const key = el('input', { id: 's-key', type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: set.hasKey ? 'Saved. Paste a new key to replace it.' : 'sk-ant-…' });
  const status = el('div');
  const save = keyed(el('button', { class: 'btn dark', type: 'button' }, 'Save and check')), lock = lockGlyph(set.hasKey);
  save.addEventListener('click', async () => {
    if (!key.value.trim()) { key.focus(); toast('Paste the key first.'); return; }
    save.disabled = true; status.replaceChildren(el('p', { class: 'muted', text: 'Checking the key…' }));
    const r = await S.setKey(key.value.trim()); save.disabled = false;
    if (r.ok) { key.value = ''; lock.classList.add('open'); status.replaceChildren(el('div', { class: 'note ok', text: 'Saved. The key works, so research is ready.' })); toast('Key saved. Research is ready.'); }
    else status.replaceChildren(el('div', { class: 'note err', text: r.error }));
  });
  // Appearance: Light, Dark or Shuffle; every choice applies at once, and is remembered.
  const sc = schemeNow(), V = sc.vars;
  const MINI = { studio: ['#FFFFFF', '#F5F5F3', '#E4E4E0', '#2656D9'], warm: ['#2A2A2E', '#FDFBF5', '#C9D8EE', '#FAC800'], light: ['#FFFFFF', '#FFFFFF', '#E3E3E3', '#0A0A0A'], black: ['#000000', '#000000', '#262626', '#FFFFFF'], dark: ['#03050A', '#06080F', '#1A2131', '#F7C400'], shuffle: [V.rail, V.ground, V.line, V.accent], custom: (() => { const c = customNow().vars; return [c.rail, c.ground, c.line, c.accent]; })() };
  const pickTheme = (v, btn) => { store.set('theme', v); if (moving() && document.startViewTransition) setScheme(btn); else { applyLook(); route(); } };
  const themeBtns = THEMES.map(([v, t, d]) => el('button', { class: 'theme' + (v === 'shuffle' ? ' shuffle' : ''), type: 'button', 'aria-pressed': String(themeNow() === v), onclick: (e) => pickTheme(v, e.currentTarget) },
    el('div', { class: 'mini', style: '--mr:' + MINI[v][0] + ';--mw:' + MINI[v][1] + ';--mc:' + MINI[v][2] + ';--ma:' + MINI[v][3] }, el('div', { class: 'r' }), el('div', { class: 'w' }, el('i'), el('i'), el('i')), null),
    el('b', { text: t }), el('span', { text: v === 'shuffle' && themeNow() === 'shuffle' ? sc.name : d })));
  // Shuffle: roll again, or go back to one of the last six rolls.
  const recent = store.get('recentSeeds', []).map((sd) => makeScheme(sd));
  const roll = themeNow() === 'shuffle' ? el('div', { class: 'field rollbox' },
    el('div', { class: 'rollhead' }, el('div', {}, el('span', { class: 'label', text: sc.name }), el('span', { class: 'hint', text: (sc.dark ? 'Dark' : 'Light') + ' · ' + sc.harmony + ' colors · every text color checked for contrast' })),
      el('button', { class: 'btn primary', type: 'button', onclick: (e) => rollColors(e.currentTarget) }, 'Roll new colors')),
    el('div', { class: 'swatches' }, ['rail', 'ground', 'card', 'accent', 'blue', 'red', 'ink'].map((k) => el('i', { title: k + ' ' + V[k], style: 'background:' + V[k] }))),
    recent.length ? el('div', { class: 'recent' }, el('span', { class: 'hint', text: 'Recent rolls' }), recent.map((r2) => el('button', { type: 'button', class: 'past', title: r2.name, onclick: (e) => { const cur = store.get('seed'); store.set('seed', r2.seed); store.set('recentSeeds', [cur, ...store.get('recentSeeds', []).filter((x) => x !== r2.seed && x !== cur)].slice(0, 6)); setScheme(e.currentTarget); } },
      [r2.vars.rail, r2.vars.ground, r2.vars.accent].map((c) => el('i', { style: 'background:' + c })), el('span', { text: r2.name })))) : null) : null;
  // Every palette from the Prio Connect logo catalog, shown as its logo: one click makes it the app's colors (in Shuffle).
  function logoPicker() {
    if (typeof LOGO_SCHEMES === 'undefined') return null;
    const cur = themeNow() === 'shuffle' && sc.logo ? sc.logo.id : '';
    return el('div', { class: 'field logopick' }, el('span', { class: 'label', text: 'Prio Connect logo colors' }, el('span', { class: 'hint', text: LOGO_SCHEMES.length + ' palettes from the logo catalog. Pick one, or roll: Shuffle deals these in too.' })),
      el('div', { class: 'logos', role: 'group', 'aria-label': 'Prio Connect logo colors' }, LOGO_SCHEMES.map((L) => el('button', { type: 'button', class: 'logo-pal', title: L.name, 'aria-pressed': String(cur === L.id), onclick: (e) => {
        const prev = store.get('seed', 20261106); if (prev !== 'logo:' + L.id) store.set('recentSeeds', [prev, ...store.get('recentSeeds', []).filter((x) => x !== prev && x !== 'logo:' + L.id)].slice(0, 6));
        store.set('seed', 'logo:' + L.id); store.set('theme', 'shuffle'); setScheme(e.currentTarget); } },
        el('img', { src: 'logos/' + L.id + '.jpg', alt: '', width: 60, height: 60, loading: 'lazy' }), el('span', { text: L.name })))));
  }
  // The theme library: 48 ready-made schemes in four groups, each shown as a little page. One click wears it.
  function useTheme(T, btn) { store.set('custom', T); store.set('theme', 'custom'); setScheme(btn); }
  function themeLibrary() {
    const cur = themeNow() === 'custom' ? (store.get('custom', {}) || {}).id : '';
    const mine = store.get('myThemes', []);
    const card = (T, mineIdx) => el('button', { type: 'button', class: 'th-card', title: T.name, 'aria-pressed': String(cur === T.id), onclick: (e) => useTheme(T, e.currentTarget) },
      el('span', { class: 'th-mini', style: 'background:' + T.ground }, el('i', { style: 'background:' + T.rail }), el('b', { style: 'background:' + T.card + ';border-color:' + mixHex(T.card, T.ink, .15) }, el('em', { style: 'background:' + T.accent }), el('u', { style: 'background:' + T.ink })), el('s', {}, [T.blue, T.red, T.yellow].map((c) => el('span', { style: 'background:' + c })))),
      el('span', { class: 'th-name', text: T.name }));
    const groups = ['Light', 'Dark', 'Bold', 'Business'].map((g) => el('div', { class: 'th-group' }, el('span', { class: 'hint', text: g === 'Business' ? 'Made for a kind of business' : g }), el('div', { class: 'th-grid' }, THEME_PRESETS.filter((T) => T.group === g).map((T) => card(T)))));
    const myRow = mine.length ? el('div', { class: 'th-group' }, el('span', { class: 'hint', text: 'My themes' }), el('div', { class: 'th-grid' }, mine.map((T, i) => el('div', { class: 'th-mine' }, card(T, i),
      el('button', { type: 'button', class: 'linkish small', 'aria-label': 'Delete the theme ' + T.name, onclick: () => { store.set('myThemes', mine.filter((x, j) => j !== i)); route(); } }, 'Delete'))))) : null;
    return el('div', { class: 'field themelib' }, el('span', { class: 'label', text: 'Themes' }, el('span', { class: 'hint', text: THEME_PRESETS.length + ' ready-made color schemes. Pick one, then change any color below.' })), myRow, groups);
  }
  // Every color, by hand. Starts from whatever the app wears now; saves as a named theme of your own.
  function customEditor() {
    const cs = getComputedStyle(document.documentElement), now = (k) => (cs.getPropertyValue('--' + k).trim() || '#000000').slice(0, 7);
    const base = themeNow() === 'custom' ? Object.assign({}, THEME_PRESETS[0], store.get('custom', {})) : { name: 'My theme', ground: now('ground'), card: now('card'), rail: now('rail'), accent: now('accent'), ink: now('ink'), blue: now('blue'), red: now('red'), yellow: now('yellow') };
    const T = Object.assign({}, base); let t = 0;
    const live = () => { clearTimeout(t); t = setTimeout(() => { store.set('custom', Object.assign({}, T, { id: '' })); store.set('theme', 'custom'); applyLook(); }, 120); };
    const COLS = [['ground', 'Page'], ['card', 'Cards'], ['rail', 'Menu'], ['accent', 'Accent and buttons'], ['ink', 'Text'], ['blue', 'Ink one'], ['red', 'Ink two'], ['yellow', 'Ink three']];
    const pick = ([k, label]) => { const i = el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(T[k]) ? T[k] : '#000000', 'aria-label': label }); i.addEventListener('input', () => { T[k] = i.value.toUpperCase(); live(); }); return el('label', { class: 'th-pick' }, i, el('span', { text: label })); };
    const name = el('input', { type: 'text', value: T.name && !THEME_PRESETS.some((x) => x.name === T.name) ? T.name : '', placeholder: 'Name this theme', 'aria-label': 'Theme name', maxlength: 40 });
    const save = el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { const n = name.value.trim(); if (!n) { name.focus(); toast('Give your theme a name first.'); return; }
      const mine = store.get('myThemes', []).filter((x) => x.name !== n); const saved = Object.assign({}, T, { name: n, id: 'my-' + Date.now().toString(36), group: 'Mine' }); store.set('myThemes', [saved, ...mine].slice(0, 30)); store.set('custom', saved); store.set('theme', 'custom'); applyLook(); toast(n + ' saved to My themes.'); route(); } }, 'Save as my theme');
    return el('div', { class: 'field rollbox' }, el('span', { class: 'label', text: 'Your colors' }, el('span', { class: 'hint', text: 'Change any color; the app checks every text color still reads, and adjusts it if not.' })),
      el('div', { class: 'th-picks' }, COLS.map(pick)), el('div', { class: 'actions' }, name, save));
  }
  // The rest of the look: type, corners, paper, cover, size and page turns.
  function lookOptions() {
    const u = uiNow(), O = UI_OPTIONS;
    const set = (k, v) => { store.set('ui', Object.assign(uiNow(), { [k]: v })); applyUi(); };
    const seg = (k, label, opts) => { const btns = opts.map((o) => el('button', { type: 'button', 'aria-pressed': String(u[k] === o[0]), onclick: () => { set(k, o[0]); btns.forEach((b, i) => b.setAttribute('aria-pressed', String(opts[i][0] === o[0]))); } }, o[1]));
      return el('div', { class: 'field' }, el('span', { class: 'label', text: label }), el('div', { class: 'seg wrapseg', role: 'group', 'aria-label': label }, btns)); };
    const sel = (k, label) => { const s2 = el('select', { 'aria-label': label }, O.fonts.map(([v, t, f]) => el('option', { value: v, text: t, style: 'font-family:' + f }))); s2.value = u[k]; s2.addEventListener('change', () => set(k, s2.value)); return el('label', { class: 'th-font' }, el('span', { text: label }), s2); };
    const coverColor = el('input', { type: 'color', value: u.coverColor, 'aria-label': 'Cover color' }); coverColor.addEventListener('input', () => set('coverColor', coverColor.value.toUpperCase()));
    return el('div', { class: 'field look' }, el('span', { class: 'label', text: 'Type' }), el('div', { class: 'grid2' }, sel('head', 'Headings'), sel('body', 'Text')),
      seg('corners', 'Corners', O.corners), seg('paper', 'Paper', O.paper),
      el('div', { class: 'field' }, el('span', { class: 'label', text: 'Notebook cover' }), el('div', { class: 'cover-row' }, el('div', { class: 'seg wrapseg', role: 'group', 'aria-label': 'Notebook cover' }, O.cover.map((o) => el('button', { type: 'button', 'aria-pressed': String(u.cover === o[0]), onclick: (e) => { set('cover', o[0]); e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, o[1]))), el('label', { class: 'th-pick' }, coverColor, el('span', { text: 'Cover color' })))),
      seg('size', 'Text size', O.size), seg('turn', 'Page turns', O.turn),
      el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { store.del('ui'); applyUi(); route(); toast('Type, corners, paper and cover are back to the defaults.'); } }, 'Reset type and layout'));
  }
  // The guide: Prio Connect, the logo as a little creature that points things out.
  function guidePicker() {
    if (!window.guideMode) return null;
    const G = [['on', 'On'], ['quiet', 'Quiet'], ['off', 'Hidden']];
    const btns = G.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(window.guideMode() === v), onclick: () => { window.guideMode(v); btns.forEach((b, i) => b.setAttribute('aria-pressed', String(G[i][0] === v))); } }, t));
    return el('div', { class: 'field guidepick' }, el('span', { class: 'label', text: 'Your guide' }, el('span', { class: 'hint', text: 'The P in the corner points out the next step when you pause, and can do anything here by voice: hover over it and click the mic. Quiet: it only talks when you click it. On Windows, turn on Voice Access and say "Open PRIO" to start the app by voice.' })), el('div', { class: 'seg', role: 'group', 'aria-label': 'Your guide' }, btns), el('button', { class: 'btn ghost', type: 'button', style: 'margin-top:10px', onclick: () => window.guideTour && window.guideTour() }, 'Replay the tour'));
  }
  const MOTIONS = [['full', 'Full'], ['calm', 'Calm'], ['off', 'Off']];
  const motionBtns = MOTIONS.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(motionLevel() === v), onclick: () => { store.set('motion', v); applyLook(); motionBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(MOTIONS[i][0] === v))); if (v === 'full') burst(); } }, t));
  view.append(el('div', { class: 'wrap narrow' }, el('div', { class: 'head plated' }, (soft() ? null : plate('mech', 'settings', [inks()[0], inks()[1], inks()[2], 'var(--ink)'], { w: 900, h: 300, fit: 'xMaxYMid slice', rings: 5, size: 1.7, x: 0.8 })), el('div', {}, el('div', { class: 'eyebrow', text: 'This computer' }), el('h1', { text: 'Settings' }))),
    el('section', { class: 'card' }, el('h2', { text: 'Appearance' }),
      el('div', { class: 'field' }, el('span', { class: 'label', text: 'Mode' }), el('div', { class: 'themes three' }, themeBtns)), roll, logoPicker(), themeLibrary(), customEditor(), lookOptions(), guidePicker(),
      el('div', { class: 'field' }, el('span', { class: 'label', text: 'Motion' }, el('span', { class: 'hint', text: 'Full: covers morph into decks, cards glide in, a burst when a kit is ready. Calm: quicker and quieter. Off: nothing moves.' })), el('div', { class: 'seg', role: 'group', 'aria-label': 'Motion' }, motionBtns)),
      el('p', { class: 'muted small', style: 'margin:4px 0 0' }, 'Press ', el('kbd', { text: '?' }), ' anywhere for keyboard shortcuts.')),
    el('section', { class: 'card' }, el('h2', { class: 'withlock' }, lock, 'Research key'),
      el('ol', { class: 'howto' },
        el('li', {}, 'Open ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); S.openLink('https://console.anthropic.com/settings/keys'); } }, 'console.anthropic.com → API keys'), '.'),
        el('li', { text: 'Create a key named "PRIO" and copy it.' }),
        el('li', { text: 'Paste it below. It is checked, then stored ' + (set.encrypted ? 'encrypted with Windows\' own key store' : 'on this computer') + '.' })),
      el('div', { class: 'field' }, el('label', { for: 's-key' }, 'Key'), key),
      el('div', { class: 'actions' }, save, set.hasKey ? el('span', { class: 'muted small', text: '✓ A key is saved.' }) : null), status),
    refreshCard(),
    previewCard(),
    el('section', { class: 'card' }, el('h2', { text: 'If something goes wrong' }),
      el('p', { class: 'small muted', text: 'The app writes anything that goes wrong to its log. Send it along with a description, and it can be fixed quickly.' }),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => S.appLog() }, 'Show the app\'s log')),
    pricingCard(),
    el('section', { class: 'card' }, el('h2', { text: 'The Prio Connect kits' }),
      el('p', { class: 'small muted', text: 'The app comes with every Prio Connect kit made so far. Deleted one, or want them back? This adds any that are not in your Library (no cost).' }),
      el('button', { class: 'btn ghost', type: 'button', onclick: addPrimeKits }, 'Add the Prio Connect kits')),
    el('section', { class: 'card' }, el('h2', { text: 'Where kits are saved' }), el('p', { class: 'path', text: set.kitsDir }),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => S.kitsFolder() }, 'Open the folder')),
    el('section', { class: 'card' }, el('h2', { text: 'What it needs' }),
      el('p', { class: 'small muted', text: 'Google Chrome or Microsoft Edge for reading websites and printing PDFs (Edge comes with Windows). PowerPoint for slide previews. Each new kit costs about $2 of research on that key.' }))));
};

// Unlock the newest decks: every kit's animated deck rebuilt with this version (Amaze, live covers, the newest motion).
function refreshCard() {
  const bar = el('div', { class: 'adbar', hidden: true }, el('i')), line = el('span', { class: 'muted small' });
  const go = keyed(el('button', { class: 'btn ghost', type: 'button' }, 'Update every deck'));
  go.addEventListener('click', async () => {
    go.disabled = true; bar.hidden = false; line.textContent = 'Starting…';
    const off = S.onDecks((d) => { if (d.done) return; bar.firstChild.style.width = Math.round(d.i / Math.max(1, d.total) * 100) + '%'; line.textContent = 'Rebuilding ' + d.name + ' (' + (d.i + 1) + ' of ' + d.total + ')…'; });
    try { const r = await S.refreshDecks(); bar.firstChild.style.width = '100%'; line.textContent = 'Done: ' + r.updated + ' of ' + r.total + ' decks rebuilt' + (r.failed.length ? '; could not rebuild ' + r.failed.join(', ') : '') + '.'; toast('Every deck is up to date.'); }
    catch (e) { line.textContent = errText(e); } finally { off(); go.disabled = false; }
  });
  return el('section', { class: 'card' }, el('h2', { text: 'The newest decks' }),
    el('p', { class: 'small muted', text: 'Kits made with an earlier version keep their animated deck until it is rebuilt. This rebuilds every kit\'s deck with this version: Amaze, the live covers, the newest motion. Your Studio choices are kept. No research, no cost; about half a minute a kit.' }),
    el('div', { class: 'actions' }, go, line), bar);
}

const SLIDE_NAMES = { open: 'Opening', journey: 'Their journey', mission: 'Their mission', year: 'Their year', prime: 'Meet Prio Connect', growth: 'Community growth', lead: 'Where growth is', dev: 'What is being built', week: 'This week', whynow: 'Why now', gap: 'The bridge', four: 'Four doors', engine: 'How it works', beyond: 'Beyond the walls', follow: 'The pathway', attend: 'Proof: parish client', faulk: 'Proof: live campaign', report: 'How we measure', calc: 'Impact calculator', pilot: 'The pilot', invest: 'Investment', options: 'Ways to start', close: 'Close', sources: 'Sources', listings: 'Listings to fix', room: 'Room to grow', media: 'Media options', markets: 'Growth by market', indicators: 'Audience data', homes: 'Homes sold' };
const slideName = (key) => SLIDE_NAMES[key] || (/^aud(\d)$/.test(key) ? 'Audience ' + (+key.slice(3) + 1) : key);

// ---------- the Deck Studio: make the animated deck theirs, with a live preview ----------
async function openStudio(k) {
  if ($('.studio')) return;
  let info; try { info = await S.studio(k.dir); } catch (e) { toast(errText(e)); return; }
  const st = JSON.parse(JSON.stringify(info.style || {})); st.photos = st.photos || {}; st.words = st.words || {}; st.hide = st.hide || []; st.colors = st.colors || {};
  const base = { dark: info.colors.dark, mid: info.colors.mid, accent: info.colors.accent, brand: info.colors.brand || info.colors.accent };
  const col = (key) => String(st.colors[key] || base[key] || '000000').replace('#', '').toUpperCase();
  st.edits = st.edits || {}; st.notes = st.notes || {}; st.order = Array.isArray(st.order) ? st.order : [];
  let slideAt = 0, timer = null, dirty = false, still = true, editMode = false, slideList = [];
  // Edit mode: the preview's words can be clicked and typed over; each change comes back here and is kept in st.edits.
  const srcOf = (u) => u.split('?')[0] + '?' + (editMode ? 'edit&still&' : still ? 'still&' : '') + u.split('?')[1] + '#' + (slideAt + 1);
  const frame = el('iframe', { class: 'st-frame', title: 'Live preview', sandbox: 'allow-scripts' }); // talks to the app only by postMessage
  const busy = el('div', { class: 'st-busy', hidden: true }, el('i'), 'Updating the preview…');
  const slideSel = el('select', { 'aria-label': 'Slide' });
  const fillSlides = (list) => { slideList = list; setTimeout(paintNotes); slideSel.replaceChildren(...list.map((x, i) => el('option', { value: String(i), text: x.label + '  ' + slideName(x.key) }))); slideSel.value = String(Math.min(slideAt, list.length - 1)); };
  const show = () => { if (frame.contentWindow) frame.contentWindow.postMessage({ go: [slideAt, 99], instant: true }, '*'); };
  let lastUrl = '';
  const refresh = async () => {
    busy.hidden = false;
    try { const r = await S.studioPreview(k.dir, st); lastUrl = r.url; fillSlides(r.slides); frame.src = srcOf(r.url); }
    catch (e) { toast(errText(e)); } finally { busy.hidden = true; }
  };
  const changed = () => { dirty = true; clearTimeout(timer); timer = setTimeout(refresh, 650); };
  slideSel.addEventListener('change', () => { slideAt = +slideSel.value; show(); paintNotes(); });
  frame.addEventListener('load', () => setTimeout(show, 250));
  const step = (d) => { slideAt = Math.max(0, Math.min(slideSel.options.length - 1, slideAt + d)); slideSel.value = String(slideAt); show(); paintNotes(); };
  const playBtn = el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { still = !still; if (!still && editMode) { editMode = false; paintEdit(); } playBtn.textContent = still ? '▶ Play the builds' : '■ Finished slides'; if (lastUrl) frame.src = srcOf(lastUrl); } }, '▶ Play the builds');
  const editBtn = el('button', { class: 'btn ghost sm st-editbtn', type: 'button', title: 'Click any words on the slide and type. Enter keeps it, Esc undoes it.' });
  const editCount = () => Object.keys(st.edits).length;
  const paintEdit = () => { editBtn.textContent = editMode ? '✓ Done editing' : '✎ Edit words on the slide' + (editCount() ? '  (' + editCount() + ')' : ''); editBtn.setAttribute('aria-pressed', String(editMode)); };
  editBtn.addEventListener('click', () => { editMode = !editMode; if (editMode) { still = true; playBtn.textContent = '▶ Play the builds'; } paintEdit(); if (lastUrl) frame.src = srcOf(lastUrl); });
  paintEdit();
  const onEdit = (e) => { if (e.source !== frame.contentWindow || !e.data || !e.data.edit) return; const d = e.data.edit; if (d.html == null) delete st.edits[d.id]; else st.edits[d.id] = { from: d.from, html: d.html }; dirty = true; paintEdit(); };
  addEventListener('message', onEdit);
  // The talk track for the slide on screen: the presenter's notes, in their words.
  const notesBox = el('textarea', { class: 'st-notes', rows: 4, 'aria-label': 'Talk track for this slide', placeholder: 'What to say on this slide' });
  const notesHead = el('span', { class: 'label' });
  const curId = () => (slideList[slideAt] ? slideList[slideAt].id || slideList[slideAt].key : '');
  function paintNotes() { const x = slideList[slideAt]; if (!x) return; notesHead.textContent = 'Talk track: ' + x.label + '  ' + slideName(x.key); notesBox.value = st.notes[curId()] != null ? st.notes[curId()] : x.notes || ''; }
  notesBox.addEventListener('input', () => { const id = curId(); if (!id) return; const x = slideList[slideAt]; if (notesBox.value === (x.notes || '') ) delete st.notes[id]; else st.notes[id] = notesBox.value; dirty = true; });

  // Colors
  const pickers = {};
  const colorRow = (key, label) => { const inp = el('input', { type: 'color', value: '#' + col(key), 'aria-label': label }); pickers[key] = inp;
    inp.addEventListener('input', () => { st.colors[key] = inp.value.replace('#', '').toUpperCase(); hex.textContent = inp.value.toUpperCase(); paintArt(); changed(); });
    const hex = el('code', { text: '#' + col(key) }); return el('label', { class: 'st-color' }, inp, el('span', {}, el('b', { text: label }), hex)); };
  const setColors = (c) => { st.colors = c; Object.keys(pickers).forEach((key) => { pickers[key].value = '#' + col(key); pickers[key].nextSibling.lastChild.textContent = '#' + col(key); }); paintArt(); changed(); };
  const surprise = () => { const h = Math.random() * 360, H = (hh, sat, l) => hsl(hh, sat, l).replace('#', ''); setColors({ dark: H(h, 55, 11), mid: H(h, 60, 30), accent: H(h + 35, 80, 66), brand: H(h + 180, 78, 55) }); };
  // Art
  const artBox = el('div', { class: 'st-art' });
  const paintArt = async () => { const urls = await S.studioArt({ dark: col('dark'), mid: col('mid'), accent: col('accent'), brand: col('brand') });
    artBox.replaceChildren(...info.art.map(([a, name]) => el('button', { type: 'button', class: 'st-artbtn', 'aria-pressed': String((st.art || 'aurora') === a), onclick: () => { st.art = a; artBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.a === a))); changed(); }, 'data-a': a },
      el('i', { style: 'background-image:url(' + urls[a] + ')' }), el('span', { text: name })))); };
  const artAll = el('input', { type: 'checkbox' }); artAll.checked = !!st.artEverywhere; artAll.addEventListener('change', () => { st.artEverywhere = artAll.checked; changed(); });
  // Photos
  const spotRows = info.spots.map(([key, label, from]) => {
    const now = el('span', { class: 'muted small' });
    const paint = () => { const v = st.photos[key]; now.textContent = !v ? (from ? 'From ' + from : 'Art (no photo yet)') : v === 'none' ? 'Hidden' : /^art:/.test(v) ? 'Art: ' + v.slice(4) : 'Your file: ' + String(v).split(/[\\/]/).pop(); };
    const set = (v) => { if (v == null) delete st.photos[key]; else st.photos[key] = v; paint(); changed(); };
    paint();
    const row = el('div', { class: 'st-spot' }, el('div', { style: 'min-width:0' }, el('b', { text: label }), now),
      el('div', { class: 'actions' }, el('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { const p = await S.pickPhoto('photo'); if (p) set(p); } }, 'Choose…'),
        el('button', { class: 'btn ghost sm', type: 'button', title: 'Use background art here', onclick: () => set('art:' + (st.art || 'aurora')) }, 'Art'),
        st.photos[key] || from ? el('button', { class: 'btn ghost sm', type: 'button', title: 'Back to the original', onclick: () => set(null) }, 'Reset') : null));
    // Drop a photo straight onto the row.
    row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drop'); });
    row.addEventListener('dragleave', () => row.classList.remove('drop'));
    row.addEventListener('drop', (e) => { e.preventDefault(); row.classList.remove('drop'); const f = e.dataTransfer.files[0]; const p = f && S.filePath(f); if (p && /\.(jpe?g|png|webp)$/i.test(p)) set(p); else toast('Drop a JPG, PNG or WebP photo.'); });
    return row;
  });
  // Typeface
  const fontBtns = info.fonts.map(([key, name]) => el('button', { type: 'button', 'aria-pressed': String((st.font || 'jakarta') === key), onclick: () => { st.font = key; fontBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(info.fonts[i][0] === key))); changed(); } }, name));
  // Words
  const wordRows = info.words.map(([key, label, val]) => { const long = val.length > 60 || /lead|story/.test(key); const inp = el(long ? 'textarea' : 'input', { type: long ? null : 'text', rows: long ? 2 : null });
    inp.value = st.words[key] != null ? st.words[key] : val; inp.addEventListener('input', () => { if (inp.value === val) delete st.words[key]; else st.words[key] = inp.value; changed(); });
    return el('label', { class: 'field' }, el('span', { class: 'label', text: label }), inp); });
  // Slides
  // Slides: show or leave out each one, and move the main slides up or down (the opening and the close stay put).
  const slideBox = el('div', { class: 'st-slides' });
  const mainKeys = () => { const m = info.slides.filter((x) => !x.backup && !['open', 'close'].includes(x.key)); const at = (x, i) => (st.order.indexOf(x.key) >= 0 ? st.order.indexOf(x.key) : i - 0.5); return m.map((x, i) => ({ x, k: at(x, i), i })).sort((a, b) => a.k - b.k || a.i - b.i).map((o) => o.x); };
  const move = (key, d) => { const ks = mainKeys().map((x) => x.key), i = ks.indexOf(key), j = i + d; if (i < 0 || j < 0 || j >= ks.length) return; [ks[i], ks[j]] = [ks[j], ks[i]]; st.order = ks; paintSlides(); changed(); };
  function paintSlides() {
    const row = (x, canMove) => { const c = el('input', { type: 'checkbox' }); c.checked = !st.hide.includes(x.key);
      c.addEventListener('change', () => { st.hide = c.checked ? st.hide.filter((h) => h !== x.key) : [...st.hide, x.key]; changed(); });
      return el('div', { class: 'st-slide' }, el('label', { class: 'check' }, c, el('span', {}, slideName(x.key))),
        canMove ? el('span', { class: 'st-move' }, el('button', { type: 'button', class: 'btn ghost sm', title: 'Move up', onclick: () => move(x.key, -1) }, '↑'), el('button', { type: 'button', class: 'btn ghost sm', title: 'Move down', onclick: () => move(x.key, 1) }, '↓')) : null); };
    slideBox.replaceChildren(...mainKeys().map((x) => row(x, true)), ...info.slides.filter((x) => x.backup).map((x) => row(x, false)));
  }
  paintSlides();
  const slideChecks = [slideBox];
  // Motion
  // Design: twelve data slides in the abstract designers' languages (shapes carry the numbers), the whole story in them
  // (every main slide but the live calculator), or the Bridge-standard versions.
  const designs = [['abstract', 'Abstract'], ['amaze', 'Amaze'], ['standard', 'Bridge standard']];
  const designBtns = designs.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String((st.design === 'full' ? 'amaze' : st.design || 'abstract') === v), onclick: () => { st.design = v; designBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(designs[i][0] === v))); changed(); } }, t));
  const motions = [['full', 'Full'], ['calm', 'Calm']];
  const motionBtns = motions.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String((st.motion || 'full') === v), onclick: () => { st.motion = v; motionBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(motions[i][0] === v))); changed(); } }, t));

  const save = keyed(el('button', { class: 'btn primary', type: 'button' }, 'Save to the deck'));
  save.addEventListener('click', async () => {
    save.disabled = true; save.textContent = 'Saving…';
    try { const r = await S.studioSave(k.dir, st); dirty = false; toast('Saved. The animated deck has your changes (' + r.slides + ' slides); previews are being redrawn.'); close(); route(); }
    catch (e) { toast(errText(e)); save.disabled = false; save.replaceChildren(keyGlyph(), 'Save to the deck'); }
  });
  const close = () => { S.studioClose(k.dir); box.remove(); document.removeEventListener('keydown', esc, true); removeEventListener('message', onEdit); };
  const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (!dirty || confirm('Close the Studio without saving your changes?')) close(); } };
  const sec = (title, hint, ...kids) => el('section', { class: 'st-sec' }, el('h3', { text: title }), hint ? el('p', { class: 'muted small', text: hint }) : null, ...kids);
  const box = el('div', { class: 'studio', role: 'dialog', 'aria-label': 'Deck Studio' },
    el('header', {}, el('div', {}, el('div', { class: 'eyebrow', text: 'Deck Studio' }), el('h2', { text: info.name })), el('span', { class: 'grow' }),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => { if (!dirty || confirm('Close the Studio without saving your changes?')) close(); } }, 'Close'), save),
    el('div', { class: 'st-body' },
      el('div', { class: 'st-left' }, el('div', { class: 'st-stage' }, frame, busy),
        el('div', { class: 'st-nav' }, el('button', { class: 'btn ghost sm', type: 'button', onclick: () => step(-1) }, '‹'), slideSel, el('button', { class: 'btn ghost sm', type: 'button', onclick: () => step(1) }, '›'), el('span', { class: 'grow' }), editBtn, playBtn),
        el('label', { class: 'field st-notefield' }, notesHead, notesBox),
        el('p', { class: 'muted small', text: 'The preview updates as you change things. Edit words right on the slide, rewrite the talk track, move slides. Nothing is saved until you press Save to the deck.' })),
      el('div', { class: 'st-panel' },
        sec('Colors', 'Their deck colors. Try a preset, or pick your own.', el('div', { class: 'st-colors' }, colorRow('dark', 'Deep'), colorRow('mid', 'Main'), colorRow('accent', 'Accent'), colorRow('brand', 'Brand')),
          el('div', { class: 'actions' }, el('button', { class: 'btn ghost sm', type: 'button', onclick: () => setColors({}) }, 'Their colors'), el('button', { class: 'btn ghost sm', type: 'button', onclick: () => setColors({ dark: '0E1F62', mid: '1A38B2', accent: '8B9FEE', brand: 'F7C400' }) }, 'Prio Connect navy'), el('button', { class: 'btn ghost sm', type: 'button', onclick: surprise }, 'Surprise me'))),
        sec('Background art', 'Made from the deck\'s colors, for any spot without a photo.', artBox, el('label', { class: 'check' }, artAll, 'Use art in every photo spot (no photos)')),
        sec('Photos', 'Choose a file, or drop a photo onto a row.', ...spotRows),
        sec('Typeface', 'For the headlines and big numbers. Body text stays easy to read.', el('div', { class: 'seg' }, fontBtns)),
        sec('Words', 'Their headline lines, in your words.', ...wordRows),
        sec('Slides', 'Untick a slide to leave it out; ↑ ↓ to change the order. The opening and the close always stay.', slideBox),
        sec('Design', 'Abstract: the twelve data slides drawn in five abstract designers\' languages, the shapes carrying the numbers. Amaze: the whole story in that language, from the opening to the close (the calculator stays live). Bridge standard: the original layouts.', el('div', { class: 'seg' }, designBtns)),
        sec('Motion', 'Calm: quicker, quieter builds.', el('div', { class: 'seg' }, motionBtns)))));
  document.addEventListener('keydown', esc, true);
  document.body.append(box); paintArt(); refresh();
}

// Video: the app plays the deck build by build and records it (about three minutes for a full deck).
function videoBtn(k) {
  const b = el('button', { class: 'btn ghost', type: 'button', title: 'Record the animated deck, build by build, as a video for email or social' }, 'Make a video');
  b.addEventListener('click', async () => {
    b.disabled = true; b.textContent = 'Recording… 0%';
    const off = S.onVideo((d) => { if (d.dir === k.dir && d.pct != null) b.textContent = 'Recording… ' + d.pct + '%'; });
    try { const r = await S.deckVideo(k.dir); toast('Video saved: ' + r.file.split(/[\\/]/).pop() + ' (' + r.mb + ' MB).'); route(); }
    catch (e) { toast(errText(e)); b.disabled = false; b.textContent = 'Make a video'; }
    finally { off(); }
  });
  return b;
}
// Mock ads: a 15-second ad for each audience, in their colors, logo and photos. Silent and captioned, the way people
// scroll. Made frame by frame on this computer, so every ad is exactly 15 seconds; about a minute per ad.
const AD_SHAPES = [['v', 'Vertical 9:16', 'Reels, Stories, TikTok, Shorts'], ['s', 'Square 1:1', 'Facebook and Instagram feeds'], ['w', 'Wide 16:9', 'YouTube, websites, TV']];
function adsCard(k) {
  const pickShapes = store.get('ads.shapes', ['v', 's']);
  const shapeBoxes = AD_SHAPES.map(([v, t, use]) => { const c = el('input', { type: 'checkbox', value: v }); c.checked = pickShapes.includes(v); return el('label', { class: 'check', title: use }, c, el('span', {}, t, el('span', { class: 'muted small', text: '  ' + use }))); });
  const audBoxes = (k.audiences || []).map((n, i) => { const c = el('input', { type: 'checkbox', value: String(i) }); c.checked = true; return el('label', { class: 'check' }, c, n || 'Audience ' + (i + 1)); });
  const est = el('span', { class: 'muted small' });
  const checked = (boxes) => boxes.map((l) => l.querySelector('input')).filter((c) => c.checked).map((c) => c.value);
  let running = false;
  const count = () => { if (running) return; const n = checked(shapeBoxes).length * checked(audBoxes).length; est.textContent = n ? n + ' ad' + (n === 1 ? '' : 's') + ', about ' + Math.max(1, Math.round(n * 0.9)) + ' minute' + (n * 0.9 >= 1.5 ? 's' : '') : 'Choose a shape and an audience.'; go.disabled = !n; };
  const go = el('button', { class: 'btn primary', type: 'button' }, 'Make the ads');
  const bar = el('div', { class: 'adbar', hidden: true }, el('i'));
  [...shapeBoxes, ...audBoxes].forEach((l) => l.querySelector('input').addEventListener('change', count));
  // Progress comes from the app, so leaving this page and coming back picks the bar up where it is.
  const busy = (d) => { running = true; go.disabled = true; go.textContent = 'Making the ads… ' + (d.pct || 0) + '%'; bar.hidden = false; bar.firstChild.style.width = (d.pct || 0) + '%'; if (d.msg) est.textContent = d.msg; };
  const off = S.onAds((d) => {
    if (d.dir !== k.dir) return;
    if (!card.isConnected) { off(); return; }
    if (d.done) { off(); if (d.error) { running = false; toast(d.error); go.disabled = false; go.textContent = 'Make the ads'; bar.hidden = true; count(); } else { toast(d.count + ' mock ad' + (d.count === 1 ? '' : 's') + ' ready.'); route(); } return; }
    busy(d);
  });
  S.adsStatus().then((st) => { if (st && st.dir === k.dir) { if (maker) maker.open = true; busy(st); } });
  go.addEventListener('click', () => {
    const formats = checked(shapeBoxes), audiences = checked(audBoxes).map(Number);
    store.set('ads.shapes', formats); busy({ pct: 0, msg: 'Starting…' });
    S.makeAds(k.dir, { formats, audiences }).catch(() => { /* reported through the progress channel */ });
  });
  const maker = k.canChange ? el('details', { class: 'admaker', open: !k.ads.length },
    el('summary', {}, k.ads.length ? 'Make more ads' : 'Make mock ads'),
    el('div', { class: 'adpick' }, el('div', {}, el('span', { class: 'label', text: 'Shapes' }), ...shapeBoxes), audBoxes.length ? el('div', {}, el('span', { class: 'label', text: 'Audiences' }), ...audBoxes) : null),
    el('p', { class: 'muted small', text: 'Built from this kit: each audience\'s hook, number and photo, their logo and colors (and the Studio\'s choices). No new research, no cost.' }),
    el('div', { class: 'actions' }, go, el('button', { class: 'btn ghost', type: 'button', title: 'See an ad play right away, before making the videos', onclick: () => previewAd(k, Number(checked(audBoxes)[0] || 0), checked(shapeBoxes)[0] || 'v') }, '▶  Preview'), est), bar) : null;
  // The ads made so far, one row per audience, playing on a loop (still when motion is off).
  const groups = []; k.ads.forEach((a) => { let g = groups.find((x) => x.index === a.index); if (!g) groups.push(g = { index: a.index, name: a.audience, ads: [] }); g.ads.push(a); });
  const rows = groups.map((g) => el('div', { class: 'adrow' }, el('h3', { text: g.name }),
    el('div', { class: 'adset' }, g.ads.map((a) => el('figure', { class: 'ad ' + a.format },
      el('video', { src: a.src, muted: true, loop: true, playsinline: true, autoplay: moving(), controls: !moving(), preload: 'metadata', title: a.formatName + ': ' + a.use, onmouseenter: (e) => { e.currentTarget.controls = true; }, onmouseleave: (e) => { if (moving()) e.currentTarget.controls = false; } }),
      el('figcaption', {}, el('b', { text: a.formatName }), el('span', { class: 'muted small', text: mb(a.size) }),
        el('span', { class: 'grow' }),
        el('button', { class: 'btn ghost sm', type: 'button', title: 'Save a copy to send or post', onclick: async () => { try { const r = await S.saveCopy(a.path); if (r.saved) toast('Saved: ' + r.file.split(/[\\/]/).pop()); } catch (e) { toast(errText(e)); } } }, 'Save…')))))));
  const priceNote = el('p', { class: 'ad-price small' });
  const card = el('section', { class: 'card ads' },
    el('div', { class: 'kithead' }, el('div', {}, el('h2', { text: 'Mock ads' }), el('p', { class: 'muted small', text: '15 seconds each, in their colors: the hook, the number, the path from the ad to their door, and their logo with the call to action. Silent and captioned, the way people scroll.' })),
      k.ads.length ? el('div', { class: 'actions' }, el('button', { class: 'btn ghost sm', type: 'button', onclick: () => S.reveal(k.ads[0].path) }, 'Show in folder')) : null),
    rows.length ? el('div', { class: 'adrows' }, rows) : null, priceNote, maker);
  S.pricing().then((p) => { if (p.media.length) priceNote.textContent = 'Run them as a campaign: ' + p.media.map((o) => String(o.kind).toLowerCase() + ' $' + Number(o.cost).toLocaleString('en-US')).join('  ·  ') + '.'; }).catch(() => {});
  setTimeout(count);
  // Videos start muted (they have no sound), and the browser needs the property set, not just the attribute.
  card.querySelectorAll('video').forEach((v) => { v.muted = true; });
  return card;
}

// After the meeting: the thank-you email, written from the kit (their story, two numbers, the one ask, the launch
// date). Never the fee or their budget. Edit it here, then copy it or open it as a draft in their email program.
function followCard(k) {
  const to = el('input', { type: 'text', placeholder: 'Their first name', value: store.get('follow.to.' + k.dir, '') });
  const from = el('input', { type: 'text', placeholder: 'Your name', value: store.get('follow.from', '') });
  const subj = el('input', { type: 'text', 'aria-label': 'Subject' }), body = el('textarea', { rows: 14, 'aria-label': 'Email' });
  let edited = false;
  body.addEventListener('input', () => { edited = true; }); subj.addEventListener('input', () => { edited = true; });
  const fill = async (force) => { if (edited && !force) return; try { const r = await S.followUp(k.dir, { contact: to.value, from: from.value }); subj.value = r.subject; body.value = r.body; edited = false; } catch (e) { body.value = ''; toast(errText(e)); } };
  to.addEventListener('input', () => { store.set('follow.to.' + k.dir, to.value); fill(); }); from.addEventListener('input', () => { store.set('follow.from', from.value); fill(); });
  const leave = k.files.find((f) => /leave/i.test(f.name));
  const card = el('details', { class: 'card follow' }, el('summary', {}, 'Follow up after the meeting'),
    el('p', { class: 'muted small', text: 'A thank-you in Prio Connect\'s voice, written from this kit: their story, two of their numbers, the one ask and the launch date. It never mentions the fee or their budget.' }),
    el('div', { class: 'fl-two' }, el('label', { class: 'field' }, el('span', { class: 'label', text: 'To' }), to), el('label', { class: 'field' }, el('span', { class: 'label', text: 'From' }), from)),
    el('label', { class: 'field' }, el('span', { class: 'label', text: 'Subject' }), subj),
    el('label', { class: 'field' }, el('span', { class: 'label', text: 'Email' }), body),
    el('div', { class: 'actions' },
      el('button', { class: 'btn primary', type: 'button', onclick: async () => { await S.mailDraft(subj.value, body.value); toast(leave ? 'Draft opened. Attach the leave-behind (Show it, then drag it in).' : 'Draft opened in your email program.'); } }, 'Open as an email draft'),
      el('button', { class: 'btn ghost', type: 'button', onclick: async () => { await S.copyText('Subject: ' + subj.value + '\n\n' + body.value); toast('Copied.'); } }, 'Copy'),
      leave ? el('button', { class: 'btn ghost', type: 'button', onclick: () => S.reveal(leave.path) }, 'Show the leave-behind') : null,
      el('button', { class: 'btn ghost sm', type: 'button', title: 'Start over from the kit', onclick: () => fill(true) }, 'Reset')));
  card.addEventListener('toggle', () => { if (card.open && !body.value) fill(true); });
  return card;
}

// The ad playing live (no rendering): switch audience and shape to compare. It loops after a short hold.
async function previewAd(k, index, format) {
  const frame = el('iframe', { title: 'Ad preview', sandbox: 'allow-scripts' }), holder = el('div', { class: 'adp-stage' }, frame);
  const audSel = el('select', { 'aria-label': 'Audience' }, (k.audiences || []).map((n, i) => el('option', { value: String(i), text: n || 'Audience ' + (i + 1) })));
  audSel.value = String(index);
  const shapeBtns = AD_SHAPES.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(v === format), onclick: () => { format = v; shapeBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(AD_SHAPES[i][0] === v))); load(); } }, t));
  const load = async () => {
    try { const r = await S.adPreview(k.dir, Number(audSel.value), format); const box = 560, sc = Math.min(box * 1.6 / r.W, box / r.H);
      holder.style.width = Math.round(r.W * sc) + 'px'; holder.style.height = Math.round(r.H * sc) + 'px'; frame.src = r.url; }
    catch (e) { toast(errText(e)); }
  };
  audSel.addEventListener('change', load);
  const d = el('dialog', { class: 'adprev', 'aria-label': 'Ad preview' },
    el('header', {}, el('b', { text: 'Ad preview' }), audSel, el('div', { class: 'seg' }, shapeBtns), el('span', { class: 'grow' }), el('button', { class: 'btn ghost sm', type: 'button', onclick: () => d.close() }, 'Close')),
    holder, el('p', { class: 'muted small', text: 'This is the ad as it will play. Make the ads to save them as videos. Words come from the Studio.' }));
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal(); load();
}

// An export button: busy while it works, back to itself after.
function exportBtn(text, title, run) {
  const b = el('button', { class: 'btn ghost sm', type: 'button', title }, text + '…');
  b.addEventListener('click', async () => { b.disabled = true; try { await run(b); } catch (e) { toast(errText(e)); } finally { b.disabled = false; b.textContent = text + '…'; } });
  return b;
}

// An older kit (made before the animated deck existed) gets one from its saved research, in seconds and at no cost.
function makeDeckBtn(k) {
  const b = el('button', { class: 'btn primary', type: 'button', title: 'Build the animated deck from this kit\'s saved research (no new research, no cost)' }, 'Make the animated deck');
  b.addEventListener('click', async () => {
    b.disabled = true; b.textContent = 'Building the animated deck…';
    try { const r = await S.makeWebDeck(k.dir); toast('Animated deck ready: ' + r.slides + ' slides, ' + r.mb + ' MB. Previews are being drawn.'); route(); }
    catch (e) { toast(errText(e)); b.disabled = false; b.textContent = 'Make the animated deck'; }
  });
  return b;
}

// Present the animated deck: full screen for the room; with a second screen, the presenter view stays on this one.
async function presentDeck(file) {
  try { const r = await S.present(file); toast(r && r.screens > 1 ? 'Presenting on the second screen. Your presenter view is here. Esc ends.' : 'Presenting. → or your clicker to build, N for the talk track, Esc to end.'); }
  catch (e) { toast(errText(e)); }
}

// ---------- a burst of the brand colors when a kit is ready (Full motion only) ----------
function burst() {
  if (motionLevel() !== 'full') return;
  const cs = getComputedStyle(document.documentElement), tv = (k) => cs.getPropertyValue('--' + k).trim(), t = themeNow();
  const cols = t === 'light' ? ['#0A0A0A', '#3D3D3D', '#8C8C8C', '#D9D9D9'] : t === 'black' ? ['#FFFFFF', '#BDBDBD', '#7A7A7A', '#3D3D3D'] : t === 'shuffle' ? [tv('accent'), tv('blue'), tv('red'), tv('ink'), tv('rail')] : t === 'warm' ? ['#FAC800', '#E22622', '#2656D9', '#121218'] : ['#F7C400', '#E1251B', '#1D4ED8', '#FFFFFF', tv('accent')];
  const b = el('div', { class: 'burst', 'aria-hidden': 'true' });
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2, d = 160 + Math.random() * 380;
    const st = '--x:' + (55 + Math.random() * 10) + 'vw;--y:' + (28 + Math.random() * 8) + 'vh;--dx:' + Math.cos(a) * d + 'px;--dy:' + (Math.sin(a) * d + 160) + 'px;--rot:' + (Math.random() * 720 - 360) + 'deg;animation-delay:' + Math.random() * 120 + 'ms;';
    b.append(el('i', { style: st + 'background:' + cols[i % cols.length] }));
  }
  document.body.append(b); setTimeout(() => b.remove(), 1700);
}

// ---------- Rehearse: the deck full screen, the talk track large, a clock against each slide's TIME ----------
const secs = (t) => { const m = String(t || '').match(/TIME:\s*(\d+):(\d{2})/); return m ? +m[1] * 60 + +m[2] : 0; };
function rehearse(k, start) {
  const P = k.previews; if (!P.length || $('.present')) return;
  let i = Math.max(0, Math.min(P.length - 1, start || 0)), t0 = Date.now(), s0 = Date.now();
  const close = P.findIndex((p) => /TOTAL TALK/.test(p.notes)), last = close >= 0 ? close : P.length - 1;
  const target = P.slice(0, last + 1).reduce((a, p) => a + secs(p.notes), 0);
  const img = el('img', { alt: '' }), lines = el('div', { class: 'lines' }), count = el('span', { class: 'eyebrow' }), nextBox = el('div', { class: 'next' });
  const slideT = el('b'), totalT = el('b'), slideBox = el('div', { class: 'timer' }, slideT, el('small', { text: 'This slide' })), totalBox = el('div', { class: 'timer' }, totalT, el('small', { text: target ? 'Of about ' + clock(target * 1000) : 'Total' }));
  const pace = el('div', { class: 'pace', title: 'Time on this slide against its target' }, el('i'));
  const box = el('div', { class: 'present', role: 'dialog', 'aria-label': 'Rehearse ' + k.name },
    el('header', {}, el('div', {}, el('div', { class: 'eyebrow', text: 'Rehearsing · ' + k.name }), count),
      el('div', { class: 'timers' }, slideBox, totalBox), el('div', { class: 'actions' }, el('button', { class: 'btn ghost', type: 'button', onclick: () => { t0 = s0 = Date.now(); tick(); } }, 'Restart clock (T)'), el('button', { class: 'btn primary', type: 'button', onclick: () => end() }, 'Done (Esc)'))),
    el('div', { class: 'big' }, img), el('aside', { 'aria-label': 'Talk track' }, lines, nextBox),
    el('footer', {}, el('span', { class: 'muted small', text: '← → or Space to move · F for full screen · T restarts the clock' }), pace));
  const show = (n, dir) => {
    i = Math.max(0, Math.min(P.length - 1, n)); s0 = Date.now();
    img.src = P[i].src; img.alt = k.name + ', slide ' + (i + 1);
    if (moving() && dir && img.animate) img.animate([{ opacity: 0, transform: 'translateX(' + 40 * dir + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' });
    count.textContent = 'Slide ' + (i + 1) + ' of ' + P.length + (i > last ? ' · backup' : i === last && close >= 0 ? ' · the close' : '');
    lines.replaceChildren(...talk(P[i].notes));
    const nx = P[i + 1]; nextBox.replaceChildren(...(nx ? [el('span', { text: 'Next' }), el('img', { src: nx.src, alt: '' })] : [el('span', { text: 'Last slide' })]));
    tick();
  };
  const tick = () => {
    const ts = (Date.now() - s0) / 1000, tt = (Date.now() - t0) / 1000, goal = secs(P[i].notes);
    slideT.textContent = clock(ts * 1000); totalT.textContent = clock(tt * 1000);
    slideBox.classList.toggle('over', !!goal && ts > goal); totalBox.classList.toggle('over', !!target && tt > target);
    pace.classList.toggle('over', !!goal && ts > goal); pace.firstChild.style.width = goal ? Math.min(100, ts / goal * 100) + '%' : '0%';
  };
  const timer = setInterval(tick, 500);
  const keys = (e) => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { show(i + 1, 1); e.preventDefault(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { show(i - 1, -1); e.preventDefault(); }
    else if (e.key === 'Escape') end();
    else if (e.key === 't' || e.key === 'T') { t0 = s0 = Date.now(); tick(); }
    else if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else box.requestFullscreen().catch(() => {}); }
    e.stopPropagation();
  };
  function end() { clearInterval(timer); document.removeEventListener('keydown', keys, true); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); box.remove(); }
  document.addEventListener('keydown', keys, true);
  document.body.append(box); show(i, 0);
  box.requestFullscreen().catch(() => {});
}

// ---------- Ctrl K: one box to reach any kit or action ----------
async function palette() {
  if ($('dialog.palette')) return;
  const all = await S.kits(), onKit = /^#kit\//.test(location.hash);
  const go = (h) => () => { location.hash = h; };
  const theme = (v) => () => { store.set('theme', v); setScheme(); };
  const items = [
    ['+', 'New prospect', 'Research and build a kit', go('new'), 'Ctrl N'],
    ['▦', 'Library', all.length + ' prospects', go('library'), 'Ctrl L'],
    ...(onKit ? [['', 'Open the Deck Studio', 'Colors, photos, art, typeface, words and slides', () => { const b = [...document.querySelectorAll('.hero button')].find((x) => /Studio/.test(x.textContent)); if (b) b.click(); else toast('This kit has no animated deck yet.'); }]] : []),
    ...(onKit ? [['▷', 'Make mock ads', '15-second ads for each audience, in their colors', () => { const c = $('.card.ads'); if (!c) { toast('This kit has no research to make ads from.'); return; } const m = c.querySelector('.admaker'); if (m) m.open = true; c.scrollIntoView({ behavior: moving() ? 'smooth' : 'auto', block: 'start' }); }]] : []),
    ...(onKit ? [['▶', 'Rehearse this kit', 'Full screen with the talk track and a clock', () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })), 'R']] : []),
    ...(onKit ? [['▶', 'Present this kit', 'The animated deck, full screen (a second screen gets the presenter view)', () => { const b = [...document.querySelectorAll('.hero button')].find((x) => /Present/.test(x.textContent)); if (b) b.click(); else toast('This kit has no animated deck yet.'); }]] : []),
    ...(onKit ? [['▦', 'Make slide previews', 'Draw every finished slide with its talk track', () => { const b = [...document.querySelectorAll('.viewer button')].find((x) => /previews|Try again/.test(x.textContent)); if (b) b.click(); else toast('This kit already has its slide previews.'); }]] : []),
    ['', 'Update every deck', 'Rebuild every kit\'s animated deck with this version (no cost)', async () => { location.hash = 'settings'; setTimeout(() => { const b = [...document.querySelectorAll('.card button')].find((x) => /newest decks/.test(x.textContent)); if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.click(); } }, 700); }],
    ['', 'Import kits…', 'A kit zip, the starter pack or a folder', async () => { const r = await S.importKits('files'); if (!r.canceled) { toast(r.added.length ? 'Imported ' + r.added.length + ' kit' + (r.added.length > 1 ? 's' : '') + '.' : 'No new kits there.'); route(); refreshCount(); } }],
    ['', 'Open the Kits folder', 'Where every kit is saved', () => S.kitsFolder()],
    ['', 'Settings', 'Research key, appearance, motion', go('settings'), 'Ctrl ,'],
    ...THEMES.map(([v, t]) => ['', 'Mode: ' + t, 'Change how the app looks', theme(v)]),
    ['', 'Roll new colors', 'Shuffle: a new color scheme', () => rollColors()],
    ...[['full', 'Full'], ['calm', 'Calm'], ['off', 'Off']].map(([v, t]) => ['≈', 'Motion: ' + t, 'How much the app moves', () => { store.set('motion', v); applyLook(); toast('Motion: ' + t + '.'); }]),
    ['?', 'Keyboard shortcuts', 'Every key the app knows', () => shortcuts(), '?'],
    ['', 'Show the welcome', 'The three steps to a first kit', () => welcome(true)],
    ...all.map((g) => [g.latest.logoSrc || g.latest.cover || initials(g.name), g.name, [g.latest.city, g.latest.model === 'faith' ? 'Faith' : g.latest.model === 'secular' ? 'Secular' : '', g.versions.length > 1 ? g.versions.length + ' versions' : ''].filter(Boolean).join(' · '), go('kit/' + encodeURIComponent(g.latest.dir))])
  ];
  const q = el('input', { type: 'text', placeholder: 'Type a prospect, a city or an action…', 'aria-label': 'Search', spellcheck: 'false' }), list = el('ul', { role: 'listbox' });
  const d = el('dialog', { class: 'palette', 'aria-label': 'Go to' }, keyGlyph('pal-key'), q, list, el('div', { class: 'hint2' }, '↑ ↓ to choose · Enter to open · Esc to close'));
  let shown = [], sel = 0;
  const paint = () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    shown = items.filter((it) => words.every((w) => (it[1] + ' ' + it[2]).toLowerCase().includes(w))).slice(0, 30); sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.replaceChildren(...shown.map((it, i) => el('li', { role: 'option', 'aria-selected': String(i === sel), onclick: () => run(i), onmousemove: () => { if (sel !== i) { sel = i; paint(); } } },
      el('span', { class: 'ic' }, /^(kit:|https:|data:)/.test(it[0]) ? el('img', { src: it[0], alt: '' }) : it[0]), el('div', { style: 'min-width:0' }, el('b', { text: it[1] }), el('small', { text: it[2] })), it[4] ? el('kbd', { text: it[4] }) : null)));
    if (!shown.length) list.replaceChildren(el('li', {}, el('small', { text: 'Nothing matches. Try a name, a city, "theme" or "import".' })));
    const cur = list.children[sel]; if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  };
  const run = (i) => { const it = shown[i]; if (!it) return; d.close(); it[3](); };
  q.addEventListener('input', () => { sel = 0; paint(); sonarPing(d, 22, 29, 700, 2); if (moving()) [...list.children].forEach((li, i) => { li.style.setProperty('--echo', (60 + i * 38) + 'ms'); li.classList.add('echo'); }); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); paint(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); }
    else if (e.key === 'Enter') { run(sel); e.preventDefault(); }
  });
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal(); paint(); q.focus();
}

// ---------- first run: three steps to a first kit, with the bridge drawn in ----------
async function welcome(force) {
  if (!force && (store.get('welcomed', false) || $('.welcome'))) return;
  const set = await S.settings(), prime = await S.starterKits().catch(() => []);
  const svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 720 200'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'wl-bridge');
  const path = (d, c, w, len, delay) => { const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', d); p.setAttribute('stroke', c); p.setAttribute('stroke-width', w); p.style.setProperty('--len', len); p.style.animationDelay = delay + 's'; svg.append(p); };
  path('M 20 190 Q 360 -40 700 190', '#E1251B', 2, 900, 0); path('M 40 190 Q 360 0 680 190', '#3B82F6', 2, 860, 0.2); path('M 60 190 Q 360 40 660 190', '#F7C400', 2, 820, 0.4);
  path('M 90 140 L 630 140', '#1D4ED8', 14, 560, 0.8);
  [150, 270, 450, 570].forEach((x, i) => path('M ' + x + ' 140 L ' + x + ' 190', '#5B7BEA', 4, 60, 1.2 + i * 0.1));
  const tile = document.createElementNS(svgNS, 'rect'); tile.setAttribute('x', 336); tile.setAttribute('y', 108); tile.setAttribute('width', 48); tile.setAttribute('height', 48); tile.setAttribute('rx', 10); tile.setAttribute('fill', '#F7C400'); tile.style.cssText = 'transform-origin:360px 132px;animation:pop .7s cubic-bezier(.2,1.35,.35,1) both 1.6s'; svg.append(tile);
  const img = document.createElementNS(svgNS, 'image'); img.setAttribute('href', 'icons/prime-mark.png'); img.setAttribute('x', 349); img.setAttribute('y', 116); img.setAttribute('width', 22); img.setAttribute('height', 28); img.style.cssText = 'animation:pop .7s cubic-bezier(.2,1.35,.35,1) both 1.75s;transform-origin:360px 130px'; svg.append(img);
  const done = (h) => () => { store.set('welcomed', true); w.remove(); if (h) location.hash = h; };
  const w = el('div', { class: 'welcome', role: 'dialog', 'aria-label': 'Welcome to PRIO' }, plate('void', 'welcome', ['#F7C400', '#FFFFFF', '#2F63FF'], { fit: 'xMidYMid slice', x: 0.9, hz: 0.84, size: 0.07 }, 'pl-welcome pl-void'), plate('overprint', 'welcome', PRIME_INKS.slice(0, 3), { blend: 'screen', opacity: 0.7, n: 6, band: [0.72, 1] }, 'pl-welcome'), el('div', { class: 'in' }, svg,
    primeMorph(84, { delay: 1200, cls: 'pm-welcome' }), el('div', { class: 'eyebrow', style: 'color:#F7C400', text: 'PRIO, by Prio Connect' }), el('h1', { text: 'Walk into every meeting ready.' }),
    el('p', { class: 'lead', text: prime.length ? 'Ready to go. Your Library already holds the Prio Connect kits: ' + prime.join(', ').replace(/, ([^,]*)$/, ' and $1') + '. Their decks are being built on this computer now, about a minute each, at no cost.' : 'Name a prospect. Pitch Perfect researches their town and their story, and you get the deck, the talk track, the cheat sheet and the leave-behind in about seven minutes.' }),
    el('div', { class: 'steps3' },
      el('div', {}, el('em', { text: 'Now' }), el('b', { text: 'Present any kit' }), el('span', { text: 'Open a kit and press Present. With a second screen, your talk track and clock stay with you. R rehearses.' })),
      el('div', {}, el('em', { text: 'Any time' }), el('b', { text: 'Bring in your other decks' }), el('span', { text: 'Drop a kit zip, a kit folder or a deck and its PDFs onto this window.' })),
      el('div', {}, el('em', { text: 'New prospects' }), el('b', { text: set.hasKey ? 'Your research key is set' : 'Add your research key once' }), el('span', { text: set.hasKey ? 'Name a prospect and the research, deck and kit are built here.' : 'Only needed to research someone new (about $2 a kit). It stays encrypted on this computer.' }))),
    el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'button', onclick: done('library') }, 'Open my Library'),
      el('button', { class: 'btn ghost', type: 'button', onclick: done(set.hasKey ? 'new' : 'settings') }, set.hasKey ? 'Build a new kit' : 'Add my research key'),
      el('button', { class: 'btn ghost', type: 'button', onclick: async () => { const r = await S.importKits('files'); if (!r.canceled) { done('library')(); route(); refreshCount(); } } }, 'Import kits…'))));
  document.body.append(w);
}

// ---------- keyboard shortcuts, everywhere; ? lists them ----------
function shortcuts() {
  if ($('dialog.keys')) return;
  const rows = [['Ctrl K', 'Go to anything'], ['Ctrl N', 'New prospect'], ['Ctrl L', 'Library'], ['Ctrl ,', 'Settings'], ['/', 'Search the Library'], ['← →', 'Previous and next slide'], ['R', 'Rehearse the open kit'], ['F', 'Full screen while rehearsing'], ['?', 'These shortcuts']];
  const d = el('dialog', { class: 'keys' }, el('h2', { text: 'Keyboard shortcuts' }),
    el('dl', {}, rows.flatMap(([k, t]) => [el('dt', {}, ...k.split(' ').map((x) => el('kbd', { text: x }))), el('dd', { text: t })])),
    el('div', { class: 'actions' }, el('button', { class: 'btn dark', type: 'button', onclick: () => d.close() }, 'Got it')));
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal();
}
document.addEventListener('keydown', (e) => {
  if ($('.present')) return;
  const typing = e.target.closest && e.target.closest('input, textarea, select');
  if (e.ctrlKey || e.metaKey) {
    if (e.key.toLowerCase() === 'k') { palette(); e.preventDefault(); return; }
    const go = { n: 'new', l: 'library', ',': 'settings' }[e.key.toLowerCase()];
    if (go) { location.hash = go; e.preventDefault(); }
    return;
  }
  if (typing) return;
  if (e.key === '?') { shortcuts(); e.preventDefault(); }
  if (e.key === '/') { const q = $('.toolbar input'); if (q) { q.focus(); e.preventDefault(); } else { location.hash = 'library'; e.preventDefault(); } }
});

// Settings → Slide previews: start PowerPoint the way previews do, and say plainly what happened.
function previewCard() {
  const out = el('div'), b = el('button', { class: 'btn dark', type: 'button' }, 'Check PowerPoint');
  b.addEventListener('click', async () => {
    b.disabled = true; out.replaceChildren(el('p', { class: 'muted', text: 'Starting PowerPoint the way slide previews do… (up to 2 minutes the first time)' }));
    const r = await S.checkPreviews(); b.disabled = false;
    out.replaceChildren(el('div', { class: 'note ' + (r.ok ? 'ok' : 'err'), text: r.text }));
  });
  return el('section', { class: 'card' }, el('h2', { text: 'Slide previews' }),
    el('p', { class: 'small muted', text: 'Previews are drawn by PowerPoint on this computer, so they look exactly like the deck. If they do not appear, check here first.' }),
    el('div', { class: 'actions' }, b), out);
}

// The rail shows a build in progress from any page, and the version at the foot.
async function watchRunning() {
  const st = await S.status(), r = $('#running');
  r.hidden = !st.running; if (st.running) $('#running-text').textContent = 'Building ' + st.name + '…';
}
S.onLog(() => { if ($('#running').hidden) watchRunning(); });
S.onDone(() => { $('#running').hidden = true; refreshCount(); });
S.settings().then((s) => { $('#foot').textContent = 'v' + s.version; });
$('#dice').addEventListener('click', (e) => rollColors(e.currentTarget)); applyLook();
{ const b = $('.rail .brand'), img = b && b.querySelector('img'); if (img) img.replaceWith(primeMorph(30, { hover: true, hoverHost: b, hold: 700 })); }
{ const nav = $('.rail nav'); if (nav) nav.after(keyed(el('button', { class: 'keybtn', type: 'button', title: 'Every action, kit and setting in one place (Ctrl K)', onclick: () => palette() }, el('span', { text: 'Find anything' }), el('kbd', { text: 'Ctrl K' })))); }
addEventListener('hashchange', route);
watchRunning(); refreshCount();
// On launch the I of PRIO launches out of the P's counter and falls behind it; when it lands the O runs left leaving
// "Ohhhhh!", and the app rolls in as a wave from where it landed (Full motion; Calm skips it, Off shows nothing). The Library is drawn under the wave.
const splashed = new Promise((done) => {
  const sp = $('#splash'); if (!sp) return done();
  const level = motionLevel(); if (level === 'off') { sp.remove(); return done(); }
  if (level === 'calm') sp.classList.add('skip');
  const gone = () => { sp.remove(); removeEventListener('keydown', skip, true); removeEventListener('pointerdown', skip, true); };
  const skip = () => { if (!sp.isConnected) return; sp.classList.add('skip'); done(); setTimeout(gone, 260); };
  addEventListener('keydown', skip, true); addEventListener('pointerdown', skip, true);
  setTimeout(done, level === 'calm' ? 0 : 3700); setTimeout(gone, level === 'calm' ? 260 : 4650);
});
splashed.then(route).then(() => welcome()).then(() => { if (store.get('look.moved', '')) { store.del('look.moved'); setTimeout(() => toast('New look: Notebook. Your earlier one is still in Settings, under Appearance.'), 900); } });
