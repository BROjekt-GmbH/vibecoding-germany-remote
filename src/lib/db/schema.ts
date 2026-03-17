import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

// Host-Kategorisierung — muss VOR hosts definiert werden (FK-Referenz)
export const hostGroups = pgTable('host_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const hosts = pgTable('hosts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  hostname: text('hostname').notNull(),
  port: integer('port').notNull().default(22),
  username: text('username').notNull(),
  authMethod: text('auth_method').notNull().default('key'), // 'key' | 'agent'
  privateKeyEnv: text('private_key_env'),
  privateKey: text('private_key'),
  groupId: uuid('group_id').references(() => hostGroups.id, { onDelete: 'set null' }),
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  path: text('path').notNull(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLogin: text('user_login').notNull().unique(),
  theme: text('theme').notNull().default('dark'),
  terminalFontSize: integer('terminal_font_size').notNull().default(14),
  terminalFontFamily: text('terminal_font_family').notNull().default('MesloLGS NF'),
  pollIntervalMs: integer('poll_interval_ms').notNull().default(2000),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const terminalTabs = pgTable('terminal_tabs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLogin: text('user_login').notNull(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull(),
  sessionName: text('session_name').notNull(),
  pane: text('pane').notNull().default('0'),
  position: integer('position').notNull().default(0),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Persistente Benachrichtigungen
export const alertHistory = pgTable('alert_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // host_offline
  severity: text('severity').notNull(), // info | warning | error | success
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Gespeicherte tmux-Layouts
export const sessionTemplates = pgTable('session_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLogin: text('user_login').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  layout: jsonb('layout').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
