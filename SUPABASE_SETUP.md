# 머니북 · Supabase + Google 로그인 설정 가이드

가족·지인과 함께 쓰는 **클라우드 가계부**를 위한 설정입니다.
로컬(게스트) 데이터는 그대로 보존되고, 클라우드 가계부는 빈 상태로 시작합니다.

---

## 현재 상태

이미 완료된 것:

- Supabase 프로젝트: `https://odhzzlawithvcerazxta.supabase.co`
- `supabase/schema.sql` 적용 완료 (테이블·RLS·RPC·Realtime)
- 앱에 Project URL + publishable key 연결 (`js/config.js`)
- 앱 코드: Google 로그인, 가계부 생성/참여, 멤버·초대, 오프라인 동기화

남은 것:

- **Google provider 활성화** (아래 3번)
- **Auth URL Configuration**에 앱 주소 등록 (아래 3-3)

> Google provider가 꺼져 있으면 앱이 부팅 시 이를 감지해 로그인 버튼을 비활성화하고
> “Google 로그인이 아직 활성화되지 않았어요”라고 안내합니다.

---

## 1. Supabase 프로젝트

이미 프로젝트가 있으므로 이 단계는 건너뜁니다.
새로 만들 경우에만: https://supabase.com/dashboard → **New project**
(리전: Northeast Asia (Seoul) 권장)

## 2. 스키마

이미 적용되어 있으면 건너뜁니다. 다시 적용해야 한다면:

1. Supabase 왼쪽 메뉴 → **SQL Editor** → **New query**
2. [`supabase/schema.sql`](./supabase/schema.sql) 전체를 붙여넣고 **Run**

포함된 것:

- `profiles`, `households`, `household_members`, `categories`, `transactions`, `budgets`
- 가계부 공유를 위한 RLS(행 수준 보안)와 멤버십 함수
- 가계부 생성 / 초대 코드 참여 / 초대 코드 재발급 / 카테고리 삭제 RPC
- 실시간 동기화용 Realtime publication

## 3. Google 로그인 설정

### 3-1. Google Cloud OAuth 클라이언트

1. https://console.cloud.google.com → 프로젝트 선택/생성
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `머니북`, 지원 이메일·개발자 이메일 입력
   - Scopes: 기본값(`email`, `profile`, `openid`) 그대로 저장
   - Testing 상태라면 **Test users**에 가족/지인의 Google 이메일을 추가
     (또는 앱을 Publish — 기본 프로필 범위는 별도 검증 없이 게시 가능)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:8137`
     - `http://127.0.0.1:8137` (둘 중 실제로 접속하는 주소)
     - (배포 후) `https://<배포-도메인>`
   - Authorized redirect URIs:
     - `https://odhzzlawithvcerazxta.supabase.co/auth/v1/callback`
4. 생성된 **Client ID / Client secret** 복사

> `localhost`와 `127.0.0.1`은 서로 다른 origin입니다. **앱을 여는 주소와 동일한 origin**을
> Google과 Supabase 양쪽에 등록해야 로그인 후 돌아옵니다. (권장: `localhost:8137` 사용)

### 3-2. Supabase에 Google provider 등록

1. Supabase → **Authentication → Providers → Google**
2. **Enable** 켜기
3. Client ID / Client secret 붙여넣기 → **Save**
4. 잠시 후 앱을 새로고침하면 로그인 버튼이 활성화됩니다
   (앱이 `/auth/v1/settings`로 자동 확인)

### 3-3. Supabase URL 설정

**Authentication → URL Configuration**

- Site URL: `http://localhost:8137`
- Redirect URLs:
  - `http://localhost:8137`
  - `http://localhost:8137/**`
  - `http://127.0.0.1:8137`
  - `http://127.0.0.1:8137/**`
  - (배포 후) `https://<배포-도메인>` 및 `https://<배포-도메인>/**`

## 4. 테스트

1. 서버 실행
   ```bash
   cd "moneybook"
   python3 -m http.server 8137
   ```
2. 브라우저에서 **http://localhost:8137** 접속
3. **Google로 계속하기** → 계정 선택
4. 첫 로그인: 가계부 이름을 정하고 **가계부 만들기**
5. **설정 → 초대 링크 복사**로 가족에게 링크 전달
6. 가족이 링크를 열고 Google 로그인 → 자동으로 같은 가계부에 참여
7. 한쪽에서 기록을 추가하면 다른 쪽에 실시간으로 반영되는지 확인

## 5. 배포 후 (GitHub Pages)

현재 앱: **https://leeyoonmin.github.io/moneybook/**

배포 주소에서 로그인하려면 Supabase **Authentication → URL Configuration**에 추가:

- Site URL: `https://leeyoonmin.github.io/moneybook/`
- Redirect URLs:
  - `https://leeyoonmin.github.io/moneybook`
  - `https://leeyoonmin.github.io/moneybook/**`
  - `http://localhost:8137`, `http://localhost:8137/**` (로컬 개발용)

Google Cloud의 **Authorized redirect URI**는 그대로
`https://odhzzlawithvcerazxta.supabase.co/auth/v1/callback` 하나만 사용합니다.
(앱 도메인은 Google에 직접 등록하지 않습니다.)

> GitHub Pages는 공개 저장소로 배포됩니다. 소스에 `service_role` 같은 비밀 키는 없고,
> 실제 가계부 데이터는 Supabase RLS로 보호됩니다. 검색 노출을 막기 위해
> `robots.txt`와 `noindex`를 적용했습니다.

## 참고

- Google Cloud 설정이 번거로우면 **이메일 매직링크**로 대체할 수 있습니다.
  Supabase에서 Email provider만 켜면 되어 설정이 훨씬 간단합니다.
- Supabase 무료 프로젝트는 장기간 미사용 시 일시정지될 수 있습니다.
  대시보드에서 **Restore**하면 데이터는 유지됩니다.
- `service_role` 키는 절대 앱이나 채팅에 넣지 마세요. 서버 전용 비밀 키입니다.
- 초대 코드는 가계부 설정에서 확인/재발급할 수 있습니다.
