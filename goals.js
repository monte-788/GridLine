// =====================================================================
//  goals.js  —  the objectives shown at the top of the screen.
//  They are completed in order. To add a goal, add a line to GOALS:
//     { text: 'What the player reads', done: () => <true when finished> }
// =====================================================================

const GOALS = [
  { text: 'Build new solar panels (6 total)',            done: () => countBuildings('solar') >= 6 },
  { text: 'Connect the solar panels to the battery',     done: () => countBuildings('solar', true) >= 6 && countBuildings('battery', true) >= 1 },
  { text: 'Build a substation and connect it with cables', done: () => countBuildings('substation', true) >= 1 },
  { text: 'Win your first customer',                     done: () => countCustomers() >= 1 },
  { text: 'Earn the first €10,000 revenue',              done: () => game.totalRevenue >= 10000 },
  { text: 'Expand production (10 connected solar panels)', done: () => countBuildings('solar', true) >= 10 },
  { text: 'Reach 25 customers',                          done: () => countCustomers() >= 25 },
  { text: 'Become profitable (positive daily profit)',   done: () => game.day > 1 && game.lastProfit > 0 },
];

// Called regularly from main.js. Marks finished goals as complete.
function checkGoals() {
  while (game.goalIndex < GOALS.length && GOALS[game.goalIndex].done()) {
    toast('✔ Goal complete: ' + GOALS[game.goalIndex].text);
    game.goalIndex++;
  }
}
