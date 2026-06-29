# PRD — banacon: 친구 14명 일정 공유 웹앱

> 본 문서는 제품 요구사항 정의서(PRD)이자 **단일 진실 공급원(single source of
> truth)**이다. 요구사항(1~13장) + 구현 단계·진행 상태(14장)를 모두 포함한다.
> 검증/구현 에이전트(예: Codex)와 새 세션은 **이 문서만 읽고** 이어서 작업한다.
>
> **세션이 초기화되면**: 14장 "재개 방법"을 따른다 — 진행 상태 표에서 첫 번째
> 미완료 Phase를 찾아 그 Phase만 구현하고, 검증 후 표를 갱신한 다음 멈춘다.

---

## 1. 개요 (Overview)
오래 알고 지낸 친구 14명이 서로의 일정을 한곳에서 공유하는 모바일 우선 웹앱.
누군가 모임/일정을 올리면 나머지가 **참석 / 불참 / 미정**으로 응답하고, 누가
오는지 확인하며, 일정마다 댓글로 소통하고, 새 일정·임박 일정을 앱 안에서
알림으로 받는다. 링크만으로 바로 쓸 수 있어야 한다.

## 2. 목표 (Goals) / 비목표 (Non-goals)
**목표**
- 일정 등록 → 참석 의사 표시 → 참석자 확인의 흐름이 3탭 이내로 끝난다.
- 모두의 일정을 캘린더로 한눈에 본다.
- 일정별 댓글로 가벼운 조율(시간/장소)이 가능하다.
- 새 일정/임박 일정을 놓치지 않도록 앱 내 알림을 받는다.
- 가입 절차 없이(이메일/비밀번호 없이) 친구들이 즉시 사용한다.

**비목표 (MVP 제외)**
- 웹푸시/이메일/카카오 알림 (앱 내 알림 피드만). *향후 확장.*
- 반복 일정, 일정 수정 이력, 첨부파일, 사진첩.
- 외부 캘린더(구글 캘린더) 연동.
- 그룹/방 다중화 — **단일 그룹(친구 14명) 전제**.
- 실시간 푸시 동기화 — **폴링으로 대체**.

## 3. 사용자 (Users)
- 사전 등록된 **고정 14명**. 회원가입 없음. 사용자 row는 앱에서 삭제하지 않는다.
- 모두 동등한 권한(관리자 구분 없음). 누구나 일정 생성/댓글 가능.
- **일정 삭제는 생성자 본인만.** 일정 수정은 **MVP 제외**(향후).
- ⚠️ **신원 보장 약함**: 이름 선택 + 공유 초대코드 방식이라, 초대코드를 아는
  사람은 누구나 다른 친구 이름으로 입장 가능하다. 친한 친구 그룹 전용이라
  이 위험을 감수한다. 강화가 필요하면 개인 PIN을 추가한다(7장 참조).

## 4. 핵심 기능 (Features)

### F1. 일정 공유 + 참석/불참
- 일정 생성: 제목(필수, 최대 80자), 설명, 장소, 시작일시(필수), 종료일시(선택).
- 각 사용자는 일정마다 **참석(going) / 불참(not_going) / 미정(maybe)** 중 하나를 토글.
- 한 사용자당 한 일정에 하나의 상태만 (재선택 시 갱신/upsert).
- **참석 기본값**: 일정 생성 시 attendance row를 미리 만들지 **않는다**.
  - `attendances` row 없음 = **미응답(no_response)** — 아직 안 본/응답 안 한 사람.
  - `no_response`는 DB 상태값이 아니라 **화면에서만** 계산해 표시한다(전체 14명 −
    응답자 = 미응답). 따라서 "아직 안 본 사람"과 "미정 선택한 사람"이 구분된다.
- 일정 상세에서 상태별 명단 표시: 가는중 N · 미정 N · 불참 N · **미응답 N**.

### F2. 전체 캘린더
- 월(月) 그리드에 일정이 있는 날짜에 점/배지 표시.
- 날짜 선택 시 그 날의 일정 목록 표시.
- 모바일에서는 아젠다(목록) 토글 제공.

### F3. 댓글
- 일정별 댓글 작성/조회 (작성자 이름 + 시간 + 본문, 본문 최대 1000자).
- 폴링으로 수 초 내 다른 사용자의 새 댓글이 보인다.

### F4. 앱 내 알림
- 알림 피드 화면 + 하단 탭바에 안읽음 개수 배지.
- 알림 종류 (MVP):
  - `new_event`: 새 일정 등록 시 생성자 제외 13명에게.
  - `event_soon`: 시작 24시간 이내 일정의 참석/미정자에게.
    DB unique 제약으로 **중복 생성 방지**(5장 인덱스 참조) — cron 재실행/경쟁
    조건에도 1인·1이벤트당 1건만.
- 알림 확인 시 read 처리.
- `new_comment` 알림은 **MVP 제외**(관심 대상 정의가 애매하고, 댓글은 폴링으로
  충분). 향후 확장.
- 일정 삭제 시 해당 일정 관련 알림은 함께 삭제된다(5장 cascade).

