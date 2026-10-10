(()=>{
"use strict";
const $=id=>document.getElementById(id),el=(name,cls="",value)=>{const x=document.createElement(name);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value);return x};
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const nowHour=()=>Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Manila",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
const money=x=>"₱"+Number(x||0).toLocaleString("en-PH",{minimumFractionDigits:0,maximumFractionDigits:2});
const clock=h=>(h%12||12)+":00 "+(h<12?"AM":"PM");
const state={bookings:[],locks:[],payments:[],clients:[]};
const opened={};
const areaConfigs=[["todayBookings","toggleToday"],["bookings","toggleUpcomingBookings"],["pastSessionsList","togglePastSessions"],["paymentFollowupList","togglePaymentFollowups"],["completedSessionsList","toggleCompletedSessions"]];
function paid(b){return state.payments.filter(x=>x.booking_id===b.id).reduce((n,x)=>n+Number(x.amount),0)}
function isToday(b){return b.session_date===today()}
function payStatus(b){const total=Number(b.quoted_total),p=paid(b);return p>=total?"Paid":p>0?"Partial":"Unpaid"}
function nav(close=false){const panel=$("adminNav"),shade=$("adminNavBackdrop");const active=!close&&!panel.classList.contains("open");panel.classList.toggle("open",active);shade.classList.toggle("open",active);$("adminMenuBtn").setAttribute("aria-expanded",String(active))}
function statusTag(name,cls){return el("span","tag "+cls,name)}
function moneyLabel(b){const n=paid(b);return "Fee "+money(b.quoted_total)+" · Paid "+money(n)+" · Balance "+money(Math.max(0,b.quoted_total-n))}
function action(label,callback,cls=""){const btn=el("button","mini "+cls,label);btn.type="button";btn.addEventListener("click",callback);return btn}
function bookingCard(b,kind="upcoming"){
 const card=el("article","card booking-card");
 const top=el("div","card-top"),txt=el("div"),tag=el("div","tag-stack");
 txt.append(el("h3","",b.full_name),el("div","meta",b.session_date+" · "+clock(b.start_hour)+" – "+clock(b.end_hour)+" · "+(b.end_hour-b.start_hour)+" hr(s)"));
 txt.append(el("div","meta",b.player_count+" player(s) · "+b.court+" · "+money(b.quoted_total)));
 tag.append(statusTag(b.status,b.status==="pending"?"new":b.status));
 tag.append(statusTag(payStatus(b),"payment "+payStatus(b).toLowerCase()));
 top.append(txt,tag);card.append(top);
 if(kind!=="today"&&kind!=="completed")card.append(el("div","meta",moneyLabel(b)));
 if(b.status==="pending")card.append(el("div","meta","Contact: "+b.contact+" · "+b.goal));
 const buttons=el("div","card-actions");
 if(b.status==="pending"&&b.session_date>=today()){
  buttons.append(action("CONFIRM",()=>window.DaleAdmin?.changeStatus(b,"confirmed"),"confirm"));
  buttons.append(action("REJECT",()=>{if(confirm("Reject this request from "+b.full_name+"?"))window.DaleAdmin?.changeStatus(b,"rejected")},"danger"));
 }
 if(b.status==="confirmed"){
  buttons.append(action("Edit Booking",()=>window.DaleOps?.open("edit",b)));
  buttons.append(action("Record Payment",()=>window.DaleOps?.open("payment",b)));
  buttons.append(action("Confirmation",()=>window.DaleOps?.open("confirmation",b)));
  buttons.append(action("Mark Completed",()=>window.DaleOps?.open("complete",b),"confirm"));
  buttons.append(action("Cancel",()=>{if(confirm("Cancel this booking and release its hours?"))window.DaleAdmin?.changeStatus(b,"cancelled")},"danger"));
 }else if(b.status==="completed"){
  if(paid(b)<Number(b.quoted_total))buttons.append(action("Record Payment",()=>window.DaleOps?.open("payment",b),"confirm"));
  buttons.append(action("Confirmation",()=>window.DaleOps?.open("confirmation",b)));
 }else if(b.status==="pending"){
  buttons.append(action("View Request",()=>window.DaleOps?.open("confirmation",b)));
 }
 if(buttons.children.length)card.append(buttons);
 return card;
}
function section(id,records,buttonId,empty,kind){
 const list=$(id);if(!list)return;list.replaceChildren();
 const total=records.length;
 const display=opened[id]?records:records.slice(0,3);
 for(const b of display)list.append(bookingCard(b,kind));
 if(!total)list.append(el("div","empty",empty));
 if(buttonId){const btn=$(buttonId);if(btn){btn.hidden=total<=3;btn.textContent=opened[id]?"SHOW LESS":"SHOW ALL ("+total+")"}}
}
function basic(){
 const t=today(),all=state.bookings,scheduled=all.filter(x=>x.status==="confirmed"),pending=all.filter(x=>x.status==="pending"),due=all.filter(x=>x.status==="completed"&&paid(x)<Number(x.quoted_total));
 const current=scheduled.filter(b=>b.session_date===t),future=scheduled.filter(b=>b.session_date>t),past=scheduled.filter(b=>b.session_date<t);
 const completed=all.filter(b=>b.status==="completed"&&paid(b)>=Number(b.quoted_total));
 const totalBlockedToday=state.locks.filter(x=>x.session_date===t&&x.reason==="blocked").length;
 const balance=all.filter(b=>["confirmed","completed"].includes(b.status)).reduce((sum,b)=>sum+Math.max(0,Number(b.quoted_total)-paid(b)),0);
 for(const [id,value] of Object.entries({attentionInquiries:pending.length,attentionCompletedDue:due.length,metricInquiries:pending.length,metricBookings:future.length,metricToday:current.length,metricClients:state.clients.length,metricBalance:money(balance),metricBlocked:totalBlockedToday,inquiriesCount:pending.length,pastSessionsCount:past.length,paymentFollowupCount:due.length,completedSessionsCount:completed.length})){const node=$(id);if(node)node.textContent=String(value)}
 section("todayBookings",current,null,"No confirmed sessions today.","today");
 section("inquiries",pending,null,"No pending booking requests.","pending");
 section("bookings",future,"toggleUpcomingBookings","No upcoming confirmed bookings.","upcoming");
 section("pastSessionsList",past,"togglePastSessions","No past sessions awaiting completion.","past");
 section("paymentFollowupList",due,"togglePaymentFollowups","No completed sessions with balance.","followup");
 section("completedSessionsList",completed,"toggleCompletedSessions","No fully paid completed sessions.","completed");
 renderSchedule();renderClients();report();notifications();
}
function renderSchedule(){
 const d=$("blockDate")?.value;if(!d)return;
 const locks=state.locks.filter(x=>x.session_date===d);
 const container=$("scheduleSlots");container.replaceChildren();
 for(let hour=10;hour<22;hour++){
  const booked=locks.find(x=>x.hour===hour);
  const past=d<today()||(d===today()&&hour<=nowHour());
  const b=el("button","slot "+(past?"past":booked?.reason==="confirmed"?"booked":booked?"blocked":"available"),clock(hour)+" – "+clock(hour+1)+(booked?(booked.reason==="confirmed"?" · BOOKED":" · BLOCKED"):""));
  b.type="button";
  b.disabled=!!booked||past;
  b.title=booked?"Already unavailable":"Select this hour to block it";
  if(!b.disabled)b.onclick=()=>{$("blockStart").value=hour;$("blockEnd").value=hour+1;$("blockForm").scrollIntoView({behavior:"smooth",block:"nearest"});$("blockNote").focus()};
  container.append(b);
 }
}
function renderClients(){
 const meta=state.clients,search=$("clientSearch")?.value.trim().toLowerCase()||"";
 const active=meta.filter(c=>!search||c.full_name.toLowerCase().includes(search));
 const container=$("clientsList");if(!container)return;container.replaceChildren();
 if(!active.length){container.append(el("div","empty",search?"No clients matching search.":"No player profiles recorded yet."));return}
 for(const c of active.slice(0,24)){
  const box=el("button","client-card");box.type="button";
  box.append(el("span","",c.full_name),el("small","",c.contact||"No contact saved"),el("b","",c.skill_level||"Player"));
  box.onclick=()=>$("opsClients").click();
  container.append(box);
 }
}
function report(){
 const pick=$("reportPeriod").value,month=today().slice(0,7);
 let compare=month;if(pick==="last"){const d=new Date(month+"-01T12:00:00+08:00");d.setMonth(d.getMonth()-1);compare=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit"}).format(d)}
 const included=d=>pick==="all"||String(d||"").slice(0,7)===compare;
 const bookings=state.bookings.filter(x=>included(x.session_date));
 const pay=state.payments.filter(p=>included(p.payment_date));
 const sessions=bookings.filter(x=>["confirmed","completed"].includes(x.status));
 const fees=sessions.reduce((n,b)=>n+Number(b.quoted_total),0);
 const collected=pay.reduce((n,p)=>n+Number(p.amount),0);
 const earned=bookings.filter(b=>b.status==="completed").reduce((n,b)=>n+Number(b.quoted_total),0);
 const outstanding=sessions.reduce((n,b)=>n+Math.max(0,Number(b.quoted_total)-paid(b)),0);
 for(const [id,n] of Object.entries({reportConfirmed:fees,reportCollected:collected,reportEarned:earned,reportOutstanding:outstanding}))$(id).textContent=money(n);
 const gcash=pay.filter(x=>x.method==="gcash").reduce((n,p)=>n+Number(p.amount),0),cash=collected-gcash;
 $("reportBreakdown").textContent="Collections for selected period · GCash "+money(gcash)+" · Cash "+money(cash);
 const tbody=$("reportRows");tbody.replaceChildren();
 for(const b of bookings.slice(0,80)){
  const tr=el("tr"),values=[b.session_date,b.full_name,b.status,money(b.quoted_total),money(paid(b)),money(Math.max(0,Number(b.quoted_total)-paid(b)))];
  for(const value of values)tr.append(el("td","",value));
  tbody.append(tr);
 }
 if(!bookings.length){const tr=el("tr");const td=el("td","","No bookings for this period.");td.colSpan=6;tr.append(td);tbody.append(tr)}
}
function notifications(){
 const n=state.bookings.filter(b=>b.status==="pending").length,badge=$("adminNotifyBadge");
 badge.classList.toggle("hidden-badge",n===0);badge.textContent=n;
 const panel=$("adminNotifyList");panel.replaceChildren();
 if(!n){panel.append(el("div","notify-empty","No booking requests waiting for approval."));return}
 for(const b of state.bookings.filter(x=>x.status==="pending").slice(0,15)){
  const row=el("a","",""+b.full_name+" · "+b.session_date+" · "+clock(b.start_hour));row.href="#inquiriesSection";row.onclick=()=>{$("adminNotifyPanel").classList.remove("open");$("adminNotifyBtn").setAttribute("aria-expanded","false")};panel.append(row);
 }
}
async function render(bookings,locks){
 state.bookings=bookings||[];state.locks=locks||[];
 const meta=window.DaleOps?.meta?.();
 state.clients=meta?.clients||[];state.payments=meta?.payments||[];
 basic();
 try{await window.DaleOps?.load?.();const fresh=window.DaleOps?.meta?.();state.clients=fresh?.clients||[];state.payments=fresh?.payments||[];basic()}catch(e){console.warn("Dale overview load:",e.message)}
}
function signedIn(email){$("adminEmail").textContent=email||"";window.DaleMedia?.setAuthorized(true)}
function signedOut(){window.DaleMedia?.setAuthorized(false);state.bookings=[];state.locks=[];state.clients=[];state.payments=[];nav(true)}
$("adminMenuBtn").onclick=()=>nav();$("footerMenuBtn").onclick=()=>nav();$("adminNavBackdrop").onclick=()=>nav(true);
for(const a of $("adminNav").querySelectorAll("a"))a.onclick=()=>nav(true);
$("adminManualBookingLink").onclick=e=>{e.preventDefault();nav(true);$("opsManual").click()};
$("adminNotifyBtn").onclick=()=>{const panel=$("adminNotifyPanel"),expanded=panel.classList.toggle("open");$("adminNotifyBtn").setAttribute("aria-expanded",String(expanded))};
$("shareBookingLinkBtn").onclick=async()=>{const u="https://coachdale.xbalanced.net/#book";try{if(navigator.share)await navigator.share({title:"Coach Dale Booking",url:u});else{await navigator.clipboard.writeText(u);alert("Booking link copied!")}}catch(e){if(e.name!=="AbortError")prompt("Copy Coach Dale booking link:",u)}};
$("quickWeeklyScheduleBtn").onclick=()=>window.DaleWeekly?.generateCurrentWeek();
$("clientSearch").oninput=renderClients;$("reportPeriod").onchange=report;$("blockDate").onchange=()=>setTimeout(renderSchedule,0);
for(const [id,btn] of areaConfigs){const b=$(btn);if(b)b.onclick=()=>{opened[id]=!opened[id];basic()}}
window.DaleKyle={render,signedIn,signedOut};
})();