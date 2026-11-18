// Prio Connect, Find targets: a short list of the kinds of business most worth calling, under Clients (#crm/targets).
// The ranking lives in targets.js (pure and tested). This page asks five questions, remembers the answers on this
// computer, rebuilds the list each time it opens and again when the day turns, and adds a prospect only when the person
// clicks Add to Clients. Uses the window's own helpers from app.js: S, el, store, toast, view, pages, routeOwner, leave.
'use strict';
(() => {
  const K = { answers: 'targets.answers', hidden: 'targets.hidden', last: 'targets.last' };
  const KINDS = [['business', 'Businesses', 'Local companies, shops and clinics'], ['ministry', 'Churches and ministries', 'Churches, Christian schools, camps and outreach groups'], ['both', 'Both', 'Show both kinds']];
  const GOALS = [['steady', 'Steady monthly clients', 'Clients who stay and keep paying each month'], ['quick', 'A quick yes', 'Owners who decide on their own and can say yes fast'], ['referrals', 'Referrals and word of mouth', 'Clients who send others your way']];
  const SIZES = [['small', 'Small', 'Owner-run, with a few people'], ['medium', 'Medium', 'A small team'], ['large', 'Large', 'Several locations or a big team']];
  const REACH = [['town', 'My town', 'Close to home'], ['metro', 'My area', 'Anywhere within a drive'], ['anywhere', 'Anywhere', 'Open to clients in any place']];
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const dayText = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2, 10));
  const fail = (e) => String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const lower = (s) => String(s || '').trim().toLowerCase();
  const list = (words) => (words.length < 2 ? words.join('') : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]);

  pages.targets = async () => {
    const owns = routeOwner(), T = window.PrioTargets;
    const wrap = el('div', { class: 'wrap tg' });
    if (!T) {
      view.append(wrap, el('div', { class: 'note err', text: 'Find targets did not load. Close PRIO and open it again.' }));
      return;
    }
    const savedAnswers = store.get(K.answers, null), first = !savedAnswers || typeof savedAnswers !== 'object';
    let a = T.clean(first ? {} : savedAnswers);
    if (first) {
      const co = window.activeCompany ? await window.activeCompany().catch(() => null) : null;
      if (!owns()) return;
      if (co) a = T.clean({ offers: T.offersFrom(co.offer), city: co.city });
    }
    let shown = !first, gen = 0, drawnDay = '', timer = 0;
    const hiddenIds = () => { const v = store.get(K.hidden, []); return (Array.isArray(v) ? v : []).filter((id) => T.SEGMENTS.some((s) => s.id === id)); };

    // ----- the five questions -----
    const choice = (type, name, value, label, hint, on) => {
      const input = el('input', { type, name, value }); input.checked = !!on;
      return el('label', { class: 'tg-choice' }, input, el('span', { class: 'tg-choice-text' }, el('span', { text: label }), hint ? el('span', { class: 'hint', text: hint }) : null));
    };
    const group = (title, hint, ...choices) => el('fieldset', { class: 'tg-q' }, el('legend', { text: title }), hint ? el('p', { class: 'muted small', text: hint }) : null, el('div', { class: 'tg-choices' }, ...choices));
    const city = el('input', { type: 'text', id: 'tg-city', autocomplete: 'address-level2', placeholder: 'For example, Tampa, FL', maxlength: '80' }); city.value = a.city;
    const msg = el('div', { class: 'tg-msg', role: 'status' });
    const say = (text, bad) => { msg.textContent = text || ''; msg.className = 'tg-msg' + (text ? (bad ? ' note err' : ' note') : ''); };
    const radios = (name, rows, current) => rows.map(([v, l, h]) => choice('radio', name, v, l, h, v === current));
    const form = el('form', { class: 'tg-form', novalidate: 'novalidate' },
      group('1. What do you sell?', 'Pick everything that applies.', ...T.OFFERS.map((o) => choice('checkbox', 'offers', o.id, o.label, '', a.offers.includes(o.id)))),
      group('2. Who do you want to work with?', '', ...radios('kind', KINDS, a.kind)),
      group('3. What matters most right now?', '', ...radios('goal', GOALS, a.goal)),
      group('4. How big should the client be?', 'Bigger clients usually spend more each month and take longer to decide.', ...radios('size', SIZES, a.size)),
      el('fieldset', { class: 'tg-q' }, el('legend', { text: '5. Where do you work?' }),
        el('div', { class: 'field' }, el('label', { for: 'tg-city', text: 'Your city or area' }), city),
        el('div', { class: 'tg-choices' }, ...radios('reach', REACH, a.reach))),
      msg,
      el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'submit', text: first ? 'Show my targets' : 'Update the list' })));
    const read = () => T.clean({
      offers: [...form.querySelectorAll('input[name=offers]:checked')].map((i) => i.value),
      kind: (form.querySelector('input[name=kind]:checked') || {}).value, goal: (form.querySelector('input[name=goal]:checked') || {}).value,
      size: (form.querySelector('input[name=size]:checked') || {}).value, reach: (form.querySelector('input[name=reach]:checked') || {}).value, city: city.value
    });
    const sentence = () => {
      if (!a.offers.length) return 'Five short questions. It takes about a minute.';
      const sells = list(a.offers.map((id) => T.OFFERS.find((o) => o.id === id).label.toLowerCase()));
      const to = ({ business: 'businesses', ministry: 'churches and ministries', both: 'businesses and ministries' })[a.kind];
      const want = ({ steady: 'steady monthly clients', quick: 'a quick yes', referrals: 'referrals' })[a.goal];
      return 'You sell ' + sells + ' to ' + to + (a.city ? ' near ' + a.city : '') + ', and want ' + want + '.';
    };
    const sum = el('span', { class: 'tg-sum muted small', text: sentence() });
    const ask = el('details', { class: 'card tg-ask', open: first }, el('summary', {}, el('span', { text: 'Your answers' }), sum), form);

    // ----- the list -----
    const results = el('section', { class: 'tg-results', 'aria-label': 'Your targets' });
    const stamp = el('p', { class: 'muted small' });
    const heading = el('h2', { text: 'Your list for this week', tabindex: '-1' });
    const few = el('p', { class: 'note tg-few', hidden: true }), picks = el('ol', { class: 'tg-list' }), stretchHead = el('h2', { text: 'Also worth a try' }), stretchList = el('ol', { class: 'tg-list' });
    const hiddenBox = el('details', { class: 'tg-hidden' }), hiddenList = el('ul', { class: 'tg-hidden-list' });
    const foot = el('p', { class: 'small muted tg-foot', text: 'PRIO keeps a rule of thumb for each kind of business: what it usually needs, how fast the owner decides and how often customers return. These are judgments, not market data, and they say nothing about any one company. The list leans toward the season. It also leans toward kinds that have turned into clients for you: mark one you added here as Client and it ranks higher next time, mark it Lost and it ranks lower.' });
    results.append(heading, stamp, few, picks, stretchHead, stretchList, hiddenBox, foot);
    results.hidden = !shown;
    wrap.append(
      el('div', { class: 'head' }, el('div', {}, el('a', { class: 'eyebrow tg-back', href: '#crm', text: 'Back to Clients' }), el('h1', { text: 'Find targets' }),
        el('p', { class: 'muted tg-intro', text: 'Answer five questions and get a short list of the kinds of business most likely to need what you sell. The list updates every week and with the season, so you always have somewhere fresh to look.' }))),
      ask, results);
    view.append(wrap);

    // ----- one kind of business -----
    function card(it) {
      const note = el('div', { class: 'tg-msg', role: 'status' });
      const say2 = (text, bad) => { note.textContent = ''; note.className = 'tg-msg'; if (!text) return; note.className = 'tg-msg note' + (bad ? ' err' : ' ok'); note.append(...[].concat(text)); };
      const name = el('input', { type: 'text', id: 'tg-add-' + it.id, maxlength: '120', autocomplete: 'off' });
      const addForm = el('form', { class: 'tg-add', hidden: true, novalidate: 'novalidate' },
        el('label', { for: 'tg-add-' + it.id, text: 'Name of the business you found' }), name,
        el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'submit', text: 'Add to Clients' }), el('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => { addForm.hidden = true; say2(''); toggle.focus(); } })));
      const toggle = el('button', { class: 'btn ghost', type: 'button', 'aria-expanded': 'false', text: 'Add one you found', onclick: () => { addForm.hidden = !addForm.hidden; toggle.setAttribute('aria-expanded', String(!addForm.hidden)); say2(''); if (!addForm.hidden) name.focus(); } });
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const who = name.value.trim().replace(/\s+/g, ' ');
        if (!who) { say2('Type the name first.', true); name.focus(); return; }
        const go = addForm.querySelector('button[type=submit]'); if (go.disabled) return; go.disabled = true;
        try {
          const all = await S.crmList(), same = all.find((p) => lower(p.name) === lower(who));
          if (same) { say2([who + ' is already in Clients. ', el('a', { href: '#crm/' + same.id, text: 'Open it' }), '.'], true); return; }
          const saved = await S.crmSave({ name: who, city: a.city, kind: it.kind, stage: 'lead', source: it.source, notes: [{ id: uid(), kind: 'note', text: 'Found with Find targets as ' + it.name.toLowerCase() + '.', at: new Date().toISOString() }] });
          name.value = ''; addForm.hidden = true; toggle.setAttribute('aria-expanded', 'false');
          say2(['Added ' + who + ' to Clients as a lead. ', el('a', { href: '#crm/' + saved.id, text: 'Open it' }), '.']);
        } catch (err) { say2('Could not add it: ' + fail(err), true); } finally { go.disabled = false; }
      });
      const chips = el('div', { class: 'chips' }, el('span', { class: 'chip' + (it.fit === 'Strong fit' ? ' fit' : ''), text: it.fit }), it.isNew ? el('span', { class: 'chip tg-new', text: 'New this week' }) : null);
      return el('li', { class: 'tg-card' },
        el('div', { class: 'tg-top' }, el('div', {}, el('h3', { text: it.name }), el('p', { class: 'muted small', text: it.group })), chips),
        el('ul', { class: 'tg-why' }, it.reasons.map((r) => el('li', { text: r }))),
        el('p', { class: 'tg-line' }, el('span', { class: 'muted', text: 'This week, look for: ' }), it.plan.sign + '.'),
        el('p', { class: 'tg-line' }, el('span', { class: 'muted', text: 'Open with ' }), '"' + it.hook + '"'),
        el('div', { class: 'actions tg-acts' },
          el('button', { class: 'btn ghost', type: 'button', text: 'Find them on a map', title: 'Opens Google Maps in your browser', onclick: () => { Promise.resolve(S.openLink(it.plan.url)).catch((err) => toast(fail(err))); } }),
          toggle,
          el('button', { class: 'tg-skip', type: 'button', text: 'Not for me', title: 'Hides ' + it.name + ' from your list', onclick: () => hide(it) })),
        addForm, note);
    }

    function hide(it) {
      const ids = hiddenIds(); if (!ids.includes(it.id)) ids.push(it.id); store.set(K.hidden, ids);
      toast('Hidden ' + it.name + '. You can bring it back at the bottom of the page.'); draw(true);
    }
    function bringBack(id) {
      const s = T.SEGMENTS.find((x) => x.id === id); store.set(K.hidden, hiddenIds().filter((x) => x !== id));
      toast('Brought back ' + (s ? s.name : 'it') + '.'); draw(true);
    }

    async function draw(keepFocus) {
      const mine = ++gen; let clients = [];
      try { clients = await S.crmList(); } catch (e) { clients = []; }
      if (!owns() || mine !== gen) return;
      const now = new Date(), hidden = hiddenIds(), r = T.rank(a, { now, clients, hidden });
      // New means: on this list and not on the last one you saw. A changed answer or a first list marks nothing.
      const last = store.get(K.last, null), lk = last && typeof last === 'object' ? last : {}, sig = JSON.stringify(a);
      let prev = Array.isArray(lk.prev) ? lk.prev : [];
      if (lk.sig !== sig) prev = []; else if (lk.week !== r.week) prev = Array.isArray(lk.ids) ? lk.ids : [];
      store.set(K.last, { week: r.week, ids: r.picks.map((p) => p.id), prev, sig });
      const marked = T.markNew(r.picks, prev), tops = (r.picks.length >= 3);
      drawnDay = dayKey(now);
      stamp.textContent = 'Updated ' + dayText(now) + '. Picked for ' + r.month + '.';
      picks.replaceChildren(...marked.map((it) => card(it)));
      stretchHead.hidden = stretchList.hidden = !r.stretch.length;
      stretchList.replaceChildren(...r.stretch.map((it) => card(it)));
      hiddenBox.hidden = !hidden.length;
      hiddenBox.replaceChildren(el('summary', { text: 'Hidden (' + hidden.length + ')' }), hiddenList);
      hiddenList.replaceChildren(...hidden.map((id) => { const s = T.SEGMENTS.find((x) => x.id === id); return el('li', {}, el('span', { text: s.name }), el('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Bring back ' + s.name, text: 'Bring back', onclick: () => bringBack(id) })); }));
      if (!tops && hidden.length) hiddenBox.open = true;
      few.hidden = tops; few.textContent = hidden.length ? 'You have hidden most of the list. Bring some back below.' : 'Only a few kinds of business fit those answers. Try changing who you want to work with.';
      sum.textContent = sentence();
      results.hidden = false; shown = true;
      if (keepFocus) heading.focus({ preventScroll: true });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault(); const next = read();
      if (!next.offers.length) { say('Pick at least one thing you sell.', true); form.querySelector('input[name=offers]').focus(); return; }
      say(''); a = next; store.set(K.answers, a);
      draw(false).then(() => { if (!owns()) return; ask.open = false; heading.scrollIntoView({ block: 'start', behavior: moving() ? 'smooth' : 'auto' }); heading.focus({ preventScroll: true }); });
      form.querySelector('button[type=submit]').textContent = 'Update the list';
    });

    // The list stays fresh while the page sits open: when the day turns it is rebuilt, unless someone is typing in it.
    const stale = () => shown && drawnDay && dayKey(new Date()) !== drawnDay && !results.contains(document.activeElement);
    const tick = () => { if (stale()) draw(false); };
    const onVisible = () => { if (!document.hidden) tick(); };
    timer = setInterval(tick, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', onVisible);
    leave = () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); gen++; };
    if (!first) await draw(false);
  };
})();
