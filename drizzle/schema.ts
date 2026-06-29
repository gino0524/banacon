import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// 5장: status/type은 pgEnum으로 관리. 'no_response'는 DB에 없음(화면 계산).
export const attendanceStatus = pgEnum("attendance_status", [
  "going",
  "not_going",
  "maybe",
]);
export const notificationType = pgEnum("notification_type", [
  "new_event",
  "event_soon",
]);

// 사전 시드 14명. 앱에서 삭제하지 않음.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 40 }).notNull().unique(),
  avatarColor: text("avatar_color"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 80 }).notNull(),
    description: text("description"),
    location: text("location"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("events_start_at_idx").on(t.startAt)],
);

export const attendances = pgTable(
  "attendances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: attendanceStatus("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // upsert 대상: 한 사용자당 한 일정에 하나의 상태만.
    uniqueIndex("attendances_event_user_uq").on(t.eventId, t.userId),
    index("attendances_event_idx").on(t.eventId),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: varchar("body", { length: 1000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("comments_event_created_idx").on(t.eventId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: notificationType("type").notNull(),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    payload: jsonb("payload"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("notifications_user_read_idx").on(t.userId, t.readAt),
    // 중복 알림 방지(9장): event_soon cron 재실행/경쟁 조건에도 1인·1이벤트·1타입당 1건.
    uniqueIndex("notifications_user_event_type_uq")
      .on(t.userId, t.eventId, t.type)
      .where(sql`${t.eventId} IS NOT NULL`),
  ],
);
