import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logout } from "@/app/actions";

// 6장 "나" 탭: 내 정보 확인 + 로그아웃.
export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await db.query.users.findFirst({
    where: eq(schema.users.id, session.uid),
    columns: { name: true, avatarColor: true },
  });
  if (!me) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight">나</h1>

      <div className="mt-6 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
          style={{ backgroundColor: me.avatarColor ?? "#71717a" }}
        >
          {me.name.slice(0, 1)}
        </span>
        <div>
          <p className="text-sm font-medium text-zinc-900">{me.name}</p>
          <p className="text-xs text-zinc-500">banacon 친구</p>
        </div>
      </div>

      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="w-full rounded-lg border border-zinc-300 py-3 text-sm font-medium text-zinc-700 active:bg-zinc-100"
        >
          로그아웃
        </button>
      </form>
    </main>
  );
}
