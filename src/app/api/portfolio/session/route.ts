import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAccess, requireSameOrigin } from '@/features/back-office/server';
import { supabaseConfigured } from '@/lib/supabase/config';
import { mediaFailure, MediaError } from '@/features/portfolio/media-server';
export const runtime='nodejs';
const failure=(error:unknown)=>mediaFailure(error instanceof Error&&'status'in error?new MediaError(error.message,Number((error as {status:number}).status)):error);
export async function GET(){if(!supabaseConfigured())return Response.json({local:false,authenticated:false,configured:false},{headers:{'Cache-Control':'no-store'}});try{const {profile}=await getAccess();return Response.json({local:false,authenticated:true,configured:true,profile},{headers:{'Cache-Control':'no-store'}});}catch(error){if(error instanceof Error&&'status'in error&&[401,403].includes(Number((error as {status:number}).status)))return Response.json({local:false,authenticated:false,configured:true,error:error.message},{status:Number((error as {status:number}).status),headers:{'Cache-Control':'no-store'}});return failure(error);}}
export async function POST(){return Response.json({error:'Use /studio/login to sign in with Supabase.'},{status:410,headers:{'Cache-Control':'no-store'}});}
export async function DELETE(request:Request){try{requireSameOrigin(request);const db=await createSupabaseServerClient();await db.auth.signOut();return Response.json({authenticated:false},{headers:{'Cache-Control':'no-store'}});}catch(error){return failure(error);}}
