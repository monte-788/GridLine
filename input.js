// =====================================================================
//  input.js  —  mouse, touch and keyboard.
//
//  One finger / left mouse button:  tap = use the tool,  drag = move the map
//                                   (with Cable / Demolish, dragging paints instead)
//  Two fingers:                     pinch to zoom, move to pan
//  Mouse wheel:                     zoom
//  Keyboard:                        arrows or WASD = move, Space = pause, Esc = Select tool
// =====================================================================

const pointers = new Map();     // every finger / mouse currently touching the canvas
let dragDistance = 0;           // how far the pointer moved (to tell a tap from a drag)
let pressedButton = 0;          // 0 = left mouse button / touch
let lastPaintedTile = null;     // so dragging doesn't place on the same tile many times
let lastPinchDistance = 0;

// Screen position (pixels) -> tile position. This is the reverse of toScreen().
function tileAtScreen(sx, sy) {
  const worldX = (sx - camera.x) / camera.zoom;
  const worldY = (sy - camera.y) / camera.zoom;
  return {
    x: Math.floor((worldX / HALF_W + worldY / HALF_H) / 2),
    y: Math.floor((worldY / HALF_H - worldX / HALF_W) / 2),
  };
}

// Zoom in or out while keeping the point under the finger / mouse where it is.
function zoomAt(sx, sy, factor) {
  const oldZoom = camera.zoom;
  camera.zoom = Math.min(2.5, Math.max(0.35, camera.zoom * factor));
  const k = camera.zoom / oldZoom;
  camera.x = sx - (sx - camera.x) * k;
  camera.y = sy - (sy - camera.y) * k;
}

function pinchDistance() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// A tap (short press without moving).
function handleTap(x, y) {
  if (tool !== 'select') { placeBuilding(x, y); return; }

  // Select tool: pick the building or house on this tile.
  if (getBuilding(x, y)) {
    selected = { kind: 'building', x, y };
  } else {
    const house = houses.find(h => h.x === x && h.y === y);
    selected = house ? { kind: 'house', x, y, house } : null;
  }
}

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  pressedButton = e.button;
  dragDistance = 0;
  lastPaintedTile = null;
  if (pointers.size === 2) lastPinchDistance = pinchDistance();
});

canvas.addEventListener('pointermove', e => {
  const tile = tileAtScreen(e.offsetX, e.offsetY);
  hoverTile = tile;

  const p = pointers.get(e.pointerId);
  if (!p || !e.buttons) return;                       // just hovering, not dragging

  const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
  p.x = e.offsetX;
  p.y = e.offsetY;
  dragDistance += Math.abs(dx) + Math.abs(dy);

  if (pointers.size === 2) {
    // Two fingers: pan and pinch-zoom.
    const d = pinchDistance();
    camera.x += dx / 2;
    camera.y += dy / 2;
    zoomAt(e.offsetX, e.offsetY, d / lastPinchDistance);
    lastPinchDistance = d;

  } else if (PAINT_TOOLS.includes(tool) && pressedButton === 0) {
    // Cable / Demolish: dragging paints tiles one after another.
    if (dragDistance > 10 && (!lastPaintedTile || lastPaintedTile.x !== tile.x || lastPaintedTile.y !== tile.y)) {
      lastPaintedTile = tile;
      placeBuilding(tile.x, tile.y);
    }

  } else {
    // Anything else: dragging moves the map.
    camera.x += dx;
    camera.y += dy;
  }
});

function endPointer(e) {
  const wasTap = pointers.size === 1 && dragDistance < 10 && pressedButton === 0;
  if (wasTap) {
    const tile = tileAtScreen(e.offsetX, e.offsetY);
    handleTap(tile.x, tile.y);
  }
  pointers.delete(e.pointerId);
  if (e.pointerType !== 'mouse') hoverTile = null;    // no hover highlight on touch screens
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('contextmenu', e => e.preventDefault());   // no right-click menu

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.001));
}, { passive: false });

addEventListener('keydown', e => {
  const step = 40;
  if (e.key === 'ArrowLeft'  || e.key === 'a') camera.x += step;
  if (e.key === 'ArrowRight' || e.key === 'd') camera.x -= step;
  if (e.key === 'ArrowUp'    || e.key === 'w') camera.y += step;
  if (e.key === 'ArrowDown'  || e.key === 's') camera.y -= step;
  if (e.key === ' ') { game.speed = game.speed ? 0 : 1; highlightSpeed(); }
  if (e.key === 'Escape') { tool = 'select'; buildToolbar(); }
});
