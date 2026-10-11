import { z } from 'zod';

export const permissionNames = ['view_back_office', 'manage_media', 'publish_content', 'invite_admins'] as const;
export type BackOfficePermission = typeof permissionNames[number];
export type BackOfficeRole = 'pending' | 'admin' | 'super_admin';
export type AccessProfile = { userId: string; email: string; role: BackOfficeRole; status: 'pending'|'active'|'revoked'; permissions: BackOfficePermission[] };
export const passwordSchema = z.string().min(6, 'Use at least 6 characters, or your stricter Supabase minimum.').max(1024);
export const credentialsSchema = z.object({ email: z.email().trim().transform(v => v.toLowerCase()), password: passwordSchema }).strict();
export const emailSchema = z.email().trim().transform(v => v.toLowerCase());
export const permissionsSchema = z.array(z.enum(permissionNames)).max(permissionNames.length).transform(v => [...new Set(v)]);
export const invitationSchema = z.object({ email: emailSchema, permissions: permissionsSchema }).strict();
export const accessUpdateSchema = z.object({ userId: z.uuid(), permissions: permissionsSchema, status: z.enum(['active','revoked']) }).strict();

export const permissionLabels: Record<BackOfficePermission,string> = {
  view_back_office: 'View back office', manage_media: 'Manage image/video links',
  publish_content: 'Publish content', invite_admins: 'Invite and manage administrators',
};
