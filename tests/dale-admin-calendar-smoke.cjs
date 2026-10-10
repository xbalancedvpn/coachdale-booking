/* Coach Dale admin visible calendar behavioral smoke (jsdom). */
const assert=require("node:assert/strict");
const {JSDOM}=require("jsdom");
const fs=require("node:fs");
const pad=x=>String(x).padStart(2,"0");
const key=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
const todayFields=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,+x.value]));
const today=new Date(todayFields.year,todayFields.month-1,todayFields.day);
const plus=n=>new Date(today.getFullYear(),today.getMonth(),today.getDate()+n);
const start=key(today),target=key(plus(5));

async function main(){
  const html='<!doctype html><html><body>'+
    '<section id="daleDashboard"><button id="adminCalendarBtn" type="button">Calendar</button>'+
    '<section id="scheduleSection">'+
    '<div id="daleAdminCalendar"><button id="daleInlinePrev" type="button">Prev</button>'+
    '<strong id="daleInlineMonth"></strong><button id="daleInlineNext" type="button">Next</button>'+
    '<div id="daleInlineGrid"></div></div>'+
    '<label>Selected date<input type="date" id="blockDate" min="'+start+'" value="'+start+'"></label>'+
    '<button id="adminOpenDatePicker" type="button">Open Date Picker</button>'+
    '<div id="scheduleSlots"></div></section></section></body></html>';
  const dom=new JSDOM(html,{runScripts:"outside-only",pretendToBeVisual:true,url:"https://coachdale.xbalanced.net/admin.html"});
  const {window}=dom,doc=window.document;
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};
  window.HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
  window.eval(fs.readFileSync("dale-date-picker.js","utf8"));
  window.eval(fs.readFileSync("dale-admin-calendar.js","utf8"));
  doc.dispatchEvent(new window.Event("DOMContentLoaded"));
  const input=doc.getElementById("blockDate");
  assert.equal(input.type,"text","Native date field is replaced with custom control");
  assert.equal(doc.querySelectorAll(".dale-date-control").length,1);
  const grid=doc.getElementById("daleInlineGrid");
  assert.ok(grid.querySelectorAll(".dale-calendar-day").length>=28,"Calendar days visible in admin");
  assert.ok(grid.querySelector(".dale-calendar-day.selected"),"Selected date highlighted");
  assert.equal(doc.getElementById("daleInlineMonth").textContent,plus(0).toLocaleDateString("en-PH",{month:"long",year:"numeric"}));
  let changed=0;
  input.addEventListener("change",()=>changed++);
  if(plus(5).getMonth()!==today.getMonth())doc.getElementById("daleInlineNext").click();
  const day=grid.querySelector('[data-date="'+target+'"]');
  assert.ok(day,"Future date selectable");
  assert.equal(day.disabled,false);
  day.click();
  assert.equal(input.value,target,"Clicked inline date updates blockDate");
  assert.equal(changed,1,"Schedule change event dispatched");
  assert.equal(grid.querySelector(".dale-calendar-day.selected")?.dataset.date,target);
  const bookings=[{session_date:target,hour:13,reason:"confirmed"},{session_date:target,hour:14,reason:"blocked"}];
  window.DaleAdminCalendar.refresh(bookings);
  const decorated=grid.querySelector('[data-date="'+target+'"]');
  assert.ok(decorated.querySelector(".is-reserved"),"Reserved hour indicator visible");
  assert.ok(decorated.querySelector(".is-blocked"),"Blocked hour indicator visible");
  doc.getElementById("adminOpenDatePicker").click();
  assert.equal(doc.getElementById("daleDatePickerDialog").open,true,"Open Date Picker button opens popup");
  assert.ok(doc.getElementById("daleDatePickerDialog").querySelector("#daleDateGrid .dale-cal-day"),"Month grid rendered in modal");
  doc.getElementById("adminCalendarBtn").click();
  assert.ok(grid.querySelectorAll(".dale-calendar-day").length>=28,"Header Calendar shortcut keeps schedule visible");
  dom.window.close();
  console.log("Coach Dale admin custom calendar: visible grid, date selection, blocked/booked indicators, modal, shortcuts PASS");
}
main().catch(e=>{console.error(e);process.exitCode=1;});