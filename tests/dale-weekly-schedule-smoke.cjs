/* Coach Dale weekly schedule — match Kyle's hourly grid and verify live-week fetch.
 * Offline browser-DOM test: no Supabase writes, no client information.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {JSDOM}=require("jsdom");

async function main(){
 const html=[
 '<!doctype html><html><body><section id="daleDashboard">',
 '<section id="weeklyScheduleSection">',
 '<button id="opsWeekly">Weekly</button>',
 '<input id="weeklyStart" type="date"><span id="weeklyRange"></span>',
 '<button id="prevWeek">Previous</button><button id="thisWeek">This</button><button id="nextWeek">Next</button>',
 '<button id="generateWeeklySchedule">Generate</button>',
 '<p id="weeklySummary"></p><p id="weeklyToast" hidden></p></section>',
 '<dialog id="weeklyScheduleDialog">',
 '<button id="closeWeeklySchedule">Close</button>',
 '<canvas id="weeklyScheduleCanvas" width="1800" height="1350"></canvas>',
 '<button id="saveWeeklySchedule">Save PNG</button>',
 '<button id="shareWeeklySchedule">Share</button>',
 '<button id="closeWeeklyScheduleBottom">Close</button>',
 '</dialog></section></body></html>'
 ].join("");
 const dom=new JSDOM(html,{runScripts:"outside-only",pretendToBeVisual:true,url:"https://coachdale.xbalanced.net/admin.html"});
 const {window}=dom,doc=window.document;
 window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};
 window.HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
 window.HTMLElement.prototype.scrollIntoView=function(){};
 const canvas=doc.getElementById("weeklyScheduleCanvas"),labels=[],logos=[];
 canvas.getContext=()=>({
  fillStyle:"",strokeStyle:"",lineWidth:1,font:"",textAlign:"left",
  fillRect(){},strokeRect(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},arcTo(){},arc(){},fill(){},stroke(){},roundRect(){},
  fillText(label){labels.push(String(label))},drawImage(){},
  createLinearGradient(){return {addColorStop(){}};},
  clearRect(){}
 });
 canvas.toBlob=callback=>callback(new window.Blob(["fakePNG"],{type:"image/png"}));
 window.Image=class{
  naturalWidth=1254;naturalHeight=1254;
  set src(value){logos.push(value);Promise.resolve().then(()=>this.onload());}
 };
 window.DALE_SUPABASE_KEY="test-publishable";
 let selectedStart="",selectedEnd="",queryCalls=0;
 const rows=[
  {session_date:"2026-10-06",hour:11,reason:"confirmed",full_name:"PRIVATE! NEVER EXPORT"},
  {session_date:"2026-10-08",hour:12,reason:"blocked",note:"PRIVATE!"},
  {session_date:"2026-10-09",hour:14,reason:"confirmed"},
  {session_date:"2026-10-09",hour:15,reason:"blocked"}
 ];
 const client={
  auth:{getUser:async()=>({data:{user:{id:"test-authorized-admin"}}})},
  from(name){
   if(name==="dale_admin_users")return {select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:"test-authorized-admin"}})})})};
   assert.equal(name,"dale_unavailable_hours");
   return {select:(cols)=>{
    assert.equal(cols,"session_date,hour,reason","Never query client names for the public PNG");
    const q={
     gte(key,value){assert.equal(key,"session_date");selectedStart=value;return q;},
     lte(key,value){assert.equal(key,"session_date");selectedEnd=value;return q;},
     order(){return q},
     async limit(){queryCalls++;return {data:rows,error:null}}
    };
    return q;
   }};
  }
 };
 window.supabase={createClient:()=>client};
 window.eval(fs.readFileSync("dale-weekly-schedule.js","utf8"));
 doc.dispatchEvent(new window.Event("DOMContentLoaded"));
 const week=window.DaleWeekly;
 assert.ok(week,"weekly module initialized");
 const monday=week.mondayOf(new Date(2026,9,10,12));
 assert.equal(week.ymd(monday),"2026-10-05","Week must start Monday even when user enters Saturday");
 const sample=week.buildGrid(rows,monday,{day:"2026-10-09",hour:13});
 assert.equal(sample.grid.length,12,"Exactly 12 rows for 10 AM through 10 PM");
 assert.equal(sample.grid[0].hour,10);
 assert.equal(sample.grid[11].hour,21);
 assert.equal(sample.grid.reduce((n,r)=>n+r.cells.length,0),84,"7 days times 12 hours");
 assert.equal(sample.grid[0].cells[0].status,"past","Elapsed hours display Past");
 assert.equal(sample.grid[1].cells[1].status,"booked","Confirmed slot remains Booked even when elapsed");
 assert.equal(sample.grid[2].cells[3].status,"unavailable","Manually blocked hour displays Coach Off");
 assert.equal(sample.grid[4].cells[4].status,"booked","Friday 2 PM correctly Booked");
 assert.equal(sample.grid[5].cells[4].status,"unavailable","Friday 3 PM correctly unavailable");
 assert.equal(sample.grid[6].cells[6].status,"available","Future Sunday is available");
 assert.equal(Object.values(sample.counts).reduce((a,b)=>a+b,0),84);
 const input=doc.getElementById("weeklyStart");
 input.value="2026-10-10";
 input.dispatchEvent(new window.Event("change",{bubbles:true}));
 assert.equal(input.value,"2026-10-05","Selected Saturday snaps to Monday–Sunday week");
 await week.generate();
 assert.equal(queryCalls,1,"A fresh Supabase query occurs when generating the card");
 assert.equal(selectedStart,"2026-10-05");
 assert.equal(selectedEnd,"2026-10-11","Fetch entire selected week, including older dates");
 assert.equal(canvas.width,1800);
 assert.equal(canvas.height,1350);
 assert.equal(doc.getElementById("weeklyScheduleDialog").open,true,"PNG preview dialog opens");
 assert.ok(labels.includes("WEEKLY COACHING AVAILABILITY"));
 assert.ok(labels.includes("COACH OFF"));
 assert.ok(labels.includes("BOOKED"));
 assert.ok(labels.includes("AVAILABLE"));
 assert.ok(labels.includes("PAST"));
 assert.ok(labels.some(s=>s.includes("coachdale.xbalanced.net")),"Correct booking URL");
 assert.ok(!labels.some(s=>s.includes("PRIVATE!")),"No personal booking names/notes on shared PNG");
 assert.ok(logos.includes("assets/branding/coach-dale-main-logo.png"));
 assert.ok(logos.includes("assets/branding/coach-dale-wordmark.png"));
 assert.equal(doc.getElementById("weeklySummary").textContent.includes("84"),false,"Counts are status-based, not always 84 available");
 doc.getElementById("closeWeeklySchedule").click();
 assert.equal(doc.getElementById("weeklyScheduleDialog").open,false);
 dom.window.close();
 console.log("Coach Dale weekly timetable: Kyle-format 7x12 grid, privacy, correct week, live fetch, logos, preview all PASS");
}
main().catch(e=>{console.error(e);process.exitCode=1;});