// Prio Connect on the web (iPhone, iPad, Android, Safari, any browser). The desktop app's screens talk to the
// computer through window.studio; here the same calls are answered inside the browser: everything is kept on this
// device (IndexedDB), research goes straight to Anthropic with the user's own key, decks and documents are made by
// the bundled engine (engine.js), and voice uses the browser's own speech recognition.
'use strict';
(() => {
  const E = window.PPE, VERSION = '0.37.0-web';
  // ---------- storage: one small key-value store in IndexedDB ----------
  const db = new Promise((ok, bad) => { const r = indexedDB.open('pitch-perfect', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); });
  const tx = async (mode, fn) => { const d = await db; return new Promise((ok, bad) => { const t = d.transaction('kv', mode), s = t.objectStore('kv'), r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => bad(t.error); }); };
  const get = (k, d) => tx('readonly', (s) => s.get(k)).then((v) => (v === undefined ? d : v));
  const put = (k, v) => tx('readwrite', (s) => s.put(v, k));
  const del = (k) => tx('readwrite', (s) => s.delete(k));
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* the browser decides */ }

  // ---------- the research key, kept on this device ----------
  const KEY = 'pp.key';
  window.ppKey = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  // ---------- fonts for decks and documents, as data URIs ----------
  const fontsReady = Promise.all(['plus-jakarta-sans.woff2', 'outfit.woff2', 'space-grotesk.woff2', 'fraunces.woff2', 'dm-serif-display.woff2'].map(async (f) => {
    try { const b = await (await fetch('fonts/' + f)).blob(); window.ppFonts[f] = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).replace(/^data:[^;]*;/, 'data:font/woff2;')); r.readAsDataURL(b); }); } catch (e) { /* the deck falls back to system type */ }
  }));
  window.ppFonts = window.ppFonts || {};

  // ---------- events ----------
  const subs = {};
  const on = (ch) => (fn) => { (subs[ch] = subs[ch] || []).push(fn); return () => { subs[ch] = (subs[ch] || []).filter((f) => f !== fn); }; };
  const emit = (ch, ...a) => (subs[ch] || []).slice().forEach((f) => { try { f(...a); } catch (e) { console.error(e); } });

  // ---------- companies (the desktop rules, in the browser) ----------
  const companies = async () => { const j = await get('companies', null); const list = (j && j.companies || []).map(E.CO.clean); if (!list.some((c) => c.id === 'prime')) list.unshift(E.CO.clean(E.CO.PRIME)); return { active: j && list.some((c) => c.id === j.active) ? j.active : 'prime', companies: list }; };
  const saveCompanies = (d) => put('companies', d);
  const activeCompany = async () => { const d = await companies(); return d.companies.find((c) => c.id === d.active) || d.companies[0]; };

  // ---------- clients ----------
  const clients = async () => (await get('clients', [])).map((r) => Object.assign(E.CRM.clean(r, null, r.updated), { updated: r.updated || new Date().toISOString() }));
  let turn = Promise.resolve();
  const inTurn = (fn) => { const r = turn.then(fn); turn = r.catch(() => {}); return r; };

  // ---------- kits ----------
  const kitList = () => get('kits', []);
  const kitGroups = async () => (await kitList()).map((k) => ({ name: k.name, versions: [k], latest: k, dir: k.dir }));
  let job = null;
  async function makeKit(opts) {
    const Z = await activeCompany(), log = (line) => { job.lines.push(line); emit('log', { line }); };
    await fontsReady;
    const I = { name: opts.name, website: opts.website || '', city: opts.city || '', notes: opts.notes || '', people: opts.people || '', meeting: opts.meeting || '' };
    log('Researching ' + I.name + ' for ' + Z.name + '. This takes a few minutes; keep this page open.');
    const R = await E.U.research(Z, I, log, '');
    const B = Object.assign({ engine: 'universal' }, R, { seller: Z }); B.client = Object.assign({ name: I.name, website: I.website, city: I.city }, B.client || {}); delete B.client.logo; // never a logo the model wrote
    log('Building the deck…');
    const deck = await E.U.webDeck(B, {});
    const id = 'k' + Date.now().toString(36), A = B.assessment || {};
    const meta = { dir: id, stamp: new Date().toISOString(), name: B.client.name, city: B.client.city || '', website: B.client.website || '', kind: 'Business', seller: Z.name, fit: A.fit ? A.fit + '/10' : '', when: Date.now(), web: true,
      colors: [B.client.colors && B.client.colors.brand, Z.colors.brand].filter(Boolean), previews: [], files: [], summary: '' };
    await put('kit:' + id, { brief: B, deck: deck.html, leave: E.U.leaveHtml(B), cheat: E.U.cheatHtml(B), assess: E.U.assessHtml(B) });
    await put('kits', [meta, ...(await kitList())]);
    log('Done: ' + deck.slides + ' slides, a leave-behind, a cheat sheet and an assessment.');
    return meta;
  }

  // ---------- ads and brand kits ----------
  async function make(kind, brief, photo) {
    const Z = await activeCompany(), lines = [], log = (line) => { lines.push(line); emit('make', { kind, line }); };
    await fontsReady;
    const id = kind + Date.now().toString(36);
    let item;
    if (kind === 'ads') {
      log('Planning the campaign…');
      const P = await E.C.plan(Z, brief, log);
      const ads = (P.ads || []).slice(0, 12).map((a, i) => { const size = E.C.SIZES[a.size] ? a.size : 'square'; return { size, html: E.C.adHtml(Z, a, size, i, photo || '') }; });
      const board = E.C.boardHtml(Z, brief, P, []);
      item = { id, kind, title: brief.for === 'client' && brief.client ? brief.client : Z.name, by: Z.name, made: new Date().toISOString(), plan: P, ads, board, copy: E.C.copyText(P) };
    } else {
      const name = brief.name || Z.name;
      log('Working out the brand for ' + name + '…');
      const K = await E.K.plan(Z, brief, log), marks = E.K.wordmarks(name, K);
      const guide = E.K.guideHtml(name, K, marks).replace(/src="logo-(\d)\.svg"/g, (m, n) => 'src="data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(marks[n - 1].svg))) + '"');
      item = { id, kind, title: name, by: Z.name, made: new Date().toISOString(), kit: K, marks, guide };
    }
    await put('work:' + id, item);
    await put('works:' + kind, [{ id, title: item.title, by: item.by, made: item.made }, ...(await get('works:' + kind, []))]);
    log('Done.'); emit('make', { kind, done: true, dir: id });
    return { dir: id };
  }

  // ---------- voice: the browser's own speech recognition (Safari on iPhone and iPad, Chrome on Android) ----------
  let rec = null;
  function listen(long) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return Promise.reject(new Error('This browser cannot listen. On iPhone and iPad use Safari; on Android use Chrome. You can also use the microphone on your keyboard.'));
    return new Promise((ok, bad) => {
      rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = false; rec.continuous = !!long; let text = '';
      rec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += (text ? ' ' : '') + e.results[i][0].transcript; };
      rec.onerror = (e) => { rec = null; if (e.error === 'no-speech' || e.error === 'aborted') ok(text); else bad(new Error(e.error === 'not-allowed' ? 'The microphone is blocked. Allow it for this site in your browser settings.' : 'Voice did not work (' + e.error + ').')); };
      rec.onend = () => { rec = null; ok(text.trim()); };
      rec.start();
    });
  }

  const notHere = (what) => () => Promise.reject(new Error(what + ' is in the desktop app (Windows or Mac).'));
  const impl = {
    copyText: async (text) => { await navigator.clipboard.writeText(String(text)); return true; },
    web: true,
    settings: async () => ({ hasKey: !!window.ppKey(), kitsDir: 'This device', version: VERSION, encrypted: false, web: true }),
    setKey: async (key) => {
      key = String(key || '').trim();
      if (!/^sk-ant-/.test(key)) return { ok: false, error: 'That does not look like an Anthropic key (it starts with sk-ant-).' };
      try { const c = new E.Anthropic({ apiKey: key, maxRetries: 0, timeout: 20000 }); await c.models.list({ limit: 1 }); }
      catch (e) { return { ok: false, error: e && e.status === 401 ? 'Anthropic did not accept that key.' : 'Could not check the key (' + (e && e.message || e) + ').' }; }
      localStorage.setItem(KEY, key); return { ok: true };
    },
    setTheme: () => {}, appLog: () => Promise.resolve(''), openLink: (u) => { if (/^https:\/\//.test(u)) window.open(u, '_blank', 'noopener'); return Promise.resolve(true); },
    kits: kitGroups, library: kitGroups,
    start: (opts) => { if (job) return Promise.reject(new Error('A kit is already being built.')); if (!window.ppKey()) return Promise.reject(new Error('Add your research key in Settings first.'));
      job = { name: opts.name, lines: [], t0: Date.now() };
      makeKit(opts).then((m) => { job = null; emit('done', { ok: true, dir: m.dir }); }, (e) => { job = null; emit('log', { line: 'ERROR  ' + (e && e.message || e) }); emit('done', { ok: false, error: String(e && e.message || e) }); });
      return Promise.resolve({ out: 'web', name: opts.name }); },
    status: async () => (job ? { running: true, name: job.name, lines: job.lines, t0: job.t0 } : { running: false }),
    onLog: on('log'), onDone: on('done'), onSetup: on('setup'), onPreviews: on('previews'), onExport: on('export'), onDecks: on('decks'), onVideo: on('video'), onAds: on('ads'), onMake: on('make'),
    webKit: async (id) => get('kit:' + id, null),
    trashKit: async (id) => { await del('kit:' + id); await put('kits', (await kitList()).filter((k) => k.dir !== id)); return true; },
    crmList: () => clients(),
    crmNotice: async () => '',
    crmSave: (p) => inTurn(async () => { const all = await clients(), c = E.CRM.clean(p, (d) => d), i = all.findIndex((x) => x.id === c.id); if (i >= 0) { c.created = all[i].created || c.created; all[i] = c; } else all.unshift(c); await put('clients', all); return c; }),
    crmDelete: (pid) => inTurn(async () => { const all = await clients(); await put('clients', all.filter((x) => x.id !== pid)); return true; }),
    crmExport: async () => { const csv = E.CRM.csv({ prospects: await clients() }), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'Prio Connect clients ' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); return { path: a.download }; },
    crmContact: async (how, to) => { const v = String(to || '').trim(); if (how === 'email' && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v)) location.href = 'mailto:' + v; else if (how === 'phone') location.href = 'tel:' + v.replace(/[^\d+]/g, ''); return true; },
    companies, companyOptions: async () => ({ industries: E.CO.INDUSTRIES, units: E.CO.UNITS }),
    companySave: async (p, makeActive) => { const d = await companies(), c = E.CO.clean(p), i = d.companies.findIndex((x) => x.id === c.id); if (i >= 0) d.companies[i] = c; else d.companies.push(c); if (makeActive) d.active = c.id; await saveCompanies(d); return c; },
    companyDelete: async (id) => { if (id === 'prime') throw new Error('Prio Connect stays in the list.'); const d = await companies(); d.companies = d.companies.filter((c) => c.id !== id); if (d.active === id) d.active = 'prime'; await saveCompanies(d); return true; },
    companyActivate: async (id) => { const d = await companies(); d.active = id; await saveCompanies(d); return d.companies.find((c) => c.id === id); },
    companyLogo: () => new Promise((ok) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      i.onchange = () => { const f = i.files[0]; if (!f) return ok({ canceled: true }); if (f.size > 800 * 1024) return ok({ error: 'Use a logo under 800 KB.' }); const r = new FileReader(); r.onload = () => ok({ logo: String(r.result) }); r.readAsDataURL(f); }; i.click(); }),
    makeStart: (kind, brief, photo) => { if (!window.ppKey()) return Promise.reject(new Error('Add your research key in Settings first.')); return make(kind, brief, photo); },
    makeList: async (kind) => (await get('works:' + kind, [])).map((w) => Object.assign({ dir: w.id, rel: w.id, files: [], images: [], logos: [], web: true }, w)),
    makeOpen: notHere('Opening the folder'), workItem: (id) => get('work:' + id, null),
    brandApply: async (id) => { const W = await get('work:' + id, null), K = W && W.kit || {}, d = await companies(), act = d.companies.find((c) => c.id === d.active); const pick = (r) => ((K.palette || []).find((p) => p.role === r) || {}).hex;
      Object.assign(act, { colors: { brand: pick('primary') || act.colors.brand, accent: pick('accent') || act.colors.accent, dark: pick('dark') || act.colors.dark }, tagline: (K.taglines || [])[0] || act.tagline, voice: (K.voice && K.voice.tone) || act.voice }); await saveCompanies(d); return act; },
    guideAsk: async (q, ctx, history) => { if (!window.ppKey()) return { reply: 'I need your research key first. Add it in Settings, under Research key.', actions: [{ name: 'go_to', input: { page: 'settings' } }] };
      try { return await E.A.ask(window.ppKey(), q, ctx, history, E.Anthropic); } catch (e) { return { reply: 'I could not reach the research service just now. Check the connection and try again.', actions: [], error: true }; } },
    voiceListen: (long) => listen(long), voiceStop: async () => { if (rec) try { rec.stop(); } catch (e) { /* done */ } return true; },
    mailDraft: async (subject, body) => { location.href = 'mailto:?subject=' + encodeURIComponent(subject || '') + '&body=' + encodeURIComponent(body || ''); return true; },
    starterKits: async () => [], setupStatus: async () => ({}), checkPreviews: async () => ({ ok: false, text: 'Slide pictures come from the deck itself on the web.' }), previewsBusy: async () => false,
    pricing: async () => ({ media: [], custom: false })
  };
  const quiet = new Set(['spark', 'ring', 'tile', 'stem']);
  window.studio = new Proxy(impl, { get: (t, k) => (k in t ? t[k] : typeof k === 'string' && /^on[A-Z]/.test(k) ? () => () => {} : quiet.has(k) ? undefined : notHere('That')) });
  // Offline: the app's own files are cached, so it opens without a connection (research still needs one).
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
