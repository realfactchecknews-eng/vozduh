const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
const get=(k,d)=>new URLSearchParams(location.search).get(k)||d;
const tgLink=TG?`https://t.me/${TG}`:'#';

// ---- шапка и подвал на всех страницах
document.body.insertAdjacentHTML('afterbegin',`<div id="progress"></div>
<div class="top"><span>${new Date().toLocaleDateString('ru',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
<span>USD <b>82,4</b> <span class="up">▲</span> · EUR <b>95,1</b> <span class="dn">▼</span> · Москва <b>+14°</b></span>
<span>👁 <b id="v">184 312</b> читают сейчас</span></div>
<header><div class="bar"><a class="logo" href="./"><i></i>ВОЗ<span>ДУХ</span></a>
<nav><a href="./">Главное</a><a href="section.html?t=Стримы">Стримы</a><a href="section.html?t=Скандалы">Скандалы</a><a href="section.html?t=Общество">Общество</a><a href="efir.html">Эфир</a></nav>
<a class="tgbtn" href="${tgLink}" target="_blank">Подписаться${TG?'':' (скоро)'}</a></div>
<div class="ticker"><b>Срочно</b><div>${[...NEWS,...NEWS].map(n=>`<span>${esc(n.title)}</span>`).join('')}</div></div></header>`);
document.body.insertAdjacentHTML('beforeend',`<footer><div class="wrap">
<div><a class="logo" href="./">ВОЗ<span>ДУХ</span></a><p style="max-width:380px">Сатирическое издание. Все новости, цитаты, эксперты, цифры и фотографии выдуманы. <a href="terms.html">Подробнее</a></p></div>
<div><b style="color:#fff">Разделы</b><br><a href="section.html?t=Стримы">Стримы</a> · <a href="section.html?t=Общество">Общество</a> · <a href="efir.html">Эфир</a><br>
<a href="terms.html">Пользовательское соглашение</a><br><br>
<a class="tgbtn" href="${tgLink}" target="_blank">Мы в Telegram</a></div></div></footer><div class="toast"></div>`);

let n=184312;setInterval(()=>$('#v').textContent=(n+=Math.floor(Math.random()*40-12)).toLocaleString('ru'),1500);
const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('on')),{threshold:.1});
const watch=()=>{$$('.reveal:not(.on)').forEach(el=>io.observe(el));setTimeout(()=>$$('.reveal').forEach(el=>innerHeight>el.getBoundingClientRect().top&&el.classList.add('on')),300)};
addEventListener('scroll',()=>{const h=document.documentElement;$('#progress').style.width=h.scrollTop/(h.scrollHeight-h.clientHeight||1)*100+'%'});
const toast=t=>{const e=$('.toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),1800)};

// новости из хранилища Worker + статичные
const tick=()=>{const t=document.querySelector('.ticker div');
 if(t)t.innerHTML=[...NEWS,...NEWS].slice(0,16).map(n=>`<span>${esc(n.title)}</span>`).join('')};
const ready = fetch(API+'/list').then(r=>r.json()).then(l=>{if(Array.isArray(l))NEWS.unshift(...l);tick()}).catch(()=>{});

// ужать фото до 1024 точек перед отправкой в модель — дешевле и быстрее
function shrink(src,max=1024){return new Promise(r=>{const im=new Image();im.crossOrigin='anonymous';
 im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height));
  if(k===1&&src.length<900000)return r(src);
  const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.85))};
 im.onerror=()=>r(src);im.src=src})}