## 5. 데이터 모델 (Data Model)
모든 테이블: `id uuid PK (default gen_random_uuid())`, `created_at timestamptz default now()`.
`status`, `type`은 Drizzle **pgEnum**으로 관리(텍스트 CHECK 대신).

```
attendance_status = enum('going','not_going','maybe')   -- 'no_response'는 DB에 없음(화면 계산)
notification_type = enum('new_event','event_soon')      -- new_comment는 MVP 제외
```

| 테이블 | 컬럼 | 비고 |
|---|---|---|
| **users** | `name varchar(40) UNIQUE NOT NULL`, `avatar_color text` | 사전 시드 14명, 앱에서 삭제 안 함 |
| **events** | `creator_id uuid → users (ON DELETE RESTRICT)`, `title varchar(80) NOT NULL`, `description text`, `location text`, `start_at timestamptz NOT NULL`, `end_at timestamptz NULL` | 생성자만 삭제 |
| **attendances** | `event_id uuid → events (ON DELETE CASCADE)`, `user_id uuid → users (ON DELETE RESTRICT)`, `status attendance_status NOT NULL`, `updated_at timestamptz` | **UNIQUE(event_id, user_id)** — upsert |
| **comments** | `event_id uuid → events (ON DELETE CASCADE)`, `user_id uuid → users (ON DELETE RESTRICT)`, `body varchar(1000) NOT NULL` | |
| **notifications** | `user_id uuid → users (ON DELETE RESTRICT)` (수신자), `type notification_type NOT NULL`, `event_id uuid → events (ON DELETE CASCADE) NULL`, `payload jsonb` (제목 스냅샷 등), `read_at timestamptz NULL` | |

**관계**: users 1—N events/attendances/comments/notifications · events 1—N attendances/comments/notifications.

**삭제 정책**
- 일정 삭제(생성자만) → 해당 `attendances`/`comments`/`notifications`는 **CASCADE 삭제**.
- 사용자는 앱에서 삭제하지 않음(`creator_id` 등 모두 `ON DELETE RESTRICT`로 보호).

**인덱스 / 제약**
- `attendances(event_id)`, `comments(event_id, created_at)`,
  `notifications(user_id, read_at)`, `events(start_at)`
- **중복 알림 방지**: `event_id`가 NULL이 아닌 알림에 한해
  **partial unique index** `(user_id, event_id, type) WHERE event_id IS NOT NULL`.
  → `event_soon` cron 재실행/경쟁 조건에도 1인·1이벤트·1타입당 1건만 보장.

## 6. 화면 / 라우트 (Screens)
| 라우트 | 설명 |
|---|---|
| `/` | 로그인 상태 → `/calendar`, 아니면 → `/login` |
| `/login` | 공유 초대코드 입력 + 이름 그리드(14명) 선택 → 세션 쿠키 발급 |
| `/calendar` | 월 달력(이벤트 표시) + 날짜 선택 목록 / 모바일 아젠다 토글 |
| `/events/new` | 일정 생성 폼 |
| `/events/[id]` | 일정 정보 + 참석 명단 + 내 상태 토글 + 댓글(폴링) |
| `/notifications` | 알림 피드 + 안읽음 배지 |
| 공통 레이아웃 | 모바일 하단 탭바: 캘린더 / 새 일정 / 알림 / 나 |

## 7. 인증 / 보안 (Auth)
이름 선택 기반의 가벼운 인증. 비밀번호 없음.
1. **공유 초대코드** (`APP_INVITE_CODE`, 서버에서만 검증) — 외부 무작위 접근 차단.
2. **이름 선택** — 코드 통과 후 14명 중 본인 선택.
3. **서명 세션 쿠키** — 선택한 `user.id`를 jose로 서명, `httpOnly + Secure + SameSite=Lax + 만료`.
4. **서버 권위 판정** — 모든 쓰기(mutation)는 쿠키의 user_id만 신뢰. 클라이언트가 보낸 id 불신뢰.

⚠️ **신원 보장 약함 (MVP 의도된 한계)**: 비밀번호/PIN이 없어 초대코드를 아는
사람은 누구나 다른 친구 이름을 골라 입장할 수 있다. 친한 친구 그룹 전용 전제로
감수한다.
**(향후 확장) 개인 4자리 PIN** — `users.pin_hash` 컬럼 추가 + 로그인 시 PIN 입력
단계만 더하면 위장 입장을 막을 수 있다. 데이터 모델/세션 구조는 이 확장을
염두에 두고 설계한다.

**핵심 원칙**: 클라이언트는 DB에 직접 접근하지 않는다. 모든 읽기·쓰기는 Next.js
서버(서버 액션/route handler)를 통하고, DB 연결 문자열은 서버 전용 환경변수로만 둔다.

## 8. 기술 스택 (Tech Stack)
| 레이어 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js (App Router) + React + TypeScript | Server Actions로 쓰기 |
| 스타일 | Tailwind CSS | 모바일 우선 반응형 |
| DB | Neon Postgres (무료, 연결 문자열 1개) | 키/RLS/실시간 설정 불필요 |
| ORM | Drizzle (+ drizzle-kit) | 스키마/마이그레이션 |
| 날짜 | date-fns | 캘린더 계산 |
| 데이터 갱신 | 클라이언트 폴링 (SWR `refreshInterval` 3~5초) | 실시간 대체 |
| 세션 | jose (서명 쿠키) | 위조 방지 |
| 배포 | Vercel + Neon + Vercel Cron | 전부 무료 티어 |

