import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AccessProfile, BackOfficePermission } from './model';

export class BackOfficeError extends Error { constructor(message:string, public status=400){super(message);} }
export const backOfficeResponse=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export const backOfficeFailure=(error:unknown)=>backOfficeResponse({error:error instanceof BackOfficeError?error.message:'Back-office service unavailable. Check the migration and environment settings.'},error instanceof BackOfficeError?error.status:503);
export function requireSameOrigin(request:Request){let source:URL;try{source=new URL(request.headers.get('origin')||'');}catch{throw new BackOfficeError('Use this website’s back office.',403);}const host=request.headers.get('host')||new URL(request.url).host;if(source.host!==host||request.headers.get('sec-fetch-site')==='cross-site')throw new BackOfficeError('Use this website’s back office.',403);}
export async function readJson(request:Request){const text=await request.text();if(text.length>32000)throw new BackOfficeError('Request is too large.',413);try{return JSON.parse(text);}catch{throw new BackOfficeError('Invalid request.');}}
export async function getAccess():Promise<{db:Awaited<ReturnType<typeof createSupabaseServerClient>>;profile:AccessProfile}> {
 const db=await createSupabaseServerClient();const {data:{user},error}=await db.auth.getUser();if(error||!user)throw new BackOfficeError('Sign in to continue.',401);
 const {data,error:accessError}=await db.from('back_office_access').select('role,status,permissions').eq('user_id',user.id).maybeSingle();
 if(accessError)throw new BackOfficeError('Access lookup failed. Run the back-office migration.',503);
 const row=data as {role:AccessProfile['role'];status:AccessProfile['status'];permissions:BackOfficePermission[]}|null;
 if(!row||row.status!=='active'||row.role==='pending')throw new BackOfficeError(row?.status==='revoked'?'Back-office access has been revoked.':'Your account is pending approval.',403);
 return {db,profile:{userId:user.id,email:user.email||'',...row}};
}
export async function requirePermission(permission:BackOfficePermission){const access=await getAccess();if(access.profile.role!=='super_admin'&&!access.profile.permissions.includes(permission))throw new BackOfficeError('You do not have permission for this action.',403);return access;}
