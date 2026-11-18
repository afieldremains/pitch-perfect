'use strict';
(() => {
  const SOUNDS = ['off', 'soft', 'crisp', 'chime', 'wood', 'glass', 'pluck', 'marimba', 'bell', 'brush', 'rise', 'fall'];
  window.presentationOptions = async (kit) => {
    const owns = routeOwner();
    let data;
    try { data = await S.presentationGet(kit.dir); } catch (e) { toast(errText(e)); return; }
    if (!owns()) return;
    const values = { ...data.options }, edits = {}, previousFocus = document.activeElement;
    let timer = 0, version = 0, dirty = false, html = '', previewReady = false;
    const frame = el('iframe', { title: 'Presentation preview', sandbox: 'allow-scripts allow-popups allow-popups-to-escape-sandbox', allow: 'autoplay' });
    if (S.web) frame.src = 'viewer.html?frame';
    const status = el('p', { class: 'muted small', role: 'status' });
    const close = () => { if (dirty && !confirm('Close without saving presentation changes?')) return; version++; clearTimeout(timer); removeEventListener('message', ready); box.remove(); if (!S.web) S.studioClose(kit.dir).catch((e) => toast(errText(e))); previousFocus?.focus(); };
    const ready = (event) => {
      if (event.source === frame.contentWindow && event.data?.ready) { previewReady = true; if (html) frame.contentWindow.postMessage({ deck: html }, '*'); }
    };
    addEventListener('message', ready);
    const refresh = async () => {
      const current = ++version; status.textContent = 'Updating the preview…';
      try {
        const result = await S.presentationPreview(kit.dir, values, edits);
        if (current !== version || !box.isConnected) return;
        if (S.web) {
          html = result.html;
          if (previewReady) { previewReady = false; frame.src = 'viewer.html?frame&t=' + current; }
        } else frame.src = result.url;
        status.textContent = 'Use the arrow keys inside the preview to try the builds. Audio stays muted until you enable it.';
      } catch (e) { if (current === version) status.textContent = errText(e); }
    };
    const changed = () => { dirty = true; clearTimeout(timer); timer = setTimeout(refresh, 450); };
    const select = (key, label, options) => {
      const input = el('select', { id: 'presentation-' + key }, options.map(([value, name]) => el('option', { value, text: name })));
      input.value = values[key];
      input.onchange = () => { values[key] = input.value; changed(); };
      return el('div', { class: 'field' }, el('label', { for: input.id, text: label }), input);
    };
    const outline = data.outline || [], outlineList = el('ol', { class: 'presentation-outline' });
    const outlineStatus = el('p', { class: 'small muted', role: 'status', text: 'Move a section earlier or later, or leave it out without deleting it. The cover and next steps stay in place. Extra items continue on another slide. No AI is needed.' });
    const drawOutline = () => {
      outlineList.replaceChildren(...outline.map((row, index) => {
        const check = el('input', { type: 'checkbox', 'aria-label': 'Include ' + row.label }); check.checked = row.included; check.disabled = !row.removable;
        check.onchange = () => { row.included = check.checked; values.hiddenSlides = outline.filter((item) => !item.included).map((item) => item.key); changed(); };
        const move = (offset, direction) => el('button', { type: 'button', class: 'btn ghost', disabled: !row.removable || index + offset < 1 || index + offset >= outline.length - 1, 'data-direction': direction, 'aria-label': 'Move ' + row.label + ' ' + direction, onclick: () => {
          [outline[index], outline[index + offset]] = [outline[index + offset], outline[index]];
          values.slideOrder = outline.filter((item) => item.removable).map((item) => item.key);
          drawOutline(); changed(); outlineStatus.textContent = 'Moved ' + row.label + ' ' + direction + '.';
          const current = outlineList.querySelector('[data-slide="' + row.key + '"]'), button = current.querySelector('[data-direction="' + direction + '"]');
          (button.disabled ? current.querySelector('input') : button).focus();
        } }, direction === 'earlier' ? 'Earlier' : 'Later');
        return el('li', { 'data-slide': row.key },
          el('label', { class: 'check' }, check, el('span', { text: row.label + (row.pages > 1 ? ' (' + row.pages + ' slides)' : '') })),
          row.removable ? el('div', { class: 'actions' }, move(-1, 'earlier'), move(1, 'later')) : el('span', { class: 'small muted', text: 'Always included' }));
      }));
    };
    drawOutline();
    const file = el('input', { id: 'presentation-track', type: 'file', accept: '.mp3,.wav,.ogg,.m4a,audio/mpeg,audio/wav,audio/ogg,audio/mp4' });
    file.onchange = async () => {
      const picked = file.files[0]; if (!picked) return;
      if (picked.size > 10 * 1024 * 1024) { toast('Choose a music file under 10 MB.'); file.value = ''; return; }
      const types = { mp3: 'mpeg', wav: 'wav', ogg: 'ogg', m4a: 'mp4' }, type = types[picked.name.split('.').at(-1).toLowerCase()];
      if (!type) { toast('Choose an MP3, WAV, Ogg or M4A file.'); return; }
      try {
        const encoded = await new Promise((ok, bad) => { const reader = new FileReader(); reader.onload = () => ok(String(reader.result).split(',')[1]); reader.onerror = () => bad(new Error('The music file could not be read. Choose it again.')); reader.readAsDataURL(picked); });
        values.musicData = 'data:audio/' + type + ';base64,' + encoded; values.music = 'upload';
        box.querySelector('#presentation-music').value = 'upload'; changed();
      } catch (e) { toast(errText(e)); }
    };
    const seed = el('input', { id: 'presentation-seed', type: 'text', maxlength: '100', value: values.musicSeed });
    seed.oninput = () => { values.musicSeed = seed.value; changed(); };
    const volume = el('input', { id: 'presentation-volume', type: 'range', min: '0', max: '100', value: String(Math.round(values.volume * 100)) });
    volume.oninput = () => { values.volume = +volume.value / 100; changed(); };
    const words = data.fields.filter((f) => !f.key.startsWith('notes.')), notes = data.fields.filter((f) => f.key.startsWith('notes.'));
    const editFields = (fields) => fields.map((f) => {
      const input = el('textarea', { rows: f.limit > 1200 ? '4' : '2', maxlength: String(f.limit), 'aria-label': f.label }); input.value = f.value;
      input.oninput = () => { edits[f.key] = input.value; changed(); };
      return el('label', { class: 'field' }, el('span', { class: 'label', text: f.label }), input);
    });
    const save = el('button', { type: 'button', class: 'btn primary', onclick: async () => {
      save.disabled = true; clearTimeout(timer); ++version;
      try { await S.presentationSave(kit.dir, values, edits); dirty = false; toast('Saved the animated presentation. Existing PDF and PowerPoint copies are unchanged.'); close(); route(); }
      catch (e) { save.disabled = false; status.textContent = errText(e); }
    } }, 'Save presentation');
    const box = el('dialog', { class: 'presentation-options', 'aria-label': 'Presentation options' },
      el('header', {}, el('h2', { text: 'Presentation options' }), el('button', { type: 'button', class: 'btn ghost', onclick: close }, 'Close'), save),
      el('div', { class: 'presentation-columns' },
        el('div', { class: 'presentation-preview' }, frame, status),
        el('div', { class: 'presentation-fields' },
          outline.length ? el('details', {}, el('summary', {}, 'Arrange the slides'), outlineStatus, outlineList) : null,
          select('motion', 'Motion', [['full', 'Full'], ['calm', 'Calm'], ['off', 'Off']]),
          select('transition', 'Slide entrance', [['original', 'Original'], ['fade', 'Fade'], ['cut', 'Cut']]),
          select('pace', 'Animation pace', [['balanced', 'Balanced'], ['brisk', 'Brisk'], ['deliberate', 'Deliberate']]),
          select('builds', 'Advance by', [['step', 'Each build'], ['all', 'Whole slide']]),
          select('sound', 'Build sound', SOUNDS.map((s) => [s, s.charAt(0).toUpperCase() + s.slice(1)])),
          select('music', 'Background music', [['off', 'Off'], ['ambient', 'Generate a calm instrumental'], ['pulse', 'Generate a rhythmic instrumental'], ['upload', 'Use my music file']]),
          el('p', { class: 'small muted', text: 'Generated instrumentals use a local note-based composer, not a recorded song or a studio music model. Change the theme words to make another variation.' }),
          el('div', { class: 'field' }, el('label', { for: seed.id, text: 'Music theme words' }), seed),
          el('div', { class: 'field' }, el('label', { for: file.id, text: 'Your music file' }), file),
          el('div', { class: 'field' }, el('label', { for: volume.id, text: 'Starting volume' }), volume),
          el('p', { class: 'small muted', text: 'All sound is optional. The audience must press Enable audio. Uploaded music travels inside exported HTML decks; use only music you have permission to share. Current video and PowerPoint copies are silent.' }),
          words.length ? el('details', {}, el('summary', {}, 'Edit the words'), ...editFields(words)) : null,
          notes.length ? el('details', {}, el('summary', {}, 'Edit the talk track'), ...editFields(notes)) : null,
          el('p', { class: 'small muted', text: 'Changes apply to the animated deck only. Review facts, sources and text fit before presenting. Other saved documents are unchanged.' }))));
    box.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
    document.body.append(box); box.showModal(); refresh();
  };
  window.sharePresentation = (kit) => {
    const box = el('dialog', { class: 'presentation-share', 'aria-label': 'Share presentation' });
    const status = el('p', { role: 'status', class: 'small muted' });
    const share = (kind) => async (event) => {
      const button = event.currentTarget; button.disabled = true;
      try { const result = await S.presentationShare(kit.dir, kind); if (result.saved) { toast(kind === 'audience' ? 'Saved the audience deck without speaker notes.' : 'Saved the editable kit.'); box.close(); } }
      catch (e) { status.textContent = errText(e); } finally { button.disabled = false; }
    };
    box.append(el('h2', { text: 'Share presentation' }),
      el('p', {}, 'Audience decks include slides, animations and selected audio, but no speaker notes. Editable kits include the seller profile, prices, proof and speaker notes; review them before sharing. Internal assessments and cheat sheets are left out.'),
      el('p', { class: 'small muted', text: 'These are local files, not private links. Anyone receiving them can copy or modify them. There is no subscriber check, revocation or live collaboration.' }),
      el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn primary', onclick: share('audience') }, 'Save audience deck'),
        el('button', { type: 'button', class: 'btn ghost', onclick: share('editable') }, 'Save editable kit'),
        el('button', { type: 'button', class: 'btn ghost', onclick: () => box.close() }, 'Close')), status);
    box.addEventListener('close', () => box.remove()); document.body.append(box); box.showModal();
  };
})();
