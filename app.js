const $ = (selector) => document.querySelector(selector);

const setupPanel = $("#setupPanel");
const tournamentPanel = $("#tournamentPanel");
const courtsGrid = $("#courtsGrid");
const teamInput = $("#teamInput");
const teamCountSelect = $("#teamCount");
const enteredCount = $("#enteredCount");
const timerEl = $("#timer");
const roundBadge = $("#roundBadge");
const championshipCount = $("#championshipCount");
const plateCount = $("#plateCount");
const totalCount = $("#totalCount");
const historyEl = $("#history");
const confirmDialog = $("#confirmDialog");
const dialogMessage = $("#dialogMessage");

let state = {
  round: 0,
  roundSeconds: 900,
  remainingSeconds: 900,
  eliminationCount: 2,
  teams: [],
  courts: [],
  timerRunning: false,
  timerId: null,
  history: []
};

const ROUND_LAYOUTS = [
  { championship: 4, plate: 0 },
  { championship: 3, plate: 1 },
  { championship: 2, plate: 2 },
  { championship: 1, plate: 3 }
];

function saveState() {
  const copy = { ...state, timerRunning: false, timerId: null };
  localStorage.setItem("kqScoreboardState", JSON.stringify(copy));
}

function loadState() {
  const saved = localStorage.getItem("kqScoreboardState");
  if (!saved) return false;
  try {
    state = { ...state, ...JSON.parse(saved), timerRunning: false, timerId: null };
    return state.round > 0 && state.teams.length > 0;
  } catch {
    return false;
  }
}

