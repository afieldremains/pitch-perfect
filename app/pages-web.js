// The web app's own versions of the pages that, on the desktop, work with files: the Library, a kit, a new prospect,
// the build in progress and Settings. Everything else (Clients, My company, Ads, Brand kits, the guide, the looks)
// is the desktop app's own code. Uses app.js helpers: S, el, pages, view, store, toast, route, plate, inks, soft.
'use strict';
(() => {
  if (!S.web) return;
  document.documentElement.classList.add('web');
  const errText = (e) => String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const when = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const blobUrl = (html) => URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const openDoc = (html) => { const w = window.open(blobUrl(html), '_blank'); if (!w) toast('Allow pop-ups for this site to open it.'); };
  window.welcome = async () => {};

  pages.library = async () => {
    const all = await S.kits(), set = await S.settings();
    const wrap = el('div', { class: 'wrap' }); view.append(wrap);
    wrap.append(el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: all.length ? all.length + ' kit' + (all.length === 1 ? '' : 's') + ' on this device' : 'Your kits' }), el('h1', { text: 'Library' })),
      el('div', { class: 'actions' }, el('a', { class: 'btn primary', href: '#new' }, 'New prospect'))));
    if (!set.hasKey) wrap.append(el('div', { class: 'note' }, 'First, add your research key in ', el('a', { href: '#settings' }, 'Settings'), '. It stays on this device.'));
    if (!all.length) { wrap.append(el('div', { class: 'empty' }, el('h2', { text: 'Your kits will live here.' }), el('p', { class: 'muted', text: 'Start with a prospect\'s name and website. You get a deck, a leave-behind, a cheat sheet and an assessment.' }), el('a', { class: 'btn primary', href: '#new' }, 'New prospect'))); return; }
    wrap.append(el('div', { class: 'wk-grid' }, all.map((g) => { const k = g.latest;
      return el('a', { class: 'card wk-card', href: '#kit/' + encodeURIComponent(k.dir), style: '--wc:' + (k.colors[0] || 'var(--accent)') }, el('b', { text: k.name }), el('span', { class: 'muted small', text: [k.city, when(k.when)].filter(Boolean).join(', ') }), el('span', { class: 'small', text: (k.seller ? 'By ' + k.seller : '') + (k.fit ? ', fit ' + k.fit : '') })); })));
  };

  pages.kit = async (id) => {
    const all = await S.kits(), g = all.find((x) => x.latest.dir === id), K = await S.webKit(id);
    const wrap = el('div', { class: 'wrap' }); view.append(wrap);
    if (!g || !K) { wrap.append(el('div', { class: 'note err', text: 'That kit is not on this device any more.' }), el('a', { class: 'btn ghost', href: '#library' }, 'Back to the Library')); return; }
    const k = g.latest, url = blobUrl(K.deck);
    const frame = el('iframe', { class: 'wk-deck', src: 'viewer.html#' + encodeURIComponent(id), title: 'The deck for ' + k.name, allow: 'fullscreen' });
    const present = () => { const f = frame; (f.requestFullscreen || f.webkitRequestFullscreen || (() => window.open('viewer.html#' + encodeURIComponent(id), '_blank'))).call(f); };
    wrap.append(el('a', { class: 'crm-back', href: '#library' }, 'All kits'),
      el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: [k.city, k.seller ? 'for ' + k.seller : ''].filter(Boolean).join(', ') }), el('h1', { text: k.name }))),
      el('div', { class: 'wk-stage' }, frame),
      el('p', { class: 'muted small', text: 'Tap the right side of the deck (or press the right arrow) to build each slide; tap the left side to go back.' }),
      el('div', { class: 'actions wrapseg' },
        el('button', { class: 'btn primary', type: 'button', onclick: present }, 'Present full screen'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => openDoc(K.leave) }, 'Leave-behind'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => openDoc(K.cheat) }, 'Cheat sheet'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => openDoc(K.assess) }, 'Assessment'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => { const a = document.createElement('a'); a.href = url; a.download = k.name + ' deck.html'; a.click(); } }, 'Download the deck'),
        el('button', { class: 'btn ghost', type: 'button', onclick: async (e) => { const b = e.currentTarget; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; return; } await S.trashKit(id); toast(k.name + ' deleted.'); location.hash = 'library'; } }, 'Delete')),
      el('p', { class: 'muted small', text: 'Documents open in a new tab: use Print, then Save as PDF (on iPhone: Share, then Print).' }));
    if (window.crmForKit) window.crmForKit({ name: k.name, dir: k.dir }).then((p) => { if (!p) wrap.querySelector('.actions').append(el('button', { class: 'btn ghost', type: 'button', onclick: async () => { const n = await window.crmAddKit({ name: k.name, dir: k.dir, city: k.city }); location.hash = 'crm/' + n.id; } }, 'Add to Clients')); });
  };

  pages.new = async () => {
    const co = window.activeCompany ? await window.activeCompany() : null, set = await S.settings(), d = store.get('draft', {}) || {};
    const wrap = el('div', { class: 'wrap narrow' }); view.append(wrap);
    const f = (id, label, ph, area) => { const i = el(area ? 'textarea' : 'input', Object.assign({ id: 'wn-' + id, placeholder: ph || '' }, area ? { rows: 3 } : { type: 'text', autocomplete: 'off' })); i.value = d[id] || ''; i.addEventListener('input', () => { d[id] = i.value; store.set('draft', d); }); return el('div', { class: 'field' }, el('label', { for: 'wn-' + id, text: label }), i); };
    const go = el('button', { class: 'btn primary', type: 'button', onclick: async () => {
      if (!String(d.name || '').trim()) { document.getElementById('wn-name').focus(); toast('Add the prospect\'s name first.'); return; }
      go.disabled = true; try { await S.start({ name: d.name.trim(), website: d.website, city: d.city, notes: d.notes, people: d.people, meeting: d.meeting }); store.del('draft'); location.hash = 'run'; } catch (e) { go.disabled = false; toast(errText(e)); } } }, 'Build the kit');
    wrap.append(el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: co ? 'Pitching as ' + co.name : '' }), el('h1', { text: 'New prospect' }))),
      set.hasKey ? null : el('div', { class: 'note' }, 'Add your research key in ', el('a', { href: '#settings' }, 'Settings'), ' first.'),
      el('section', { class: 'card' }, f('name', 'Who are we meeting?', 'Prospect name'), el('div', { class: 'grid2' }, f('website', 'Website', 'theirsite.com'), f('city', 'City and state', 'Venice, FL')),
        f('people', 'Who you are meeting', 'Name (role)'), f('meeting', 'Meeting date', 'November 12, 2026'), f('notes', 'Anything else', 'What you know, how you met them', true)),
      el('div', { class: 'actions' }, go, el('span', { class: 'muted small', text: 'Takes 3 to 6 minutes. Keep this page open while it works.' })));
  };

  pages.run = async () => {
    const st = await S.status(), wrap = el('div', { class: 'wrap narrow' }); view.append(wrap);
    const log = el('div', { class: 'make-log', 'aria-live': 'polite' }, ...(st.lines || []).map((l) => el('div', { text: l })));
    wrap.append(el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: st.running ? 'Working' : 'Nothing running' }), el('h1', { text: st.running ? st.name : 'Build' }))), log);
    if (!st.running) { wrap.append(el('a', { class: 'btn primary', href: '#new' }, 'New prospect')); return; }
    const offL = S.onLog(({ line }) => { log.append(el('div', { text: line })); log.scrollTop = log.scrollHeight; });
    const offD = S.onDone((r) => { offL(); offD(); if (r.ok) { if (typeof burst === 'function') burst(); toast('The kit is ready.'); location.hash = 'kit/' + encodeURIComponent(r.dir); } else toast('It stopped: ' + r.error); });
  };

  // Settings on the web: the key (kept on this device) and the whole Appearance card from the desktop app.
  const desktopSettings = pages.settings;
  pages.settings = async () => {
    await desktopSettings();
    view.querySelectorAll('section.card').forEach((c) => { const h = c.querySelector('h2'); const t = h ? h.textContent : ''; if (!/Appearance|Research key/.test(t)) c.remove(); });
    const keyCard = [...view.querySelectorAll('section.card')].find((c) => /Research key/.test(c.textContent));
    if (keyCard) keyCard.append(el('p', { class: 'muted small', text: 'On the web your key is kept in this browser on this device only, and sent only to Anthropic to run your research. Use a key with a spending limit, and do not add it on a shared computer.' }));
  };
})();
