# 머니북 · 기록 알림 (Web Push)

매일 **저녁 6시**와 **밤 10시**에 따뜻한 톤으로 가계부 기록을 알려주는 웹 푸시입니다.
그날 이미 기록을 남겼다면 알림을 보내지 않아 조용합니다.

## 지금 준비된 것

- 앱 설정에 **기록 알림** 스위치와 권한 요청 UI
- 서비스 워커의 `push` / `notificationclick` 처리
- 구독 저장 테이블: [`supabase/push.sql`](./supabase/push.sql)
- 발송 스크립트: [`scripts/send-reminders.mjs`](./scripts/send-reminders.mjs)
- 예약 실행: [`.github/workflows/reminders.yml`](./.github/workflows/reminders.yml)
- VAPID 키
  - 공개 키: `js/config.js`의 `VAPID_PUBLIC_KEY` (공개해도 되는 키)
  - 비밀 키: 프로젝트 루트의 `.push-secrets.json` (**git에 올라가지 않음**)
- GitHub Actions secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` 설정 완료

## 남은 설정 2가지

### 1. 알림 구독 테이블 만들기

Supabase Dashboard → **SQL Editor**에서 [`supabase/push.sql`](./supabase/push.sql) 전체를 붙여넣고 **Run** 하세요.
이미 `schema.sql`을 적용한 프로젝트라면 이 파일만 실행하면 됩니다.

### 2. GitHub에 service role 키 추가

발송 스크립트가 구독 목록과 오늘 기록 여부를 읽어야 해서 **서버 전용 service role 키**가 필요합니다.
이 키는 RLS를 우회하므로 **절대 앱이나 채팅에 넣지 마세요.**

1. Supabase Dashboard → **Project Settings → API → service_role** 키를 복사
2. 터미널에서 아래 명령을 실행하면 값 입력 프롬프트가 나옵니다.

   ```bash
   cd "moneybook"
   gh secret set SUPABASE_SERVICE_ROLE_KEY
   ```

   프롬프트에 복사한 키를 붙여넣으세요. 명령 기록이나 채팅에는 남기지 마세요.

> `SUPABASE_URL` secret은 따로 필요 없습니다. 스크립트에 현재 프로젝트 URL이 기본값으로 들어 있습니다.
> 다른 프로젝트로 옮길 때만 `gh secret set SUPABASE_URL`로 덮어쓰면 됩니다.

## 앱에서 알림 켜기

1. **https://leeyoonmin.github.io/moneybook/** 에서 Google 로그인
2. **설정 → 알림 → 기록 알림** 스위치 켜기
3. 브라우저의 알림 권한을 **허용**
4. “매일 저녁 6시와 10시에 알려드릴게요” 토스트가 나오면 완료

> 알림은 **기기별**로 설정됩니다. 휴대폰과 데스크톱에서 각각 켜면 두 곳 모두 받습니다.
> **iPhone/iPad**는 iOS 16.4 이상에서 **홈 화면에 추가한 PWA**에서만 웹 푸시를 받을 수 있습니다.
> 앱 설정의 “홈 화면에 추가”를 먼저 진행하세요.

## 테스트

워크플로를 수동으로 한 번 실행할 수 있습니다.

```bash
gh workflow run reminders.yml -f slot=evening
```

- 알림을 받을 계정이 **오늘 아직 기록하지 않은 상태**여야 테스트 알림이 옵니다.
- 이미 기록했다면 정상적으로 건너뜁니다. (로그에 `skippedRecorded`)
- 실행 결과는 GitHub → **Actions → moneybook-reminders**에서 확인하세요.

## 예약 시간

| KST | UTC | 슬롯 |
|---|---|---|
| 18:00 | 09:00 | `evening` |
| 22:00 | 13:00 | `night` |

GitHub Actions의 스케줄은 몇 분 늦게 실행될 수 있습니다. 조용한 알림이라면 충분하지만,
초 단위로 정확해야 한다면 별도 스케줄러로 `scripts/send-reminders.mjs`를 실행하면 됩니다.

## 알림 문구

저녁에는 “오늘 하루도 수고했어요”, 밤에는 “오늘의 마지막 한 줄”처럼
매번 조금씩 다른 따뜻한 문구 중 하나를 보냅니다. 금액이나 지출 내용은 알림에 넣지 않습니다.

## 문제가 생기면

| 증상 | 확인할 것 |
|---|---|
| 알림이 전혀 안 옴 | 설정의 스위치가 켜져 있는지, 브라우저 알림 권한이 허용인지 |
| iPhone에서 안 옴 | 홈 화면에 추가한 앱인지, iOS 16.4 이상인지 |
| `relation "push_subscriptions" does not exist` | `supabase/push.sql`을 아직 실행하지 않음 |
| Actions가 401/403으로 실패 | `SUPABASE_SERVICE_ROLE_KEY` secret이 올바른지 |
| Actions가 VAPID 오류로 실패 | `VAPID_*` secrets가 `js/config.js`의 공개 키와 짝이 맞는지 |
| 알림이 두 번 옴 | 기기를 여러 개에서 켰는지, 같은 기기의 구독 행이 중복인지 |
| 알림이 안 오고 로그에 `skippedRecorded` | 오늘 이미 기록해서 정상적으로 건너뛴 것 |

GitHub Actions 스케줄은 저장소가 오랫동안 조용하면 비활성화될 수 있습니다.
그때는 Actions에서 워크플로를 한 번 수동 실행하면 다시 살아납니다.

## 보안

- `service_role` 키는 GitHub Actions secret에만 보관합니다. 앱 번들·저장소·채팅에는 넣지 않습니다.
- VAPID 비밀 키는 `.push-secrets.json`과 GitHub Actions secret에만 있습니다. `.push-secrets.json`은 `.gitignore`에 포함되어 있습니다.
- `push_subscriptions`는 RLS로 본인 행만 읽고 쓸 수 있습니다. 발송 스크립트만 service role로 전체 구독을 읽습니다.
- 알림에는 지출 금액이나 메모를 담지 않습니다. “기록해 볼까요?”라는 안내만 보냅니다.
- 구독이 만료되면(404/410) 발송 스크립트가 해당 행을 자동 삭제합니다.
