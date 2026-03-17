import { z } from 'zod';

export const CreateHostSchema = z.object({
  name: z.string().min(1).max(100),
  hostname: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1),
  authMethod: z.enum(['key', 'agent', 'password']).default('key'),
  privateKey: z.string().optional(),
  password: z.string().optional(),
});

export const UpdateHostSchema = CreateHostSchema.partial();

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1),
  hostId: z.string().uuid(),
  description: z.string().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const UpdatePreferencesSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  terminalFontSize: z.number().int().min(8).max(32).optional(),
  terminalFontFamily: z.string().optional(),
  pollIntervalMs: z.number().int().min(500).max(30000).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type CreateHostInput = z.infer<typeof CreateHostSchema>;
export type UpdateHostInput = z.infer<typeof UpdateHostSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
