// =====================================================================
//  ui.js  —  everything made of HTML: stats bar, buttons, panels, info card.
//  (The map itself is drawn in rendering.js.)
// =====================================================================

const byId = id => document.getElementById(id);
const euro = n => '€' + Math.round(n).toLocaleString('en');

let openPanel = null;      // 'Finance', 'Customers', 'Goals' or null (closed)
const TABS = ['Finance', 'Customers', 'Goals'];

// A small message that fades after 3.5 seconds.
function toast(message) {
  const div = document.createElement('div');
  div.textContent = message;
  byId('toast').appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ---------- Top bar ----------
function chip(icon, value, extraClass = '', suffix = '') {
  return `<span class="chip">${icon} <b class="${extraClass}">${value}</b>${suffix}</span>`;
}

function updateStats() {
  const hh = String(Math.floor(game.hour)).padStart(2, '0');
  byId('stats').innerHTML =
    chip('💰', euro(game.money), game.money < 0 ? 'neg' : '') +
    chip('▲', euro(game.incomeToday), '', '/day') +
    chip('▼', euro(game.expensesToday), '', '/day') +
    chip('☀', game.production.toFixed(1), '', ' kW') +
    chip('🏠', game.demand.toFixed(1), '', ' kW') +
    chip('🔋', Math.round(game.batteryKwh), '', ' kWh') +
    chip('👥', countCustomers()) +
    chip('⭐', Math.round(game.reputation) + '%', game.reputation < 40 ? 'neg' : '') +
    `<span class="chip">Day ${game.day} ${hh}:00</span>`;
}

function updateGoalBar() {
  byId('goal').textContent = game.goalIndex < GOALS.length
    ? `Goal ${game.goalIndex + 1}/${GOALS.length}: ${GOALS[game.goalIndex].text}`
    : '🎉 All goals complete! Keep growing your company.';
}

// Speed buttons are created once (not every frame) so they stay clickable.
function buildSpeedButtons() {
  const box = byId('speed');
  box.innerHTML = '';
  [0, 1, 2, 4].forEach(speed => {
    const b = document.createElement('button');
    b.textContent = speed ? speed + '×' : '⏸';
    b.onclick = () => { game.speed = speed; highlightSpeed(); };
    b.dataset.speed = speed;
    box.appendChild(b);
  });
  highlightSpeed();
}
function highlightSpeed() {
  byId('speed').querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', Number(b.dataset.speed) === game.speed);
  });
}

// ---------- Bottom bars ----------
function buildToolbar() {
  const bar = byId('tools');
  bar.innerHTML = '';
  TOOLS.forEach(name => {
    const b = document.createElement('button');
    b.textContent = name === 'select' ? '✋ Select'
                  : name === 'demolish' ? '🗑 Demolish'
                  : `${BUILDINGS[name].name} ${euro(BUILDINGS[name].cost)}`;
    b.classList.toggle('on', tool === name);
    b.onclick = () => { tool = name; buildToolbar(); };
    bar.appendChild(b);
  });
}

function buildTabs() {
  const bar = byId('tabs');
  bar.innerHTML = '';
  TABS.forEach(name => {
    const b = document.createElement('button');
    b.textContent = name;
    b.classList.toggle('on', openPanel === name);
    b.onclick = () => { openPanel = openPanel === name ? null : name; renderPanel(); buildTabs(); };
    bar.appendChild(b);
  });
}

// ---------- Panels (Finance / Customers / Goals) ----------
function renderPanel() {
  const panel = byId('panel');
  if (!openPanel) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  let html = `<button class="close" style="float:right">✕</button><h3>${openPanel}</h3>`;
  if (openPanel === 'Finance')   html += financeHtml();
  if (openPanel === 'Customers') html += customersHtml();
  if (openPanel === 'Goals')     html += goalsHtml();
  panel.innerHTML = html;

  panel.querySelector('.close').onclick = () => { openPanel = null; renderPanel(); buildTabs(); };

  const slider = byId('price-slider');
  if (slider) {
    slider.oninput = () => { game.price = slider.value / 100; updateCustomerStats(); };
    updateCustomerStats();
  }
}

