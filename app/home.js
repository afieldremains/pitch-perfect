'use strict';
// Home: the first page after sign-in. Three clear ways into the work, the current build if one is running, and an
// optional game against the guide. The game is chosen at random each time the app opens (never the same as last time)
// and keeps its state while you move around the app. It is a local strategy: offline, no AI service, nothing sent.
let homeGame = null;
try {
  const id = HomeGames.pickGame(store.get('home.lastGame', null));
  store.set('home.lastGame', id);
  homeGame = HomeGames.newGame(id);
} catch (e) { homeGame = null; }

const homeSay = (s) => {
  if (s.winner === 'you') return 'You win. Start a new game when you like.';
  if (s.winner === 'guide') return 'The guide wins this one. Start a new game when you like.';
  if (s.winner === 'draw') return 'A draw. Start a new game when you like.';
  const l = s.last;
  if (!l || l.who !== 'guide') return 'Your turn.';
  if (s.id === 'nim') return 'The guide took ' + l.move + '. ' + s.pile + ' left. Your turn.';
  if (s.id === 'connect4') return 'The guide dropped a disc in column ' + (l.move + 1) + '. Your turn.';
  return 'The guide played row ' + (Math.floor(l.move / 3) + 1) + ', column ' + (l.move % 3 + 1) + '. Your turn.';
};

function homeGameBoard(s, move) {
  const over = !!s.winner, inLine = (i) => !!(s.line && s.line.includes(i));
  if (s.id === 'nim') {
    return el('div', { class: 'home-nim' },
      el('p', { class: 'home-pile', text: s.pile + (s.pile === 1 ? ' stone left' : ' stones left') }),
      el('div', { class: 'home-stones', 'aria-hidden': 'true' }, Array.from({ length: s.pile }, () => el('i'))),
      el('div', { class: 'home-takes' }, [1, 2, 3].map((n) => el('button', {
        type: 'button', class: 'btn ghost', 'data-move': String(n), disabled: over || n > s.pile, onclick: () => move(n)
      }, 'Take ' + n))));
  }
  if (s.id === 'connect4') {
    const W = HomeGames.columns, H = HomeGames.rows;
    return el('div', { class: 'home-c4' }, Array.from({ length: W }, (_, c) => {
      const cells = Array.from({ length: H }, (_, r) => r * W + c), open = cells.filter((i) => !s.board[i]).length;
      const label = 'Column ' + (c + 1) + (open ? ', ' + open + ' open' : ', full') + '. Yours ' + cells.filter((i) => s.board[i] === 'X').length + ', guide ' + cells.filter((i) => s.board[i] === 'O').length + '.';
      return el('button', { type: 'button', class: 'home-col', 'data-move': String(c), 'aria-label': label, disabled: over || !open, onclick: () => move(c) },
        cells.map((i) => el('span', { class: 'home-disc' + (s.board[i] === 'X' ? ' you' : s.board[i] === 'O' ? ' guide' : '') + (inLine(i) ? ' win' : ''), 'aria-hidden': 'true' })));
    }));
  }
  return el('div', { class: 'home-ttt' }, s.board.map((v, i) => el('button', {
    type: 'button', class: 'home-cell' + (inLine(i) ? ' win' : ''), 'data-move': String(i), disabled: over || !!v,
    'aria-label': 'Row ' + (Math.floor(i / 3) + 1) + ', column ' + (i % 3 + 1) + ': ' + (v === 'X' ? 'yours' : v === 'O' ? 'the guide' : 'empty'),
    onclick: () => move(i)
  }, v)));
}

