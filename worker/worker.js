// Посредник между сайтом «Воздух» и Groq / картинками / Telegram.
// Секреты: GROQ_KEY, TG_TOKEN, TG_CHAT, ADMIN_KEY  (wrangler secret put ...)
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST,OPTIONS'};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json',...CORS}});

const PHOTO='amateur photo taken on an old smartphone, slightly blurry, harsh direct flash, uneven white balance, mundane everyday russian setting, cluttered background, imperfect framing, visible noise and compression artifacts, unflattering angle, looks like a real photo someone sent in a chat, absolutely no text or watermarks. Scene: ';
const STYLE=`Ты редактор сатирического издания «Воздух».
Пиши так, чтобы текст было не отличить от настоящей новости РИА или РБК: сухой протокольный язык, конкретные числа, проценты, даты, должности, названия ведомств и «институтов», ссылки на «источник, близкий к ситуации». Абсурд прячется в сути, а не в стиле: ни одного шутливого слова, ни одного восклицательного знака, никакой иронии в интонации. Читатель должен понять, что это шутка, только вникнув в смысл. Пишешь абсурдные новости-пранки про друзей автора — по-доброму, без оскорблений, мата, политики и намёков на преступления. Стиль серьёзного новостного агентства: сухой тон, ссылки на «источники» и «экспертов», нелепая суть. Русский язык.
Верни ТОЛЬКО JSON без markdown, строго по этой схеме:
{"title":"","lead":"","body":["",""],"quote":"","tag":"","flag":"","views":"","comments":[["",""]],"live":[["",""]]}

Пояснения к полям:
title — заголовок до 90 знаков; lead — подзаголовок одним предложением; body — 3-4 абзаца;
quote — цитата эксперта или очевидца в кавычках-ёлочках; tag — одно из: Стримы, Скандалы, Общество, Расследования;
flag — короткая плашка, например Эксклюзив; views — например "1,2 млн";
comments — от 8 до 12 пар [имя, текст]: разные люди, кто-то возмущён, кто-то шутит, кто-то не понял новость, кто-то пишет не по теме;
live — от 4 до 6 пар [время, что произошло] в формате "07:25", хроника события от раннего к позднему.`;

