/* Coach Dale — Kyle-style Monday–Sunday weekly availability PNG
   Original Coach Dale PNG branding, Alpine Elite palette, privacy-safe statuses.
   Source of truth: public.dale_unavailable_hours for the selected week. */
(() => {
"use strict";

const START=10,END=22,DAYS=["MON","TUE","WED","THU","FRI","SAT","SUN"];
const COLOR={
 bg:"#102F28",deep:"#0D281F",panel:"#173F35",header:"#1D4838",bronze:"#BD8D64",
 lightBronze:"#E3C09F",ivory:"#F5F1E8",muted:"#AFC6B6",line:"#42624F",
 availableBg:"#1A503B",availableText:"#C7EED6",
 bookedBg:"#60382E",bookedText:"#FFD3C3",
 offBg:"#655039",offText:"#F2D29E",
 pastBg:"#23362E",pastText:"#82978A"
};
const $=id=>document.getElementById(id);
const db=window.supabase?.createClient("https://mjsoffmcekzhenuyfzud.supabase.co",window.DALE_SUPABASE_KEY);
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join("-");
function parseISO(value){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
 if(!m)return null;
 const d=new Date(+m[1],+m[2]-1,+m[3],12);
 return ymd(d)===value?d:null;
}
function addDays(date,n){
 const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);
 d.setDate(d.getDate()+n);
 return d;
}
function mondayOf(date){
 const d=addDays(date,0);
 return addDays(d,-((d.getDay()+6)%7));
}
function manilaNow(){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
 const m=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,Number(p.value)]));
 return {day:[m.year,pad(m.month),pad(m.day)].join("-"),hour:m.hour,
 date:new Date(m.year,m.month-1,m.day,12)};
}
const hourName=h=>(h%12||12)+":00 "+(h<12?"AM":"PM");
const hourRange=h=>hourName(h)+" – "+hourName(h+1);
const shortDate=d=>d.toLocaleDateString("en-PH",{month:"short",day:"numeric"});
function rangeText(a,b){
 const start=a.toLocaleDateString("en-PH",{month:"long",day:"numeric"});
 const end=b.toLocaleDateString("en-PH",{month:"long",day:"numeric",year:"numeric"});
 return start+" – "+end;
}
const cache=new Map();
let state={monday:null,sunday:null,rows:[],blob:null,busy:false,
 counts:{available:0,booked:0,unavailable:0,past:0}};

function statusMap(rows){
 const m=new Map();
 for(const r of rows||[]){
  const h=Number(r.hour),reason=r.reason;
  if(!Number.isInteger(h)||h<START||h>=END)continue;
  if(reason!=="confirmed"&&reason!=="blocked")continue;
  const key=r.session_date+"|"+h;
  if(reason==="confirmed"||!m.has(key))m.set(key,reason);
 }
 return m;
}
function slotStatus(map,date,h,now=manilaNow()){
 const value=map.get(date+"|"+h);
 if(value==="confirmed")return "booked";
 if(value==="blocked")return "unavailable";
 if(date<now.day||(date===now.day&&h<=now.hour))return "past";
 return "available";
}
function buildGrid(rows,week=state.monday,now=manilaNow()){
 const map=statusMap(rows),counts={available:0,booked:0,unavailable:0,past:0};
 const grid=[];
 for(let h=START;h<END;h++){
  const cells=[];
  for(let d=0;d<7;d++){
   const date=ymd(addDays(week,d));
   const status=slotStatus(map,date,h,now);
   counts[status]++;
   cells.push({date,hour:h,status});
  }
  grid.push({hour:h,cells});
 }
 return {grid,counts};
}

function setWeek(date){
 const m=mondayOf(date);
 state.monday=m;state.sunday=addDays(m,6);
 const field=$("weeklyStart");
 if(field)field.value=ymd(m);
 const label=$("weeklyRange");
 if(label)label.textContent="Monday–Sunday · "+rangeText(m,state.sunday);
 const info=$("weeklySummary");
 if(info)info.textContent="Selected: "+rangeText(m,state.sunday)+" · Generate to refresh live availability.";
}
function shiftWeek(n){
 const current=state.monday||mondayOf(manilaNow().date);
 setWeek(addDays(current,n*7));
}
function toast(message,isError=false){
 const node=$("weeklyToast");
 if(!node)return;
 node.textContent=message;node.hidden=!message;node.classList.toggle("is-error",isError);
}
function setBusy(value){
 state.busy=value;
 const b=$("generateWeeklySchedule");
 if(b){b.disabled=value;b.textContent=value?"GENERATING LIVE SCHEDULE…":"GENERATE WEEKLY CARD";}
}
async function fetchSelectedWeek(){
 if(!db)throw new Error("Booking service unavailable. Refresh the admin page.");
 const user=await db.auth.getUser();
 if(user.error||!user.data?.user)throw new Error("Please sign in as Coach Dale to view schedules.");
 const admin=await db.from("dale_admin_users").select("user_id").eq("user_id",user.data.user.id).maybeSingle();
 if(admin.error||!admin.data)throw new Error("This account is not authorized to generate a coaching schedule.");
 const q=await db.from("dale_unavailable_hours").select("session_date,hour,reason")
  .gte("session_date",ymd(state.monday)).lte("session_date",ymd(state.sunday))
  .order("session_date").order("hour").limit(500);
 if(q.error)throw new Error("Could not load schedule: "+q.error.message);
 return q.data||[];
}
function rounded(ctx,x,y,w,h,r){
 ctx.beginPath();
 if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
 else{ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);}
 ctx.closePath();
}
function paintRect(ctx,x,y,w,h,fill,r=0){
 ctx.fillStyle=fill;
 if(r){rounded(ctx,x,y,w,h,r);ctx.fill();}else ctx.fillRect(x,y,w,h);
}
async function loadBrand(src){
 if(cache.has(src))return cache.get(src);
 const task=new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(new Error("Brand PNG did not load: "+src));
  image.src=src;
 });
 cache.set(src,task);
 return task;
}
function drawContained(ctx,img,x,y,w,h){
 const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
 const scale=Math.min(w/iw,h/ih);
 const nw=iw*scale,nh=ih*scale;
 ctx.drawImage(img,x+(w-nw)/2,y+(h-nh)/2,nw,nh);
}
function dot(ctx,x,y,color,r=7){
 ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
async function paint(rows){
 const canvas=$("weeklyScheduleCanvas");
 if(!canvas)throw new Error("Schedule preview is missing.");
 const ctx=canvas.getContext("2d");
 if(!ctx)throw new Error("Canvas is not supported by this browser.");
 canvas.width=1800;canvas.height=1350;
 const W=1800,H=1350;
 paintRect(ctx,0,0,W,H,COLOR.deep);
 const glow=ctx.createLinearGradient(0,0,1100,760);
 glow.addColorStop(0,"rgba(189,141,100,.20)");
 glow.addColorStop(.62,"rgba(189,141,100,.015)");
 glow.addColorStop(1,"rgba(189,141,100,0)");
 paintRect(ctx,0,0,1150,830,glow);
 paintRect(ctx,0,0,W,14,COLOR.bronze);

 const brands=await Promise.allSettled([
  loadBrand("assets/branding/coach-dale-main-logo.png"),
  loadBrand("assets/branding/coach-dale-wordmark.png")
 ]);
 if(brands[0].status==="fulfilled")drawContained(ctx,brands[0].value,70,27,125,122);
 if(brands[1].status==="fulfilled")drawContained(ctx,brands[1].value,212,41,380,91);
 if(brands.some(x=>x.status==="rejected"))console.warn("One Coach Dale PNG could not load; card text remains available.");
 ctx.textAlign="left";
 ctx.fillStyle=COLOR.ivory;
 ctx.font='800 61px "Plus Jakarta Sans",Arial,sans-serif';
 ctx.fillText("WEEKLY COACHING AVAILABILITY",70,211);
 ctx.fillStyle=COLOR.lightBronze;
 ctx.font='800 24px "DM Sans",Arial,sans-serif';
 ctx.fillText("MONDAY – SUNDAY  •  "+rangeText(state.monday,state.sunday).toUpperCase(),71,251);
 ctx.fillStyle=COLOR.muted;
 ctx.font='600 19px "DM Sans",Arial,sans-serif';
 ctx.fillText("Santiago City  •  Coaching hours 10:00 AM – 10:00 PM",71,288);

 const {grid,counts}=buildGrid(rows,state.monday,manilaNow());
 state.counts=counts;
 const left=70,top=320,totalW=1660,timeW=240,dayW=(totalW-timeW)/7;
 const headerH=75,rowH=67;
 const tableHeight=headerH+(END-START)*rowH;
 paintRect(ctx,left,top,totalW,tableHeight,COLOR.panel,14);
 ctx.strokeStyle=COLOR.line;ctx.lineWidth=2;
 rounded(ctx,left,top,totalW,tableHeight,14);ctx.stroke();

 paintRect(ctx,left,top,timeW,headerH,"#1D3D30");
 ctx.textAlign="center";
 ctx.fillStyle=COLOR.muted;ctx.font='800 19px "DM Sans",Arial';
 ctx.fillText("TIME",left+timeW/2,top+47);
 for(let d=0;d<7;d++){
  const date=addDays(state.monday,d);
  const x=left+timeW+d*dayW;
  paintRect(ctx,x,top,dayW,headerH,d%2?"#1C4637":"#204B3B");
  ctx.fillStyle=COLOR.lightBronze;ctx.font='900 23px "Plus Jakarta Sans",Arial';
  ctx.fillText(DAYS[d],x+dayW/2,top+31);
  ctx.fillStyle="#D9E4D8";ctx.font='700 17px "DM Sans",Arial';
  ctx.fillText(shortDate(date).toUpperCase(),x+dayW/2,top+58);
 }
 for(const [r,row] of grid.entries()){
  const y=top+headerH+r*rowH;
  paintRect(ctx,left,y,timeW,rowH,r%2?"#123327":"#16382D");
  ctx.font='800 16px "DM Sans",Arial';ctx.fillStyle="#D9E2DA";
  ctx.fillText(hourRange(row.hour),left+timeW/2,y+41);
  for(let d=0;d<7;d++){
   const x=left+timeW+d*dayW,st=row.cells[d].status;
   const bg=st==="available"?COLOR.availableBg:st==="booked"?COLOR.bookedBg:st==="unavailable"?COLOR.offBg:COLOR.pastBg;
   const fg=st==="available"?COLOR.availableText:st==="booked"?COLOR.bookedText:st==="unavailable"?COLOR.offText:COLOR.pastText;
   paintRect(ctx,x+4,y+4,dayW-8,rowH-8,bg,3);
   ctx.font='900 14px "Plus Jakarta Sans",Arial';ctx.fillStyle=fg;
   ctx.fillText(st==="available"?"AVAILABLE":st==="booked"?"BOOKED":st==="unavailable"?"COACH OFF":"PAST",x+dayW/2,y+40);
  }
 }
 ctx.strokeStyle=COLOR.line;ctx.lineWidth=1;
 for(let col=0;col<=7;col++){
  const x=left+timeW+col*dayW;
  ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+tableHeight);ctx.stroke();
 }
 for(let row=0;row<=END-START;row++){
  const y=top+headerH+row*rowH;
  ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+totalW,y);ctx.stroke();
 }
 // Privacy-first legend.
 const legY=1240;
 ctx.textAlign="left";
 const legend=[
  ["Available",COLOR.availableText,75],
  ["Booked",COLOR.bookedText,285],
  ["Coach Unavailable",COLOR.offText,465],
  ["Past",COLOR.pastText,756]
 ];
 for(const item of legend){dot(ctx,item[2],legY-8,item[1],9);
  ctx.fillStyle=COLOR.ivory;ctx.font='800 19px "DM Sans",Arial';
  ctx.fillText(item[0],item[2]+19,legY-1);
 }
 ctx.fillStyle=COLOR.muted;ctx.font='600 15px "DM Sans",Arial';
 ctx.fillText("Privacy-safe: client names and booking details are never displayed.",1010,legY-1);
 ctx.fillStyle=COLOR.lightBronze;ctx.font='800 22px "Plus Jakarta Sans",Arial';
 ctx.fillText("BOOK: coachdale.xbalanced.net",70,1310);
 ctx.fillStyle=COLOR.muted;ctx.font='600 15px "DM Sans",Arial';
 ctx.textAlign="right";
 ctx.fillText("Availability may change. Session confirmation is required.",1730,1295);
 ctx.textAlign="center";ctx.fillStyle="#8EAA98";ctx.font='600 14px "DM Sans",Arial';
 ctx.fillText("© 2026 XBALANCED DIGITAL SOLUTIONS",900,1330);
 ctx.textAlign="left";
 return canvas;
}
function updateCounts(){
 const s=$("weeklySummary");
 if(!s)return;
 const c=state.counts;
 s.textContent=""+c.available+" available  ·  "+c.booked+" booked  ·  "+c.unavailable+" coach unavailable  ·  "+c.past+" past";
}
async function generate(){
 if(state.busy)return;
 const input=$("weeklyStart");
 if(input?.value){
  const picked=parseISO(input.value);
  if(!picked){toast("Choose a valid date before generating.",true);return;}
  setWeek(picked);
 }
 if(!state.monday)setWeek(manilaNow().date);
 setBusy(true);toast("");
 try{
  state.rows=await fetchSelectedWeek();
  if(document.fonts?.ready)await document.fonts.ready;
  const canvas=await paint(state.rows);
  state.blob=await new Promise((resolve,reject)=>{
   canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not prepare PNG image.")),"image/png");
  });
  updateCounts();
  const dialog=$("weeklyScheduleDialog");
  if(dialog&&!dialog.open)dialog.showModal();
 }catch(err){
  console.error("Coach Dale weekly schedule:",err);
  toast(err?.message||"Could not generate weekly schedule.",true);
 }finally{setBusy(false);}
}
function filename(){
 return "coach-dale-weekly-schedule-"+ymd(state.monday)+"-to-"+ymd(state.sunday)+".png";
}
function directDownload(){
 if(!state.blob)return toast("Generate a card first.",true);
 const url=URL.createObjectURL(state.blob);
 const a=document.createElement("a");
 a.href=url;a.download=filename();a.style.display="none";
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
 toast("PNG download started.");
}
async function share(){
 if(!state.blob)return toast("Generate a card first.",true);
 const title="Coach Dale Weekly Coaching Availability";
 const body="Coach Dale's schedule for "+rangeText(state.monday,state.sunday)+". Book: https://coachdale.xbalanced.net";
 const file=new File([state.blob],filename(),{type:"image/png"});
 if(navigator.canShare?.({files:[file]})){
  try{await navigator.share({title,text:body,files:[file]});return;}catch(err){if(err?.name==="AbortError")return;}
 }
 if(navigator.clipboard?.writeText){
  try{await navigator.clipboard.writeText(body);toast("Schedule text copied. Save PNG to share the image.");return;}catch(err){console.warn(err);}
 }
 toast("Save PNG and share the downloaded image.",true);
}
function closeDialog(){
 const dialog=$("weeklyScheduleDialog");
 if(dialog?.open)dialog.close();
}
function bind(){
 if(!$("weeklyStart")||!$("generateWeeklySchedule"))return;
 setWeek(manilaNow().date);
 $("weeklyStart").addEventListener("change",()=>{
  const date=parseISO($("weeklyStart").value);
  if(date)setWeek(date);
 });
 $("prevWeek").addEventListener("click",()=>shiftWeek(-1));
 $("thisWeek").addEventListener("click",()=>setWeek(manilaNow().date));
 $("nextWeek").addEventListener("click",()=>shiftWeek(1));
 $("generateWeeklySchedule").addEventListener("click",generate);
 $("opsWeekly").onclick=()=>$("weeklyScheduleSection").scrollIntoView({behavior:"smooth",block:"start"});
 $("closeWeeklySchedule").addEventListener("click",closeDialog);
 $("closeWeeklyScheduleBottom").addEventListener("click",closeDialog);
 $("saveWeeklySchedule").addEventListener("click",directDownload);
 $("shareWeeklySchedule").addEventListener("click",share);
 $("weeklyScheduleDialog").addEventListener("click",event=>{
  const dlg=$("weeklyScheduleDialog");
  const r=dlg.getBoundingClientRect();
  if(event.target===dlg&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))closeDialog();
 });
 window.DaleWeekly={generate,generateCurrentWeek:()=>{setWeek(manilaNow().date);return generate();},
  openBuilder:()=>$("weeklyScheduleSection").scrollIntoView({behavior:"smooth",block:"start"}),
  mondayOf,buildGrid,slotStatus,statusMap,ymd};
}
window.DaleWeekly={mondayOf,buildGrid,slotStatus,statusMap,ymd};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
else bind();
})();