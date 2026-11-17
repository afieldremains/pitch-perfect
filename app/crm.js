// Vereza, Clients: the CRM. A pipeline board you drag prospects across, a list, the follow-ups due, and
// a page per prospect with its people, notes, next steps and kits. Records live on this computer (crm.js in the main
// process checks and saves them). Uses the window's own helpers from app.js: S, el, $, pages, view, store, toast, route.
'use strict';
(() => {
  const STAGES = [['lead', 'Lead'], ['researched', 'Researched'], ['meeting', 'Meeting set'], ['pitched', 'Pitched'], ['pilot', 'Pilot'], ['client', 'Client'], ['lost', 'Lost']];
  const LABEL = Object.fromEntries(STAGES), ORDER = STAGES.map((s) => s[0]);
  const ACTS = [['note', 'Note'], ['call', 'Call'], ['meeting', 'Meeting'], ['email', 'Email']];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => iso(new Date());
  const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const fmtDay = (s) => { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };
  const fmtWhen = (s) => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
  const money = (n) => (n ? '$' + Number(n).toLocaleString() : '');
  const nextTask = (p) => p.tasks.filter((k) => !k.done && k.due).sort((a, b) => a.due.localeCompare(b.due))[0] || p.tasks.find((k) => !k.done) || null;
  const lastTouch = (p) => p.notes.reduce((m, n) => (n.at > m ? n.at : m), '') || p.updated;
  const dueState = (due) => (!due ? '' : due < today() ? 'late' : due === today() ? 'today' : '');
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2, 10));
  const find = (q) => (p) => !q || [p.name, p.city, p.source, ...p.contacts.map((c) => c.name + ' ' + c.email)].join(' ').toLowerCase().includes(q.toLowerCase());
  const errText = (e) => String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

  async function save(p) {
    try { const out = await S.crmSave(p); refreshDue(); return out; } catch (e) { toast('Could not save: ' + errText(e)); throw e; }
  }

  // The rail shows how many follow-ups are due today or late.
  async function refreshDue() {
    const b = document.getElementById('crm-due'); if (!b) return;
    try { const all = await S.crmList(), n = all.reduce((a, p) => a + p.tasks.filter((k) => !k.done && k.due && k.due <= today()).length, 0); b.textContent = n ? String(n) : ''; b.classList.toggle('hot', n > 0); } catch (e) { /* the rail can wait */ }
  }
  window.crmRefreshDue = refreshDue;
  setTimeout(refreshDue, 1500);

  // A kit's place in Clients, for the kit page: { p } if a prospect holds it or shares its name.
  window.crmForKit = async (k) => {
    const all = await S.crmList(), lower = (s) => String(s || '').trim().toLowerCase();
    return all.find((p) => p.kits.includes(k.dir)) || all.find((p) => lower(p.name) === lower(k.name)) || null;
  };
  let addChain = Promise.resolve();
  window.crmAddKit = (k) => { const run = addChain.then(() => addKit(k)); addChain = run.catch(() => {}); return run; };
  const addKit = async (k) => {
    const all = await S.crmList(), lower = (s) => String(s || '').trim().toLowerCase();
    let p = all.find((x) => lower(x.name) === lower(k.name));
    if (p) { if (!p.kits.includes(k.dir)) p.kits.push(k.dir); if (ORDER.indexOf(p.stage) < 1) p.stage = 'researched'; }
    else p = { name: k.name, city: k.city || '', kind: /ministry|church/i.test(k.kind || '') ? 'ministry' : 'business', stage: 'researched', kits: [k.dir], notes: [{ id: uid(), kind: 'note', text: 'Kit built.', at: new Date(k.when || Date.now()).toISOString() }] };
    return save(p);
  };

  // ---------- the pipeline ----------
  // When the clients file can't be opened, say so and offer to try again, instead of an empty page.
  function failed(e) {
    view.append(el('div', { class: 'wrap crm' }, el('div', { class: 'note err', text: errText(e) }), el('button', { class: 'btn primary', type: 'button', onclick: () => route() }, 'Try again')));
  }
  async function home() {
    let all, kits; try { [all, kits] = await Promise.all([S.crmList(), S.kits().catch(() => [])]); } catch (e) { failed(e); return; }
    S.crmNotice().then((n) => { if (n) toast(n); }).catch(() => {});
    const linked = new Set(all.flatMap((p) => p.kits)), names = new Set(all.map((p) => p.name.trim().toLowerCase()));
    const loose = kits.filter((g) => !g.versions.some((v) => linked.has(v.dir)) && !names.has(String(g.name).trim().toLowerCase()));
    let mode = store.get('crm.view', 'board'), q = '';
    const open = all.filter((p) => !['client', 'lost'].includes(p.stage)), pipe = open.reduce((a, p) => a + (p.value || 0), 0);
    const due = all.reduce((a, p) => a + p.tasks.filter((k) => !k.done && k.due && k.due <= today()).length, 0);
    const wrap = el('div', { class: 'wrap crm' }); view.append(wrap);
    const body = el('div', { class: 'crm-body' });
    const search = el('input', { type: 'text', placeholder: 'Search people, places and notes', 'aria-label': 'Search clients' });
    search.addEventListener('input', () => { q = search.value.trim(); draw(); });
    const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'View' }, ...[['board', 'Board'], ['list', 'List'], ['due', 'Follow-ups']].map(([v, t]) =>
      el('button', { type: 'button', 'aria-pressed': String(v === mode), onclick: (e) => { mode = v; store.set('crm.view', v); seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw(); } }, t)));
    const once = (fn) => async (e) => { const b = e && e.currentTarget; if (b) { if (b.disabled) return; b.disabled = true; } try { await fn(); } catch (err) { toast(String(err.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); } finally { if (b && b.isConnected) b.disabled = false; } };
    const add = once(async () => { const p = await save({ name: 'New prospect', stage: 'lead' }); location.hash = 'crm/' + p.id + '/new'; });
    const fromLibrary = once(async () => {
      let n = 0, bad = 0;
      for (const g of loose) { try { for (const v of g.versions.slice().reverse()) await window.crmAddKit(Object.assign({}, v, { name: g.name })); n++; } catch (e) { bad++; } }
      toast('Added ' + n + ' prospect' + (n === 1 ? '' : 's') + ' from your Library.' + (bad ? ' ' + bad + ' could not be added; try those again.' : '')); route();
    });
    const exp = once(async () => { const r = await S.crmExport(); if (r && r.error) toast(r.error); else if (r && r.path) toast('Saved ' + r.path.split(/[\\/]/).pop() + ' to your computer.'); });
    wrap.append(
      el('div', { class: 'head' }, el('div', {},
        el('div', { class: 'eyebrow', text: all.length ? all.length + ' prospect' + (all.length === 1 ? '' : 's') + (pipe ? ', ' + money(pipe) + ' a month in open deals' : '') : 'Your pipeline' }),
        el('h1', { text: 'Clients' }),
        due ? el('p', { class: 'crm-due-line' }, el('b', { text: due + ' follow-up' + (due === 1 ? '' : 's') }), ' due today or late.') : null),
        el('div', { class: 'actions' },
          loose.length ? el('button', { class: 'btn ghost', type: 'button', onclick: fromLibrary, title: loose.map((g) => g.name).join(', ') }, 'Add ' + loose.length + ' from the Library') : null,
          all.length ? el('button', { class: 'btn ghost', type: 'button', onclick: exp }, 'Export to a spreadsheet') : null,
          el('button', { class: 'btn primary', type: 'button', onclick: add }, 'Add a prospect'))),
      el('div', { class: 'crm-bar' }, seg, search), body);
    if (!all.length) {
      body.append(el('div', { class: 'empty crm-empty' }, el('h2', { text: 'Every client starts as a name in this notebook.' }),
        el('p', { class: 'muted', text: loose.length ? 'You have ' + loose.length + ' kit' + (loose.length === 1 ? '' : 's') + ' in your Library. Bring them in as prospects, or add someone new.' : 'Add the people you are meeting, then drag them across the board as the work moves.' }),
        el('div', { class: 'actions' }, loose.length ? el('button', { class: 'btn primary', type: 'button', onclick: fromLibrary }, 'Add ' + loose.length + ' from the Library') : null, el('button', { class: loose.length ? 'btn ghost' : 'btn primary', type: 'button', onclick: add }, 'Add a prospect'))));
      return;
    }
    const draw = () => { body.replaceChildren(mode === 'list' ? list(all.filter(find(q))) : mode === 'due' ? dueList(all.filter(find(q))) : board(all.filter(find(q)))); };
    draw();
  }

  // A prospect as an index card on the board.
  function card(p) {
    const k = nextTask(p), st = k && dueState(k.due), c = p.contacts[0];
    const a = el('a', { class: 'crm-card', href: '#crm/' + p.id, draggable: 'true', 'data-id': p.id },
      el('span', { class: 'sr-only', text: LABEL[p.stage] + '. ' }),
      el('b', { text: p.name }),
      p.city || c ? el('span', { class: 'muted small', text: [c && c.name, p.city].filter(Boolean).join(', ') }) : null,
      el('div', { class: 'crm-card-foot' },
        p.value ? el('span', { class: 'chip', text: money(p.value) + '/mo' }) : null,
        p.kits.length ? el('span', { class: 'chip kit', title: 'Has a kit', text: 'Kit' }) : null,
        k ? el('span', { class: 'crm-next ' + (st || ''), text: (k.due ? (st === 'late' ? 'Late: ' : st === 'today' ? 'Today: ' : fmtDay(k.due) + ': ') : 'Next: ') + k.text }) : null),
      el('span', { class: 'sr-only', text: ' Alt and the arrow keys move it.' }));
    a.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; a.classList.add('dragging'); });
    a.addEventListener('dragend', () => a.classList.remove('dragging'));
    a.addEventListener('keydown', async (e) => {
      if (!e.altKey || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault(); const open = ORDER.filter((x) => x !== 'lost'), i = open.indexOf(p.stage) + (e.key === 'ArrowRight' ? 1 : -1); if (i < 0 || i >= open.length) return;
      p.stage = open[i]; p.notes.push({ id: uid(), kind: 'note', text: 'Moved to ' + LABEL[p.stage] + '.', at: new Date().toISOString() }); await save(p); toast(p.name + ' moved to ' + LABEL[p.stage] + '.'); await route(); const n = document.querySelector('.crm-card[data-id="' + p.id + '"]'); if (n) n.focus();
    });
    return a;
  }
  function board(all) {
    const b = el('div', { class: 'crm-board' });
    STAGES.forEach(([s, label]) => {
      const here = all.filter((p) => p.stage === s), sum = here.reduce((a, p) => a + (p.value || 0), 0);
      const col = el('section', { class: 'crm-col st-' + s, 'aria-label': label },
        el('header', {}, el('b', { text: label }), el('span', { class: 'muted small', text: here.length + (sum ? ', ' + money(sum) : '') })),
        el('div', { class: 'crm-cards' }, here.length ? here.map(card) : el('p', { class: 'muted small crm-none', text: s === 'lead' ? 'New names land here.' : 'Drag a card here.' })));
      col.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('over'); });
      col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
      col.addEventListener('drop', async (e) => {
        e.preventDefault(); col.classList.remove('over');
        const p = all.find((x) => x.id === e.dataTransfer.getData('text/plain')); if (!p || p.stage === s) return;
        p.stage = s; if (s === 'lost' && !p.lostReason) p.lostReason = '';
        p.notes.push({ id: uid(), kind: 'note', text: 'Moved to ' + label + '.', at: new Date().toISOString() });
        await save(p); toast(p.name + ' moved to ' + label + '.'); route();
      });
      b.append(col);
    });
    return b;
  }
  function list(all) {
    let key = store.get('crm.sort', 'touch'), dir = store.get('crm.dir', -1);
    const cols = [['name', 'Name', (p) => p.name.toLowerCase()], ['stage', 'Stage', (p) => ORDER.indexOf(p.stage)], ['city', 'City', (p) => p.city.toLowerCase()],
      ['value', 'Value', (p) => p.value || 0], ['next', 'Next follow-up', (p) => { const k = nextTask(p); return k && k.due ? k.due : '9999'; }], ['touch', 'Last touch', lastTouch]];
    const box = el('div', { class: 'crm-tablewrap' });
    const draw = () => {
      const by = cols.find((c) => c[0] === key) || cols[5], rows = all.slice().sort((a, b) => { const x = by[2](a), y = by[2](b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
      box.replaceChildren(el('table', { class: 'crm-table' },
        el('thead', {}, el('tr', {}, ...cols.map(([k2, label]) => el('th', { scope: 'col', 'aria-sort': k2 === key ? (dir > 0 ? 'ascending' : 'descending') : null },
          el('button', { type: 'button', onclick: () => { if (key === k2) dir = -dir; else { key = k2; dir = k2 === 'touch' || k2 === 'value' ? -1 : 1; } store.set('crm.sort', key); store.set('crm.dir', dir); draw(); } }, label, k2 === key ? (dir > 0 ? ' ↑' : ' ↓') : ''))))),
        el('tbody', {}, ...rows.map((p) => { const k = nextTask(p), st = k && dueState(k.due);
          return el('tr', {}, el('td', {}, el('a', { href: '#crm/' + p.id, text: p.name })), el('td', {}, el('span', { class: 'crm-stage st-' + p.stage, text: LABEL[p.stage] })), el('td', { text: p.city }),
            el('td', { class: 'num', text: p.value ? money(p.value) + '/mo' : '' }), el('td', { class: st || '', text: k ? (k.due ? fmtDay(k.due) + ', ' : '') + k.text : '' }), el('td', { class: 'muted', text: fmtDay(lastTouch(p).slice(0, 10)) })); }))));
    };
    draw(); return box;
  }
  function dueList(all) {
    const items = all.flatMap((p) => p.tasks.filter((k) => !k.done).map((k) => ({ p, k })));
    const t = today(), week = plusDays(7);
    const groups = [['Late', (x) => x.k.due && x.k.due < t], ['Today', (x) => x.k.due === t], ['This week', (x) => x.k.due > t && x.k.due <= week], ['Later', (x) => x.k.due > week], ['No date', (x) => !x.k.due]];
    if (!items.length) return el('div', { class: 'empty crm-empty' }, el('h2', { text: 'Nothing to follow up.' }), el('p', { class: 'muted', text: 'Add a next step on a prospect\'s page and it shows up here on its day.' }));
    return el('div', { class: 'crm-due' }, ...groups.map(([label, test]) => { const here = items.filter(test).sort((a, b) => (a.k.due || '').localeCompare(b.k.due || ''));
      return here.length ? el('section', { class: 'card crm-due-group' + (label === 'Late' ? ' late' : '') }, el('h2', { text: label + ' (' + here.length + ')' }),
        el('ul', { class: 'crm-tasks' }, ...here.map(({ p, k }) => taskRow(p, k, () => route(), true)))) : null; }));
  }
  // One next step, with its tick box. `who` shows whose it is (on the follow-ups list).
  function taskRow(p, k, after, who, keep) {
    const st = dueState(k.done ? '' : k.due), box = el('input', { type: 'checkbox', 'aria-label': 'Done: ' + k.text });
    box.checked = k.done;
    box.addEventListener('change', async () => { k.done = box.checked; k.doneAt = k.done ? new Date().toISOString() : ''; if (k.done) p.notes.push({ id: uid(), kind: 'note', text: 'Done: ' + k.text, at: new Date().toISOString() }); try { await (keep || save)(p); } catch (e) { return; } if (k.done) toast('Marked done.'); after(); });
    return el('li', { class: k.done ? 'done' : '' }, box,
      el('div', {}, el('span', { text: k.text }), who ? el('a', { class: 'muted small', href: '#crm/' + p.id, text: ' ' + p.name }) : null),
      k.due ? el('span', { class: 'crm-when ' + st, text: st === 'late' ? 'Late, ' + fmtDay(k.due) : st === 'today' ? 'Today' : fmtDay(k.due) }) : null);
  }

  // ---------- one prospect ----------
  async function page(pid, fresh) {
    let all, kits; try { [all, kits] = await Promise.all([S.crmList(), S.kits().catch(() => [])]); } catch (e) { failed(e); return; }
    let p = all.find((x) => x.id === pid);
    const wrap = el('div', { class: 'wrap crm crm-page' }); view.append(wrap);
    if (!p) { wrap.append(el('div', { class: 'note err', text: 'That prospect is not in your Clients any more.' }), el('a', { class: 'btn ghost', href: '#crm' }, 'Back to Clients')); return; }
    if (typeof pageName === 'function') pageName(p.name);
    const status = el('span', { class: 'crm-saved muted small', 'aria-live': 'polite' });
    // `p` is the one live copy of this prospect for the whole page: every change edits it and saves it whole, in order,
    // so a later save can never carry an older version of a field. Once deleted, nothing on the page saves again.
    let gone = false, queue = Promise.resolve();
    const onPage = () => location.hash.replace(/^#/, '').split('/').slice(0, 2).join('/') === 'crm/' + p.id;
    const commit = () => { if (gone) return Promise.resolve(); const run = queue.then(async () => {
      try { const s = await save(p); p.updated = s.updated; p.created = s.created; p.value = s.value; } catch (e) { status.textContent = ''; throw e; }
      if (!onPage()) return;
      status.textContent = 'Saved'; clearTimeout(commit.t); commit.t = setTimeout(() => { status.textContent = ''; }, 1600); if (typeof pageName === 'function') pageName(p.name); });
      queue = run.catch(() => {}); return run; };
    const redraw = (focus) => { const sel = focus || (document.activeElement && document.activeElement.id ? '#' + document.activeElement.id : null); wrap.replaceChildren(); draw(); const f = sel && wrap.querySelector(sel); if (f) f.focus(); };
    const input = (key, label, o = {}) => { const i = el('input', { type: o.type || 'text', id: 'c-' + key, placeholder: o.ph || '', autocomplete: 'off', inputmode: o.mode || null, spellcheck: o.url ? 'false' : null });
      i.value = key === 'value' ? (p.value || '') : p[key] || ''; i.addEventListener('change', () => { p[key] = i.value; commit(); });
      return el('div', { class: 'field' }, el('label', { for: 'c-' + key, text: label }), i); };
    function draw() {
      const name = el('input', { class: 'crm-name', type: 'text', value: p.name, 'aria-label': 'Prospect name', autocomplete: 'off' });
      name.addEventListener('change', () => { p.name = name.value.trim() || 'Untitled prospect'; commit(); });
      // The stages as a path: click one to move there.
      const path = el('ol', { class: 'crm-path', 'aria-label': 'Stage' }, ...STAGES.filter(([s]) => s !== 'lost').map(([s, label], i) => {
        const here = p.stage === s, past = ORDER.indexOf(p.stage) > i && p.stage !== 'lost';
        return el('li', { class: (here ? 'on ' : '') + (past ? 'past' : '') }, el('button', { type: 'button', 'aria-current': here ? 'step' : null, onclick: async () => { if (p.stage === s) return; p.stage = s; p.notes.push({ id: uid(), kind: 'note', text: 'Moved to ' + label + '.', at: new Date().toISOString() }); await commit(); redraw(); } }, label));
      }));
      const lostBtn = el('button', { class: 'btn ghost sm', type: 'button', onclick: () => {
        if (p.stage === 'lost') { p.stage = 'lead'; p.lostReason = ''; commit().then(redraw); return; }
        const why = el('input', { type: 'text', placeholder: 'Why? (optional)', 'aria-label': 'Why it was lost' });
        lostBtn.replaceWith(el('span', { class: 'crm-lost-ask' }, why, el('button', { class: 'btn dark sm', type: 'button', onclick: async () => { p.stage = 'lost'; p.lostReason = why.value.trim(); p.notes.push({ id: uid(), kind: 'note', text: 'Marked lost' + (p.lostReason ? ': ' + p.lostReason : '.'), at: new Date().toISOString() }); await commit(); redraw(); } }, 'Mark lost')));
        why.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); why.nextSibling.click(); } });
        why.focus(); } }, p.stage === 'lost' ? 'Reopen' : 'Mark as lost');
      const kindSeg = el('div', { class: 'seg', role: 'group', 'aria-labelledby': 'c-kind' }, ...[['business', 'Business'], ['ministry', 'Church or ministry']].map(([v, t]) =>
        el('button', { type: 'button', 'aria-pressed': String(p.kind === v), onclick: async () => { p.kind = v; await commit(); redraw(); } }, t)));
      wrap.append(
        el('a', { class: 'crm-back', href: '#crm' }, '← All clients'),
        el('div', { class: 'head crm-head' }, el('div', { style: 'min-width:0;flex:1' },
          el('div', { class: 'eyebrow', text: [LABEL[p.stage], p.city, 'Added ' + fmtDay(p.created.slice(0, 10))].filter(Boolean).join(', ') }), name,
          p.stage === 'lost' ? el('p', { class: 'note', text: 'Lost' + (p.lostReason ? ': ' + p.lostReason : '') + '. Reopen it any time.' }) : null),
          el('div', { class: 'actions' }, status, lostBtn)),
        p.stage === 'lost' ? null : path,
        el('div', { class: 'crm-grid' },
          el('div', { class: 'crm-col-l' }, details(), people()),
          el('div', { class: 'crm-col-r' }, steps(), kitsCard())),
        notes(), danger());
      if (fresh) { name.focus(); name.select(); fresh = false; }
      function details() {
        return el('section', { class: 'card' }, el('h2', { text: 'Details' }),
          el('div', { class: 'grid2' }, input('city', 'City and state', { ph: 'Venice, FL' }), input('value', 'Monthly value ($)', { ph: '2500', mode: 'numeric' })),
          el('div', { class: 'grid2' }, input('website', 'Website', { ph: 'theirsite.com', url: true }), input('source', 'Where they came from', { ph: 'Referral, event, cold call' })),
          el('div', { class: 'field' }, el('span', { class: 'label', id: 'c-kind', text: 'Kind' }), kindSeg),
          p.website ? el('button', { class: 'btn ghost sm', type: 'button', onclick: () => S.openLink(/^https?:\/\//i.test(p.website) ? p.website.replace(/^http:/i, 'https:') : 'https://' + p.website) }, 'Open their website') : null);
      }
      function people() {
        const box = el('ul', { class: 'crm-people' }, ...p.contacts.map((c) => el('li', {},
          el('div', {}, el('b', { text: c.name || c.email }), c.role ? el('span', { class: 'muted small', text: ' ' + c.role }) : null,
            el('div', { class: 'small' }, c.email ? el('button', { class: 'linkish', type: 'button', onclick: () => S.crmContact('email', c.email) }, c.email) : null, c.email && c.phone ? '  ' : '', c.phone ? el('button', { class: 'linkish', type: 'button', onclick: () => S.crmContact('phone', c.phone) }, c.phone) : null)),
          el('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Remove ' + (c.name || c.email), onclick: async () => { p.contacts = p.contacts.filter((x) => x !== c); await commit(); redraw(); } }, 'Remove'))));
        const f = { name: el('input', { type: 'text', id: 'c-person', placeholder: 'Name', 'aria-label': 'Contact name' }), role: el('input', { type: 'text', placeholder: 'Role', 'aria-label': 'Role' }),
          email: el('input', { type: 'text', inputmode: 'email', placeholder: 'Email', 'aria-label': 'Email', spellcheck: 'false', autocomplete: 'off' }), phone: el('input', { type: 'text', inputmode: 'tel', placeholder: 'Phone', 'aria-label': 'Phone', autocomplete: 'off' }) };
        const addIt = async (e) => { e.preventDefault(); if (!f.name.value.trim() && !f.email.value.trim() && !f.phone.value.trim()) { f.name.focus(); return; }
          p.contacts.push({ id: uid(), name: f.name.value.trim(), role: f.role.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() }); await commit(); redraw('#c-person'); };
        return el('section', { class: 'card' }, el('h2', { text: 'People' }), p.contacts.length ? box : el('p', { class: 'muted small', text: 'Who you are talking to there.' }),
          el('form', { class: 'crm-addrow', onsubmit: addIt }, el('div', { class: 'grid2' }, f.name, f.role), el('div', { class: 'grid2' }, f.email, f.phone), el('button', { class: 'btn ghost sm', type: 'submit' }, 'Add person')));
      }
      function steps() {
        const open = p.tasks.filter((k) => !k.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')), done = p.tasks.filter((k) => k.done);
        const text = el('input', { type: 'text', id: 'c-step', placeholder: 'Call back, send the proposal…', 'aria-label': 'Next step' }), due = el('input', { type: 'date', 'aria-label': 'Due date', value: plusDays(2) });
        const quick = el('div', { class: 'crm-quick' }, ...[['Tomorrow', 1], ['In a week', 7], ['In 2 weeks', 14]].map(([t, n]) => el('button', { class: 'chip', type: 'button', onclick: () => { due.value = plusDays(n); } }, t)));
        const addIt = async (e) => { e.preventDefault(); if (!text.value.trim()) { text.focus(); return; } p.tasks.push({ id: uid(), text: text.value.trim(), due: due.value, done: false }); await commit(); redraw('#c-step'); };
        return el('section', { class: 'card' }, el('h2', { text: 'Next steps' }),
          open.length ? el('ul', { class: 'crm-tasks' }, ...open.map((k) => taskRow(p, k, () => redraw('#c-step'), false, commit))) : el('p', { class: 'muted small', text: 'What happens next, and when.' }),
          el('form', { class: 'crm-addrow', onsubmit: addIt }, text, el('div', { class: 'crm-due-row' }, due, quick), el('button', { class: 'btn ghost sm', type: 'submit' }, 'Add step')),
          done.length ? el('details', { class: 'crm-done' }, el('summary', { text: done.length + ' done' }), el('ul', { class: 'crm-tasks' }, ...done.map((k) => taskRow(p, k, () => redraw('#c-step'), false, commit)))) : null);
      }
      function kitsCard() {
        const mine = kits.filter((g) => g.versions.some((v) => p.kits.includes(v.dir)));
        const others = kits.filter((g) => !mine.includes(g));
        const pick = el('select', { 'aria-label': 'Link a kit from the Library' }, el('option', { value: '', text: 'Link a kit from the Library…' }), ...others.map((g) => el('option', { value: g.latest.dir, text: g.name })));
        pick.addEventListener('change', async () => { if (!pick.value) return; p.kits.push(pick.value); await commit(); redraw(); });
        const build = () => { const d = store.get('draft', null); if (d && d.name && d.name !== p.name && !confirm('You have an unfinished kit for ' + d.name + '. Start one for ' + p.name + ' instead?')) return;
          store.set('draft', { name: p.name, website: p.website || '', city: p.city || '', type: p.kind }); location.hash = 'new'; };
        return el('section', { class: 'card' }, el('h2', { text: 'Kits' }),
          mine.length ? el('ul', { class: 'crm-kits' }, ...mine.map((g) => el('li', {}, el('a', { href: '#kit/' + encodeURIComponent(g.latest.dir), text: g.name }), el('span', { class: 'muted small', text: ' ' + g.versions.length + ' version' + (g.versions.length === 1 ? '' : 's') }),
            el('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Unlink ' + g.name, onclick: async () => { p.kits = p.kits.filter((d) => !g.versions.some((v) => v.dir === d)); await commit(); redraw(); } }, 'Unlink')))) : el('p', { class: 'muted small', text: 'No kit yet.' }),
          el('div', { class: 'actions' }, el('button', { class: 'btn primary sm', type: 'button', onclick: build }, mine.length ? 'Build a new version' : 'Build a kit for them'), others.length ? pick : null));
      }
      function notes() {
        let kind = 'note';
        const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'What happened' }, ...ACTS.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(v === kind), onclick: (e) => { kind = v; seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, t)));
        const text = el('textarea', { id: 'c-note', rows: 3, placeholder: 'What was said, what they asked, what you promised', 'aria-label': 'Note' });
        const addIt = async (e) => { e.preventDefault(); if (!text.value.trim()) { text.focus(); return; } p.notes.push({ id: uid(), kind, text: text.value.trim(), at: new Date().toISOString() }); await commit(); redraw('#c-note'); };
        text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addIt(e); });
        const items = p.notes.slice().sort((a, b) => b.at.localeCompare(a.at));
        return el('section', { class: 'card crm-notes' }, el('h2', { text: 'Notes and activity' }),
          el('form', { class: 'crm-addrow', onsubmit: addIt }, seg, text, el('div', { class: 'actions' }, el('button', { class: 'btn dark sm', type: 'submit' }, 'Add to the notebook'), el('span', { class: 'muted small', text: 'Ctrl+Enter adds it.' }))),
          items.length ? el('ol', { class: 'crm-timeline' }, ...items.map((n) => el('li', { class: 'k-' + n.kind },
            el('div', { class: 'crm-tl-head' }, el('b', { text: (ACTS.find((a) => a[0] === n.kind) || ACTS[0])[1] }), el('span', { class: 'muted small', text: fmtWhen(n.at) }),
              el('button', { class: 'linkish small', type: 'button', 'aria-label': 'Delete this note', onclick: async () => { p.notes = p.notes.filter((x) => x !== n); await commit(); redraw(); } }, 'Delete')),
            el('p', { text: n.text })))) : null);
      }
      function danger() {
        const b = el('button', { class: 'btn ghost sm', type: 'button', onclick: () => {
          b.replaceWith(el('span', { class: 'crm-lost-ask' }, el('span', { class: 'small', text: 'Delete ' + p.name + ' and everything noted about them? Their kits stay in the Library.' }),
            el('button', { class: 'btn dark sm', type: 'button', onclick: async () => { gone = true; await queue; try { await S.crmDelete(p.id); } catch (e) { gone = false; toast('Could not delete: ' + errText(e)); return; } refreshDue(); toast(p.name + ' deleted.'); location.hash = 'crm'; } }, 'Delete'),
            el('button', { class: 'btn ghost sm', type: 'button', onclick: redraw }, 'Keep'))); } }, 'Delete this prospect');
        return el('div', { class: 'crm-danger' }, b);
      }
    }
    draw();
  }

  pages.crm = async (rest) => { const [pid, flag] = String(rest || '').split('/'); return pid ? page(pid, flag === 'new') : home(); };
})();
