import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import LoginForm from "./LoginForm";

// 6장 /login: 공유 초대코드 입력 + 이름 그리드(14명) 선택.
// 이름 그리드는 DB users 14명을 사용한다.
export default async function LoginPage() {
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      avatarColor: schema.users.avatarColor,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.name));

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">banacon</h1>
        <p className="mt-1 text-sm text-zinc-500">
          초대코드를 입력하고 이름을 선택하세요.
        </p>
      </header>
      <LoginForm users={users} />
    </main>
  );
}
