import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AttendanceStatusValue } from "@/app/actions";
import type { EventLiveData } from "./types";

// P5: 상세 페이지의 라이브 영역(참석 명단 + 댓글)을 한 곳에서 조회한다.
// page.tsx(초기 렌더)와 폴링 route handler가 공유해 형태 불일치를 막는다.
export async function loadEventLive(
  eventId: string,
  uid: string | undefined,
): Promise<EventLiveData> {
  const roster = await db
    .select({
      userId: schema.attendances.userId,
      status: schema.attendances.status,
      name: schema.users.name,
      avatarColor: schema.users.avatarColor,
    })
    .from(schema.attendances)
    .innerJoin(schema.users, eq(schema.users.id, schema.attendances.userId))
    .where(eq(schema.attendances.eventId, eventId));

  const allUsers = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      avatarColor: schema.users.avatarColor,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.name));

  const commentRows = await db
    .select({
      id: schema.comments.id,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      authorName: schema.users.name,
      avatarColor: schema.users.avatarColor,
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(eq(schema.comments.eventId, eventId))
    .orderBy(asc(schema.comments.createdAt));

  const respondedIds = new Set(roster.map((r) => r.userId));

  return {
    myStatus:
      (roster.find((r) => r.userId === uid)?.status as
        | AttendanceStatusValue
        | undefined) ?? null,
    roster: {
      going: roster.filter((r) => r.status === "going"),
      maybe: roster.filter((r) => r.status === "maybe"),
      notGoing: roster.filter((r) => r.status === "not_going"),
      noResponse: allUsers.filter((u) => !respondedIds.has(u.id)),
    },
    comments: commentRows.map((c) => ({
      id: c.id,
      body: c.body,
      authorName: c.authorName,
      avatarColor: c.avatarColor,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}
