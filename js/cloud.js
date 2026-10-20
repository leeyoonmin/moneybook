/* ==========================================================================
   머니북 — Supabase cloud layer
   Local-first: the existing DB is the cache; mutations queue and flush.
   ========================================================================== */

import { DB } from './store.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const QUEUE_PREFIX = 'moneybook.queue.';
const CACHE_PREFIX = 'moneybook.cloud.';
const LAST_PREFIX = 'moneybook.synced.';
const ACTIVE_PREFIX = 'moneybook.activeHousehold.';
const REALTIME_DEBOUNCE = 800;

const clone = (o) => JSON.parse(JSON.stringify(o));
const nowIso = () => new Date().toISOString();
const uid = () => {
  try { return crypto.randomUUID(); } catch { return `op_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }
};

function makeClient() {
  try {
    const lib = window.supabase;
    if (!lib || typeof lib.createClient !== 'function') {
      throw new Error('Supabase SDK가 로드되지 않았어요');
    }
    return lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storageKey: 'moneybook.auth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  } catch (e) {
    console.error('[moneybook] Supabase init failed:', e);
    return null;
  }
}

export const Cloud = {
  client: makeClient(),
  session: null,
  user: null,
  householdId: null,
  household: null,
  role: null,
  memberships: [],
  members: [],
  status: 'idle',
  lastSynced: null,
  pending: 0,
  lastError: null,
  onData: null,
  onStatus: null,

  _queue: [],
  _flushing: false,
  _active: false,
  _channel: null,
  _pullTimer: null,

  /* ---------- auth ---------- */

  async init() {
    if (!this.client) {
      this.lastError = 'Supabase SDK를 불러오지 못했어요';
      return null;
    }
    try {
      const { data } = await this.client.auth.getSession();
      this.session = data?.session || null;
      this.user = this.session?.user || null;
    } catch (e) {
      this.lastError = e?.message || String(e);
    }

    this.client.auth.onAuthStateChange((event, session) => {
      this.session = session || null;
      this.user = session?.user || null;
      window.dispatchEvent(new CustomEvent('mb:auth', { detail: { event, user: this.user } }));
    });

    return this.user;
  },

  isSignedIn() { return Boolean(this.user); },

  async authSettings() {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: SUPABASE_ANON_KEY },
        cache: 'no-store'
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async signInWithGoogle() {
    if (!this.client) throw new Error('로그인 서비스를 사용할 수 없어요');
    const redirectTo = `${location.origin}${location.pathname}`;
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' }
      }
    });
    if (error) throw error;
  },

  async signOut() {
    this._stopRealtime();
    DB.setMutationHandler(null);
    this._queue = [];
    this._active = false;
    this.householdId = null;
    this.household = null;
    this.role = null;
    this.memberships = [];
    this.members = [];
    this.pending = 0;
    try { await this.client.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
    this.session = null;
    this.user = null;
  },

  /* ---------- households ---------- */

  async loadMemberships() {
    const { data, error } = await this.client
      .from('household_members')
      .select('household_id, role, joined_at, households(id, name, invite_code)')
      .eq('user_id', this.user.id)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    this.memberships = (data || []).map((row) => ({
      id: row.household_id,
      role: row.role,
      joinedAt: row.joined_at,
      name: row.households?.name || '가계부',
      inviteCode: row.households?.invite_code || ''
    }));

    try {
      localStorage.setItem(this._membershipsKey(), JSON.stringify(this.memberships));
    } catch { /* ignore */ }
    return this.memberships;
  },

  _membershipsKey() {
    return this.user ? `moneybook.memberships.${this.user.id}` : '';
  },

  cachedMemberships() {
    try {
      const raw = localStorage.getItem(this._membershipsKey());
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  activeHouseholdId() {
    if (!this.user) return null;
    const saved = localStorage.getItem(ACTIVE_PREFIX + this.user.id);
    if (saved && this.memberships.some((m) => m.id === saved)) return saved;
    return this.memberships[0]?.id || null;
  },

  async createHousehold(name) {
    const { data, error } = await this.client.rpc('create_household', { p_name: name });
    if (error) throw error;
    await this.loadMemberships();
    const id = typeof data === 'string' ? data : (data?.id || data?.[0]?.id);
    if (!id) throw new Error('가계부를 만들지 못했어요');
    return id;
  },

  async joinHousehold(code) {
    const { data, error } = await this.client.rpc('join_household', { p_code: code });
    if (error) {
      if (String(error.message || '').includes('INVALID_INVITE_CODE')) {
        throw new Error('초대 코드가 올바르지 않아요');
      }
      throw error;
    }
    await this.loadMemberships();
    return typeof data === 'string' ? data : (data?.id || data?.[0]?.id);
  },

  async activateHousehold(hid) {
    const membership = this.memberships.find((m) => m.id === hid) || this.memberships[0];
    if (!membership) throw new Error('가계부 멤버십이 없어요');

    this._stopRealtime();
    this.householdId = membership.id;
    this.household = { ...membership };
    this.role = membership.role;
    this.lastSynced = localStorage.getItem(LAST_PREFIX + membership.id);
    this._queue = this._readQueue();
    this._updatePending();

    const theme = DB.state.theme;
    const cacheKey = CACHE_PREFIX + membership.id;
    DB.useStorage(cacheKey, {
      v: 1,
      cloud: true,
      tx: [],
      cats: { expense: [], income: [] },
      budget: { monthly: {} },
      theme,
      created: Date.now()
    });
    if (DB.state.theme !== theme) DB.setTheme(theme);

    DB.setMutationHandler((op) => this.record(op));
    this._active = true;
    localStorage.setItem(ACTIVE_PREFIX + this.user.id, membership.id);

    this._startRealtime();
    this.onStatus?.(this.status);

    if (navigator.onLine) {
      if (this._queue.length) await this.flush();
      else await this.pull({ render: true });
    } else {
      this.status = 'offline';
      this.onStatus?.(this.status);
    }
  },

  async switchHousehold(hid) {
    if (hid === this.householdId) return;
    if (this._flushing || this.pending) {
      throw new Error('동기화가 끝난 뒤 가계부를 전환해 주세요');
    }
    await this.activateHousehold(hid);
    this.onData?.();
  },

  async refreshMembers() {
    if (!this.householdId) return [];
    const { data, error } = await this.client
      .from('household_members')
      .select('user_id, role, joined_at')
      .eq('household_id', this.householdId)
      .order('joined_at', { ascending: true });
    if (error) throw error;

    const ids = (data || []).map((m) => m.user_id);
    let profiles = [];
    if (ids.length) {
      const res = await this.client
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', ids);
      if (!res.error) profiles = res.data || [];
    }
    const byId = new Map(profiles.map((p) => [p.id, p]));
    this.members = (data || []).map((m) => ({
      id: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      name: byId.get(m.user_id)?.display_name || '이름 없음',
      avatar: byId.get(m.user_id)?.avatar_url || '',
      isMe: m.user_id === this.user?.id
    })).sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));
    return this.members;
  },

  async rotateInviteCode() {
    const { data, error } = await this.client.rpc('rotate_invite_code', { hid: this.householdId });
    if (error) throw error;
    if (this.household) this.household.inviteCode = data;
    const m = this.memberships.find((x) => x.id === this.householdId);
    if (m) m.inviteCode = data;
    return data;
  },

  async removeMember(userId) {
    const { error } = await this.client.rpc('remove_member', { hid: this.householdId, p_user: userId });
    if (error) throw error;
    await this.refreshMembers();
  },

  /* ---------- mutation queue ---------- */

  _readQueue() {
    if (!this.householdId) return [];
    try {
      const raw = localStorage.getItem(QUEUE_PREFIX + this.householdId);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  _saveQueue() {
    if (!this.householdId) return;
    try {
      localStorage.setItem(QUEUE_PREFIX + this.householdId, JSON.stringify(this._queue));
    } catch { /* storage full */ }
    this._updatePending();
  },

  _updatePending() {
    this.pending = this._queue.length;
    this.onStatus?.(this.status);
  },

  _keyOf(op) {
    if (op.entity === 'tx') return `tx:${op.data?.id || op.id}`;
    if (op.entity === 'category') {
      if (op.action === 'reorder') return `category:reorder:${op.type || ''}`;
      return `category:${op.data?.id || op.id}`;
    }
    if (op.entity === 'budget') return `budget:${op.month}`;
    return `${op.entity}:${op.action}`;
  },

  record(op) {
    if (!this._active || !this.householdId) return;

    const next = { ...op, opId: uid(), at: Date.now() };

    if (op.entity === 'tx' && op.action === 'clear') {
      this._queue = this._queue.filter((q) => q.entity !== 'tx');
      this._queue.push(next);
      this._saveQueue();
      this._scheduleFlush();
      return;
    }

    const key = this._keyOf(next);
    const previous = this._queue.filter((q) => this._keyOf(q) === key);
    this._queue = this._queue.filter((q) => this._keyOf(q) !== key);

    // Updating a row that has never reached the server must stay an INSERT.
    if (op.entity === 'tx' && op.action === 'update'
      && previous.some((q) => q.action === 'insert')) {
      next.action = 'insert';
    }

    // A row created offline and deleted before it ever synced needs no delete.
    if (op.entity === 'tx' && op.action === 'delete'
      && previous.some((q) => q.action === 'insert')) {
      this._saveQueue();
      return;
    }
    if (op.entity === 'category' && op.action === 'delete'
      && previous.some((q) => q.action === 'insert')) {
      this._saveQueue();
      return;
    }

    this._queue.push(next);
    this._saveQueue();
    this._scheduleFlush();
  },

  _scheduleFlush() {
    clearTimeout(this._flushTimer);
    this._flushTimer = setTimeout(() => { this.flush(); }, 450);
  },

  async flush({ silent = false } = {}) {
    if (!this._active || !this.householdId || !this.user) return false;
    if (!navigator.onLine) {
      this.status = 'offline';
      this.onStatus?.(this.status);
      return false;
    }
    if (this._flushing) return false;
    this._flushing = true;
    if (!silent) { this.status = 'syncing'; this.onStatus?.(this.status); }

    try {
      while (this._queue.length) {
        const op = this._queue[0];
        const result = await this._send(op);
        if (!result.ok) {
          if (result.retry) {
            this.status = 'offline';
            this.onStatus?.(this.status);
            return false;
          }
          this.lastError = result.error || '동기화 오류';
          this.status = 'error';
          this.onStatus?.(this.status);
          // Keep the op for a later retry instead of silently losing data.
          return false;
        }
        this._queue.shift();
        this._saveQueue();
      }

      localStorage.setItem(LAST_PREFIX + this.householdId, nowIso());
      this.lastSynced = localStorage.getItem(LAST_PREFIX + this.householdId);
      this.status = 'synced';
      this.lastError = null;
      this.onStatus?.(this.status);
      if (!silent) await this.pull({ render: true });
      return true;
    } catch (e) {
      this.lastError = e?.message || String(e);
      this.status = navigator.onLine ? 'error' : 'offline';
      this.onStatus?.(this.status);
      return false;
    } finally {
      this._flushing = false;
    }
  },

  async _send(op) {
    const hid = this.householdId;
    const txRow = (data) => ({
      id: data.id,
      household_id: hid,
      type: data.type,
      amount: Number(data.amount),
      category_id: data.catId || null,
      tx_date: data.date,
      memo: data.memo || '',
      method: data.method || '카드'
    });

    try {
      if (op.entity === 'tx') {
        if (op.action === 'insert') {
          let res = await this.client.from('transactions').insert(txRow(op.data));
          if (res.error?.code === '23505') {
            res = await this.client.from('transactions').update(txRow(op.data)).eq('id', op.data.id);
          }
          return this._result(res);
        }
        if (op.action === 'update') {
          return this._result(await this.client.from('transactions').update(txRow(op.data)).eq('id', op.data.id));
        }
        if (op.action === 'delete') {
          return this._result(await this.client.from('transactions')
            .update({ deleted_at: nowIso() })
            .eq('id', op.id)
            .eq('household_id', hid));
        }
        if (op.action === 'clear') {
          return this._result(await this.client.from('transactions')
            .update({ deleted_at: nowIso() })
            .eq('household_id', hid)
            .is('deleted_at', null));
        }
      }

      if (op.entity === 'category') {
        if (op.action === 'insert') {
          const row = {
            id: op.data.id,
            household_id: hid,
            type: op.data.type,
            name: op.data.name,
            color: op.data.color,
            sort_order: Number(op.data.sortOrder) || 0,
            is_fallback: Boolean(op.data.fallback)
          };
          let res = await this.client.from('categories').insert(row);
          if (res.error?.code === '23505') {
            res = await this.client.from('categories').update(row).eq('id', op.data.id);
          }
          return this._result(res);
        }
        if (op.action === 'delete') {
          return this._result(await this.client.rpc('delete_category', { p_category_id: op.id }));
        }
        if (op.action === 'reorder') {
          const ids = op.ids || [];
          for (let i = 0; i < ids.length; i += 1) {
            const res = await this.client.from('categories')
              .update({ sort_order: i })
              .eq('id', ids[i])
              .eq('household_id', hid);
            if (res.error) return this._result(res);
          }
          return { ok: true };
        }
      }

      if (op.entity === 'budget') {
        return this._result(await this.client.from('budgets').upsert({
          household_id: hid,
          month: op.month,
          amount: Number(op.amount) || 0
        }, { onConflict: 'household_id,month' }));
      }

      return { ok: false, retry: false, error: `알 수 없는 작업: ${op.entity}/${op.action}` };
    } catch (e) {
      const msg = e?.message || String(e);
      const offline = !navigator.onLine || /fetch|network|load failed|timed out/i.test(msg);
      return { ok: false, retry: offline, error: msg };
    }
  },

  _result(res) {
    if (!res?.error) return { ok: true };
    const err = res.error;
    const offline = /fetch|network|load failed|timed out|Failed to fetch/i.test(err.message || '');
    const auth = err.code === 'PGRST301' || err.status === 401;
    return { ok: false, retry: offline, error: err.message, auth };
  },

  /* ---------- pull ---------- */

  _mapTx(row) {
    return {
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      catId: row.category_id || '',
      date: row.tx_date,
      memo: row.memo || '',
      method: row.method || '카드',
      ts: Date.parse(row.updated_at || row.created_at) || Date.now()
    };
  },

  async pull({ render = false } = {}) {
    if (!this._active || !this.householdId || !this.user) return false;
    if (!navigator.onLine) {
      this.status = 'offline';
      this.onStatus?.(this.status);
      return false;
    }
    if (this._queue.length) {
      await this.flush({ silent: true });
      if (this._queue.length) return false;
    }

    try {
      const hid = this.householdId;
      const [txRes, catRes, budRes, hhRes] = await Promise.all([
        this.client.from('transactions')
          .select('id, type, amount, category_id, tx_date, memo, method, created_at, updated_at')
          .eq('household_id', hid)
          .is('deleted_at', null)
          .order('tx_date', { ascending: false }),
        this.client.from('categories')
          .select('id, type, name, color, sort_order, is_fallback')
          .eq('household_id', hid)
          .order('sort_order', { ascending: true }),
        this.client.from('budgets')
          .select('month, amount')
          .eq('household_id', hid),
        this.client.from('households')
          .select('id, name, invite_code')
          .eq('id', hid)
          .single()
      ]);

      const firstError = txRes.error || catRes.error || budRes.error || hhRes.error;
      if (firstError) throw firstError;

      const theme = DB.state.theme;
      const next = {
        v: 1,
        cloud: true,
        tx: (txRes.data || []).map((r) => this._mapTx(r)),
        cats: { expense: [], income: [] },
        budget: { monthly: {} },
        theme,
        created: DB.state.created
      };

      for (const c of catRes.data || []) {
        if (c.type !== 'expense' && c.type !== 'income') continue;
        next.cats[c.type].push({
          id: c.id,
          name: c.name,
          color: c.color,
          fallback: Boolean(c.is_fallback)
        });
      }
      for (const b of budRes.data || []) {
        next.budget.monthly[b.month] = Number(b.amount) || 0;
      }

      if (hid !== this.householdId) return false;
      DB.replaceState(next);
      if (hhRes.data) {
        this.household = {
          ...(this.household || {}),
          id: hhRes.data.id,
          name: hhRes.data.name,
          inviteCode: hhRes.data.invite_code
        };
        const m = this.memberships.find((x) => x.id === hid);
        if (m) {
          m.name = hhRes.data.name;
          m.inviteCode = hhRes.data.invite_code;
        }
      }

      localStorage.setItem(LAST_PREFIX + hid, nowIso());
      this.lastSynced = localStorage.getItem(LAST_PREFIX + hid);
      this.status = 'synced';
      this.lastError = null;
      this.onStatus?.(this.status);
      if (render) this.onData?.();
      return true;
    } catch (e) {
      this.lastError = e?.message || String(e);
      this.status = navigator.onLine ? 'error' : 'offline';
      this.onStatus?.(this.status);
      return false;
    }
  },

  /* ---------- realtime ---------- */

  _startRealtime() {
    if (!this.householdId || !this.user) return;
    const hid = this.householdId;
    this._channel = this.client
      .channel(`moneybook-${hid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `household_id=eq.${hid}` }, () => this._schedulePull())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `household_id=eq.${hid}` }, () => this._schedulePull())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `household_id=eq.${hid}` }, () => this._schedulePull())
      .subscribe();
  },

  _stopRealtime() {
    if (this._channel) {
      try { this.client.removeChannel(this._channel); } catch { /* ignore */ }
      this._channel = null;
    }
    clearTimeout(this._pullTimer);
  },

  _schedulePull() {
    clearTimeout(this._pullTimer);
    this._pullTimer = setTimeout(() => {
      if (document.hidden) return;
      if (this._queue.length) this.flush({ silent: true }).then(() => this.pull({ render: true }));
      else this.pull({ render: true });
    }, REALTIME_DEBOUNCE);
  },

  /* ---------- push subscriptions ---------- */

  async savePushSubscription({ endpoint, p256dh, auth, timezone }) {
    if (!this.client || !this.user) throw new Error('로그인이 필요해요');
    if (!endpoint || !p256dh || !auth) throw new Error('알림 구독 정보가 올바르지 않아요');
    const { error } = await this.client
      .from('push_subscriptions')
      .upsert({
        user_id: this.user.id,
        endpoint,
        p256dh,
        auth_key: auth,
        timezone: timezone || 'Asia/Seoul',
        enabled: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });
    if (error) throw error;
  },

  async removePushSubscription(endpoint) {
    if (!this.client || !this.user || !endpoint) return;
    const { error } = await this.client
      .from('push_subscriptions')
      .delete()
      .eq('user_id', this.user.id)
      .eq('endpoint', endpoint);
    if (error) throw error;
  },

  /* ---------- status text ---------- */

  statusLabel() {
    if (!navigator.onLine) return this.pending ? `오프라인 · ${this.pending}건 대기` : '오프라인';
    if (this.status === 'syncing') return '동기화 중…';
    if (this.status === 'error') return '동기화 오류';
    if (this.pending) return `${this.pending}건 대기`;
    if (!this.lastSynced) return '연결됨';
    const diff = Date.now() - Date.parse(this.lastSynced);
    if (diff < 60000) return '방금 동기화됨';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전 동기화`;
    return `${Math.floor(diff / 3600000)}시간 전 동기화`;
  }
};

window.addEventListener('online', () => {
  if (!Cloud._active) return;
  Cloud.flush();
});
window.addEventListener('offline', () => {
  if (!Cloud._active) return;
  Cloud.status = 'offline';
  Cloud.onStatus?.('offline');
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !Cloud._active) return;
  if (Cloud._queue.length) Cloud.flush();
  else Cloud.pull({ render: true });
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };
