export function videoEmbedUrl(value:string){
 try{const url=new URL(value);const host=url.hostname.toLowerCase();let id:string|null=null;
 if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){id=url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]||null;}
 if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
 if(id&&/^[a-zA-Z0-9_-]{11}$/.test(id))return `https://www.youtube-nocookie.com/embed/${id}`;
 if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){const match=url.pathname.match(/\/(?:video\/)?(\d+)/);if(match)return `https://player.vimeo.com/video/${match[1]}`;}
 if(host==='drive.google.com'){id=url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]||url.searchParams.get('id');if(id&&/^[a-zA-Z0-9_-]+$/.test(id))return `https://drive.google.com/file/d/${id}/preview`;}
 }catch{}return '';
}