function financeHtml() {
  const profitClass = game.lastProfit < 0 ? 'neg' : '';
  return `
    <div class="row">Cash: <b>${euro(game.money)}</b></div>
    <div class="row">Income today: ${euro(game.incomeToday)}</div>
    <div class="row">Spent today: ${euro(game.expensesToday)}</div>
    <div class="row">Upkeep of all buildings: ${euro(upkeepPerDay())}/day</div>
    <div class="row">Total revenue so far: ${euro(game.totalRevenue)}</div>
    <div class="row">Profit yesterday: <b class="${profitClass}">${euro(game.lastProfit)}</b></div>`;
}

function customersHtml() {
  return `
    <div class="row">Your price: <b id="price-value"></b> per kWh
      <input id="price-slider" type="range" min="10" max="60" value="${Math.round(game.price * 100)}"></div>
    <div id="customer-stats"></div>`;
}

// Only this small part is refreshed while the Customers panel is open (so the slider isn't reset).
function updateCustomerStats() {
  const stats = byId('customer-stats');
  const priceLabel = byId('price-value');
  if (priceLabel) priceLabel.textContent = '€' + game.price.toFixed(2);
  if (!stats) return;
  const inRange = houses.filter(h => h.powered).length;
  stats.innerHTML = `
    <div class="row">Customers: <b>${countCustomers()}</b> · Homes in range: ${inRange} / ${houses.length}</div>
    <div class="row">Rival price: €${game.rivalPrice.toFixed(2)}</div>
    <div class="row">Reputation: ${Math.round(game.reputation)}%</div>
    <small>Cheaper than the rival + reliable power = more customers.
    Build substations (range ~6 tiles) to reach more homes.</small>`;
}

function goalsHtml() {
  const list = GOALS.map((g, i) =>
    `<div class="row">${i < game.goalIndex ? '✅' : i === game.goalIndex ? '👉' : '⬜'} ${g.text}</div>`).join('');
  return list + `<p><small>Drag to move the map, mouse wheel / pinch to zoom, tap things to inspect them.
    Pick a tool, then tap tiles inside the yellow-bordered land. Cables and Demolish can be dragged.
    Buildings that touch (or are linked by cables) share power.</small></p>`;
}

// Called regularly: refresh whatever the open panel shows.
function refreshPanel() {
  if (!openPanel) return;
  if (openPanel === 'Customers') updateCustomerStats();
  else renderPanel();
}

// ---------- Info card (bottom-left) ----------
function updateInfoCard() {
  const card = byId('card');
  if (!selected) { card.style.display = 'none'; return; }

  let html = '';
  if (selected.kind === 'building') {
    const b = getBuilding(selected.x, selected.y);
    if (!b) { selected = null; card.style.display = 'none'; return; }   // it was demolished
    const def = BUILDINGS[b.type];
    html = `<b>${def.name}</b><br>Upkeep ${euro(def.upkeep)}/day`;
    html += poweredTiles.has(tileIndex(selected.x, selected.y)) ? '<br>⚡ Connected to grid' : '<br>⚠ Not connected';
    if (b.type === 'battery') html += `<br>Grid storage ${Math.round(game.batteryKwh)} kWh`;
    if (b.type === 'solar') html += `<br>Output ≈ ${(SOLAR_PEAK_KW * sunlight(game.hour)).toFixed(1)} kW`;
    if (b.type === 'substation') {
      const n = houses.filter(h => Math.hypot(h.x - selected.x, h.y - selected.y) <= SUBSTATION_RANGE).length;
      html += `<br>Homes in range: ${n}`;
    }
  } else {
    const h = selected.house;
    html = '<b>House</b><br>' + (h.customer && h.powered ? 'Customer ✔'
                              : h.powered ? 'In range – not a customer'
                              : 'Not in range of a substation');
    if (h.customer && h.powered) html += `<br>Using ≈ ${demandPerCustomer(game.hour).toFixed(1)} kW`;
  }
  card.innerHTML = html;
  card.style.display = 'block';
}
