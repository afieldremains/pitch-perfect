// Prio Connect, My company: who is doing the pitching. A list of company profiles (Prio Connect is always one), the
// active one marked, and a page to edit each: what it sells and to whom, its prices, its proof, its voice, colors and
// logo. Decks, ads and brand kits are written for the active company. Uses app.js helpers: S, el, pages, view, toast, route.
'use strict';
(() => {
  const errText = (e) => String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const money = (n, u) => (n ? '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }) + (u && u !== 'one-time' && u !== 'project' ? ' / ' + u : '') : 'Price on request');
  let opts = null;
  const options = async () => opts || (opts = await S.companyOptions());

  // The company name under the app's name in the rail, so it is always clear who the decks are written for.
  async function chip() {
    const box = document.getElementById('as-company'); if (!box) return;
    try { const db = await S.companies(), c = db.companies.find((x) => x.id === db.active); box.textContent = c && !c.prime ? c.name : ''; box.title = 'Decks, ads and brand kits are made for ' + (c ? c.name : 'your company') + '. Click to change.'; } catch (e) { box.textContent = ''; }
  }
  window.companyChip = chip; setTimeout(chip, 600);
  window.activeCompany = async () => { const db = await S.companies(); return db.companies.find((x) => x.id === db.active); };

  const logoBox = (c, size) => c.logo ? el('img', { class: 'co-logo', src: c.logo, alt: '', width: size, height: size }) :
    el('span', { class: 'co-logo co-initial', style: 'width:' + size + 'px;height:' + size + 'px;background:' + c.colors.brand + ';color:#fff', text: (c.short || c.name || '?').trim().charAt(0).toUpperCase() });

  async function list() {
    let db; try { db = await S.companies(); } catch (e) { view.append(el('div', { class: 'wrap' }, el('div', { class: 'note err', text: errText(e) }))); return; }
    const wrap = el('div', { class: 'wrap co' }); view.append(wrap);
    const use = async (c, b) => { b.disabled = true; try { await S.companyActivate(c.id); toast('Now making decks, ads and brand kits for ' + c.name + '.'); chip(); route(); } catch (e) { b.disabled = false; toast(errText(e)); } };
    wrap.append(el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: 'Who is pitching' }), el('h1', { text: 'My company' }),
      el('p', { class: 'muted', text: 'Everything the app makes is written for the company marked "In use": its offer, prices, voice, colors and logo. Add your own, or one for each client you work for.' })),
      el('div', { class: 'actions' }, el('a', { class: 'btn primary', href: '#company/new' }, 'Add a company'))),
      el('div', { class: 'co-grid' }, db.companies.map((c) => el('article', { class: 'card co-card' + (c.id === db.active ? ' on' : ''), style: '--cb:' + c.colors.brand + ';--ca:' + c.colors.accent },
        el('div', { class: 'co-top' }, logoBox(c, 44), el('div', {}, el('h2', { text: c.name }), el('p', { class: 'muted small', text: [c.industry, c.city].filter(Boolean).join(', ') || 'Add what you do and where' }))),
        c.offer ? el('p', { class: 'small', text: c.offer }) : null,
        c.packages.length ? el('p', { class: 'muted small', text: c.packages.slice(0, 3).map((k) => k.name + ': ' + money(k.price, k.unit)).join('  ·  ') }) : null,
        el('div', { class: 'actions' }, c.id === db.active ? el('span', { class: 'chip co-inuse', text: 'In use' }) : el('button', { class: 'btn primary sm', type: 'button', onclick: (e) => use(c, e.currentTarget) }, 'Use this company'),
          el('a', { class: 'btn ghost sm', href: '#company/' + c.id }, 'Edit'))))));
  }

  async function editor(id) {
    const [db, o] = await Promise.all([S.companies(), options()]);
    const fresh = id === 'new';
    const c = fresh ? { name: '', industry: '', offer: '', audience: '', city: '', website: '', email: '', phone: '', voice: '', tagline: '', colors: { brand: '#2656D9', accent: '#FAC800', dark: '#121218' }, packages: [], proof: [], logo: '' } : JSON.parse(JSON.stringify(db.companies.find((x) => x.id === id) || {}));
    const wrap = el('div', { class: 'wrap narrow co-edit' }); view.append(wrap);
    if (!fresh && !c.id) { wrap.append(el('div', { class: 'note err', text: 'That company is not in the list any more.' }), el('a', { class: 'btn ghost', href: '#company' }, 'Back')); return; }
    const field = (key, label, ph, area, hint) => { const i = el(area ? 'textarea' : 'input', area ? { id: 'co-' + key, rows: 3, placeholder: ph || '' } : { id: 'co-' + key, type: 'text', placeholder: ph || '', autocomplete: 'off' });
      i.value = c[key] || ''; i.addEventListener('input', () => { c[key] = i.value; }); return el('div', { class: 'field' }, el('label', { for: 'co-' + key, text: label }, hint ? el('span', { class: 'hint', text: hint }) : null), i); };
    const ind = el('input', { id: 'co-industry', type: 'text', list: 'co-industries', placeholder: 'Car dealership, music store, ad sales, SaaS…', value: c.industry || '' });
    ind.addEventListener('input', () => { c.industry = ind.value; });
    const color = (k, label) => { const i = el('input', { type: 'color', value: c.colors[k] }); i.addEventListener('input', () => { c.colors[k] = i.value.toUpperCase(); prev(); }); return el('label', { class: 'th-pick' }, i, el('span', { text: label })); };
    const logoWrap = el('div', { class: 'co-logo-row' });
    const prev = () => { logoWrap.replaceChildren(logoBox(c, 64), el('div', { class: 'actions' },
      el('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { const r = await S.companyLogo(); if (r.error) toast(r.error); else if (r.logo) { c.logo = r.logo; prev(); } } }, c.logo ? 'Change the logo' : 'Add your logo'),
      c.logo ? el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { c.logo = ''; prev(); } }, 'Remove') : null)); };
    prev();
    // Packages and prices: the "investment" the decks offer.
    const pk = el('div', { class: 'co-rows' });
    const pkRow = (k) => { const n = el('input', { type: 'text', placeholder: 'Package name', value: k.name, 'aria-label': 'Package name' }), p = el('input', { type: 'text', inputmode: 'decimal', placeholder: 'Price', value: k.price || '', 'aria-label': 'Price' }),
      u = el('select', { 'aria-label': 'Per' }, o.units.map((x) => el('option', { value: x, text: x === 'one-time' ? 'one time' : 'per ' + x }))), inc = el('input', { type: 'text', placeholder: 'What it includes', value: k.includes, 'aria-label': 'What it includes' });
      u.value = k.unit || 'one-time';
      n.oninput = () => { k.name = n.value; }; p.oninput = () => { k.price = p.value; }; u.onchange = () => { k.unit = u.value; }; inc.oninput = () => { k.includes = inc.value; };
      return el('div', { class: 'co-row' }, n, p, u, inc, el('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Remove this package', onclick: () => { c.packages = c.packages.filter((x) => x !== k); drawPk(); } }, 'Remove')); };
    const drawPk = () => pk.replaceChildren(...c.packages.map(pkRow), c.packages.length < 8 ? el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { c.packages.push({ name: '', price: '', unit: 'one-time', includes: '' }); drawPk(); pk.querySelector('.co-row:last-of-type input').focus(); } }, 'Add a package') : null);
    drawPk();
    const pf = el('div', { class: 'co-rows' });
    const pfRow = (x) => { const a = el('input', { type: 'text', placeholder: 'Client (or "A local roofer")', value: x.client, 'aria-label': 'Client' }), b = el('input', { type: 'text', placeholder: 'The result, in numbers if you have them', value: x.result, 'aria-label': 'Result' });
      a.oninput = () => { x.client = a.value; }; b.oninput = () => { x.result = b.value; };
      return el('div', { class: 'co-row two' }, a, b, el('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Remove this result', onclick: () => { c.proof = c.proof.filter((y) => y !== x); drawPf(); } }, 'Remove')); };
    const drawPf = () => pf.replaceChildren(...c.proof.map(pfRow), c.proof.length < 8 ? el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { c.proof.push({ client: '', result: '' }); drawPf(); } }, 'Add a result') : null);
    drawPf();
    const save = el('button', { class: 'btn primary', type: 'button', onclick: async () => {
      if (!String(c.name || '').trim()) { document.getElementById('co-name').focus(); toast('Add the company name first.'); return; }
      save.disabled = true;
      try { const out = await S.companySave(c, fresh || db.active === c.id || undefined); toast(out.name + ' saved.' + (fresh ? ' Decks, ads and brand kits are now made for it.' : '')); chip(); location.hash = 'company'; }
      catch (e) { save.disabled = false; toast(errText(e)); } } }, fresh ? 'Save and use this company' : 'Save');
    wrap.append(el('a', { class: 'crm-back', href: '#company' }, '← All companies'),
      el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: fresh ? 'New company' : c.prime ? 'The Prio Connect profile' : 'Company profile' }), el('h1', { text: fresh ? 'Add a company' : c.name }))),
      c.prime ? el('p', { class: 'note', text: 'Prio Connect\'s own decks keep their full Prio Connect design and story. Everything here also feeds the ads, brand kits and the guide.' }) : null,
      el('section', { class: 'card' }, el('h2', { text: 'Who you are' }), field('name', 'Company name', 'Gulf Coast Toyota'),
        el('div', { class: 'grid2' }, el('div', { class: 'field' }, el('label', { for: 'co-industry', text: 'What kind of business' }), ind, el('datalist', { id: 'co-industries' }, o.industries.map((x) => el('option', { value: x })))), field('city', 'Where', 'Sarasota, FL')),
        el('div', { class: 'grid2' }, field('website', 'Website', 'yourcompany.com'), field('tagline', 'Tagline', 'Short line you are known by')),
        el('div', { class: 'grid2' }, field('email', 'Email', 'you@yourcompany.com'), field('phone', 'Phone', '(941) 555-0100'))),
      el('section', { class: 'card' }, el('h2', { text: 'What you sell, and to whom' }),
        field('offer', 'What you offer', 'New and used cars, financing and service. Or: radio and digital ad packages for local businesses.', true, 'The decks build their case around this.'),
        field('audience', 'Who you sell to', 'Families and fleet buyers in Sarasota and Manatee counties', true),
        el('div', { class: 'field' }, el('span', { class: 'label', text: 'Packages and prices' }, el('span', { class: 'hint', text: 'The deck\'s investment slide shows these. Leave prices blank to say "on request".' })), pk)),
      el('section', { class: 'card' }, el('h2', { text: 'Proof' }), el('p', { class: 'muted small', text: 'Real results only. The decks use these as your proof and never make any up.' }), pf),
      el('section', { class: 'card' }, el('h2', { text: 'Look and voice' }), el('div', { class: 'field' }, el('span', { class: 'label', text: 'Logo' }), logoWrap),
        el('div', { class: 'field' }, el('span', { class: 'label', text: 'Brand colors' }), el('div', { class: 'th-picks' }, color('brand', 'Main color'), color('accent', 'Accent'), color('dark', 'Dark'))),
        field('voice', 'How you sound', 'Friendly and straight-talking. Or: confident, technical, premium.', true)),
      el('div', { class: 'actions co-save' }, save, !fresh && !c.prime ? el('button', { class: 'btn ghost', type: 'button', onclick: async (e) => {
        const b = e.currentTarget; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Click again to delete ' + c.name; return; }
        try { await S.companyDelete(c.id); toast(c.name + ' deleted.'); chip(); location.hash = 'company'; } catch (x) { toast(errText(x)); } } }, 'Delete this company') : null));
    if (fresh) document.getElementById('co-name').focus();
  }
  pages.company = async (rest) => (rest ? editor(String(rest).split('/')[0]) : list());
})();
