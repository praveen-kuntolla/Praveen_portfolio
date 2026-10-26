import { z } from 'zod';
import { canonicalLink, validateFieldUrl } from './media';

export const sectionKinds = ['hero', 'about', 'works', 'impact', 'experience', 'skills', 'contact'] as const;
export type SectionKind = typeof sectionKinds[number];
export const sectionNames: Record<SectionKind, string> = { hero: 'Creative Hero & Arc Carousel', about: 'About Me & Bio', works: 'Selected Works', impact: 'Impact & Statistics', experience: 'Experience & Journey', skills: 'Skills & Credentials', contact: 'Contact & Footer' };
const text = z.string().max(12000);
export function safeUrl(value: string) { return value && !validateFieldUrl(value) ? value : ''; }
const url = text.refine(v => !v || !!safeUrl(v), 'Use an https URL, local path, email, phone or section anchor.');
export const cardLinkSchema = z.object({ id: text.min(1), label: text.max(250), url });
const cardLinksSchema = z.array(cardLinkSchema).max(10).default([]).refine(links => { const urls = links.filter(l=>l.url).map(l=>canonicalLink(l.url)); return new Set(urls).size === urls.length; }, 'A card cannot contain duplicate link URLs.');
const itemSchema = z.object({ id: text.min(1), title: text, image: url, video: url, client: text, platform: text, metric: text, links: cardLinksSchema, color: z.enum(['#BA5C41', '#706852', '#2B2624', '#EBE0D5']) });
export const portfolioSchema = z.object({
  version: z.literal(1),
  sections: z.array(z.object({ id: z.enum(sectionKinds), visible: z.boolean() })).length(7).refine(a => new Set(a.map(s => s.id)).size === 7, 'Each section must appear exactly once.'),
  hero: z.object({ welcome: text, name: text, role: text, title: text, coordinates: text, availability: text, cards: z.array(itemSchema).max(20) }),
  about: z.object({ kicker: text, headline: text, bio: text, portrait: url, badge: text, cta1: text, link1: url, cta2: text, link2: url }),
  works: z.object({ title: text, subtitle: text, shake: z.number().int().min(0).max(2), top: z.array(itemSchema).max(40), bottom: z.array(itemSchema).max(40) }),
  impact: z.object({ kicker: text, title: text, items: z.array(z.object({ id: text.min(1), metric: text, label: text, description: text })).max(24) }),
  experience: z.object({ kicker: text, title: text, items: z.array(z.object({ id: text.min(1), date: text, location: text, company: text, role: text, present: z.boolean(), tags: z.array(text).max(30) })).max(30), journey: z.array(z.object({ id: text.min(1), code: text, country: text, caption: text })).max(10) }),
  skills: z.object({ kicker: text, title: text, items: z.array(z.object({ id: text.min(1), title: text, tags: z.array(text).max(30) })).max(30), education: text, awards: text, mobility: text }),
  contact: z.object({ headline: text, accent: text, email: text.email(), alias: text.email(), phone: text, cv: url, name: text, copyright: text, socials: z.array(z.object({ id: text.min(1), label: text, url })).max(12) }),
  styles: z.record(z.string(), z.enum(['sans', 'serif', 'mono'])),
});
export type PortfolioData = z.infer<typeof portfolioSchema>;
export type Project = z.infer<typeof itemSchema>;
export type Path = (string | number)[];
export const DRAFT_KEY = 'pk-studio-draft-v1';
export const LIVE_KEY = 'pk-studio-live-v1';
const project = (id: string, title: string, image: string, platform: string, metric: string, color: Project['color'] = '#BA5C41'): Project => ({ id, title, image: `/portfolio/${image}.svg`, platform, metric, color, client: 'Selected creative direction', video: '', links: [] });
const cards = [project('motion', 'Made to move.', 'motion', 'Motion Design', 'Rhythm. Energy. Impact.'), project('editorial', 'A different perspective', 'editorial', 'Visual Storytelling', 'Story comes first.', '#706852'), project('brand', 'Good things take shape', 'brand', 'Brand Creative', 'Ideas into identities.'), project('travel', 'Postcards from elsewhere', 'travel', 'Short-Form Video', 'Across three countries.', '#706852'), project('culture', 'Culture in every frame', 'culture', 'Social Content', 'Content that connects.', '#2B2624')];
export const defaultPortfolio: PortfolioData = {
 version: 1, sections: sectionKinds.map(id => ({ id, visible: true })), styles: {},
 hero: { welcome: 'WELCOME TO MY', name: 'PRAVEEN KUMAR', role: 'MULTIMEDIA & VIDEO CREATIVE', title: 'PORTFOLIO', coordinates: "06°55′N 79°51′E", availability: 'OPEN TO OPPORTUNITIES', cards },
 about: { kicker: 'CONTENT CREATION THAT CONNECTS', headline: 'I craft visual stories that are engaging, dynamic and impactful.', bio: 'I’m Praveen Kumar, a Video Editor and Social Media Content Creative with 4+ years of experience creating engaging short-form content for Instagram, TikTok, YouTube Shorts, and Stories. I specialize in video editing, visual storytelling, content ideation, and performance-driven creative, with 800+ assets produced across India, Cambodia, and Sri Lanka.', portrait: '/portfolio/praveen-portrait.png', badge: 'Adobe Premiere Pro & Photoshop Specialist', cta1: 'VIEW MY WORK', link1: '#works', cta2: 'LET’S WORK TOGETHER', link2: '#contact' },
 works: { title: 'SELECTED WORKS', subtitle: 'Short-Form Content & Visual Storytelling — Instagram Reels, TikTok & YouTube Shorts', shake: 1, top: [cards[0], cards[2], cards[4], cards[1]], bottom: [cards[3], {...cards[1], id: 'story', title: 'Stories worth staying for'}, {...cards[2], id: 'social', title: 'Stop the scroll'}, {...cards[0], id: 'cut', title: 'Every cut counts'}] },
 impact: { kicker: 'IMPACT', title: 'Numbers That Matter', items: [ {id:'years',metric:'4+',label:'YEARS',description:'Creative Experience'}, {id:'assets',metric:'800+',label:'ASSETS',description:'Creative Production'}, {id:'roi',metric:'3x',label:'ROI',description:'Campaign Performance'}, {id:'uplift',metric:'108%',label:'UPLIFT',description:'Conversion Rate'}, {id:'revenue',metric:'$2M+',label:'REVENUE',description:'Business Contribution'}, {id:'countries',metric:'3',label:'COUNTRIES',description:'International Experience (India, Cambodia, Sri Lanka)'} ] },
 experience: { kicker:'EXPERIENCE',title:'Where I’ve Worked', items:[
 {id:'port',date:'MAR 2025 – PRESENT',location:'Colombo, Sri Lanka',company:'Port City BPO',role:'Content Creator & Digital Marketing Executive',present:true,tags:['Short-Form Video (Reels & TikTok)','Adobe Premiere Pro & Colour Grading','Storyboarding & Shoot Coordination','Monthly Content Calendars','3x Campaign ROI','108% Conversion Uplift']},
 {id:'mck',date:'JUL 2023 – FEB 2025',location:'Phnom Penh, Cambodia',company:'MCK H Enterprise',role:'Graphic Designer & Digital Content Executive',present:false,tags:['End-to-End Video & Photo Production','Premiere Pro & Photoshop Retouching','Meta & Telegram Ads Creative','A/B Testing & Copywriting','$2M+ Revenue Contribution in 3 Months']},
 {id:'ashoka',date:'SEP 2021 – JUN 2023',location:'Nizamabad, India',company:'Ashoka International',role:'Communications & Content Executive',present:false,tags:['International Client Acquisition Visuals','Email & Content Marketing Assets','Multi-Country Team Leadership (8 Members)','Cross-Cultural Brand Messaging']}
 ],journey:[{id:'in',code:'IN',country:'INDIA',caption:'CREATIVE ORIGINS'},{id:'kh',code:'KH',country:'CAMBODIA',caption:'AGENCY GROWTH'},{id:'lk',code:'LK',country:'SRI LANKA',caption:'LEADERSHIP'}] },
 skills:{kicker:'THE CREATIVE TOOLKIT',title:'Ideas, meet execution.',items:[
 {id:'video',title:'Video Editing & Post-Production',tags:['Adobe Premiere Pro','Cutting & pacing','Colour grading & correction','Text overlays','Reels / TikTok / Shorts / Stories','Audio recording']},
 {id:'photo',title:'Photo & Design',tags:['Adobe Photoshop','Illustrator','InDesign','Photo retouching','Carousel & static creative','Studio & on-location lighting']},
 {id:'strategy',title:'Content Strategy & Ideation',tags:['Concept development','Storyboarding','Visual storytelling','Copywriting','Trend research','Content calendars']},
 {id:'performance',title:'Social Media & Performance',tags:['Meta & Telegram Ads creative','A/B testing','Audience segmentation','Retention optimisation']},
 {id:'analytics',title:'Analytics & Collaboration',tags:['KPI tracking','ROI reporting','Cross-functional leadership']}
 ],education:'B.Com (Computer Applications) · Telangana University · 2021 · 84%, A-Grade Distinction',awards:'NCC Best Cadet Award (2021) | E-Commerce & Digital Marketing Certification (2019)',mobility:'English (Professional) · Telugu (Native) · Hindi (Conversational) | Open to Relocation (including Austria) — Immediate Onboarding'},
 contact:{headline:'HAVE A PROJECT,\nOPPORTUNITY, OR IDEA?',accent:'LET’S CREATE SOMETHING\nMEMORABLE.',email:'kuntollapraveenkumar8@gmail.com',alias:'praveenkumarkuntolla8@gmail.com',phone:'+91 7997815179',cv:'/portfolio/praveen-kumar-cv.txt',name:'PRAVEEN KUMAR KUNTOLLA',copyright:'© 2026 Praveen Kumar Kuntolla. All rights reserved.',socials:[{id:'li',label:'LinkedIn',url:'https://www.linkedin.com/in/praveen-kumar-kuntolla-69589638b/'},{id:'ig',label:'Instagram',url:'https://www.instagram.com/praveen_kuntolla?xtok=MThkaTd5ZzAzeXEzeA=='},{id:'fb',label:'Facebook',url:'https://www.facebook.com/me.tomc8/'},{id:'gh',label:'GitHub',url:'https://github.com/search?q=Praveen+Kumar+Kuntolla&type=users'},{id:'wa',label:'WhatsApp',url:'https://wa.me/917997815179'}]}
};
export function readPath(data: unknown, path: Path): unknown { return path.reduce<unknown>((v,k) => (v as Record<string | number,unknown>)?.[k], data); }
export function writePath(data: PortfolioData, path: Path, value: unknown): PortfolioData {
 // Clone each path ancestor so reused default card objects cannot couple Hero and Works edits.
 const update=(current:unknown,index:number):unknown=>{const source=current as Record<string|number,unknown>;const copy=(Array.isArray(current)?[...current]:{...source}) as Record<string|number,unknown>;const key=path[index];copy[key]=index===path.length-1?structuredClone(value):update(source[key],index+1);return copy;};
 return update(data,0) as PortfolioData;
}
export function reorder<T>(items: T[], from: number, to: number): T[] { if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items; const next = [...items]; next.splice(to,0,next.splice(from,1)[0]); return next; }
export function parsePortfolio(raw: string): PortfolioData { const data = portfolioSchema.parse(JSON.parse(raw)); if(data.about.portrait === 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85') data.about.portrait = defaultPortfolio.about.portrait; for (const items of [data.hero.cards,data.works.top,data.works.bottom,data.impact.items,data.experience.items,data.experience.journey,data.skills.items,data.contact.socials]) { if(new Set(items.map(i=>i.id)).size !== items.length) throw new Error('Item IDs must be unique within each list.'); } for(const card of [...data.hero.cards,...data.works.top,...data.works.bottom]){if(new Set(card.links.map(link=>link.id)).size!==card.links.length)throw new Error('Card link IDs must be unique.');} return data; }