**서버 액션** (`src/app/actions.ts`): `login`, `createEvent`, `setAttendance`,
`addComment`, `markNotificationsRead`.

## 9. 동작 방식 (How it works)
- **폴링**: 이벤트 상세(댓글/참석), 알림 배지는 클라이언트에서 3~5초 간격 refetch.
  캘린더/목록은 포커스 시 + 완만한 주기 갱신.
- **new_event 알림**: `createEvent` 액션이 본인 제외 13명에게 notifications 일괄 insert.
- **event_soon 알림**: `vercel.json` cron(매시간) → 보호된 route handler(`CRON_SECRET`로
  인증) → 24h 내 시작 이벤트의 참석/미정자에게 insert. 중복은 앱 코드 확인이 아니라
  **DB partial unique index**가 보장(`ON CONFLICT DO NOTHING`으로 idempotent insert).

## 10. 비기능 요구사항 (Non-functional)
- **반응형**: 모바일(375px~) 우선, 데스크톱도 깨지지 않게.
- **PWA**: manifest + 아이콘, "홈 화면에 추가" 동작.
- **성능 규모**: 동시 사용자 ~14명, 데이터 소량 — 폴링 부하 무시 가능.
- **시간대**: 저장은 UTC(timestamptz). **사용자 입력 날짜/시간은 KST(Asia/Seoul)로
  해석**하고, 표시도 KST 기준. (모든 친구가 한국에 있다는 전제. 클라이언트 로컬
  타임존에 의존하지 말고 KST로 고정 처리.)
- **접근 제어**: 미로그인 시 모든 보호 라우트 → `/login` 리다이렉트(middleware).

## 11. 환경변수 (Environment)
```
DATABASE_URL        = <Neon connection string>   # 서버 전용
SESSION_SECRET      = <랜덤 32바이트 이상>         # 쿠키 서명
APP_INVITE_CODE     = <친구방에 공유할 코드>
CRON_SECRET         = <임박 알림 cron 보호용>      # route handler 인증
```

## 12. 수용 기준 (Acceptance Criteria, E2E)
1. 미로그인으로 `/calendar` 접근 → `/login` 리다이렉트.
2. 잘못된 초대코드 → 거부. 올바른 코드 + 이름 선택 → 로그인 성공, 쿠키 발급.
3. A가 일정 생성 → B의 캘린더/목록에 수 초 내 표시, B에게 `new_event` 알림.
4. B가 "참석" 토글 → A 상세 명단에 수 초 내 반영. 재토글 시 상태 갱신(중복 행 없음).
5. 아무도 응답 안 한 일정 → 명단에 **미응답 14명**으로 표시. 일부 응답 시 미응답
   수가 정확히 줄어든다(응답자와 미응답자가 구분됨).
6. A·B가 댓글 작성 → 서로의 화면에 폴링으로 수 초 내 반영. 1000자 초과 거부.
7. 임박 cron을 **두 번** 호출해도 24h 내 일정 참석/미정자당 `event_soon` 알림은
   **정확히 1건**(partial unique index가 중복 차단).
8. 생성자가 일정 삭제 → 관련 참석/댓글/알림이 모두 사라진다(다른 일정엔 영향 없음).
   생성자가 아닌 사용자는 삭제 불가.
9. 모바일 폭에서 하단 탭바/달력/폼 레이아웃 정상, "홈 화면에 추가" 동작.
10. 클라이언트 번들에 `DATABASE_URL`/`SESSION_SECRET`/`APP_INVITE_CODE` 미노출.

## 13. 결정 사항 (검증 반영 완료)
- 로그인 보안: **초대코드만** (PIN 없음). 신원 보장 약함을 명시하고, PIN은 향후
  확장으로 설계만 열어둠. → 3·7장.
- 일정 **수정 기능 제외**, **삭제만** 제공(생성자 한정). → 3·5장.
- `new_comment` 알림 **MVP 제외**. → 4장 F4.
- 참석 기본값: **row 없음 = 미응답(no_response)**, 화면에서만 계산. → 4장 F1.
- `event_soon` 중복 방지: **DB partial unique index** + `ON CONFLICT DO NOTHING`. → 5·9장.
- 삭제 시 연쇄: 일정 삭제 → 참석/댓글/알림 **CASCADE**. 사용자/생성자 참조는 RESTRICT. → 5장.
- 시간대: **입력·표시 모두 KST 고정**, 저장은 UTC. → 10장.
- 길이 제한: title 80자, comment 1000자, name 40자. status/type는 pgEnum. → 5장.

남은 선택(구현 중 판단 가능, 차단 요소 아님):
- 일정 종료일시 미입력 시 기본 처리(예: 시작+1시간 또는 종일).
- `event_soon` cron 주기(매시간 vs 더 성김).

