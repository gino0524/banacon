import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/session";

// P6 / F4: 하단 탭바 안읽음 배지의 SWR 폴링 엔드포인트.
// proxy matcher가 /api를 제외하므로 여기서 직접 세션을 검증한다(서버 권위).
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, session.uid),
        isNull(schema.notifications.readAt),
      ),
    );

  return NextResponse.json({ unread: row?.count ?? 0 });
}
