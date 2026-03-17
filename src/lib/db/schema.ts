import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'crypto';

// Host-Kategorisierung — muss VOR hosts definiert werden (FK-Referenz)
export const hostGroups = sqliteTable('host_groups', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const hosts = sqliteTable('hosts', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  hostname: text('hostname').notNull(),
  port: integer('port').notNull().default(22),
  username: text('username').notNull(),
  authMethod: text('auth_method').notNull().default('key'), // 'key' | 'agent' | 'password'
  privateKey: text('private_key'), // AES-256-GCM verschluesselt
  password: text('password'), // AES-256-GCM verschluesselt
  groupId: text('group_id').references(() => hostGroups.id, { onDelete: 'set null' }),
  isOnline: integer('is_online', { mode: 'boolean' }).default(false),
  lastSeen: integer('last_seen', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  path: text('path').notNull(),
  hostId: text('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const preferences = sqliteTable('preferences', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userLogin: text('user_login').notNull().unique(),
  theme: text('theme').notNull().default('dark'),
  terminalFontSize: integer('terminal_font_size').notNull().default(14),
  terminalFontFamily: text('terminal_font_family').notNull().default('MesloLGS NF'),
  pollIntervalMs: integer('poll_interval_ms').notNull().default(2000),
  settings: text('settings', { mode: 'json' }).default({}),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const terminalTabs = sqliteTable('terminal_tabs', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userLogin: text('user_login').notNull(),
  hostId: text('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull(),
  sessionName: text('session_name').notNull(),
  pane: text('pane').notNull().default('0'),
  position: integer('position').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Persistente Benachrichtigungen
export const alertHistory = sqliteTable('alert_history', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  hostId: text('host_id').references(() => hosts.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // host_offline
  severity: text('severity').notNull(), // info | warning | error | success
  message: text('message').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
