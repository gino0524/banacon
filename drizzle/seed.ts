import { config } from "dotenv";
// tsx 실행 시 Next의 .env.local을 직접 로드한다.
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users } from "./schema";

// 친구 14명(고정). name UNIQUE이므로 재실행해도 중복 생성되지 않는다.
const FRIENDS: { name: string; avatarColor: string }[] = [
  { name: "이기노", avatarColor: "#ef4444" },
  { name: "권혁진", avatarColor: "#f97316" },
  { name: "김태현", avatarColor: "#f59e0b" },
  { name: "문지민", avatarColor: "#eab308" },
  { name: "배수민", avatarColor: "#84cc16" },
  { name: "서한을", avatarColor: "#22c55e" },
  { name: "성민욱", avatarColor: "#10b981" },
  { name: "이은호", avatarColor: "#14b8a6" },
  { name: "정병찬", avatarColor: "#06b6d4" },
  { name: "박지호", avatarColor: "#3b82f6" },
  { name: "진현석", avatarColor: "#6366f1" },
  { name: "백성현", avatarColor: "#8b5cf6" },
  { name: "최인호", avatarColor: "#d946ef" },
  { name: "김훈민", avatarColor: "#ec4899" },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL이 설정되어 있지 않다(.env.local 확인).");
  }
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle({ client: sql });

  await db.insert(users).values(FRIENDS).onConflictDoNothing({
    target: users.name,
  });

  const rows = await db.select({ name: users.name }).from(users);
  console.log(`users ${rows.length}행:`, rows.map((r) => r.name).join(", "));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
