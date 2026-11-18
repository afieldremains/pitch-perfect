// Prio Connect, Ads and Brand kits. Each page has a short form, a log while it is being made, and the ones
// made before: a campaign shows its ad images and opens its board, PDF and copy; a brand kit shows its logo
// directions and opens its guide, and can put its colors, tagline and voice into the company in use.
// Uses app.js helpers: S, el, pages, view, toast, route.
'use strict';
(() => {
  const errText = (e) => String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const when = (s) => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  const src = (kind, it, f) => 'kit://kits/~' + kind + '/' + it.rel.split('/').map(encodeURIComponent).join('/') + '/' + f.split('/').map(encodeURIComponent).join('/');
  let busy = false;
  const logs = [];
  if (S.onMake) S.onMake((d) => { if (d.line) { logs.push(d.line); const b = document.getElementById('make-log'); if (b) { b.append(el('div', { text: d.line })); b.scrollTop = b.scrollHeight; } } });

  const CHANNELS = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['google', 'Google Search'], ['linkedin', 'LinkedIn'], ['x', 'X'], ['email', 'Email'], ['radio', 'Radio'], ['print', 'Print'], ['outdoor', 'Billboard']];
  const GOALS = [['customers', 'More customers'], ['leads', 'Leads and inquiries'], ['awareness', 'Get known'], ['event', 'Fill an event'], ['launch', 'Launch something new'], ['hiring', 'Hiring']];
  const DIRECTIONS = [['', 'Still images only'], ['editorial', 'Editorial — clean cuts'], ['cinematic', 'Cinematic — slow push and reveal'], ['product', 'Product focus — framed reveal']];
  const SOCIAL = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x'];
  const noMotion = () => document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stillAd = (html) => html.replace('</style>', '.stage .scene{animation:none!important;visibility:hidden!important}.stage .end{visibility:visible!important}.stage .visual{animation:none!important}.skip{display:none!important}</style>');
  const posting = (kind, id, title) => typeof window.publishingOptions === 'function' && id
    ? el('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Posting options for ' + (kind === 'video' ? 'video' : 'campaign'),
        onclick: () => window.publishingOptions({ kind, id, title }) }, kind === 'video' ? 'Posting options for video' : 'Posting options')
    : null;

  function field(id, label, o = {}) {
    const i = el(o.area ? 'textarea' : 'input', Object.assign({ id: 'mk-' + id, placeholder: o.ph || '' }, o.area ? { rows: 3 } : { type: 'text', autocomplete: 'off' }));
    if (o.value) i.value = o.value;
    if (o.limit) i.maxLength = o.limit;
    return el('div', { class: 'field' }, el('label', { for: 'mk-' + id, text: label }, o.hint ? el('span', { class: 'hint', text: o.hint }) : null), i);
  }
  const val = (id) => { const n = document.getElementById('mk-' + id); return n ? n.value.trim() : ''; };

  async function shell(kind, title, lead, form, onGo) {
    const owns = routeOwner();
    const co = window.activeCompany ? await window.activeCompany().catch(() => null) : null;
    if (!owns()) return;
    const wrap = el('div', { class: 'wrap mk' }); view.append(wrap);
    const logBox = el('div', { id: 'make-log', class: 'make-log', 'aria-live': 'polite' }, ...logs.map((l) => el('div', { text: l })));
    logBox.hidden = !busy;
    const go = el('button', { class: 'btn primary', type: 'button', disabled: busy || null }, busy ? 'Working…' : (kind === 'ads' ? 'Make the campaign' : 'Make the brand kit'));
    go.addEventListener('click', async () => {
      if (busy) return; const brief = onGo(); if (!brief) return;
      busy = true; logs.length = 0; logBox.replaceChildren(); logBox.hidden = false; go.disabled = true; go.textContent = 'Working…';
      if (window.buddy) window.buddy.mood('think');
      try { await S.makeStart(kind, brief.brief, brief.photo); toast(kind === 'ads' ? 'The campaign is ready.' : 'The brand kit is ready.'); if (typeof burst === 'function') burst(); }
      catch (e) { toast('Could not finish: ' + errText(e)); }
      finally { busy = false; if (/^#(ads|brand)/.test(location.hash)) route(); }
    });
    wrap.append(el('div', { class: 'head' }, el('div', {}, el('div', { class: 'eyebrow', text: co ? 'For ' + co.name : '' }), el('h1', { text: title }), el('p', { class: 'muted', text: lead }))),
      el('section', { class: 'card' }, form, el('div', { class: 'actions' }, go, el('span', { class: 'muted small', text: kind === 'ads' ? 'Campaign planning uses your research key. Video export takes additional time.' : 'Takes about 2 minutes and uses your research key.' })), logBox));
    const list = await S.makeList(kind).catch(() => []);
    if (!owns()) return;
    wrap.append(el('h2', { class: 'mk-h', text: list.length ? (kind === 'ads' ? 'Campaigns' : 'Brand kits') : '' }),
      list.length ? el('div', { class: 'mk-list' }, list.map((it) => item(kind, it))) : el('p', { class: 'muted', text: kind === 'ads' ? 'Campaigns you make are kept here, with their ads, posts and copy.' : 'Brand kits you make are kept here, with their guide and logo directions.' }));
  }
  // On the web there are no files: the pieces live on this device and open as pages, printed with the browser.
  const openDoc = (html, title) => { const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank'); if (!w) toast('Allow pop-ups for this site to open ' + title + '.'); };
  function webItem(kind, it) {
    const box = el('article', { class: 'card mk-item' }, el('div', { class: 'mk-top' }, el('h3', { text: it.title }), el('span', { class: 'muted small', text: when(it.made) + (it.by ? ', by ' + it.by : '') })));
    S.workItem(it.id).then((W) => {
      if (!W) return;
      const motion = kind === 'ads' && W.ads.find((a) => a.html.includes('data-scene="end"'));
      const pics = kind === 'ads' ? W.ads.slice(0, 6).map((a) => { const [w, h] = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920], wide: [1200, 628], banner: [1920, 1080], print: [1275, 1650] }[a.size] || [1080, 1080], k = 150 / h;
        return el('div', { class: 'mk-frame', style: 'width:' + Math.round(w * k) + 'px;height:150px' }, el('iframe', { sandbox: '', srcdoc: a === motion ? stillAd(a.html) : a.html, title: 'Ad', style: 'width:' + w + 'px;height:' + h + 'px;transform:scale(' + k + ')' })); })
        : W.marks.map((m) => el('img', { class: 'svg', alt: '', src: 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(m.svg))) }));
      box.append(el('div', { class: 'mk-pics' + (kind === 'brand' ? ' logos' : '') }, pics), el('div', { class: 'actions' },
        el('button', { class: 'btn primary sm', type: 'button', onclick: () => openDoc(kind === 'ads' ? W.board : W.guide, 'it') }, kind === 'ads' ? 'Open the campaign' : 'Open the brand guide'),
        motion ? el('button', { class: 'btn ghost sm', type: 'button', onclick: () => openDoc(noMotion() ? stillAd(motion.html) : motion.html, 'the motion ad preview') }, 'Open motion ad preview') : null,
        kind === 'ads' ? posting('ad', it.id, it.title) : null,
        kind === 'ads' ? el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([W.copy], { type: 'text/plain' })); a.download = it.title + ' ad copy.txt'; a.click(); } }, 'Download the copy') : null,
        kind === 'brand' ? el('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { try { const c = await S.brandApply(it.id); toast('Colors, tagline and voice applied to ' + c.name + '.'); if (window.companyChip) window.companyChip(); } catch (e) { toast(errText(e)); } } }, 'Use these for my company') : null));
    });
    return box;
  }
  function item(kind, it) {
    if (it.web) return webItem(kind, it);
    const open = (f) => S.makeOpen(kind, it.dir, f).catch((e) => toast(errText(e)));
    const pics = kind === 'ads' ? it.images.slice(0, 6).map((f) => el('img', { src: src(kind, it, f), alt: '', loading: 'lazy' })) : it.logos.map((f) => el('img', { class: 'svg', src: src(kind, it, f), alt: '', loading: 'lazy' }));
    const has = (f) => it.files.includes(f);
    return el('article', { class: 'card mk-item' }, el('div', { class: 'mk-top' }, el('h3', { text: it.title }), el('span', { class: 'muted small', text: when(it.made) + (it.by ? ', by ' + it.by : '') })),
      el('div', { class: 'mk-pics' + (kind === 'brand' ? ' logos' : '') }, pics),
      el('div', { class: 'actions' },
        has(kind === 'ads' ? 'campaign.pdf' : 'brand-guide.pdf') ? el('button', { class: 'btn primary sm', type: 'button', onclick: () => open(kind === 'ads' ? 'campaign.pdf' : 'brand-guide.pdf') }, kind === 'ads' ? 'Open the campaign (PDF)' : 'Open the brand guide (PDF)') : null,
        kind === 'ads' && has('motion-ad.html') && !noMotion() ? el('button', { class: 'btn ghost sm', type: 'button', onclick: () => open('motion-ad.html') }, 'Open motion ad preview') : null,
        kind === 'ads' && has('motion-ad.mp4') ? el('span', { class: 'muted small', text: 'MP4 in the campaign folder' }) : null,
        kind === 'ads' ? posting('ad', it.dir, it.title) : null,
        kind === 'ads' && has('motion-ad.mp4') ? posting('video', it.dir + (it.dir.includes('\\') ? '\\' : '/') + 'motion-ad.mp4', it.title) : null,
        kind === 'ads' && has('ad-copy.txt') ? el('button', { class: 'btn ghost sm', type: 'button', onclick: () => open('ad-copy.txt') }, 'All the copy') : null,
        kind === 'brand' ? el('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { try { const c = await S.brandApply(it.dir); toast('Colors, tagline and voice applied to ' + c.name + '.'); if (window.companyChip) window.companyChip(); } catch (e) { toast(errText(e)); } } }, 'Use these for my company') : null,
        el('button', { class: 'btn ghost sm', type: 'button', onclick: () => open('') }, 'Show the folder')));
  }

  pages.ads = async () => {
    const chans = new Set(['facebook', 'instagram', 'google']);
    const motionChoice = el('select', { id: 'mk-direction' }, DIRECTIONS.map(([v, t]) => el('option', { value: v, text: t })));
    const motionHint = el('span', { class: 'hint' });
    const motionFields = el('div', {}, field('hook', 'Opening line', { limit: 56, hint: 'Optional. A short question or a lead-in.' }),
      field('proof', 'Approved product detail', { limit: 84, hint: 'Optional. A feature or a fact you can verify.' }),
      field('cta', 'Call to action', { limit: 28, ph: 'Book a lesson' }));
    const syncMotion = () => {
      motionChoice.disabled = !SOCIAL.some((c) => chans.has(c));
      motionFields.hidden = motionChoice.disabled || !motionChoice.value;
      motionHint.textContent = motionChoice.disabled ? 'Choose a social channel to add a motion ad.'
        : noMotion() ? 'Motion is off. The preview will be a still; no video will be exported.'
          : 'Adds one silent, 15-second motion graphic for a social ad. Desktop saves an MP4 when supported; the web offers a playable preview.';
    };
    motionChoice.addEventListener('change', syncMotion);
    syncMotion();
    const chips = el('div', { class: 'togs', role: 'group', 'aria-label': 'Channels' }, CHANNELS.map(([v, t]) => el('button', { type: 'button', class: 'tog', 'aria-pressed': String(chans.has(v)), onclick: (e) => { chans.has(v) ? chans.delete(v) : chans.add(v); e.currentTarget.setAttribute('aria-pressed', String(chans.has(v))); syncMotion(); } }, t)));
    let goal = 'customers', forWho = 'self', photo = '', reading = false, photoRequest = 0;
    const goalSeg = el('div', { class: 'seg wrapseg', role: 'group', 'aria-label': 'Goal' }, GOALS.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(v === goal), onclick: (e) => { goal = v; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, t)));
    const clientField = field('client', 'Client name', { ph: 'Joe\'s Pizza' }); clientField.hidden = true;
    const forSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Who it is for' }, [['self', 'My company'], ['client', 'A client']].map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(v === forWho), onclick: (e) => { forWho = v; clientField.hidden = v !== 'client'; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, t)));
    const photoIn = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'A photo for the ads', class: 'sr-only', id: 'mk-photo' });
    const photoName = el('span', { class: 'muted small', text: 'No photo' });
    photoIn.addEventListener('change', () => {
      const f = photoIn.files[0], request = ++photoRequest;
      photo = ''; reading = false; photoName.textContent = 'No photo';
      if (!f) return;
      if (f.size > 4e6 || !/^image\/(png|jpeg|webp)$/.test(f.type)) {
        photoIn.value = ''; toast('Choose a PNG, JPEG or WebP under 4 MB.'); return;
      }
      const r = new FileReader(); reading = true; photoName.textContent = 'Reading photo…';
      r.onloadend = () => {
        if (request !== photoRequest) return;
        reading = false;
        if (typeof r.result === 'string') { photo = r.result; photoName.textContent = f.name; }
        else { photoIn.value = ''; photoName.textContent = 'No photo'; toast('Could not read the photo. Choose it again.'); }
      };
      r.readAsDataURL(f);
    });
    await shell('ads', 'Ads', 'A whole campaign from a short brief: the idea, ads for each channel with finished images, posts, search ads, a schedule and a budget split.',
      el('div', {}, el('div', { class: 'field' }, el('span', { class: 'label', text: 'Who it is for' }), forSeg), clientField,
        field('product', 'What are we advertising?', { limit: 160, ph: 'Summer guitar lessons, a new product, a Friday special…' }),
        el('div', { class: 'field' }, el('span', { class: 'label', text: 'Goal' }), goalSeg),
        field('audience', 'Who should see it?', { ph: 'Parents of 9 to 14 year olds in Sarasota', hint: 'Leave empty to use the company\'s own customers.' }),
        el('div', { class: 'field' }, el('span', { class: 'label', text: 'Channels' }), chips),
        el('div', { class: 'field' }, el('label', { for: 'mk-direction', text: 'Motion direction' }, motionHint), motionChoice), motionFields,
        el('div', { class: 'grid2' }, field('budget', 'Budget', { ph: '$1,500 a month' }), field('dates', 'When', { ph: 'June 1 to July 15' })),
        el('div', { class: 'field' }, el('label', { text: 'A photo for the ads', hint: null }, el('span', { class: 'hint', text: 'Optional. Your own photo makes the ads yours; without one they use your colors.' })), el('div', { class: 'actions' }, photoIn, el('label', { for: 'mk-photo', class: 'btn ghost sm', tabindex: '0', onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); photoIn.click(); } } }, 'Choose a photo'), photoName)),
        field('notes', 'Anything else', { area: true, ph: 'An offer, a deadline, words to use or avoid' })),
      () => {
        if (!val('product')) { document.getElementById('mk-product').focus(); toast('Say what we are advertising first.'); return null; }
        if (forWho === 'client' && !val('client')) { document.getElementById('mk-client').focus(); toast('Add the client\'s name.'); return null; }
        if (!chans.size) { toast('Pick at least one channel.'); return null; }
        if (reading) { toast('Wait for the photo to finish loading.'); return null; }
        const motion = motionChoice.disabled ? '' : motionChoice.value;
        return { brief: { for: forWho, client: val('client'), product: val('product'), goal: (GOALS.find((g) => g[0] === goal) || [])[1],
          audience: val('audience'), channels: [...chans], budget: val('budget'), dates: val('dates'), notes: val('notes'),
          motion, still: noMotion(), ...(motion ? { hook: val('hook'), proof: val('proof'), cta: val('cta') } : {}) }, photo };
      });
  };
  pages.brand = async () => {
    const owns = routeOwner();
    const co = window.activeCompany ? await window.activeCompany().catch(() => null) : null;
    if (!owns()) return;
    await shell('brand', 'Brand kits', 'Positioning, personality, voice, taglines, a palette checked for contrast, type, logo directions and ready-to-use words, in a brand guide.',
      el('div', {}, field('name', 'Company name', { ph: 'Gulf Coast Guitars', value: co && !co.prime ? co.name : '' }),
        field('what', 'What they do', { area: true, ph: 'Guitars, lessons and repairs for families in Sarasota', value: co && !co.prime ? co.offer : '' }),
        field('audience', 'Who they serve', { ph: 'Parents, beginners, local players', value: co && !co.prime ? co.audience : '' }),
        el('div', { class: 'grid2' }, field('values', 'What they stand for', { ph: 'Patience, fair prices, local' }), field('vibe', 'How it should feel', { ph: 'Warm, a little playful, never fancy' })),
        field('competitors', 'Competitors or brands they admire', { ph: 'Names or websites' }),
        field('keep', 'Keep', { ph: 'Our teal color, the guitar in the old logo' }), field('notes', 'Anything else', { area: true })),
      () => { if (!val('name')) { document.getElementById('mk-name').focus(); toast('Add the company name first.'); return null; }
        return { brief: { name: val('name'), what: val('what'), audience: val('audience'), values: val('values'), vibe: val('vibe'), competitors: val('competitors'), keep: val('keep'), notes: val('notes') } }; });
  };
})();
