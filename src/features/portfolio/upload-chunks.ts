import { createHash } from 'node:crypto';
import { deleteContent, getContent, putContent } from './content-store';
import { MediaError, storeMedia } from './media-server';
import { uploadLimits, validateSelectedFile, type MediaKind } from './media';
export const chunkSize=1024*1024;
export async function acceptUploadChunk(form:FormData){
 const id=String(form.get('uploadId'));const part=Number(form.get('part'));const total=Number(form.get('total'));const size=Number(form.get('size'));const name=String(form.get('name'));const kind=String(form.get('kind')) as MediaKind;const mime=String(form.get('mime')||'');const chunk=form.get('file');
 if(!/^[a-f0-9-]{36}$/.test(id)||!Number.isInteger(part)||!Number.isInteger(total)||!Number.isInteger(size)||!['image','video','document'].includes(kind)||total<1||total>50||part<0||part>=total||size<1||size>uploadLimits[kind]||total!==Math.ceil(size/chunkSize)||!(chunk instanceof File)||chunk.size!==(part===total-1?size-part*chunkSize:chunkSize))throw new MediaError('Invalid upload chunk. Select the file again.');
 const invalid=validateSelectedFile({name,size,type:mime},kind);if(invalid)throw new MediaError(invalid,415);
 const manifest={name,size,mime,kind,total};const digest=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');const key='uploads/'+id+'/'+part;
 await putContent(key,new Uint8Array(await chunk.arrayBuffer()),{digest,expires:Date.now()+30*60*1000});
 if(part!==total-1)return {pending:true,part};
 const chunks:Buffer[]=[];try{for(let i=0;i<total;i++){const entry=await getContent('uploads/'+id+'/'+i);if(!entry||entry.metadata.digest!==digest||Number(entry.metadata.expires)<Date.now())throw new MediaError('Upload expired or incomplete. Select the file again.');chunks.push(entry.bytes);}const bytes=Buffer.concat(chunks);if(bytes.length!==size)throw new MediaError('Upload is incomplete. Please retry.');return await storeMedia(new File([new Uint8Array(bytes)],name,{type:mime}),kind);}finally{await Promise.all(Array.from({length:total},(_,i)=>deleteContent('uploads/'+id+'/'+i).catch(()=>{})));}
}
