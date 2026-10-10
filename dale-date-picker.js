// Coach Dale branded date picker - Monday-first, shared by public and admin
(function(){
  const pad=n=>String(n).padStart(2,'0');
  const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parse=s=>{
    const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return Number.isNaN(d.getTime())?null:d;
  };
  let target=null;
  let view=new Date();
  view.setDate(1);

  function inputTitle(input){
    if(input.dataset.dateTitle)return input.dataset.dateTitle;
    let label=input.closest('label');
    if(!label&&input.id){
      label=[...document.querySelectorAll('label[for]')].find(x=>x.getAttribute('for')===input.id)||null;
    }
    if(label){
      const clone=label.cloneNode(true);
      clone.querySelectorAll('input,select,textarea,button').forEach(x=>x.remove());
      const text=clone.textContent.replace(/\s+/g,' ').trim();
      if(text)return 'Choose '+text.toLowerCase();
    }
    return 'Choose a date';
  }

  function ensure(){
    let dlg=document.getElementById('daleDatePickerDialog');
    if(dlg)return dlg;
    dlg=document.createElement('dialog');
    dlg.id='daleDatePickerDialog';
    dlg.className='dale-date-dialog';
    dlg.innerHTML=
      '<div class="dale-date-card">'+
        '<div class="dale-date-head">'+
          '<div class="dale-date-brand"><img src="assets/branding/coach-dale-favicon.png?v=1" alt=""><div><span>COACH DALE</span><h2 id="daleDateTitle">Choose a date</h2></div></div>'+
          '<button type="button" id="daleDateClose" aria-label="Close date picker">×</button>'+
        '</div>'+
        '<div class="dale-date-nav"><button type="button" id="daleDatePrev" aria-label="Previous month">‹</button><strong id="daleDateMonth"></strong><button type="button" id="daleDateNext" aria-label="Next month">›</button></div>'+
        '<div class="dale-date-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>'+
        '<div id="daleDateGrid" class="dale-date-grid"></div>'+
        '<div class="dale-date-actions"><button type="button" id="daleDateToday" class="dale-date-secondary">Today</button><button type="button" id="daleDateDone" class="dale-date-primary">Close</button></div>'+
      '</div>';
    document.body.appendChild(dlg);
    document.getElementById('daleDateClose').onclick=()=>dlg.close();
    document.getElementById('daleDateDone').onclick=()=>dlg.close();
    document.getElementById('daleDatePrev').onclick=()=>{view.setMonth(view.getMonth()-1);render();};
    document.getElementById('daleDateNext').onclick=()=>{view.setMonth(view.getMonth()+1);render();};
    document.getElementById('daleDateToday').onclick=()=>{
      const today=new Date();
      if(allowed(today))pick(today);
      else{
        view=new Date(today.getFullYear(),today.getMonth(),1);
        render();
      }
    };
    dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
    return dlg;
  }

  function allowed(d){
    if(!target)return true;
    const min=parse(target.getAttribute('min')||'');
    const max=parse(target.getAttribute('max')||'');
    const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    if(min&&x<new Date(min.getFullYear(),min.getMonth(),min.getDate()))return false;
    if(max&&x>new Date(max.getFullYear(),max.getMonth(),max.getDate()))return false;
    return true;
  }

  function pick(d){
    if(!target||!allowed(d))return;
    target.value=ymd(d);
    target.dispatchEvent(new Event('input',{bubbles:true}));
    target.dispatchEvent(new Event('change',{bubbles:true}));
    ensure().close();
    try{target.focus({preventScroll:true});}catch(_){target.focus();}
  }

  function render(){
    const dlg=ensure();
    const grid=dlg.querySelector('#daleDateGrid');
    const month=dlg.querySelector('#daleDateMonth');
    month.textContent=view.toLocaleDateString('en-PH',{month:'long',year:'numeric'});
    grid.innerHTML='';
    const year=view.getFullYear(),monthIndex=view.getMonth();
    const first=(new Date(year,monthIndex,1).getDay()+6)%7;
    const last=new Date(year,monthIndex+1,0).getDate();
    for(let i=0;i<first;i++){
      const blank=document.createElement('span');
      blank.className='dale-date-blank';
      grid.appendChild(blank);
    }
    const selected=parse(target&&target.value);
    const today=new Date();today.setHours(0,0,0,0);
    for(let day=1;day<=last;day++){
      const d=new Date(year,monthIndex,day);
      const btn=document.createElement('button');
      btn.type='button';
      btn.textContent=String(day);
      btn.setAttribute('aria-label',d.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'}));
      if(d.getTime()===today.getTime())btn.classList.add('today');
      if(selected&&ymd(selected)===ymd(d))btn.classList.add('selected');
      if(!allowed(d)){
        btn.disabled=true;
        btn.classList.add('disabled');
      }else{
        btn.onclick=()=>pick(d);
      }
      grid.appendChild(btn);
    }
  }

  function open(input){
    target=input;
    const selected=parse(input.value);
    const min=parse(input.getAttribute('min')||'');
    const current=selected||min||new Date();
    view=new Date(current.getFullYear(),current.getMonth(),1);
    const dlg=ensure();
    dlg.querySelector('#daleDateTitle').textContent=inputTitle(input);
    render();
    if(!dlg.open)dlg.showModal();
  }

  function enhance(input){
    if(!input||input.dataset.daleDateReady==='1')return;
    input.dataset.daleDateReady='1';
    input.type='text';
    input.readOnly=true;
    input.autocomplete='off';
    input.inputMode='none';
    input.classList.add('dale-date-input');
    input.setAttribute('aria-haspopup','dialog');
    input.addEventListener('click',e=>{e.preventDefault();open(input);});
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '||e.key==='ArrowDown'){
        e.preventDefault();
        open(input);
      }
    });
  }

  function scan(root=document){
    root.querySelectorAll('input[type="date"]').forEach(enhance);
  }

  function init(){
    ensure();
    scan();
    const observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of record.addedNodes){
          if(node.nodeType!==1)continue;
          if(node.matches&&node.matches('input[type="date"]'))enhance(node);
          if(node.querySelectorAll)node.querySelectorAll('input[type="date"]').forEach(enhance);
        }
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
    window.coachDaleDatePicker={enhance,open,scan};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();