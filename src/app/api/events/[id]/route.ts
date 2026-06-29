import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadEventLive } from "@/app/events/[id]/data";

// P5: 상세 페이지 SWR 폴링 엔드포인트(참석 명단 + 댓글).
// proxy matcher가 /api를 제외하므로 여기서 직접 세션을 검증한다(서버 권위).
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const data = await loadEventLive(id, session.uid);
  return NextResponse.json(data);
}
