import { pgTable, serial, timestamp, varchar, text, boolean, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// System health check table (DO NOT DELETE)
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============================================
// 管理员/代理人表 (RBAC)
// ============================================
export const admins = pgTable(
  "admins",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 100 }).notNull().unique(),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    display_name: varchar("display_name", { length: 100 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("agent"), // super_admin | agent
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("admins_username_idx").on(table.username),
    index("admins_role_idx").on(table.role),
  ]
);

// ============================================
// LINE 群组表
// ============================================
export const lineGroups = pgTable(
  "line_groups",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    line_group_id: varchar("line_group_id", { length: 100 }).notNull().unique(), // LINE API group ID
    group_name: varchar("group_name", { length: 255 }).notNull(),
    agent_id: varchar("agent_id", { length: 36 }).notNull().references(() => admins.id, { onDelete: "cascade" }),
    line_channel_access_token: text("line_channel_access_token"), // Per-group channel token
    is_active: boolean("is_active").default(true).notNull(),
    member_count: integer("member_count").default(0).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("line_groups_line_group_id_idx").on(table.line_group_id),
    index("line_groups_agent_id_idx").on(table.agent_id),
  ]
);

// ============================================
// 群组配置表 (每个群独立配置)
// ============================================
export const groupSettings = pgTable(
  "group_settings",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    group_id: varchar("group_id", { length: 36 }).notNull().references(() => lineGroups.id, { onDelete: "cascade" }),
    // 通知开关
    notify_join_enabled: boolean("notify_join_enabled").default(true).notNull(),
    notify_leave_enabled: boolean("notify_leave_enabled").default(true).notNull(),
    notify_rename_enabled: boolean("notify_rename_enabled").default(true).notNull(),
    notify_unsend_enabled: boolean("notify_unsend_enabled").default(true).notNull(),
    // 禁言设置
    mute_enabled: boolean("mute_enabled").default(false).notNull(),
    mute_start_hour: integer("mute_start_hour").default(20).notNull(), // 24h format
    mute_start_minute: integer("mute_start_minute").default(0).notNull(),
    mute_end_hour: integer("mute_end_hour").default(8).notNull(),
    mute_end_minute: integer("mute_end_minute").default(0).notNull(),
    // 关键词防御开关
    keyword_defense_enabled: boolean("keyword_defense_enabled").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("group_settings_group_id_idx").on(table.group_id),
  ]
);

// ============================================
// 敏感词表
// ============================================
export const sensitiveWords = pgTable(
  "sensitive_words",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    group_id: varchar("group_id", { length: 36 }).notNull().references(() => lineGroups.id, { onDelete: "cascade" }),
    word: varchar("word", { length: 500 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sensitive_words_group_id_idx").on(table.group_id),
  ]
);

// ============================================
// 白名单成员表 (禁言豁免)
// ============================================
export const whitelistMembers = pgTable(
  "whitelist_members",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    group_id: varchar("group_id", { length: 36 }).notNull().references(() => lineGroups.id, { onDelete: "cascade" }),
    line_user_id: varchar("line_user_id", { length: 100 }).notNull(),
    display_name: varchar("display_name", { length: 255 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("whitelist_members_group_id_idx").on(table.group_id),
    index("whitelist_members_line_user_id_idx").on(table.line_user_id),
  ]
);

// ============================================
// 消息缓存表 (撤回留存)
// ============================================
export const messageCache = pgTable(
  "message_cache",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    group_id: varchar("group_id", { length: 36 }).notNull().references(() => lineGroups.id, { onDelete: "cascade" }),
    line_message_id: varchar("line_message_id", { length: 100 }).notNull(),
    sender_line_user_id: varchar("sender_line_user_id", { length: 100 }).notNull(),
    sender_name: varchar("sender_name", { length: 255 }),
    content_type: varchar("content_type", { length: 20 }).notNull().default("text"), // text | image | video | audio | sticker | location | file
    content_text: text("content_text"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("message_cache_group_id_idx").on(table.group_id),
    index("message_cache_line_message_id_idx").on(table.line_message_id),
    index("message_cache_created_at_idx").on(table.created_at),
  ]
);

// ============================================
// 成员名称缓存表 (改名监听)
// ============================================
export const memberNameCache = pgTable(
  "member_name_cache",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    group_id: varchar("group_id", { length: 36 }).notNull().references(() => lineGroups.id, { onDelete: "cascade" }),
    line_user_id: varchar("line_user_id", { length: 100 }).notNull(),
    display_name: varchar("display_name", { length: 255 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("member_name_cache_group_user_idx").on(table.group_id, table.line_user_id),
  ]
);

// ============================================
// 事件日志表
// ============================================
export const eventLogs = pgTable(
  "event_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    group_id: varchar("group_id", { length: 36 }).references(() => lineGroups.id, { onDelete: "set null" }),
    event_type: varchar("event_type", { length: 50 }).notNull(), // join | leave | rename | unsend | keyword_block | mute_block
    actor_line_user_id: varchar("actor_line_user_id", { length: 100 }),
    actor_name: varchar("actor_name", { length: 255 }),
    content: text("content"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("event_logs_group_id_idx").on(table.group_id),
    index("event_logs_event_type_idx").on(table.event_type),
    index("event_logs_created_at_idx").on(table.created_at),
  ]
);
