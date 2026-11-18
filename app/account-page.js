'use strict';
pages.account = async () => {
  const owns = routeOwner(), status = await S.accountStatus(); if (!owns()) return;
  const session = status.session;
  if (!session) { location.reload(); return; }
  const wrap = el('div', { class: 'wrap narrow account-page' });
  const problem = el('p', { role: 'alert', class: 'access-error', hidden: true });
  const act = (fn) => async (e) => {
    const b = e.currentTarget; b.disabled = true; problem.hidden = true;
    try { await fn(); } catch (err) { problem.textContent = errText(err); problem.hidden = false; } finally { b.disabled = false; }
  };
  const workspace = el('select', { id: 'account-workspace' }, session.workspaces.map((w) => el('option', { value: w.id, text: w.name + (w.kind === 'organization' ? ' (organization)' : ' (personal)') })));
  workspace.value = session.workspace.id;
  const controls = el('div', { class: 'actions' }, workspace, el('button', { class: 'btn ghost', type: 'button', onclick: act(async () => { await S.accountSwitch(workspace.value); location.reload(); }) }, 'Open workspace'));
  wrap.append(el('h1', { text: 'Account' }), el('p', { text: session.user.username + ' / ' + session.user.email }),
    el('section', { class: 'card' }, el('h2', { text: session.workspace.name }), el('p', { class: 'muted', text: 'A ' + session.workspace.kind + ' workspace on this device. Your role: ' + session.workspace.role + '.' }),
      el('label', { for: 'account-workspace', text: 'Your workspaces' }), controls, el('a', { class: 'btn ghost', href: '#company' }, 'Edit the business profile')));
  if (session.workspace.kind === 'organization' && session.workspace.role === 'owner') {
    const member = el('input', { id: 'account-member', type: 'text', autocomplete: 'off', maxlength: '160' });
    wrap.append(el('section', { class: 'card' }, el('h2', { text: 'Give someone access' }),
      el('p', { class: 'muted', text: 'They must create their own local account on this device first. This gives them access to all work in this organization; it does not send an email or sync another computer.' }),
      el('label', { for: 'account-member', text: 'Their email or username' }), member,
      el('button', { class: 'btn ghost', type: 'button', onclick: act(async () => { const result = await S.accountAddMember(member.value); member.value = ''; toast('Gave ' + result.username + ' access to this organization.'); }) }, 'Give workspace access')));
  }
  wrap.append(problem, el('p', { class: 'muted', text: 'These accounts stay on this device. They do not encrypt the saved files. Keep this device and its backups private. There is no email verification or password recovery.' }),
    el('button', { class: 'btn primary', type: 'button', onclick: act(async () => { await S.accountLogout(); location.reload(); }) }, 'Sign out'));
  view.append(wrap);
};
