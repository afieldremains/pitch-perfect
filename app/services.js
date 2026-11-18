'use strict';
(() => {
  pages.services = async () => {
    const owns = routeOwner(), draft = store.get('services.draft', {}) || {};
    let company, catalog, error = '';
    try { [company, catalog] = await Promise.all([window.activeCompany(), S.advertisingCatalog()]); }
    catch (e) { error = errText(e); }
    if (!owns()) return;
    const fields = {}, defaults = { business: company?.name || '', contact: '', email: company?.email || '', phone: company?.phone || '', website: company?.website || '', goal: '', budget: '', timing: '', notes: '', assets: '', ...draft };
    const field = (key, label, area = false, limit = 300) => {
      const node = el(area ? 'textarea' : 'input', { id: 'service-' + key, type: area ? null : key === 'email' ? 'email' : 'text', rows: area ? 4 : null, maxlength: String(limit) }); node.value = key === 'assets' && Array.isArray(defaults[key]) ? defaults[key].join('\n') : defaults[key];
      fields[key] = node; return el('div', { class: 'field' }, el('label', { for: node.id, text: label }), node);
    };
    const checks = (key, title, labels) => {
      const selected = new Set(draft[key] || (key === 'needs' ? labels : []));
      const group = el('fieldset', { class: 'service-checks' }, el('legend', { text: title }), labels.map((label) => {
        const check = el('input', { type: 'checkbox' }); check.checked = selected.has(label);
        check.onchange = () => check.checked ? selected.add(label) : selected.delete(label);
        return el('label', { class: 'check' }, check, label);
      }));
      fields[key] = selected; return group;
    };
    const info = el('p', { class: 'small muted', role: 'status' });
    const consent = el('input', { type: 'checkbox', id: 'service-consent' });
    const values = () => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value instanceof Set ? [...value] : key === 'assets' ? value.value.split(/\r?\n/).map((text) => text.trim()).filter(Boolean) : value.value]));
    const go = el('button', { type: 'button', class: 'btn primary', disabled: !catalog?.available, onclick: async () => {
      go.disabled = true; info.textContent = 'Opening secure checkout...';
      try {
        const result = await S.advertisingCheckout({ ...values(), consent: consent.checked });
        await S.openLink(result.url);
        info.textContent = 'Checkout opened in your browser. The payment provider confirms payment to Prio; returning here does not mark your order as paid.';
      } catch (e) { info.textContent = errText(e); } finally { go.disabled = !catalog?.available; }
    } }, 'Continue to secure payment');
    const formatter = catalog?.available ? new Intl.NumberFormat(undefined, { style: 'currency', currency: catalog.currency }) : null;
    const decimals = formatter ? (['isk', 'ugx'].includes(catalog.currency) ? 2 : formatter.resolvedOptions().maximumFractionDigits) : 2;
    const quote = formatter ? formatter.format(catalog.amount / 10 ** decimals) : 'Pricing to be confirmed';
    const wrap = el('div', { class: 'wrap narrow services' },
      el('div', { class: 'head' }, el('div', {}, el('h1', { text: 'Prio services' }), el('p', { class: 'muted', text: 'Let Prio Connect handle your advertising. Prepare one brief for the whole campaign.' }))),
      el('section', { class: 'card' }, el('h2', { text: 'Full-service advertising' }), el('p', { class: 'service-price', text: quote }),
        el('p', { text: catalog?.available ? catalog.description : error || catalog?.reason || 'Payment setup is not connected yet.' }),
        error ? el('button', { class: 'btn ghost', type: 'button', onclick: () => route() }, 'Try again') : null),
      el('section', { class: 'card' }, el('h2', { text: 'Your advertising brief' }),
        field('business', 'Business name', false, 100), field('contact', 'Contact name', false, 100), field('email', 'Contact email', false, 254), field('phone', 'Phone (optional)', false, 100), field('website', 'Business website (HTTPS, optional)', false, 2000),
        field('goal', 'What do you want to achieve?', true, 2000),
        checks('needs', 'What do you need?', ['Campaign strategy', 'Ad creative', 'Video ads', 'Landing page', 'Campaign setup', 'Reporting']),
        checks('channels', 'Channels you are considering', ['Facebook', 'Instagram', 'YouTube', 'LinkedIn', 'TikTok', 'Google Ads']),
        field('budget', 'Planned media budget (optional, not the payment amount)'), field('timing', 'Preferred timing (optional)'), field('notes', 'Anything Prio should know? (optional)', true, 6000),
        field('assets', 'Asset links (optional, one HTTPS link per line)', true, 16000),
        el('p', { class: 'small muted', text: 'Local ads and videos are not uploaded automatically. Add sharing links if Prio needs existing assets. Include only information you have permission to share.' }),
        catalog?.available ? el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn ghost', onclick: () => S.openLink(catalog.termsUrl) }, 'Service terms'),
          el('button', { type: 'button', class: 'btn ghost', onclick: () => S.openLink(catalog.privacyUrl) }, 'Privacy')) : null,
        el('label', { class: 'check' }, consent, 'I agree to send this brief and my contact details for this purchase and accept the published service terms.'),
        el('p', { class: 'small muted', text: "Payment happens on Stripe's hosted checkout, not inside PRIO. Work is released to Prio only after server-verified payment. No cards are stored in the app." }),
        el('div', { class: 'actions' }, go, el('button', { class: 'btn ghost', type: 'button', onclick: () => { store.set('services.draft', values()); info.textContent = 'Saved this brief on this device. Nothing was sent or charged.'; } }, 'Save brief on this device')), info));
    view.append(wrap);
  };
})();
