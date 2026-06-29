import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/session";
import { loadEventLive } from "./data";
import EventLive from "./EventLive";
import DeleteEventButton from "./DeleteEventButton";

// 10장: 저장은 UTC, 표시는 KST 고정.
function fmtKst(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const [event] = await db
    .select({
      id: schema.events.id,
      creatorId: schema.events.creatorId,
      title: schema.events.title,
      description: schema.events.description,
      location: schema.events.location,
      startAt: schema.events.startAt,
      endAt: schema.events.endAt,
      creatorName: schema.users.name,
    })
    .from(schema.events)
    .innerJoin(schema.users, eq(schema.users.id, schema.events.creatorId))
    .where(eq(schema.events.id, id))
    .limit(1);

  if (!event) notFound();

  // 참석 명단 + 댓글(라이브 영역)의 초기값. 이후 EventLive가 SWR로 폴링 갱신한다.
  const initial = await loadEventLive(event.id, session?.uid);
  const isCreator = session?.uid === event.creatorId;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight">{event.title}</h1>
        <p className="text-sm text-zinc-600">
          {fmtKst(event.startAt)}
          {event.endAt && (
            <>
              {" "}
              ~ {fmtKst(event.endAt)}
            </>
          )}
        </p>
        {event.location && (
          <p className="text-sm text-zinc-600">📍 {event.location}</p>
        )}
        <p className="text-xs text-zinc-400">만든 사람 · {event.creatorName}</p>
      </header>

      {event.description && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700">
          {event.description}
        </p>
      )}

      <EventLive eventId={event.id} initial={initial} />

      {isCreator && (
        <section className="mt-10 border-t border-zinc-200 pt-6">
          <DeleteEventButton eventId={event.id} />
        </section>
      )}
    </main>
  );
}