function createTeams(names) {
  return names.map((name, index) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}`,
    name,
    status: "championship",
    score: 0,
    totalScore: 0
  }));
}

function balancedDistribute(teams, courtCount) {
  if (courtCount <= 0) return [];
  const groups = Array.from({ length: courtCount }, () => []);
  teams.forEach((team, index) => groups[index % courtCount].push(team));
  return groups;
}

function buildCourts(champTeams, plateTeams, layout) {
  const champGroups = balancedDistribute(champTeams, layout.championship);
  const plateGroups = balancedDistribute(plateTeams, layout.plate);
  const courts = [];

  champGroups.forEach((teams, i) => {
    courts.push({ id: `C${i+1}`, number: courts.length + 1, type: "championship", teams });
  });
  plateGroups.forEach((teams, i) => {
    courts.push({ id: `P${i+1}`, number: courts.length + 1, type: "plate", teams });
  });

  while (courts.length < 4) {
    courts.push({ id: `E${courts.length+1}`, number: courts.length + 1, type: "plate", teams: [] });
  }
  return courts;
}

function initialiseTournament() {
  const requiredTeamCount = Number(teamCountSelect.value);
  const names = teamInput.value
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  if (names.length !== requiredTeamCount) {
    alert(`Please enter exactly ${requiredTeamCount} team names. You currently have ${names.length}.`);
    return;
  }

  state.round = 1;
  state.roundSeconds = Number($("#roundLength").value);
  state.remainingSeconds = state.roundSeconds;
  state.eliminationCount = Number($("#eliminationCount").value);
  state.teams = createTeams(names);
  state.history = [];
  state.timerRunning = false;

  const shuffled = [...state.teams].sort(() => Math.random() - 0.5);
  state.courts = buildCourts(shuffled, [], ROUND_LAYOUTS[0]);

  setupPanel.classList.add("hidden");
  tournamentPanel.classList.remove("hidden");
  saveState();
  render();
}

function sortedTeams(teams) {
  return [...teams].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function renderCourts() {
  courtsGrid.innerHTML = "";

  state.courts.forEach(court => {
    const sorted = sortedTeams(court.teams);
    const eliminationStart = court.type === "championship"
      ? Math.max(0, sorted.length - state.eliminationCount)
      : Infinity;

    const courtEl = document.createElement("article");
    courtEl.className = "court";
    courtEl.innerHTML = `
      <div class="court-header">
        <div class="court-title">Court ${court.number}</div>
        <div class="court-type ${court.type}">
          ${court.type === "championship" ? "Championship" : "Plate"}
        </div>
      </div>
      <div class="team-list"></div>
    `;

    const list = courtEl.querySelector(".team-list");
    if (!sorted.length) {
      list.innerHTML = `<div class="empty-court">Court currently unused.</div>`;
    } else {
      sorted.forEach((team, index) => {
        const row = document.createElement("div");
        row.className = "team-row";
        if (index === 0) row.classList.add("leading");
        if (index >= eliminationStart && court.type === "championship") {
          row.classList.add("elimination-zone");
        }

        row.innerHTML = `
          <div class="team-meta">
            <div class="team-name">${escapeHtml(team.name)}</div>
            <div class="team-rank">
              ${index === 0 ? "Leading" : `Position ${index + 1}`}
              ${court.type === "championship" && index >= eliminationStart ? " · moving to Plate" : ""}
            </div>
          </div>
          <div class="score-controls">
            <button class="minus" aria-label="Subtract point">−</button>
            <div class="score">${team.score}</div>
            <button class="plus" aria-label="Add point">+</button>
          </div>
        `;

        row.querySelector(".minus").addEventListener("click", () => changeScore(team.id, -1));
        row.querySelector(".plus").addEventListener("click", () => changeScore(team.id, 1));
        list.appendChild(row);
      });
    }
    courtsGrid.appendChild(courtEl);
  });
}

function changeScore(teamId, amount) {
  const team = state.teams.find(t => t.id === teamId);
  if (!team) return;
  team.score = Math.max(0, team.score + amount);
  saveState();
  renderCourts();
}

function renderTimer() {
  const mins = Math.floor(state.remainingSeconds / 60);
  const secs = state.remainingSeconds % 60;
  timerEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  timerEl.classList.toggle("warning", state.remainingSeconds <= 60 && state.remainingSeconds > 0);
  timerEl.classList.toggle("finished", state.remainingSeconds === 0);
  $("#startPauseBtn").textContent = state.timerRunning ? "Pause" : "Start";
}

function renderStatus() {
  const champ = state.teams.filter(t => t.status === "championship").length;
  const plate = state.teams.filter(t => t.status === "plate").length;
  championshipCount.textContent = champ;
  plateCount.textContent = plate;
  totalCount.textContent = state.teams.length;
  roundBadge.textContent = `Round ${state.round}`;
}

function renderHistory() {
  if (!state.history.length) {
    historyEl.innerHTML = `<p class="empty-court">No rounds completed yet.</p>`;
    return;
  }

  historyEl.innerHTML = state.history
    .slice()
    .reverse()
    .map(item => `
      <div class="history-entry">
        <strong>Round ${item.round} completed</strong>
        <p>${escapeHtml(item.summary)}</p>
      </div>
    `).join("");
}

function render() {
  renderTimer();
  renderStatus();
  renderCourts();
  renderHistory();
}

function toggleTimer() {
  if (state.timerRunning) {
    stopTimer();
    return;
  }
  state.timerRunning = true;
  state.timerId = setInterval(() => {
    state.remainingSeconds = Math.max(0, state.remainingSeconds - 1);
    if (state.remainingSeconds === 0) stopTimer();
    renderTimer();
    saveState();
  }, 1000);
  renderTimer();
}

function stopTimer() {
  state.timerRunning = false;
  clearInterval(state.timerId);
  state.timerId = null;
  renderTimer();
  saveState();
}

function resetTimer() {
  stopTimer();
  state.remainingSeconds = state.roundSeconds;
  renderTimer();
  saveState();
}

function resetScores() {
  state.teams.forEach(team => {
    team.totalScore += team.score;
    team.score = 0;
  });
}

function advanceRound() {
  stopTimer();

  const currentChampCourts = state.courts.filter(c => c.type === "championship" && c.teams.length);
  const newlyPlate = [];

  currentChampCourts.forEach(court => {
    const ranking = sortedTeams(court.teams);
    const cut = Math.min(state.eliminationCount, Math.max(0, ranking.length - 1));
    ranking.slice(-cut).forEach(team => {
      team.status = "plate";
      newlyPlate.push(team);
    });
  });

  const completedRound = state.round;
  const movedNames = newlyPlate.map(t => t.name);
  state.history.push({
    round: completedRound,
    summary: movedNames.length
      ? `${movedNames.join(", ")} moved from the Championship to the Plate courts.`
      : "No teams moved divisions."
  });

  resetScores();
  state.round += 1;
  state.remainingSeconds = state.roundSeconds;

  const champTeams = state.teams.filter(t => t.status === "championship");
  const plateTeams = state.teams.filter(t => t.status === "plate");

  let layout;
  if (state.round <= ROUND_LAYOUTS.length) {
    layout = ROUND_LAYOUTS[state.round - 1];
  } else {
    layout = { championship: 1, plate: 3 };
  }

  // Prevent more active courts than available teams.
  layout = {
    championship: Math.min(layout.championship, Math.max(1, champTeams.length)),
    plate: plateTeams.length ? Math.min(layout.plate, plateTeams.length) : 0
  };

  const champSeeded = seedTeams(champTeams);
  const plateSeeded = seedTeams(plateTeams);
  state.courts = buildCourts(champSeeded, plateSeeded, layout);

  saveState();
  render();
}

function seedTeams(teams) {
  // Serpentine-style redistribution based on cumulative score, then random tie break.
  return [...teams].sort((a, b) => b.totalScore - a.totalScore || Math.random() - 0.5);
}

function requestAdvance() {
  const champCourts = state.courts.filter(c => c.type === "championship" && c.teams.length);
  const moving = champCourts.flatMap(c => {
    const ranked = sortedTeams(c.teams);
    const cut = Math.min(state.eliminationCount, Math.max(0, ranked.length - 1));
    return ranked.slice(-cut).map(t => t.name);
  });

  dialogMessage.textContent = moving.length
    ? `The following teams will move to the Plate courts: ${moving.join(", ")}.`
    : "The tournament will move to the next round.";
  confirmDialog.showModal();

  confirmDialog.addEventListener("close", function handler() {
    confirmDialog.removeEventListener("close", handler);
    if (confirmDialog.returnValue === "confirm") advanceRound();
  });
}

function resetTournament() {
  if (!confirm("Reset the entire tournament and return to setup?")) return;
  stopTimer();
  localStorage.removeItem("kqScoreboardState");
  location.reload();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

function generateTeamNames(count) {
  teamInput.value = Array.from({ length: count }, (_, i) => `Team ${i + 1}`).join("\n");
  updateEnteredCount();
}

function updateEnteredCount() {
  const entered = teamInput.value.split("\n").map(s => s.trim()).filter(Boolean).length;
  const required = Number(teamCountSelect.value);
  enteredCount.value = `${entered} / ${required}`;
}

for (let count = 15; count <= 25; count += 1) {
  const option = document.createElement("option");
  option.value = count;
  option.textContent = `${count} teams`;
  if (count === 22) option.selected = true;
  teamCountSelect.appendChild(option);
}

teamCountSelect.addEventListener("change", () => {
  generateTeamNames(Number(teamCountSelect.value));
});
teamInput.addEventListener("input", updateEnteredCount);
$("#loadDemoBtn").addEventListener("click", () => {
  generateTeamNames(Number(teamCountSelect.value));
});
$("#startTournamentBtn").addEventListener("click", initialiseTournament);
$("#startPauseBtn").addEventListener("click", toggleTimer);
$("#resetTimerBtn").addEventListener("click", resetTimer);
$("#advanceBtn").addEventListener("click", requestAdvance);
$("#resetTournamentBtn").addEventListener("click", resetTournament);

if (loadState()) {
  setupPanel.classList.add("hidden");
  tournamentPanel.classList.remove("hidden");
  render();
} else {
  generateTeamNames(22);
}
