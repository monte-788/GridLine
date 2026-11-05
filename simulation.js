// =====================================================================
//  simulation.js  —  the rules of the game. Runs every frame.
//
//  Each frame:   time passes  ->  sun makes power  ->  customers use it
//                ->  we earn money  ->  upkeep is paid
//  Each hour:    customers may join or leave
//  Each day:     profit is counted, the rival may change its price
// =====================================================================

// 0 at night, 1 at noon. (Sun rises at 06:00, sets at 18:00.)
function sunlight(hour) {
  return Math.max(0, Math.sin(Math.PI * (hour % 24 - 6) / 12));
}

// How much power ONE customer uses at this hour (highest in the evening, around 19:00).
function demandPerCustomer(hour) {
  return HOUSE_DEMAND_KW * (0.8 + 0.4 * Math.cos(2 * Math.PI * (hour - 19) / 24));
}

// Total running costs of all buildings, in € per day.
function upkeepPerDay() {
  let total = 0;
  tiles.forEach(b => { if (b) total += BUILDINGS[b.type].upkeep; });
  return total;
}

// ---------- Main update (called once per frame) ----------
// dt = real seconds since the last frame.
function updateGame(dt) {
  if (game.speed === 0) return;                              // paused
  if (networkDirty) rebuildNetwork();

  const hours = dt * game.speed * GAME_HOURS_PER_SECOND;     // game hours that pass this frame
  const previousHour = Math.floor(game.hour);
  game.hour += hours;

  simulateElectricity(hours);
  payUpkeep(hours);

  if (Math.floor(game.hour) !== previousHour) hourlyUpdate();
  if (game.hour >= 24) {
    game.hour -= 24;
    endOfDay();
  }
}

// ---------- Electricity: make it, store it, sell it ----------
function simulateElectricity(hours) {
  const production = countBuildings('solar', true) * SOLAR_PEAK_KW * sunlight(game.hour);   // kW
  const demand = countCustomers() * demandPerCustomer(game.hour);                           // kW
  const batteryCapacity = countBuildings('battery', true) * BATTERY_CAPACITY_KWH;           // kWh

  let soldKwh = demand * hours;     // energy customers want during this frame
  let unmetKwh = 0;                 // energy we could NOT deliver

  if (production >= demand) {
    // Surplus: charge the batteries (some energy is lost).
    const surplusKwh = (production - demand) * hours;
    game.batteryKwh += surplusKwh * BATTERY_EFFICIENCY;
  } else {
    // Not enough sun: take from the batteries first.
    const neededKwh = (demand - production) * hours;
    const fromBattery = Math.min(game.batteryKwh, neededKwh);
    game.batteryKwh -= fromBattery;
    unmetKwh = neededKwh - fromBattery;      // anything left over is a blackout
    soldKwh -= unmetKwh;                     // we can't charge for energy we didn't deliver
  }
  game.batteryKwh = Math.min(game.batteryKwh, batteryCapacity);

  game.production = production;
  game.demand = demand;

  // Earn money from the energy we delivered.
  const revenue = soldKwh * game.price;
  game.money += revenue;
  game.incomeToday += revenue;
  game.totalRevenue += revenue;

  // Reputation: blackouts hurt it, normal service slowly heals it.
  const demandKwh = demand * hours;
  game.shortage = demandKwh > 0 ? unmetKwh / demandKwh : 0;
  game.hourUnmetKwh += unmetKwh;
  game.hourDemandKwh += demandKwh;
  if (game.shortage > 0.02) {
    game.reputation = Math.max(0, game.reputation - hours * 18 * game.shortage);
  } else {
    game.reputation = Math.min(100, game.reputation + hours * 0.4);
  }
}

function payUpkeep(hours) {
  const cost = upkeepPerDay() * hours / 24;
  game.money -= cost;
  game.expensesToday += cost;
}

// ---------- Every game hour: customers join or leave ----------

// Chance (0..1) that a house that is NOT a customer becomes one this hour.
// Cheaper than the rival + good reputation = higher chance.
function chanceToJoin() {
  const priceAdvantage = (game.rivalPrice - game.price) / game.rivalPrice;
  return 0.035 * (0.3 + 4 * Math.max(0, priceAdvantage + 0.1)) * (game.reputation / 60);
}

// Chance that a customer leaves this hour. Expensive prices, bad reputation and blackouts all increase it.
function chanceToLeave(hadBlackout) {
  let chance = 0;
  if (game.price > game.rivalPrice * 1.02) chance += 0.05 * (game.price / game.rivalPrice - 0.9);
  if (game.reputation < 40 || hadBlackout) chance += 0.03;
  return chance;
}

function hourlyUpdate() {
  const hadBlackout = game.hourDemandKwh > 0 && game.hourUnmetKwh / game.hourDemandKwh > 0.05;

  houses.forEach(house => {
    if (!house.powered) { house.customer = false; return; }   // out of substation range

    if (!house.customer) {
      if (game.reputation < 35) return;                       // nobody signs up with a bad company
      if (Math.random() < chanceToJoin()) house.customer = true;
    } else {
      if (Math.random() < chanceToLeave(hadBlackout)) house.customer = false;
    }
  });

  game.hourUnmetKwh = 0;
  game.hourDemandKwh = 0;
}

// ---------- Every game day ----------
function endOfDay() {
  game.lastProfit = game.incomeToday - upkeepPerDay();
  toast(`Day ${game.day} profit: ${euro(game.lastProfit)}`);
  game.day++;
  game.incomeToday = 0;
  game.expensesToday = 0;

  // The rival reacts to your price.
  if (game.price < game.rivalPrice - 0.02 && game.rivalPrice > 0.25) {
    game.rivalPrice = Math.max(0.25, +(game.rivalPrice * 0.97).toFixed(3));
    toast('Rival lowered its prices!');
  } else if (game.price > game.rivalPrice + 0.05) {
    game.rivalPrice = Math.min(0.45, game.rivalPrice * 1.01);
  }
}
