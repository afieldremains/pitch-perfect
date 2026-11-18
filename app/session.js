'use strict';
(async () => {
  const api = window.studio, host = document.getElementById('access');
  const node = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === 'text') n.textContent = v; else n.setAttribute(k, v); }
    children.forEach((c) => { if (c) n.append(c); }); return n;
  };
  const message = (error) => String(error && error.message || error).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const load = (file) => new Promise((ok, bad) => {
    const s = document.createElement('script'); s.src = file; s.onload = ok; s.onerror = () => bad(new Error('Could not load ' + file + '. Reload the app to try again.')); document.head.append(s);
  });
  let starting = false, signup = false, status;
  async function enter(session) {
    if (starting) return; starting = true;
    window.prioSession = session;
    const files = ['plates.js', 'logo-schemes.js', 'marks.js', 'themes.js', 'app.js', 'deck-options.js', ...(api.web ? ['pages-web.js'] : ['../engine/provenance.js']), 'crm.js', 'targets.js', 'targets-page.js', 'company.js', 'make.js', 'publishing.js', 'services.js', 'compare.js', 'account-page.js', 'intro.js', 'buddy.js', 'home-games.js', 'home.js'];
    try {
      for (const file of files) await load(file);
      host.hidden = true; document.body.removeAttribute('data-locked');
      window.startPrio();
    } catch (e) { host.replaceChildren(node('h1', { text: 'The app could not open' }), node('p', { text: message(e), role: 'alert' }), node('a', { href: '', text: 'Reload the app' })); }
  }
  function draw() {
    const brand = document.querySelector('.brand .pmark').cloneNode(true);
    brand.setAttribute('width', '40'); brand.setAttribute('height', '50');
    const heading = node('h1', { text: signup ? 'Make it your workspace.' : 'Welcome to PRIO.' });
    const lead = node('p', { class: 'access-lead', text: signup ? 'Set up your account and the business you sell for.' : 'Sign in to pick up your work on this device.' });
    const form = node('form', { class: 'access-form' }), fields = {};
    const field = (name, label, type, opts = {}) => {
      const input = node('input', { id: 'access-' + name, name, type, ...opts });
      fields[name] = input;
      return node('div', { class: 'field' }, node('label', { for: input.id, text: label }), input);
    };
    if (signup) {
      form.append(field('email', 'Email', 'email', { required: '', maxlength: '160', autocomplete: 'email' }),
        field('username', 'Username', 'text', { required: '', minlength: '3', maxlength: '32', autocomplete: 'username', pattern: '[A-Za-z][A-Za-z0-9._\\-]{2,31}' }));
    } else form.append(field('identifier', 'Email or username', 'text', { required: '', maxlength: '160', autocomplete: 'username', autocapitalize: 'none' }));
    form.append(field('password', 'Password', 'password', { required: '', minlength: signup ? '12' : '1', maxlength: '128', autocomplete: signup ? 'new-password' : 'current-password' }));
    const reveal = node('button', { type: 'button', class: 'access-reveal', 'aria-pressed': 'false', text: 'Show password' });
    reveal.onclick = () => { const show = fields.password.type === 'password'; fields.password.type = show ? 'text' : 'password'; reveal.setAttribute('aria-pressed', String(show)); reveal.textContent = show ? 'Hide password' : 'Show password'; };
    form.append(reveal);
    if (signup) {
      form.append(node('p', { class: 'small muted', text: 'Use at least 12 characters. There is no email recovery for local accounts; keep your password in a password manager.' }));
      const choices = node('fieldset', { class: 'access-kind' }, node('legend', { text: 'How will you use PRIO?' }));
      for (const [value, label, detail] of [['personal', 'Personal', 'Your own workspace'], ['organization', 'Organization', 'A shared workspace on this device']]) {
        const radio = node('input', { type: 'radio', name: 'kind', value }); radio.checked = value === 'personal';
        choices.append(node('label', {}, radio, node('span', {}, node('b', { text: label }), node('span', { text: detail }))));
      }
      const organization = field('organization', 'Organization name', 'text', { maxlength: '100' }); organization.hidden = true;
      choices.onchange = () => { organization.hidden = form.elements.kind.value !== 'organization'; fields.organization.required = !organization.hidden; };
      form.append(choices, organization, node('h2', { text: 'Your business' }),
        node('p', { class: 'small muted', text: 'Your decks, ads and brand kits use this profile. Edit prices, proof, logo and more in My company later.' }),
        field('business', 'Business name', 'text', { required: '', maxlength: '100', autocomplete: 'organization' }),
        field('industry', 'Industry', 'text', { maxlength: '80', placeholder: 'For example, home services or consulting' }),
        field('offer', 'What do you offer?', 'text', { maxlength: '600' }),
        field('audience', 'Who are your customers?', 'text', { maxlength: '300' }));
      const details = node('details', { class: 'access-details' }, node('summary', { text: 'Business voice and colors' }),
        field('voice', 'How should your business sound?', 'text', { maxlength: '300', placeholder: 'For example, friendly and direct' }));
      const colors = node('div', { class: 'access-colors' });
      for (const [k, label, value] of [['brand', 'Brand', '#2656D9'], ['accent', 'Accent', '#FAC800'], ['dark', 'Dark', '#121218']]) colors.append(field(k, label, 'color', { value }));
      details.append(colors); form.append(details);
      if (status.legacyAvailable) {
        const adopt = node('input', { type: 'checkbox', name: 'adoptLegacy' });
        fields.adoptLegacy = adopt;
        form.append(node('label', { class: 'access-consent' }, adopt, node('span', { text: 'Use the existing unassigned kits, clients and settings on this device for this workspace. Files stay where they are. Leave unchecked to start separately.' })));
      }
    }
    const error = node('p', { class: 'access-error', role: 'alert', tabindex: '-1' }); error.hidden = true;
    const submit = node('button', { class: 'btn primary', type: 'submit', text: signup ? 'Create my workspace' : 'Sign in' });
    form.append(error, submit);
    form.onsubmit = async (e) => {
      e.preventDefault(); if (submit.disabled) return;
      submit.disabled = true; submit.textContent = signup ? 'Creating workspace...' : 'Signing in...'; error.hidden = true;
      const value = (k) => fields[k].value;
      try {
        const session = signup ? await api.accountSignup({
          email: value('email'), username: value('username'), password: value('password'),
          kind: form.elements.kind.value, organization: value('organization'), adoptLegacy: !!fields.adoptLegacy?.checked,
          business: { name: value('business'), industry: value('industry'), offer: value('offer'), audience: value('audience'), voice: value('voice'), colors: { brand: value('brand'), accent: value('accent'), dark: value('dark') } }
        }) : await api.accountLogin({ identifier: value('identifier'), password: value('password') });
        fields.password.value = ''; await enter(session);
      } catch (e) { error.textContent = message(e); error.hidden = false; error.focus(); submit.disabled = false; submit.textContent = signup ? 'Create my workspace' : 'Sign in'; }
    };
    const toggle = node('button', { class: 'btn ghost', type: 'button', text: signup ? 'I already have an account' : 'Create a local account' });
    toggle.onclick = () => { signup = !signup; draw(); document.querySelector('#access input').focus(); };
    const theme = node('button', { class: 'btn ghost', type: 'button', text: 'Switch light / dark' });
    theme.onclick = () => {
      window.prioAccessTheme = document.documentElement.dataset.theme === 'dark' ? 'studio' : 'dark'; document.documentElement.dataset.theme = window.prioAccessTheme;
      if (api.setTheme) { const mode = window.prioAccessTheme === 'dark' ? 'dark' : 'light', ground = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim(); Promise.resolve().then(() => api.setTheme(mode, ground)).catch(() => {}); }
    };
    host.replaceChildren(node('div', { class: 'access-sheet' }, node('div', { class: 'access-brand' }, brand, node('b', { text: 'PRIO' })), heading, lead, form, toggle,
      node('p', { class: 'access-local small muted', text: 'Local accounts only. No sync, email verification or password recovery. Your files are not encrypted by this login; protect this device with your operating-system account.' }), theme));
  }
  document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'studio';
  document.documentElement.dataset.motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'calm';
  try { status = await api.accountStatus(); if (status.session) await enter(status.session); else draw(); }
  catch (e) { host.replaceChildren(node('h1', { text: 'Local accounts could not open' }), node('p', { role: 'alert', text: message(e) }), node('a', { href: '', text: 'Reload the app' })); }
})();
