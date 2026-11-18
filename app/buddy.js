// PRIO's guide: the P mark, small, in the corner. It watches the pointer, says what each page is for, and thinks while
// research and builds run. When you go still on a page it walks over to the next useful thing and says why. The first
// time the app opens it gives a short tour. It can be run entirely by voice: hands-free, it listens, answers out loud,
// asks for what it needs and builds a whole kit without a key being pressed. It also records voice memos (the audio is
// kept on this computer, transcribed on Windows) and files them with the right client. Settings can quiet it or hide
// it; with Motion off it holds still.
(() => {
  'use strict';
  const S = window.studio, root = document.documentElement;
  const get = (k, d) => { try { const v = localStorage.getItem('pp.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem('pp.' + k, JSON.stringify(v)); } catch (e) { /* fine */ } };
  const mode = () => get('guide', 'on'); // on | quiet | off
  // Its name: Prio by default. Earlier versions let people rename and dress it; a name they chose is kept.
  const NAMES = ['Vera', 'Pono', 'Imi', 'Satya', 'Emet', 'Makoto', 'Kweli', 'Zeta', 'Eureka', 'Khoj', 'Arthi', 'Pip'];
  const nm = () => { const n = String(get('guide.name', '') || '').slice(0, 24); return !n || n === 'Vera' ? 'Prio' : n; };
  const still = () => root.dataset.motion === 'off';
  const h = (tag, cls, kids) => { const n = document.createElement(tag); if (cls) n.className = cls; (kids || []).forEach((k) => n.append(k)); return n; };

  // ---------- the creature ----------
  // The P itself: a glossy stem and ring; the ring's open middle (its counter) is where it looks out from.
  const eyeL = h('span', 'bd-eye l', [h('i')]), eyeR = h('span', 'bd-eye r', [h('i')]), mouth = h('span', 'bd-mouth');
  const face = h('span', 'bd-face', [eyeL, eyeR, mouth]);
  const head = h('span', 'bd-ring', [h('span', 'bd-donut'), h('span', 'bd-cheek l'), h('span', 'bd-cheek r'), face]);
  const torso = h('span', 'bd-stem');
  const star = h('span', 'bd-star', [h('span', 'bd-spark')]);
  const body = h('button', 'bd-body', [h('span', 'bd-shadow'), h('span', 'bd-p', [torso, head]), star]);
  body.type = 'button'; const labelBody = () => body.setAttribute('aria-label', nm() + ', your guide. Click for a tip.'); labelBody();
  // The typed-out text is for the eye; screen readers get the whole message once, from a hidden live region.
  const text = h('p', 'bd-text'), acts = h('div', 'bd-acts'), live = h('span', 'sr-only'); text.setAttribute('aria-hidden', 'true');
  live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  const hush = h('button', 'bd-hush'); hush.type = 'button'; hush.textContent = '×'; hush.setAttribute('aria-label', 'Close');
  const bubble = h('div', 'bd-bubble', [hush, text, acts]); bubble.hidden = true;
  const buddy = h('div', 'buddy', [live, bubble, body]); buddy.id = 'buddy'; buddy.dataset.mood = 'idle';

  const setMood = (m, ms) => { buddy.dataset.mood = m; clearTimeout(setMood.t); if (ms) setMood.t = setTimeout(() => { buddy.dataset.mood = busy() ? 'think' : 'idle'; }, ms); };

  // ---------- speech ----------
  let typing = 0, hideT = 0;
  let panelLog = null;
  function say(msg, o = {}) {
    if (mode() === 'off' || !msg) return;
    if (panelLog && panelLog.isConnected && !panelLog.closest('[hidden]')) { const m = document.createElement('div'); m.className = 'bd-msg it'; const pp = document.createElement('p'); pp.textContent = msg; m.append(pp); panelLog.append(m); panelLog.scrollTop = panelLog.scrollHeight; return; }
    clearTimeout(hideT); cancelAnimationFrame(typing);
    bubble.hidden = false; buddy.classList.add('talking'); acts.replaceChildren(); live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; });
    (o.actions || []).forEach(([label, fn]) => { const b = h('button', 'bd-act'); b.type = 'button'; b.textContent = label; b.onclick = () => { closeBubble(); fn(); }; acts.append(b); });
    if (still()) { text.textContent = msg; buddy.classList.remove('talking'); }
    else { let i = 0; const t0 = performance.now(); const step = (t) => { i = Math.min(msg.length, Math.floor((t - t0) / 18)); text.textContent = msg.slice(0, i); if (i < msg.length) typing = requestAnimationFrame(step); else buddy.classList.remove('talking'); }; typing = requestAnimationFrame(step); }
    if (o.mood) setMood(o.mood, 1600);
    if (o.point) point(o.point);
    if (!o.stay) hideT = setTimeout(closeBubble, Math.max(5200, msg.length * 70));
  }
  function closeBubble() { if (bubble.contains(document.activeElement)) body.focus(); clearTimeout(hideT); cancelAnimationFrame(typing); buddy.classList.remove('talking'); bubble.hidden = true; }
  bubble.addEventListener('pointerenter', () => clearTimeout(hideT));
  bubble.addEventListener('focusin', () => clearTimeout(hideT));
  buddy.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !bubble.hidden) { e.stopPropagation(); closeBubble(); body.focus(); } });
  bubble.addEventListener('pointerleave', () => { if (!bubble.hidden) hideT = setTimeout(closeBubble, 2600); });
  hush.onclick = closeBubble;

  // The star flies to something on the page and circles it, so the guide can show as well as tell.
  function point(sel) {
    const t = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!t || still()) return;
    const a = t.getBoundingClientRect(), b = star.getBoundingClientRect(); if (!a.width) return;
    const k = body.getBoundingClientRect().width / 150 || 1; star.style.setProperty('--fx', ((a.left + Math.min(a.width - 8, 26) - b.left) / k) + 'px'); star.style.setProperty('--fy', ((a.top - b.top - 6) / k) + 'px');
    buddy.classList.remove('pointing'); void star.offsetWidth; buddy.classList.add('pointing');
    t.classList.add('bd-spot'); setTimeout(() => { t.classList.remove('bd-spot'); buddy.classList.remove('pointing'); }, 2300);
  }

  // ---------- what each page is for ----------
  const page = () => location.hash.replace(/^#/, '').split('/')[0] || 'library';
  const title = () => { const n = document.querySelector('#view h1'); return n ? n.textContent.trim() : ''; };
  const kitCount = () => document.querySelectorAll('#view .kit, #view .kc, #view [data-kit]').length;
  const go = (hash) => () => { location.hash = hash; };
  const TIPS = {
    library: () => (kitCount() ? [
      ['Your meeting kits. Open one to review the deck; press R inside it to rehearse.', { point: '#view .kitcard' }],
      ['Drop a kit zip anywhere on this page to add it.'],
      ['Ctrl J asks me anything. The mic on me runs the whole thing by voice.']
    ] : [
      ['Start with a prospect. Give me a name and a website and I will research them and build the deck.', { point: '#nav-new', actions: [['New prospect', go('new')]] }],
      ['Prefer to talk? Click the mic on me and say who you are meeting.']
    ]),
    new: () => [
      ['Name and website are enough. I research them, then write the deck, the talk track and the leave-behind.', { point: '#view input' }],
      ['Their logo and photos make the deck look like theirs. I look on their site if you have none.'],
      ['Not sure if it is a church or a business? Leave it on "Not sure".']
    ],
    run: () => [['Research and the slides take a few minutes. You can leave this page; I will tell you when it is done.', { mood: 'think' }]],
    kit: () => [
      [(title() ? title() + ': ' : '') + 'the kit is ready. Each click in the deck builds the next part of the story.'],
      ['Read the cheat sheet before the meeting. It lists the questions they are likely to ask.'],
      ['Add them to Clients so the next step has a date.', { point: '#view button.crm-add, #view .actions .btn' }]
    ],
    crm: () => (location.hash.split('/')[1] ? [
      ['Every client needs a next step and a date. It shows in Follow-ups on the day.', { point: '#c-step' }],
      ['Note what was said after each call. Ctrl+Enter saves.', { point: '#c-note' }]
    ] : [
      ['Your pipeline. Drag a card to the next stage when things move.'],
      ['Follow-ups lists every next step by day. Late ones are red.']
    ]),
    ads: () => [
      ['Say what to advertise and who should see it. I plan the campaign and draw the ads in your colors.', { point: '#mk-product' }],
      ['Use your own photos where you can. Real places and people beat stock images.']
    ],
    brand: () => [
      ['Describe the company and how it should feel. I write the positioning and voice and pick colors and type.', { point: '#mk-name' }]
    ],
    company: () => [
      ['Decks, ads and brand kits are written for the company marked In use.'],
      ['Real results in Proof make decks stronger. I never invent results.']
    ],
    settings: () => [
      ['If I talk too much, set me to Quiet. I will only speak when you click me.', { point: '.guidepick' }]
    ]
  };
  const tipN = {};
  function tip(first) {
    const list = (TIPS[page()] || TIPS.library)(); if (!list.length) return;
    const i = first ? 0 : (tipN[page()] = ((tipN[page()] == null ? -1 : tipN[page()]) + 1) % list.length);
    if (first) tipN[page()] = 0;
    const [m, o] = list[i]; say(m, o || {});
  }
  const seen = new Set();
  function arrived() {
    if (touring) return; // the tour keeps its place while pages change under it
    closeBubble(); buddy.classList.remove('arrive'); void buddy.offsetWidth; if (!still()) buddy.classList.add('arrive');
    const key = page() + (page() === 'crm' && location.hash.split('/')[1] ? '/one' : '');
    if (mode() === 'on' && !seen.has(key)) { seen.add(key); setTimeout(() => tip(true), 700); }
  }

  // ---------- busy, done, trouble ----------
  const busy = () => !!document.querySelector('#running:not([hidden]), .setup:not([hidden]), .feed:not([hidden])') || root.classList.contains('busy');
  let wasBusy = false;
  setInterval(() => { if (buddy.hidden || document.hidden) return; const b = busy(); if (b !== wasBusy) { wasBusy = b; buddy.classList.toggle('busy', b); if (buddy.dataset.mood === 'idle' || buddy.dataset.mood === 'think') buddy.dataset.mood = b ? 'think' : 'idle'; } }, 600);
  const wrap = (name, after) => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function (...a) { const r = f.apply(this, a); try { after(...a); } catch (e) { /* the guide never breaks the app */ } return r; }; };
  wrap('toast', (m) => {
    const s = String(m || '');
    if (/could not|couldn't|failed|error|missing|offline|first\./i.test(s)) setMood('worried', 2600);
    else if (/ready|done|saved|added|nice|imported|built|deleted|copied/i.test(s)) setMood('happy', 1500);
  });
  wrap('burst', () => { setMood('happy', 1600); const m = 'The kit is ready. Open the deck to review it, or say "rehearse" and I will run it full screen.'; if (mode() === 'on' || hfLive) say(m, { mood: 'happy' }); if (hfLive) talk(m); });

  // ---------- eyes that follow, blinks, a nap when left alone ----------
  let px = 0, py = 0, raf = 0, lastMove = Date.now();
  addEventListener('pointermove', (e) => { if (buddy.hidden) return; px = e.clientX; py = e.clientY; lastMove = Date.now(); if (buddy.dataset.mood === 'sleep') setMood('idle'); if (!raf) raf = requestAnimationFrame(look); }, { passive: true });
  function look() {
    raf = 0; if (still()) return;
    const r = face.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 260);
    buddy.style.setProperty('--ex', (dx / d * 3.2 * k).toFixed(2) + 'px'); buddy.style.setProperty('--ey', (dy / d * 2.6 * k).toFixed(2) + 'px');
    buddy.style.setProperty('--lean', (Math.max(-1, Math.min(1, dx / 500)) * 6).toFixed(2) + 'deg');
    buddy.classList.toggle('near', d < 150);
  }
  (function blink() { setTimeout(() => { if (!still() && !document.hidden) { buddy.classList.add('blink'); setTimeout(() => buddy.classList.remove('blink'), 140); if (Math.random() < 0.25) setTimeout(() => { buddy.classList.add('blink'); setTimeout(() => buddy.classList.remove('blink'), 120); }, 260); } blink(); }, 2600 + Math.random() * 3800); })();

  body.addEventListener('click', () => {
    buddy.classList.remove('boop'); void body.offsetWidth; buddy.classList.add('boop');
    if (bubble.hidden || mode() !== 'off') tip(false);
  });

  // Settings: Guide on, quiet or hidden.
  window.guideMode = (m) => { if (m) { put('guide', m); apply(); if (m === 'on') { setMood('happy', 1400); say('I will point out the next step as you go.'); } } return mode(); };
  function apply() { buddy.hidden = mode() === 'off'; buddy.classList.toggle('quiet', mode() === 'quiet'); if (mode() !== 'on') closeBubble(); }

  // ---------- dress up: hats, glasses, neckwear and colors, chosen on hover ----------
  const HATS = {
    cap: '<svg viewBox="0 0 80 50"><path d="M10 42Q11 8 40 8Q68 8 69 42Z" fill="var(--hat,#E22622)"/><path d="M40 39L79 41Q75 48 40 46Z" fill="#000" opacity=".3"/><path d="M40 39L79 41Q75 48 40 46Z" fill="var(--hat,#E22622)" opacity=".75"/><circle cx="40" cy="9" r="3.5" fill="#fff" opacity=".8"/></svg>',
    top: '<svg viewBox="0 0 80 50"><rect x="21" y="1" width="38" height="38" rx="3" fill="#18181E"/><rect x="21" y="28" width="38" height="6" fill="var(--hat,#E22622)"/><rect x="8" y="37" width="64" height="8" rx="4" fill="#18181E"/><rect x="25" y="4" width="5" height="22" rx="2" fill="#fff" opacity=".18"/></svg>',
    party: '<svg viewBox="0 0 80 50"><path d="M40 2L60 46H20Z" fill="var(--hat,#7B4DE0)"/><path d="M32 20L49 21M27 31L54 33M23 41L58 43" stroke="#FAC800" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="4" r="5" fill="#FAC800"/></svg>',
    beanie: '<svg viewBox="0 0 80 50"><path d="M13 44Q13 10 40 10Q67 10 67 44Z" fill="var(--hat,#2E8B57)"/><rect x="10" y="35" width="60" height="12" rx="5" fill="#000" opacity=".2"/><rect x="10" y="34" width="60" height="11" rx="5" fill="var(--hat,#2E8B57)"/><circle cx="40" cy="8" r="7" fill="#F4F1E8"/></svg>',
    crown: '<svg viewBox="0 0 80 50"><path d="M12 45L14 14L27 29L40 5L53 29L66 14L68 45Z" fill="#F7C400" stroke="#C99A00" stroke-width="2" stroke-linejoin="round"/><circle cx="40" cy="36" r="4" fill="#E22622"/><circle cx="25" cy="38" r="3" fill="#2656D9"/><circle cx="55" cy="38" r="3" fill="#2656D9"/></svg>',
    cowboy: '<svg viewBox="0 0 80 50"><path d="M22 36Q20 8 33 12Q40 16 47 12Q60 8 58 36Z" fill="#9A6B3C"/><path d="M2 36Q40 52 78 36Q72 46 40 47Q8 46 2 36Z" fill="#7E5530"/><rect x="22" y="30" width="36" height="5" fill="#3B2A1A"/></svg>',
    grad: '<svg viewBox="0 0 80 50"><path d="M24 30V42Q40 50 56 42V30Z" fill="#1E1E26"/><path d="M40 12L78 26L40 40L2 26Z" fill="#26262E"/><path d="M40 26L66 30V44" stroke="#FAC800" stroke-width="2.5" fill="none"/><circle cx="66" cy="45" r="3" fill="#FAC800"/></svg>',
    headphones: '<svg viewBox="0 0 140 96"><path d="M16 66Q16 6 70 6Q124 6 124 66" stroke="#1E1E26" stroke-width="9" fill="none" stroke-linecap="round"/><rect x="2" y="50" width="22" height="36" rx="10" fill="var(--hat,#1E1E26)"/><rect x="116" y="50" width="22" height="36" rx="10" fill="var(--hat,#1E1E26)"/></svg>'
  };
  const GLASSES = {
    round: '<svg viewBox="0 0 60 30"><circle cx="20" cy="14" r="10" fill="rgba(255,255,255,.18)" stroke="#121218" stroke-width="2.6"/><circle cx="40" cy="14" r="10" fill="rgba(255,255,255,.18)" stroke="#121218" stroke-width="2.6"/><path d="M30 13H30" stroke="#121218" stroke-width="2.6"/></svg>',
    shades: '<svg viewBox="0 0 60 30"><rect x="8" y="8" width="20" height="14" rx="6" fill="#121218"/><rect x="32" y="8" width="20" height="14" rx="6" fill="#121218"/><path d="M28 12H32M8 10L3 8M52 10L57 8" stroke="#121218" stroke-width="2.4"/><path d="M12 11L17 11" stroke="#fff" stroke-width="2" opacity=".5"/></svg>',
    stars: '<svg viewBox="0 0 60 30"><path d="M19 3L22 11L30 12L24 17L26 26L19 21L12 26L14 17L8 12L16 11Z" fill="rgba(255,90,160,.35)" stroke="#E83E8C" stroke-width="2"/><path d="M41 3L44 11L52 12L46 17L48 26L41 21L34 26L36 17L30 12L38 11Z" fill="rgba(250,200,0,.35)" stroke="#E0A800" stroke-width="2"/></svg>'
  };
  const NECK = {
    bowtie: '<svg viewBox="0 0 50 30"><path d="M25 15L6 4V26Z" fill="var(--neck,#E22622)"/><path d="M25 15L44 4V26Z" fill="var(--neck,#E22622)"/><rect x="20" y="10" width="10" height="10" rx="3" fill="#000" opacity=".25"/></svg>',
    tie: '<svg viewBox="0 0 50 60"><path d="M19 2H31L28 10L34 46L25 56L16 46L22 10Z" fill="var(--neck,#E22622)"/><path d="M19 2H31L28 10H22Z" fill="#000" opacity=".2"/></svg>',
    scarf: '<svg viewBox="0 0 50 60"><rect x="1" y="2" width="48" height="13" rx="6" fill="var(--neck,#2E8B57)"/><path d="M30 12L40 54H30L24 14Z" fill="var(--neck,#2E8B57)"/><path d="M6 6H44M33 30H38M35 40H39" stroke="#fff" stroke-width="2" opacity=".5"/></svg>'
  };
  const hatSlot = h('span', 'bd-hat'), eyeSlot = h('span', 'bd-glasses'), neckSlot = h('span', 'bd-neck');
  head.append(hatSlot); face.append(eyeSlot); body.querySelector('.bd-p').append(neckSlot);
  const outfit = () => Object.assign({ hat: 'none', glasses: 'none', neck: 'none', colors: 'app', hatColor: '#E22622' }, get('guide.look', {}));
  function wear(l) {
    const set = (slot, html, kind) => { slot.innerHTML = html || ''; slot.dataset.kind = kind; };
    set(hatSlot, HATS[l.hat], l.hat); set(eyeSlot, GLASSES[l.glasses], l.glasses); set(neckSlot, NECK[l.neck], l.neck);
    buddy.style.setProperty('--hat', l.hatColor); buddy.style.setProperty('--neck', l.hatColor);
    const P = l.colors !== 'app' && typeof LOGO_SCHEMES !== 'undefined' ? LOGO_SCHEMES.find((x) => x.id === l.colors) : null;
    ['--stem', '--ring', '--starc'].forEach((v, i) => { if (P) buddy.style.setProperty(v, [P.stem, P.ring, P.star][i]); else buddy.style.removeProperty(v); });
  }
  function dress(change) { const l = Object.assign(outfit(), change || {}); put('guide.look', l); wear(l); if (!still()) setMood('happy', 1200); }
  function wardrobe() {
    const l = outfit(), row = (label, key, opts) => h('div', 'bd-row', [Object.assign(h('span', 'bd-lab'), { textContent: label }),
      h('div', 'bd-opts', opts.map(([v, t]) => { const b = h('button', 'bd-opt'); b.type = 'button'; b.textContent = t; b.setAttribute('aria-pressed', String(l[key] === v));
        b.onclick = () => { dress({ [key]: v }); b.parentNode.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; return b; }))]);
    const sw = (c) => { const b = h('button', 'bd-sw'); b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', 'Accessory color ' + c); b.setAttribute('aria-pressed', String(l.hatColor === c)); b.onclick = () => { dress({ hatColor: c }); b.parentNode.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; return b; };
    const pals = typeof LOGO_SCHEMES !== 'undefined' ? LOGO_SCHEMES.slice(0, 20) : [];
    const palBtns = [['app', 'Match the app', null]].concat(pals.map((P) => [P.id, P.name, P])).map(([v, t, P]) => { const b = h('button', 'bd-pal'); b.type = 'button'; b.title = t; b.setAttribute('aria-label', 'Colors: ' + t); b.setAttribute('aria-pressed', String(l.colors === v));
      b.style.background = P ? 'linear-gradient(90deg,' + P.stem + ' 0 34%,' + P.ring + ' 34% 78%,' + P.star + ' 78%)' : 'conic-gradient(var(--lg-stem,#2656D9) 0 33%, var(--lg-ring,#E22622) 0 66%, var(--lg-star,#FAC800) 0)';
      b.onclick = () => { dress({ colors: v }); b.parentNode.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; return b; });
    const nameIn = h('input', 'bd-name'); nameIn.type = 'text'; nameIn.maxLength = 24; nameIn.value = nm(); nameIn.setAttribute('aria-label', 'Name');
    const rename = (v) => { v = String(v || '').trim().slice(0, 24) || 'Prio'; put('guide.name', v); nameIn.value = v; labelBody(); panel.querySelector('.bd-title').textContent = 'Dress ' + v; tools.querySelectorAll('.bd-tool').forEach((b, i) => { const t = ['Ask ' + v + ' (Ctrl+J)', 'Dress ' + v, 'Talk to ' + v][i]; b.title = t; b.setAttribute('aria-label', t); }); setMood('happy', 1200); };
    nameIn.addEventListener('change', () => rename(nameIn.value));
    openPanel('Dress ' + nm(), [
      h('div', 'bd-row', [Object.assign(h('span', 'bd-lab'), { textContent: 'Name' }), nameIn, h('div', 'bd-opts', NAMES.map((n) => Object.assign(h('button', 'bd-opt'), { type: 'button', textContent: n, onclick: () => rename(n) })))]),
      row('Hat', 'hat', [['none', 'None'], ['cap', 'Cap'], ['top', 'Top hat'], ['party', 'Party'], ['beanie', 'Beanie'], ['crown', 'Crown'], ['cowboy', 'Cowboy'], ['grad', 'Grad cap'], ['headphones', 'Headphones']]),
      row('Glasses', 'glasses', [['none', 'None'], ['round', 'Round'], ['shades', 'Shades'], ['stars', 'Stars']]),
      row('Neck', 'neck', [['none', 'None'], ['bowtie', 'Bow tie'], ['tie', 'Tie'], ['scarf', 'Scarf']]),
      h('div', 'bd-row', [Object.assign(h('span', 'bd-lab'), { textContent: 'Hat and tie color' }), h('div', 'bd-opts', ['#E22622', '#2656D9', '#FAC800', '#2E8B57', '#7B4DE0', '#FF7A1A', '#E83E8C', '#18181E', '#F4F1E8'].map(sw))]),
      h('div', 'bd-row', [Object.assign(h('span', 'bd-lab'), { textContent: 'My colors' }), h('div', 'bd-opts', palBtns)]),
      h('div', 'bd-foot', [Object.assign(h('button', 'bd-act ghost'), { type: 'button', textContent: 'Take it all off', onclick: () => { put('guide.look', {}); wear(outfit()); closePanel(); } })])
    ]);
  }

  // ---------- panels (Ask and Dress), shown from the tools that appear on hover ----------
  const panel = h('div', 'bd-panel'); panel.hidden = true; panel.setAttribute('role', 'dialog');
  buddy.insertBefore(panel, body);
  function openPanel(title, kids) {
    closeBubble(); panel.setAttribute('aria-label', title);
    const x = h('button', 'bd-hush'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Close'); x.onclick = closePanel;
    panel.replaceChildren(x, Object.assign(h('h3', 'bd-title'), { textContent: title }), ...kids); panel.hidden = false; buddy.classList.add('open');
    const f = panel.querySelector('textarea, button.bd-opt[aria-pressed="true"], button'); if (f) f.focus();
  }
  function closePanel() { if (panel.hidden) return; panel.hidden = true; buddy.classList.remove('open', 'hf'); hfLive = false; stopListening(); if (window.speechSynthesis) speechSynthesis.cancel(); body.focus(); }
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } });
  const tool = (label, icon, fn) => { const b = h('button', 'bd-tool'); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.innerHTML = icon; b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; };
  const ICON_ASK = '<svg viewBox="0 0 24 24"><path d="M4 5h16v10H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  const ICON_DRESS = '<svg viewBox="0 0 24 24"><path d="M12 6a2 2 0 1 1 2 2c-1 0-2 .6-2 1.6V10L3 17h18l-9-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_MIC = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ICON_REC = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.5" fill="currentColor"/><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  // The dress-up wardrobe from earlier versions stays in the code; it is no longer offered.
  void ICON_DRESS; void wardrobe;
  const tools = h('div', 'bd-tools', [tool('Ask ' + nm() + ' (Ctrl+J)', ICON_ASK, () => askPanel()), tool('Talk hands-free', ICON_MIC, () => askPanel(true)), tool('Record a voice memo', ICON_REC, () => askPanel(false, true))]);
  buddy.insertBefore(tools, body);

  // ---------- Ask Prio Connect: type or speak; it answers, searches, and does things in the app ----------
  const history = [];
  let listening = false;
  function stopListening() { if (listening) { listening = false; S.voiceStop && S.voiceStop(); } }
  async function context() {
    const [kits, clients] = await Promise.all([S.kits().catch(() => []), S.crmList().catch(() => [])]);
    const next = (p) => (p.tasks || []).filter((k) => !k.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))[0];
    return { today: new Date().toLocaleDateString('en-CA') + ' (' + new Date().toLocaleDateString('en-US', { weekday: 'long' }) + ')', page: page(), title: title(),
      kits: kits.map((g) => g.name + (g.latest && g.latest.city ? ' (' + g.latest.city + ')' : '')),
      clients: clients.map((p) => { const k = next(p); return p.name + ' [' + p.stage + (p.city ? ', ' + p.city : '') + (k ? ', next: ' + k.text + (k.due ? ' on ' + k.due : '') : '') + ']'; }),
      palettes: typeof LOGO_SCHEMES !== 'undefined' ? LOGO_SCHEMES.map((x) => x.name) : [],
      screen: ((document.getElementById('view') || {}).innerText || '').replace(/\s+\n/g, '\n').slice(0, 2500) };
  }
  const near = (list, name, key) => { const n = String(name || '').toLowerCase().trim(); return list.find((x) => String(x[key]).toLowerCase() === n) || list.find((x) => String(x[key]).toLowerCase().includes(n) || n.includes(String(x[key]).toLowerCase())); };
  const afterRoute = (fn) => setTimeout(fn, 900);
  const fillSearch = (sel, q) => afterRoute(() => { const i = document.querySelector(sel); if (i) { i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); i.focus(); } });
  // What each suggested action does. `now` ones run at once; the rest become buttons the user presses.
  const ACT = {
    go_to: { now: true, run: (a) => { location.hash = a.page || 'library'; } },
    open_client: { now: true, run: async (a) => { const p = near(await S.crmList(), a.prospect, 'name'); if (p) location.hash = 'crm/' + p.id; else say('I could not find ' + a.prospect + ' in Clients.'); } },
    open_kit: { now: true, run: async (a) => { const g = near(await S.kits(), a.name, 'name'); if (g) location.hash = 'kit/' + encodeURIComponent(g.latest.dir); else say('I could not find a kit for ' + a.name + '.'); } },
    search: { now: true, run: (a) => { if (a.where === 'clients') { location.hash = 'crm'; fillSearch('#view input[aria-label="Search clients"]', a.query); } else { location.hash = 'library'; fillSearch('#view input[aria-label="Search the library"]', a.query); } } },
    set_colors: { now: true, run: (a) => { if (/^roll|random|shuffle/i.test(a.palette || '')) { rollColors(); return; } const P = near(LOGO_SCHEMES, a.palette, 'name'); if (!P) return say('I do not know a palette called ' + a.palette + '.'); store.set('seed', 'logo:' + P.id); store.set('theme', 'shuffle'); setScheme(); } },
    dress_guide: { now: true, run: (a) => dress(Object.fromEntries(Object.entries(a).filter(([, v]) => v))) },
    build_kit: { label: (a) => 'Set up a kit for ' + a.name, run: (a) => { store.set('draft', { name: a.name, website: a.website || '', city: a.city || '', type: a.kind || 'auto' }); location.hash = 'new';
      setTimeout(() => { const b = byText('#view button', /Build the kit/);
        if (a.start && b) { b.click(); return; }
        if (a.start) { say('Add your research key in Settings first; then I can build it.', { point: '.rail nav a[data-tab="settings"]' }); return; }
        say('Check the details, then press Build the kit.', { point: b || '#view button.primary' }); }, 1300); } },
    rehearse: { now: true, run: async (a) => { const g = near(await S.kits(), a.name, 'name'); if (!g) return say('I could not find a kit for ' + a.name + '.'); location.hash = 'kit/' + encodeURIComponent(g.latest.dir); setTimeout(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })), 1400); } },
    start_tour: { now: true, run: () => setTimeout(() => window.guideTour(), 300) },
    add_note: { label: (a) => 'Add the note to ' + a.prospect, run: async (a) => { const p = near(await S.crmList(), a.prospect, 'name'); if (!p) return say('I could not find ' + a.prospect + ' in Clients. Add them first.');
      p.notes = p.notes || []; p.notes.push({ kind: 'note', text: a.text, at: new Date().toISOString() }); await S.crmSave(p); toast('Note added to ' + p.name + '.'); } },
    add_prospect: { label: (a) => 'Add ' + a.name + ' to Clients', run: async (a) => { const p = await S.crmSave({ name: a.name, city: a.city || '', website: a.website || '', stage: a.stage || 'lead', notes: a.note ? [{ kind: 'note', text: a.note, at: new Date().toISOString() }] : [] }); if (window.crmRefreshDue) window.crmRefreshDue(); toast(a.name + ' added to Clients.'); location.hash = 'crm/' + p.id; } },
    add_follow_up: { label: (a) => 'Add "' + a.text + '"' + (a.due ? ' for ' + a.due : ''), run: async (a) => { const p = near(await S.crmList(), a.prospect, 'name'); if (!p) return say('I could not find ' + a.prospect + ' in Clients. Add them first.');
      p.tasks.push({ text: a.text, due: /^\d{4}-\d{2}-\d{2}$/.test(a.due || '') ? a.due : '', done: false }); await S.crmSave(p); if (window.crmRefreshDue) window.crmRefreshDue(); toast('Follow-up added for ' + p.name + '.'); } },
    draft_email: { label: () => 'Open the email draft', run: (a) => S.mailDraft(a.subject || '', a.body || '') }
  };
  // ---------- talking: answers read aloud; hands-free keeps the conversation going with no keyboard at all ----------
  const handsFree = () => !!get('guide.handsfree', false);
  let hfLive = false;
  function talk(t) {
    return new Promise((done) => {
      if (!window.speechSynthesis || !t) return done();
      let over = false; const end = () => { if (!over) { over = true; done(); } };
      speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t).replace(/[*#_`]/g, '')); u.rate = 1.02;
      const v = speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang) && /natural|online|aria|jenny|guy|samantha/i.test(x.name)); if (v) u.voice = v;
      u.onend = end; u.onerror = end; speechSynthesis.speak(u); setTimeout(end, 1500 + String(t).length * 85);
    });
  }
  const speak = (t) => (get('guide.voice', false) || hfLive ? talk(t) : Promise.resolve());
  const STOP_WORDS = /^(stop|stop listening|that'?s all|that is all|thanks?|thank you|goodbye|bye|never ?mind|cancel)\b/i;
  const clean = (e) => String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

  function askPanel(voice, memo) {
    const log = h('div', 'bd-log'); log.setAttribute('aria-live', 'polite'); panelLog = log;
    const entry = (who, text, acts) => { const m = h('div', 'bd-msg ' + who, [Object.assign(h('p'), { textContent: text })]); if (acts && acts.length) m.append(h('div', 'bd-acts', acts)); log.append(m); log.scrollTop = log.scrollHeight; return m; };
    history.slice(-6).forEach((m) => entry(m.role === 'user' ? 'me' : 'it', m.text));
    if (!history.length && !voice && !memo) entry('it', 'Ask, or tell me what to do. "Build a deck for Joe\'s Pizza in Venice." "Who do I follow up with this week?" "Rehearse the Bridge deck." Click the mic to do it all by voice.');
    const q = h('textarea', 'bd-q'); q.rows = 2; q.placeholder = 'Ask or tell ' + nm() + ' what to do'; q.setAttribute('aria-label', 'Ask ' + nm());
    const mic = h('button', 'bd-mic'); mic.type = 'button'; mic.innerHTML = ICON_MIC; mic.setAttribute('aria-label', 'Talk hands-free'); mic.title = 'Talk hands-free: I listen, answer out loud and keep listening';
    const send = h('button', 'bd-act'); send.type = 'button'; send.textContent = 'Ask';
    const rec = h('button', 'bd-act ghost'); rec.type = 'button'; rec.textContent = 'Record a voice memo';
    const voiceBox = h('input'); voiceBox.type = 'checkbox'; voiceBox.checked = !!get('guide.voice', false); voiceBox.onchange = () => { put('guide.voice', voiceBox.checked); if (!voiceBox.checked && window.speechSynthesis) speechSynthesis.cancel(); };
    let quiet = 0;
    const go = async (said) => {
      const text = String(said == null ? q.value : said).trim(); if (!text) { q.focus(); return; }
      q.value = ''; entry('me', text); history.push({ role: 'user', text });
      if (hfLive && STOP_WORDS.test(text)) { endTalk('Okay. Click the mic when you need me.'); return; }
      const wait = entry('it wait', 'Thinking'); setMood('think'); send.disabled = true;
      let r; try { r = await S.guideAsk(text, Object.assign(await context(), { guide: nm(), handsFree: hfLive }), history.slice(0, -1)); } catch (e) { r = { reply: 'Something went wrong: ' + clean(e), actions: [] }; }
      send.disabled = false; wait.remove(); setMood(r.error ? 'worried' : 'happy', 1400);
      const btns = [];
      for (const a of r.actions || []) { const A = ACT[a.name]; if (!A) continue; const input = a.input || {};
        // Safe ones run at once; the rest wait for a click, unless the person already said yes out loud or in writing.
        if (A.now || input.confirmed === true || (a.name === 'build_kit' && input.start === true)) { try { await A.run(input); } catch (e) { /* the reply still shows */ } }
        else { const b = h('button', 'bd-act'); b.type = 'button'; b.textContent = A.label(input); b.onclick = async () => { b.disabled = true; try { await A.run(input); b.textContent = 'Done'; } catch (e) { b.disabled = false; toast(clean(e)); } }; btns.push(b); } }
      const reply = r.reply || (btns.length ? 'Here you go.' : 'Done.');
      entry('it', reply, btns); history.push({ role: 'assistant', text: reply });
      await speak(reply);
      if (hfLive && !panel.hidden) listenNext();
    };
    send.onclick = () => go();
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });

    // Hands-free: listen, answer out loud, listen again, until they say "stop" or go quiet twice.
    function endTalk(msg) { hfLive = false; stopListening(); mic.classList.remove('on'); buddy.classList.remove('hf'); if (msg) { entry('it', msg); talk(msg); } }
    async function listenNext() {
      if (!hfLive) return;
      listening = true; mic.classList.add('on'); setMood('listen'); q.placeholder = 'Listening. Speak now';
      let t = '';
      try { t = await S.voiceListen(false); }
      catch (e) { endTalk(); entry('it', clean(e)); return; }
      finally { listening = false; q.placeholder = 'Ask or tell ' + nm() + ' what to do'; if (buddy.dataset.mood === 'listen') setMood('idle'); }
      if (!hfLive) return;
      if (t) { quiet = 0; go(t); return; }
      if (++quiet >= 2) { endTalk('I will stop listening. Click the mic when you need me.'); return; }
      listenNext();
    }
    mic.onclick = async () => {
      if (hfLive) { endTalk(); return; }
      hfLive = true; quiet = 0; buddy.classList.add('hf');
      const hello = history.length ? 'I am listening.' : 'I am listening. Tell me who you are meeting, or what you need.';
      entry('it', hello); await talk(hello); listenNext();
    };

    // A voice memo: the audio is kept on this computer; on Windows it is transcribed and filed with the right client.
    let memoOn = null;
    rec.onclick = async () => {
      if (memoOn) { memoOn(); return; }
      let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { entry('it', 'I could not open the microphone. Allow PRIO to use it in your system privacy settings, then try again.'); return; }
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {}), parts = []; mr.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
      const stopped = new Promise((r) => { mr.onstop = r; });
      mr.start(1000); rec.textContent = 'Stop and save'; rec.classList.add('on'); setMood('listen'); const note = entry('it', 'Recording. Speak naturally; click Stop and save when you are done.');
      const words = S.voiceListen(true).catch(() => '');
      let stop; const finished = new Promise((r) => { stop = r; }); memoOn = stop;
      words.then(() => stop());
      await finished; memoOn = null; try { S.voiceStop(); } catch (e) { /* fine */ }
      if (mr.state !== 'inactive') mr.stop(); await stopped; stream.getTracks().forEach((t) => t.stop());
      rec.textContent = 'Record a voice memo'; rec.classList.remove('on'); setMood('idle'); note.remove();
      const text = String(await words || '').trim();
      try {
        const blob = new Blob(parts, { type: mime || 'audio/webm' });
        const saved = await S.memoSave(await blob.arrayBuffer(), text, blob.type);
        entry('it', 'Memo saved' + (saved && saved.name ? ' as ' + saved.name : '') + '.' + (text ? '' : ' I could not transcribe it on this computer, but the recording is kept.'));
        if (text) go('Voice memo: "' + text + '". File it where it belongs: a note or follow-up on the right client. Ask me if it is not clear who it is about.');
      } catch (e) { entry('it', 'The memo could not be saved: ' + clean(e)); }
    };

    openPanel(memo ? 'Voice memo' : 'Ask ' + nm(), [log, h('div', 'bd-ask', [q, mic, send]), h('div', 'bd-row2', [rec, h('label', 'bd-voice', [voiceBox, document.createTextNode(' Read answers aloud')])]),
      Object.assign(h('p', 'bd-fine'), { textContent: 'Uses your research key. Voice uses Windows speech recognition; memos are saved in Documents, PRIO, Voice memos.' })]);
    q.focus(); if (voice) mic.click(); if (memo) rec.click();
  }

  // ---------- when you go still, it walks over to the next useful thing and says why ----------
  let idleSince = Date.now(), roamedAt = 0, roamT0 = 0, gx = 0, gy = 0, touring = false;
  const stir = () => { idleSince = Date.now(); if (!touring && buddy.classList.contains('roam') && Date.now() - roamT0 > 2500) home(); };
  ['pointermove', 'keydown', 'wheel', 'pointerdown'].forEach((t) => addEventListener(t, stir, { passive: true, capture: true }));
  const byText = (sel, re) => [...document.querySelectorAll(sel)].find((n) => re.test(n.textContent.trim()) && n.offsetParent);
  function nextStep() {
    const pg = page(), v = (x) => document.querySelector(x);
    if (pg === 'library') return kitCount() ? { el: v('#view .kitcard'), text: 'Pick up where you left off: open a kit to review the deck, or press R inside it to rehearse.' } : { el: v('#nav-new'), text: 'Nothing here yet. Start with a prospect; a name and a website is all I need.' };
    if (pg === 'new') { const i = v('#view input'); return i && !i.value.trim() ? { el: i, text: 'Type the business name here, or click the mic on me and say it.' } : { el: byText('#view button', /Build the kit/), text: 'When the details look right, build the kit. It takes a few minutes; you can leave this page.' }; }
    if (pg === 'kit') return { el: byText('#view button', /^Rehearse/), text: 'Run it once before the meeting. The talk track and a clock sit beside each slide.' };
    if (pg === 'crm') return { el: v('#c-step') || v('#view h1'), text: 'Anyone without a next step and a date goes cold. Give each client one.' };
    const t = (TIPS[pg] || TIPS.library)()[0]; return t ? { el: t[1] && t[1].point ? v(t[1].point) : null, text: t[0] } : null;
  }
  function moveTo(el) {
    if (!el || still()) return false; const r = el.getBoundingClientRect(); if (!r.width) return false;
    const B = buddy.getBoundingClientRect(), hx = B.left - gx, hy = B.top - gy;
    let x = r.right + 14, y = r.top + r.height / 2 - B.height / 2; if (x + B.width > innerWidth - 8) x = r.left - B.width - 14;
    x = Math.max(8, Math.min(innerWidth - B.width - 8, x)); y = Math.max(8, Math.min(innerHeight - B.height - 8, y));
    gx = x - hx; gy = y - hy; buddy.style.setProperty('--gx', gx + 'px'); buddy.style.setProperty('--gy', gy + 'px');
    buddy.classList.add('roam'); buddy.classList.toggle('right', x > innerWidth - 440); buddy.classList.toggle('high', y < 240); roamT0 = Date.now(); return true;
  }
  function home() { gx = gy = 0; buddy.style.removeProperty('--gx'); buddy.style.removeProperty('--gy'); buddy.classList.remove('roam', 'right', 'high'); clearTimeout(hideT); hideT = setTimeout(closeBubble, 4000); }
  setInterval(() => {
    if (mode() !== 'on' || buddy.hidden || document.hidden || busy() || !panel.hidden || !bubble.hidden || touring || hfLive || document.querySelector('.present, .studio, .welcome')) return;
    if (Date.now() - idleSince < 20000 || Date.now() - roamedAt < 75000) return;
    const n = nextStep(); if (!n) return; roamedAt = Date.now();
    const moved = moveTo(n.el); setTimeout(() => say(n.text, { point: n.el || undefined, stay: true }), moved ? 1150 : 0);
  }, 3000);

  // ---------- the first time the app opens: a short tour ----------
  const STEPS = [
    ['#nav-new', 'This is PRIO. Every meeting starts here: name a prospect and I research them, then build the deck, the talk track and the leave-behind.'],
    ['.rail nav a[data-tab="library"]', 'Every kit lands in the Library, with its versions.'],
    ['.rail nav a[data-tab="crm"]', 'Clients is your pipeline. Every prospect gets a next step and a date.'],
    ['.rail nav a[data-tab="ads"]', 'Ads and Brand kits make campaigns and identities, for Prio Connect or for a client.'],
    ['.rail nav a[data-tab="company"]', 'My company holds what you sell and the proof behind it. Decks are written from it.'],
    ['.keybtn', 'Ctrl K finds anything. Ctrl J asks me.'],
    [null, 'You never have to type. Click the mic on me and say "Build a deck for Joe\'s Pizza in Venice." I ask for what I need, then build it. On Windows you can open PRIO by voice too: turn on Voice Access and say "Open PRIO".']
  ];
  const endTour = () => { touring = false; put('guide.toured', true); home(); };
  function tour(i) {
    touring = true; const [sel, text] = STEPS[i], last = i === STEPS.length - 1, el = sel && document.querySelector(sel);
    if (!(el && moveTo(el))) { gx = gy = 0; buddy.style.removeProperty('--gx'); buddy.style.removeProperty('--gy'); buddy.classList.remove('roam', 'right', 'high'); }
    setTimeout(() => say(text, { point: el || undefined, stay: true, actions: last
      ? [['Try talking', () => { endTour(); askPanel(true); }], ['Done', endTour]]
      : [['Next', () => tour(i + 1)], ['Skip the tour', endTour]] }), el ? 1100 : 400);
  }
  hush.onclick = () => { if (touring) endTour(); closeBubble(); };
  window.guideTour = () => { if (mode() === 'off') { put('guide', 'on'); apply(); } closePanel(); tour(0); };
  addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j' && mode() !== 'off') { e.preventDefault(); if (panel.hidden) askPanel(); else closePanel(); } });
  window.guideAsk = askPanel;
  wear(outfit());

  function start() {
    document.body.append(buddy); apply();
    if (!get('guide.v2', false)) { put('guide.look', {}); put('guide.v2', true); wear(outfit()); }
    const tourWhenReady = () => { if (get('guide.toured', false) || mode() === 'off') return; if (document.querySelector('.welcome, .present, #splash')) { setTimeout(tourWhenReady, 1000); return; } setTimeout(() => window.guideTour(), 900); };
    addEventListener('hashchange', () => setTimeout(arrived, 450));
    const sp = document.getElementById('splash');
    // At the end of the opening Prio Connect hops up out of the notebook page; after that it greets the first page.
    const enter = () => { buddy.classList.add('born'); setTimeout(arrived, 900); tourWhenReady(); };
    if (sp) { let on = false; const go = () => { if (!on) { on = true; enter(); } }; setTimeout(go, root.dataset.motion === 'calm' ? 300 : 4700); const t = setInterval(() => { if (!document.getElementById('splash')) { clearInterval(t); go(); } }, 120); } else enter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.buddy = { say, point, mood: setMood };
})();
