import { createSupabaseServerClient } from '@/lib/supabase/server';
import { credentialsSchema, emailSchema, passwordSchema } from '@/features/back-office/model';
import { backOfficeFailure, backOfficeResponse, BackOfficeError, getAccess, readJson, requireSameOrigin } from '@/features/back-office/server';
import { supabaseConfigured } from '@/lib/supabase/config';

function siteOrigin(request:Request){const configured=process.env.NEXT_PUBLIC_SITE_URL;return configured?new URL(configured).origin:new URL(request.url).origin;}
export async function GET(){if(!supabaseConfigured())return backOfficeResponse({configured:false,authenticated:false});try{const {profile}=await getAccess();return backOfficeResponse({configured:true,authenticated:true,profile});}catch(error){if(error instanceof BackOfficeError&&[401,403].includes(error.status))return backOfficeResponse({configured:true,authenticated:false,error:error.message},error.status);return backOfficeFailure(error);}}
export async function POST(request:Request){
 try{requireSameOrigin(request);const body=await readJson(request) as Record<string,unknown>;const action=body.action;const db=await createSupabaseServerClient();
  if(action==='login'){const parsed=credentialsSchema.safeParse({email:body.email,password:body.password});if(!parsed.success)throw new BackOfficeError('Enter a valid email and password.');const {error}=await db.auth.signInWithPassword(parsed.data);if(error)throw new BackOfficeError('Login failed. Check your email, password, and confirmation status.',401);try{const {profile}=await getAccess();return backOfficeResponse({authenticated:true,profile});}catch(error){await db.auth.signOut();throw error;}}
  if(action==='signup'){const parsed=credentialsSchema.safeParse({email:body.email,password:body.password});if(!parsed.success)throw new BackOfficeError(parsed.error.issues[0]?.message||'Check your details.');const {error}=await db.auth.signUp({...parsed.data,options:{emailRedirectTo:siteOrigin(request)+'/api/back-office/callback?next=/studio/login'}});if(error)throw new BackOfficeError(error.message);return backOfficeResponse({message:'Account created. Confirm your email if required. Your account remains pending until invited or approved.'},201);}
  if(action==='forgot'){const parsed=emailSchema.safeParse(body.email);if(!parsed.success)throw new BackOfficeError('Enter a valid email.');const {error}=await db.auth.resetPasswordForEmail(parsed.data,{redirectTo:siteOrigin(request)+'/api/back-office/callback?next=/studio/reset-password'});if(error)throw new BackOfficeError('Password reset could not be sent. Try again later.');return backOfficeResponse({message:'If that account exists, a password-reset email has been sent.'});}
  if(action==='reset'){const parsed=passwordSchema.safeParse(body.password);if(!parsed.success)throw new BackOfficeError(parsed.error.issues[0]?.message||'Choose a valid password.');const {error}=await db.auth.updateUser({password:parsed.data});if(error)throw new BackOfficeError(error.message);return backOfficeResponse({message:'Password updated. You can continue to the back office.'});}
  if(action==='logout'){await db.auth.signOut();return backOfficeResponse({authenticated:false});}
  throw new BackOfficeError('Unknown authentication action.');
 }catch(error){return backOfficeFailure(error);}
}