function homeGameRegion() {
  const box = el('section', { class: 'home-game', 'aria-labelledby': 'home-game-title' });
  const draw = (focusMove) => {
    const s = homeGame, info = HomeGames.GAMES.find((g) => g.id === s.id);
    const status = el('p', { class: 'home-status', role: 'status', 'aria-live': 'polite', text: homeSay(s) });
    const move = (m) => {
      const mine = HomeGames.play(homeGame, m); if (!mine) return;
      homeGame = mine.winner ? mine : HomeGames.reply(mine);
      draw(m);
    };
    const restart = el('button', { type: 'button', class: 'btn ghost', onclick: () => { homeGame = HomeGames.newGame(s.id); draw(); } }, 'New game');
    const other = el('button', { type: 'button', class: 'btn ghost', onclick: () => {
      const id = HomeGames.pickGame(s.id); store.set('home.lastGame', id); homeGame = HomeGames.newGame(id); draw();
    } }, 'Play a different game');
    box.replaceChildren(
      el('h2', { id: 'home-game-title', text: 'Play with your guide: ' + info.name }),
      el('p', { class: 'home-rules', text: info.rules }),
      status, homeGameBoard(s, move),
      el('div', { class: 'home-game-actions' }, restart, other),
      el('p', { class: 'home-note', text: 'The guide plays by fixed rules on this computer. It works offline and sends nothing anywhere.' }));
    if (focusMove == null) return;
    const again = box.querySelector('[data-move="' + focusMove + '"]:not([disabled])') || box.querySelector('[data-move]:not([disabled])');
    (homeGame.winner || !again ? restart : again).focus();
  };
  draw();
  return box;
}

// After an update, Home names what changed, once. The first-run tour records the version, so a new person never sees it.
const WHATS_NEW = { version: '0.39.0', items: [
  'Find targets, under Clients, asks five questions and lists the kinds of business most likely to need what you sell. It updates every week.',
  'The guide takes a different P form each time you open PRIO.',
  'While a kit builds, the screen shows which research stage is done, current or waiting.',
  'Business decks have an outline: move a section earlier or later, or leave it out, before you present.',
  'Ads come in a 4:5 portrait size, and tall ads keep words clear of the buttons phone apps place on top.'
] };
function whatsNewNote(version) {
  const v = String(version || '').split('-')[0], seen = String(store.get('whatsNew.seen', '') || '').split('-')[0];
  if (v !== WHATS_NEW.version || seen === v || !store.get('guide.toured', false)) return null;
  const title = 'New in ' + v;
  const note = el('section', { class: 'home-new', 'aria-label': title }, el('h2', { text: title }),
    el('ul', {}, ...WHATS_NEW.items.map((t) => el('li', { text: t }))),
    el('button', { type: 'button', class: 'btn ghost', onclick: () => {
      store.set('whatsNew.seen', v); note.remove(); const first = document.querySelector('.home-action'); if (first) first.focus();
    } }, 'Hide this note'));
  return note;
}
pages.home = async () => {
  const owns = routeOwner();
  const mark = document.querySelector('.rail .pmark');
  const build = el('p', { class: 'home-build', hidden: true }), news = el('div', { class: 'home-news' });
  const wrap = el('div', { class: 'wrap home-page' },
    el('header', { class: 'home-head' }, mark ? mark.cloneNode(true) : null,
      el('div', {}, el('h1', { text: 'Home' }), el('p', { class: 'home-lead', text: 'Research a new prospect, open a finished kit or follow up with a client.' }))),
    build, news,
    el('nav', { class: 'home-actions', 'aria-label': 'Start' },
      el('a', { class: 'home-action primary', href: '#new' }, el('b', { text: 'New prospect' }), el('span', { text: 'Research a business and build the meeting kit.' })),
      el('a', { class: 'home-action', href: '#library' }, el('b', { text: 'Library' }), el('span', { text: 'Open the kits you have built.' })),
      el('a', { class: 'home-action', href: '#crm' }, el('b', { text: 'Clients' }), el('span', { text: 'See follow-ups and notes.' }))),
    window.buddy ? el('p', { class: 'home-guide' }, el('button', { type: 'button', class: 'btn ghost', onclick: () => {
      dispatchEvent(new KeyboardEvent('keydown', { key: 'j', ctrlKey: true, bubbles: true }));
    } }, 'Ask the guide'), el('span', { class: 'muted', text: 'or press Ctrl+J' })) : null,
    homeGame && window.HomeGames ? homeGameRegion() : null);
  view.append(wrap);
  S.settings().then((s) => { if (owns()) { const note = whatsNewNote(s && s.version); if (note) news.replaceChildren(note); } }).catch(() => {});
  try {
    const st = await S.status(); if (!owns()) return;
    if (st && st.running) {
      build.replaceChildren(el('span', { text: 'Building the kit for ' + (st.name || 'your prospect') + '. It keeps building while you play or look around. ' }), el('a', { href: '#run', text: 'Watch the build' }));
      build.hidden = false;
    }
  } catch (e) { /* no build status: Home still works */ }
};
