import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit은 Next의 .env.local을 자동으로 읽지 않으므로 직접 로드한다.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
