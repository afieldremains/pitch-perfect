// The web app's own versions of the pages that, on the desktop, work with files: the Library, a kit, a new prospect,
// and Settings. Everything else (build progress, Clients, My company, Ads, Brand kits, the guide, the looks)
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
  // Deleting a kit asks once, in plain words, with Cancel focused so a stray tap or Enter keeps the kit.
  const confirmDelete = (k, id) => {
    const cancel = el('button', { type: 'button', class: 'btn ghost', autofocus: true, onclick: () => box.close() }, 'Cancel');
    const remove = el('button', { type: 'button', class: 'btn danger', onclick: async () => {
      remove.disabled = cancel.disabled = true; remove.setAttribute('aria-busy', 'true');
      try { await S.trashKit(id); box.close(); toast(k.name + ' deleted.'); location.hash = 'library'; }
      catch (e) { remove.disabled = cancel.disabled = false; remove.removeAttribute('aria-busy'); toast(errText(e)); }
    } }, 'Delete');
    const box = el('dialog', { class: 'confirm-dialog', 'aria-label': 'Delete ' + k.name },
      el('h2', { text: 'Delete ' + k.name + '?' }),
      el('p', { text: 'This removes the deck, leave-behind, cheat sheet and assessment from this device. It cannot be undone.' }),
      el('div', { class: 'actions' }, remove, cancel));
    box.addEventListener('close', () => box.remove()); document.body.append(box); box.showModal();
  };

  const mainNav = document.querySelector('.rail nav');
  const navSlot = document.createComment('Main navigation');
  mainNav.before(navSlot);
  const closeMenu = el('button', { class: 'btn ghost', type: 'button', onclick: () => mobileMenu.close() }, 'Close');
  const mobileMenu = el('dialog', { class: 'mobile-menu', id: 'mobile-pages', 'aria-labelledby': 'mobile-pages-title' },
    el('div', { class: 'mobile-menu-head' }, el('h2', { id: 'mobile-pages-title', text: 'Pages' }), closeMenu));
  const menuButton = el('button', { type: 'button', 'aria-haspopup': 'dialog', 'aria-controls': mobileMenu.id, 'aria-expanded': 'false', onclick: () => {
    mobileMenu.showModal(); menuButton.setAttribute('aria-expanded', 'true');
  } }, 'Menu');
  const quickKeys = ['home', 'library', 'crm'];
  const quickLinks = quickKeys.map((key) => {
    const link = mainNav.querySelector('[data-tab="' + key + '"]');
    return el('a', { href: link.getAttribute('href'), 'data-tab': key }, link.firstChild.textContent.trim());
  });
  const quickNav = el('nav', { class: 'mobile-tabs', 'aria-label': 'Quick navigation' }, ...quickLinks, menuButton);
  document.querySelector('.rail').append(mobileMenu);
  document.body.append(quickNav);
  mobileMenu.addEventListener('close', () => menuButton.setAttribute('aria-expanded', 'false'));
  mainNav.addEventListener('click', (event) => {
    if (mobileMenu.open && event.target.closest('a[href]') && !event.ctrlKey && !event.metaKey && !event.shiftKey) mobileMenu.close();
  });
  const compact = matchMedia('(max-width: 760px)');
  const placeNavigation = () => {
    const wasOpen = mobileMenu.open;
    if (wasOpen) mobileMenu.close();
    if (compact.matches) mobileMenu.append(mainNav);
    else {
      navSlot.after(mainNav);
      if (wasOpen) mainNav.querySelector('.on')?.focus({ preventScroll: true });
    }
  };
  compact.addEventListener('change', placeNavigation);
  addEventListener('hashchange', () => { if (mobileMenu.open) mobileMenu.close(); });
  placeNavigation();

  pages.library = async () => {
    const owns = routeOwner();
    const all = await S.kits(), set = await S.settings();
    if (!owns()) return;
    const wrap = el('div', { class: 'wrap' }); view.append(wrap);
    const picker = el('input', { type: 'file', accept: '.zip', hidden: true });
    const importing = el('button', { class: 'btn ghost', type: 'button', onclick: () => picker.click() }, 'Import editable kit');
    picker.onchange = async () => {
      const file = picker.files[0]; if (!file) return;
      importing.disabled = true;
      try {
        if (file.size > 25 * 1024 * 1024) throw new Error('Choose an editable PRIO ZIP under 25 MB.');
        const kit = await S.presentationImport(await file.arrayBuffer()); toast('Imported the editable kit.'); location.hash = 'kit/' + kit.dir;
      } catch (e) { toast(errText(e)); } finally { importing.disabled = false; picker.value = ''; }
    };
    wrap.append(el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: all.length ? all.length + ' kit' + (all.length === 1 ? '' : 's') + ' on this device' : 'Your kits' }), el('h1', { text: 'Library' })),
      el('div', { class: 'actions' }, el('a', { class: 'btn primary', href: '#new' }, 'New prospect'), importing, picker)));
    if (!set.hasKey) wrap.append(el('div', { class: 'note' }, 'First, add your research key in ', el('a', { href: '#settings' }, 'Settings'), '. It stays on this device.'));
    if (!all.length) { wrap.append(el('div', { class: 'empty' }, el('h2', { text: 'Your kits will live here.' }), el('p', { class: 'muted', text: 'Start with a prospect\'s name and website. You get a deck, a leave-behind, a cheat sheet and an assessment.' }), el('a', { class: 'btn primary', href: '#new' }, 'New prospect'))); return; }
    wrap.append(el('div', { class: 'wk-grid' }, all.map((g) => { const k = g.latest;
      return el('a', { class: 'card wk-card', href: '#kit/' + encodeURIComponent(k.dir), style: '--wc:' + (k.colors[0] || 'var(--accent)') }, el('b', { text: k.name }), el('span', { class: 'muted small', text: [k.city, when(k.when)].filter(Boolean).join(', ') }), el('span', { class: 'small', text: (k.seller ? 'By ' + k.seller : '') + (k.fit ? ', fit ' + k.fit : '') })); })));
  };

  pages.kit = async (id) => {
    const owns = routeOwner();
    const all = await S.kits(), g = all.find((x) => x.latest.dir === id), K = await S.webKit(id);
    if (!owns()) return;
    const wrap = el('div', { class: 'wrap' }); view.append(wrap);
    if (!g || !K) { wrap.append(el('div', { class: 'note err', text: 'That kit is not on this device any more.' }), el('a', { class: 'btn ghost', href: '#library' }, 'Back to the Library')); return; }
    const k = g.latest;
    const frame = el('iframe', { class: 'wk-deck', src: 'viewer.html#' + encodeURIComponent(id), title: 'The deck for ' + k.name, allow: 'fullscreen' });
    const present = () => { const f = frame; (f.requestFullscreen || f.webkitRequestFullscreen || (() => window.open('viewer.html#' + encodeURIComponent(id), '_blank'))).call(f); };
    wrap.append(el('a', { class: 'crm-back', href: '#library' }, 'All kits'),
      el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: [k.city, k.seller ? 'for ' + k.seller : ''].filter(Boolean).join(', ') }), el('h1', { text: k.name }))),
      el('div', { class: 'wk-stage' }, frame),
      el('p', { class: 'muted small', text: 'Tap the right side of the deck (or press the right arrow) to build each slide; tap the left side to go back.' }),
      el('div', { class: 'actions wrapseg' },
        el('button', { class: 'btn primary', type: 'button', onclick: present }, 'Present full screen'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => window.presentationOptions(k) }, 'Edit the deck'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => window.sharePresentation(k) }, 'Share presentation'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => openDoc(K.leave) }, 'Leave-behind'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => openDoc(K.cheat) }, 'Cheat sheet'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => openDoc(K.assess) }, 'Assessment'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => confirmDelete(k, id) }, 'Delete')),
      el('p', { class: 'muted small', text: 'Documents open in a new tab: use Print, then Save as PDF (on iPhone: Share, then Print).' }));
    if (window.crmForKit) window.crmForKit({ name: k.name, dir: k.dir }).then((p) => { if (!p) wrap.querySelector('.actions').append(el('button', { class: 'btn ghost', type: 'button', onclick: async () => { const n = await window.crmAddKit({ name: k.name, dir: k.dir, city: k.city }); location.hash = 'crm/' + n.id; } }, 'Add to Clients')); });
  };

  pages.new = async () => {
    const owns = routeOwner();
    const co = window.activeCompany ? await window.activeCompany() : null, set = await S.settings(), d = store.get('draft', {}) || {};
    if (!owns()) return;
    const wrap = el('div', { class: 'wrap narrow' }); view.append(wrap);
    const f = (id, label, ph, area) => { const i = el(area ? 'textarea' : 'input', Object.assign({ id: 'wn-' + id, placeholder: ph || '' }, area ? { rows: 3 } : { type: 'text', autocomplete: 'off' })); i.value = d[id] || ''; i.addEventListener('input', () => { d[id] = i.value; store.set('draft', d); }); return el('div', { class: 'field' }, el('label', { for: 'wn-' + id, text: label }), i); };
    const go = el('button', { class: 'btn primary', type: 'button', onclick: async () => {
      if (!String(d.name || '').trim()) { document.getElementById('wn-name').focus(); toast('Add the prospect\'s name first.'); return; }
      go.disabled = true; try { await S.start({ name: d.name.trim(), website: d.website, city: d.city, notes: d.notes, people: d.people, meeting: d.meeting, researchMode: d.researchMode || 'focused' }); store.del('draft'); location.hash = 'run'; } catch (e) { go.disabled = false; toast(errText(e)); } } }, 'Build the kit');
    const depth = el('select', { id: 'wn-depth' }, el('option', { value: 'focused', text: 'Focused research' }), el('option', { value: 'deep', text: 'Deep research' }));
    depth.value = d.researchMode || 'focused'; depth.onchange = () => { d.researchMode = depth.value; store.set('draft', d); };
    wrap.append(el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: co ? 'Pitching as ' + co.name : '' }), el('h1', { text: 'New prospect' }))),
      set.hasKey ? null : el('div', { class: 'note' }, 'Add your research key in ', el('a', { href: '#settings' }, 'Settings'), ' first.'),
      el('section', { class: 'card' }, f('name', 'Who are we meeting?', 'Prospect name'), el('div', { class: 'grid2' }, f('website', 'Website', 'theirsite.com'), f('city', 'City and state', 'Venice, FL')),
        f('people', 'Who you are meeting', 'Name (role)'), f('meeting', 'Meeting date', 'November 12, 2026'), f('notes', 'Anything else', 'What you know, how you met them', true)),
      el('div', { class: 'field' }, el('label', { for: depth.id, text: 'Research depth' }), depth, el('p', { class: 'small muted', text: 'Both modes challenge the recommendation and track sources. Deep allows more checks and may exceed seven minutes.' })),
      el('div', { class: 'actions' }, go, el('span', { class: 'muted small', text: 'Keep this page open while it works. Research time depends on the sources and connection.' })));
  };

  // Settings on the web: the key (kept on this device) and the whole Appearance card from the desktop app.
  const desktopSettings = pages.settings;
  pages.settings = async () => {
    const owns = routeOwner();
    await desktopSettings();
    if (!owns()) return;
    view.querySelectorAll('section.card').forEach((c) => { const h = c.querySelector('h2'); const t = h ? h.textContent : ''; if (!/Appearance|Research key/.test(t)) c.remove(); });
    const keyCard = [...view.querySelectorAll('section.card')].find((c) => /Research key/.test(c.textContent));
    if (keyCard) keyCard.append(el('p', { class: 'muted small', text: 'On the web your key is kept in this browser on this device only, and sent only to Anthropic to run your research. Use a key with a spending limit, and do not add it on a shared computer.' }));
  };
})();
