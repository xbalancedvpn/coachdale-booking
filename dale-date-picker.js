/* Coach Dale - Alpine Elite calendar v2. Every static and dynamically added date field. */
(() => {
  "use strict";
  const pad = n => String(n).padStart(2, "0");
  const iso = d => [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join("-");
  const parse = value => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
  };
  const philippinesToday = () => {
    const parts = new Intl.DateTimeFormat("en-US", {timeZone:"Asia/Manila", year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, +p.value]));
    return new Date(values.year, values.month - 1, values.day);
  };
  const nice = d => d.toLocaleDateString("en-PH", {weekday:"short", month:"short", day:"numeric", year:"numeric"});
  const sameMonth = (a,b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  let active = null, viewing = null, dialog = null;

  function labelFor(input) {
    const found = input.closest("label") || [...document.querySelectorAll("label[for]")].find(l => l.getAttribute("for") === input.id);
    if (!found) return "Choose a date";
    const clone = found.cloneNode(true);
    clone.querySelectorAll("input,select,textarea,button").forEach(el => el.remove());
    return clone.textContent.trim().replace(/\s+/g," ").slice(0,70) || "Choose a date";
  }

  function allowed(d) {
    if (!active) return false;
    const min = parse(active.getAttribute("min")), max = parse(active.getAttribute("max"));
    return (!min || d >= min) && (!max || d <= max);
  }

  const iconMarkup = () => '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3"/></svg>';

  function ensure() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "daleDatePickerDialog";
    dialog.className = "dale-cal-dialog";
    dialog.setAttribute("aria-labelledby","daleDateTitle");
    dialog.innerHTML = [
      '<div class="dale-cal-sheet">',
      '<div class="dale-cal-top">',
      '<div class="dale-cal-brand">',
      '<img src="assets/branding/coach-dale-favicon.png" alt="" width="46" height="46">',
      '<div><span>COACH DALE / ALPINE ELITE</span><h2 id="daleDateTitle">Choose a date</h2></div></div>',
      '<button id="daleDateClose" class="dale-cal-close" type="button" aria-label="Close calendar">×</button>',
      '</div><div class="dale-cal-inner">',
      '<div class="dale-cal-intro"><span>YOUR SESSION DATE</span><strong id="daleDateSelected">Select your date</strong></div>',
      '<div class="dale-cal-monthline">',
      '<button id="daleDatePrev" type="button" aria-label="Previous month">‹</button>',
      '<strong id="daleDateMonth" aria-live="polite"></strong>',
      '<button id="daleDateNext" type="button" aria-label="Next month">›</button></div>',
      '<div class="dale-cal-weekdays" aria-hidden="true"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>',
      '<div id="daleDateGrid" class="dale-cal-grid" aria-label="Calendar dates"></div>',
      '<div class="dale-cal-quick"><span>QUICK SELECT</span>',
      '<button id="daleDateToday" type="button">Today</button>',
      '<button id="daleDateTomorrow" type="button">Tomorrow</button>',
      '<button id="daleDateNextWeek" type="button">Next week</button>',
      '</div></div>',
      '<div class="dale-cal-footer"><span>Philippine Standard Time (PHT)</span><button id="daleDateDone" type="button">Done</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(dialog);
    dialog.querySelector("#daleDateClose").addEventListener("click", close);
    dialog.querySelector("#daleDateDone").addEventListener("click", close);
    dialog.querySelector("#daleDatePrev").addEventListener("click", () => shift(-1));
    dialog.querySelector("#daleDateNext").addEventListener("click", () => shift(1));
    const nextMonday = () => {
      const d = philippinesToday();
      d.setDate(d.getDate() + (8 - (d.getDay() || 7)));
      return d;
    };
    for (const [id, fn] of [["daleDateToday", philippinesToday],
                            ["daleDateTomorrow", () => {const d=philippinesToday();d.setDate(d.getDate()+1);return d;}],
                            ["daleDateNextWeek", nextMonday]]) {
      dialog.querySelector("#" + id).addEventListener("click", () => choose(fn()));
    }
    dialog.querySelector("#daleDateGrid").addEventListener("keydown", event => {
      const current = event.target.closest("button[data-date]");
      if (!current) return;
      const move = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
      if (!move) return;
      event.preventDefault();
      const date = parse(current.dataset.date);
      date.setDate(date.getDate() + move);
      if (!allowed(date)) return;
      if (!sameMonth(date, viewing)) {
        viewing = new Date(date.getFullYear(),date.getMonth(),1);
        render();
      }
      dialog.querySelector('[data-date="'+iso(date)+'"]')?.focus();
    });
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    return dialog;
  }

  function close() {
    if (dialog?.open) dialog.close();
    if (active) {
      try { active.focus({preventScroll:true}); } catch (_) { active.focus(); }
    }
  }

  function choose(date) {
    if (!active || !allowed(date)) return;
    active.value = iso(date);
    active.dispatchEvent(new Event("input", {bubbles:true}));
    active.dispatchEvent(new Event("change", {bubbles:true}));
    close();
  }

  function shift(direction) {
    if (!viewing) return;
    viewing = new Date(viewing.getFullYear(), viewing.getMonth() + direction, 1);
    render();
  }

  function render() {
    if (!active) return;
    const popup = ensure();
    popup.querySelector("#daleDateMonth").textContent = viewing.toLocaleDateString("en-PH",{month:"long",year:"numeric"});
    const picked = parse(active.value), base = picked || philippinesToday();
    popup.querySelector("#daleDateSelected").textContent = nice(base);
    const earliest = parse(active.getAttribute("min")), latest = parse(active.getAttribute("max"));
    const first = new Date(viewing.getFullYear(),viewing.getMonth(),1);
    const end = new Date(viewing.getFullYear(),viewing.getMonth()+1,0);
    popup.querySelector("#daleDatePrev").disabled = !!earliest && new Date(viewing.getFullYear(),viewing.getMonth(),0) < earliest;
    popup.querySelector("#daleDateNext").disabled = !!latest && new Date(viewing.getFullYear(),viewing.getMonth()+1,1) > latest;
    const grid = popup.querySelector("#daleDateGrid");
    grid.replaceChildren();
    const offset = (first.getDay()+6)%7;
    for (let i=0; i<offset; i++) {
      const blank = document.createElement("span");
      blank.className = "dale-cal-blank";
      blank.setAttribute("aria-hidden","true");
      grid.append(blank);
    }
    const today = philippinesToday();
    for (let number=1; number<=end.getDate(); number++) {
      const date = new Date(viewing.getFullYear(),viewing.getMonth(),number);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dale-cal-day";
      button.dataset.date = iso(date);
      button.textContent = number;
      button.setAttribute("aria-label", date.toLocaleDateString("en-PH",{weekday:"long",month:"long",day:"numeric",year:"numeric"}));
      if (iso(date) === iso(today)) {
        button.classList.add("today");
        button.setAttribute("aria-current","date");
      }
      if (picked && iso(date) === iso(picked)) {
        button.classList.add("selected");
        button.setAttribute("aria-pressed","true");
      }
      if (!allowed(date)) button.disabled = true;
      else button.addEventListener("click", () => choose(date));
      grid.append(button);
    }
    for (const [id,date] of [
      ["daleDateToday",today],
      ["daleDateTomorrow",new Date(today.getFullYear(),today.getMonth(),today.getDate()+1)],
      ["daleDateNextWeek",new Date(today.getFullYear(),today.getMonth(),today.getDate()+(8-(today.getDay()||7)))]
    ]) popup.querySelector("#"+id).disabled = !allowed(date);
  }

  function open(input) {
    if (!input || input.disabled) return;
    active = input;
    const picked = parse(input.value), earliest = parse(input.getAttribute("min"));
    const date = picked || (earliest && earliest > philippinesToday() ? earliest : philippinesToday());
    viewing = new Date(date.getFullYear(),date.getMonth(),1);
    const popup = ensure();
    popup.querySelector("#daleDateTitle").textContent = labelFor(input);
    render();
    if (!popup.open) popup.showModal();
    const focusDate = picked && allowed(picked) ? picked : date;
    const preferred = popup.querySelector('[data-date="'+iso(focusDate)+'"]');
    const fallback = popup.querySelector(".dale-cal-day:not(:disabled)");
    (preferred || fallback || popup.querySelector("#daleDateClose")).focus();
  }

  function enhance(input) {
    if (!input || input.dataset.daleCalendarReady === "1") return;
    input.dataset.daleCalendarReady = "1";
    const control = document.createElement("div");
    control.className = "dale-date-control";
    input.parentNode.insertBefore(control, input);
    control.append(input);
    const symbol = document.createElement("span");
    symbol.className = "dale-date-symbol";
    symbol.setAttribute("aria-hidden","true");
    symbol.innerHTML = iconMarkup();
    const trigger = document.createElement("button");
    trigger.className = "dale-date-trigger";
    trigger.type = "button";
    trigger.textContent = "SELECT";
    trigger.setAttribute("aria-label","Open "+labelFor(input)+" calendar");
    trigger.addEventListener("click",event=>{event.preventDefault();open(input)});
    control.append(symbol, trigger);
    input.type = "text";
    input.readOnly = true;
    input.autocomplete = "off";
    input.inputMode = "none";
    input.classList.add("dale-date-input");
    input.setAttribute("aria-haspopup","dialog");
    input.setAttribute("aria-controls","daleDatePickerDialog");
    input.placeholder = "Select date";
    input.addEventListener("click", () => open(input));
    input.addEventListener("keydown",event => {
      if (["Enter"," ","ArrowDown"].includes(event.key)) {
        event.preventDefault();open(input);
      }
    });
  }

  function scan(root=document) {
    if (root.matches?.('input[type="date"]')) enhance(root);
    root.querySelectorAll?.('input[type="date"]').forEach(enhance);
  }

  function init() {
    ensure();
    scan();
    const observer = new MutationObserver(records => {
      for (const record of records) for (const item of record.addedNodes) if (item.nodeType === 1) scan(item);
    });
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("pageshow",() => scan());
    window.coachDaleDatePicker = {open,close,scan,enhance};
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();