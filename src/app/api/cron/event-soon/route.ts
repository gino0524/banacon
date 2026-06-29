import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// P7 / F4·9장: 임박 알림 cron. 24h 내 시작 일정의 참석/미정자에게 event_soon 알림.
// vercel.json crons가 매시간 호출하며, Vercel은 CRON_SECRET을 Authorization 헤더로 실어준다.
// proxy matcher가 /api를 제외하므로 여기서 직접 인증한다(미인증 401).
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + DAY_MS);

  // 지금~24h 내에 시작하는 일정의 참석(going)/미정(maybe)자만 대상. 불참·미응답 제외.
  const targets = await db
    .select({
      userId: schema.attendances.userId,
      eventId: schema.events.id,
      title: schema.events.title,
    })
    .from(schema.attendances)
    .innerJoin(schema.events, eq(schema.attendances.eventId, schema.events.id))
    .where(
      and(
        gte(schema.events.startAt, now),
        lte(schema.events.startAt, horizon),
        inArray(schema.attendances.status, ["going", "maybe"]),
      ),
    );

  if (targets.length === 0) {
    return NextResponse.json({ inserted: 0, candidates: 0 });
  }

  // 중복 방지는 앱 코드가 아니라 partial unique index(user_id,event_id,type)가 보장.
  // ON CONFLICT DO NOTHING으로 cron 재실행/경쟁 조건에도 1인·1이벤트·1타입당 1건.
  const inserted = await db
    .insert(schema.notifications)
    .values(
      targets.map((t) => ({
        userId: t.userId,
        type: "event_soon" as const,
        eventId: t.eventId,
        payload: { title: t.title },
      })),
    )
    .onConflictDoNothing()
    .returning({ id: schema.notifications.id });

  return NextResponse.json({
    inserted: inserted.length,
    candidates: targets.length,
  });
}
