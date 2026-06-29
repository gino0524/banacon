"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSession } from "@/lib/session";

export type LoginState = { error?: string };

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
