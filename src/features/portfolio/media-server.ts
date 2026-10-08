import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { uploadLimits, validateSelectedFile, type MediaKind, type UploadMetadata } from './media';
export class MediaError extends Error { constructor(message:string,public status=400){super(message);} }
const types: Record<string,string> = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf',txt:'text/plain'};
// User-uploaded files are runtime data, never build inputs.
export const uploadRoot = () => resolve(/* turbopackIgnore: true */ process.env.PORTFOLIO_UPLOAD_DIR || join(process.cwd(),'.portfolio-uploads'));
export function detectType(bytes:Uint8Array, extension:string):string {
 const b=Buffer.from(bytes); let valid=false;
 switch(extension){
 case'png':valid=b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.toString('ascii',12,16)==='IHDR';break;
 case'jpg':case'jpeg':valid=b.length>3&&b[0]===255&&b[1]===216&&b[2]===255;break;
 case'gif':valid=b.length>=13&&['GIF87a','GIF89a'].includes(b.toString('ascii',0,6));break;
 case'webp':valid=b.length>=20&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';break;
 case'mp4':valid=b.length>=24&&b.toString('ascii',4,8)==='ftyp';break;
 case'webm':valid=b.length>=8&&b.subarray(0,4).equals(Buffer.from([26,69,223,163]));break;
 case'pdf':valid=b.length>=8&&b.toString('ascii',0,5)==='%PDF-';break;
 case'txt':try{const decoded=new TextDecoder('utf-8',{fatal:true}).decode(b);valid=!decoded.includes('\0')&&decoded.trim().length>0;}catch{}break;
 }
 if(!valid)throw new MediaError('File contents do not match a supported format. Select a valid image, video, PDF or text file.',415);
 return types[extension];
}
export function requireLocal(request:Request,write=false){
 const internal=new URL(request.url);let url:URL;try{url=new URL(`${internal.protocol}//${request.headers.get('host')||internal.host}`);}catch{throw new MediaError('Invalid upload host.',403);}
 // Next may reconstruct request.url using its internal localhost listener.
 // Compare Origin to the browser-facing Host, after restricting that host to loopback.
 if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new MediaError('Device uploads are available only on this local portfolio server.',403);
 if(write && (request.headers.get('origin')!==url.origin || request.headers.get('sec-fetch-site')==='cross-site'))throw new MediaError('Upload must come from this portfolio’s own Back Office.',403);
}
export async function boundedFormData(request:Request):Promise<FormData>{
 if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new MediaError('Send the file using multipart/form-data.',415);
 const limit=uploadLimits.video+65536;const declared=Number(request.headers.get('content-length'));
 if(declared>limit)throw new MediaError('Upload request is too large. Maximum video size is 50 MB.',413);
 if(!request.body)throw new MediaError('No upload body was supplied.');
 const reader=request.body.getReader();let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new MediaError('Upload request is too large.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 try{return await new Response(new Uint8Array(Buffer.concat(chunks)),{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();}catch{throw new MediaError('Malformed multipart upload. Select the file again.');}
}
export async function storeMedia(file:File,kind:MediaKind):Promise<UploadMetadata>{
 const invalid=validateSelectedFile(file,kind);if(invalid)throw new MediaError(invalid,file.size>uploadLimits[kind]?413:415);
 const bytes=new Uint8Array(await file.arrayBuffer());const extension=file.name.split('.').at(-1)!.toLowerCase();const type=detectType(bytes,extension);
 if(file.type && file.type!=='application/octet-stream' && file.type!==type)throw new MediaError('The file’s content type does not match its contents.',415);
 const id=createHash('sha256').update(bytes).digest('hex')+'.'+(extension==='jpeg'?'jpg':extension);const root=uploadRoot();await mkdir(root,{recursive:true});
 const metadata:UploadMetadata={id,url:`/api/portfolio/media/${id}`,name:file.name.replace(/[\x00-\x1f\x7f]/g,'').slice(0,255),type,size:bytes.length,kind,createdAt:new Date().toISOString()};
 try{await writeFile(join(/* turbopackIgnore: true */ root,id),bytes,{flag:'wx'});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
 try{await writeFile(join(/* turbopackIgnore: true */ root,id+'.json'),JSON.stringify(metadata),{flag:'wx'});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
 return metadata;
}
export async function loadMedia(id:string){
 if(!/^[a-f0-9]{64}\.(png|jpg|gif|webp|mp4|webm|pdf|txt)$/.test(id))throw new MediaError('File not found.',404);
 try{const root=uploadRoot();const metadata=JSON.parse(await readFile(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ root,id+'.json'),'utf8')) as UploadMetadata;const bytes=await readFile(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ root,id));return {metadata,bytes};}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')throw new MediaError('File not found.',404);throw error;}
}
export function mediaFailure(error:unknown){
 if(error instanceof MediaError)return Response.json({error:error.message},{status:error.status});
 const code=(error as NodeJS.ErrnoException)?.code;
 if(['EACCES','EPERM','EROFS'].includes(code??''))return Response.json({error:'Upload storage is not writable. Check folder permissions.'},{status:503});
 if(code==='ENOSPC')return Response.json({error:'The device has no free space for this upload.'},{status:507});
 return Response.json({error:'The file could not be saved or retrieved. Please retry.'},{status:500});
}
