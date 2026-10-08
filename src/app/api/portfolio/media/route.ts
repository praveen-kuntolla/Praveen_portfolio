import { boundedFormData, mediaFailure, MediaError, requireLocal, storeMedia } from '@/features/portfolio/media-server';
import type { MediaKind } from '@/features/portfolio/media';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  requireLocal(request,true);const form=await boundedFormData(request);const file=form.get('file');const kind=form.get('kind');
  if(!(file instanceof File))throw new MediaError('Select one file to upload.');
  if(!['image','video','document'].includes(String(kind)))throw new MediaError('Choose an image, video or document field.');
  if(form.getAll('file').length!==1)throw new MediaError('Upload one file at a time.');
  return Response.json(await storeMedia(file,kind as MediaKind),{status:201});
 }catch(error){return mediaFailure(error);}
}
