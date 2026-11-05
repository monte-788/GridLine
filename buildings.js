// =====================================================================
//  buildings.js  —  placing / demolishing buildings and the power network.
// =====================================================================

// Called when the player taps a tile with a build tool selected.
function placeBuilding(x, y) {
  if (tool === 'select') return;
  const existing = getBuilding(x, y);

  // ----- Demolish -----
  if (tool === 'demolish') {
    if (existing && existing.type !== 'connection') {
      game.money += BUILDINGS[existing.type].cost * REFUND_RATE;
      tiles[tileIndex(x, y)] = null;
      networkDirty = true;
      if (selected && selected.kind === 'building') selected = null;
    }
    return;
  }

  // ----- Build -----
  if (!isOnLand(x, y)) return toast('Build inside your land (the bright area)');
  if (existing) return;                                     // tile already used

  const cost = BUILDINGS[tool].cost;
  if (game.money < cost) return toast('Not enough money');

  game.money -= cost;
  game.expensesToday += cost;
  tiles[tileIndex(x, y)] = { type: tool };
  networkDirty = true;                                      // power network must be recalculated
}

// Which buildings are connected to the grid?
// Start at the connection point and "spread" through touching electric buildings
// (solar, battery, substation, cable). Anything reached is connected.
function rebuildNetwork() {
  poweredTiles = new Set();
  const start = tileIndex(CONNECTION_TILE.x, CONNECTION_TILE.y);
  const toVisit = [start];
  poweredTiles.add(start);

  while (toVisit.length > 0) {
    const i = toVisit.pop();
    const x = i % MAP_SIZE, y = Math.floor(i / MAP_SIZE);

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {   // the 4 neighbours
      const nx = x + dx, ny = y + dy;
      const neighbour = getBuilding(nx, ny);
      const ni = tileIndex(nx, ny);
      if (neighbour && BUILDINGS[neighbour.type].electric && !poweredTiles.has(ni)) {
        poweredTiles.add(ni);
        toVisit.push(ni);
      }
    }
  }

  // A house is "powered" if a CONNECTED substation is close enough.
  houses.forEach(h => { h.powered = false; });
  poweredTiles.forEach(i => {
    if (tiles[i].type !== 'substation') return;
    const sx = i % MAP_SIZE, sy = Math.floor(i / MAP_SIZE);
    houses.forEach(h => {
      if (Math.hypot(h.x - sx, h.y - sy) <= SUBSTATION_RANGE) h.powered = true;
    });
  });

  networkDirty = false;
}
