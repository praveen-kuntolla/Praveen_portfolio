import { getStore } from '@netlify/blobs';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
export const hostedStorage=()=>process.env.NETLIFY==='true'||!!process.env.NETLIFY_BLOBS_CONTEXT||!!globalThis.netlifyBlobsContext||!!process.env.PORTFOLIO_BLOBS_SITE_ID;
const store=()=>getStore({name:'portfolio-content',consistency:'strong',...(process.env.PORTFOLIO_BLOBS_SITE_ID?{siteID:process.env.PORTFOLIO_BLOBS_SITE_ID,token:process.env.PORTFOLIO_BLOBS_TOKEN}:{})});
const file=(key:string)=>{if(!/^[a-zA-Z0-9/_\-.]+$/.test(key)||key.includes('..'))throw new Error('Invalid storage key');return join(/* turbopackIgnore: true */ resolve(/* turbopackIgnore: true */ process.env.PORTFOLIO_UPLOAD_DIR||join(process.cwd(),'.portfolio-uploads')),'content',key);};
export async function putContent(key:string,bytes:Uint8Array,metadata:Record<string,unknown>={}){
 if(hostedStorage()){await store().set(key,new Uint8Array(bytes).buffer,{metadata});return;}
 const target=file(key);await mkdir(dirname(target),{recursive:true});await writeFile(/* turbopackIgnore: true */ target,bytes);await writeFile(/* turbopackIgnore: true */ target+'.json',JSON.stringify(metadata));
}
export async function getContent(key:string){
 if(hostedStorage()){const entry=await store().getWithMetadata(key,{type:'arrayBuffer'});return entry?{bytes:Buffer.from(entry.data),metadata:entry.metadata}:null;}
 try{return {bytes:await readFile(/* turbopackIgnore: true */ file(key)),metadata:JSON.parse(await readFile(/* turbopackIgnore: true */ file(key)+'.json','utf8')) as Record<string,unknown>};}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
}
export async function deleteContent(key:string){if(hostedStorage()){await store().delete(key);return;}await rm(/* turbopackIgnore: true */ file(key),{force:true});await rm(/* turbopackIgnore: true */ file(key)+'.json',{force:true});}