---

## 14. 구현 단계 (Phases) & 진행 상태

> 이 장은 **세션이 초기화돼도 이 문서만으로 이어서 구현**하기 위한 부분이다.
> Phase는 순서대로 쌓이며, 각 Phase는 끝나면 동작하는 상태로 커밋된다.

### 재개 방법 (새 세션 / 컨텍스트 초기화 시)
1. 이 PRD 1~13장을 먼저 읽어 요구사항·데이터 모델·결정 사항을 파악한다.
2. 아래 **진행 상태 표**에서 `완료`가 아닌 **첫 번째 Phase**를 찾는다.
3. 그 Phase의 "선행 조건"이 충족됐는지 코드/DB로 확인한다(이전 Phase 산출물 존재 여부).
4. **그 Phase 하나만** 구현한다. 범위를 넘지 않는다.
5. Phase의 "완료 조건(DoD)"을 검증한다(명령 실행/수동 확인).
6. **이 문서의 진행 상태 표를 `완료`로 갱신**하고, 변경 사항을 커밋한다.
7. 사용자에게 결과를 보고하고 **멈춘다**(세션 정리 후 다음 세션이 다음 Phase 진행).

> ⚠️ 진행 상태의 유일한 기록은 **이 표**다. 코드와 표가 어긋나면 코드를 신뢰하고
> 표를 바로잡는다. Phase를 건너뛰지 말 것(의존성 존재).

### 진행 상태 표
| Phase | 내용 | 상태 |
|---|---|---|
| P0 | 프로젝트 셋업 (스캐폴드 + 의존성 + DB 연결) | ✅ 완료 (2026-06-29) |
| P1 | DB 스키마 + 14명 시드 | ✅ 완료 (2026-06-29) |
| P2 | 로그인/세션 + 미들웨어 게이트 | ✅ 완료 (2026-06-29) |
| P3 | 이벤트 생성/목록/상세 + 참석 토글·명단 | ✅ 완료 (2026-06-29) |
| P4 | 캘린더 월 뷰 | ✅ 완료 (2026-06-29) |
| P5 | 댓글 + 폴링(댓글·참석 라이브) | ✅ 완료 (2026-06-29) |
| P6 | 알림: new_event fan-out + 피드 + 배지 | ✅ 완료 (2026-06-29) |
| P7 | 임박 알림 cron (event_soon) | ⬜ 미완료 |
| P8 | PWA + 반응형 마감 + 배포 준비 | ⬜ 미완료 |

상태 값: `⬜ 미완료` / `🔄 진행중` / `✅ 완료`. 완료 시 날짜를 함께 적는다(예: `✅ 완료 (2026-07-01)`).

### 📌 세션 인계 메모 (마지막 갱신 2026-06-29)
**다음 작업: P7 (임박 알림 cron event_soon).**

P6에서 만들어진 것 (이미 존재, 다시 만들지 말 것):
- `src/app/actions.ts` `createEvent`에 **new_event fan-out** 추가 — 이벤트 insert 직후
  생성자 제외 나머지(`ne(users.id, uid)`)에게 `notifications` 일괄 insert(type=`new_event`,
  eventId 연결, `payload={title}` 제목 스냅샷). redirect 전에 수행. ⚠️ `new_comment`는 MVP 제외(만들지 말 것).
- `src/app/actions.ts`에 **`markNotificationsRead()`** 추가 — 쿠키 user_id의 `readAt IS NULL`
  알림에만 `readAt=now` update(서버 권위). 반환 void.
- `src/app/api/notifications/unread-count/route.ts` — **배지 SWR 폴링 엔드포인트**(GET,
  `force-dynamic`). proxy가 `/api` 제외 → 여기서 `getSession()` 직접 인증(미로그인 401).
  `{ unread: number }`(안읽음 `count(*)::int`) 반환.
- `src/app/notifications/page.tsx`(server, `force-dynamic`) — 내 알림 `createdAt desc` 피드.
  payload.title 표시, 안읽음 파란 점 강조, type 라벨(new_event=새 일정/event_soon=임박 일정),
  KST 시간, eventId 있으면 `/events/[id]` 링크. 빈 상태 처리.
- `src/app/notifications/NotificationsReader.tsx`(client) — 피드 진입 시 `hasUnread`면
  `markNotificationsRead()` 1회 호출(useEffect). 현재 화면 강조는 서버 렌더 상태라 유지, 배지는 다음 폴링에 비워짐.
- `src/app/TabBar.tsx`(client) — **하단 탭바 첫 도입**. `sticky bottom-0`, 3탭(캘린더/새 일정/알림).
  `usePathname`로 active 강조 + `/login`·`/`에서 숨김. 알림 탭에 안읽음 배지(SWR 5초 폴링, 99+ 캡).
  ⚠️ "나" 탭(로그아웃 등)은 **P8 최종**에서 추가.
