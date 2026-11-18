'use strict';
(() => {
  const download = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type })), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  window.publishingOptions = (asset) => {
    const channels = ['Facebook', 'Instagram', 'YouTube', 'LinkedIn', 'TikTok', 'Google Ads'];
    const selected = new Set(), box = el('dialog', { class: 'presentation-share', 'aria-label': 'Posting options' });
    const message = el('p', { class: 'small muted', role: 'status' });
    const caption = el('textarea', { rows: '3', maxlength: '2200', 'aria-label': 'Posting caption', placeholder: 'Caption or campaign notes' });
    box.append(el('h2', { text: 'Posting through Prio Connect' }),
      el('p', {}, 'Prepare a posting brief for your ad, video or landing page. Managed posting is planned for launch; pricing is not set. Nothing is posted, scheduled, sent or charged here.'),
      el('p', { class: 'small muted', text: 'Live posting needs connected business accounts, an agreed price and your final approval. This file is a draft, not an order.' }),
      el('fieldset', {}, el('legend', {}, 'Channels'), ...channels.map((channel) => {
        const check = el('input', { type: 'checkbox' }); check.onchange = () => check.checked ? selected.add(channel) : selected.delete(channel);
        return el('label', { class: 'check' }, check, channel);
      })), el('label', { class: 'field' }, el('span', { class: 'label', text: 'Caption or campaign notes' }), caption),
      el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn primary', onclick: () => {
        if (!selected.size) { message.textContent = 'Choose at least one channel.'; return; }
        download('prio-posting-brief.json', JSON.stringify({ version: 1, status: 'draft-not-submitted', asset: { kind: String(asset.kind || 'asset'), title: String(asset.title || ''), reference: String(asset.id || asset.path || '') },
          channels: [...selected], caption: caption.value, managedBy: 'Prio Connect', price: null, approvedForPosting: false }, null, 2), 'application/json');
        message.textContent = 'Saved the draft posting brief. No posting request was sent.';
      } }, 'Save posting brief'), el('button', { type: 'button', class: 'btn ghost', onclick: () => { box.close(); location.hash = 'services'; } }, 'Prio advertising services'),
      el('button', { type: 'button', class: 'btn ghost', onclick: () => box.close() }, 'Close')), message);
    box.addEventListener('close', () => box.remove()); document.body.append(box); box.showModal();
  };
  pages.landing = async () => {
    const owns = routeOwner();
    let company;
    try { company = await window.activeCompany(); } catch (e) { toast(errText(e)); return; }
    if (!owns()) return;
    const fields = {}, defaults = { business: company.name || '', headline: '', offer: company.offer || '', cta: 'Get in touch', destination: company.website || (company.email ? 'mailto:' + company.email : ''), contact: company.email || company.phone || '', color: company.colors?.brand || '#2656D9' };
    const field = (key, label, type, limit) => {
      const input = el(type === 'textarea' ? 'textarea' : 'input', { id: 'landing-' + key, type: type === 'textarea' ? null : type || 'text', maxlength: String(limit), rows: type === 'textarea' ? '4' : null });
      input.value = defaults[key]; fields[key] = input;
      return el('label', { class: 'field' }, el('span', { class: 'label', text: label }), input);
    };
    const emptyPreview = el('p', { class: 'muted', text: 'Fill in the form, then choose Preview page.' });
    const preview = el('iframe', { title: 'Landing page preview', sandbox: 'allow-popups allow-popups-to-escape-sandbox', hidden: true });
    const status = el('p', { role: 'status', class: 'small muted' }); let result = null;
    const make = async () => {
      try { result = await S.landingBuild(Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value]))); preview.srcdoc = result.html; preview.hidden = false; emptyPreview.hidden = true; status.textContent = 'Preview ready. The action button uses your booking, email or phone link; this page is not hosted yet.'; save.disabled = false; }
      catch (e) { result = null; save.disabled = true; status.textContent = errText(e); }
    };
    const save = el('button', { class: 'btn ghost', type: 'button', disabled: true, onclick: async () => {
      if (!result) return;
      try {
        if (S.web) download('landing-page.html', result.html, 'text/html');
        else { const written = await S.landingExport(result.page); if (!written.saved) return; }
        toast('Saved the landing page. Upload it to your website host to publish.');
      } catch (e) { status.textContent = errText(e); }
    } }, 'Save HTML page');
    const invalidate = () => { result = null; save.disabled = true; status.textContent = 'Update the preview to use your changes.'; };
    const wrap = el('div', { class: 'wrap' }, el('div', { class: 'head' }, el('div', {}, el('h1', { text: 'Landing pages' }), el('p', { class: 'muted', text: 'One offer. One clear next step. A standalone page you can host anywhere.' }))),
      el('div', { class: 'landing-layout' }, el('section', { class: 'card' },
        field('business', 'Business name', 'text', 100), field('headline', 'Headline', 'text', 160), field('offer', 'What are you offering?', 'textarea', 1500),
        field('cta', 'Action button', 'text', 60), field('destination', 'Booking link, mailto: email or tel: phone', 'text', 2000), field('contact', 'Contact line', 'text', 300), field('color', 'Focus color', 'color', 7),
        el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'button', onclick: make }, 'Preview page'), save),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => window.publishingOptions({ kind: 'landing', title: fields.headline.value }) }, 'Publishing options'),
        status, el('p', { class: 'small muted', text: 'No fake lead form, tracking or made-up results. Use a booking link that already works. Hosting and conversion measurement are not included.' })),
        el('section', { class: 'card landing-preview' }, el('h2', { text: 'Preview' }), emptyPreview, preview)));
    Object.values(fields).forEach((input) => input.addEventListener('input', invalidate));
    view.append(wrap);
  };
})();
