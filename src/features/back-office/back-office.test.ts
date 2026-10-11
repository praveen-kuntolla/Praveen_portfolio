// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { accessUpdateSchema, credentialsSchema, invitationSchema, permissionNames } from './model';
import { requireSameOrigin, BackOfficeError } from './server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('back-office security validation',()=>{
 it('accepts password-manager-friendly credentials without inventing a stricter client policy',()=>{expect(credentialsSchema.safeParse({email:'Owner@Example.com',password:'simple'}).data).toEqual({email:'owner@example.com',password:'simple'});expect(credentialsSchema.safeParse({email:'bad',password:'12345'}).success).toBe(false);});
 it('rejects role injection and unknown permissions',()=>{expect(invitationSchema.safeParse({email:'admin@example.com',permissions:['view_back_office'],role:'super_admin'}).success).toBe(false);expect(invitationSchema.safeParse({email:'admin@example.com',permissions:['super_admin']}).success).toBe(false);expect(accessUpdateSchema.safeParse({userId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',permissions:permissionNames,status:'active',role:'super_admin'}).success).toBe(false);});
 it('requires same-origin mutation requests',()=>{expect(()=>requireSameOrigin(new Request('https://portfolio.test/api/back-office/auth',{headers:{host:'portfolio.test',origin:'https://evil.test'}}))).toThrow(BackOfficeError);expect(()=>requireSameOrigin(new Request('http://127.0.0.1:3001/api/back-office/auth',{headers:{host:'127.0.0.1:3001',origin:'http://127.0.0.1:3001'}}))).not.toThrow();});
});
describe('database authorization contract',()=>{
 const sql=readFileSync(join(process.cwd(),'supabase/migrations/202610110002_back_office_auth.sql'),'utf8');
 it('keeps public signups pending and privileged tables client-read-only',()=>{expect(sql).toContain("role public.back_office_role not null default 'pending'");expect(sql).toContain("status public.back_office_status not null default 'pending'");expect(sql).toContain('revoke all on public.back_office_access, public.back_office_invitations, public.back_office_audit_log from anon, authenticated');expect(sql).not.toMatch(/grant\s+(insert|update|delete).*back_office_access/i);});
 it('enforces invitation subset, super-admin protection, and active status in SQL',()=>{expect(sql).toContain('not requested <@ actor.permissions');expect(sql).toContain("if subject.role='super_admin' or subject.user_id=actor.user_id");expect(sql).toContain("and status='active'");expect(sql).toContain("'administrator_revoked'");});
});
