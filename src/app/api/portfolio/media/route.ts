import { deleteContent } from '@/features/portfolio/content-store';
import { requirePermission, requireSameOrigin } from '@/features/back-office/server';
import { acceptUploadChunk } from '@/features/portfolio/upload-chunks';
import { boundedFormData, mediaFailure, MediaError, storeMedia } from '@/features/portfolio/media-server';
import type { MediaKind } from '@/features/portfolio/media';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  requireSameOrigin(request);await requirePermission('manage_media');const form=await boundedFormData(request);if(form.has('uploadId'))return Response.json(await acceptUploadChunk(form),{status:200});const file=form.get('file');const kind=form.get('kind');
  if(!(file instanceof File))throw new MediaError('Select one file to upload.');
  if(!['image','video','document'].includes(String(kind)))throw new MediaError('Choose an image, video or document field.');
  if(form.getAll('file').length!==1)throw new MediaError('Upload one file at a time.');
  return Response.json(await storeMedia(file,kind as MediaKind),{status:201});
 }catch(error){return mediaFailure(error);}
}
export async function DELETE(request:Request){try{requireSameOrigin(request);await requirePermission('manage_media');const body=await request.json();if(!/^[a-f0-9-]{36}$/.test(body.uploadId)||!Number.isInteger(body.total)||body.total<1||body.total>50)throw new MediaError('Invalid upload cleanup.');await Promise.all(Array.from({length:body.total},(_,index)=>deleteContent('uploads/'+body.uploadId+'/'+index)));return Response.json({cancelled:true});}catch(error){return mediaFailure(error);}}
