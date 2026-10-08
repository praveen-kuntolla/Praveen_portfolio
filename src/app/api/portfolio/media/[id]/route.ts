import { loadMedia, mediaFailure, requireLocal } from '@/features/portfolio/media-server';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 try{
  requireLocal(request);const {id}=await context.params;const {metadata,bytes}=await loadMedia(id);
  const headers:Record<string,string>={'Content-Type':metadata.type,'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=31536000, immutable','Accept-Ranges':'bytes','Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(metadata.name)}`};
  const range=request.headers.get('range');
  if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
   const start=match[1]?Number(match[1]):Math.max(0,bytes.length-Number(match[2]));const end=match[1]?(match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1):bytes.length-1;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=bytes.length||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
   headers['Content-Range']=`bytes ${start}-${end}/${bytes.length}`;headers['Content-Length']=String(end-start+1);return new Response(new Uint8Array(bytes.subarray(start,end+1)),{status:206,headers});
  }
  headers['Content-Length']=String(bytes.length);return new Response(new Uint8Array(bytes),{headers});
 }catch(error){return mediaFailure(error);}
}