- `src/app/layout.tsx` — `{children}` 뒤에 `<TabBar />` 렌더(body는 flex-col, main flex-1 → 탭바 하단 고정).
- 검증 완료: `tsc --noEmit` OK, `npm run build` OK(`/notifications`·`/api/notifications/unread-count` = ƒ 동적, Proxy 활성).
  DB 불변식(임시 tsx, 사후 삭제): 이벤트 생성 fan-out 알림 **정확히 13건**·생성자 본인 0건,
  수신자 안읽음 1→markRead 후 0, **일정 삭제 시 알림 CASCADE 0**·users 14 보존.
  런타임(dev 3000): `/api/notifications/unread-count` 쿠키 없이→401.
- ⚠️ `event_soon` 알림은 아직 없음(P7 cron). 탭바 "나" 탭·반응형 마감은 P8.



P5에서 만들어진 것 (이미 존재, 다시 만들지 말 것):
- `src/app/actions.ts`에 `addComment(eventId, body)` 추가 — `CommentFormState={error?}` 반환.
  쿠키 user_id(서버 권위)로 작성, **본문 trim 후 1~1000자** 검증, `revalidatePath`. ⚠️ `new_comment`
  알림은 MVP 제외(만들지 말 것).
- `src/app/events/[id]/types.ts` — 폴링 데이터 공유 형태 `EventLiveData`(myStatus/roster{going,
  maybe,notGoing,noResponse}/comments[{id,body,authorName,avatarColor,createdAt(ISO)}]).
- `src/app/events/[id]/data.ts` — `loadEventLive(eventId, uid)` 서버 로더(`import "server-only"`).
  명단(참석자 join + 전체 users로 미응답 계산) + 댓글(작성순 asc, 작성자명 join, createdAt ISO).
  **page 초기 렌더와 폴링 route가 공유**(형태 불일치 방지).
- `src/app/api/events/[id]/route.ts` — **SWR 폴링 엔드포인트**(GET). `export const dynamic="force-dynamic"`.
  proxy matcher가 `/api` 제외하므로 **여기서 `getSession()`으로 직접 인증**(미로그인→401). 본문은 `loadEventLive`.
- `src/app/events/[id]/EventLive.tsx`(client) — **SWR `refreshInterval` 4초 폴링**(`/api/events/[id]`,
  서버 초기값을 `fallbackData`로). 참석 토글(`setAttendance`→`mutate()`)·참석 명단·댓글 목록·댓글 폼
  (`addComment`, maxLength 1000+카운터, 빈값/에러 표시)을 모두 포함. 댓글 시간은 KST(`Intl` Asia/Seoul).
- `src/app/events/[id]/page.tsx` — 정적 헤더/설명/삭제(생성자)는 유지, **명단·토글·댓글은 EventLive로 이동**.
  초기값은 `loadEventLive`로 조회해 `initial` prop 전달.
- ⚠️ 기존 `AttendanceToggle.tsx`는 **삭제됨**(토글이 EventLive에 통합). 다시 만들지 말 것.
- 검증 완료: `tsc --noEmit` OK, `npm run build` OK(`/api/events/[id]`·`/events/[id]` = ƒ 동적, Proxy 활성).
  데이터 경로(임시 tsx, 사후 삭제): 미응답 14→참석 upsert 후 13·going 반영·myStatus,
  댓글 2건 작성순·작성자명·ISO, **1001자 DB 거부·1000자 허용**, 삭제 시 댓글/참석 CASCADE·users 14 보존.
  런타임(dev 3955): `/api/events/[id]` 쿠키 없이→401, 유효 세션 쿠키→200 JSON(roster·comments·myStatus).
  검증용 이벤트는 사후 삭제함.
- ⚠️ 하단 탭바/네비게이션·알림은 여전히 없음(P6 피드·배지, P8 최종).

P4에서 만들어진 것 (이미 존재, 다시 만들지 말 것):
- `src/app/calendar/page.tsx`(server) — 전체 이벤트 조회(`startAt asc`), **KST로 날짜키
  (`en-CA` → "YYYY-MM-DD")·시간 라벨 미리 계산**해 클라이언트로 전달(클라 로컬 타임존 비의존).
  `export const dynamic = "force-dynamic"`로 **빌드 박제 방지**(createEvent의 /calendar redirect가
  최신 데이터 보이게). `todayKey`도 KST로 계산해 전달.
- `src/app/calendar/CalendarClient.tsx`(client) — date-fns로 6주 그리드(`startOfWeek~endOfWeek`,
  일요일 시작). 날짜키 매칭으로 이벤트 점(badge) 표시, 날짜 클릭 시 그날 목록, **모바일 아젠다(목록)
  토글**(`목록`↔`달력`, sm:hidden). 셀은 `format(d,"yyyy-MM-dd")` 키로 서버 KST 버킷과 매칭.
  선택 기본값=오늘. 이벤트 행은 `/events/[id]` 링크.
- ⚠️ 폴링(SWR) 아직 없음 — 캘린더는 force-dynamic 요청마다 갱신. 라이브 폴링은 P5.
- ⚠️ 하단 탭바/네비게이션은 아직 없음(P6 배지·P8 최종). 캘린더에서 새 일정 만들기 버튼도 아직 없음.
- 검증 완료: `tsc --noEmit` OK, `npm run build` OK(/calendar = ƒ 동적 전환 확인).
  런타임(dev 3941): 미로그인 /calendar→307 /login, 유효 쿠키→200, 요일헤더·월라벨·아젠다토글·
  이벤트 제목(오늘 칸 버킷)·이벤트 링크 렌더 확인. 검증용 테스트 이벤트는 사후 삭제함.

