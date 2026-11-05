// =====================================================================
//  main.js  —  starts the game and runs the game loop.
//  The loop runs about 60 times per second:
//      update the rules  ->  draw the map  ->  (a few times per second) refresh the HTML
// =====================================================================

// ----- Start -----
resize();            // size the canvas first (createWorld needs it)
createWorld();       // build the map, starting buildings, houses...
buildToolbar();
buildTabs();
buildSpeedButtons();
updateStats();
updateGoalBar();
toast('Welcome to GRIDLINE! Pick a tool below and start building.');

// ----- Loop -----
let lastTime = performance.now();
let hudTimer = 0;       // counts up to 0.25 s
let panelTimer = 0;     // counts up to 1 s

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);   // seconds since last frame (capped, e.g. after switching tabs)
  lastTime = now;

  updateGame(dt);      // simulation.js
  drawWorld();         // rendering.js

  // The HTML parts don't need 60 updates per second.
  hudTimer += dt;
  if (hudTimer > 0.25) {
    hudTimer = 0;
    checkGoals();
    updateStats();
    updateGoalBar();
    updateInfoCard();
    if (openPanel === 'Customers') updateCustomerStats();
  }
  panelTimer += dt;
  if (panelTimer > 1) {
    panelTimer = 0;
    refreshPanel();
  }

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
