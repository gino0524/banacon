import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { AttendanceStatusValue } from "@/app/actions";
import AttendanceToggle from "./AttendanceToggle";
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

type RosterUser = { name: string; avatarColor: string | null };

function NameChip({ user }: { user: RosterUser }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-sm">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: user.avatarColor ?? "#a1a1aa" }}
      />
      {user.name}
    </span>
  );
}

function RosterSection({
  label,
  users,
}: {
  label: string;
  users: RosterUser[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-zinc-600">
        {label} {users.length}
      </h3>
      {users.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {users.map((u) => (
            <NameChip key={u.name} user={u} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">없음</p>
      )}
    </div>
  );
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

  // 참석 응답자 + 전체 사용자(미응답 계산용, F1: 14 − 응답자).
  const roster = await db
    .select({
      userId: schema.attendances.userId,
      status: schema.attendances.status,
      name: schema.users.name,
      avatarColor: schema.users.avatarColor,
    })
    .from(schema.attendances)
    .innerJoin(schema.users, eq(schema.users.id, schema.attendances.userId))
    .where(eq(schema.attendances.eventId, id));

  const allUsers = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      avatarColor: schema.users.avatarColor,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.name));

  const going = roster.filter((r) => r.status === "going");
  const maybe = roster.filter((r) => r.status === "maybe");
  const notGoing = roster.filter((r) => r.status === "not_going");
  const respondedIds = new Set(roster.map((r) => r.userId));
  const noResponse = allUsers.filter((u) => !respondedIds.has(u.id));

  const myStatus: AttendanceStatusValue | null =
    roster.find((r) => r.userId === session?.uid)?.status ?? null;
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

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="text-sm font-semibold">내 참석 상태</h2>
        <AttendanceToggle eventId={event.id} current={myStatus} />
      </section>

      <section className="mt-8 flex flex-col gap-5">
        <h2 className="text-sm font-semibold">참석 명단</h2>
        <RosterSection label="가는중" users={going} />
        <RosterSection label="미정" users={maybe} />
        <RosterSection label="불참" users={notGoing} />
        <RosterSection label="미응답" users={noResponse} />
      </section>

      {isCreator && (
        <section className="mt-10 border-t border-zinc-200 pt-6">
          <DeleteEventButton eventId={event.id} />
        </section>
      )}
    </main>
  );
}
