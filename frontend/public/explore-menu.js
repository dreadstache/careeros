(() => {
  if (document.querySelector('.work-switcher, .workSwitcher, .ecosystem-switcher, .shared-explore')) return;
  const fallback = [{"id": "tech", "label": "Tech & Systems", "description": "Analytics, GIS, software, automation, and systems work.", "url": "https://www.luccote.com/", "status": "live"}, {"id": "three-d", "label": "Games, Film & 3D", "description": "Interactive models, game development, technical art, and film work.", "url": "https://games.luccote.com/", "status": "live"}, {"id": "music", "label": "Music", "description": "Dreadstache releases, production, performance, and sonic experiments.", "url": "https://music.luccote.com/", "status": "live"}, {"id": "resumes", "label": "Résumé Library", "description": "Focused résumés generated from verified CareerOS evidence.", "url": "https://resume.luccote.com/", "status": "live"}, {"id": "archive", "label": "The Archive", "description": "Earlier work, production history, and creative foundations.", "url": "https://games.luccote.com/archive.html", "status": "live"}];
  const style = document.createElement('style');
  style.textContent = `.shared-explore{position:relative;z-index:1000;margin:16px;display:inline-block;font:15px/1.5 system-ui,sans-serif;color:#f4f4f5}.shared-explore summary{cursor:pointer;padding:10px 16px;border:1px solid #586174;border-radius:8px;background:#17202e}.shared-explore nav{position:absolute;top:100%;left:0;width:min(320px,calc(100vw - 48px));max-height:70vh;overflow:auto;background:#17202e;border:1px solid #586174;border-radius:8px;padding:8px;box-shadow:0 12px 30px #0005}.shared-explore a{display:block;padding:10px;border-radius:5px;color:#fff;text-decoration:none}.shared-explore a:hover,.shared-explore a:focus-visible{background:#30415c}.shared-explore a[aria-current=page]{outline:1px solid #8caedc}.shared-explore span{display:block;font-size:12px;color:#c7d0dc}.shared-explore strong{display:block}@media print{.shared-explore{display:none}}`;
  document.head.append(style);
  const menu = document.createElement('details');menu.className='shared-explore';
  const summary=document.createElement('summary');summary.textContent='Explore work';menu.append(summary);
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Explore Luc’s work');menu.append(nav);
  const host=document.querySelector('header') || document.querySelector('main') || document.body;host.prepend(menu);
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
