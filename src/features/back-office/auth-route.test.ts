// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({server:vi.fn(),access:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createSupabaseServerClient:mocks.server}));
vi.mock('@/lib/supabase/config',()=>({supabaseConfigured:()=>true}));
vi.mock('./server',async original=>({...await original<typeof import('./server')>(),getAccess:mocks.access}));
import { POST } from '@/app/api/back-office/auth/route';
import { BackOfficeError } from './server';
const request=(body:unknown)=>new Request('https://portfolio.test/api/back-office/auth',{method:'POST',headers:{host:'portfolio.test',origin:'https://portfolio.test','Content-Type':'application/json'},body:JSON.stringify(body)});
function client(){return {auth:{signUp:vi.fn().mockResolvedValue({error:null}),signInWithPassword:vi.fn().mockResolvedValue({error:null}),signOut:vi.fn().mockResolvedValue({error:null}),resetPasswordForEmail:vi.fn().mockResolvedValue({error:null}),updateUser:vi.fn().mockResolvedValue({error:null})}};}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://portfolio.test');});
describe('Supabase authentication routes',()=>{
 it('creates a signup without accepting role or permission fields',async()=>{const db=client();mocks.server.mockResolvedValue(db);const response=await POST(request({action:'signup',email:'new@example.com',password:'simple',role:'super_admin',permissions:['invite_admins']}));expect(response.status).toBe(201);expect(db.auth.signUp).toHaveBeenCalledWith({email:'new@example.com',password:'simple',options:{emailRedirectTo:'https://portfolio.test/api/back-office/callback?next=/studio/login'}});expect(JSON.stringify(db.auth.signUp.mock.calls)).not.toContain('super_admin');});
 it('signs a pending user back out after valid password authentication',async()=>{const db=client();mocks.server.mockResolvedValue(db);mocks.access.mockRejectedValue(new BackOfficeError('Your account is pending approval.',403));const response=await POST(request({action:'login',email:'pending@example.com',password:'simple'}));expect(response.status).toBe(403);expect(db.auth.signOut).toHaveBeenCalled();});
 it('supports forgot password, reset password and logout without exposing passwords',async()=>{const db=client();mocks.server.mockResolvedValue(db);expect((await POST(request({action:'forgot',email:'owner@example.com'}))).status).toBe(200);expect(db.auth.resetPasswordForEmail).toHaveBeenCalled();expect((await POST(request({action:'reset',password:'new-password'}))).status).toBe(200);expect(db.auth.updateUser).toHaveBeenCalledWith({password:'new-password'});expect((await POST(request({action:'logout'}))).status).toBe(200);});
});