P3에서 만들어진 것 (이미 존재, 다시 만들지 말 것):
- `src/app/actions.ts`에 액션 3개 추가(login 옆):
  - `createEvent(prev, formData)` — `EventFormState={error?}`, `useActionState`용. 쿠키 user_id를
    creator로. title(필수·≤80)·startAt(필수) 검증. **KST 입력→UTC 저장**(`kstLocalToUtc`:
    datetime-local "YYYY-MM-DDTHH:mm"에 `+09:00` 고정 부착). 성공 시 `/events/[id]`로 redirect.
    ⚠️ **new_event 알림 fan-out은 여기 없음 — P6에서 createEvent에 추가**.
  - `setAttendance(eventId, status)` — UNIQUE(event_id,user_id) `onConflictDoUpdate` upsert,
    `revalidatePath`. status는 'going'|'not_going'|'maybe'(`AttendanceStatusValue` export).
  - `deleteEvent(eventId)` — 생성자(쿠키 uid===creatorId) 검증 후 delete, cascade. 성공 시 `/calendar` redirect.
- `src/app/events/new/page.tsx`(server) + `NewEventForm.tsx`(client, useActionState).
- `src/app/events/[id]/page.tsx`(server: 이벤트+명단 조회, 미응답=전체−응답자 화면 계산,
  KST 표시는 `Intl.DateTimeFormat timeZone:'Asia/Seoul'`) + `AttendanceToggle.tsx`(client,
  useTransition+router.refresh) + `DeleteEventButton.tsx`(client, confirm 후 삭제, 생성자만 노출).
- 검증 완료: `tsc --noEmit` OK, `npm run build` OK(`/events/new` 정적·`/events/[id]` 동적·Proxy 활성).
  DB 불변식 직접 검증(임시 스크립트) — KST→UTC(19:00KST=10:00Z), 참석 재토글 행 1개·상태 갱신,
  미응답 14−응답자, 일정 삭제 시 att/com/noti CASCADE·users 14명 보존(AC 4·5·8).
- ⚠️ `/calendar` 라우트는 아직 없음(P4). createEvent/deleteEvent의 `/calendar` redirect는
  P4 전까지 404로 떨어짐(정상). 이벤트 상세는 redirect URL을 직접 열어 확인 가능.
- ⚠️ 폴링(SWR) 미적용 — 참석/명단은 router.refresh로 갱신. 라이브 폴링은 P5.

P2에서 만들어진 것 (이미 존재, 다시 만들지 말 것):
- `src/lib/session.ts` — jose 서명 쿠키. `createSession(userId)`/`getSession()`/
  `verifySessionToken(token)`. 쿠키명 `session`, `httpOnly + sameSite=lax +
  secure(prod) + maxAge 30일`. 페이로드 `{ uid }`. SESSION_SECRET을 HS256 키로 사용.
  `import "server-only"`(서버 전용). P3 이후 액션에서 `getSession()`으로 user_id 판정.
- `src/app/actions.ts` — `login(prev, formData)` 서버 액션(`useActionState`용,
  `LoginState = { error?: string }`). APP_INVITE_CODE 서버 검증 + userId가 DB users에
  실재하는지 검증 후 `createSession` → `redirect('/calendar')`. **P3~는 이 파일에
  createEvent/setAttendance 등을 추가**(login 옆에).
- `src/app/login/page.tsx`(server, DB users 14명 조회) + `src/app/login/LoginForm.tsx`
  (client, 초대코드 password 입력 + 3열 이름 그리드, 선택 user.id를 hidden으로 전송).
- `src/proxy.ts` — **미들웨어 게이트**. ⚠️ Next 16에서 `middleware.ts`가 deprecated →
  `proxy.ts` + `export function proxy`로 작성함(동작 동일). Edge에서 `request.cookies`로
  쿠키 읽고 jose 검증만(DB 미접근). `/`→로그인 시 /calendar·아니면 /login, 보호 라우트
  미로그인→/login, 로그인 상태 /login→/calendar. matcher가 api·정적자산·`.`포함 경로 제외.
- 검증 완료: `tsc --noEmit` OK, `npm run build` OK(경고 없음, Proxy 활성).
  런타임(dev 3939) 확인 — 미로그인 /calendar·/ → 307 /login, /login 200(14명 노출),
  유효 쿠키 /calendar 게이트 통과(404=P4 미존재), 로그인 상태 /login·/ → 307 /calendar,
  변조 쿠키 → 307 /login(서명 거부).
- ⚠️ `/calendar`·`/events`·`/notifications` 페이지는 아직 없음(후속 Phase). 로그인 후
  /calendar 랜딩은 P4까지 404. 정상.

