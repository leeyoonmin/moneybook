/* ==========================================================================
   머니북 — app shell & views
   ========================================================================== */

import {
  DB, METHODS, CAT_COLORS, fmt, won, todayStr, ymOf, currentYm, monthLabel,
  dateLabel, weekdayLabel, addMonths
} from './store.js';
import { Cloud } from './cloud.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const I = {
  chevL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5.5 15.5 12 9 18.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5h9a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5h-9L3 12z"/><path d="M11.5 9.5 16 14.5M16 9.5l-4.5 5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h4"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16z"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 13h9.4l.8-13M10 11v6M14 11v6"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.35"/><circle cx="15" cy="6" r="1.35"/><circle cx="9" cy="12" r="1.35"/><circle cx="15" cy="12" r="1.35"/><circle cx="9" cy="18" r="1.35"/><circle cx="15" cy="18" r="1.35"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8M7 13l5-5 5 5M4 4h16"/></svg>',
  install: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 13h9.4l.8-13"/></svg>',
  dot: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg>',
  google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c.6-3.4 2.7-5.2 5.5-5.2s4.9 1.8 5.5 5.2"/><path d="M16 5.4a3 3 0 0 1 0 5.7M17.5 14.9c1.7.7 2.7 2.4 3 4.6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13.7a3.6 3.6 0 0 0 5.1 0l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1L11.5 7"/><path d="M14 10.3a3.6 3.6 0 0 0-5.1 0l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.1-1.1"/></svg>',
  sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-13.7-5.2L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 13.7 5.2L20 16"/><path d="M20 20v-4h-4"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3.5a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 8l-4 4 4 4M6 12h9"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18.5h9.7a4.1 4.1 0 0 0 .5-8.2 5.7 5.7 0 0 0-11-1.3A4.3 4.3 0 0 0 7 18.5z"/></svg>'
};

const S = {
  tab: 'home',
  ym: currentYm(),
  filter: 'all',
  statType: 'expense',
  draft: null,
  installEvt: null,
  mode: 'boot',
  pendingJoin: null,
  hhDraft: '',
  joinDraft: '',
  authError: '',
  authNotice: '',
  busy: false,
  googleEnabled: null
};

/* ---------- theme ---------- */

