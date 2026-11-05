// =====================================================================
//  rendering.js  —  draws everything on the <canvas>.
//
//  The map is "isometric": a flat grid seen from an angle, so each tile
//  looks like a diamond. The key function is toScreen(): it turns a tile
//  position (x, y) into a pixel position on the screen.
// =====================================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');       // ctx = the "pen" we draw with
let canvasWidth = 0, canvasHeight = 0, pixelRatio = 1;

const HALF_W = 32;   // half the width of one tile diamond, in pixels
const HALF_H = 16;   // half the height of one tile diamond, in pixels

// ---------- Canvas size ----------
function resize() {
  const rect = document.getElementById('wrap').getBoundingClientRect();
  pixelRatio = devicePixelRatio || 1;                  // sharper on high-resolution screens
  canvas.width = rect.width * pixelRatio;
  canvas.height = rect.height * pixelRatio;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  canvasWidth = rect.width;
  canvasHeight = rect.height;
}
addEventListener('resize', resize);
new ResizeObserver(resize).observe(document.getElementById('wrap'));

// ---------- Drawing helpers ----------

// Tile position -> screen position.
const toScreen = (x, y) => [(x - y) * HALF_W, (x + y) * HALF_H];

// Same, but lifted up by `height` pixels (for the tops of buildings).
function toScreenRaised(x, y, height) {
  const p = toScreen(x, y);
  return [p[0], p[1] - height];
}

// Three shades of one colour: [top, left side, right side] — this fakes lighting.
function shades(hue, saturation, lightness) {
  return {
    top:   `hsl(${hue},${saturation}%,${lightness + 14}%)`,
    left:  `hsl(${hue},${saturation}%,${lightness}%)`,
    right: `hsl(${hue},${saturation}%,${lightness - 12}%)`,
  };
}

// Fill a shape made of several points.
function fillPolygon(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fill();
}

function drawLine(a, b, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

function drawCircle(center, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center[0], center[1], radius, 0, Math.PI * 2);
  ctx.fill();
}

// Draw a 3D box standing on the map. (x, y) = corner, w/d = size, height in pixels.
function drawBox(x, y, w, d, height, color, baseHeight = 0) {
  const at = toScreenRaised;
  fillPolygon([at(x, y + d, baseHeight), at(x + w, y + d, baseHeight), at(x + w, y + d, height), at(x, y + d, height)], color.left);
  fillPolygon([at(x + w, y + d, baseHeight), at(x + w, y, baseHeight), at(x + w, y, height), at(x + w, y + d, height)], color.right);
  fillPolygon([at(x, y, height), at(x + w, y, height), at(x + w, y + d, height), at(x, y + d, height)], color.top);
}

// Outline of a tile (or a block of tiles) as a diamond path.
function tilePath(x, y, w = 1, d = 1) {
  ctx.beginPath();
  [[0, 0], [w, 0], [w, d], [0, d]].forEach(([a, b], i) => {
    const p = toScreen(x + a, y + b);
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
  });
  ctx.closePath();
}

// ---------- One function per thing we can draw ----------

function drawBuilding(x, y, building) {
  const type = building.type;

  if (type === 'solar') {
    drawBox(x + 0.06, y + 0.06, 0.88, 0.88, 6, shades(215, 55, 32));
    for (let i = 1; i < 4; i++) {                       // the grid lines on the panel
      const o = 0.06 + 0.22 * i;
      drawLine(toScreenRaised(x + o, y + 0.06, 6), toScreenRaised(x + o, y + 0.94, 6), '#9cc4ff77', 1);
      drawLine(toScreenRaised(x + 0.06, y + o, 6), toScreenRaised(x + 0.94, y + o, 6), '#9cc4ff77', 1);
    }

  } else if (type === 'battery') {
    drawBox(x + 0.1, y + 0.1, 0.8, 0.8, 16, shades(145, 30, 38));
    const top = toScreenRaised(x + 0.5, y + 0.5, 16);   // green light = charged, red = nearly empty
    ctx.fillStyle = game.batteryKwh > 5 ? '#5fcf80' : '#ff6b5e';
    ctx.beginPath();
    ctx.ellipse(top[0], top[1], 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

  } else if (type === 'substation') {
    drawBox(x + 0.15, y + 0.15, 0.7, 0.7, 10, shades(30, 8, 52));
    const base = toScreenRaised(x + 0.5, y + 0.5, 10), tip = toScreenRaised(x + 0.5, y + 0.5, 38);
    drawLine(base, tip, '#e0a030', 3);                  // the pylon
    drawLine([tip[0] - 10, tip[1] + 5], [tip[0] + 10, tip[1] + 5], '#e0a030', 2);
    drawLine([tip[0] - 8, tip[1] + 13], [tip[0] + 8, tip[1] + 13], '#e0a030', 2);

  } else if (type === 'connection') {
    drawBox(x + 0.2, y + 0.2, 0.6, 0.6, 9, shades(0, 55, 42));
    drawCircle(toScreenRaised(x + 0.5, y + 0.5, 9), 4, '#f5c542');

  } else if (type === 'cable') {
    const center = toScreen(x + 0.5, y + 0.5);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbour = getBuilding(x + dx, y + dy);
      if (neighbour && BUILDINGS[neighbour.type].electric) {      // draw a wire towards each electric neighbour
        drawLine(center, toScreen(x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5), '#d89a2b', 3);
      }
    }
    drawCircle(center, 3, '#d89a2b');
  }
}