P0에서 만들어진 것 (이미 존재, 다시 만들지 말 것):
- Next.js 16 + React 19 + TS + Tailwind v4 스캐폴드 (App Router, `src/`, `@/*`).
- `src/lib/db.ts`(Neon+Drizzle, 서버 전용), `drizzle.config.ts`(schema `./drizzle/schema.ts`,
  out `./drizzle/migrations`, postgresql, `.env.local` 로드).
- `.env.example`, `.env.local`(SESSION_SECRET 생성됨, APP_INVITE_CODE=`banacon2026`, CRON_SECRET 임시값).
- `package.json` 스크립트: `db:push / db:generate / db:studio / db:seed`.
- `next.config.ts`에 `turbopack.root` 고정.

P1에서 만들어진 것 (이미 존재, 다시 만들지 말 것):
- `drizzle/schema.ts` — users/events/attendances/comments/notifications + pgEnum 2개
  (`attendance_status`,`notification_type`) + 인덱스 + partial unique index
  `notifications_user_event_type_uq (user_id,event_id,type) WHERE event_id IS NOT NULL`.
  FK 정책(5장): events.creator_id/attendances·comments·notifications.user_id = RESTRICT,
  attendances·comments·notifications.event_id = CASCADE.
- `drizzle/seed.ts` — 친구 14명(실제 이름) + avatar_color, `onConflictDoNothing(name)`로 재실행 안전.
- `src/lib/db.ts`에 schema 연결(`drizzle({ client, schema })`, `export { schema }`).
- **Neon 프로젝트 `banacon`(id `round-glitter-56610460`, org `org-small-smoke-84380453`, PG17) 생성됨.
  `DATABASE_URL`은 `.env.local`에 기록됨**(git 제외). neonctl로 관리 가능(로그인됨).
- 검증 완료: `tsc --noEmit` OK, `db:push` OK(테이블 5 + enum 2 + partial unique idx 확인), `db:seed` OK(users 14행).

**P2 참고:** APP_INVITE_CODE=`banacon2026`(`.env.local`). 로그인 화면 이름 그리드는 DB users 14명 사용.

**기타 상태:** git 설치됨(`C:\Program Files\Git`, PATH 미등록 → 세션에서 임시 추가해 사용).
GitHub CLI(`gh`) winget 설치 완료, 계정 `gino0524` 로그인됨. 원격 저장소 생성·푸시 완료:
**https://github.com/gino0524/banacon** (Private, branch `main`). 초기 커밋 1개(`.env*`는 `.gitignore`로 제외, `.env.example`만 포함). 이후 Phase는 단계별 커밋 가능.

### 환경 선행 준비 (P0 전 1회, 사용자 작업)
- **git 설치**: `winget install --id Git.Git -e` (미설치 상태). 설치 후 새 터미널.
- **Neon 계정**(neon.tech) → 프로젝트 생성 → connection string 1개 확보.
- `.env.local`에 `DATABASE_URL / SESSION_SECRET / APP_INVITE_CODE / CRON_SECRET` 작성(11장).
- ⚠️ `DATABASE_URL`이 없으면 P1 이후 DB 검증을 할 수 없다. 없으면 사용자에게 요청 후 대기.

---

### P0 — 프로젝트 셋업
- **선행**: 없음(빈 디렉토리 + `claude.md`, `prd.md`만 존재).
- **목표**: Next.js 앱 + 스택 설치 + DB 연결 모듈 준비.
- **산출물**:
  - `create-next-app` (App Router/TS/Tailwind/ESLint/src-dir/import-alias `@/*`).
  - 설치: `drizzle-orm @neondatabase/serverless date-fns jose swr`, dev: `drizzle-kit`.
  - `src/lib/db.ts` — Neon 연결(서버 전용), `drizzle.config.ts`.
  - `.env.example`(키 목록), `.gitignore`에 `.env.local` 포함 확인.
- **주의**: `create-next-app .`는 폴더가 비어있지 않으면 거부 → `claude.md`/`prd.md`를
  상위로 잠시 옮긴 뒤 스캐폴드하고 되돌리거나, 임시 폴더에서 생성 후 복사.
- **완료 조건(DoD)**: `npm run dev`로 기본 페이지가 뜬다. `db.ts` import 시 타입 에러 없음.

### P1 — DB 스키마 + 14명 시드
- **선행**: P0 완료, `DATABASE_URL` 설정됨.
- **목표**: 5장 데이터 모델을 Drizzle로 정의하고 마이그레이션 + 친구 14명 시드.
- **산출물**:
  - `drizzle/schema.ts` — users/events/attendances/comments/notifications,
    pgEnum(`attendance_status`,`notification_type`), 인덱스, **partial unique index**
    `notifications(user_id,event_id,type) WHERE event_id IS NOT NULL`, FK 정책(5장).
  - 시드 스크립트(`drizzle/seed.ts` 또는 `package.json` script) — 친구 14명 이름·avatar_color.
    *(실제 이름 14개는 사용자에게 받거나 placeholder로 두고 사용자가 교체하도록 명시.)*
- **완료 조건(DoD)**: `drizzle-kit push` 성공, DB에 5개 테이블 + users 14행 확인.

