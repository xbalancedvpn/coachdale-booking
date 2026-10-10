/* Browser-DOM smoke test for the Alpine Elite date picker. Run on CI with jsdom. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {JSDOM}=require("jsdom");

async function main(){
 const dom=new JSDOM('<!doctype html><html><body><main><label for="daleDate">Coaching date</label><input id="daleDate" type="date" min="2026-10-12" max="2026-10-20" value="2026-10-15"><label>Selected date<input id="blockDate" type="date" min="2026-10-12" value="2026-10-14"></label></main></body></html>',{
  url:"https://coachdale.xbalanced.net/index.html",
  runScripts:"outside-only",
  pretendToBeVisual:true
 });
 const {window}=dom,document=window.document;
 window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};
 window.HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
 window.eval(fs.readFileSync("dale-date-picker.js","utf8"));
 document.dispatchEvent(new window.Event("DOMContentLoaded"));
 assert.equal(typeof window.coachDaleDatePicker?.open,"function","calendar public API initialized");
 const staticInput=document.getElementById("daleDate"),block=document.getElementById("blockDate");
 assert.equal(staticInput.type,"text","native date input converted to custom readonly input");
 assert.equal(staticInput.readOnly,true);
 assert.equal(block.type,"text","admin date field enhanced");
 assert.equal(document.querySelectorAll(".dale-date-control").length,2);
 const trigger=staticInput.parentNode.querySelector(".dale-date-trigger");
 assert.ok(trigger,"visible SELECT button exists");
 let changeCount=0;
 staticInput.addEventListener("change",()=>changeCount++);
 trigger.click();
 const dlg=document.getElementById("daleDatePickerDialog");
 assert.equal(dlg.open,true,"custom calendar opens in a modal");
 assert.equal(dlg.querySelector("#daleDateMonth").textContent,"October 2026");
 assert.ok(dlg.querySelector('.dale-cal-day[data-date="2026-10-11"]').disabled,"past min dates disabled");
 assert.ok(dlg.querySelector('.dale-cal-day[data-date="2026-10-21"]').disabled,"beyond-max dates disabled");
 dlg.querySelector('.dale-cal-day[data-date="2026-10-16"]').click();
 assert.equal(staticInput.value,"2026-10-16","date value remains ISO for Supabase");
 assert.equal(changeCount,1,"booking update receives a change event");
 assert.equal(dlg.open,false,"calendar closes on selection");
 const dynamic=document.createElement("dialog");
 dynamic.innerHTML='<form><label>Payment date<input id="opsPaymentDate" type="date" name="date" value="2026-10-16"></label></form>';
 document.body.appendChild(dynamic);
 await new Promise(resolve=>setTimeout(resolve,0));
 const payment=document.getElementById("opsPaymentDate");
 assert.equal(payment.type,"text","dynamically added admin payment date enhanced");
 assert.ok(payment.parentNode.querySelector(".dale-date-trigger"),"dynamically added field has custom trigger");
 payment.parentNode.querySelector(".dale-date-trigger").click();
 assert.equal(dlg.open,true,"dynamic popup date works");
 dlg.querySelector('.dale-cal-day[data-date="2026-10-17"]').click();
 assert.equal(payment.value,"2026-10-17");
 dom.window.close();
 console.log("Coach Dale calendar smoke: public, admin, limits, dynamic fields, selection and change events PASS.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});