"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSession, getSession } from "@/lib/session";

export type LoginState = { error?: string };

export type EventFormState = { error?: string };

// F1: 참석 상태. 'no_response'는 DB에 없는 화면 계산값이라 여기 포함하지 않는다.
export type AttendanceStatusValue = "going" | "not_going" | "maybe";
const ATTENDANCE_VALUES: readonly AttendanceStatusValue[] = [
  "going",
  "not_going",
  "maybe",
];

// 10장: datetime-local 값("YYYY-MM-DDTHH:mm")을 KST(UTC+9)로 해석해 UTC Date로 변환.
// 클라이언트 로컬 타임존에 의존하지 않고 +09:00을 고정 적용한다.
function kstLocalToUtc(local: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 7장: APP_INVITE_CODE 서버 검증 → 14명 중 본인 선택 → 서명 쿠키 발급.
// 클라이언트가 보낸 userId는 실제 DB users에 존재할 때만 신뢰한다(서버 권위).
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const inviteCode = String(formData.get("inviteCode") ?? "");
  const userId = String(formData.get("userId") ?? "");

  if (inviteCode !== process.env.APP_INVITE_CODE) {
    return { error: "초대코드가 올바르지 않습니다." };
  }
  if (!userId) {
    return { error: "이름을 선택해주세요." };
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true },
  });
  if (!user) {
    return { error: "알 수 없는 사용자입니다." };
  }

  await createSession(user.id);
  redirect("/calendar");
}

// P3 / F1: 일정 생성. 생성자는 쿠키의 user_id(서버 권위). 저장은 UTC, 입력은 KST.
export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startLocal = String(formData.get("startAt") ?? "");
  const endLocal = String(formData.get("endAt") ?? "");

  if (!title) return { error: "제목을 입력해주세요." };
  if (title.length > 80) return { error: "제목은 80자 이하여야 합니다." };
  if (!startLocal) return { error: "시작 일시를 입력해주세요." };

  const startAt = kstLocalToUtc(startLocal);
  if (!startAt) return { error: "시작 일시 형식이 올바르지 않습니다." };

  const endAt = endLocal ? kstLocalToUtc(endLocal) : null;
  if (endLocal && !endAt) return { error: "종료 일시 형식이 올바르지 않습니다." };
  if (endAt && endAt < startAt) {
    return { error: "종료 일시는 시작 일시 이후여야 합니다." };
  }

  const [created] = await db
    .insert(schema.events)
    .values({
      creatorId: session.uid,
      title,
      description: description || null,
      location: location || null,
      startAt,
      endAt,
    })
    .returning({ id: schema.events.id });

  // P6 / F4: 새 일정 fan-out — 생성자 제외 나머지에게 new_event 알림 1건씩.
  // payload에 제목 스냅샷을 남겨, 일정 삭제(cascade) 전까지 피드에서 표시한다.
  const others = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(ne(schema.users.id, session.uid));
  if (others.length > 0) {
    await db.insert(schema.notifications).values(
      others.map((u) => ({
        userId: u.id,
        type: "new_event" as const,
        eventId: created.id,
        payload: { title },
      })),
    );
  }

  redirect(`/events/${created.id}`);
}

// F1: 참석 상태 토글. UNIQUE(event_id,user_id) 기준 upsert — 재선택 시 갱신(중복 행 없음).
export async function setAttendance(
  eventId: string,
  status: AttendanceStatusValue,
): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!ATTENDANCE_VALUES.includes(status)) {
    throw new Error("잘못된 참석 상태값입니다.");
  }

  const now = new Date();
  await db
    .insert(schema.attendances)
    .values({ eventId, userId: session.uid, status, updatedAt: now })
    .onConflictDoUpdate({
      target: [schema.attendances.eventId, schema.attendances.userId],
      set: { status, updatedAt: now },
    });

  revalidatePath(`/events/${eventId}`);
}

// F3: 댓글 작성. 작성자는 쿠키의 user_id(서버 권위). 본문 1~1000자.
export type CommentFormState = { error?: string };
export async function addComment(
  eventId: string,
  body: string,
): Promise<CommentFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const trimmed = body.trim();
  if (!trimmed) return { error: "댓글을 입력해주세요." };
  if (trimmed.length > 1000) {
    return { error: "댓글은 1000자 이하여야 합니다." };
  }

  await db
    .insert(schema.comments)
    .values({ eventId, userId: session.uid, body: trimmed });

  revalidatePath(`/events/${eventId}`);
  return {};
}

// 3·5장: 일정 삭제는 생성자 본인만. 참석/댓글/알림은 FK CASCADE로 함께 삭제.
export async function deleteEvent(eventId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const event = await db.query.events.findFirst({
    where: eq(schema.events.id, eventId),
    columns: { id: true, creatorId: true },
  });
  if (!event) redirect("/calendar");
  if (event.creatorId !== session.uid) {
    throw new Error("일정 삭제는 생성자만 가능합니다.");
  }

  await db.delete(schema.events).where(eq(schema.events.id, eventId));
  redirect("/calendar");
}

// F4: 알림 확인 시 read 처리. 쿠키 user_id의 안읽음 알림에만 read_at을 찍는다.
export async function markNotificationsRead(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.userId, session.uid),
        isNull(schema.notifications.readAt),
      ),
    );
}
