// Посредник между сайтом «Воздух» и Groq / картинками / Telegram.
// Секреты: GROQ_KEY, TG_TOKEN, TG_CHAT, ADMIN_KEY  (wrangler secret put ...)
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST,OPTIONS'};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json',...CORS}});

const STYLE=`Ты редактор сатирического издания «Воздух». Пишешь абсурдные новости-пранки про друзей автора — по-доброму, без оскорблений, мата, политики и намёков на преступления. Стиль серьёзного новостного агентства: сухой тон, ссылки на «источники» и «экспертов», нелепая суть. Русский язык.
Верни ТОЛЬКО JSON без markdown:
{"title":"заголовок до 90 знаков","lead":"подзаголовок одним предложением","body":["абзац","абзац","абзац"],"quote":"цитата эксперта или очевидца в кавычках-ёлочках","tag":"Стримы|Скандалы|Общество|Расследования","flag":"короткая плашка, например Эксклюзив","views":"например 1,2 млн","comments":[["имя","комментарий"],["имя","комментарий"],["имя","комментарий"]]}`;

export default {
 async fetch(req, env) {
  if (req.method === 'OPTIONS') return new Response(null,{headers:CORS});
  const path = new URL(req.url).pathname;
  if (req.method !== 'POST') return json({error:'только POST'},405);

  let b; try { b = await req.json() } catch { return json({error:'битый JSON'},400) }
  if (!env.ADMIN_KEY || b.key !== env.ADMIN_KEY) return json({error:'неверный пароль'},403);

  try {
   if (path === '/text') {
    const topic = String(b.topic||'').slice(0,300);
    if (!topic) return json({error:'пустая тема'},400);
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
     method:'POST', headers:{'content-type':'application/json',authorization:`Bearer ${env.GROQ_KEY}`},
     body:JSON.stringify({model:'llama-3.3-70b-versatile',temperature:1,response_format:{type:'json_object'},
      messages:[{role:'system',content:STYLE},{role:'user',content:'Тема новости: '+topic}]})});
    const d = await r.json();
    if (!r.ok) return json({error:d.error?.message||'Groq не ответил'},502);
    return json(JSON.parse(d.choices[0].message.content));
   }

   if (path === '/image') {
    const prompt = String(b.prompt||'').slice(0,500);
    if (!prompt) return json({error:'пустое описание'},400);
    const r = await env.AI.run('@cf/black-forest-labs/flux-1-schnell',
      {prompt:'news photograph, photorealistic, 16:9, '+prompt, steps:4});
    return json({image:'data:image/jpeg;base64,'+r.image});
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
const esc = s => String(s).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
