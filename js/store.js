/* ==========================================================================
   머니북 — data layer (localStorage, no server)
   ========================================================================== */

const GUEST_KEY = 'moneybook.v1';
let STORAGE_KEY = GUEST_KEY;

export const METHODS = ['카드', '현금', '계좌이체', '기타'];

export const CAT_COLORS = [
  '#E4552D', '#C98A2E', '#3B6FE0', '#4C9A6A', '#B4559B',
  '#3E9E9E', '#7A63C9', '#8A7A5C', '#6B8E23', '#D06A8E'
];

const DEFAULT_CATS = {
  expense: [
    { id: 'food', name: '식비', color: '#E4552D' },
    { id: 'cafe', name: '카페·간식', color: '#C98A2E' },
    { id: 'transport', name: '교통', color: '#3B6FE0' },
    { id: 'living', name: '생활', color: '#4C9A6A' },
    { id: 'shopping', name: '쇼핑', color: '#B4559B' },
    { id: 'health', name: '건강', color: '#3E9E9E' },
    { id: 'culture', name: '문화', color: '#7A63C9' },
    { id: 'housing', name: '주거·통신', color: '#8A7A5C' },
    { id: 'etc', name: '기타', color: '#83827A', fallback: true }
  ],
  income: [
    { id: 'salary', name: '급여', color: '#1E7A58' },
    { id: 'side', name: '부수입', color: '#3E9E9E' },
    { id: 'etc', name: '기타수입', color: '#83827A', fallback: true }
  ]
};

export const pad2 = (n) => String(n).padStart(2, '0');
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const ymOf = (dateStr) => String(dateStr).slice(0, 7);
export const currentYm = () => ymOf(todayStr());
export const monthLabel = (ym) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5, 7))}월`;
export const shortMonth = (ym) => `${Number(ym.slice(5, 7))}월`;
export const dateLabel = (ymd) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8, 10))}일`;
export const weekdayLabel = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
};

export function addMonths(ym, delta) {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7)) - 1 + delta;
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export const fmt = (n) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(n) || 0));
export const won = (n) => `₩${fmt(Math.abs(Number(n) || 0))}`;

const uid = () => {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; }
};

const clone = (o) => JSON.parse(JSON.stringify(o));

function defaultState(cloud = false) {
  return {
    v: 1,
    cloud,
    tx: [],
    cats: clone(DEFAULT_CATS),
    budget: { monthly: {} },
    theme: 'system',
    created: Date.now()
  };
}

function normalize(raw) {
  const cloud = Boolean(raw?.cloud);
  const base = defaultState(cloud);
  if (!raw || typeof raw !== 'object') return base;

  const out = { ...base };
  out.v = 1;
  out.cloud = cloud;
  out.theme = ['system', 'light', 'dark'].includes(raw.theme) ? raw.theme : 'system';
  out.created = Number(raw.created) || base.created;

  // categories
  const cats = { expense: [], income: [] };
  for (const type of ['expense', 'income']) {
    const list = raw?.cats?.[type];
    if (Array.isArray(list)) {
      for (const c of list) {
        if (!c || typeof c.id !== 'string' || typeof c.name !== 'string') continue;
        if (cats[type].some((x) => x.id === c.id)) continue;
        cats[type].push({
          id: c.id,
          name: c.name.slice(0, 12),
          color: /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : CAT_COLORS[0],
          fallback: Boolean(c.fallback || c.isFallback || c.id === 'etc')
        });
      }
    }
    // Guest/local mode always has the built-in set. Cloud mode relies on the
    // categories seeded by create_household() and pulled from Supabase.
    if (!cloud) {
      for (const fallback of DEFAULT_CATS[type]) {
        if (!cats[type].some((x) => x.id === fallback.id)) cats[type].push({ ...fallback });
      }
      if (!cats[type].some((x) => x.id === 'etc')) {
        cats[type].push({ id: 'etc', name: type === 'expense' ? '기타' : '기타수입', color: '#83827A', fallback: true });
      }
    }
  }
  out.cats = cats;

  // transactions
  if (Array.isArray(raw.tx)) {
    out.tx = raw.tx
      .filter((t) => t && (t.type === 'expense' || t.type === 'income'))
      .filter((t) => Number.isFinite(Number(t.amount)) && Number(t.amount) > 0)
      .filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(String(t.date)))
      .map((t) => ({
        id: typeof t.id === 'string' && t.id ? t.id : uid(),
        type: t.type,
        amount: Math.round(Number(t.amount)),
        catId: typeof t.catId === 'string' ? t.catId : 'etc',
        date: String(t.date),
        memo: typeof t.memo === 'string' ? t.memo.slice(0, 60) : '',
        method: METHODS.includes(t.method) ? t.method : '기타',
        ts: Number(t.ts) || Date.now()
      }));
  }

  // budget (per-month; no implicit carry-over)
  const budget = { monthly: {} };
  if (raw?.budget?.monthly && typeof raw.budget.monthly === 'object') {
    for (const [k, v] of Object.entries(raw.budget.monthly)) {
      if (/^\d{4}-\d{2}$/.test(k) && Number(v) >= 0) budget.monthly[k] = Math.round(Number(v));
    }
  }
  out.budget = budget;

  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalize(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

let state = load();
let mutationHandler = null;

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function notify(op) {
  if (typeof mutationHandler !== 'function') return;
  try { mutationHandler(op); } catch { /* sync must never break the UI */ }
}

function sortTx(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.ts || 0) - (a.ts || 0);
}

