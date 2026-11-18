'use strict';
(function (root) {
  const ITERATIONS = 600000;
  const text = (value, limit, label) => {
    if (typeof value !== 'string' || value.trim().length > limit || /[\u0000-\u001f]/.test(value)) throw new Error('Check ' + label + '.');
    return value.trim();
  };
  const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  class Accounts {
    constructor({ crypto, load, save, now = Date.now, lock = (fn) => fn() }) {
      this.crypto = crypto; this.load = load; this.save = save; this.now = now;
      this.lock = lock;
      this.current = null; this.pending = Promise.resolve();
    }
    queue(fn) {
      const task = this.pending.then(() => this.lock(fn));
      this.pending = task.catch(() => {});
      return task;
    }
    async database() {
      const db = await this.load();
      if (db == null) return { version: 1, users: [], workspaces: [], attempts: {} };
      if (db.version !== 1 || !Array.isArray(db.users) || !Array.isArray(db.workspaces) || !db.attempts) throw new Error('The local accounts file cannot be read. Restore it from a backup.');
      return db;
    }
    async hash(password, salt) {
      const key = await this.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      return hex(new Uint8Array(await this.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: ITERATIONS }, key, 256)));
    }
    async tokenHash(token) { return hex(new Uint8Array(await this.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))); }
    remember() {
      return this.queue(async () => {
        const session = this.requireSession(), db = await this.database();
        const token = hex(this.crypto.getRandomValues(new Uint8Array(32))), hash = await this.tokenHash(token);
        db.sessions = (db.sessions || []).filter((s) => s.expires > this.now());
        const expires = this.now() + 8 * 60 * 60 * 1000;
        db.sessions.push({ hash, userId: session.user.id, workspaceId: session.workspace.id, expires });
        await this.save(db); this.sessionHash = hash; this.expires = expires; return token;
      });
    }
    resume(token) {
      return this.queue(async () => {
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Sign in again to open this workspace.');
        const db = await this.database(), hash = await this.tokenHash(token);
        const saved = (db.sessions || []).find((s) => s.hash === hash && s.expires > this.now());
        const user = saved && db.users.find((u) => u.id === saved.userId);
        if (!user || !db.workspaces.some((w) => w.id === saved.workspaceId && w.members.some((m) => m.userId === user.id))) throw new Error('Your local session ended. Sign in again.');
        this.current = this.session(db, user, saved.workspaceId); this.sessionHash = hash; this.expires = saved.expires;
        return this.requireSession();
      });
    }
    session(db, user, workspaceId) {
      const workspaces = db.workspaces.filter((w) => w.members.some((m) => m.userId === user.id)).map((w) => ({
        id: w.id, kind: w.kind, name: w.name, legacy: !!w.legacy, business: w.business,
        role: w.members.find((m) => m.userId === user.id).role
      }));
      const workspace = workspaces.find((w) => w.id === workspaceId) || workspaces[0];
      if (!workspace) throw new Error('This account has no workspace. Ask its owner for access.');
      return { user: { id: user.id, username: user.username, email: user.email }, workspace, workspaces };
    }
    requireSession() {
      if (!this.current) throw new Error('Sign in to open your workspace.');
      if (this.expires && this.expires <= this.now()) {
        this.current = null; this.sessionHash = null; this.expires = null;
        throw new Error('Your local session ended. Sign in again.');
      }
      return structuredClone(this.current);
    }
    async status() {
      const db = await this.database();
      if (this.expires && this.expires <= this.now()) { this.current = null; this.sessionHash = null; this.expires = null; }
      return { session: this.current && this.requireSession(), legacyAvailable: !db.workspaces.some((w) => w.legacy) };
    }
    signup(input) {
      return this.queue(async () => {
        const db = await this.database();
        if (this.current) throw new Error('Sign out before creating another account.');
        const email = text(input.email, 160, 'your email').toLowerCase();
        const username = text(input.username, 32, 'your username').toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter your email address.');
        if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) throw new Error('Use 3 to 32 letters, numbers, dots, underscores or hyphens for your username. Start with a letter.');
        if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128) throw new Error('Use a password of 12 to 128 characters.');
        if (!['personal', 'organization'].includes(input.kind)) throw new Error('Choose a personal or organization workspace.');
        if (db.users.some((u) => u.email === email || u.username === username)) throw new Error('That email or username already has an account on this device. Sign in instead.');
        if (input.adoptLegacy != null && typeof input.adoptLegacy !== 'boolean') throw new Error('Choose whether to use the existing files.');
        if (input.adoptLegacy && db.workspaces.some((w) => w.legacy)) throw new Error('The existing files already belong to a workspace.');
        const b = input.business || {};
        const business = {
          name: text(b.name, 100, 'the business name'), industry: text(b.industry || '', 80, 'the industry'),
          offer: text(b.offer || '', 600, 'what you offer'), audience: text(b.audience || '', 300, 'your customers'),
          voice: text(b.voice || '', 300, 'the business voice'),
          colors: { brand: '#2656D9', accent: '#FAC800', dark: '#121218' }
        };
        if (!business.name) throw new Error('Enter the business name.');
        for (const k of Object.keys(business.colors)) {
          if (b.colors && b.colors[k] != null) {
            if (!/^#[a-f0-9]{6}$/i.test(b.colors[k])) throw new Error('Choose valid business colors.');
            business.colors[k] = b.colors[k].toUpperCase();
          }
        }
        const name = input.kind === 'organization' ? text(input.organization, 100, 'the organization name') : business.name;
        if (!name) throw new Error('Enter the organization name.');
        const salt = hex(this.crypto.getRandomValues(new Uint8Array(32)));
        const user = { id: this.crypto.randomUUID(), email, username, salt, hash: await this.hash(input.password, salt) };
        const workspace = { id: this.crypto.randomUUID(), kind: input.kind, name, business, legacy: input.adoptLegacy === true, members: [{ userId: user.id, role: 'owner' }] };
        db.users.push(user); db.workspaces.push(workspace);
        await this.save(db);
        this.current = this.session(db, user, workspace.id);
        return this.requireSession();
      });
    }
    login(input) {
      return this.queue(async () => {
        if (this.current) throw new Error('Sign out before signing in to another account.');
        const identifier = text(input.identifier, 160, 'your email or username').toLowerCase();
        if (!identifier || typeof input.password !== 'string' || input.password.length > 128) throw new Error('Enter your email or username and password.');
        const db = await this.database(), user = db.users.find((u) => u.email === identifier || u.username === identifier);
        const attemptKey = user ? user.id : 'unknown';
        const attempt = db.attempts[attemptKey] || { count: 0, until: 0 };
        if (attempt.until > this.now()) throw new Error('Wait one minute before trying to sign in again.');
        const actual = await this.hash(input.password, user ? user.salt : 'local-account-not-found');
        let difference = 0;
        const expected = user ? user.hash : '0'.repeat(64);
        for (let i = 0; i < 64; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
        if (!user || difference !== 0) {
          const count = attempt.until ? 1 : attempt.count + 1;
          db.attempts[attemptKey] = { count, until: count >= 5 ? this.now() + 60000 : 0 };
          await this.save(db);
          throw new Error('The email, username or password did not match a local account.');
        }
        delete db.attempts[attemptKey]; await this.save(db);
        this.current = this.session(db, user);
        return this.requireSession();
      });
    }
    logout() {
      return this.queue(async () => {
        if (this.sessionHash) {
          const db = await this.database(); db.sessions = (db.sessions || []).filter((s) => s.hash !== this.sessionHash); await this.save(db);
        }
        this.current = null; this.sessionHash = null; this.expires = null; return true;
      });
    }
    switchWorkspace(id) {
      return this.queue(async () => {
        const session = this.requireSession(), db = await this.database();
        if (typeof id !== 'string' || !session.workspaces.some((w) => w.id === id)) throw new Error('This account does not have access to that workspace.');
        if (this.sessionHash) { const saved = (db.sessions || []).find((s) => s.hash === this.sessionHash); if (saved) saved.workspaceId = id; await this.save(db); }
        this.current = this.session(db, db.users.find((u) => u.id === session.user.id), id);
        return this.requireSession();
      });
    }
    addMember(identifier) {
      return this.queue(async () => {
        const session = this.requireSession();
        if (session.workspace.kind !== 'organization') throw new Error('Members can only be added to an organization.');
        if (session.workspace.role !== 'owner') throw new Error('Only the organization owner can give someone access.');
        identifier = text(identifier, 160, 'the member email or username').toLowerCase();
        const db = await this.database(), user = db.users.find((u) => u.username === identifier || u.email === identifier);
        if (!user) throw new Error('That account is not on this device. Have them create an account here first, then add them.');
        const workspace = db.workspaces.find((w) => w.id === session.workspace.id);
        if (!workspace.members.some((m) => m.userId === user.id)) workspace.members.push({ userId: user.id, role: 'member' });
        await this.save(db);
        return { username: user.username };
      });
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { Accounts };
  else root.PrioAccounts = { Accounts };
})(globalThis);
