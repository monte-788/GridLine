// =====================================================================
//  state.js  —  the game's "memory": every value that changes while you play.
//  Also builds the starting world and has small helper functions.
// =====================================================================

// ---------- The data ----------
let game;                       // numbers: money, time, price, reputation... (filled in createWorld)
let tiles;                      // one entry per map tile: null (empty) or a building like { type: 'solar' }
let houses;                     // list of houses: { x, y, hue, customer, powered }
let trees;                      // list of trees (decoration only): { x, y }
let poweredTiles = new Set();   // tile numbers connected to the grid (see rebuildNetwork)
let networkDirty = true;        // set to true whenever buildings change, so the network is recalculated

// ---------- What the player is doing right now ----------
let tool = 'select';            // the chosen tool
let selected = null;            // what is selected: { kind: 'building' | 'house', x, y, house }
let hoverTile = null;           // the tile under the mouse / finger
const camera = { x: 0, y: 0, zoom: 1 };   // how the map is moved and zoomed

// ---------- Small helpers ----------
const tileIndex  = (x, y) => y * MAP_SIZE + x;                       // (x,y) -> position in the `tiles` list
const isInsideMap = (x, y) => x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE;
const isOnLand    = (x, y) => x >= LAND.min && x <= LAND.max && y >= LAND.min && y <= LAND.max;
const isRoad      = (x, y) => x === 7 || x === 24 || y === 7 || y === 24;

function getBuilding(x, y) {
  return isInsideMap(x, y) ? tiles[tileIndex(x, y)] : null;
}

// How many buildings of one type exist? With onlyConnected = true, only those linked to the grid.
function countBuildings(type, onlyConnected = false) {
  if (onlyConnected) {
    let n = 0;
    poweredTiles.forEach(i => { if (tiles[i].type === type) n++; });
    return n;
  }
  return tiles.filter(b => b && b.type === type).length;
}

// A customer only counts if the house is also reached by a substation.
function countCustomers() {
  return houses.filter(h => h.customer && h.powered).length;
}

// Same random numbers every time, so the town always looks the same.
let seed = 7;
function seededRandom() {
  seed = seed * 16807 % 2147483647;
  return seed / 2147483647;
}

// ---------- Create a brand-new game ----------
function createWorld() {
  game = {
    money: START.money,
    hour: START.hour,
    day: 1,
    speed: 1,                      // 0 = paused, 1, 2 or 4
    reputation: START.reputation,
    price: START.price,
    rivalPrice: START.rivalPrice,

    incomeToday: 0,
    expensesToday: 0,
    totalRevenue: 0,
    lastProfit: 0,                 // profit of the previous day

    batteryKwh: START.batteryKwh,
    production: 0,                 // kW the solar panels make right now
    demand: 0,                     // kW the customers want right now
    shortage: 0,                   // 0..1 share of demand we could NOT deliver right now
    hourUnmetKwh: 0,               // used to decide if the last hour was a "blackout hour"
    hourDemandKwh: 0,

    goalIndex: 0,                  // which goal the player is working on
  };

  tiles = Array(MAP_SIZE * MAP_SIZE).fill(null);
  houses = [];
  trees = [];

  // Starting buildings: connection point, 5 solar panels in a row, 1 battery.
  const y = CONNECTION_TILE.y;
  tiles[tileIndex(CONNECTION_TILE.x, y)] = { type: 'connection' };
  for (let x = 11; x <= 15; x++) tiles[tileIndex(x, y)] = { type: 'solar' };
  tiles[tileIndex(16, y)] = { type: 'battery' };

  scatterHousesAndTrees();

  networkDirty = true;
  rebuildNetwork();

  // Start with the camera centred on your land.
  camera.zoom = Math.min(1, Math.min(innerWidth / 1300, innerHeight / 900) * 1.4) || 0.7;
  camera.x = canvasWidth / 2;
  camera.y = canvasHeight / 2 - 496 * camera.zoom;   // 496 = screen height of the map centre
}

// Houses stand along the roads around your land. Some random trees fill the rest.
function scatterHousesAndTrees() {
  const rows = [6, 8, 23, 25];                      // lines next to the roads
  for (let y = 2; y < 28; y++) {
    for (let x = 2; x < 28; x++) {
      if (isOnLand(x, y) || isRoad(x, y)) continue;

      const besideRoad = (x % 2 === 0 && rows.includes(y)) || (y % 2 === 0 && rows.includes(x));
      if (besideRoad && seededRandom() < 0.6) {
        houses.push({ x, y, hue: seededRandom() * 360 | 0, customer: false, powered: false });
      } else if (seededRandom() < 0.14) {
        trees.push({ x, y });
      }
    }
  }
}