const mq = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme() {
  const pref = DB.state.theme;
  const dark = pref === 'dark' || (pref === 'system' && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const color = dark ? '#111110' : '#F3F0EA';
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
}

mq.addEventListener('change', () => {
  if (DB.state.theme !== 'system') return;
  applyTheme();
  render();
});

/* ---------- formatting helpers ---------- */

const currentMonth = () => currentYm();
const daysIn = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

function monthNav() {
  const isNow = S.ym === currentMonth();
  return `
    <div class="monthnav">
      <button class="icon-btn" data-act="prev-month" aria-label="이전 달">${I.chevL}</button>
      <button class="monthbtn" data-act="pick-month" aria-label="월 선택">
        ${monthLabel(S.ym)}${isNow ? '<span class="now-dot">이번 달</span>' : ''}
      </button>
      <button class="icon-btn" data-act="next-month" aria-label="다음 달">${I.chevR}</button>
    </div>`;
}

function topbar() {
  return `
    <header class="topbar">
      <div class="brand"><i></i>moneybook</div>
      ${S.tab === 'home' ? `<div class="topbar-actions">
        <button class="icon-btn" data-act="tab" data-tab="settings" aria-label="설정">${I.gear}</button>
      </div>` : ''}
    </header>`;
}

function avatarStyle(color) {
  return `background:${color}26`;
}

function txRow(t, { showDate = false } = {}) {
  const cat = DB.cat(t.type, t.catId);
  const sub = t.memo || t.method || '';
  return `
    <button class="tx" data-act="edit" data-id="${esc(t.id)}">
      <span class="avatar" style="${avatarStyle(cat.color)}">${esc(Array.from(cat.name)[0] || '·')}</span>
      <span class="tx-main">
        <span class="t">${esc(cat.name)}</span>
        <span class="m">${showDate ? `${dateLabel(t.date)} · ` : ''}${esc(sub)}</span>
      </span>
      <span class="amt ${t.type === 'income' ? 'income' : ''}">${t.type === 'income' ? '+' : '−'}${won(t.amount)}</span>
    </button>`;
}

function emptyBlock({ title, desc, seed = false }) {
  return `
    <div class="empty">
      <div class="empty-art">
        <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
          <circle cx="40" cy="39" r="27" stroke-dasharray="3 6"/>
          <path d="M27 44c4-10 9-15 13-15s9 5 13 15"/>
          <path d="M25 51h30"/>
          <circle cx="57" cy="24" r="3.4" fill="var(--accent)" stroke="none"/>
        </svg>
      </div>
      <h3>${esc(title)}</h3>
      <p>${esc(desc)}</p>
      <div class="empty-actions">
        <button class="btn primary sm" data-act="add">기록 추가</button>
        ${seed ? '<button class="btn ghost sm" data-act="seed">샘플로 둘러보기</button>' : ''}
      </div>
    </div>`;
}

/* ---------- home ---------- */

function homeView() {
  const list = DB.monthTx(S.ym);
  const sum = DB.summary(list);
  const budget = DB.budgetFor(S.ym);
  const over = budget > 0 && sum.expense > budget;
  const pct = budget > 0 ? Math.round((sum.expense / budget) * 100) : 0;
  const isNow = S.ym === currentMonth();
  const days = isNow ? Math.max(1, new Date().getDate()) : daysIn(S.ym);
  const avg = Math.round(sum.expense / days);
  const recent = list.slice(0, 5);
  const top = DB.byCategory(list, 'expense').items.slice(0, 3);
  const maxTop = top.length ? top[0].value : 0;
  const net = sum.income - sum.expense;

  const hero = `
    <section class="hero ${over ? 'over' : ''}">
      <div class="hero-top">
        <span>${isNow ? '이번 달 지출' : `${monthLabel(S.ym)} 지출`}</span>
        ${budget > 0 ? `<span class="hero-pill ${over ? 'over' : ''}">${over ? '예산 초과' : `${pct}% 사용`}</span>` : ''}
      </div>
      <div class="hero-amount"><span class="cur">₩</span>${fmt(sum.expense)}</div>
      ${budget > 0 ? `
        <div class="bar" aria-hidden="true"><span style="width:${Math.min(100, pct)}%"></span></div>
        <div class="hero-foot">
          <div><span class="k">월 예산</span><span class="v">${won(budget)}</span></div>
          <div><span class="k">${over ? '초과 금액' : '남은 예산'}</span><span class="v">${won(Math.abs(budget - sum.expense))}</span></div>
        </div>
      ` : `
        <button class="hero-cta" data-act="edit-budget">월 예산 설정하기 ${I.chev}</button>
      `}
    </section>`;

  const strip = `
    <div class="strip">
      <div><span class="k">수입</span><span class="v income">${won(sum.income)}</span></div>
      <div><span class="k">하루 평균</span><span class="v">${won(avg)}</span></div>
      <div><span class="k">기록</span><span class="v">${sum.count}건</span></div>
    </div>`;

  const recentSection = `
    <section class="section">
      <div class="section-head">
        <h2>최근 기록</h2>
        <button class="aside" data-act="tab" data-tab="ledger">전체 보기 ${I.chev}</button>
      </div>
      ${recent.length
        ? `<div class="list">${recent.map((t) => txRow(t, { showDate: true })).join('')}</div>`
        : emptyBlock({
            title: isNow ? '아직 기록이 없어요' : '이 달 기록이 없어요',
            desc: '오늘 쓴 돈부터 가볍게 적어보세요.',
            seed: DB.state.tx.length === 0 && !DB.state.cloud
          })}
    </section>`;

  const topSection = top.length ? `
    <section class="section">
      <div class="section-head">
        <h2>많이 쓴 카테고리</h2>
        <button class="aside" data-act="tab" data-tab="stats">통계 ${I.chev}</button>
      </div>
      <div class="chartcard" style="padding:14px 16px">
        ${top.map((c) => `
          <div class="catrow" style="padding:9px 0">
            <span class="dot" style="background:${c.color}"></span>
            <div class="name">${esc(c.name)}<span>${Math.round(c.pct)}%</span>
              <div class="mini"><i style="width:${maxTop ? Math.max(3, (c.value / maxTop) * 100) : 0}%;background:${c.color}"></i></div>
            </div>
            <span class="val">${won(c.value)}</span>
          </div>`).join('')}
      </div>
    </section>` : '';

  return `
    ${topbar()}
    <div class="page">
      ${monthNav()}
      ${hero}
      ${strip}
      ${recentSection}
      ${topSection}
      <p class="settings-foot">${sum.count === 0
        ? '이번 달 기록을 시작해 보세요.'
        : net > 0
          ? `이번 달은 수입이 ${won(net)} 더 많아요.`
          : net < 0
            ? `이번 달은 지출이 ${won(-net)} 더 많아요.`
            : '이번 달 수입과 지출이 같아요.'}<br>기록은 이 기기에만 저장됩니다.</p>
    </div>`;
}

/* ---------- ledger ---------- */

function ledgerView() {
  const all = DB.monthTx(S.ym);
  const sum = DB.summary(all);
  const list = S.filter === 'all' ? all : all.filter((t) => t.type === S.filter);

  const groups = [];
  let cur = null;
  for (const t of list) {
    if (!cur || cur.date !== t.date) {
      cur = { date: t.date, rows: [], expense: 0, income: 0 };
      groups.push(cur);
    }
    cur.rows.push(t);
    cur[t.type] += t.amount;
  }

  const body = list.length ? groups.map((g) => {
    const net = g.income - g.expense;
    return `
      <div class="day">
        <span><b>${dateLabel(g.date)}</b> ${weekdayLabel(g.date)}요일 · ${g.rows.length}건</span>
        <span class="day-sum">${net === 0 ? '' : `${net > 0 ? '+' : '−'}${won(net)}`}</span>
      </div>
      <div class="list">${g.rows.map((t) => txRow(t)).join('')}</div>`;
  }).join('') : emptyBlock({
    title: S.filter === 'all' ? '이 달 기록이 없어요' : '해당하는 기록이 없어요',
    desc: S.filter === 'all' ? '지출과 수입을 적으면 여기에 쌓여요.' : '다른 필터를 선택해 보세요.',
    seed: DB.state.tx.length === 0 && !DB.state.cloud
  });

  return `
    ${topbar()}
    <div class="page">
      <h1 class="page-title">기록</h1>
      <p class="page-sub">${monthLabel(S.ym)}의 수입과 지출</p>
      ${monthNav()}
      <div class="month-total">
        <span>지출<b>${won(sum.expense)}</b></span>
        <span>수입<b>${won(sum.income)}</b></span>
        <span>순액<b>${sum.income - sum.expense >= 0 ? '+' : '−'}${won(Math.abs(sum.income - sum.expense))}</b></span>
      </div>
      <div class="filters">
        <button class="chip ${S.filter === 'all' ? 'on' : ''}" data-act="filter" data-filter="all">전체</button>
        <button class="chip ${S.filter === 'expense' ? 'on' : ''}" data-act="filter" data-filter="expense">지출</button>
        <button class="chip ${S.filter === 'income' ? 'on' : ''}" data-act="filter" data-filter="income">수입</button>
        <span style="margin-left:auto;color:var(--faint);font-size:11px">${list.length}건</span>
      </div>
      ${body}
    </div>`;
}

/* ---------- stats ---------- */

function donutSVG(items, total) {
  const R = 54;
  const C = 2 * Math.PI * R;
  if (!items.length) return '';
  if (items.length === 1) {
    return `<svg viewBox="0 0 140 140" role="img" aria-label="카테고리 비중">
      <circle cx="70" cy="70" r="${R}" fill="none" stroke="${items[0].color}" stroke-width="16"/>
    </svg>`;
  }
  let acc = 0;
  const gap = C * 0.013;
  const segs = items.map((it) => {
    const raw = (it.value / total) * C;
    const len = Math.max(2, raw - gap);
    const dash = `${len} ${C - len}`;
    const off = -acc;
    acc += raw;
    return `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${it.color}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${dash}" stroke-dashoffset="${off}" transform="rotate(-90 70 70)"/>`;
  }).join('');
  return `<svg viewBox="0 0 140 140" role="img" aria-label="카테고리 비중">${segs}</svg>`;
}

function statsView() {
  const type = S.statType;
  const label = type === 'expense' ? '지출' : '수입';
  const list = DB.monthTx(S.ym);
  const { total, items } = DB.byCategory(list, type);
  const trend = DB.trend(type, S.ym, 6);
  const max = Math.max(...trend.map((m) => m.value), 1);
  const prev = DB.prevMonthTotal(type, S.ym);
  const diff = prev > 0 ? ((total - prev) / prev) * 100 : null;

  const compact = (n) => {
    if (!n) return '';
    if (n >= 100000000) return `${(n / 100000000).toFixed(1).replace('.0', '')}억`;
    if (n >= 10000) return `${Math.round(n / 10000)}만`;
    return fmt(n);
  };

  const insight = diff == null
    ? '지난달 기록이 없어 비교할 수 없어요.'
    : Math.abs(diff) < 3
      ? `지난달과 비슷하게 ${label}했어요.`
      : diff > 0
        ? `지난달보다 <b>${Math.round(Math.abs(diff))}% 더</b> ${label}했어요.`
        : `지난달보다 <b>${Math.round(Math.abs(diff))}% 덜</b> ${label}했어요.`;

  const donutBlock = total > 0 ? `
    <div class="chartcard">
      <div class="donut-wrap">
        ${donutSVG(items, total)}
        <div class="donut-center">
          <span class="k">${label} 합계</span>
          <span class="v">${won(total)}</span>
        </div>
      </div>
      <div>
        ${items.map((c) => `
          <div class="catrow">
            <span class="dot" style="background:${c.color}"></span>
            <span class="name">${esc(c.name)}<span>${Math.round(c.pct)}%</span></span>
            <span class="val">${won(c.value)}</span>
          </div>`).join('')}
      </div>
    </div>` : emptyBlock({
      title: `${label} 기록이 없어요`,
      desc: `${monthLabel(S.ym)}에 ${label}을 기록하면 통계가 나타나요.`
    });

  return `
    ${topbar()}
    <div class="page">
      <h1 class="page-title">통계</h1>
      <p class="page-sub">${monthLabel(S.ym)}의 흐름</p>
      ${monthNav()}
      <div class="seg full" style="margin-bottom:14px">
        <button class="${type === 'expense' ? 'on' : ''}" data-act="stat-type" data-type="expense">지출</button>
        <button class="${type === 'income' ? 'on' : ''}" data-act="stat-type" data-type="income">수입</button>
      </div>
      ${donutBlock}

      <section class="section">
        <div class="section-head"><h2>최근 6개월 ${label}</h2></div>
        <div class="chartcard">
          <div class="trend">
            ${trend.map((m) => `
              <div class="tcol ${m.ym === S.ym ? 'now' : ''}">
                <div class="tbar-wrap">
                  <div class="tbar-box" style="height:${Math.max(2, Math.round((m.value / max) * 100))}%">
                    ${m.value ? `<span class="tval">${compact(m.value)}</span>` : ''}
                    <div class="tbar"></div>
                  </div>
                </div>
                <span class="tlabel">${m.label}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="insight"><span>·</span><span>${insight}</span></div>
      </section>
    </div>`;
}

/* ---------- settings ---------- */

function accountSection() {
  if (S.mode === 'guest') {
    return `
      <div class="group" style="margin-top:0">
        <button class="row" data-act="login">
          <span class="account-avatar">G</span>
          <span class="account-id">
            <b>Google로 로그인</b>
            <span>가족과 같은 가계부를 함께 쓰기</span>
          </span>
          <span class="chev">${I.chev}</span>
        </button>
        <div class="row" style="color:var(--muted);font-size:12px">
          <span class="ic">${I.cloud}</span><span>이 기기에만 저장 중</span>
          <span class="val">로컬</span>
        </div>
      </div>`;
  }

  const user = Cloud.user;
  const meta = user?.user_metadata || {};
  const name = meta.full_name || meta.name || user?.email || '사용자';
  const initial = Array.from(name)[0] || '·';

  return `
    <div class="group" style="margin-top:0">
      <div class="account-row">
        <span class="account-avatar">${esc(initial)}</span>
        <span class="account-id">
          <b>${esc(name)}</b>
          <span>${esc(user?.email || '')}</span>
        </span>
        <button class="icon-btn" data-act="signout" aria-label="로그아웃" title="로그아웃">${I.logout}</button>
      </div>
    </div>`;
}

function householdSection() {
  if (S.mode !== 'cloud') return '';

  const hh = Cloud.household || {};
  const code = hh.inviteCode || '';
  const isOwner = Cloud.role === 'owner';
  const members = Cloud.members || [];

  const membersHtml = members.length
    ? members.map((m) => `
        <div class="member-row">
          <span class="member-avatar">${esc(Array.from(m.name || '?')[0])}</span>
          <span class="member-name">${esc(m.name)}${m.isMe ? '<em>나</em>' : ''}</span>
          <span class="role-badge ${esc(m.role)}">${roleLabel(m.role)}</span>
          ${isOwner && !m.isMe && m.role !== 'owner'
            ? `<button class="del-btn" data-act="remove-member" data-id="${esc(m.id)}" aria-label="${esc(m.name)} 내보내기">${I.x}</button>`
            : ''}
        </div>`).join('')
    : '<div class="row" style="color:var(--muted);font-size:12px">멤버를 불러오는 중…</div>';

  return `
    <div class="group-label">가계부</div>
    <div class="group">
      <div class="row">
        <span class="ic">${I.users}</span>
        <span class="house-name">${esc(hh.name || '')}</span>
        <span class="val">${roleLabel(Cloud.role)}</span>
      </div>
      ${code ? `
        <button class="row" data-act="copy-invite">
          <span class="ic">${I.link}</span><span>초대 링크 복사</span>
          <span class="val invite-code">${esc(code)}</span>
        </button>` : ''}
      ${isOwner ? `
        <button class="row" data-act="rotate-invite">
          <span class="ic">${I.sync}</span><span>초대 코드 재발급</span>
          <span class="chev">${I.chev}</span>
        </button>` : ''}
      <button class="row" data-act="sync-now">
        <span class="ic">${I.sync}</span><span>지금 동기화</span>
        <span class="val">${esc(Cloud.statusLabel())}</span>
      </button>
    </div>

    ${Cloud.memberships.length > 1 ? `
      <div class="group-label">내 가계부</div>
      <div class="group">
        ${Cloud.memberships.map((m) => `
          <button class="row" data-act="switch-hh" data-id="${esc(m.id)}">
            <span class="ic">${I.users}</span><span>${esc(m.name)}</span>
            <span class="val">${m.id === Cloud.householdId ? '현재' : roleLabel(m.role)}</span>
          </button>`).join('')}
      </div>` : ''}

    <div class="group-label">멤버 ${members.length}</div>
    <div class="group">${membersHtml}</div>
  `;
}

function settingsView() {
  const theme = DB.state.theme;
  const budget = DB.budgetFor(S.ym);
  const cats = { expense: DB.cats('expense'), income: DB.cats('income') };

  const catGroup = (type) => `
    <div class="group" data-cat-group="${type}">
      ${cats[type].map((c) => `
        <div class="cat-manage" data-cat-id="${esc(c.id)}">
          <button class="drag-handle" data-drag-cat aria-label="${esc(c.name)} 순서 이동, 위아래 화살표로도 이동">${I.grip}</button>
          <span class="dot" style="background:${c.color}"></span>
          <span class="nm">${esc(c.name)}</span>
          <span class="count">${DB.categoryUsage(type, c.id)}건</span>
          ${!c.fallback && c.id !== 'etc' ? `<button class="del-btn" data-act="del-cat" data-type="${type}" data-id="${esc(c.id)}" aria-label="${esc(c.name)} 삭제">${I.x}</button>` : ''}
        </div>`).join('')}
      <button class="addcat" data-act="add-cat" data-type="${type}">${I.plus} ${type === 'expense' ? '지출' : '수입'} 카테고리 추가</button>
    </div>`;

  return `
    ${topbar()}
    <div class="page">
      <h1 class="page-title">설정</h1>
      <p class="page-sub">나에게 맞게 조용히 조정하세요</p>

      ${accountSection()}
      ${householdSection()}

      <div class="group-label">예산과 화면</div>
      <div class="group">
        <button class="row" data-act="edit-budget">
          <span class="ic">${I.cal}</span>
          <span>${monthLabel(S.ym)} 예산</span>
          <span class="val">${budget > 0 ? won(budget) : '설정 안 함'}</span>
          <span class="chev">${I.chev}</span>
        </button>
        <div class="row" style="display:block;padding:13px 14px">
          <div style="font-size:13.5px;margin-bottom:9px">화면 테마</div>
          <div class="seg full theme-seg">
            <button class="${theme === 'system' ? 'on' : ''}" data-act="theme" data-theme="system">시스템</button>
            <button class="${theme === 'light' ? 'on' : ''}" data-act="theme" data-theme="light">라이트</button>
            <button class="${theme === 'dark' ? 'on' : ''}" data-act="theme" data-theme="dark">다크</button>
          </div>
        </div>
      </div>

      <div class="group-label">지출 카테고리 <span class="drag-hint">드래그로 순서 변경</span></div>
      ${catGroup('expense')}
      <div class="group-label">수입 카테고리 <span class="drag-hint">드래그로 순서 변경</span></div>
      ${catGroup('income')}

      <div class="group-label">데이터</div>
      <div class="group">
        <button class="row" data-act="export">
          <span class="ic">${I.down}</span><span>백업 내보내기</span>
          <span class="val">JSON</span>
        </button>
        <button class="row" data-act="import">
          <span class="ic">${I.up}</span><span>백업 가져오기</span>
          <span class="val">JSON</span>
        </button>
        <button class="row danger" data-act="clear">
          <span class="ic" style="color:var(--accent-ink)">${I.trash}</span><span>기록 전체 삭제</span>
        </button>
      </div>

      <div class="group-label">앱</div>
      <div class="group">
        <button class="row" data-act="install">
          <span class="ic">${I.install}</span><span>홈 화면에 추가</span>
          <span class="val">${isStandalone() ? '설치됨' : 'PWA'}</span>
        </button>
        <div class="row" style="color:var(--muted)">
          <span class="ic">${I.cloud}</span><span>버전</span><span class="val">1.1.0</span>
        </div>
      </div>

      <p class="settings-foot">${S.mode === 'cloud'
        ? `클라우드에 동기화되고 있어요. 오프라인에서도 기록할 수 있습니다.<br>로그아웃해도 클라우드 기록은 유지됩니다.`
        : `데이터는 이 브라우저에만 저장됩니다.<br>브라우저 데이터를 지우면 기록도 사라지니 가끔 백업해 주세요.`}</p>
    </div>`;
}

/* ---------- auth & onboarding views ---------- */

const roleLabel = (role) => ({ owner: '소유자', editor: '편집자', viewer: '보기 전용' }[role] || role || '');

function bootView() {
  return `
    <div class="authpage bootpage">
      <div class="brand"><i></i>moneybook</div>
      <div class="boot-center">
        <div class="spinner" aria-hidden="true"></div>
        <p>가계부를 열고 있어요</p>
      </div>
    </div>`;
}

function authView() {
  return `
    <div class="authpage">
      <div class="auth-brand">
        <div class="brand"><i></i>moneybook</div>
        <span class="auth-badge">가족 가계부</span>
      </div>

      <div class="auth-hero">
        <span class="auth-kicker">함께 쓰는 가계부</span>
        <h1>우리 집 돈의 흐름을<br>같이 보고, 같이 적어요.</h1>
        <p>Google 계정으로 로그인하면 가족과 같은 장부를<br>실시간으로 공유할 수 있어요.</p>
      </div>

      <div class="auth-features" aria-hidden="true">
        <div><em>01</em><span>가족과 같은 장부를 실시간으로</span></div>
        <div><em>02</em><span>오프라인에서도 기록은 계속</span></div>
        <div><em>03</em><span>기기를 바꿔도 그대로 이어서</span></div>
      </div>

      ${S.pendingJoin ? `
        <div class="auth-note">
          초대 코드 <b>${esc(S.pendingJoin)}</b>로 초대받았어요.<br>
          로그인하면 자동으로 가계부에 참여합니다.
        </div>` : ''}

      ${S.authError ? `<div class="auth-error">${esc(S.authError)}</div>` : ''}
      ${S.googleEnabled === false ? `
        <div class="auth-error">
          Google 로그인이 아직 활성화되지 않았어요.<br>
          Supabase에서 Google provider를 켠 뒤 새로고침해 주세요.
        </div>` : ''}

      <div class="auth-actions">
        <button class="google-btn" data-act="google-login" ${S.busy || S.googleEnabled === false ? 'disabled' : ''}>
          ${I.google}<span>${S.busy ? '로그인 중…' : 'Google로 계속하기'}</span>
        </button>
        <button class="auth-guest" data-act="guest-mode">이 기기에서만 사용하기</button>
      </div>

      <p class="auth-fine">
        기존 기기 기록은 그대로 남고, 클라우드 가계부는 빈 상태로 시작합니다.<br>
        언제든 설정에서 로그인할 수 있어요.
      </p>
    </div>`;
}

function onboardingView() {
  const name = Cloud.user?.user_metadata?.full_name || Cloud.user?.email || '';

  return `
    <div class="authpage">
      <div class="auth-brand">
        <div class="brand"><i></i>moneybook</div>
      </div>

      <div class="auth-hero compact">
        <span class="auth-kicker">${esc(name)}님, 환영해요</span>
        <h1>가계부를<br>시작해 볼까요?</h1>
        <p>새 가계부를 만들거나, 가족에게 받은 초대 코드로 참여하세요.</p>
      </div>

      ${S.authError ? `<div class="auth-error">${esc(S.authError)}</div>` : ''}

      ${S.pendingJoin ? `
        <div class="auth-card">
          <div class="auth-label">초대받은 가계부</div>
          <div class="invite-big">${esc(S.pendingJoin)}</div>
          <button class="btn primary wide" data-act="join-hh" ${S.busy ? 'disabled' : ''}>이 가계부에 참여하기</button>
        </div>` : `
        <div class="auth-card">
          <label class="auth-label" for="hhName">새 가계부</label>
          <input class="auth-input" id="hhName" value="${esc(S.hhDraft || '우리 가계부')}" maxlength="40" autocomplete="off">
          <button class="btn dark wide" data-act="create-hh" ${S.busy ? 'disabled' : ''}>${S.busy ? '만드는 중…' : '가계부 만들기'}</button>
        </div>

        <div class="auth-divider"><span>또는</span></div>

        <div class="auth-card">
          <label class="auth-label" for="joinCode">초대 코드로 참여</label>
          <input class="auth-input code" id="joinCode" placeholder="8자리 코드" maxlength="8"
            value="${esc(S.joinDraft || '')}"
            autocapitalize="none" autocomplete="off" spellcheck="false">
          <button class="btn ghost wide" data-act="join-hh" ${S.busy ? 'disabled' : ''}>${S.busy ? '참여하는 중…' : '참여하기'}</button>
        </div>`}

      <button class="auth-guest" data-act="signout">다른 계정으로 로그인</button>
      <p class="auth-fine">가계부는 가족·지인과 함께 쓸 수 있어요. 초대 코드는 설정에서 확인할 수 있습니다.</p>
    </div>`;
}

/* ---------- render ---------- */

function setChrome(appMode) {
  document.body.classList.toggle('auth-mode', !appMode);
  const nav = document.querySelector('.tabbar');
  if (nav) nav.hidden = !appMode;
  if (!appMode) $('#fab').hidden = true;
}

function render() {
  const view = $('#view');

  if (S.mode === 'boot') {
    view.innerHTML = bootView();
    setChrome(false);
    return;
  }
  if (S.mode === 'auth') {
    view.innerHTML = authView();
    setChrome(false);
    return;
  }
  if (S.mode === 'onboarding' || (S.mode === 'cloud' && !Cloud.householdId)) {
    view.innerHTML = onboardingView();
    setChrome(false);
    return;
  }

  const html = S.tab === 'home' ? homeView()
    : S.tab === 'ledger' ? ledgerView()
      : S.tab === 'stats' ? statsView()
        : settingsView();

  view.innerHTML = html;
  setChrome(true);

  $$('.tab').forEach((b) => {
    const on = b.dataset.tab === S.tab;
    b.classList.toggle('is-active', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  $('#fab').hidden = !(S.tab === 'home' || S.tab === 'ledger');
}

function go(tab) {
  if (S.tab === tab) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  S.tab = tab;
  render();
  $('.page')?.classList.add('enter');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* ---------- toast ---------- */

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- modal ---------- */

let modalEl = null;

function openModal(html, onMount) {
  closeModal(true);
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="scrim"></div><div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  $('#modalRoot').appendChild(wrap);
  modalEl = wrap;
  wrap.addEventListener('click', (e) => {
    if (e.target.classList.contains('scrim')) closeModal();
  });
  onMount?.(wrap);
  setTimeout(() => {
    const focusable = wrap.querySelector('input, select, button');
    focusable?.focus({ preventScroll: true });
  }, 60);
  return wrap;
}

function closeModal(instant = false) {
  if (!modalEl) return;
  const el = modalEl;
  modalEl = null;
  el.remove();
}

function confirmDialog({ title, desc, confirm = '삭제', danger = true }) {
  return new Promise((resolve) => {
    const wrap = openModal(`
      <h3>${esc(title)}</h3>
      <p>${desc}</p>
      <div class="modal-actions">
        <button class="btn ghost" data-cancel>취소</button>
        <button class="btn ${danger ? 'primary' : 'dark'}" data-ok>${esc(confirm)}</button>
      </div>`, (m) => {
      m.querySelector('[data-ok]').addEventListener('click', () => { closeModal(); resolve(true); });
      m.querySelector('[data-cancel]').addEventListener('click', () => { closeModal(); resolve(false); });
    });
    wrap.addEventListener('click', (e) => {
      if (e.target.classList.contains('scrim')) resolve(false);
    });
  });
}

/* ---------- transaction sheet ---------- */

function catPills(type, selected) {
  return DB.cats(type).map((c) => `
    <button class="cat-pill ${c.id === selected ? 'on' : ''}" data-act="pick-cat" data-id="${esc(c.id)}">
      <i style="background:${c.color}"></i>${esc(c.name)}
    </button>`).join('');
}

function txSheetHTML(d) {
  const cats = DB.cats(d.type);
  const catId = cats.some((c) => c.id === d.catId) ? d.catId : cats[0].id;
  d.catId = catId;
  const digits = d.digits;

  return `
    <div class="sheet-wrap" id="txSheet">
      <div class="scrim" data-act="close-sheet"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${d.editingId ? '기록 수정' : '기록 추가'}">
        <div class="grab" aria-hidden="true"><span class="handle"></span></div>
        <div class="sheet-top">
          <div class="sheet-head">
            <div class="seg" id="typeSeg">
              <button class="${d.type === 'expense' ? 'on' : ''}" data-act="tx-type" data-type="expense">지출</button>
              <button class="${d.type === 'income' ? 'on' : ''}" data-act="tx-type" data-type="income">수입</button>
            </div>
          </div>
          <button class="icon-btn" data-act="close-sheet" aria-label="닫기">${I.x}</button>
        </div>

        <div class="sheet-amount ${digits ? '' : 'zero'}" id="amountView">
          <span class="cur">₩</span><span id="amountDigits">${digits ? fmt(Number(digits)) : '0'}</span>
        </div>

        <div class="field-label">카테고리</div>
        <div class="cat-scroller" id="catScroller">${catPills(d.type, catId)}</div>

        <div class="meta-row">
          <label class="meta-field">${I.cal}<input type="date" id="txDate" value="${esc(d.date)}" aria-label="날짜"></label>
          <label class="meta-field">${I.card}
            <select id="txMethod" aria-label="결제수단">
              ${METHODS.map((m) => `<option value="${m}" ${m === d.method ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </label>
        </div>

        <label class="memo-field">${I.pen}
          <input id="txMemo" maxlength="40" placeholder="메모 (선택)" value="${esc(d.memo)}" autocomplete="off">
        </label>

        <div class="keypad" id="keypad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key" data-act="key" data-key="${n}">${n}</button>`).join('')}
          <button class="key" data-act="key" data-key="00">00</button>
          <button class="key" data-act="key" data-key="0">0</button>
          <button class="key fn" data-act="key" data-key="del" aria-label="한 자리 지우기">${I.back}</button>
        </div>

        <button class="btn primary wide sheet-submit" data-act="save-tx">${d.editingId ? '수정 저장' : '저장'}</button>
        ${d.editingId ? `<button class="sheet-delete" data-act="delete-tx">이 기록 삭제</button>` : ''}
      </div>
    </div>`;
}

function openTxSheet(id) {
  const tx = id ? DB.txById(id) : null;
  const type = tx?.type || 'expense';
  const cats = DB.cats(type);
  if (!cats.length) {
    toast('카테고리를 불러오는 중이에요');
    return;
  }
  S.draft = {
    editingId: tx?.id || null,
    type,
    digits: tx ? String(tx.amount) : '',
    catId: tx?.catId || cats[0].id,
    date: tx?.date || (S.ym === currentMonth() ? todayStr() : `${S.ym}-${String(Math.min(new Date().getDate(), daysIn(S.ym))).padStart(2, '0')}`),
    method: tx?.method || '카드',
    memo: tx?.memo || ''
  };

  closeSheet(true);
  const holder = document.createElement('div');
  holder.innerHTML = txSheetHTML(S.draft);
  document.body.appendChild(holder.firstElementChild);
  document.body.style.overflow = 'hidden';

  const sheet = $('#txSheet .sheet');
  const dateInput = $('#txDate', sheet);
  const methodSelect = $('#txMethod', sheet);
  const memoInput = $('#txMemo', sheet);

  dateInput.addEventListener('change', () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) S.draft.date = dateInput.value;
  });
  methodSelect.addEventListener('change', () => { S.draft.method = methodSelect.value; });
  memoInput.addEventListener('input', () => { S.draft.memo = memoInput.value; });
  memoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveTx(); }
  });

  enableSheetDrag(sheet);
}

function closeSheet(instant = false) {
  const el = $('#txSheet');
  if (!el) return;
  document.body.style.overflow = '';
  S.draft = null;
  if (instant) { el.remove(); return; }
  const sheet = el.querySelector('.sheet');
  const scrim = el.querySelector('.scrim');
  if (sheet) sheet.style.animation = 'sheet-down .2s ease forwards';
  if (scrim) scrim.style.opacity = '0';
  setTimeout(() => el.remove(), 190);
}

/* Drag the grab strip at the top of the sheet downward to dismiss it. */
function enableSheetDrag(sheet) {
  const grab = sheet.querySelector('.grab');
  const scrim = sheet.parentElement.querySelector('.scrim');
  if (!grab) return;

  let active = false;
  let startY = 0;
  let lastY = 0;
  let lastT = 0;
  let dy = 0;
  let threshold = 110;
  let snapTimer = null;

  const reset = () => {
    sheet.style.transition = 'transform .26s cubic-bezier(.22,1,.36,1)';
    sheet.style.transform = 'translateY(0px)';
    if (scrim) {
      scrim.style.transition = 'opacity .26s ease';
      scrim.style.opacity = '';
    }
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      if (!sheet.isConnected) return;
      sheet.style.transition = '';
      sheet.style.transform = '';
      sheet.style.willChange = '';
      if (scrim) {
        scrim.style.transition = '';
        scrim.style.opacity = '';
      }
    }, 280);
  };

  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    active = true;
    startY = lastY = e.clientY;
    lastT = performance.now();
    dy = 0;
    threshold = Math.min(150, Math.max(80, sheet.offsetHeight * 0.2));
    clearTimeout(snapTimer);
    sheet.style.animation = 'none';
    sheet.style.transition = 'none';
    sheet.style.willChange = 'transform';
    grab.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const onMove = (e) => {
    if (!active) return;
    dy = Math.max(0, e.clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
    if (scrim) scrim.style.opacity = String(Math.max(0.12, 0.46 * (1 - dy / 420)));
    lastY = e.clientY;
    lastT = performance.now();
  };

  const finish = (e) => {
    if (!active) return;
    active = false;
    const velocity = (e.clientY - lastY) / Math.max(1, performance.now() - lastT);
    const shouldClose = dy >= threshold || velocity > 0.6;

    if (!shouldClose) {
      reset();
      return;
    }

    sheet.style.transition = 'transform .2s cubic-bezier(.4,0,.2,1)';
    sheet.style.transform = 'translateY(102%)';
    if (scrim) {
      scrim.style.transition = 'opacity .2s ease';
      scrim.style.opacity = '0';
    }
    document.body.style.overflow = '';
    S.draft = null;
    setTimeout(() => {
      const el = $('#txSheet');
      if (el) el.remove();
    }, 205);
  };

  grab.addEventListener('pointerdown', onDown);
  grab.addEventListener('pointermove', onMove);
  grab.addEventListener('pointerup', finish);
  grab.addEventListener('pointercancel', finish);
  grab.addEventListener('lostpointercapture', (e) => { if (active) finish(e); });
}

function updateAmountView() {
  const el = $('#amountDigits');
  const view = $('#amountView');
  if (!el || !S.draft) return;
  el.textContent = S.draft.digits ? fmt(Number(S.draft.digits)) : '0';
  view.classList.toggle('zero', !S.draft.digits);
}

function pressKey(key) {
  if (!S.draft) return;
  if (key === 'del') {
    S.draft.digits = S.draft.digits.slice(0, -1);
  } else if (key === '00') {
    if (S.draft.digits && S.draft.digits.length <= 7) S.draft.digits += '00';
  } else if (/^\d$/.test(key)) {
    if (S.draft.digits.length >= 9) return;
    if (S.draft.digits === '0') S.draft.digits = '';
    S.draft.digits += key;
  }
  updateAmountView();
}

function setDraftType(type) {
  if (!S.draft) return;
  S.draft.type = type;
  const cats = DB.cats(type);
  if (!cats.some((c) => c.id === S.draft.catId)) S.draft.catId = cats[0].id;
  $$('#typeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.type === type));
  const scroller = $('#catScroller');
  if (scroller) scroller.innerHTML = catPills(type, S.draft.catId);
}

function pickCat(id) {
  if (!S.draft) return;
  S.draft.catId = id;
  $$('#catScroller .cat-pill').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
}

function saveTx() {
  if (!S.draft) return;
  const amount = Number(S.draft.digits || 0);
  if (!amount) {
    const view = $('#amountView');
    if (view) {
      view.style.animation = 'none';
      void view.offsetWidth;
      view.style.animation = 'shake .34s ease';
    }
    toast('금액을 입력해 주세요');
    return;
  }

  const payload = {
    type: S.draft.type,
    amount,
    catId: S.draft.catId,
    date: /^\d{4}-\d{2}-\d{2}$/.test(S.draft.date) ? S.draft.date : todayStr(),
    memo: (S.draft.memo || '').trim().slice(0, 40),
    method: METHODS.includes(S.draft.method) ? S.draft.method : '카드'
  };

  const editing = S.draft.editingId;
  if (editing) DB.updateTx(editing, payload);
  else DB.addTx(payload);

  S.ym = ymOf(payload.date);
  closeSheet();
  render();
  toast(editing ? '수정했어요' : '기록을 저장했어요');
}

async function deleteTxFlow() {
  if (!S.draft?.editingId) return;
  const ok = await confirmDialog({
    title: '기록을 삭제할까요?',
    desc: '삭제한 기록은 되돌릴 수 없어요.',
    confirm: '삭제'
  });
  if (!ok) return;
  DB.deleteTx(S.draft.editingId);
  closeSheet();
  render();
  toast('삭제했어요');
}

/* ---------- budget / category dialogs ---------- */

function openBudgetDialog() {
  const current = DB.budgetFor(S.ym);
  const wrap = openModal(`
    <h3>월 예산</h3>
    <p>${monthLabel(S.ym)}에 쓸 금액을 정해두면 사용률을 보여드려요. 비워두면 예산 없이 기록만 남겨요.</p>
    <input class="modal-input" id="budgetInput" inputmode="numeric" autocomplete="off"
      placeholder="예: 2,000,000" value="${current > 0 ? fmt(current) : ''}">
    <div class="modal-actions">
      <button class="btn ghost" data-cancel>취소</button>
      <button class="btn dark" id="budgetSave">저장</button>
    </div>`, (m) => {
    const input = m.querySelector('#budgetInput');
    input.addEventListener('input', () => {
      const digits = input.value.replace(/[^\d]/g, '').slice(0, 9);
      input.value = digits ? fmt(Number(digits)) : '';
    });
    const save = () => {
      const digits = input.value.replace(/[^\d]/g, '');
      DB.setBudget(S.ym, digits ? Number(digits) : 0);
      closeModal();
      render();
      toast(digits ? '예산을 저장했어요' : '예산을 비웠어요');
    };
    m.querySelector('#budgetSave').addEventListener('click', save);
    m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    setTimeout(() => { input.focus(); input.select(); }, 80);
  });
  return wrap;
}

function openCategoryDialog(type) {
  let color = CAT_COLORS[0];
  openModal(`
    <h3>${type === 'expense' ? '지출' : '수입'} 카테고리 추가</h3>
    <p>이름과 색상을 정하면 기록할 때 바로 쓸 수 있어요.</p>
    <input class="modal-input text" id="catName" maxlength="10" placeholder="예: 반려동물" autocomplete="off">
    <div class="swatches">
      ${CAT_COLORS.map((c) => `<button class="swatch ${c === color ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="색상 ${c}"></button>`).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn ghost" data-cancel>취소</button>
      <button class="btn dark" id="catSave">추가</button>
    </div>`, (m) => {
    const input = m.querySelector('#catName');
    m.querySelectorAll('.swatch').forEach((sw) => {
      sw.addEventListener('click', () => {
        color = sw.dataset.color;
        m.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === sw));
      });
    });
    const save = () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      const cat = DB.addCategory(type, name, color);
      if (!cat) { toast('같은 이름의 카테고리가 이미 있어요'); return; }
      closeModal();
      render();
      toast('카테고리를 추가했어요');
    };
    m.querySelector('#catSave').addEventListener('click', save);
    m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    setTimeout(() => input.focus(), 80);
  });
}

async function deleteCategoryFlow(type, id) {
  const cat = DB.cat(type, id);
  const used = DB.categoryUsage(type, id);
  const ok = await confirmDialog({
    title: `'${cat.name}' 카테고리를 삭제할까요?`,
    desc: used > 0 ? `이 카테고리의 기록 ${used}건은 '기타'로 옮겨집니다.` : '사용하지 않는 카테고리예요.',
    confirm: '삭제'
  });
  if (!ok) return;
  DB.deleteCategory(type, id);
  render();
  toast('카테고리를 삭제했어요');
}

/* ---------- data flows ---------- */

function exportData() {
  const payload = DB.exportData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moneybook-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('백업 파일을 내려받았어요');
}

async function clearFlow() {
  const n = DB.state.tx.length;
  if (!n) { toast('삭제할 기록이 없어요'); return; }
  const ok = await confirmDialog({
    title: '모든 기록을 삭제할까요?',
    desc: `${S.mode === 'cloud' ? '이 가계부를 함께 쓰는 멤버에게도 반영됩니다. ' : ''}수입·지출 ${n}건이 사라지고 되돌릴 수 없어요. 예산과 카테고리는 그대로 남습니다.`,
    confirm: '전체 삭제'
  });
  if (!ok) return;
  DB.clearTransactions();
  render();
  toast('기록을 모두 삭제했어요');
}

async function importData(file) {
  try {
    const text = await file.text();
    const res = DB.importData(JSON.parse(text));
    render();
    toast(res.added
      ? `기록 ${res.added}건을 가져왔어요${res.skipped ? ` · ${res.skipped}건 건너뜀` : ''}`
      : '새로 가져올 기록이 없어요');
  } catch {
    toast('가져오지 못했어요. 백업 파일인지 확인해 주세요');
  }
}

function setTheme(theme) {
  DB.setTheme(theme);
  applyTheme();
  render();
  toast(theme === 'system' ? '시스템 설정을 따라가요' : theme === 'light' ? '라이트 테마' : '다크 테마');
}

function seed() {
  const n = DB.seedSample();
  if (!n) { toast('이미 기록이 있어요'); return; }
  render();
  toast('샘플 기록을 채웠어요');
}

/* ---------- install ---------- */

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function openInstallGuide() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openModal(`
    <h3>홈 화면에 추가</h3>
    <p>${ios
      ? 'Safari 하단의 <b>공유</b> 버튼을 누르고 <b>홈 화면에 추가</b>를 선택하세요. 주소창 없이 앱처럼 열립니다.'
      : '브라우저 주소창 오른쪽의 설치 아이콘을 누르거나, 메뉴에서 <b>홈 화면에 추가</b>를 선택하세요.'}</p>
    <div class="modal-actions"><button class="btn dark" data-ok>알겠어요</button></div>`, (m) => {
    m.querySelector('[data-ok]').addEventListener('click', () => closeModal());
  });
}

async function installFlow() {
  if (isStandalone()) { toast('이미 앱으로 설치되어 있어요'); return; }
  if (S.installEvt) {
    const evt = S.installEvt;
    S.installEvt = null;
    evt.prompt();
    try {
      const choice = await evt.userChoice;
      if (choice?.outcome === 'accepted') toast('설치를 시작했어요');
    } catch { /* ignore */ }
    return;
  }
  openInstallGuide();
}

/* ---------- month picker ---------- */

function openMonthPicker() {
  let year = Number(S.ym.slice(0, 4));
  const nowYm = currentMonth();

  const paint = (modal) => {
    modal.querySelector('#pickYear').textContent = `${year}년`;
    const grid = modal.querySelector('#monthGrid');
    grid.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const ym = `${year}-${mm}`;
      return `<button class="mcell ${ym === S.ym ? 'on' : ''} ${ym === nowYm ? 'now' : ''}" data-ym="${ym}">${i + 1}월</button>`;
    }).join('');
    grid.querySelectorAll('[data-ym]').forEach((b) => {
      b.addEventListener('click', () => {
        S.ym = b.dataset.ym;
        closeModal();
        render();
      });
    });
  };

  openModal(`
    <h3>월 선택</h3>
    <div class="pick-head">
      <button class="icon-btn" data-year="-1" aria-label="이전 해">${I.chevL}</button>
      <strong id="pickYear"></strong>
      <button class="icon-btn" data-year="1" aria-label="다음 해">${I.chevR}</button>
    </div>
    <div class="month-grid" id="monthGrid"></div>
    <div class="modal-actions">
      <button class="btn ghost" id="pickNow">이번 달</button>
      <button class="btn dark" data-cancel>닫기</button>
    </div>`, (m) => {
    paint(m);
    m.querySelectorAll('[data-year]').forEach((b) => {
      b.addEventListener('click', () => { year += Number(b.dataset.year); paint(m); });
    });
    m.querySelector('#pickNow').addEventListener('click', () => {
      S.ym = nowYm;
      closeModal();
      render();
    });
    m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
  });
}

/* ---------- category reorder (drag & drop) ---------- */

let catDrag = null;

function catTargetFromY(y) {
  const d = catDrag;
  if (!d) return;
  // Compare against the layout as if the dragged row were temporarily removed,
  // so the drop slot tracks the finger instead of lagging one row behind.
  const all = Array.from(d.list.querySelectorAll('.cat-manage'));
  const rowIndex = all.indexOf(d.row);
  const rowH = d.row.offsetHeight;
  const addBtn = d.list.querySelector('.addcat');
  let ref = addBtn;

  for (const r of all) {
    if (r === d.row) continue;
    const rect = r.getBoundingClientRect();
    const center = rect.top + rect.height / 2 - (all.indexOf(r) > rowIndex ? rowH : 0);
    if (y < center) { ref = r; break; }
  }

  if (ref && d.row.nextElementSibling !== ref) {
    d.list.insertBefore(d.row, ref);
  }
}

function catAutoScroll() {
  if (!catDrag) return;
  const y = catDrag.lastY;
  const margin = 84;
  let delta = 0;
  if (y < margin) delta = -Math.min(14, Math.ceil((margin - y) / 5));
  else if (y > window.innerHeight - margin) delta = Math.min(14, Math.ceil((y - (window.innerHeight - margin)) / 5));
  if (delta) {
    window.scrollBy(0, delta);
    catTargetFromY(y);
  }
  catDrag.raf = requestAnimationFrame(catAutoScroll);
}

function beginCategoryDrag(e, handle) {
  if (catDrag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  const row = handle.closest('.cat-manage');
  const list = row?.closest('[data-cat-group]');
  if (!row || !list) return;

  e.preventDefault();

  const rect = row.getBoundingClientRect();
  const ghost = row.cloneNode(true);
  ghost.classList.add('ghost-cat');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.removeAttribute('data-cat-id');
  ghost.querySelectorAll('button').forEach((b) => b.setAttribute('tabindex', '-1'));
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.transform = 'translateY(0) scale(1.015)';
  document.body.appendChild(ghost);

  row.classList.add('placeholder');
  document.body.classList.add('cat-dragging');

  const onMove = (ev) => {
    if (!catDrag) return;
    const dy = ev.clientY - catDrag.startY;
    catDrag.lastY = ev.clientY;
    catDrag.dy = dy;
    if (Math.abs(dy) > 4) catDrag.moved = true;
    ghost.style.transform = `translateY(${dy}px) scale(1.015)`;
    catTargetFromY(ev.clientY);
  };

  const onUp = () => endCategoryDrag();

  catDrag = {
    row,
    list,
    ghost,
    startY: e.clientY,
    lastY: e.clientY,
    dy: 0,
    moved: false,
    type: list.dataset.catGroup,
    onMove,
    onUp,
    raf: 0
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  catDrag.raf = requestAnimationFrame(catAutoScroll);
}

function endCategoryDrag() {
  if (!catDrag) return;
  const d = catDrag;
  catDrag = null;
  cancelAnimationFrame(d.raf);
  window.removeEventListener('pointermove', d.onMove);
  window.removeEventListener('pointerup', d.onUp);
  window.removeEventListener('pointercancel', d.onUp);
  d.ghost.remove();
  d.row.classList.remove('placeholder');
  document.body.classList.remove('cat-dragging');

  if (d.moved) {
    const ids = Array.from(d.list.querySelectorAll('.cat-manage')).map((r) => r.dataset.catId);
    DB.reorderCategories(d.type, ids);
  }
}

function commitCategoryOrder(list) {
  DB.reorderCategories(
    list.dataset.catGroup,
    Array.from(list.querySelectorAll('.cat-manage')).map((r) => r.dataset.catId)
  );
}

/* ---------- cloud UI flows ---------- */

async function loginWithGoogle() {
  if (S.busy) return;
  S.busy = true;
  S.authError = '';
  if (S.pendingJoin) localStorage.setItem('moneybook.pendingJoin', S.pendingJoin);
  render();
  try {
    await Cloud.signInWithGoogle();
  } catch (e) {
    S.busy = false;
    S.authError = e?.message || 'Google 로그인을 시작하지 못했어요';
    render();
  }
}

function useGuestMode() {
  localStorage.setItem('moneybook.guest', '1');
  if (DB.storageKey !== 'moneybook.v1') DB.useStorage('moneybook.v1');
  Cloud.onData = null;
  S.mode = 'guest';
  S.authError = '';
  applyTheme();
  render();
}

function startLogin() {
  localStorage.removeItem('moneybook.guest');
  S.mode = 'auth';
  S.authError = '';
  render();
  refreshGoogleAvailability();
}

async function refreshGoogleAvailability() {
  const cfg = await Cloud.authSettings();
  if (!cfg) return;
  const enabled = Boolean(cfg.external?.google);
  if (enabled === S.googleEnabled) return;
  S.googleEnabled = enabled;
  if (S.mode === 'auth') render();
}

async function createHouseholdFlow() {
  if (S.busy) return;
  const name = ($('#hhName')?.value || '우리 가계부').trim().slice(0, 40) || '우리 가계부';
  S.hhDraft = name;
  S.busy = true;
  S.authError = '';
  try {
    const id = await Cloud.createHousehold(name);
    await Cloud.loadMemberships();
    await Cloud.activateHousehold(id);
    await Cloud.refreshMembers();
    S.mode = 'cloud';
    S.busy = false;
    render();
    toast('가계부를 만들었어요');
  } catch (e) {
    S.busy = false;
    S.authError = e?.message || '가계부를 만들지 못했어요';
    render();
  }
}

async function joinHouseholdFlow() {
  if (S.busy) return;
  const raw = S.pendingJoin || $('#joinCode')?.value || '';
  const code = String(raw).trim().toLowerCase();
  if (!/^[a-z0-9]{8}$/.test(code)) {
    S.authError = '초대 코드 8자리를 확인해 주세요';
    render();
    return;
  }
  S.joinDraft = code;
  S.busy = true;
  S.authError = '';
  try {
    const id = await Cloud.joinHousehold(code);
    await Cloud.loadMemberships();
    await Cloud.activateHousehold(id);
    await Cloud.refreshMembers();
    clearPendingJoin();
    S.mode = 'cloud';
    S.busy = false;
    render();
    toast('가계부에 참여했어요');
  } catch (e) {
    S.busy = false;
    S.authError = e?.message || '초대 코드로 참여하지 못했어요';
    render();
  }
}

async function signOutFlow() {
  const ok = await confirmDialog({
    title: '로그아웃할까요?',
    desc: '클라우드 기록은 안전하게 저장됩니다. 이 기기의 게스트 기록도 그대로 남아요.',
    confirm: '로그아웃',
    danger: false
  });
  if (!ok) return;
  await Cloud.signOut();
  DB.useStorage('moneybook.v1');
  S.mode = 'auth';
  S.tab = 'home';
  S.authError = '';
  applyTheme();
  render();
}

function inviteUrl() {
  const code = Cloud.household?.inviteCode;
  if (!code) return '';
  return `${location.origin}${location.pathname}?join=${code}`;
}

async function copyInvite() {
  const url = inviteUrl();
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    toast('초대 링크를 복사했어요');
  } catch {
    openModal(`
      <h3>초대 링크</h3>
      <p>아래 링크를 복사해 가족에게 보내세요.</p>
      <input class="modal-input text" id="inviteUrl" readonly value="${esc(url)}">
      <div class="modal-actions"><button class="btn dark" data-cancel>닫기</button></div>`, (m) => {
      m.querySelector('#inviteUrl').select();
      m.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
    });
  }
}

async function rotateInviteFlow() {
  const ok = await confirmDialog({
    title: '초대 코드를 바꿀까요?',
    desc: '기존 링크와 코드는 즉시 사용할 수 없게 됩니다.',
    confirm: '재발급'
  });
  if (!ok) return;
  try {
    await Cloud.rotateInviteCode();
    render();
    toast('새 초대 코드를 만들었어요');
  } catch (e) {
    toast(e?.message || '초대 코드를 바꾸지 못했어요');
  }
}

async function removeMemberFlow(userId) {
  const member = (Cloud.members || []).find((m) => m.id === userId);
  const ok = await confirmDialog({
    title: `${member?.name || '이 멤버'}님을 내보낼까요?`,
    desc: '이 가계부에 더 이상 접근할 수 없게 됩니다.',
    confirm: '내보내기'
  });
  if (!ok) return;
  try {
    await Cloud.removeMember(userId);
    render();
    toast('멤버를 내보냈어요');
  } catch (e) {
    toast(e?.message || '멤버를 내보내지 못했어요');
  }
}

async function switchHouseholdFlow(id) {
  if (!id || id === Cloud.householdId) return;
  try {
    S.tab = 'home';
    await Cloud.switchHousehold(id);
    await Cloud.refreshMembers();
    render();
    toast(`${Cloud.household?.name || '가계부'}로 이동했어요`);
  } catch (e) {
    toast(e?.message || '가계부를 전환하지 못했어요');
  }
}

async function syncNowFlow() {
  try {
    if (Cloud.pending) await Cloud.flush({ silent: false });
    else await Cloud.pull({ render: false });
    render();
    toast(Cloud.statusLabel());
  } catch (e) {
    toast(e?.message || '동기화하지 못했어요');
  }
}

let enteringCloud = false;

async function enterCloud() {
  if (enteringCloud) return;
  enteringCloud = true;
  S.busy = true;
  try {
    localStorage.removeItem('moneybook.guest');

    let usedCache = false;
    try {
      await Cloud.loadMemberships();
    } catch (e) {
      Cloud.memberships = Cloud.cachedMemberships();
      if (!Cloud.memberships.length) throw e;
      usedCache = true;
    }

    let joinedId = null;
    let joinError = '';
    if (S.pendingJoin) {
      try {
        joinedId = await Cloud.joinHousehold(S.pendingJoin);
        clearPendingJoin();
        toast('가계부에 참여했어요');
      } catch (e) {
        joinError = e?.message || '초대 코드를 확인해 주세요';
        S.authError = joinError;
        if (navigator.onLine) toast(joinError);
      }
    }

    if (!Cloud.memberships.length) {
      S.mode = 'onboarding';
      S.busy = false;
      render();
      return;
    }

    const hid = joinedId || Cloud.activeHouseholdId();
    await Cloud.activateHousehold(hid);

    if (!usedCache) {
      try { await Cloud.refreshMembers(); } catch { /* 이름은 나중에 갱신 */ }
    }

    S.mode = 'cloud';
    S.busy = false;
    S.authError = joinError;
    render();
  } catch (e) {
    S.busy = false;
    S.authError = e?.message || '클라우드에 연결하지 못했어요';
    S.mode = Cloud.user ? 'onboarding' : 'auth';
    render();
  } finally {
    enteringCloud = false;
  }
}

/* ---------- events ---------- */

document.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('[data-drag-cat]');
  if (handle) beginCategoryDrag(e, handle);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  const handle = e.target.closest?.('[data-drag-cat]');
  if (!handle) return;
  const row = handle.closest('.cat-manage');
  const list = row?.closest('[data-cat-group]');
  if (!row || !list) return;
  e.preventDefault();

  if (e.key === 'ArrowUp') {
    const prev = row.previousElementSibling;
    if (!prev || !prev.classList.contains('cat-manage')) return;
    list.insertBefore(row, prev);
  } else {
    const next = row.nextElementSibling;
    if (!next || !next.classList.contains('cat-manage')) return;
    list.insertBefore(next, row);
  }

  commitCategoryOrder(list);
  handle.focus({ preventScroll: true });
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act } = el.dataset;

  switch (act) {
    case 'tab': go(el.dataset.tab); break;
    case 'prev-month': S.ym = addMonths(S.ym, -1); render(); break;
    case 'next-month': S.ym = addMonths(S.ym, 1); render(); break;
    case 'pick-month': openMonthPicker(); break;
    case 'add': openTxSheet(); break;
    case 'edit': openTxSheet(el.dataset.id); break;
    case 'filter': S.filter = el.dataset.filter; render(); break;
    case 'stat-type': S.statType = el.dataset.type; render(); break;
    case 'close-sheet': closeSheet(); break;
    case 'key': pressKey(el.dataset.key); break;
    case 'tx-type': setDraftType(el.dataset.type); break;
    case 'pick-cat': pickCat(el.dataset.id); break;
    case 'save-tx': saveTx(); break;
    case 'delete-tx': deleteTxFlow(); break;
    case 'seed': seed(); break;
    case 'theme': setTheme(el.dataset.theme); break;
    case 'edit-budget': openBudgetDialog(); break;
    case 'export': exportData(); break;
    case 'import': $('#importFile').click(); break;
    case 'clear': clearFlow(); break;
    case 'install': installFlow(); break;
    case 'add-cat': openCategoryDialog(el.dataset.type); break;
    case 'del-cat': deleteCategoryFlow(el.dataset.type, el.dataset.id); break;
    case 'google-login': loginWithGoogle(); break;
    case 'guest-mode': useGuestMode(); break;
    case 'login': startLogin(); break;
    case 'create-hh': createHouseholdFlow(); break;
    case 'join-hh': joinHouseholdFlow(); break;
    case 'signout': signOutFlow(); break;
    case 'copy-invite': copyInvite(); break;
    case 'rotate-invite': rotateInviteFlow(); break;
    case 'remove-member': removeMemberFlow(el.dataset.id); break;
    case 'switch-hh': switchHouseholdFlow(el.dataset.id); break;
    case 'sync-now': syncNowFlow(); break;
    default: break;
  }
});

$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (file) await importData(file);
  e.target.value = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modalEl) { closeModal(); return; }
    if (S.draft) { closeSheet(); return; }
    return;
  }
  if (!S.draft) return;
  const typing = e.target.closest('input, select, textarea');
  if (typing) return;
  if (/^\d$/.test(e.key)) { e.preventDefault(); pressKey(e.key); return; }
  if (e.key === 'Backspace') { e.preventDefault(); pressKey('del'); return; }
  if (e.key === 'Enter') { e.preventDefault(); saveTx(); }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  S.installEvt = e;
});

window.addEventListener('appinstalled', () => {
  S.installEvt = null;
  toast('홈 화면에 추가했어요');
});

/* ---------- boot ---------- */

function parseJoinCode() {
  const params = new URLSearchParams(location.search);
  const join = String(params.get('join') || '').trim().toLowerCase();
  if (/^[a-z0-9]{8}$/.test(join)) {
    S.pendingJoin = join;
    try { localStorage.setItem('moneybook.pendingJoin', join); } catch { /* ignore */ }
  } else {
    const stored = String(localStorage.getItem('moneybook.pendingJoin') || '').trim().toLowerCase();
    if (/^[a-z0-9]{8}$/.test(stored)) S.pendingJoin = stored;
  }

  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  const err = params.get('error_description') || hashParams.get('error_description');
  if (err) S.authError = decodeURIComponent(err.replace(/\+/g, ' '));
}

function clearPendingJoin() {
  S.pendingJoin = null;
  try { localStorage.removeItem('moneybook.pendingJoin'); } catch { /* ignore */ }
  if (!location.search.includes('join=')) return;
  const url = new URL(location.href);
  url.searchParams.delete('join');
  history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash);
}

function handleQuery() {
  if (S.mode !== 'guest' && S.mode !== 'cloud') return;
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');
  if (['home', 'ledger', 'stats', 'settings'].includes(tab)) {
    S.tab = tab;
    render();
  }
  if (params.get('action') === 'add') {
    setTimeout(() => openTxSheet(), 320);
  }
}

async function boot() {
  applyTheme();
  parseJoinCode();
  S.mode = 'boot';
  render();

  Cloud.onData = () => {
    if (S.mode === 'cloud' && !catDrag) render();
  };
  Cloud.onStatus = () => {
    if (S.mode === 'cloud' && S.tab === 'settings' && !catDrag) render();
  };

  try {
    await Cloud.init();
  } catch (e) {
    S.authError = e?.message || '로그인 상태를 확인하지 못했어요';
  }

  if (Cloud.user) {
    await enterCloud();
  } else if (localStorage.getItem('moneybook.guest') === '1') {
    S.mode = 'guest';
    render();
  } else {
    S.mode = 'auth';
    render();
    refreshGoogleAvailability();
  }

  handleQuery();
}

window.addEventListener('mb:auth', (e) => {
  const event = e.detail?.event;
  if (event === 'SIGNED_OUT') {
    if (S.mode !== 'auth') {
      DB.useStorage('moneybook.v1');
      S.mode = 'auth';
      S.tab = 'home';
      S.authError = '';
      render();
    }
    return;
  }
  if (event === 'SIGNED_IN' && !enteringCloud && S.mode !== 'cloud') {
    enterCloud();
  }
});

boot();

/* Development/debug handle: enabled only with ?debug=1 on a local address. */
if (new URLSearchParams(location.search).has('debug')
  && ['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__MB = { S, Cloud, DB, render, go, openTxSheet, toast };
}

if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
      reg.update();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update();
      });
    }).catch(() => {});
  });
}
