// Compare: a side-by-side for the customer at your desk, made while they wait. Say what they are choosing between and
// what matters to them; in seconds the deck appears with its rows and options, then fills in cell by cell as the
// research lands (about three to six minutes). Present it full screen, save it as a PDF, or file it with a client.
// Every value comes from the web with its sources; anything not found says "Not found".
// Uses app.js helpers: S, el, pages, view, toast, store, moving.
'use strict';
(() => {
  const errText = (e) => String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const printStyle = document.createElement('style');
  printStyle.textContent = '@media print{html.cmp-printing,html.cmp-printing body{height:auto;display:block}html.cmp-printing main{overflow:visible;height:auto}html.cmp-printing .cmp-deck{display:block}html.cmp-printing .cmp-slide{overflow:visible;break-inside:avoid}}';
  document.head.append(printStyle);
  const PRIORITIES = ['Price', 'Running costs', 'Reliability', 'Safety', 'Size and space', 'Features', 'Warranty', 'Reviews', 'Speed or performance', 'Availability'];
  const clock = (ms) => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // The comparison as a deck: a cover, one slide per group of rows, the verdicts, the summary and the sources.
  function slides(c) {
    const groups = []; c.rows.forEach((r, i) => { let g = groups.find((x) => x.name === r.group); if (!g) groups.push(g = { name: r.group, rows: [] }); g.rows.push(i); });
    return [{ kind: 'cover' }, ...groups.map((g) => ({ kind: 'group', g })), { kind: 'verdict' }, { kind: 'sources' }];
  }
  function table(c, rowIdx) {
    const head = el('tr', {}, el('th', { scope: 'col', class: 'cmp-k' }), ...c.items.map((it) => el('th', { scope: 'col' }, it.name)));
    const body = rowIdx.map((r) => { const row = c.rows[r], cell = c.cells && c.cells[r];
      return el('tr', {}, el('th', { scope: 'row', class: 'cmp-k' }, row.label), ...c.items.map((_, k) => {
        const v = cell ? cell.values[k] : '', best = cell && cell.best === k;
        return el('td', { class: (cell ? '' : 'cmp-wait') + (best ? ' cmp-best' : '') + (/^not found$/i.test(v) ? ' cmp-nf' : ''), 'data-r': r, 'data-k': k }, v || ' ', best ? el('span', { class: 'sr-only', text: ' (best)' }) : null);
      })); });
    return el('table', { class: 'cmp-table' }, el('thead', {}, head), el('tbody', {}, ...body));
  }
  function slideContent(c, s) {
    if (s.kind === 'cover') return el('div', { class: 'cmp-slide cover' }, el('p', { class: 'cmp-no', text: c.no ? 'PRIO ' + c.no : 'Comparison' }), el('h2', { text: c.title }),
      el('div', { class: 'cmp-items' }, c.items.map((it, i) => el('div', {}, el('b', { text: String(i + 1) }), el('span', { text: it.name })))), c.ask && c.ask.priorities.length ? el('p', { class: 'cmp-sub', text: 'What matters most: ' + c.ask.priorities.join(', ') }) : null);
    if (s.kind === 'group') return el('div', { class: 'cmp-slide' }, el('h3', { text: s.g.name }), table(c, s.g.rows));
    if (s.kind === 'verdict') return el('div', { class: 'cmp-slide' }, el('h3', { text: 'For what matters most' }),
      c.verdicts && c.verdicts.length ? el('ol', { class: 'cmp-verdicts' }, c.verdicts.map((v) => el('li', {}, el('span', { text: v.priority }), el('b', { text: v.pick }), el('p', { text: v.why })))) : el('p', { class: 'muted', text: 'The verdicts appear when the research is done.' }),
      c.summary ? el('p', { class: 'cmp-summary', text: c.summary }) : null);
    return el('div', { class: 'cmp-slide' }, el('h3', { text: 'Sources' }), c.sources && c.sources.length ? el('ol', { class: 'cmp-sources' }, c.sources.map((x) => el('li', {}, el('span', { text: x.title }), el('small', { text: x.url })))) : el('p', { class: 'muted', text: 'Sources appear when the research is done.' }),
      el('p', { class: 'muted small', text: 'Prices and figures as published on ' + new Date(c.at || Date.now()).toLocaleDateString() + '. Check with the seller before buying.' }));
  }
  function slideNode(c, s) {
    const slide = slideContent(c, s);
    const template = document.createElement('template');
    const provenance = window.PPE ? window.PPE.Provenance : window.PrioProvenance;
    template.innerHTML = provenance.html({ position: 'comparison' });
    slide.append(template.content.firstElementChild);
    return slide;
  }
  function present(c) {
    const list = slides(c); let i = 0;
    const stage = el('div', { class: 'cmp-stage' }), count = el('span', { class: 'cmp-count' });
    const box = el('div', { class: 'cmp-show', role: 'dialog', 'aria-label': 'Presenting ' + c.title, tabindex: '-1' }, stage,
      el('div', { class: 'cmp-nav' }, el('button', { class: 'btn ghost', type: 'button', onclick: () => go(-1) }, 'Back'), count, el('button', { class: 'btn primary', type: 'button', onclick: () => go(1) }, 'Next'), el('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Close')));
    const go = (d) => { i = Math.max(0, Math.min(list.length - 1, i + d)); stage.replaceChildren(slideNode(c, list[i])); count.textContent = (i + 1) + ' of ' + list.length; };
    const key = (e) => { if (e.key === 'Escape') close(); else if (e.target.closest('a,button,input,textarea')) return; else if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); } else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); } };
    const close = () => { removeEventListener('keydown', key, true); box.remove(); };
    addEventListener('keydown', key, true); document.body.append(box); go(0); box.focus();
    if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
  }

  function result(c, host) {
    const deck = el('div', { class: 'cmp-deck' }, ...slides(c).map((s) => slideNode(c, s)));
    const acts = el('div', { class: 'actions' },
      el('button', { class: 'btn primary', type: 'button', onclick: () => present(c), disabled: !c.cells }, 'Present'),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => { document.documentElement.classList.add('cmp-printing'); setTimeout(() => { print(); document.documentElement.classList.remove('cmp-printing'); }, 50); }, disabled: !c.cells }, 'Save as PDF'),
      el('button', { class: 'btn ghost', type: 'button', disabled: !c.cells, onclick: () => fileWithClient(c) }, 'Add to a client'));
    host.replaceChildren(acts, deck);
  }
  async function fileWithClient(c) {
    const all = await S.crmList(); const name = prompt('Which client is this for?', '');
    if (!name) return; const p = all.find((x) => x.name.toLowerCase() === name.toLowerCase().trim()) || all.find((x) => x.name.toLowerCase().includes(name.toLowerCase().trim()));
    if (!p) { toast('No client called ' + name + ' in Clients.'); return; }
    p.notes = p.notes || []; p.notes.push({ kind: 'note', text: 'Compared ' + c.items.map((x) => x.name).join(', ') + '. ' + (c.summary || ''), at: new Date().toISOString() });
    await S.crmSave(p); toast('Added to ' + p.name + '.');
  }

  // Making one: the plan first (seconds), drawn at once; then the research fills it in.
  let running = null;
  async function make(ask, host, status) {
    if (running) { toast('A comparison is already being made.'); return; }
    const t0 = Date.now(); running = true; const tick = setInterval(() => { status.querySelector('b').textContent = clock(Date.now() - t0); }, 1000);
    const say = (t) => { status.querySelector('span').textContent = t; };
    try {
      say('Setting up the comparison'); host.replaceChildren(el('div', { class: 'cmp-deck' }, el('div', { class: 'cmp-slide cover cmp-wait' }, el('h2', { text: 'Naming the options and choosing the rows' }))));
      const plan = await S.comparePlan(ask);
      const c = Object.assign({ ask, at: new Date().toISOString() }, plan); result(c, host);
      say('Researching ' + plan.items.length + ' options across ' + plan.rows.length + ' rows: makers\' pages, reviews and public data');
      const filled = await S.compareFill(ask, plan);
      Object.assign(c, filled);
      // Fill the cells in front of them, a row at a time, then redraw with the verdicts and sources.
      const cells = [...host.querySelectorAll('td[data-r]')];
      if (moving()) for (const td of cells) { const v = c.cells[+td.dataset.r].values[+td.dataset.k]; td.firstChild.textContent = v; td.classList.remove('cmp-wait'); td.classList.add('cmp-in'); await new Promise((r) => setTimeout(r, 18)); }
      const saved = await S.compareSave(c); c.no = saved.no; c.id = saved.id; result(c, host);
      say('Done in ' + clock(Date.now() - t0) + '. Present it, save it as a PDF, or add it to a client.');
    } catch (e) { say('Stopped: ' + errText(e)); toast(errText(e)); }
    finally { clearInterval(tick); running = null; }
  }

  pages.compare = async () => {
    const wrap = el('div', { class: 'wrap' }); view.append(wrap);
    if (!S.comparePlan) { wrap.append(el('div', { class: 'head' }, el('h1', { text: 'Compare' })), el('div', { class: 'note', text: 'Compare runs in the desktop app for now, where your research key lives.' })); return; }
    const d = Object.assign({ what: '', priorities: [], notes: '' }, store.get('cmp.draft', {}));
    const what = el('textarea', { id: 'cmp-what', rows: 3, placeholder: '2026 Toyota RAV4 Hybrid XLE, Honda CR-V Hybrid EX-L, Mazda CX-50 Hybrid\nor: Verizon, T-Mobile and AT&T unlimited plans for a family of four' });
    what.value = d.what;
    const pri = new Set(d.priorities);
    const chips = el('div', { class: 'togs', role: 'group', 'aria-label': 'What matters to them' }, PRIORITIES.map((p) => el('button', { type: 'button', class: 'tog', 'aria-pressed': String(pri.has(p)), onclick: (e) => { pri.has(p) ? pri.delete(p) : pri.add(p); e.currentTarget.setAttribute('aria-pressed', String(pri.has(p))); } }, p)));
    const notes = el('input', { id: 'cmp-notes', type: 'text', placeholder: 'They drive 60 miles a day; need room for two car seats; budget around $35,000' }); notes.value = d.notes;
    const status = el('p', { class: 'cmp-status', 'aria-live': 'polite' }, el('b', { text: '' }), ' ', el('span', { text: '' }));
    const host = el('div', { class: 'cmp-host' });
    const go = el('button', { class: 'btn primary', type: 'button', onclick: () => {
      const ask = { what: what.value.trim(), priorities: [...pri], notes: notes.value.trim(), today: new Date().toISOString().slice(0, 10) };
      if (!ask.what) { what.focus(); toast('Say what they are choosing between.'); return; }
      store.set('cmp.draft', { what: ask.what, priorities: ask.priorities, notes: ask.notes }); make(ask, host, status);
    } }, 'Make the comparison');
    const past = el('div', { class: 'cmp-past' });
    wrap.append(el('div', { class: 'head' }, el('div', {}, el('h1', { text: 'Compare' }), el('p', { class: 'muted', text: 'For the customer at your desk: anything they are choosing between, side by side, researched while they wait. About three to six minutes.' }))),
      el('section', { class: 'card' },
        el('label', { class: 'field' }, el('span', { class: 'label', text: 'What are they choosing between?' }), what),
        el('div', { class: 'field' }, el('span', { class: 'label', text: 'What matters to them?' }), chips),
        el('label', { class: 'field' }, el('span', { class: 'label', text: 'Anything else they said' }), notes),
        el('div', { class: 'bar' }, go, el('span', { class: 'muted small', text: 'You can also tell the guide: "Compare the RAV4, CR-V and CX-50 on price and mileage."' }))),
      status, host, past);
    const list = await S.compareList().catch(() => []);
    if (list.length) past.append(el('h2', { text: 'Made before' }), el('ul', { class: 'cmp-list' }, list.map((c) => el('li', {}, el('button', { class: 'linkish', type: 'button', onclick: () => { result(c, host); host.scrollIntoView({ behavior: 'smooth' }); } }, (c.no ? 'PRIO ' + c.no + '  ' : '') + c.title), el('span', { class: 'muted small', text: new Date(c.at).toLocaleDateString() })))));
    if (store.get('cmp.autostart', false)) { store.del('cmp.autostart'); go.click(); }
  };
})();
