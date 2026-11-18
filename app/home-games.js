// Three small turn-based games the guide plays on the Home page. Pure and local: no network, no model calls.
// Each state: { id, turn: 'you' | 'guide', winner: null | 'you' | 'guide' | 'draw', line: [cells] | null, last }.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HomeGames = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const GAMES = [
    { id: 'tictactoe', name: 'Tic-tac-toe', rules: 'Get three in a row. You are X and go first.' },
    { id: 'nim', name: 'Take-away', rules: 'Take 1, 2 or 3 stones on each turn. Whoever takes the last stone wins. You go first.' },
    { id: 'connect4', name: 'Four in a row', rules: 'Drop a disc into a column. Get four in a row in any direction. You go first.' }
  ];
  const ME = { you: 'X', guide: 'O' };

  const browserRandom = () => {
    const c = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto : null;
    return c ? c.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random();
  };
  const pickFrom = (list, random) => list[Math.min(list.length - 1, Math.floor((random || browserRandom)() * list.length))];

  // A different game from last time, chosen at random from the rest.
  function pickGame(previous, random) {
    const rest = GAMES.filter((g) => g.id !== previous);
    return pickFrom(rest, random).id;
  }

  // ---------- tic-tac-toe ----------
  const TTT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const tttLine = (b) => TTT_LINES.find(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d]) || null;
  function tttScore(b, mark, depth) {
    const l = tttLine(b);
    if (l) return b[l[0]] === mark ? 10 - depth : depth - 10;
    if (b.every(Boolean)) return 0;
    const other = mark === 'X' ? 'O' : 'X';
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = mark; best = Math.max(best, -tttScore(b, other, depth + 1)); b[i] = '';
    }
    return best;
  }

  // ---------- four in a row: 7 columns by 6 rows, row-major from the top ----------
  const W = 7, H = 6;
  const dropRow = (b, col) => { for (let r = H - 1; r >= 0; r--) if (!b[r * W + col]) return r; return -1; };
  function c4Line(b) {
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const m = b[r * W + c]; if (!m) continue;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const cells = [0, 1, 2, 3].map((k) => [r + dr * k, c + dc * k]);
        if (cells.every(([y, x]) => y >= 0 && y < H && x >= 0 && x < W && b[y * W + x] === m)) return cells.map(([y, x]) => y * W + x);
      }
    }
    return null;
  }
  function c4Heuristic(b, mark) {
    const other = mark === 'X' ? 'O' : 'X';
    let s = 0;
    for (let r = 0; r < H; r++) if (b[r * W + 3] === mark) s += 3; else if (b[r * W + 3] === other) s -= 3;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const er = r + dr * 3, ec = c + dc * 3;
      if (er >= H || ec < 0 || ec >= W) continue;
      let mine = 0, theirs = 0;
      for (let k = 0; k < 4; k++) { const v = b[(r + dr * k) * W + c + dc * k]; if (v === mark) mine++; else if (v === other) theirs++; }
      if (theirs === 0) s += mine === 3 ? 5 : mine === 2 ? 2 : 0;
      else if (mine === 0) s -= theirs === 3 ? 4 : 0;
    }
    return s;
  }
  const ORDER = [3, 2, 4, 1, 5, 0, 6];
  // Negamax with alpha-beta, a few plies deep: strong enough to win and block, still beatable.
  function c4Search(b, mark, depth, alpha, beta) {
    const other = mark === 'X' ? 'O' : 'X';
    const cols = ORDER.filter((c) => dropRow(b, c) >= 0);
    if (!cols.length) return { score: 0 };
    if (depth === 0) return { score: c4Heuristic(b, mark) };
    let best = { score: -Infinity, col: cols[0] };
    for (const c of cols) {
      const i = dropRow(b, c) * W + c;
      b[i] = mark;
      const score = c4Line(b) ? 100000 + depth : -c4Search(b, other, depth - 1, -beta, -alpha).score;
      b[i] = '';
      if (score > best.score) best = { score, col: c };
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  }

  // ---------- shared ----------
  function newGame(id, random) {
    if (id === 'nim') return { id, pile: pickFrom([13, 15, 17, 19, 21, 23], random), turn: 'you', winner: null, line: null, last: null };
    if (id === 'connect4') return { id, board: Array(W * H).fill(''), turn: 'you', winner: null, line: null, last: null };
    return { id: 'tictactoe', board: Array(9).fill(''), turn: 'you', winner: null, line: null, last: null };
  }

  function legalMoves(s) {
    if (!s || s.winner) return [];
    if (s.id === 'nim') return [1, 2, 3].filter((n) => n <= s.pile);
    if (s.id === 'connect4') return [0, 1, 2, 3, 4, 5, 6].filter((c) => dropRow(s.board, c) >= 0);
    return s.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  }

  // Apply a move for whoever's turn it is. Returns a new state, or null when the move is not allowed.
  function apply(s, move, who) {
    if (!s || s.winner || s.turn !== who || !legalMoves(s).includes(move)) return null;
    const next = who === 'you' ? 'guide' : 'you';
    if (s.id === 'nim') {
      const pile = s.pile - move;
      return Object.assign({}, s, { pile, turn: next, winner: pile === 0 ? who : null, last: { who, move } });
    }
    const board = s.board.slice();
    const cell = s.id === 'connect4' ? dropRow(board, move) * W + move : move;
    board[cell] = ME[who];
    const line = s.id === 'connect4' ? c4Line(board) : tttLine(board);
    const full = board.every(Boolean);
    return Object.assign({}, s, { board, turn: next, line, winner: line ? who : full ? 'draw' : null, last: { who, move, cell } });
  }
  const play = (s, move) => apply(s, move, 'you');

  // The guide's choice for the current state (it never reads anything you cannot see).
  function guideMove(s) {
    const moves = legalMoves(s);
    if (s.turn !== 'guide' || !moves.length) return null;
    if (s.id === 'nim') { const r = s.pile % 4; return r ? r : 1; }
    if (s.id === 'connect4') return c4Search(s.board.slice(), 'O', 5, -Infinity, Infinity).col;
    let best = moves[0], bestScore = -Infinity;
    const b = s.board.slice();
    for (const i of moves) {
      b[i] = 'O'; const sc = -tttScore(b, 'X', 1); b[i] = '';
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    return best;
  }
  const reply = (s) => apply(s, guideMove(s), 'guide') || s;

  return { GAMES, pickGame, newGame, legalMoves, play, guideMove, reply, random: browserRandom, columns: W, rows: H };
});
