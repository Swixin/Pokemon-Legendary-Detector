const STATS = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "spAtk", label: "Sp. Atk" },
  { key: "spDef", label: "Sp. Def" },
  { key: "speed", label: "Speed" },
];

const TYPES = [
  "Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting", "Fire", "Flying", "Ghost",
  "Grass", "Ground", "Ice", "Normal", "Poison", "Psychic", "Rock", "Steel", "Water",
];

const GENERATIONS = [1, 2, 3, 4, 5, 6];

const MODEL_NAMES = {
  brf: "Balanced Random Forest",
  logreg: "Logistic Regression",
  svm: "Support Vector Machine",
  "k-neighbors": "K-Nearest Neighbors",
  rfc: "Random Forest",
};

const PRESETS = {
  mewtwo: { hp: 106, attack: 110, defense: 90, spAtk: 154, spDef: 90, speed: 130, type1: "Psychic", type2: "None", generation: 1 },
  pikachu: { hp: 35, attack: 55, defense: 40, spAtk: 50, spDef: 50, speed: 90, type1: "Electric", type2: "None", generation: 1 },
  snorlax: { hp: 160, attack: 110, defense: 65, spAtk: 65, spDef: 110, speed: 30, type1: "Normal", type2: "None", generation: 1 },
};

const $ = (id) => document.getElementById(id);
const form = $("scan-form");
const result = $("result");
const inputs = {};

function option(value, text) {
  const el = document.createElement("option");
  el.value = value;
  el.textContent = text ?? value;
  return el;
}

function buildForm() {
  for (const { key, label } of STATS) {
    const row = document.createElement("div");
    row.className = "stat";

    const name = document.createElement("label");
    name.htmlFor = `${key}-num`;
    name.textContent = label;

    const range = document.createElement("input");
    range.type = "range";
    range.min = 1;
    range.max = 255;
    range.value = 70;
    range.setAttribute("aria-label", `${label} slider`);

    const num = document.createElement("input");
    num.type = "number";
    num.id = `${key}-num`;
    num.name = key;
    num.min = 1;
    num.max = 255;
    num.step = 1;
    num.value = 70;
    num.required = true;

    range.addEventListener("input", () => {
      num.value = range.value;
      num.removeAttribute("aria-invalid");
      syncFill(range);
      updateTotal();
    });
    num.addEventListener("input", () => {
      const v = Number(num.value);
      if (Number.isFinite(v)) range.value = Math.min(255, Math.max(1, v));
      num.removeAttribute("aria-invalid");
      syncFill(range);
      updateTotal();
    });

    row.append(name, range, num);
    $("stats").append(row);
    inputs[key] = { range, num };
    syncFill(range);
  }

  $("type1").append(...TYPES.map((t) => option(t)));
  $("type2").append(option("None", "None"), ...TYPES.map((t) => option(t)));
  $("generation").append(...GENERATIONS.map((g) => option(g, `Gen ${g}`)));
  $("type1").value = "Normal";
  updateTotal();
}

function syncFill(range) {
  const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
  range.style.setProperty("--fill", `${pct}%`);
}

function updateTotal() {
  const total = STATS.reduce((sum, { key }) => sum + (Number(inputs[key].num.value) || 0), 0);
  $("live-total").textContent = total;
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  for (const { key } of STATS) {
    inputs[key].num.value = p[key];
    inputs[key].range.value = p[key];
    inputs[key].num.removeAttribute("aria-invalid");
    syncFill(inputs[key].range);
  }
  $("type1").value = p.type1;
  $("type2").value = p.type2;
  $("generation").value = p.generation;
  updateTotal();
}

function readForm() {
  const data = {};
  for (const { key } of STATS) data[key] = inputs[key].num.value.trim();
  data.type1 = $("type1").value;
  data.type2 = $("type2").value;
  data.generation = $("generation").value;
  return data;
}

function validate(data) {
  let ok = true;
  for (const { key, label } of STATS) {
    const v = Number(data[key]);
    const valid = data[key] !== "" && Number.isInteger(v) && v >= 1 && v <= 255;
    inputs[key].num.setAttribute("aria-invalid", String(!valid));
    if (!valid) {
      ok = false;
      showError(`${label} must be a whole number from 1 to 255.`);
    }
  }
  if (data.type1 === data.type2) {
    ok = false;
    showError("Secondary type must differ from the primary type.");
  }
  return ok;
}

function setState(state, status) {
  result.dataset.state = state;
  $("status").textContent = status;
}

function showError(message) {
  setState("error", "ERROR");
  $("verdict").textContent = "SCAN FAILED";
  $("verdict-note").textContent = "";
  $("meter-wrap").hidden = true;
  $("votes-wrap").hidden = true;
  const err = $("error");
  err.textContent = message;
  err.hidden = false;
}

function showResult(data, stats) {
  const pct = Math.round(data.probability * 1000) / 10;
  $("error").hidden = true;

  setState(data.legendary ? "legendary" : "ordinary", data.legendary ? "MATCH" : "CLEAR");
  $("verdict").textContent = data.legendary ? "LEGENDARY DETECTED" : "NOT LEGENDARY";
  $("verdict-note").textContent = `Base stat total ${data.total}. ${
    data.legendary ? "Stats match the legendary profile." : "Stats look like a regular Pokémon."
  }`;

  $("meter-wrap").hidden = false;
  $("prob-text").textContent = `${pct}%`;
  const track = $("meter-track");
  track.setAttribute("aria-valuenow", String(Math.round(pct)));
  $("meter-fill").style.width = `${pct}%`;

  const list = $("votes");
  list.replaceChildren();
  const order = [data.primary, ...Object.keys(data.votes).filter((k) => k !== data.primary)];
  for (const key of order) {
    const yes = data.votes[key];
    const li = document.createElement("li");
    li.className = yes ? "yes" : "no";

    const name = document.createElement("span");
    name.textContent = MODEL_NAMES[key] || key;
    if (key === data.primary) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "PRIMARY";
      name.append(tag);
    }

    const vote = document.createElement("span");
    vote.className = "vote";
    vote.textContent = yes ? "LEGENDARY" : "ORDINARY";

    li.append(name, vote);
    list.append(li);
  }
  $("votes-wrap").hidden = false;
}

async function scan(event) {
  event.preventDefault();
  const data = readForm();
  $("error").hidden = true;
  if (!validate(data)) return;

  const button = $("scan-btn");
  button.disabled = true;
  button.querySelector(".scan-label").textContent = "SCANNING...";
  setState("loading", "SCANNING");
  $("verdict").textContent = "ANALYZING";
  $("verdict-note").textContent = "Routing stats through the neural net.";
  $("meter-wrap").hidden = true;
  $("votes-wrap").hidden = true;
  $("meter-fill").style.width = "0";

  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Server returned ${response.status}`);
    // Let the meter animate from 0 after it becomes visible.
    showResult(body, data);
  } catch (err) {
    const offline = err instanceof TypeError;
    showError(offline ? "Cannot reach the server. Is it running?" : err.message);
  } finally {
    button.disabled = false;
    button.querySelector(".scan-label").textContent = "INITIATE SCAN";
  }
}

buildForm();
form.addEventListener("submit", scan);
document.querySelectorAll("[data-preset]").forEach((btn) =>
  btn.addEventListener("click", () => applyPreset(btn.dataset.preset))
);
