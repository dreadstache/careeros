(() => {
  if (document.querySelector('.work-switcher, .workSwitcher, .ecosystem-switcher, .shared-explore')) return;
  const fallback = [{"id": "tech", "label": "Tech & Systems", "description": "Analytics, GIS, software, automation, and systems work.", "url": "https://www.luccote.com/", "status": "live"}, {"id": "three-d", "label": "Games, Film & 3D", "description": "Interactive models, game development, technical art, and film work.", "url": "https://games.luccote.com/", "status": "live"}, {"id": "music", "label": "Music", "description": "Dreadstache releases, production, performance, and sonic experiments.", "url": "https://music.luccote.com/", "status": "live"}, {"id": "resumes", "label": "Resume Library", "description": "Focused resumes generated from verified CareerOS evidence.", "url": "https://resume.luccote.com/", "status": "live"}, {"id": "archive", "label": "The Archive", "description": "Earlier work, production history, and creative foundations.", "url": "https://games.luccote.com/archive.html", "status": "live"}];
  const style = document.createElement('style');
  style.textContent = `.shared-site-header{position:sticky;top:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 20px;background:#0b0d12f2;border-bottom:1px solid #586174;backdrop-filter:blur(18px);font:14px/1.4 system-ui,sans-serif;color:#f4f4f5}.shared-site-name{font-weight:700}.shared-explore{position:relative;z-index:1000;margin:0;display:inline-block;font:15px/1.5 system-ui,sans-serif;color:#f4f4f5}.shared-explore summary{cursor:pointer;padding:10px 16px;border:1px solid #586174;border-radius:8px;background:#17202e}.shared-explore nav{display:flex;flex-direction:column;align-items:stretch;gap:0;position:absolute;top:100%;right:0;width:min(320px,calc(100vw - 48px));max-height:70vh;overflow:auto;background:#17202e;border:1px solid #586174;border-radius:8px;padding:8px;box-shadow:0 12px 30px #0005}.shared-explore a{display:block;padding:10px;border-radius:5px;color:#fff;text-decoration:none}.shared-explore a:hover,.shared-explore a:focus-visible{background:#30415c}.shared-explore a[aria-current=page]{outline:1px solid #8caedc}.shared-explore span{display:block;font-size:12px;color:#c7d0dc}.shared-explore strong{display:block}@media print{.shared-site-header{display:none}}
/* Shared identity proportions across the portfolio sites. */
.site-header, .topbar, .shared-site-header { position:sticky; top:0; z-index:1000; display:flex; align-items:center; justify-content:space-between; gap:16px; width:100%; height:84px; min-height:84px; margin:0; padding:0 24px; flex-wrap:nowrap; }
.site-header .brand, .topbar .brand, .shared-site-header .brand { display:flex; align-items:center; gap:11px; min-width:0; flex:0 1 290px; color:inherit; text-decoration:none; line-height:1.2; letter-spacing:.13em; }
.site-header .brandmark, .topbar .brandmark, .shared-site-header .brandmark { position:relative; display:grid; place-items:center; flex:0 0 34px; width:34px; height:34px; font-size:19px; font-weight:500; letter-spacing:0; text-indent:0; }
.site-header .brandmark::before, .topbar .brandmark::before, .shared-site-header .brandmark::before { content:""; position:absolute; inset:5px; border:1px solid currentColor; opacity:.5; transform:rotate(45deg); }
.identity-copy { min-width:0; }
.brand .identity-copy strong { display:block; font-size:13px; font-weight:500; text-transform:uppercase; white-space:nowrap; }
.brand .identity-copy small { display:block; margin-top:3px; font-size:8px; font-weight:400; letter-spacing:.18em; text-transform:uppercase; opacity:.65; white-space:nowrap; }
.site-header > nav, .topbar > nav { flex:1 1 auto; justify-content:center; margin:0; }
.site-header > details, .topbar > details, .shared-site-header > details { flex:0 0 auto; margin:0 0 0 auto; }
.site-header > details > summary, .topbar > details > summary, .shared-site-header > details > summary { display:flex; align-items:center; justify-content:center; gap:10px; box-sizing:border-box; height:42px; padding:0 16px; border-radius:0; font-size:10px; font-weight:400; line-height:1; letter-spacing:.1em; text-transform:uppercase; white-space:nowrap; }
html { scroll-padding-top:100px; }
@media(max-width:1100px) { .site-header > nav, .topbar > nav { display:none; } }
@media(max-width:680px) {
 .site-header, .topbar, .shared-site-header { height:70px; min-height:70px; gap:10px; padding:0 14px; }
 .site-header .brand, .topbar .brand, .shared-site-header .brand { gap:8px; flex-basis:auto; }
 .site-header .brandmark, .topbar .brandmark, .shared-site-header .brandmark { width:29px; height:29px; flex-basis:29px; font-size:17px; }
 .brand .identity-copy strong { font-size:10px; letter-spacing:.08em; }
 .brand .identity-copy small { display:block; font-size:7px; letter-spacing:.1em; }
 .site-header > details > summary, .topbar > details > summary, .shared-site-header > details > summary { height:36px; gap:6px; padding:0 10px; font-size:8px; }
 html { scroll-padding-top:86px; }
}
@media print { .site-header, .topbar, .shared-site-header { display:none; } }
`;
  document.head.append(style);
  const menu = document.createElement('details');menu.className='shared-explore';
  const summary=document.createElement('summary');summary.textContent='Explore work';menu.append(summary);
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Explore Luc’s work');menu.append(nav);
  const bar=document.createElement('header');bar.className='shared-site-header';const name=document.createElement('div');name.className='brand';const mark=document.createElement('span');mark.className='brandmark';mark.setAttribute('aria-hidden','true');mark.textContent='L';const copy=document.createElement('span');copy.className='identity-copy';const title=document.createElement('strong');title.textContent='LUCIEN MARCEL COTE';const subtitle=document.createElement('small');subtitle.textContent=location.hostname.startsWith('music.')?'MUSIC / SOUND':location.hostname.startsWith('resume.')?'RESUME LIBRARY':'TECH & SYSTEMS';copy.append(title,subtitle);name.append(mark,copy);bar.append(name,menu);document.body.prepend(bar);
  function render(destinations){
    const links=[];const seen=new Set();
    for(const item of destinations){
      if(item.status!=='live'||seen.has(item.id))continue;
      let url;try{url=new URL(item.url);}catch{continue;}if(url.protocol!=='https:')continue;seen.add(item.id);
      const link=document.createElement('a');link.href=url.href;
      if(url.origin===location.origin && (item.id!=='archive'||location.pathname.endsWith('/archive.html')) && !(item.id==='three-d'&&location.pathname.endsWith('/archive.html')))link.setAttribute('aria-current','page');
      const name=document.createElement('strong');name.textContent=item.label;link.append(name);
      const description=document.createElement('span');description.textContent=item.description;link.append(description);links.push(link);
    }
    if(links.length)nav.replaceChildren(...links);
  }
  render(fallback);
  document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;summary.focus();}});
  fetch('https://resume.luccote.com/generated/ecosystem.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Navigation unavailable');return response.json();}).then(data=>{if(Array.isArray(data.destinations))render(data.destinations);}).catch(()=>{});
})();
