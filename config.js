// =====================================================================
//  config.js  —  ALL the numbers that shape the game.
//  Want the game easier, harder or faster? Change values in this file.
//  Nothing here "does" anything by itself; other files read these values.
// =====================================================================

// ---------- The map ----------
const MAP_SIZE = 30;                        // the map is 30 x 30 tiles
const LAND = { min: 10, max: 21 };          // YOU can build on tiles 10..21 (x and y)
const CONNECTION_TILE = { x: 10, y: 13 };   // where your power connects to the grid

// ---------- Time ----------
const GAME_HOURS_PER_SECOND = 0.5;          // at 1x speed, one full day lasts 48 real seconds

// ---------- Starting values ----------
const START = {
  money: 100000,
  hour: 6,             // game starts at 06:00
  price: 0.30,         // what you charge per kWh (€)
  rivalPrice: 0.42,    // what the competitor charges per kWh (€)
  reputation: 60,      // 0 - 100
  batteryKwh: 20,      // energy already stored in your batteries
};

// ---------- Electricity ----------
const SOLAR_PEAK_KW = 5;            // one panel at noon makes 5 kW
const BATTERY_CAPACITY_KWH = 40;    // one battery stores 40 kWh
const BATTERY_EFFICIENCY = 0.92;    // 8% is lost when charging
const HOUSE_DEMAND_KW = 2.08;       // average power one customer uses
const SUBSTATION_RANGE = 6.5;       // a substation serves houses up to 6.5 tiles away
const REFUND_RATE = 0.5;            // demolishing gives back 50% of the cost

// ---------- Things you can build ----------
//   name    : shown in the game
//   cost    : price in €
//   upkeep  : running cost in € per day
//   electric: true = it is part of the power network (cables link them together)
const BUILDINGS = {
  solar:      { name: 'Solar panel',      cost: 3500, upkeep: 6,   electric: true },
  battery:    { name: 'Battery',          cost: 6000, upkeep: 8,   electric: true },
  substation: { name: 'Substation',       cost: 8000, upkeep: 10,  electric: true },
  cable:      { name: 'Cable',            cost: 150,  upkeep: 0.5, electric: true },
  connection: { name: 'Connection point', cost: 0,    upkeep: 4,   electric: true },  // given to you at the start
};

// ---------- Tools in the bottom bar ----------
const TOOLS = ['select', 'solar', 'battery', 'substation', 'cable', 'demolish'];
const PAINT_TOOLS = ['cable', 'demolish'];  // these can be dragged across many tiles