// обложка в едином стиле: фото + затемнение, плашка ВОЗДУХ, LIVE и заголовок
function cover(src,title,cb){const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{
 const W=1600,H=900,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 const k=Math.max(W/im.width,H/im.height);g.drawImage(im,(W-im.width*k)/2,(H-im.height*k)/2,im.width*k,im.height*k);
 const gr=g.createLinearGradient(0,H*.35,0,H);gr.addColorStop(0,'rgba(10,19,32,0)');gr.addColorStop(1,'rgba(10,19,32,.92)');
 g.fillStyle=gr;g.fillRect(0,0,W,H);
 g.fillStyle='#e0162b';g.fillRect(48,48,132,52);g.fillStyle='#fff';g.font='800 30px Inter,system-ui';g.fillText('● LIVE',62,85);
 g.font='900 38px Inter,Arial Black,system-ui';
 const w1=g.measureText('ВОЗ').width;
 g.fillStyle='#fff';g.fillText('ВОЗ',48,H-46);g.fillStyle='#4b93ff';g.fillText('ДУХ',48+w1,H-46);
 g.font='600 22px Inter,system-ui';g.fillStyle='rgba(255,255,255,.6)';g.textAlign='right';
 g.fillText('vozduhnews.ru',W-48,H-46);g.textAlign='left';
 g.fillStyle='#fff';g.font='900 56px Inter,system-ui';
 const words=String(title).split(' ');let line='',y=H-150;const lines=[];
 words.forEach(wd=>{const t=line?line+' '+wd:wd;if(g.measureText(t).width>W-96){lines.push(line);line=wd}else line=t});
 lines.push(line);lines.slice(-3).forEach((l,i,a)=>g.fillText(l,48,y-(a.length-1-i)*66));
 cb(c.toDataURL('image/jpeg',.88))};im.onerror=()=>cb(src);im.src=src}

const card=(x,big)=>`<a class="${big?'hero':'card'} reveal" href="article.html?n=${x.slug}">
${x.img?`<div class="pic"><img src="${x.img}" alt="" loading="lazy"></div>`:''}
<span class="tag${x.flag?' red':''}" style="margin-top:12px">${esc(x.flag||x.tag)}</span>
<${big?'h2':'h3'}>${esc(x.title)}</${big?'h2':'h3'}><p>${esc(x.lead)}</p>
<div class="meta"><span>${esc(x.tag)}</span><span>${esc(x.time)}</span><span>👁 ${esc(x.views||'')}</span></div></a>`;

// ---- реакции и комментарии
function reacts(list){return `<div class="reacts reveal">${list.map(([e,c])=>`<button data-n="${c}">${e} <b>${c>=1000?(c/1000).toFixed(1).replace('.',',')+'K':c}</b></button>`).join('')}</div>`}
function comments(slug,seed){
  const mine=JSON.parse(localStorage.getItem('c_'+slug)||'[]');
  const all=[...seed.map(([a,t])=>({a,t})),...mine];
  return `<section class="comments reveal"><div class="sect">Комментарии <span style="color:var(--m)">${all.length}</span></div>
  ${all.map(c=>`<div class="cm"><div class="av">${esc(c.a[0]||'?')}</div><div><b>${esc(c.a)}</b><p>${esc(c.t)}</p></div></div>`).join('')}
  <form class="cform"><input name="a" placeholder="Ваше имя" maxlength="30" required><textarea name="t" placeholder="Ваш комментарий" maxlength="400" required rows="3"></textarea><button>Отправить</button></form></section>`;
}
function wire(slug){
  $$('.reacts button').forEach(b=>b.onclick=()=>{const on=b.classList.toggle('me'),c=+b.dataset.n+(on?1:0);b.querySelector('b').textContent=c>=1000?(c/1000).toFixed(1).replace('.',',')+'K':c});
  const f=$('.cform');f&&(f.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));if(!d.a.trim()||!d.t.trim())return;
    const k='c_'+slug,m=JSON.parse(localStorage.getItem(k)||'[]');m.push({a:d.a,t:d.t});localStorage.setItem(k,JSON.stringify(m));
    f.insertAdjacentHTML('beforebegin',`<div class="cm"><div class="av">${esc(d.a[0])}</div><div><b>${esc(d.a)}</b><p>${esc(d.t)}</p></div></div>`);f.reset();toast('Комментарий добавлен')});
  const c=$('#copy');c&&(c.onclick=()=>navigator.clipboard.writeText(location.href).then(()=>toast('Ссылка скопирована')));
  const t=$('#tg');t&&(t.href='https://t.me/share/url?url='+encodeURIComponent(location.href)+'&text='+encodeURIComponent(document.title));
}
