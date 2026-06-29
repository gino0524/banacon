import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/session";
import NotificationsReader from "./NotificationsReader";

// 매 방문마다 최신 알림을 읽는다(빌드 박제 방지). 배지는 탭바가 SWR로 폴링.
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  new_event: "새 일정",
  event_soon: "임박 일정",
};

// 10장: 표시는 KST 고정.
function fmtKst(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await db
    .select({
      id: schema.notifications.id,
      type: schema.notifications.type,
      eventId: schema.notifications.eventId,
      payload: schema.notifications.payload,
      readAt: schema.notifications.readAt,
      createdAt: schema.notifications.createdAt,
    })
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, session.uid))
    .orderBy(desc(schema.notifications.createdAt));

  const hasUnread = rows.some((r) => r.readAt === null);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight">알림</h1>

      {/* 이 화면을 열면 안읽음 알림을 read 처리해 배지를 비운다. */}
      <NotificationsReader hasUnread={hasUnread} />

      <ul className="mt-6 flex flex-col gap-2">
        {rows.map((n) => {
          const title =
            (n.payload as { title?: string } | null)?.title ?? "일정";
          const unread = n.readAt === null;
          const body = (
            <div
              className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
                unread
                  ? "border-zinc-300 bg-zinc-50"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                {unread && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
                <span className="font-medium text-zinc-700">
                  {TYPE_LABEL[n.type] ?? n.type}
                </span>
                <span>· {fmtKst(n.createdAt)}</span>
              </div>
              <p className="text-sm text-zinc-800">{title}</p>
            </div>
          );
          return (
            <li key={n.id}>
              {n.eventId ? (
                <Link href={`/events/${n.eventId}`} className="block">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="text-sm text-zinc-400">알림이 없습니다.</li>
        )}
      </ul>
    </main>
  );
}
