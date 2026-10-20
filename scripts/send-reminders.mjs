/* Send Moneybook's warm 6pm / 10pm web-push reminders.
   Runs in GitHub Actions with server-side secrets; never ships to the browser. */

import webpush from 'web-push';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://odhzzlawithvcerazxta.supabase.co').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://leeyoonmin.github.io/moneybook/';
const APP_URL = process.env.APP_URL || 'https://leeyoonmin.github.io/moneybook/';
const APP_BASE = APP_URL.endsWith('/') ? APP_URL : `${APP_URL}/`;
const SLOT_INPUT = (process.env.SLOT || 'auto').toLowerCase();

if (!SERVICE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.');
  process.exit(1);
}

const messages = {
  evening: [
    {
      title: '오늘 하루도 수고했어요',
      body: '잠깐 앉아서 오늘 쓴 돈을 가볍게 적어볼까요? 1분이면 충분해요.'
    },
    {
      title: '저녁 기록, 잠깐 어때요?',
      body: '오늘의 작은 지출도 남겨두면 내일의 가계부가 한결 편해져요.'
    },
    {
      title: '머니북이 기다리고 있어요',
      body: '오늘 하루의 돈 이야기를 한 줄씩 남겨볼까요? 조용히, 가볍게.'
    }
  ],
  night: [
    {
      title: '오늘의 마지막 한 줄',
      body: '잠들기 전, 오늘 쓴 돈 한 줄만 남겨볼까요? 작은 기록이 마음을 가볍게 해요.'
    },
    {
      title: '내일의 나를 위한 1분',
      body: '오늘 기록을 마무리하고 편안히 쉬어요. 머니북이 내일도 함께할게요.'
    },
    {
      title: '불 끄기 전, 잠깐',
      body: '오늘의 지출을 정리해두면 내일 아침이 조금 더 홀가분해져요.'
    }
  ]
};

const kstHour = (new Date().getUTCHours() + 9) % 24;
const slot = ['evening', 'night'].includes(SLOT_INPUT)
  ? SLOT_INPUT
  : (kstHour >= 20 || kstHour < 6 ? 'night' : 'evening');

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(15000)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

function dateIn(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const subscriptions = await rest(
  'push_subscriptions?select=id,user_id,endpoint,p256dh,auth_key,timezone,last_sent_at&enabled=eq.true'
);

const result = {
  slot,
  checked: Array.isArray(subscriptions) ? subscriptions.length : 0,
  sent: 0,
  skippedRecorded: 0,
  skippedRecent: 0,
  removed: 0,
  failed: 0
};

for (const sub of Array.isArray(subscriptions) ? subscriptions : []) {
  if (!sub?.endpoint || !sub?.p256dh || !sub?.auth_key) {
    result.failed += 1;
    continue;
  }

  const last = sub.last_sent_at ? Date.parse(sub.last_sent_at) : 0;
  if (last && Date.now() - last < 90 * 60 * 1000) {
    result.skippedRecent += 1;
    continue;
  }

  const today = dateIn(sub.timezone);
  const recorded = await rest(
    `transactions?select=id&created_by=eq.${encodeURIComponent(sub.user_id)}&tx_date=eq.${today}&deleted_at=is.null&limit=1`
  );
  if (Array.isArray(recorded) && recorded.length) {
    result.skippedRecorded += 1;
    continue;
  }

  const message = pick(messages[slot]);
  const payload = {
    title: message.title,
    body: message.body,
    icon: `${APP_BASE}icons/icon-192.png`,
    badge: `${APP_BASE}icons/favicon.png`,
    tag: `moneybook-${slot}-${today}`,
    url: `${APP_BASE}?action=add`
  };

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      JSON.stringify(payload),
      { TTL: 3600, urgency: 'normal', timeout: 10000 }
    );
  } catch (err) {
    const status = Number(err?.statusCode) || 0;
    if (status === 404 || status === 410) {
      try {
        await rest(`push_subscriptions?id=eq.${encodeURIComponent(sub.id)}`, { method: 'DELETE' });
        result.removed += 1;
      } catch {
        result.failed += 1;
      }
    } else {
      result.failed += 1;
      console.warn(`push failed for one subscription (status ${status || 'unknown'})`);
    }
    continue;
  }

  result.sent += 1;
  try {
    await rest(`push_subscriptions?id=eq.${encodeURIComponent(sub.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ last_sent_at: new Date().toISOString() })
    });
  } catch {
    console.warn('sent a push but could not update last_sent_at');
  }
}

console.log(JSON.stringify(result));
