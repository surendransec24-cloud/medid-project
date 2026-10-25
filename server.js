require('dotenv').config();
const express=require('express'),path=require('path'),E=process.env;
const app=express();app.use(express.json({limit:'10kb'}));
app.use(express.static(path.join(__dirname,'public')));
let last=0;
const clean=s=>String(s||'').replace(/[\r\n]+/g,' ').slice(0,120);
function text(b){
  if(b.cancel)return `✅ MedID: ${clean(b.name)} cancelled the SOS alert (false alarm).`;
  const l=b.loc&&isFinite(b.loc.lat)&&isFinite(b.loc.lng)?`https://www.openstreetmap.org/?mlat=${b.loc.lat}&mlon=${b.loc.lng}#map=16/${b.loc.lat}/${b.loc.lng}`:'Location unavailable';
  return `🚨 MedID SOS: ${clean(b.name)} needs help!\nBlood group: ${clean(b.blood)||'?'} | Allergies: ${clean(b.allergies)||'none listed'}\nLocation: ${l}`;
}
function mapLink(b){return b.loc&&isFinite(b.loc.lat)&&isFinite(b.loc.lng)?`https://www.openstreetmap.org/?mlat=${b.loc.lat}&mlon=${b.loc.lng}#map=16/${b.loc.lat}/${b.loc.lng}`:null}
async function telegram(t){
  if(!E.TELEGRAM_BOT_TOKEN||!E.TELEGRAM_CHAT_IDS)return null;
  const ids=E.TELEGRAM_CHAT_IDS.split(',').map(s=>s.trim()).filter(Boolean);let ok=0,bad=[];
  for(const id of ids){const r=await fetch(`https://api.telegram.org/bot${E.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:id,text:t})});
    if(r.ok)ok++;else bad.push(id+': '+((await r.json().catch(()=>({}))).description||r.status));}
  return{channel:'Telegram',ok:ok>0&&!bad.length,detail:`${ok}/${ids.length} delivered to Telegram API`+(bad.length?' — '+bad.join('; '):'')};
}
async function ntfy(t,link){
  if(!E.NTFY_TOPIC)return null;
  const r=await fetch('https://ntfy.sh/'+encodeURIComponent(E.NTFY_TOPIC),{method:'POST',body:t,headers:{Title:'MedID SOS',Priority:'urgent',Tags:'rotating_light',...(link?{Click:link,Actions:'view, Open map, '+link}:{})}});
  return{channel:'ntfy push',ok:r.ok,detail:r.ok?'Published to topic "'+E.NTFY_TOPIC+'"':'HTTP '+r.status};
}
async function sms(t,phones){
  if(!E.TWILIO_ACCOUNT_SID||!E.TWILIO_AUTH_TOKEN||!E.TWILIO_FROM)return null;
  const list=[...new Set(phones)].filter(p=>/^\+\d{8,15}$/.test(p)).slice(0,5);
  if(!list.length)return{channel:'SMS',ok:false,detail:'No valid numbers (use +countrycode format, e.g. +919000000000)'};
  let ok=0,bad=[];
  for(const to of list){const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${E.TWILIO_ACCOUNT_SID}/Messages.json`,{method:'POST',
    headers:{Authorization:'Basic '+Buffer.from(E.TWILIO_ACCOUNT_SID+':'+E.TWILIO_AUTH_TOKEN).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({To:to,From:E.TWILIO_FROM,Body:t})});
    if(r.ok)ok++;else bad.push(to+': '+((await r.json().catch(()=>({}))).message||r.status));}
  return{channel:'SMS (Twilio)',ok:ok===list.length,detail:`${ok}/${list.length} accepted by Twilio`+(bad.length?' — '+bad.join('; '):'')};
}
app.get('/api/config',(q,s)=>s.json({telegram:!!E.TELEGRAM_BOT_TOKEN,ntfy:!!E.NTFY_TOPIC,sms:!!E.TWILIO_ACCOUNT_SID}));
app.post('/api/sos',async(req,res)=>{
  const b=req.body||{};
  if(!b.name)return res.status(400).json({error:'Name missing'});
  if(Date.now()-last<5000)return res.status(429).json({error:'Please wait a few seconds between alerts'});
  last=Date.now();
  const t=text(b),phones=Array.isArray(b.phones)?b.phones.map(String):[];
  const out=[];
  for(const f of [()=>telegram(t),()=>ntfy(t,mapLink(b)),()=>sms(t,phones)]){
    try{const r=await f();if(r)out.push(r)}catch(e){out.push({channel:'error',ok:false,detail:e.message})}
  }
  if(!out.length)return res.status(503).json({error:'No notification channel configured. Fill in .env and restart the server.'});
  res.json({results:out});
});
app.listen(E.PORT||3000,()=>console.log('MedID running at http://localhost:'+(E.PORT||3000)));