export default {
 async fetch(req, env) {
  if (req.method === 'OPTIONS') return new Response(null,{headers:CORS});
  const path = new URL(req.url).pathname;
  if (path.startsWith('/n/')) {
   const slug = path.slice(3).replace(/[^a-z0-9]/gi,'');
   const all = JSON.parse(await env.DB.get('news')||'[]');
   const n = all.find(x=>x.slug===slug);
   if (!n) return Response.redirect('https://vozduhnews.ru/',302);
   const url = 'https://vozduhnews.ru/article.html?n='+slug;
   const img = n.img && n.img.startsWith('http') ? n.img : new URL(req.url).origin+'/img/'+slug;
   const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>${esc(n.title)} — Воздух</title>
<meta property="og:site_name" content="Воздух"><meta property="og:type" content="article">
<meta property="og:title" content="${esc(n.title)}">
<meta property="og:description" content="${esc(n.lead||'')}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(url)}">
</head><body>Открываем новость… <a href="${esc(url)}">перейти</a></body></html>`;
   return new Response(html,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'public,max-age=300'}});
  }
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
  // предложка: Telegram шлёт сюда всё, что пишут боту
  if (path === '/tg' && req.method === 'POST') {
   const u = await req.json();
   const m = u.message || u.channel_post;
   const api = `https://api.telegram.org/bot${env.TG_TOKEN}/`;
   const send = (chat_id,text,extra={}) => fetch(api+'sendMessage',{method:'POST',headers:{'content-type':'application/json'},
     body:JSON.stringify({chat_id,text,parse_mode:'HTML',...extra})});
   if (m && m.chat && m.chat.type === 'private') {
    const from = m.from||{}, who = (from.username?'@'+from.username:'')+' '+(from.first_name||'');
    if (m.text === '/start') {
     await send(m.chat.id, 'Это бот «Воздуха» — сатирического издания, где все новости выдуманы.\n\nПришли сюда идею новости, фото или сплетню про друга — редакция посмотрит и, может быть, выпустит.\n\nКанал: @vozduhnews24\nСайт: https://vozduhnews.ru'+(env.ADMIN_ID?'':'\n\nТвой id: '+m.chat.id));
    } else {
     if (env.ADMIN_ID) {
      await fetch(api+'forwardMessage',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({chat_id:env.ADMIN_ID, from_chat_id:m.chat.id, message_id:m.message_id})});
      await send(env.ADMIN_ID, '📨 Предложка от '+esc(who)+' (id '+m.chat.id+')');
     }
     await send(m.chat.id, 'Принято. Редакция «Воздуха» изучает материал.');
    }
   }
   return json({ok:true});
  }
  if (req.method !== 'POST') return json({error:'только POST'},405);

  let b; try { b = await req.json() } catch { return json({error:'битый JSON'},400) }
  if (!env.ADMIN_KEY || b.key !== env.ADMIN_KEY) return json({error:'неверный пароль'},403);

  try {
   if (path === '/text') {
    const topic = String(b.topic||'').slice(0,300);
    if (!topic) return json({error:'пустая тема'},400);
    const pro = env.OR_KEY && b.model !== 'free';
    const r = await fetch(pro?'https://openrouter.ai/api/v1/chat/completions':'https://api.groq.com/openai/v1/chat/completions',{
     method:'POST', headers:{'content-type':'application/json',authorization:`Bearer ${pro?env.OR_KEY:env.GROQ_KEY}`},
     body:JSON.stringify({model:pro?'openai/gpt-5-mini':'openai/gpt-oss-120b',temperature:1,max_tokens:4000,response_format:{type:'json_object'},
      messages:[{role:'system',content:STYLE},{role:'user',content:'Тема новости: '+topic+'\n\nВерни все поля схемы. Обязательно заполни comments (8-12 штук) и live (4-6 строк) — без них ответ считается неполным.'}]})});
    const d = await r.json();
    if (!r.ok) return json({error:d.error?.message||'Groq не ответил'},502);
    const raw = d.choices[0].message.content.replace(/^\s*```(?:json)?|```\s*$/g,'').trim();
    return json(JSON.parse(raw));
   }

   if (path === '/image') {
    const prompt = String(b.prompt||'').slice(0,800);
    if (!prompt) return json({error:'пустое описание'},400);
    if (b.model === 'free' || !env.OR_KEY) {
     const r = await env.AI.run('@cf/black-forest-labs/flux-1-schnell',{prompt:PHOTO+prompt, steps:4});
     return json({image:'data:image/jpeg;base64,'+r.image});
    }
    return json({image: await gemini(env, [{type:'text',text:PHOTO+prompt+'. Wide 16:9 frame.'}])});
   }

   if (path === '/edit') {           // фото пользователя + правка, детали сохраняются
    const {image='', prompt='', strength=0.4} = b;
    if (!image.startsWith('data:')) return json({error:'нужна картинка'},400);
    if (!env.OR_KEY) return json({error:'нет ключа OpenRouter'},400);
    const keep = Number(strength) < 0.5
      ? 'Make only a subtle change, keep almost everything as is.'
      : Number(strength) > 0.75 ? 'You may restage the scene, but the same person must stay recognisable.'
      : 'Change what is asked, keep the rest of the frame intact.';
    const task = `Edit this photograph. ${keep}
Keep the same person: face, hair, body and clothing details must stay recognisable. Keep the same room, lighting direction and camera angle unless the instruction says otherwise.
Preserve fine detail and texture — no smoothing, no beautifying, no plastic skin, no added text or watermarks. It must still look like an ordinary photo taken on a phone.
Instruction: ${prompt||'make it look like a candid news photo'}`;
    return json({image: await gemini(env, [{type:'text',text:task},{type:'image_url',image_url:{url:image}}])});
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
    return json({ok:true, slug:x.slug, url:(b.site||'')+'article.html?n='+x.slug, short:API_SELF(req)+'/n/'+x.slug});
   }

   if (path === '/delete') {
    const all = JSON.parse(await env.DB.get('news')||'[]');
    await env.DB.put('news', JSON.stringify(all.filter(n=>n.slug!==b.slug)));
    return json({ok:true});
   }

   if (path === '/post') {
    const {title='',lead='',url='',image=''} = b;
    const ICON = {'Стримы':'🎥','Скандалы':'🔥','Общество':'🏛','Расследования':'🔎'};
    const meta = [b.tag ? `${ICON[b.tag]||'📰'} ${esc(b.tag)}` : '', b.views ? `👁 ${esc(b.views)}` : '']
      .filter(Boolean).join('  ·  ');
    const caption = `<b>${esc(title)}</b>\n\n`
      + `${esc(lead)}\n\n`
      + (meta ? `<i>${meta}</i>\n\n` : '')
      + `📖 <a href="${esc(url)}">Читать полностью</a>   ·   💬 <a href="https://t.me/vozduhnews_bot">Предложить новость</a>`;
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
async function gemini(env, content){
 const r = await fetch('https://openrouter.ai/api/v1/chat/completions',{
  method:'POST', headers:{'content-type':'application/json',authorization:`Bearer ${env.OR_KEY}`},
  body:JSON.stringify({model:'google/gemini-2.5-flash-image',modalities:['image','text'],messages:[{role:'user',content}]})});
 const d = await r.json();
 const im = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
 if (!im) throw new Error(d.error?.message || 'модель не вернула картинку');
 return im;
}
const API_SELF = req => new URL(req.url).origin;
const esc = s => String(s).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
