import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import CalendarClient, { type CalEvent } from "./CalendarClient";

// 10장: 저장은 UTC, 캘린더 버킷팅·표시는 KST 고정. 클라이언트 로컬 타임존에 의존하지 않도록
// 날짜키("YYYY-MM-DD")와 시간 라벨을 서버에서 KST로 미리 계산해 넘긴다.
const KST = "Asia/Seoul";

function kstDateKey(d: Date): string {
  // en-CA 로케일은 YYYY-MM-DD 형식을 준다.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function kstTime(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// 매 요청마다 최신 이벤트를 읽는다(빌드 시점 박제 방지). P5에서 SWR 폴링으로 라이브 갱신.
export const dynamic = "force-dynamic";

// F2: 월 그리드 + 날짜별 일정. 동시 14명·소량 데이터라 전체 이벤트를 한 번에 읽는다.
export default async function CalendarPage() {
  const rows = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      startAt: schema.events.startAt,
    })
    .from(schema.events)
    .orderBy(asc(schema.events.startAt));

  const events: CalEvent[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    dateKey: kstDateKey(e.startAt),
    time: kstTime(e.startAt),
  }));

  const todayKey = kstDateKey(new Date());

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 sm:max-w-xl">
      <CalendarClient events={events} todayKey={todayKey} />
    </main>
  );
}
