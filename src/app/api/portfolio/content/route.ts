import { getContent, putContent } from '@/features/portfolio/content-store';
import { defaultPortfolio, parsePortfolio } from '@/features/portfolio/data';
import { requirePermission, requireSameOrigin } from '@/features/back-office/server';
import { MediaError, mediaFailure } from '@/features/portfolio/media-server';
export const runtime='nodejs';
export async function GET(){try{const stored=await getContent('published');return Response.json(stored?parsePortfolio(stored.bytes.toString('utf8')):defaultPortfolio,{headers:{'Cache-Control':'no-store'}});}catch(error){return mediaFailure(error);}}
export async function PUT(request:Request){try{requireSameOrigin(request);await requirePermission('publish_content');if(Number(request.headers.get('content-length'))>2000000)throw new MediaError('Portfolio data is too large.',413);const text=await request.text();if(Buffer.byteLength(text)>2000000)throw new MediaError('Portfolio data is too large.',413);let data;try{data=parsePortfolio(text);}catch{throw new MediaError('Check portfolio fields for invalid URLs or duplicate card links.');}await putContent('published',Buffer.from(JSON.stringify(data)));return Response.json({published:true},{headers:{'Cache-Control':'no-store'}});}catch(error){return mediaFailure(error);}}
