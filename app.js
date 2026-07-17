const $ = s => document.querySelector(s);

const layouts = [
  {championship:4, plate:0},
  {championship:3, plate:1},
  {championship:2, plate:2},
  {championship:1, plate:3}
];

let state = {
  round:0,
  roundLength:900,
  remaining:900,
  eliminationCount:2,
  teams:[],
  courts:[],
  history:[],
  snapshots:[],
  timerRunning:false,
  timerId:null,
  availableCourts:[1,2,3,4],
  teamSidebarVisible:true
};

const teamCount = $("#teamCount");
for(let n=15;n<=25;n++){
  const o=document.createElement("option");
  o.value=n;o.textContent=n;
  if(n===22)o.selected=true;
  teamCount.appendChild(o);
}

function esc(v){
  return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function renderTeamInputs(preserve=true){
  const count=Number(teamCount.value);
  const old=preserve?[...document.querySelectorAll("#teamInputs input")].map(i=>i.value):[];
  const wrap=$("#teamInputs");
  wrap.innerHTML="";
  for(let i=0;i<count;i++){
    const div=document.createElement("div");
    div.className="team-input-wrap";
    div.innerHTML=`<span>${i+1}</span><input type="text" maxlength="40" placeholder="Team ${i+1}" value="${esc(old[i]||"")}">`;
    div.querySelector("input").addEventListener("input",updateProgress);
    wrap.appendChild(div);
  }
  updateProgress();
}

function updateProgress(){
  const inputs=[...document.querySelectorAll("#teamInputs input")];
  const complete=inputs.filter(i=>i.value.trim()).length;
  $("#teamProgress").textContent=`${complete} / ${inputs.length} complete`;
  $("#startBtn").disabled=complete!==inputs.length;
}

teamCount.addEventListener("change",()=>renderTeamInputs(true));
$("#fillDemoBtn").addEventListener("click",()=>{
  [...document.querySelectorAll("#teamInputs input")].forEach((input,i)=>input.value=`Team ${i+1}`);
  updateProgress();
});

function id(){
  return (crypto.randomUUID&&crypto.randomUUID())||`${Date.now()}-${Math.random()}`;
}

function distribute(items,count){
  if(count<=0)return[];
  const groups=Array.from({length:count},()=>[]);
  items.forEach((item,i)=>groups[i%count].push(item));
  return groups;
}

function makeCourts(champ,plate,layout){
  const available=(state.availableCourts?.length?state.availableCourts:[1,2,3,4])
    .slice().sort((a,b)=>a-b);
  const activeCourtCount=available.length;
  const courts=[];
  const smallEvent=state.teams.length>=15&&state.teams.length<=19;
  const finalRound=state.round>=4;

  if(activeCourtCount===0)return [];

  let desiredChampCourts;

  if(finalRound){
    desiredChampCourts=champ.length?1:0;
  }else if(state.round===3&&champ.length===6){
    desiredChampCourts=2;
  }else if(smallEvent&&state.round>=2&&champ.length>=4){
    desiredChampCourts=Math.min(4,Math.max(1,Math.floor(champ.length/4)));
  }else{
    desiredChampCourts=Math.min(layout.championship,Math.max(1,champ.length));
  }

  // Before the final, reserve one court for Plate whenever Plate teams exist,
  // but Championship has priority if only one court is available.
  let maxChampCourts=activeCourtCount;
  if(!finalRound&&plate.length&&activeCourtCount>1){
    maxChampCourts=activeCourtCount-1;
  }

  const champCourtCount=champ.length
    ?Math.max(1,Math.min(desiredChampCourts,maxChampCourts))
    :0;

  const champGroups=champCourtCount?distribute(champ,champCourtCount):[];
  champGroups.forEach((group,index)=>{
    courts.push({
      number:available[index],
      type:"championship",
      teams:group
    });
  });

  const remainingCourtNumbers=available.slice(champCourtCount);
  if(plate.length&&remainingCourtNumbers.length){
    const plateGroups=distribute(
      plate,
      Math.min(remainingCourtNumbers.length,plate.length)
    );
    plateGroups.forEach((group,index)=>{
      courts.push({
        number:remainingCourtNumbers[index],
        type:"plate",
        teams:group
      });
    });
  }

  // Keep unused but available courts visible.
  remainingCourtNumbers.slice(
    plate.length?Math.min(remainingCourtNumbers.length,plate.length):0
  ).forEach(number=>{
    if(!courts.some(c=>c.number===number)){
      courts.push({number,type:"plate",teams:[]});
    }
  });

  return courts.sort((a,b)=>a.number-b.number);
}
function startTournament(){
  const names=[...document.querySelectorAll("#teamInputs input")].map(i=>i.value.trim());
  if(names.some(n=>!n))return;
  state={
    round:1,
    roundLength:Number($("#roundLength").value),
    remaining:Number($("#roundLength").value),
    eliminationCount:Number($("#eliminationCount").value),
    teams:names.map(name=>({
      id:id(),name,status:"championship",previousStatus:"championship",
      active:true,score:0,total:0
    })),
    courts:[],
    history:[],
    snapshots:[],
    timerRunning:false,
    timerId:null,
    availableCourts:[1,2,3,4],
    teamSidebarVisible:true
  };
  const shuffled=[...state.teams].sort(()=>Math.random()-.5);
  state.courts=makeCourts(shuffled,[],layouts[0]);
  $("#setupView").classList.add("hidden");
  $("#tournamentView").classList.remove("hidden");
  persist();
  render();
}
$("#startBtn").addEventListener("click",startTournament);

function sorted(teams){
  return [...teams].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
}



function renderTeamSidebar(){
  const sidebar=$("#teamSidebar");
  const toggle=$("#teamSidebarToggle");
  const root=$("#teamChecklist");
  const layout=document.querySelector(".tournament-layout");
  if(!sidebar||!toggle||!root||!layout)return;

  const visible=state.teamSidebarVisible!==false;
  sidebar.classList.toggle("hidden-sidebar",!visible);
  layout.classList.toggle("sidebar-hidden",!visible);

  // Explicitly reset the layout width when the sidebar is hidden.
  if(visible){
    layout.style.display="";
    layout.style.gridTemplateColumns="";
    layout.style.width="";
  }else{
    layout.style.display="block";
    layout.style.gridTemplateColumns="none";
    layout.style.width="100%";
  }

  toggle.textContent=visible?"Hide teams":"Show teams";
  toggle.setAttribute("aria-expanded",String(visible));

  root.innerHTML=[...state.teams].sort((a,b)=>a.name.localeCompare(b.name)).map(team=>{
    const active=team.active!==false&&team.status!=="withdrawn";
    const label=active?(team.status==="championship"?"Championship":"Plate"):"Withdrawn";
    return `<label class="team-check-row ${active?"":"withdrawn"}">
      <input type="checkbox" data-team-id="${team.id}" ${active?"checked":""}>
      <span class="team-check-name">${esc(team.name)}
        <span class="team-check-meta">${label} · ${team.total+team.score} pts</span>
      </span>
    </label>`;
  }).join("");

  root.querySelectorAll("input").forEach(input=>{
    input.addEventListener("change",()=>setTeamActive(input.dataset.teamId,input.checked));
  });
}

function setTeamActive(teamId,isActive){
  const team=state.teams.find(t=>t.id===teamId);
  if(!team)return;

  if(isActive){
    team.active=true;
    team.status=team.previousStatus||"plate";
  }else{
    const activeCount=state.teams.filter(t=>t.active!==false&&t.status!=="withdrawn").length;
    if(activeCount<=1){
      alert("At least one team must remain active.");
      renderTeamSidebar();
      return;
    }
    if(team.status!=="withdrawn")team.previousStatus=team.status;
    team.active=false;
    team.status="withdrawn";
  }
  rescheduleCurrentRound();
}

function setAllTeamsActive(makeActive){
  const ordered=[...state.teams].sort((a,b)=>a.name.localeCompare(b.name));
  ordered.forEach((team,index)=>{
    if(makeActive||index===0){
      team.active=true;
      team.status=team.previousStatus||(team.status==="withdrawn"?"plate":team.status);
    }else{
      if(team.status!=="withdrawn")team.previousStatus=team.status;
      team.active=false;
      team.status="withdrawn";
    }
  });
  rescheduleCurrentRound();
}

function toggleTeamSidebar(force){
  state.teamSidebarVisible=typeof force==="boolean"?force:state.teamSidebarVisible===false;
  persist();
  renderTeamSidebar();
}

function renderCourtAvailability(){
  const root=$("#courtAvailability");
  if(!root)return;

  const available=new Set(state.availableCourts||[1,2,3,4]);
  root.innerHTML=[1,2,3,4].map(number=>`
    <label class="court-check ${available.has(number)?"":"unavailable"}">
      <input type="checkbox" data-court="${number}" ${available.has(number)?"checked":""}>
      Court ${number}
    </label>
  `).join("");

  root.querySelectorAll("input").forEach(input=>{
    input.addEventListener("change",()=>{
      const number=Number(input.dataset.court);
      const next=new Set(state.availableCourts||[1,2,3,4]);

      if(input.checked)next.add(number);
      else next.delete(number);

      if(next.size===0){
        input.checked=true;
        alert("At least one court must remain available.");
        return;
      }

      state.availableCourts=[...next].sort((a,b)=>a-b);
      rescheduleCurrentRound();
    });
  });
}

function rescheduleCurrentRound(){
  stopTimer();

  const champ=state.teams
    .filter(t=>t.active!==false&&t.status==="championship")
    .sort((a,b)=>b.score-a.score||b.total-a.total||a.name.localeCompare(b.name));
  const plate=state.teams
    .filter(t=>t.active!==false&&t.status==="plate")
    .sort((a,b)=>b.score-a.score||b.total-a.total||a.name.localeCompare(b.name));
  const layout=layouts[Math.min(state.round-1,layouts.length-1)];

  state.courts=makeCourts(champ,plate,layout);
  persist();
  render();
}

function updateCourtWarning(){
  const warning=$("#courtWarning");
  if(!warning)return;

  const available=state.availableCourts?.length||4;
  const champTeams=state.teams.filter(t=>t.status==="championship").length;
  const plateTeams=state.teams.filter(t=>t.status==="plate").length;
  let message="";

  if(available===1&&plateTeams&&state.round<4){
    message="Only one court is available, so Championship has priority. Plate play is paused until another court becomes available.";
  }else if(state.round===3&&champTeams===6&&available<3&&plateTeams){
    message="Two courts are being used for the Championship semifinals, so Plate play is paused until a third court is available.";
  }else if(state.round<4&&plateTeams&&available>1){
    message="Championship has priority and one available court is reserved for Plate play.";
  }else if(state.round>=4){
    message="Final round: Championship uses one court and every remaining available court is assigned to Plate play.";
  }

  warning.textContent=message;
  warning.classList.toggle("hidden",!message);
}

function render(){
  renderTimer();
  $("#roundTitle").textContent=`Round ${state.round}`;
  $("#roundNumber").textContent=state.round;
  const champ=state.teams.filter(t=>t.active!==false&&t.status==="championship");
  const plate=state.teams.filter(t=>t.active!==false&&t.status==="plate");
  $("#champCount").textContent=champ.length;
  $("#plateCount").textContent=plate.length;
  $("#playingCount").textContent=champ.length+plate.length;
  const layout=layouts[Math.min(state.round-1,layouts.length-1)];
  const activeChampCourts=state.courts.filter(c=>c.type==="championship"&&c.teams.length).length;
  const activePlateCourts=state.courts.filter(c=>c.type==="plate"&&c.teams.length).length;

  if(state.round===3){
    const champSizes=state.courts
      .filter(c=>c.type==="championship"&&c.teams.length)
      .map(c=>c.teams.length);
    const threePerCourt=champSizes.length===2&&champSizes.every(size=>size===3);

    $("#roundSummary").textContent=threePerCourt
      ?"Semifinal: three teams per court. The top two on each court plus the higher-scoring third-place team reach the five-team final."
      :"Semifinal: the top two from each court plus the best third-placed team reach the five-team final.";
  }else if(state.round>=4){
    $("#roundSummary").textContent=`Final on ${activeChampCourts} Championship court, with ${activePlateCourts} active Plate courts keeping everyone else playing.`;
  }else{
    $("#roundSummary").textContent=
      `${activeChampCourts} Championship court${activeChampCourts===1?"":"s"} and `+
      `${activePlateCourts} active Plate court${activePlateCourts===1?"":"s"}.`;
  }
  renderTeamSidebar();
  renderCourtAvailability();
  updateCourtWarning();
  renderCourts();
  renderStandings();
  renderHistory();
  $("#undoBtn").disabled=!state.snapshots.length;
}

function getRoundOutcome(){
  const champCourts=state.courts.filter(c=>c.type==="championship"&&c.teams.length);

  // Round 3 semifinal: the winner of each court qualifies, plus the
  // best third-placed team across both Championship courts.
  if(state.round===3 && champCourts.length===2){
    const rankings=champCourts.map(c=>sorted(c.teams));
    const thirdPlaced=rankings.map(r=>r[2]).filter(Boolean);
    const wildcard=thirdPlaced.sort((a,b)=>
      b.score-a.score || b.total-a.total || a.name.localeCompare(b.name)
    )[0] || null;
    const qualifiers=new Set();
    rankings.forEach(r=>r.slice(0,2).forEach(t=>qualifiers.add(t.id)));
    if(wildcard)qualifiers.add(wildcard.id);
    const movers=rankings.flat().filter(t=>!qualifiers.has(t.id));
    const automaticQualifiers=rankings.flatMap(r=>r.slice(0,2)).filter(Boolean);
    return {movers,wildcard,automaticQualifiers};
  }

  const twoCourtRoundTwo=state.round===2&&champCourts.length===2;

  const movers=champCourts.flatMap(c=>{
    const rank=sorted(c.teams);

    // When Round 2 has only two Championship courts, only the bottom
    // team on each court moves to Plate.
    if(twoCourtRoundTwo){
      return rank.length>2?rank.slice(-1):[];
    }

    // Standard rule: always leave at least two teams progressing.
    const cut=Math.min(state.eliminationCount,Math.max(0,rank.length-2));
    return cut?rank.slice(-cut):[];
  });

  return {movers,wildcard:null,twoCourtRoundTwo};
}

function renderCourts(){
  const root=$("#courts");root.innerHTML="";
  const outcome=getRoundOutcome();
  state.courts.forEach(court=>{
    const list=sorted(court.teams);
    const moverIds=new Set(outcome.movers.map(t=>t.id));
    const article=document.createElement("article");
    article.className="court card";
    article.innerHTML=`<div class="court-head">
      <div class="court-title">Court ${court.number}</div>
      <div class="badge ${court.type}">${court.type}</div>
    </div><div class="team-list"></div>`;
    const box=article.querySelector(".team-list");
    if(!list.length){
      box.innerHTML='<div class="empty">Court not used this round.</div>';
    }else{
      list.forEach((team,index)=>{
        const row=document.createElement("div");
        const moving=court.type==="championship"&&moverIds.has(team.id);
        const wildcard=state.round===3&&outcome.wildcard&&outcome.wildcard.id===team.id;
        row.className="team-row"+(index===0?" leader":"")+(moving?" drop":"");
        let status=index===0?"Leading":`Position ${index+1}`;
        if(state.round===3&&court.type==="championship"&&index<2){
          status=`Position ${index+1} · qualifies for final`;
        }else if(wildcard){
          status="Position 3 · best third place · qualifies for final";
        }else if(moving){
          status+=" · moves to Plate";
        }
        row.innerHTML=`<div><div class="team-name">${esc(team.name)}</div>
          <div class="team-sub">${status}</div></div>
          <div class="scorebox"><button class="ghost minus">−</button><div class="score">${team.score}</div><button class="primary plus">+</button></div>`;
        row.querySelector(".minus").onclick=()=>changeScore(team.id,-1);
        row.querySelector(".plus").onclick=()=>changeScore(team.id,1);
        box.appendChild(row);
      });
    }
    root.appendChild(article);
  });

  const activeNumbers=new Set(state.courts.map(c=>c.number));
  [1,2,3,4].filter(n=>!activeNumbers.has(n)).forEach(number=>{
    const article=document.createElement("article");
    article.className="court card";
    article.innerHTML=`<div class="court-head">
      <div class="court-title">Court ${number}</div>
      <div class="badge plate">Unavailable</div>
    </div><div class="empty">This court has been unticked and is not in use.</div>`;
    root.appendChild(article);
  });
}

function changeScore(teamId,delta){
  const t=state.teams.find(x=>x.id===teamId);
  if(!t)return;
  t.score=Math.max(0,t.score+delta);
  persist();
  renderCourts();
  renderStandings();
}

function renderTimer(){
  const m=Math.floor(state.remaining/60),s=state.remaining%60;
  const el=$("#timer");
  el.textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  el.classList.toggle("warning",state.remaining<=60&&state.remaining>0);
  el.classList.toggle("finished",state.remaining===0);
  $("#timerToggleBtn").textContent=state.timerRunning?"Pause timer":"Start timer";
}
function stopTimer(){
  state.timerRunning=false;
  clearInterval(state.timerId);state.timerId=null;
  renderTimer();persist();
}
$("#timerToggleBtn").addEventListener("click",()=>{
  if(state.timerRunning){stopTimer();return;}
  state.timerRunning=true;
  state.timerId=setInterval(()=>{
    state.remaining=Math.max(0,state.remaining-1);
    if(state.remaining===0)stopTimer();
    renderTimer();persist();
  },1000);
  renderTimer();
});
$("#timerResetBtn").addEventListener("click",()=>{stopTimer();state.remaining=state.roundLength;renderTimer();persist();});

function previewMovers(){
  return getRoundOutcome().movers;
}

$("#advanceBtn").addEventListener("click",()=>{
  const outcome=getRoundOutcome();
  const movers=outcome.movers;
  if(state.round===3 && outcome.wildcard){
    const qualifierNames=(outcome.automaticQualifiers||[]).map(t=>t.name).join(", ");
    $("#confirmText").textContent=`${qualifierNames} qualify by finishing in the top two on their courts. ${outcome.wildcard.name} qualifies as the best third-placed team. The final will therefore have five teams. ${movers.map(t=>t.name).join(", ")} will move into Plate play.`;
  }else if(state.round===2&&outcome.twoCourtRoundTwo){
    $("#confirmText").textContent=
      `${movers.map(t=>t.name).join(" and ")} will move into Plate play. `+
      `The remaining six Championship teams will be split into two Round 3 courts of three.`;
  }else{
    $("#confirmText").textContent=movers.length
      ?`${movers.map(t=>t.name).join(", ")} will move into Plate play.`
      :"The tournament will move to the next round.";
  }
  const dialog=$("#confirmDialog");
  dialog.showModal();
  const handler=()=>{
    dialog.removeEventListener("close",handler);
    if(dialog.returnValue==="confirm")advanceRound();
  };
  dialog.addEventListener("close",handler);
});

function snapshot(){
  return JSON.stringify({...state,timerRunning:false,timerId:null,snapshots:[]});
}

function advanceRound(){
  stopTimer();
  state.snapshots.push(snapshot());
  const movers=previewMovers();
  movers.forEach(t=>t.status="plate");
  const outcome=getRoundOutcome();
  state.history.push({
    round:state.round,
    moved:movers.map(t=>t.name),
    finalists:state.round===3
      ?[...(outcome.automaticQualifiers||[]),outcome.wildcard].filter(Boolean).map(t=>t.name)
      :[],
    wildcard:state.round===3?outcome.wildcard?.name:null
  });
  state.teams.forEach(t=>{if(t.active!==false&&t.status!=="withdrawn"){t.total+=t.score;t.score=0;}});
  state.round++;
  state.remaining=state.roundLength;
  const champ=state.teams.filter(t=>t.active!==false&&t.status==="championship").sort((a,b)=>b.total-a.total||Math.random()-.5);
  const plate=state.teams.filter(t=>t.active!==false&&t.status==="plate").sort((a,b)=>b.total-a.total||Math.random()-.5);
  const layout=layouts[Math.min(state.round-1,layouts.length-1)];
  state.courts=makeCourts(champ,plate,layout);
  persist();render();
}

$("#undoBtn").addEventListener("click",()=>{
  if(!state.snapshots.length)return;
  stopTimer();
  const previous=JSON.parse(state.snapshots.pop());
  const remainingSnapshots=[...state.snapshots];
  state={
    ...previous,
    snapshots:remainingSnapshots,
    timerRunning:false,
    timerId:null,
    availableCourts:previous.availableCourts?.length?previous.availableCourts:[1,2,3,4]
  };
  normalizeTeamState();persist();render();
});


function teamCourt(teamId){
  const team=state.teams.find(t=>t.id===teamId);
  if(team?.status==="withdrawn"||team?.active===false)return "Withdrawn";
  const court=state.courts.find(c=>c.teams.some(t=>t.id===teamId));
  return court?`Court ${court.number}`:"—";
}

function renderStandings(){
  const body=$("#standingsBody");
  if(!body)return;

  const ranked=[...state.teams].sort((a,b)=>{
    const order=s=>s==="championship"?0:s==="plate"?1:2;
    const statusOrder=order(a.status)-order(b.status);
    if(statusOrder!==0)return statusOrder;

    const totalA=a.total+a.score;
    const totalB=b.total+b.score;
    return totalB-totalA || b.score-a.score || a.name.localeCompare(b.name);
  });

  body.innerHTML=ranked.map((team,index)=>{
    const total=team.total+team.score;
    return `<tr class="${index===0?"current-leader":""}">
      <td class="rank-cell">${index+1}</td>
      <td class="team-cell">${esc(team.name)}</td>
      <td>${team.status==="withdrawn"
        ?'<span class="withdrawn-chip">Withdrawn</span>'
        :`<span class="comp-chip ${team.status}">${esc(team.status)}</span>`
      }</td>
      <td>${teamCourt(team.id)}</td>
      <td class="numeric">${team.score}</td>
      <td class="numeric">${total}</td>
    </tr>`;
  }).join("");
}

function renderHistory(){
  const root=$("#history");
  if(!state.history.length){root.innerHTML='<div class="empty">No completed rounds yet.</div>';return;}
  root.innerHTML=state.history.slice().reverse().map(h=>`<div class="history-item">
    <strong>Round ${h.round}</strong>
    <p>${h.finalists?.length
      ?`${esc(h.finalists.join(", "))} qualified for the five-team final. ${esc(h.wildcard)} advanced as the best third-placed team.`
      :(h.moved.length?esc(h.moved.join(", "))+" moved to Plate play.":"No teams moved.")
    }</p>
  </div>`).join("");
}


function normalizeTeamState(){
  state.teamSidebarVisible=state.teamSidebarVisible!==false;
  state.teams=state.teams.map(team=>({
    ...team,
    active:team.active!==false&&team.status!=="withdrawn",
    previousStatus:team.previousStatus||(team.status==="withdrawn"?"plate":team.status)
  }));
}

function persist(){
  localStorage.setItem("kq-manager",JSON.stringify({...state,timerRunning:false,timerId:null}));
}

$("#saveBtn").addEventListener("click",()=>{
  if(!state.round){alert("Start a tournament first.");return;}
  const blob=new Blob([JSON.stringify({...state,timerRunning:false,timerId:null},null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`king-queen-round-${state.round}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("#loadBtn").addEventListener("click",()=>$("#loadFile").click());
$("#loadFile").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    state={
      ...data,
      timerRunning:false,
      timerId:null,
      snapshots:data.snapshots||[],
      availableCourts:data.availableCourts?.length?data.availableCourts:[1,2,3,4]
    };
    $("#setupView").classList.add("hidden");
    $("#tournamentView").classList.remove("hidden");
    normalizeTeamState();persist();render();
  }catch{alert("That save file could not be loaded.");}
  e.target.value="";
});

$("#teamSidebarToggle").addEventListener("click",()=>toggleTeamSidebar());
$("#teamSidebarClose").addEventListener("click",()=>toggleTeamSidebar(false));
$("#selectAllTeamsBtn").addEventListener("click",()=>setAllTeamsActive(true));
$("#clearAllTeamsBtn").addEventListener("click",()=>setAllTeamsActive(false));

$("#resetBtn").addEventListener("click",()=>{
  if(!confirm("Reset the tournament and return to setup?"))return;
  stopTimer();
  localStorage.removeItem("kq-manager");
  location.reload();
});

$("#exportBtn").addEventListener("click",()=>{
  const rows=[["Team","Status","Cumulative points"]];
  [...state.teams].sort((a,b)=>b.total+b.score-(a.total+a.score)).forEach(t=>{
    rows.push([t.name,t.status,t.total+t.score]);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download="king-queen-standings.csv";
  a.click();URL.revokeObjectURL(a.href);
});

renderTeamInputs(false);
const saved=localStorage.getItem("kq-manager");
if(saved){
  try{
    const parsed=JSON.parse(saved);
    if(parsed.round>0&&parsed.teams?.length){
      state={
        ...parsed,
        timerRunning:false,
        timerId:null,
        snapshots:parsed.snapshots||[],
        availableCourts:parsed.availableCourts?.length?parsed.availableCourts:[1,2,3,4]
      };
      $("#setupView").classList.add("hidden");
      $("#tournamentView").classList.remove("hidden");
      normalizeTeamState();
      render();
    }
  }catch{}
}