### P2 — 로그인/세션 + 미들웨어
- **선행**: P1 완료.
- **목표**: 초대코드+이름 선택 로그인, jose 서명 쿠키, 보호 라우트 게이트(7장).
- **산출물**:
  - `src/lib/session.ts` — 쿠키 발급/검증(httpOnly+Secure+SameSite=Lax+만료).
  - `src/app/login/page.tsx` — 초대코드 입력 + 14명 이름 그리드.
  - `src/app/actions.ts`의 `login` 액션 — `APP_INVITE_CODE` 서버 검증 후 쿠키 발급.
  - `src/middleware.ts` — 미로그인 시 `/login` 리다이렉트, `/` 분기.
- **완료 조건(DoD)**: 미로그인 `/calendar` 접근→`/login` 리다이렉트. 잘못된 코드 거부.
  올바른 코드+이름 → 쿠키 발급, 보호 라우트 접근 가능(AC 1·2).

### P3 — 이벤트 생성/목록/상세 + 참석
- **선행**: P2 완료.
- **목표**: 일정 CRUD(생성·삭제) + 상세 + 참석 토글/명단(F1).
- **산출물**:
  - `src/app/events/new/page.tsx`(생성 폼: 제목80자·설명·장소·시작(필수,KST)·종료),
    `src/app/events/[id]/page.tsx`(정보+명단+내 상태 토글+삭제(생성자만)).
  - `actions.ts`: `createEvent`(쿠키 user_id를 creator로), `setAttendance`(upsert,
    UNIQUE(event_id,user_id)), `deleteEvent`(생성자 검증, cascade).
  - 명단: 가는중/미정/불참 + **미응답 = 14 − 응답자**(화면 계산, F1).
- **완료 조건(DoD)**: 생성→상세 표시. 참석 토글→DB·화면 반영, 재토글 중복행 없음.
  미응답 카운트 정확. 생성자만 삭제, 삭제 시 cascade(AC 3·4·5·8).

### P4 — 캘린더 월 뷰
- **선행**: P3 완료.
- **목표**: 월 그리드 + 이벤트 표시 + 날짜 선택 목록/아젠다(F2).
- **산출물**: `src/app/calendar/page.tsx` + 캘린더 컴포넌트(date-fns로 그리드 계산, KST).
- **완료 조건(DoD)**: 이벤트가 올바른 날짜 칸에 표시, 날짜 선택 시 그날 목록, 모바일 아젠다 토글.

### P5 — 댓글 + 폴링
- **선행**: P4 완료.
- **목표**: 이벤트별 댓글(F3) + SWR 폴링으로 댓글·참석 라이브 갱신(9장).
- **산출물**: 상세 페이지 댓글 영역(클라이언트 컴포넌트, SWR `refreshInterval` 3~5초),
  `actions.ts`의 `addComment`(1000자 제한). 참석 명단도 동일 폴링으로 갱신.
- **완료 조건(DoD)**: 두 브라우저에서 댓글/참석이 수 초 내 상호 반영. 1000자 초과 거부(AC 4·6).

### P6 — 알림: new_event + 피드 + 배지
- **선행**: P5 완료.
- **목표**: 새 일정 시 fan-out 알림 + 알림 피드 + 안읽음 배지(F4).
- **산출물**:
  - `createEvent`에서 본인 제외 13명에게 `notifications` 일괄 insert(type=new_event).
  - `src/app/notifications/page.tsx`(피드 + read 처리 `markNotificationsRead`).
  - 하단 탭바 배지(안읽음 개수, SWR 폴링).
- **완료 조건(DoD)**: 새 이벤트 생성 시 나머지에게 알림 1건씩, 배지 증가, 확인 시 read(AC 3 일부).

### P7 — 임박 알림 cron (event_soon)
- **선행**: P6 완료.
- **목표**: 24h 내 일정의 참석/미정자에게 임박 알림, 중복 없이(9장).
- **산출물**:
  - `src/app/api/cron/event-soon/route.ts` — `CRON_SECRET` 검증, 24h 내 이벤트 조회,
    참석/미정자에게 `ON CONFLICT DO NOTHING` insert(partial unique index가 중복 차단).
  - `vercel.json` — 해당 route를 매시간 호출하는 `crons` 설정.
- **완료 조건(DoD)**: cron route **두 번** 호출해도 대상자당 정확히 1건(AC 7).

### P8 — PWA + 마감 + 배포 준비
- **선행**: P7 완료.
- **목표**: PWA화 + 반응형 점검 + 배포 가능 상태(10장, AC 9).
- **산출물**: `public/manifest.json` + 아이콘, 메타 태그, 하단 탭바 최종, 반응형 점검,
  `README`(로컬 실행/배포 절차), Vercel 환경변수 안내.
- **완료 조건(DoD)**: 모바일 폭 레이아웃 정상, "홈 화면에 추가" 동작, `npm run build` 성공,
  Vercel 배포 절차 문서화(AC 9·10).

---

> **모든 Phase 완료 후**: 12장 수용 기준(AC 1~10)을 E2E로 한 번 더 통과시키고,
> 진행 상태 표를 전부 `✅ 완료`로 만든다.
