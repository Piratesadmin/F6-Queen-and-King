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
  timerId:null
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
  const courts=[];
  distribute(champ,Math.min(layout.championship,Math.max(1,champ.length))).forEach(group=>{
    courts.push({number:courts.length+1,type:"championship",teams:group});
  });
  if(plate.length){
    distribute(plate,Math.min(layout.plate,plate.length)).forEach(group=>{
      courts.push({number:courts.length+1,type:"plate",teams:group});
    });
  }
  while(courts.length<4)courts.push({number:courts.length+1,type:"plate",teams:[]});
  return courts.slice(0,4);
}

function startTournament(){
  const names=[...document.querySelectorAll("#teamInputs input")].map(i=>i.value.trim());
  if(names.some(n=>!n))return;
  state={
    round:1,
    roundLength:Number($("#roundLength").value),
    remaining:Number($("#roundLength").value),
    eliminationCount:Number($("#eliminationCount").value),
    teams:names.map(name=>({id:id(),name,status:"championship",score:0,total:0})),
    courts:[],
    history:[],
    snapshots:[],
    timerRunning:false,
    timerId:null
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

function render(){
  renderTimer();
  $("#roundTitle").textContent=`Round ${state.round}`;
  $("#roundNumber").textContent=state.round;
  const champ=state.teams.filter(t=>t.status==="championship");
  const plate=state.teams.filter(t=>t.status==="plate");
  $("#champCount").textContent=champ.length;
  $("#plateCount").textContent=plate.length;
  $("#playingCount").textContent=state.teams.length;
  const layout=layouts[Math.min(state.round-1,layouts.length-1)];
  if(state.round===3){
    $("#roundSummary").textContent="Semifinal: each court winner plus the best third-placed team reach the three-team final.";
  }else if(state.round>=4){
    $("#roundSummary").textContent=`Final on 1 Championship court, with ${layout.plate} Plate courts keeping everyone else playing.`;
  }else{
    $("#roundSummary").textContent=`${layout.championship} Championship court${layout.championship===1?"":"s"} and ${layout.plate} Plate court${layout.plate===1?"":"s"}.`;
  }
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
    rankings.forEach(r=>r.slice(0,1).forEach(t=>qualifiers.add(t.id)));
    if(wildcard)qualifiers.add(wildcard.id);
    const movers=rankings.flat().filter(t=>!qualifiers.has(t.id));
    const winners=rankings.map(r=>r[0]).filter(Boolean);
    return {movers,wildcard,winners};
  }

  const movers=champCourts.flatMap(c=>{
    const rank=sorted(c.teams);
    // Never eliminate so many teams that fewer than two remain on a court.
    // Examples: 6 teams -> eliminate 2; 4 teams -> eliminate 2;
    // 3 teams -> eliminate 1; 2 teams -> eliminate 0.
    const cut=Math.min(state.eliminationCount,Math.max(0,rank.length-2));
    return rank.slice(-cut);
  });
  return {movers,wildcard:null};
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
        if(state.round===3&&court.type==="championship"&&index===0){
          status="Court winner · qualifies for final";
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
    const winnerNames=(outcome.winners||[]).map(t=>t.name).join(" and ");
    $("#confirmText").textContent=`${winnerNames} qualify as the two court winners. ${outcome.wildcard.name} qualifies as the best third-placed team. The final will therefore have three teams. ${movers.map(t=>t.name).join(", ")} will move into Plate play.`;
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
      ?[...(outcome.winners||[]),outcome.wildcard].filter(Boolean).map(t=>t.name)
      :[],
    wildcard:state.round===3?outcome.wildcard?.name:null
  });
  state.teams.forEach(t=>{t.total+=t.score;t.score=0;});
  state.round++;
  state.remaining=state.roundLength;
  const champ=state.teams.filter(t=>t.status==="championship").sort((a,b)=>b.total-a.total||Math.random()-.5);
  const plate=state.teams.filter(t=>t.status==="plate").sort((a,b)=>b.total-a.total||Math.random()-.5);
  const layout=layouts[Math.min(state.round-1,layouts.length-1)];
  state.courts=makeCourts(champ,plate,layout);
  persist();render();
}

$("#undoBtn").addEventListener("click",()=>{
  if(!state.snapshots.length)return;
  stopTimer();
  const previous=JSON.parse(state.snapshots.pop());
  const remainingSnapshots=[...state.snapshots];
  state={...previous,snapshots:remainingSnapshots,timerRunning:false,timerId:null};
  persist();render();
});


function teamCourt(teamId){
  const court=state.courts.find(c=>c.teams.some(t=>t.id===teamId));
  return court?`Court ${court.number}`:"—";
}

function renderStandings(){
  const body=$("#standingsBody");
  if(!body)return;

  const ranked=[...state.teams].sort((a,b)=>{
    const statusOrder=(a.status==="championship"?0:1)-(b.status==="championship"?0:1);
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
      <td><span class="comp-chip ${team.status}">${esc(team.status)}</span></td>
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
      ?`${esc(h.finalists.join(", "))} qualified for the three-team final. ${esc(h.wildcard)} advanced as the best third-placed team.`
      :(h.moved.length?esc(h.moved.join(", "))+" moved to Plate play.":"No teams moved.")
    }</p>
  </div>`).join("");
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
    state={...data,timerRunning:false,timerId:null,snapshots:data.snapshots||[]};
    $("#setupView").classList.add("hidden");
    $("#tournamentView").classList.remove("hidden");
    persist();render();
  }catch{alert("That save file could not be loaded.");}
  e.target.value="";
});

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
      state={...parsed,timerRunning:false,timerId:null,snapshots:parsed.snapshots||[]};
      $("#setupView").classList.add("hidden");
      $("#tournamentView").classList.remove("hidden");
      render();
    }
  }catch{}
}