export const DB = {
  get state() { return state; },
  get categories() { return state.cats; },
  get storageKey() { return STORAGE_KEY; },

  useStorage(key, seedState) {
    STORAGE_KEY = key;
    let raw = null;
    try { raw = localStorage.getItem(key); } catch { /* ignore */ }
    if (raw) {
      try {
        state = normalize(JSON.parse(raw));
      } catch {
        state = normalize(seedState || defaultState(key !== GUEST_KEY));
      }
    } else {
      state = normalize(seedState || defaultState(key !== GUEST_KEY));
    }
    save();
    return state;
  },

  replaceState(next) {
    state = normalize(next);
    save();
    return state;
  },

  snapshot() { return clone(state); },

  setMutationHandler(fn) { mutationHandler = typeof fn === 'function' ? fn : null; },

  cats(type) { return state.cats[type] || []; },

  cat(type, id) {
    const list = state.cats[type] || [];
    return list.find((c) => c.id === id)
      || list.find((c) => c.fallback)
      || list.find((c) => c.id === 'etc')
      || { id: '', name: '기타', color: '#83827A', fallback: true };
  },

  monthTx(ym) {
    return state.tx.filter((t) => t.date.startsWith(ym)).sort(sortTx);
  },

  allTx() { return [...state.tx].sort(sortTx); },

  txById(id) { return state.tx.find((t) => t.id === id) || null; },

  summary(list) {
    const out = { income: 0, expense: 0, count: list.length, byCat: {} };
    for (const t of list) {
      out[t.type] += t.amount;
      const k = `${t.type}:${t.catId}`;
      out.byCat[k] = (out.byCat[k] || 0) + t.amount;
    }
    return out;
  },

  byCategory(list, type) {
    const sum = DB.summary(list.filter((t) => t.type === type));
    const total = sum[type] || 0;
    const items = (state.cats[type] || []).map((c) => {
      const value = sum.byCat[`${type}:${c.id}`] || 0;
      return { ...c, value, pct: total ? (value / total) * 100 : 0 };
    }).filter((c) => c.value > 0);
    return { total, items: items.sort((a, b) => b.value - a.value) };
  },

  addTx(t) {
    const tx = { ...t, id: uid(), ts: Date.now() };
    state.tx.push(tx);
    save();
    notify({ entity: 'tx', action: 'insert', data: clone(tx) });
    return tx;
  },

  updateTx(id, patch) {
    const i = state.tx.findIndex((t) => t.id === id);
    if (i < 0) return null;
    state.tx[i] = { ...state.tx[i], ...patch, id, ts: Date.now() };
    save();
    notify({ entity: 'tx', action: 'update', data: clone(state.tx[i]) });
    return state.tx[i];
  },

  deleteTx(id) {
    const before = state.tx.length;
    state.tx = state.tx.filter((t) => t.id !== id);
    save();
    if (state.tx.length !== before) notify({ entity: 'tx', action: 'delete', id });
    return state.tx.length !== before;
  },

  budgetFor(ym) {
    const b = state.budget.monthly[ym];
    return Number.isFinite(b) ? b : 0;
  },

  setBudget(ym, amount) {
    const n = Math.max(0, Math.round(Number(amount) || 0));
    if (ym) state.budget.monthly[ym] = n;
    save();
    if (ym) notify({ entity: 'budget', action: 'set', month: ym, amount: n });
    return n;
  },

  addCategory(type, name, color) {
    const clean = String(name || '').trim().slice(0, 10);
    if (!clean) return null;
    if ((state.cats[type] || []).some((c) => c.name === clean)) return null;
    const cat = { id: uid(), name: clean, color: color || CAT_COLORS[0], fallback: false };
    state.cats[type].push(cat);
    save();
    notify({
      entity: 'category',
      action: 'insert',
      data: { ...clone(cat), type, sortOrder: state.cats[type].length - 1 }
    });
    return cat;
  },

  categoryUsage(type, id) {
    return state.tx.filter((t) => t.type === type && t.catId === id).length;
  },

  deleteCategory(type, id) {
    const list = state.cats[type] || [];
    const cat = list.find((c) => c.id === id);
    if (!cat || cat.fallback || id === 'etc') return false;
    const fallback = list.find((c) => c.fallback) || list.find((c) => c.id === 'etc') || null;
    state.cats[type] = list.filter((c) => c.id !== id);
    for (const t of state.tx) {
      if (t.type === type && t.catId === id) t.catId = fallback ? fallback.id : '';
    }
    save();
    notify({ entity: 'category', action: 'delete', id, type });
    return true;
  },

  reorderCategories(type, ids) {
    const list = state.cats[type] || [];
    const byId = new Map(list.map((c) => [c.id, c]));
    const next = [];
    for (const id of ids) {
      const cat = byId.get(id);
      if (cat) {
        next.push(cat);
        byId.delete(id);
      }
    }
    for (const cat of byId.values()) next.push(cat);
    state.cats[type] = next;
    save();
    notify({ entity: 'category', action: 'reorder', ids: next.map((c) => c.id), type });
  },

  setTheme(theme) {
    state.theme = ['system', 'light', 'dark'].includes(theme) ? theme : 'system';
    save();
  },

  trend(type, endYm, count = 6) {
    const months = [];
    for (let i = count - 1; i >= 0; i -= 1) {
      const ym = addMonths(endYm, -i);
      const total = state.tx
        .filter((t) => t.type === type && t.date.startsWith(ym))
        .reduce((a, t) => a + t.amount, 0);
      months.push({ ym, label: shortMonth(ym), value: total });
    }
    return months;
  },

  prevMonthTotal(type, ym) {
    const prev = addMonths(ym, -1);
    return state.tx.filter((t) => t.type === type && t.date.startsWith(prev)).reduce((a, t) => a + t.amount, 0);
  },

  exportData() {
    return {
      app: 'moneybook',
      version: 1,
      exportedAt: new Date().toISOString(),
      tx: state.tx,
      cats: state.cats,
      budget: state.budget,
      theme: state.theme
    };
  },

  importData(payload) {
    let incoming = payload;
    const addedCats = [];
    if (incoming && !Array.isArray(incoming) && Array.isArray(incoming.tx)) {
      if (incoming.cats) {
        for (const type of ['expense', 'income']) {
          for (const c of incoming.cats?.[type] || []) {
            if (!c || typeof c.id !== 'string') continue;
            if (!state.cats[type].some((x) => x.id === c.id)) {
              const cat = {
                id: c.id,
                name: String(c.name || '기타').slice(0, 10),
                color: /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '#83827A',
                fallback: Boolean(c.fallback)
              };
              state.cats[type].push(cat);
              addedCats.push({ ...cat, type, sortOrder: state.cats[type].length - 1 });
            }
          }
        }
      }
      if (incoming.budget?.monthly) {
        for (const [k, v] of Object.entries(incoming.budget.monthly)) {
          if (/^\d{4}-\d{2}$/.test(k) && Number(v) >= 0 && state.budget.monthly[k] == null) {
            state.budget.monthly[k] = Math.round(Number(v));
            notify({ entity: 'budget', action: 'set', month: k, amount: state.budget.monthly[k] });
          }
        }
      }
    } else if (Array.isArray(incoming)) {
      incoming = { tx: incoming };
    } else {
      throw new Error('형식이 올바르지 않아요');
    }

    for (const c of addedCats) {
      notify({ entity: 'category', action: 'insert', data: clone(c) });
    }

    const known = new Set(state.tx.map((t) => t.id));
    let added = 0;
    let skipped = 0;

    for (const t of incoming.tx || []) {
      const ok = t && (t.type === 'expense' || t.type === 'income')
        && Number(t.amount) > 0
        && /^\d{4}-\d{2}-\d{2}$/.test(String(t.date));
      if (!ok) { skipped += 1; continue; }
      const id = typeof t.id === 'string' && t.id ? t.id : uid();
      if (known.has(id)) { skipped += 1; continue; }
      const tx = {
        id,
        type: t.type,
        amount: Math.round(Number(t.amount)),
        catId: typeof t.catId === 'string' ? t.catId : (state.cats[t.type].find((c) => c.fallback)?.id || ''),
        date: String(t.date),
        memo: typeof t.memo === 'string' ? t.memo.slice(0, 60) : '',
        method: METHODS.includes(t.method) ? t.method : '기타',
        ts: Number(t.ts) || Date.now()
      };
      state.tx.push(tx);
      notify({ entity: 'tx', action: 'insert', data: clone(tx) });
      known.add(id);
      added += 1;
    }

    if (added) save();
    return { added, skipped };
  },

  clearTransactions() {
    const n = state.tx.length;
    state.tx = [];
    save();
    if (n) notify({ entity: 'tx', action: 'clear' });
    return n;
  },

  resetAll() {
    state = defaultState(false);
    save();
  },

  seedSample() {
    if (state.cloud) return 0;
    if (state.tx.length) return 0;
    const now = new Date();
    const thisYm = currentYm();
    const today = now.getDate();
    const rows = [];
    const variable = [
      [2, 'cafe', 6300, '아메리카노', '카드'],
      [3, 'food', 8900, '김밥과 라면', '카드'],
      [4, 'transport', 1550, '지하철', '카드'],
      [6, 'food', 32000, '성수동 파스타', '카드'],
      [7, 'living', 12400, '다이소 생활용품', '현금'],
      [8, 'culture', 15000, '영화 관람', '카드'],
      [9, 'food', 23000, '배달 치킨', '카드'],
      [11, 'shopping', 68400, '무신사 셔츠', '카드'],
      [12, 'cafe', 5500, '동네 카페', '현금'],
      [13, 'health', 7200, '약국', '카드'],
      [14, 'food', 9000, '회사 근처 백반', '카드'],
      [15, 'transport', 12400, '택시', '카드'],
      [16, 'living', 8000, '세탁소', '현금'],
      [17, 'cafe', 4800, '아이스 라떼', '카드'],
      [18, 'food', 18500, '퇴근길 국밥', '카드']
    ];

    for (let mi = 5; mi >= 0; mi -= 1) {
      const ym = addMonths(thisYm, -mi);
      const [y, m] = ym.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const cap = mi === 0 ? today : lastDay;
      const dayOk = (d) => d <= cap;
      const factor = 0.72 + ((mi * 7 + 3) % 5) * 0.13;

      state.budget.monthly[ym] = 2000000;

      if (dayOk(10)) rows.push({ type: 'income', catId: 'salary', amount: 3200000, date: `${ym}-10`, memo: '월급', method: '계좌이체' });
      if (dayOk(5)) rows.push({ type: 'expense', catId: 'housing', amount: 650000, date: `${ym}-05`, memo: '월세', method: '계좌이체' });
      if (dayOk(12)) rows.push({ type: 'expense', catId: 'housing', amount: 55000, date: `${ym}-12`, memo: '통신비', method: '카드' });
      if (dayOk(15)) rows.push({ type: 'expense', catId: 'housing', amount: 118000, date: `${ym}-15`, memo: '관리비', method: '계좌이체' });
      if (mi === 4 && dayOk(22)) rows.push({ type: 'income', catId: 'side', amount: 250000, date: `${ym}-22`, memo: '외주 작업', method: '계좌이체' });
      if (mi === 5 && dayOk(27)) rows.push({ type: 'expense', catId: 'etc', amount: 50000, date: `${ym}-27`, memo: '친구 결혼식', method: '계좌이체' });

      for (const [day, catId, amount, memo, method] of variable) {
        if (!dayOk(day)) continue;
        const jitter = ((day * 13 + mi * 7) % 4) * 800;
        rows.push({
          type: 'expense',
          catId,
          amount: Math.round((amount + jitter) * factor / 100) * 100,
          date: `${ym}-${pad2(day)}`,
          memo,
          method
        });
      }
    }

    state.tx = rows.map((r, i) => ({
      id: uid(),
      ts: Date.now() - i,
      ...r
    }));
    save();
    return state.tx.length;
  }
};

export { DEFAULT_CATS };
