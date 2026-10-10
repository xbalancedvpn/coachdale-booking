/* Coach Dale / Alpine Elite — in-page admin calendar
   Explicit, always-visible date selector; works with the modal date picker. */
(() => {
"use strict";
const byId=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const fmt=date=>date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate());
const parse=value=>{
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
  if(!m)return null;
  const d=new Date(+m[1],+m[2]-1,+m[3]);
  return fmt(d)===m[0]?d:null;
};
const phToday=()=>{
  const arr=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const values=Object.fromEntries(arr.filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)]));
  return new Date(values.year,values.month-1,values.day);
};
let month=null,locks=[];
function allowed(d){
  const field=byId("blockDate"),min=parse(field?.getAttribute("min"))||phToday();
  const max=parse(field?.getAttribute("max"));
  return d>=min&&(!max||d<=max);
}
function changeDate(d){
  if(!allowed(d))return;
  const input=byId("blockDate");if(!input)return;
  input.value=fmt(d);
  input.dispatchEvent(new Event("input",{bubbles:true}));
  input.dispatchEvent(new Event("change",{bubbles:true}));
  render();
  byId("scheduleSlots")?.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function render(){
  const field=byId("blockDate"),grid=byId("daleInlineGrid");
  if(!field||!grid)return;
  const selected=parse(field.value),today=phToday();
  if(!month)month=new Date((selected||today).getFullYear(),(selected||today).getMonth(),1);
  byId("daleInlineMonth").textContent=month.toLocaleDateString("en-PH",{year:"numeric",month:"long"});
  const prevMonthEnd=new Date(month.getFullYear(),month.getMonth(),0);
  const nextMonthFirst=new Date(month.getFullYear(),month.getMonth()+1,1);
  const min=parse(field.getAttribute("min"))||today,max=parse(field.getAttribute("max"));
  byId("daleInlinePrev").disabled=prevMonthEnd<min;
  byId("daleInlineNext").disabled=!!max&&nextMonthFirst>max;
  grid.replaceChildren();
  const first=new Date(month.getFullYear(),month.getMonth(),1);
  const offset=(first.getDay()+6)%7;
  for(let i=0;i<offset;i++){
    const empty=document.createElement("span");
    empty.className="dale-calendar-blank";empty.setAttribute("aria-hidden","true");
    grid.append(empty);
  }
  const last=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  for(let day=1;day<=last;day++){
    const date=new Date(month.getFullYear(),month.getMonth(),day);
    const key=fmt(date),same=selected&&fmt(selected)===key,now=key===fmt(today);
    const booked=locks.filter(x=>x.session_date===key&&x.reason==="confirmed").length;
    const blocked=locks.filter(x=>x.session_date===key&&x.reason==="blocked").length;
    const element=document.createElement("button");
    element.type="button";
    element.className="dale-calendar-day"+(same?" selected":"")+(now?" today":"");
    element.dataset.date=key;
    element.disabled=!allowed(date);
    element.setAttribute("aria-label",date.toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric",weekday:"long"})+
      (booked?" · "+booked+" reserved hour(s)":"")+(blocked?" · "+blocked+" blocked hour(s)":""));
    if(same)element.setAttribute("aria-pressed","true");
    element.append(document.createTextNode(String(day)));
    const dots=document.createElement("span");dots.className="dale-cell-dots";
    if(booked){
      const dot=document.createElement("i");dot.className="is-reserved";dot.setAttribute("aria-hidden","true");
      dots.append(dot);
    }
    if(blocked){
      const dot=document.createElement("i");dot.className="is-blocked";dot.setAttribute("aria-hidden","true");
      dots.append(dot);
    }
    if(!booked&&!blocked){
      const dot=document.createElement("i");dot.className="is-available";dot.setAttribute("aria-hidden","true");
      dots.append(dot);
    }
    element.append(dots);
    if(!element.disabled)element.addEventListener("click",()=>changeDate(date));
    grid.append(element);
  }
}
function refresh(data){
  if(Array.isArray(data))locks=data;
  const state=byId("blockDate")?.value;
  const selected=parse(state);
  if(selected&&!month)month=new Date(selected.getFullYear(),selected.getMonth(),1);
  render();
}
function init(){
  const field=byId("blockDate"),grid=byId("daleInlineGrid");
  if(!field||!grid)return;
  if(!field.min)field.min=fmt(phToday());
  month=new Date((parse(field.value)||phToday()).getFullYear(),(parse(field.value)||phToday()).getMonth(),1);
  byId("daleInlinePrev").addEventListener("click",()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);render()});
  byId("daleInlineNext").addEventListener("click",()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);render()});
  byId("adminCalendarBtn").addEventListener("click",()=>{
    byId("scheduleSection").scrollIntoView({behavior:"smooth",block:"start"});
    refresh();
  });
  byId("adminOpenDatePicker").addEventListener("click",()=>{
    if(window.coachDaleDatePicker?.open)window.coachDaleDatePicker.open(field);
    else field.click();
  });
  field.addEventListener("change",()=>{
    const date=parse(field.value);
    if(date)month=new Date(date.getFullYear(),date.getMonth(),1);
    render();
  });
  grid.addEventListener("keydown",event=>{
    const current=event.target.closest("button[data-date]");
    if(!current)return;
    const movement={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
    if(!movement)return;
    const date=parse(current.dataset.date);
    date.setDate(date.getDate()+movement);
    if(!allowed(date))return;
    event.preventDefault();
    if(date.getMonth()!==month.getMonth()||date.getFullYear()!==month.getFullYear()){
      month=new Date(date.getFullYear(),date.getMonth(),1);render();
    }
    grid.querySelector('[data-date="'+fmt(date)+'"]')?.focus();
  });
  refresh(window.DaleAdmin?.getData?.().locks);
  window.DaleAdminCalendar={refresh,changeDate,render};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();