function drawHouse(house) {
  const { x, y } = house;
  drawBox(x + 0.12, y + 0.12, 0.76, 0.76, 12, shades(house.hue, 25, 64));
  const roofTop = toScreenRaised(x + 0.5, y + 0.5, 27);
  fillPolygon([toScreenRaised(x + 0.06, y + 0.94, 12), toScreenRaised(x + 0.94, y + 0.94, 12), roofTop], 'hsl(8,45%,38%)');
  fillPolygon([toScreenRaised(x + 0.94, y + 0.94, 12), toScreenRaised(x + 0.94, y + 0.06, 12), roofTop], 'hsl(8,45%,28%)');

  if (house.customer && house.powered) {                  // a window: yellow = lights on, grey = blackout
    const lit = game.shortage <= 0.05;
    fillPolygon([toScreenRaised(x + 0.3, y + 0.88, 3), toScreenRaised(x + 0.5, y + 0.88, 3),
                 toScreenRaised(x + 0.5, y + 0.88, 8), toScreenRaised(x + 0.3, y + 0.88, 8)], lit ? '#ffe27a' : '#444');
  }
}

function drawTree(tree) {
  const base = toScreenRaised(tree.x + 0.5, tree.y + 0.5, 0);
  drawLine(base, [base[0], base[1] - 12], '#5b4228', 4);
  drawCircle([base[0], base[1] - 20], 11, '#2f6b3a');
  drawCircle([base[0] - 3, base[1] - 23], 7, '#3e8a4b');
}

// ---------- Draw the whole world (called every frame) ----------
function drawWorld() {
  // 1) Clear the screen.
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.fillStyle = '#10161b';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2) Apply the camera (move + zoom). Everything drawn after this follows the camera.
  ctx.setTransform(pixelRatio * camera.zoom, 0, 0, pixelRatio * camera.zoom, pixelRatio * camera.x, pixelRatio * camera.y);

  drawGround();
  drawHoverAndSelection();

  // 3) Draw trees, houses and buildings. Sort by (x + y) so things in front cover things behind.
  const things = [];
  trees.forEach(t => things.push({ depth: t.x + t.y, draw: () => drawTree(t) }));
  houses.forEach(h => things.push({ depth: h.x + h.y, draw: () => drawHouse(h) }));
  tiles.forEach((b, i) => {
    if (!b) return;
    const x = i % MAP_SIZE, y = Math.floor(i / MAP_SIZE);
    const flat = b.type === 'cable' ? -0.5 : 0;           // cables lie on the ground, so draw them first
    things.push({ depth: x + y + flat, draw: () => drawBuilding(x, y, b) });
  });
  things.sort((a, b) => a.depth - b.depth).forEach(t => t.draw());

  // 4) Night: a dark blue layer over everything (not affected by the camera).
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const darkness = Math.min(1, Math.max(0, 1 - sunlight(game.hour) * 2.2));
  ctx.fillStyle = `rgba(8,18,60,${0.5 * darkness})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

function drawGround() {
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const shade = (x * 7 + y * 13) % 5;                 // tiny variation so grass isn't flat
      tilePath(x, y);
      ctx.fillStyle = isRoad(x, y) ? '#4a4f56'
                    : isOnLand(x, y) ? `hsl(100,38%,${40 + shade}%)`
                    : `hsl(105,32%,${30 + shade}%)`;
      ctx.fill();
      if (isOnLand(x, y)) { ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1; ctx.stroke(); }
    }
  }
  // Yellow border around the land you can build on.
  const size = LAND.max - LAND.min + 1;
  tilePath(LAND.min, LAND.min, size, size);
  ctx.strokeStyle = '#f5c542aa';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawHoverAndSelection() {
  // The tile under the mouse: white = you can build here, red = you can't.
  if (hoverTile && isInsideMap(hoverTile.x, hoverTile.y)) {
    const def = BUILDINGS[tool];                          // undefined for 'select' and 'demolish'
    const canUse = !def || (isOnLand(hoverTile.x, hoverTile.y) && !getBuilding(hoverTile.x, hoverTile.y) && game.money >= def.cost);
    const ok = tool === 'select' || tool === 'demolish' || canUse;
    tilePath(hoverTile.x, hoverTile.y);
    ctx.fillStyle = ok ? '#ffffff55' : '#ff000066';
    ctx.fill();

    if (tool === 'substation') {                          // show the substation's range as a ring
      const c = toScreen(hoverTile.x + 0.5, hoverTile.y + 0.5);
      ctx.strokeStyle = '#f5c542';
      ctx.beginPath();
      // A circle of radius r tiles looks like an ellipse in isometric view: width r*45.2, height r*22.6.
      ctx.ellipse(c[0], c[1], SUBSTATION_RANGE * 45.2, SUBSTATION_RANGE * 22.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Green outline around the selected building or house.
  if (selected) {
    tilePath(selected.x, selected.y);
    ctx.strokeStyle = '#5fcf80';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}
