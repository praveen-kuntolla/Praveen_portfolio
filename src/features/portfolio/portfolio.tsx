'use client';
import { videoEmbedUrl } from './video-links';
import { imageDisplayUrl } from './image-links';
import { applyPublishedMedia } from '@/features/media-library/model';
/* User-editable URLs and native media need ordinary img elements and graceful fallbacks. */
/* eslint-disable @next/next/no-img-element, @next/next/no-page-custom-font */
import Link from 'next/link';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowUpRight, ArrowDown, ArrowUp, Crosshair, MapPin, Play, Plus, Pencil, X, Check, Film, Download, GripVertical } from 'lucide-react';
import { defaultPortfolio, LIVE_KEY, parsePortfolio, readPath, safeUrl, sectionNames, type Path, type PortfolioData, type Project, type SectionKind } from './data';
import './portfolio.css';

export interface Editor {
 data: PortfolioData; editing: boolean; selected?: SectionKind; mediaStatus?: string;
 change: (path: Path, value: unknown) => void;
 begin: () => void; finish: (cancel?: boolean) => void;
 open: (section: SectionKind) => void; moveSection: (section: SectionKind, direction: number) => void;
 add: (section: SectionKind) => void;
 drop: (from: Path, index: number, to: Path, target: number) => void;
 report?: (message:string)=>void;
 uploadStatus?: (delta:number)=>void;
 saveMedia?: (path:Path,value:string,ownerId?:string)=>void;
}
const EditContext = createContext<Editor | null>(null);
export function EditableText({ path, children, multiline = false }: { path: Path; children?: ReactNode; multiline?: boolean }) {
 const editor = useContext(EditContext); const [active,setActive] = useState(false); const input = useRef<HTMLTextAreaElement>(null);
 const value = String(editor ? readPath(editor.data,path) ?? '' : children ?? '');
 const key = path.join('.'); const font = editor?.data.styles[key];
 useEffect(() => { if(active) { input.current?.focus(); input.current?.select(); } },[active]);
 const finish = (cancel = false) => { editor?.finish(cancel); setActive(false); };
 if (!editor?.editing) return <span className={font ? `font-${font}` : undefined}>{children ?? value}</span>;
 return <span onBlurCapture={event=>{if(active && !event.currentTarget.contains(event.relatedTarget as Node))finish();}} className={`pk-editable ${active?'is-active':''} ${font?`font-${font}`:''}`} onClick={e=>e.stopPropagation()}>
 {active ? <>
 <textarea ref={input} aria-label={`Edit ${key}`} value={value} rows={multiline?4:1} style={{height:`${Math.max(multiline?4:1,value.split('\n').length)}lh`}} onChange={e=>editor.change(path,e.target.value)} onKeyDown={e=>{if(e.key==='Escape')finish(true); if(e.key==='Enter' && !e.shiftKey && !multiline){e.preventDefault();finish();}}} />
 <span className="pk-edit-toolbar"><button aria-label="Save text" onClick={()=>finish()}><Check size={12}/> Save</button><button aria-label="Cancel text edit" onClick={()=>finish(true)}><X size={12}/> Cancel</button><select aria-label="Font style" value={font || 'sans'} onChange={e=>editor.change(['styles',key],e.target.value)}><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select><button onClick={()=>editor.change(path,readPath(defaultPortfolio,path) ?? '')}>Reset</button></span>
 </> : <span role="button" tabIndex={0} aria-label={`Edit ${key}`} onClick={()=>{editor.begin();setActive(true);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();editor.begin();setActive(true);}}}>{value || 'Empty text'}<span className="pk-edit-hint">Click to Edit</span></span>}
 </span>;
}
function Text({ path, multiline = false }: {path: Path; multiline?: boolean}) { const e = useContext(EditContext)!; return <EditableText path={path} multiline={multiline}>{String(readPath(e.data,path) ?? '')}</EditableText>; }
export function EditableMedia({ src, alt, section, className = '' }: {src: string; alt: string; section: SectionKind; className?:string}) {
 const editor = useContext(EditContext); const [failed,setFailed] = useState<string | null>(null);
 return <span className={`pk-media ${className}`} role={editor?.editing?'button':undefined} tabIndex={editor?.editing?0:undefined} aria-label={editor?.editing?`Edit ${alt}`:undefined} onClick={()=>editor?.editing&&editor.open(section)} onKeyDown={e=>{if(editor?.editing&&e.key==='Enter')editor.open(section);}}>
 <img src={failed===src || !safeUrl(src)?'/portfolio/motion.svg':imageDisplayUrl(src)} alt={alt} loading="lazy" onError={()=>setFailed(src)} />{editor?.editing&&<span className="pk-media-hint"><Pencil size={12}/> Edit media</span>}
 </span>;
}
function DragItem({path,index,children,className=''}:{path:Path;index:number;children:ReactNode;className?:string}){
 const e=useContext(EditContext)!;
 return <div data-pk-layout={e.editing ? [path.join('.'), (readPath(e.data,[...path,index,'id']) ?? index)].join(':') : undefined} className={className} draggable={e.editing} onDragStart={event=>{event.stopPropagation();event.dataTransfer.setData('application/pk-item',JSON.stringify({path,index}));event.dataTransfer.effectAllowed='move';}} onDragOver={event=>{if(e.editing){event.preventDefault();event.stopPropagation();}}} onDrop={event=>{if(!e.editing)return;event.preventDefault();event.stopPropagation();try{const from=JSON.parse(event.dataTransfer.getData('application/pk-item'));e.drop(from.path,from.index,path,index);}catch{}}}>{e.editing&&<span className="pk-drag-handle" aria-hidden><GripVertical size={14}/></span>}{children}</div>;
}
function ProjectLinks({project,section='works'}:{project:Project;section?:SectionKind}){
 const editor=useContext(EditContext);
 if(!project.links?.some(link=>safeUrl(link.url)))return null;
 return <span className="pk-card-links">{project.links.filter(link=>safeUrl(link.url)).map(link=><a key={link.id} href={safeUrl(link.url)} target="_blank" rel="noopener noreferrer" onClick={event=>{if(editor?.editing){event.preventDefault();editor.open(section);}}}>{link.label||'View project'}<ArrowUpRight size={12}/></a>)}</span>;
}
function Kicker({children}: {children:ReactNode}) { return <div className="pk-kicker"><span/>{children}</div>; }
function Counter({metric}:{metric:string}){
 const ref=useRef<HTMLSpanElement>(null);const [shown,setShown]=useState(metric);
 useEffect(()=>{const el=ref.current;if(!el)return; const match=metric.match(/^(\$?)(\d+)(.*)$/);if(!match)return; let raf=0; const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)return;observer.disconnect();if(matchMedia('(prefers-reduced-motion: reduce)').matches)return; const start=performance.now();const tick=(now:number)=>{const progress=Math.min((now-start)/1300,1);setShown(`${match[1]}${Math.round(Number(match[2])*(1-Math.pow(1-progress,3)))}${match[3]}`);if(progress<1)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);},{threshold:.5});observer.observe(el);return()=>{observer.disconnect();cancelAnimationFrame(raf);};},[metric]);
 return <span ref={ref} aria-label={metric}>{shown}</span>;
}
function ProjectDialog({project,onClose}:{project:Project|null;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(project){ref.current?.showModal();}else ref.current?.close();},[project]);
 return <dialog ref={ref} className="pk-project-dialog" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><button className="pk-dialog-close" aria-label="Close project" onClick={onClose}><X/></button>{project&&<><div className="pk-dialog-visual">{project.video&&videoEmbedUrl(project.video)?<iframe src={videoEmbedUrl(project.video)} title={project.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen/>:project.video&&safeUrl(project.video)?<video src={project.video} controls playsInline autoPlay poster={imageDisplayUrl(safeUrl(project.image))} onError={e=>{e.currentTarget.insertAdjacentText('afterend','This video could not load. Check the media URL in Studio.');}}/>:<img src={imageDisplayUrl(safeUrl(project.image))||"/portfolio/motion.svg"} alt={project.title} onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src="/portfolio/motion.svg";}}/>}</div><div className="pk-dialog-copy"><Kicker>{project.platform}</Kicker><h2>{project.title}</h2><p>{project.client} · {project.metric}</p><ProjectLinks project={project}/>{project.video&&safeUrl(project.video)&&<a href={safeUrl(project.video)} target="_blank" rel="noopener noreferrer">Open original video ↗</a>}{!project.video&&!/^[0-9a-f]{8}-/i.test(project.id)&&<p className="pk-sample-note">Concept artwork. Original reel footage can be added in PK Studio.</p>}</div></>}</dialog>;
}
function Hero(){
 const e=useContext(EditContext)!;const [offset,setOffset]=useState(0);const [paused,setPaused]=useState(false); const pointer=useRef<number|null>(null);
 useEffect(()=>{if(e.editing||paused||e.data.hero.cards.length<2||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setOffset(n=>(n+1)%e.data.hero.cards.length),4200);return()=>clearInterval(timer);},[e.editing,paused,e.data.hero.cards.length]);
 const cards=e.data.hero.cards;const ordered=cards.map((_,i)=>({card:cards[(i+offset)%cards.length],index:(i+offset)%cards.length})).slice(0,7);
 return <div className="pk-hero-inner"><div className="pk-hero-strip"><Text path={['hero','welcome']}/><span className="pk-cross-coordinate"><Crosshair size={22}/><Text path={['hero','coordinates']}/></span></div><div className="pk-orange-block" aria-hidden/><div className="pk-hero-labels"><span><Text path={['hero','name']}/></span><span><Text path={['hero','role']}/></span></div><h1 className="pk-hero-title"><span className="pk-sliced" data-title={e.data.hero.title}><Text path={['hero','title']}/></span></h1>
 <div className="pk-arc" aria-label="Creative project carousel" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={()=>setPaused(false)} onPointerDown={event=>{pointer.current=event.clientX;}} onPointerUp={event=>{if(pointer.current!==null&&Math.abs(event.clientX-pointer.current)>40)setOffset(n=>(n+(event.clientX<pointer.current!?1:cards.length-1))%Math.max(cards.length,1));pointer.current=null;}}>
 {ordered.map(({card,index},position)=>{const x=position-(ordered.length-1)/2;return <DragItem key={card.id} path={['hero','cards']} index={index} className="pk-arc-position"><div className="pk-arc-card" style={{'--arc-x':`${x*158}px`,'--arc-y':`${x*x*20}px`,'--arc-r':`${x*10}deg`,'--card-color':card.color} as CSSProperties}><EditableMedia src={card.image} alt={card.title} section="hero"/><span className="pk-arc-caption"><Text path={['hero','cards',index,'title']}/><ArrowUpRight size={14}/></span><ProjectLinks project={card} section="hero"/></div></DragItem>;})}
 </div><div className="pk-hero-bottom"><span className="pk-mono">VIDEO · DESIGN · STORY</span><a href="#about" className="pk-scroll-medallion" aria-label="Scroll to About Me"><svg viewBox="0 0 130 70" aria-hidden><defs><path id="pk-curve" d="M 15,60 A 50,50 0 0,1 115,60"/></defs><text><textPath href="#pk-curve" startOffset="50%" textAnchor="middle">PORTFOLIO · SCROLL ·</textPath></text></svg><ArrowDown size={19}/><small>ME</small></a><span className="pk-availability"><i/><Text path={['hero','availability']}/></span></div></div>;
}
function About(){const e=useContext(EditContext)!;return <div className="pk-about pk-container"><div className="pk-about-copy pk-reveal"><Kicker><Text path={['about','kicker']}/></Kicker><h2><Text path={['about','headline']}/></h2><p><Text path={['about','bio']} multiline/></p><div className="pk-cta-row"><a className="pk-btn pk-olive" href={safeUrl(e.data.about.link1)} onClick={ev=>e.editing&&ev.preventDefault()}><Text path={['about','cta1']}/><ArrowUpRight size={16}/></a><a className="pk-btn pk-outline" href={safeUrl(e.data.about.link2)} onClick={ev=>e.editing&&ev.preventDefault()}><Text path={['about','cta2']}/><ArrowUpRight size={16}/></a></div></div><div className="pk-portrait-composition pk-reveal"><span className="pk-portrait-circle"/><span className="pk-portrait-ring"/><Crosshair className="pk-portrait-cross" size={25}/><span className="pk-portrait-tech pk-mono">24 FPS / 4K RAW / 9:16</span><EditableMedia className="pk-portrait" src={e.data.about.portrait} alt="Praveen Kumar Kuntolla in a charcoal hoodie" section="about"/><span className="pk-specialist"><Film size={20}/><Text path={['about','badge']}/></span><span className="pk-portrait-note pk-mono">FIG. 01 / THE CREATIVE BEHIND THE CUT<br/>VIDEO EDITOR &amp; CONTENT CREATIVE</span></div></div>;}
function Works({openProject}:{openProject:(p:Project)=>void}){const e=useContext(EditContext)!;return <div className="pk-works"><div className="pk-container pk-works-heading pk-reveal"><div><Kicker>THE SHOWREEL, FRAME BY FRAME</Kicker><h2><Text path={['works','title']}/></h2><p><Text path={['works','subtitle']}/></p></div><span className="pk-mono">SELECTED DIRECTION</span></div>{e.mediaStatus&&<p className="pk-container" role="status">{e.mediaStatus}</p>}{(['top','bottom'] as const).map(row=>{const items=e.data.works[row];return <div key={row} className={`pk-marquee pk-${row} shake-${e.data.works.shake}`} aria-label={`${row} reel gallery`}><div className="pk-marquee-track">{(e.editing?items:[...items,...items]).map((card,i)=>{const index=i%items.length;const clone=i>=items.length;return <DragItem key={`${card.id}-${i}`} path={['works',row]} index={index} className="pk-reel-wrap"><div className="pk-reel" style={{'--float-time':`${3+index*.45}s`,'--float-delay':`${-index*.9}s`,'--card-color':card.color} as CSSProperties}><img src={imageDisplayUrl(safeUrl(card.image))||'/portfolio/motion.svg'} alt={clone?'':card.title} loading="lazy" onError={ev=>{ev.currentTarget.onerror=null;ev.currentTarget.src='/portfolio/motion.svg';}}/><span className="pk-reel-index pk-mono">{String(index+1).padStart(2,'0')} / <Text path={['works',row,index,'platform']}/></span><button className="pk-play" tabIndex={clone?-1:0} aria-label={`${e.editing?'Edit':'View'} ${card.title}`} onClick={()=>e.editing?e.open('works'):openProject(card)}><Play size={20} fill="currentColor"/></button><div className="pk-reel-meta"><span className="pk-mono"><Text path={['works',row,index,'client']}/></span><h3><Text path={['works',row,index,'title']}/></h3><p><Text path={['works',row,index,'metric']}/><ArrowUpRight size={16}/></p><ProjectLinks project={card}/></div></div></DragItem>;})}</div></div>;})}<p className="pk-concept-caption pk-mono">{e.mediaStatus === undefined ? "CONCEPT ARTWORK / ORIGINAL FOOTAGE AVAILABLE TO ADD IN STUDIO" : "SELECTED MEDIA / IMAGE & VIDEO"}</p></div>;}
function Impact(){const e=useContext(EditContext)!;return <div className="pk-container pk-impact"><div className="pk-centered pk-reveal"><Kicker><Text path={['impact','kicker']}/></Kicker><h2><Text path={['impact','title']}/></h2></div><div className="pk-stats-grid">{e.data.impact.items.map((s,i)=><DragItem key={s.id} path={['impact','items']} index={i} className="pk-stat pk-reveal"><strong>{e.editing?<Text path={['impact','items',i,'metric']}/>:<Counter metric={s.metric}/>}</strong><h3><Text path={['impact','items',i,'label']}/></h3><p><Text path={['impact','items',i,'description']}/></p></DragItem>)}</div></div>;}
function Experience(){const e=useContext(EditContext)!;return <div className="pk-container pk-experience"><div className="pk-reveal"><Kicker><Text path={['experience','kicker']}/></Kicker><h2><Text path={['experience','title']}/></h2></div><div className="pk-jobs">{e.data.experience.items.map((job,i)=><DragItem key={job.id} path={['experience','items']} index={i} className="pk-job pk-reveal"><div className="pk-job-date"><Text path={['experience','items',i,'date']}/><p><MapPin size={13}/><Text path={['experience','items',i,'location']}/></p></div><div><h3><Text path={['experience','items',i,'company']}/>{job.present&&<span className="pk-present">PRESENT</span>}</h3><h4><Text path={['experience','items',i,'role']}/></h4><div className="pk-tags">{job.tags.map((tag,n)=><span key={n}><Text path={['experience','items',i,'tags',n]}/></span>)}</div></div></DragItem>)}</div><div className="pk-journey pk-reveal"><svg viewBox="0 0 900 100" preserveAspectRatio="none" aria-hidden><path d="M100 50 Q300 -25 450 50 T800 50" fill="none" stroke="#706852" strokeDasharray="3 7"/></svg>{e.data.experience.journey.map((node,i)=><div key={node.id}><span className="pk-mono"><Text path={['experience','journey',i,'code']}/></span><strong><Text path={['experience','journey',i,'country']}/></strong><small><Text path={['experience','journey',i,'caption']}/></small></div>)}</div></div>;}
function Skills(){const e=useContext(EditContext)!;return <div className="pk-container pk-skills"><div className="pk-skills-heading pk-reveal"><Kicker><Text path={['skills','kicker']}/></Kicker><h2><Text path={['skills','title']}/></h2><span className="pk-skills-star" aria-hidden>✳</span></div><div className="pk-skill-grid">{e.data.skills.items.map((skill,i)=><DragItem key={skill.id} path={['skills','items']} index={i} className="pk-skill pk-reveal"><span className="pk-mono">/{String(i+1).padStart(2,'0')}</span><h3><Text path={['skills','items',i,'title']}/></h3><div className="pk-tags">{skill.tags.map((tag,n)=><span key={n}><Text path={['skills','items',i,'tags',n]}/></span>)}</div></DragItem>)}</div><div className="pk-credentials pk-reveal">{(['education','awards','mobility'] as const).map(key=><div key={key}><span className="pk-mono">{key==='education'?'EDUCATION':key==='awards'?'AWARDS & CERTIFICATIONS':'LANGUAGES & MOBILITY'}</span><p><Text path={['skills',key]}/></p></div>)}</div></div>;}
function Linkedin({size=15}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7m0-10v1m4 9v-7m0 3c0-4 6-4 6 0v4"/></svg>;}
function Instagram({size=15}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".8" fill="currentColor"/></svg>;}
function Facebook({size=15}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M15 3h-2a4 4 0 0 0-4 4v14m-3-10h10m-7 0h5V7"/></svg>;}
function Github({size=15}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M8 21v-4c-4 0-6-3-6-6 0-2 1-3 2-4L3 3l5 2a16 16 0 0 1 8 0l5-2-1 4c1 1 2 2 2 4 0 3-2 6-6 6v4M8 19c-5 2-5-2-7-2"/></svg>;}
const socialIcons: Record<string,typeof Linkedin> = { LinkedIn:Linkedin, Instagram, Facebook, GitHub:Github };
function Contact(){const e=useContext(EditContext)!;return <><div className="pk-contact"><div className="pk-container"><Kicker>GOOD WORK STARTS WITH A CONVERSATION</Kicker><h2 className="pk-contact-heading pk-reveal"><Text path={['contact','headline']} multiline/><em><Text path={['contact','accent']} multiline/></em></h2><div className="pk-contact-links pk-reveal"><a href={`mailto:${e.data.contact.email}`} onClick={ev=>e.editing&&ev.preventDefault()}><Text path={['contact','email']}/><ArrowUpRight/></a><a className="pk-alias" href={`mailto:${e.data.contact.alias}`} onClick={ev=>e.editing&&ev.preventDefault()}><Text path={['contact','alias']}/></a><a href={`tel:${e.data.contact.phone.replace(/[^+\d]/g,'')}`} onClick={ev=>e.editing&&ev.preventDefault()}><Text path={['contact','phone']}/></a></div><div className="pk-contact-action"><div className="pk-socials">{e.data.contact.socials.map((s,i)=>{const Icon=socialIcons[s.label]||ArrowUpRight;return <a key={s.id} href={safeUrl(s.url)} target="_blank" rel="noopener noreferrer" onClick={ev=>e.editing&&ev.preventDefault()}><Icon size={15}/><Text path={['contact','socials',i,'label']}/><ArrowUpRight size={12}/></a>;})}</div><a className="pk-btn pk-dark" href={safeUrl(e.data.contact.cv)} download onClick={ev=>e.editing&&ev.preventDefault()}>Download CV <Download size={16}/></a></div></div></div><footer className="pk-footer pk-container"><div className="pk-footer-top"><strong><Text path={['contact','name']}/></strong><a href="#top">↑ BACK TO TOP</a></div><div className="pk-footer-bottom"><span><Text path={['contact','copyright']}/></span><span className="pk-footer-icons">{e.data.contact.socials.slice(0,3).map(s=>{const Icon=socialIcons[s.label]||ArrowUpRight;return <a key={s.id} href={safeUrl(s.url)} aria-label={s.label} target="_blank" rel="noopener noreferrer"><Icon size={15}/></a>;})}<Link href="/studio" className="pk-studio-link">PK STUDIO ↗</Link></span></div></footer></>;}
export function PortfolioCanvas({editor}:{editor:Editor}){
 const root=useRef<HTMLDivElement>(null);const positions=useRef(new Map<string,{x:number;y:number}>());const [project,setProject]=useState<Project|null>(null);
 useEffect(()=>{const el=root.current;if(!el)return;if(editor.editing){el.classList.remove('pk-scroll-ready');return;} el.classList.add('pk-scroll-ready'); const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('pk-visible');observer.unobserve(entry.target);}}),{threshold:.08});el.querySelectorAll('.pk-reveal').forEach(x=>observer.observe(x));return()=>observer.disconnect();},[editor.editing,editor.data.sections]);
 useLayoutEffect(()=>{
  const el=root.current;if(!el||!editor.editing)return;
  const next=new Map<string,{x:number;y:number}>();const scale=el.getBoundingClientRect().width/el.offsetWidth;
  el.querySelectorAll<HTMLElement>('[data-pk-layout]').forEach(node=>{
   const section=node.closest('.pk-section');const parent=section===node?el:section??el;
   const rect=node.getBoundingClientRect();const base=parent.getBoundingClientRect();const current={x:(rect.left-base.left)/scale,y:(rect.top-base.top)/scale};
   const key=node.dataset.pkLayout!;const previous=positions.current.get(key);next.set(key,current);
   if(previous&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&(Math.abs(previous.x-current.x)>1||Math.abs(previous.y-current.y)>1))node.animate([{translate:`${previous.x-current.x}px ${previous.y-current.y}px`},{translate:'0px 0px'}],{duration:500,easing:'cubic-bezier(.22,1,.36,1)'});
  });positions.current=next;
 },[editor.data,editor.editing]);
 const render=(id:SectionKind)=>{switch(id){case'hero':return <Hero/>;case'about':return <About/>;case'works':return <Works openProject={setProject}/>;case'impact':return <Impact/>;case'experience':return <Experience/>;case'skills':return <Skills/>;case'contact':return <Contact/>;}};
 return <EditContext.Provider value={editor}><div ref={root} onClickCapture={event=>{if(editor.editing)return;const anchor=(event.target as Element).closest('a');const href=anchor?.getAttribute('href');if(href&&/^#[\w-]+$/.test(href)){const target=href==='#top'?root.current:root.current?.querySelector(href);if(target){event.preventDefault();target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}}}} className={`pk-site ${editor.editing?'pk-edit-mode':'pk-live-mode'}`} id="top"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"/><a className="pk-skip" href="#about">Skip to content</a><nav className="pk-site-nav"><Link className="pk-wordmark" href="/">pk<span>®</span></Link><div><a href="#works">Work</a><a href="#about">About</a><a href="#contact">Let’s talk <ArrowUpRight size={14}/></a><a
  href={safeUrl(editor.data.contact.cv)}
  className="pk-back-office-nav"
  download
  aria-label="Download CV"
>
  Download CV <Download size={12} />
</a></div><span className="pk-mono">CREATIVE PORTFOLIO / 2026</span></nav>{editor.data.sections.filter(s=>s.visible||editor.editing).map((s,i)=><section key={s.id} data-pk-layout={editor.editing?`section:${s.id}`:undefined} id={s.id} className={`pk-section pk-section-${s.id} ${!s.visible?'pk-hidden-section':''} ${editor.selected===s.id?'pk-section-selected':''}`} style={{'--section-index':i} as CSSProperties}>{editor.editing&&<div className="pk-section-pill"><button onClick={()=>editor.open(s.id)}><Pencil size={12}/>Edit {sectionNames[s.id].split('&')[0]}</button><button aria-label={`Move ${s.id} up`} disabled={i===0} onClick={()=>editor.moveSection(s.id,-1)}><ArrowUp size={12}/></button><button aria-label={`Move ${s.id} down`} disabled={i===6} onClick={()=>editor.moveSection(s.id,1)}><ArrowDown size={12}/></button>{['hero','works','experience','impact','skills'].includes(s.id)&&<button aria-label={`Add item to ${s.id}`} onClick={()=>editor.add(s.id)}><Plus size={12}/></button>}{!s.visible&&<span>Hidden from public</span>}</div>}{render(s.id)}</section>)}<ProjectDialog project={project} onClose={()=>setProject(null)}/></div></EditContext.Provider>;
}
export function PublicPortfolio() {
 const [data, setData] = useState(defaultPortfolio);
 const [error, setError] = useState('');
 const [mediaStatus, setMediaStatus] = useState<string | undefined>('Loading media…');
 useEffect(() => {
  let active = true;
  let sequence = 0;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const load = async () => {
   const current = ++sequence;
   let next = defaultPortfolio;
   let contentError = '';
   try {
    if (local) {
     const raw = localStorage.getItem(LIVE_KEY);
     next = raw ? parsePortfolio(raw) : defaultPortfolio;
    } else {
     const response = await fetch('/api/portfolio/content', { cache: 'no-store' });
     if (!response.ok) throw new Error('Published content could not load. Please refresh.');
     next = parsePortfolio(JSON.stringify(await response.json()));
    }
   } catch { contentError = 'Published page content could not load. Please refresh.'; }
   let status: string | undefined;
   try {
    const response = await fetch('/api/media-library', { cache: 'no-store' });
    if (!response.ok) throw new Error('Media unavailable');
    const body = await response.json();
    if (body.configured && body.records.length) {
     next = applyPublishedMedia(next, body.records);
     status = '';
    }
   } catch {
    status = 'Media could not load. Refresh the page to retry.';
   }
   if (active && current === sequence) { setData(next); setError(contentError); setMediaStatus(status); }
  };
  void load();
  window.addEventListener('storage', load);
  window.addEventListener('focus', load);
  const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 60000);
  return () => { active = false; clearInterval(timer); window.removeEventListener('storage', load); window.removeEventListener('focus', load); };
 }, []);
 return <main className="pk-public-main">{error&&<p role="alert">{error}</p>}<PortfolioCanvas editor={{data,mediaStatus,editing:false,change:()=>{},begin:()=>{},finish:()=>{},open:()=>{},moveSection:()=>{},add:()=>{},drop:()=>{}}}/></main>;
}

