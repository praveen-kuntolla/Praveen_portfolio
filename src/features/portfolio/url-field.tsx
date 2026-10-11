'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { canonicalLink, mediaKindForField, uploadAccept, uploadHints, validateFieldUrl, validateSelectedFile, type UploadMetadata } from './media';
import { readPath, safeUrl, type Path } from './data';
import type { Editor } from './portfolio';

export function UrlField({value,path,label,editor}:{value:string;path:Path;label:string;editor:Editor}){
 const [pending,setPending]=useState<string|null>(null);const [error,setError]=useState('');const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
 const picker=useRef<HTMLInputElement>(null);const controller=useRef<AbortController|null>(null);const id=useId();const kind=mediaKindForField(String(path.at(-1)));
 useEffect(()=>()=>{controller.current?.abort();},[]);
 const commit=()=>{
  if(pending===null)return;const next=pending.trim();let invalid=validateFieldUrl(next,kind);
  if(!invalid&&next&&path.includes('links')){const at=path.indexOf('links');const links=readPath(editor.data,path.slice(0,at+1)) as {url:string}[];const index=Number(path[at+1]);if(links.some((link,n)=>n!==index&&link.url&&canonicalLink(link.url)===canonicalLink(next)))invalid='This card already has that link. Edit the existing link or choose a different URL.';}
  if(invalid){setError(invalid);editor.report?.(invalid);return;}
  editor.change(path,next);setPending(null);setError('');setStatus(next?'Link saved to draft.':'Link removed from draft.');
 };
 const upload=async(file:File)=>{
  if(!kind)return;const invalid=validateSelectedFile(file,kind);if(invalid){setError(invalid);setStatus('');editor.report?.(invalid);return;}
  const request=new AbortController();controller.current=request;setBusy(true);setError('');setStatus('Uploading…');editor.uploadStatus?.(1);
  const ownerId=readPath(editor.data,[...path.slice(0,-1),'id']) as string|undefined;
  let stagedId:string|undefined;let stagedTotal=0;
  const timeout=setTimeout(()=>request.abort(),180000);
  try{
   if(kind==='image'){
    const url=URL.createObjectURL(file);
    try{const image=new Image();image.src=url;await image.decode();}catch{throw new Error('The selected image is damaged or cannot be decoded. Select a valid image.');}finally{URL.revokeObjectURL(url);}
   }
   if(request.signal.aborted)throw new DOMException('Upload cancelled.','AbortError');
   let response:Response;const total=Math.ceil(file.size/(1024*1024));
   if(file.size>2*1024*1024){const uploadId=crypto.randomUUID();stagedId=uploadId;stagedTotal=total;for(let part=0;part<total;part++){setStatus(`Uploading ${Math.round(part/total*100)}%…`);const form=new FormData();form.set('file',file.slice(part*1024*1024,(part+1)*1024*1024),'chunk');for(const [key,value]of Object.entries({uploadId,part,total,size:file.size,name:file.name,mime:file.type,kind}))form.set(key,String(value));response=await fetch('/api/portfolio/media',{method:'POST',body:form,signal:request.signal});if(!response.ok||part===total-1)break;const acknowledgement=await response.json();if(!acknowledgement.pending)throw new Error('Invalid upload acknowledgement. Please retry.');}}
   else{const form=new FormData();form.set('file',file);form.set('kind',kind);response=await fetch('/api/portfolio/media',{method:'POST',body:form,signal:request.signal});}
   const body=await response!.json().catch(()=>null) as (UploadMetadata & {error?:string})|null;
   if(!response!.ok)throw new Error(body?.error||`Upload failed (HTTP ${response!.status}). Please retry.`);
   if(!body||typeof body.url!=='string'||!/^\/api\/portfolio\/media\/[a-f0-9]{64}\.(png|jpg|gif|webp|mp4|webm|pdf|txt)$/.test(body.url)||body.kind!==kind)throw new Error('The server returned an invalid upload response. The previous file was kept.');
   if(request.signal.aborted)return;
   editor.saveMedia?.(path,body.url,ownerId);setPending(null);setStatus(`${file.name} uploaded and saved to draft.`);editor.report?.(`${file.name} uploaded. Publish Live when you are ready.`);
  }catch(failure){
   const message=request.signal.aborted?'Upload cancelled or timed out. The previous file was kept.':failure instanceof Error?failure.message:'Upload failed. The previous file was kept.';
   setError(message);setStatus('');editor.report?.(message);
  }finally{if(stagedId)void fetch('/api/portfolio/media',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:stagedId,total:stagedTotal})}).catch(()=>{});clearTimeout(timeout);if(controller.current===request)controller.current=null;setBusy(false);editor.uploadStatus?.(-1);}
 };
 return <div className="pk-url-field">
  <label className="pk-drawer-field" htmlFor={id}><span>{label}</span><input id={id} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} disabled={busy} value={pending??value} onChange={event=>{setPending(event.target.value);setError('');setStatus('');}} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}if(event.key==='Escape'){setPending(null);setError('');}}}/></label>
  <div className="pk-url-actions">
   {kind&&<><input ref={picker} type="file" hidden accept={uploadAccept[kind]} aria-label={`Select ${label} file`} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void upload(file);}}/><button type="button" disabled={busy} onClick={()=>picker.current?.click()}><Upload size={12}/>{busy?'Uploading…':'Upload from device'}</button></>}
   {busy&&<button type="button" onClick={()=>controller.current?.abort()}><X size={12}/>Cancel upload</button>}
   {!busy&&value&&<button type="button" onClick={()=>{editor.change(path,'');setPending(null);setError('');setStatus('Removed from this record.');}}>Remove</button>}
   {!busy&&safeUrl(value)&&<a href={safeUrl(value)} target="_blank" rel="noopener noreferrer">{kind?'Open file':'Open link'} ↗</a>}
  </div>
  {kind&&<small className="pk-upload-hint">{uploadHints[kind]}{kind==='image'?' · Direct image URL or Google Drive file sharing link (Anyone with the link).':kind==='video'?' · MP4/WebM file URL or YouTube, Vimeo, Google Drive video link.':''}</small>}
  {error&&<p className="pk-field-error" role="alert" id={`${id}-error`}>{error}</p>}
  {status&&<p className="pk-field-status" role="status">{status}</p>}
 </div>;
}
