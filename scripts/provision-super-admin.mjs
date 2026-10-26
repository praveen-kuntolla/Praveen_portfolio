import { createClient } from '@supabase/supabase-js';
import process from 'node:process';
try { process.loadEnvFile('.env.local'); } catch {}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;const secret=process.env.SUPABASE_SECRET_KEY;
if(!url||!publicKey||!secret)throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local first.');
async function promptLine(label,{hidden=false}={}){
 process.stdout.write(label);let value='';const input=process.stdin;const raw=!!input.isTTY;
 if(raw)input.setRawMode(true);input.resume();
 return await new Promise((resolve,reject)=>{
  const cleanup=()=>{input.off('data',onData);if(raw)input.setRawMode(false);input.pause();};
  const onData=chunk=>{for(const char of chunk.toString()){
   if(char==='\u0003'){cleanup();process.stdout.write('\n');reject(new Error('Cancelled.'));return;}
   if(char==='\r'||char==='\n'){cleanup();process.stdout.write('\n');resolve(value);return;}
   if(char==='\u007f'||char==='\b'){if(value){value=value.slice(0,-1);if(!hidden)process.stdout.write('\b \b');}continue;}
   value+=char;if(!hidden)process.stdout.write(char);
  }};
  input.on('data',onData);
 });
}
const email=(await promptLine('Super-admin email: ')).trim().toLowerCase();
if(!/^\S+@\S+\.\S+$/.test(email))throw new Error('Enter a valid email address.');
const password=await promptLine('Password (input hidden): ',{hidden:true});
if(password.length<6)throw new Error('Password must contain at least 6 characters or meet your stricter Supabase policy.');
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});const publicClient=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:existingSupers,error:superError}=await admin.from('back_office_access').select('user_id,email').eq('role','super_admin').eq('status','active');if(superError)throw new Error('Run migration 202610110002_back_office_auth.sql first.');
if(existingSupers?.length&&!existingSupers.some(row=>row.email===email))throw new Error('A different active super administrator already exists. This bootstrap command will not replace it.');
const {data:list,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listError)throw listError;let user=list.users.find(item=>item.email?.toLowerCase()===email);
if(user){const {data:verified,error}=await publicClient.auth.signInWithPassword({email,password});if(error||verified.user?.id!==user.id)throw new Error('The account exists, but the supplied password did not verify. No role was changed.');await publicClient.auth.signOut();}
else{const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw new Error(created.error?.message||'Account creation failed.');user=created.data.user;}
const all=['view_back_office','manage_media','publish_content','invite_admins'];const {error:upsertError}=await admin.from('back_office_access').upsert({user_id:user.id,email,role:'super_admin',status:'active',permissions:all,invited_by:null},{onConflict:'user_id'});if(upsertError)throw upsertError;
await admin.from('back_office_audit_log').insert({actor_user_id:user.id,action:'super_admin_bootstrapped',target_user_id:user.id,target_email:email,details:{method:'local_one_time_script'}});
console.log('Super administrator provisioned. Delete SUPABASE_SECRET_KEY from .env.local if you will not send invitations locally; hosting still needs it for invitations.');
