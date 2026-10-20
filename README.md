# 머니북 (moneybook)

가족·지인과 함께 쓰는 모바일 가계부 PWA. **로컬 우선(local-first)** 으로 동작하고,
Supabase에 Google 로그인하면 같은 가계부를 여러 기기에서 실시간으로 공유합니다.

![app icon](./icons/icon-192.png)

## 기능

- **수입·지출 기록** — 커스텀 숫자 키패드, 카테고리 / 날짜 / 결제수단 / 메모, 상단 손잡이를 아래로 드래그해 닫기
- **주간 홈** — 이번 주 지출, 지난주 같은 기간 대비, 요일별 막대, 월 예산 진행률. 상단에서 **주간/월간** 전환
- **월간 보기** — 월 예산 사용률, 하루 평균, 최근 기록을 월 단위로 확인
- **기록** — 날짜별 그룹, 지출/수입 필터, 탭해서 수정·삭제
- **통계** — 카테고리 도넛 차트, 순위, 최근 6개월 추이, 지난달 대비 인사이트
- **가족 공유** — Google 로그인, 가계부(household) 생성, 초대 링크/코드 참여, 멤버 목록·권한
- **오프라인** — 기록은 즉시 로컬에 저장하고, 연결되면 자동으로 동기화(대기열)
- **설정** — 월별 예산, 카테고리 추가·삭제 및 순서 변경(드래그/↑↓), 테마, JSON 백업/복원
- **기록 알림** — 매일 저녁 6시·10시, 이미 기록한 날은 건너뛰는 따뜻한 웹 푸시
- **PWA** — 홈 화면 설치, 앱 바로가기, 오프라인 앱 셸, 자동 업데이트

## 로그인과 데이터

- **게스트 모드**: 로그인 없이 이 기기에만 저장 (`localStorage: moneybook.v1`)
- **클라우드 모드**: Google 로그인 후 Supabase의 가계부에 저장
  - 로컬 캐시: `moneybook.cloud.<household-id>`
  - 동기화 대기열: `moneybook.queue.<household-id>`
- 게스트 기록은 로그인해도 **자동으로 업로드되지 않습니다**. 클라우드는 빈 상태로 시작합니다.
- 클라우드 데이터는 Supabase RLS(행 수준 보안)로 보호됩니다. 브라우저에 들어가는
  `anon` / `publishable` 키는 공개 키이며, `service_role` 키는 절대 사용하지 않습니다.

## 실행

```bash
cd "moneybook"
python3 -m http.server 8137
# http://localhost:8137
```

ES 모듈을 사용하므로 `file://`로 열면 동작하지 않습니다. 반드시 HTTP로 실행하세요.

## Supabase 설정

처음 한 번, 본인 Supabase 프로젝트와 Google 로그인을 설정해야 합니다.

1. [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)의 순서대로 진행
2. `supabase/schema.sql`을 SQL Editor에서 실행
3. `js/config.js`에 Project URL과 publishable/anon key 입력 (이미 설정됨)
4. Google provider와 Auth URL Configuration 설정

> 현재 프로젝트는 `https://odhzzlawithvcerazxta.supabase.co`에 연결되어 있고,
> Google provider가 켜져 있어야 로그인 버튼이 활성화됩니다. (앱이 부팅 시 자동 확인)

## 알림

매일 18:00 / 22:00 KST에 기록을 권하는 웹 푸시입니다.
그날 이미 기록했다면 보내지 않습니다. 설치는 [`PUSH_SETUP.md`](./PUSH_SETUP.md)를 참고하세요.

- 구독 테이블: `supabase/push.sql` (RLS로 본인 구독만 접근)
- 발송: GitHub Actions + `scripts/send-reminders.mjs` (service role은 GitHub secret에만)
- 앱: **설정 → 알림 → 기록 알림**에서 기기별로 켜기

## 배포

현재 **GitHub Pages**에 배포되어 있습니다.

- 앱: **https://leeyoonmin.github.io/moneybook/**
- 저장소: https://github.com/leeyoonmin/moneybook (공개)
- 정적 파일만 사용하므로 별도 빌드가 필요 없습니다.

배포 후 Supabase **Authentication → URL Configuration**에 아래를 추가해야
배포 주소에서 Google 로그인이 동작합니다.

- Site URL: `https://leeyoonmin.github.io/moneybook/`
- Redirect URLs:
  - `https://leeyoonmin.github.io/moneybook`
  - `https://leeyoonmin.github.io/moneybook/**`
  - `http://localhost:8137/**` (로컬 개발용으로 유지)

