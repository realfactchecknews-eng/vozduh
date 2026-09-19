const $=s=>document.querySelector(s);
const fmt=new Date().toLocaleDateString('ru',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
$('#d')&&($('#d').textContent=fmt);
let n=184312;setInterval(()=>$('#v')&&($('#v').textContent=(n+=Math.floor(Math.random()*40-12)).toLocaleString('ru')),1500);
const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('on')),{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const p=$('#progress');p&&addEventListener('scroll',()=>{const h=document.documentElement;p.style.width=h.scrollTop/(h.scrollHeight-h.clientHeight)*100+'%'});
function toast(t){const e=$('.toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),1800)}
$('#copy')&&($('#copy').onclick=()=>navigator.clipboard.writeText(location.href).then(()=>toast('Ссылка скопирована')));
$('#tg')&&($('#tg').href='https://t.me/share/url?url='+encodeURIComponent(location.href)+'&text='+encodeURIComponent(document.title));
document.querySelectorAll('.reacts button').forEach(b=>b.onclick=()=>{const on=b.classList.toggle('me'),s=b.querySelector('s');s.textContent=+s.dataset.n+(on?1:0)>=1000?((+s.dataset.n+(on?1:0))/1000).toFixed(1).replace('.',',')+'K':+s.dataset.n+(on?1:0)});
