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
<nav><a href="./">Главное</a><a href="section.html?t=Стримы">Стримы</a><a href="section.html?t=Скандалы">Скандалы</a><a href="section.html?t=Общество">Общество</a><a href="efir.html">Эфир</a><a href="make.html">Создать новость</a></nav>
<a class="tgbtn" href="${tgLink}" target="_blank">Подписаться${TG?'':' (скоро)'}</a></div>
<div class="ticker"><b>Срочно</b><div>${[...NEWS,...NEWS].map(n=>`<span>${esc(n.title)}</span>`).join('')}</div></div></header>`);
document.body.insertAdjacentHTML('beforeend',`<footer><div class="wrap">
<div><a class="logo" href="./">ВОЗ<span>ДУХ</span></a><p style="max-width:380px">Сатирическое издание. Все новости выдуманы, совпадения случайны.</p></div>
<div><b style="color:#fff">Разделы</b><br><a href="section.html?t=Стримы">Стримы</a> · <a href="section.html?t=Общество">Общество</a> · <a href="efir.html">Эфир</a><br><br>
<a class="tgbtn" href="${tgLink}" target="_blank">Мы в Telegram</a></div></div></footer><div class="toast"></div>`);

let n=184312;setInterval(()=>$('#v').textContent=(n+=Math.floor(Math.random()*40-12)).toLocaleString('ru'),1500);
const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('on')),{threshold:.1});
const watch=()=>{$$('.reveal:not(.on)').forEach(el=>io.observe(el));setTimeout(()=>$$('.reveal').forEach(el=>innerHeight>el.getBoundingClientRect().top&&el.classList.add('on')),300)};
addEventListener('scroll',()=>{const h=document.documentElement;$('#progress').style.width=h.scrollTop/(h.scrollHeight-h.clientHeight||1)*100+'%'});
const toast=t=>{const e=$('.toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),1800)};

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