> Google OAuth의 Redirect URI는 계속
> `https://odhzzlawithvcerazxta.supabase.co/auth/v1/callback` 하나만 사용합니다.
> 앱 주소가 바뀌면 Supabase의 Redirect URLs만 추가하면 됩니다.

### 업데이트 배포

```bash
git add -A
git commit -m "변경 내용"
git push
```

GitHub Pages가 `main` 브랜치를 자동으로 다시 빌드합니다(보통 1~2분).
서비스 워커는 앱 코드를 network-first로 받아오므로, 배포 후 새로고침하면 최신 버전이 적용됩니다.

## 휴대폰에서 설치 (PWA)

서비스 워커와 설치는 HTTPS(또는 localhost)에서만 동작합니다.

1. 위 **배포** 주소(https://leeyoonmin.github.io/moneybook/)를 연다.
   - 로컬 테스트: `python3 -m http.server 8137` → http://localhost:8137
2. 휴대폰에서 URL을 연 뒤 **설정 → 홈 화면에 추가**
3. Supabase **Authentication → URL Configuration**에 배포 도메인을 추가한다.
   Google OAuth의 Redirect URI는 Supabase 콜백 하나만 사용한다.

## 구조

```
moneybook/
├── index.html              # 앱 셸
├── manifest.webmanifest    # PWA 매니페스트
├── sw.js                   # 서비스 워커 (코드 network-first, 이미지 cache-first)
├── css/style.css           # 디자인 토큰 + 모바일 UI + 로그인/공유 화면
├── js/store.js             # 로컬 데이터 레이어(게스트/클라우드 캐시 공용)
├── js/cloud.js             # Supabase 인증·가계부·동기화 큐·Realtime
├── js/vendor/supabase.js   # Supabase JS SDK (오프라인 캐시용 번들)
├── js/app.js               # 화면 렌더링·차트·바텀시트·이벤트
├── js/config.js            # Supabase URL / publishable key / VAPID public key
├── supabase/schema.sql     # 테이블·RLS·RPC·Realtime
├── supabase/push.sql       # 웹 푸시 구독 테이블 (증분 적용)
├── scripts/send-reminders.mjs  # 6시/10시 웹 푸시 발송
├── .github/workflows/reminders.yml # GitHub Actions 예약 실행
└── icons/                  # 192/512/maskable/apple-touch/favicon
```

## 동기화 방식

- 모든 변경은 먼저 로컬에 저장하고, `moneybook.queue.<hid>`에 작업을 쌓습니다.
- 온라인/앱 복귀/변경 직후에 큐를 Supabase로 전송합니다.
- 성공하면 서버 스냅샷을 다시 받아 로컬 캐시를 갱신합니다.
- 가족의 변경은 Supabase Realtime 이벤트 → 디바운스된 새로고침으로 반영합니다.
- 거래 삭제는 soft delete(`deleted_at`)로 처리해 오프라인 기기가 나중에 합류해도 일관됩니다.
- 충돌은 마지막 저장 우선(last write wins)입니다. 가계부 특성상 동시 편집은 드뭅니다.

## 메모

- 금액은 원(KRW) 단위 정수로 저장합니다.
- 주는 **월요일 시작**입니다. 이번 주 비교는 현재 요일까지의 **지난주 같은 기간**과 비교하고,
  히어로 하단에는 지난주 총액을 함께 보여줍니다.
- 홈은 **주간**이 기본이고, 상단 토글로 **월간** 보기로 전환할 수 있습니다.
- 알림은 **기기별**로 설정됩니다. 이미 기록한 날은 6시·10시 알림을 모두 건너뜁니다.
- iPhone/iPad 웹 푸시는 iOS 16.4 이상에서 **홈 화면에 추가한 PWA**에서만 동작합니다.
- 예산은 **월별로 독립**입니다. 다음 달은 새로 설정합니다.
- 카테고리를 삭제하면 해당 기록은 서버 RPC에서 '기타'로 이동합니다.
- 카테고리 순서는 설정에서 바꾸면 기록 입력 화면의 칩 순서에도 반영됩니다.
- Supabase 무료 프로젝트는 장기간 미사용 시 일시정지될 수 있으며, 복구하면 데이터는 유지됩니다.
- 서비스 워커 캐시 이름(`sw.js`의 `CACHE`)을 올리면 배포 후 즉시 갱신됩니다.
