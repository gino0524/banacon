import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// 서버 전용 모듈. DATABASE_URL은 클라이언트로 노출되지 않는다.
// (스키마는 P1에서 drizzle/schema.ts 생성 후 이 파일에 연결한다.)
if (!process.env.DATABASE_URL) {
  // 빌드 타임이 아닌 런타임 쿼리 시점에만 의미가 있다. 명확한 에러로 안내.
  // (P0 단계에서는 홈 페이지가 DB를 호출하지 않으므로 dev 실행에는 영향 없음.)
}

const sql = neon(process.env.DATABASE_URL ?? "");
export const db = drizzle({ client: sql });
