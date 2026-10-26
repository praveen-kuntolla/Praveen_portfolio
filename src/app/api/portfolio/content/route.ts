import { getContent, putContent } from '@/features/portfolio/content-store';
import { defaultPortfolio, parsePortfolio } from '@/features/portfolio/data';
import { requirePermission, requireSameOrigin } from '@/features/back-office/server';
import { MediaError, mediaFailure } from '@/features/portfolio/media-server';
export const runtime='nodejs';
function updatedSocialDefaults(data: typeof defaultPortfolio) {
 const socialDefaults = new Map(defaultPortfolio.contact.socials.map(s => [s.id, s]));
 const legacy = new Map([
  ['li', 'https://www.linkedin.com/search/results/all/?keywords=Praveen%20Kumar%20Kuntolla'],
  ['ig', 'https://www.instagram.com/'],
  ['fb', 'https://www.facebook.com/search/top?q=Praveen%20Kumar%20Kuntolla'],
 ]);
 const socials = data.contact.socials.map(s => {
  const currentDefault = socialDefaults.get(s.id);
  return currentDefault && legacy.get(s.id) === s.url ? { ...s, url: currentDefault.url } : s;
 });
 if (!socials.some(s => s.id === 'wa')) {
  const whatsapp = socialDefaults.get('wa');
  if (whatsapp) socials.push(whatsapp);
 }
 return { ...data, contact: { ...data.contact, socials } };
}
export async function GET(){try{const stored=await getContent('published');const data=stored?parsePortfolio(stored.bytes.toString('utf8')):defaultPortfolio;return Response.json(updatedSocialDefaults(data),{headers:{'Cache-Control':'no-store'}});}catch(error){return mediaFailure(error);}}
export async function PUT(request:Request){try{requireSameOrigin(request);await requirePermission('publish_content');if(Number(request.headers.get('content-length'))>2000000)throw new MediaError('Portfolio data is too large.',413);const text=await request.text();if(Buffer.byteLength(text)>2000000)throw new MediaError('Portfolio data is too large.',413);let data;try{data=parsePortfolio(text);}catch{throw new MediaError('Check portfolio fields for invalid URLs or duplicate card links.');}await putContent('published',Buffer.from(JSON.stringify(data)));return Response.json({published:true},{headers:{'Cache-Control':'no-store'}});}catch(error){return mediaFailure(error);}}
