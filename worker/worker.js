// Посредник между сайтом «Воздух» и Groq / картинками / Telegram.
// Секреты: GROQ_KEY, TG_TOKEN, TG_CHAT, ADMIN_KEY  (wrangler secret put ...)
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST,OPTIONS'};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json',...CORS}});

const PHOTO='editorial news photograph, photojournalism, natural daylight, shallow depth of field, muted cool blue tones, slight film grain, candid unposed moment, 16:9 wide shot, no text, no logos, no captions. Scene: ';
const STYLE=`Ты редактор сатирического издания «Воздух». Пишешь абсурдные новости-пранки про друзей автора — по-доброму, без оскорблений, мата, политики и намёков на преступления. Стиль серьёзного новостного агентства: сухой тон, ссылки на «источники» и «экспертов», нелепая суть. Русский язык.
Верни ТОЛЬКО JSON без markdown:
{"title":"заголовок до 90 знаков","lead":"подзаголовок одним предложением","body":["абзац","абзац","абзац"],"quote":"цитата эксперта или очевидца в кавычках-ёлочках","tag":"Стримы|Скандалы|Общество|Расследования","flag":"короткая плашка, например Эксклюзив","views":"например 1,2 млн","comments":[["имя","комментарий"],["имя","комментарий"],["имя","комментарий"]]}`;

export default {
 async fetch(req, env) {
  if (req.method === 'OPTIONS') return new Response(null,{headers:CORS});
  const path = new URL(req.url).pathname;
  if (path.startsWith('/img/')) {
   const d = await env.DB.get('img_'+path.slice(5));
   if (!d) return new Response('нет картинки',{status:404,headers:CORS});
   const bin = Uint8Array.from(atob(d.split(',')[1]), c=>c.charCodeAt(0));
   return new Response(bin,{headers:{'content-type':'image/jpeg','cache-control':'public,max-age=31536000',...CORS}});
  }
  if (path === '/list') {
   const raw = await env.DB.get('news');
   return new Response(raw||'[]',{headers:{'content-type':'application/json','cache-control':'no-store',...CORS}});
  }
  if (req.method !== 'POST') return json({error:'только POST'},405);

  let b; try { b = await req.json() } catch { return json({error:'битый JSON'},400) }
  if (!env.ADMIN_KEY || b.key !== env.ADMIN_KEY) return json({error:'неверный пароль'},403);

  try {
   if (path === '/text') {
    const topic = String(b.topic||'').slice(0,300);
    if (!topic) return json({error:'пустая тема'},400);
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
     method:'POST', headers:{'content-type':'application/json',authorization:`Bearer ${env.GROQ_KEY}`},
     body:JSON.stringify({model:'openai/gpt-oss-120b',temperature:1,response_format:{type:'json_object'},
      messages:[{role:'system',content:STYLE},{role:'user',content:'Тема новости: '+topic}]})});
    const d = await r.json();
    if (!r.ok) return json({error:d.error?.message||'Groq не ответил'},502);
    return json(JSON.parse(d.choices[0].message.content));
   }

   if (path === '/image') {
    const prompt = String(b.prompt||'').slice(0,500);
    if (!prompt) return json({error:'пустое описание'},400);
    const r = await env.AI.run('@cf/black-forest-labs/flux-1-schnell',
      {prompt:PHOTO+prompt, steps:4});
    return json({image:'data:image/jpeg;base64,'+r.image});
   }

   if (path === '/save') {
    const x = b.news||{};
    if (!x.title) return json({error:'нет заголовка'},400);
    x.slug = 'n'+Date.now().toString(36);
    x.time = new Date().toLocaleString('ru',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'});
    x.date = new Date().toISOString();
    if (x.img && x.img.startsWith('data:')) {            // картинку кладём отдельно
     await env.DB.put('img_'+x.slug, x.img);
     x.img = API_SELF(req)+'/img/'+x.slug;
    }
    const all = JSON.parse(await env.DB.get('news')||'[]');
    all.unshift(x);
    await env.DB.put('news', JSON.stringify(all.slice(0,60)));
    return json({ok:true, slug:x.slug, url:(b.site||'')+'article.html?n='+x.slug});
   }

   if (path === '/delete') {
    const all = JSON.parse(await env.DB.get('news')||'[]');
    await env.DB.put('news', JSON.stringify(all.filter(n=>n.slug!==b.slug)));
    return json({ok:true});
   }

   if (path === '/post') {
    const {title='',lead='',url='',image=''} = b;
    const caption = `<b>${esc(title)}</b>\n\n${esc(lead)}\n\n${esc(url)}`;
    const api = `https://api.telegram.org/bot${env.TG_TOKEN}/`;
    let res;
    if (image.startsWith('data:')) {
     const bin = Uint8Array.from(atob(image.split(',')[1]), c=>c.charCodeAt(0));
     const fd = new FormData();
     fd.append('chat_id',env.TG_CHAT); fd.append('caption',caption); fd.append('parse_mode','HTML');
     fd.append('photo', new Blob([bin],{type:'image/jpeg'}), 'cover.jpg');
     res = await fetch(api+'sendPhoto',{method:'POST',body:fd});
    } else {
     res = await fetch(api+(image?'sendPhoto':'sendMessage'),{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(image?{chat_id:env.TG_CHAT,photo:image,caption,parse_mode:'HTML'}
                               :{chat_id:env.TG_CHAT,text:caption,parse_mode:'HTML'})});
    }
    const d = await res.json();
    return d.ok ? json({ok:true}) : json({error:d.description||'Telegram отказал'},502);
   }
   return json({error:'нет такого пути'},404);
  } catch(e) { return json({error:String(e)},500) }
 }
};
const API_SELF = req => new URL(req.url).origin;
const esc = s => String(s).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
