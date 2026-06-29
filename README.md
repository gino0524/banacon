# banacon

친구 14명이 서로의 일정을 한곳에서 공유하는 모바일 우선 웹앱.
일정을 올리면 나머지가 **참석 / 불참 / 미정**으로 응답하고, 누가 오는지 확인하며,
일정마다 댓글로 소통하고, 새 일정·임박 일정을 앱 안에서 알림으로 받는다.
가입 절차 없이(이메일/비밀번호 없음) 초대코드 + 이름 선택으로 바로 쓴다.

자세한 요구사항·데이터 모델·결정 사항은 [`prd.md`](./prd.md) 참고.

## 기술 스택

- **Next.js 16 (App Router) + React 19 + TypeScript** — 쓰기는 Server Actions
- **Tailwind CSS v4** — 모바일 우선 반응형
- **Neon Postgres + Drizzle ORM** — 스키마/마이그레이션
- **jose** — 서명 세션 쿠키 · **SWR** — 폴링 · **date-fns** — 캘린더 계산
- **PWA** — manifest + 아이콘("홈 화면에 추가")
- 배포: **Vercel + Neon + Vercel Cron** (전부 무료 티어)

## 로컬 실행

1. 의존성 설치
   ```bash
   npm install
   ```
2. 환경변수 설정 — `.env.example`를 `.env.local`로 복사 후 값 채우기
   ```bash
   cp .env.example .env.local
   ```
   | 변수 | 설명 |
   |---|---|
   | `DATABASE_URL` | Neon 연결 문자열 (서버 전용, `NEXT_PUBLIC_` 금지) |
   | `SESSION_SECRET` | 세션 쿠키 서명용 랜덤 32바이트+ (`openssl rand -hex 32`) |
   | `APP_INVITE_CODE` | 친구방에 공유할 초대코드 (로그인 1차 관문) |
   | `CRON_SECRET` | 임박 알림 cron route 보호용 비밀값 |
3. DB 스키마 적용 + 친구 14명 시드
   ```bash
   npm run db:push    # 테이블/enum/인덱스 생성
   npm run db:seed    # 친구 14명 + avatar_color 시드 (재실행 안전)
   ```
4. 개발 서버 실행 → http://localhost:3000
   ```bash
   npm run dev
   ```

### 그 밖의 스크립트

- `npm run build` — 프로덕션 빌드
- `npm run db:generate` — 마이그레이션 SQL 생성
- `npm run db:studio` — Drizzle Studio (DB 브라우저)

## 배포 (Vercel + Neon)

1. **Neon** 프로젝트에서 connection string 확보.
2. GitHub 저장소를 **Vercel**에 import.
3. Vercel 프로젝트 **Environment Variables**에 4개 등록 (`.env.local`과 동일):
   `DATABASE_URL`, `SESSION_SECRET`, `APP_INVITE_CODE`, `CRON_SECRET`.
   - ⚠️ DB 스키마는 로컬에서 `npm run db:push`로 한 번 적용해 두거나, 배포 환경의
     `DATABASE_URL`을 대상으로 push 한다(Vercel 빌드는 마이그레이션을 자동 실행하지 않음).
4. 배포하면 [`vercel.json`](./vercel.json)의 cron이 **매시간**
   `/api/cron/event-soon`를 호출한다. Vercel은 `CRON_SECRET`이 설정돼 있으면
   호출 시 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더를 실어 보내고,
   route handler가 이를 검증한다(미인증 401).

## 구조 메모

- 클라이언트는 DB에 직접 접근하지 않는다. 모든 읽기·쓰기는 서버(Server Actions /
  route handler)를 거치고 `DATABASE_URL`은 서버 전용 환경변수로만 둔다.
- 시간대: 저장은 UTC(`timestamptz`), 입력·표시는 **KST(Asia/Seoul) 고정**.
- 라이브 갱신은 실시간 푸시 대신 SWR 폴링(3~5초).
- 미로그인 시 보호 라우트는 `src/proxy.ts`(미들웨어)가 `/login`으로 리다이렉트.
