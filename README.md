# GRIDLINE (simplified)

You run a small solar-power company. Build solar panels, store energy in batteries,
connect a substation with cables, win customers from the nearby town, and set a price
that beats your rival — without causing blackouts.

## How to run
Keep the folder structure as it is and open `index.html` in a browser. No install, no server.
Edit a file, save, refresh the page.

**Tip:** press F12 in your browser to open the console. Errors show up there with the file name and line number.

## How to play
1. Pick a tool in the bottom bar and tap tiles inside the yellow-bordered land.
2. Buildings that touch each other (or are linked with cables) share power.
   Everything must connect back to the red **Connection point**.
3. A **substation** powers houses within ~6 tiles. Houses in range can become customers.
4. Customers pay for the electricity they use. Blackouts hurt your reputation.
5. Open **Customers** to change your price. Cheaper than the rival = more customers.

Controls: drag = move map · wheel / pinch = zoom · Space = pause · Esc = Select tool.

## Where is everything? (read the files in this order)

| File | What it does | When you'd edit it |
|---|---|---|
| `js/config.js` | Every tweakable number: prices, ranges, speeds | Change balance, add a building type |
| `js/state.js` | The game's data + creating the starting town | Add new things to remember |
| `js/buildings.js` | Placing/demolishing, and the "is it connected?" logic | Change building rules |
| `js/simulation.js` | The game rules: sun, power, money, customers, days | Change how the economy works |
| `js/goals.js` | The list of objectives | Add or change goals |
| `js/rendering.js` | Draws the map on the canvas | Change how things look |
| `js/ui.js` | Buttons, stats bar, panels, info card | Add new menus or stats |
| `js/input.js` | Mouse, touch and keyboard | Add shortcuts |
| `js/main.js` | Starts the game and runs the loop | Rarely |
| `style.css` | Colours and layout of the HTML parts | Re-theme the UI |

### The big picture
```
every frame (main.js):
   updateGame(dt)   -> simulation.js  (changes the numbers in `game`)
   drawWorld()      -> rendering.js   (draws what `game`, `tiles`, `houses` look like)
a few times a second:
   updateStats(), updateInfoCard() ... -> ui.js (refreshes the HTML)
```
The rule of thumb: **simulation changes data, rendering and ui only show data.**

### The four main pieces of data (state.js)
- `game` – numbers: money, hour, day, price, reputation, battery...
- `tiles` – a list of 900 slots (30×30). Each is `null` or a building like `{ type: 'solar' }`
- `houses` – list of `{ x, y, customer, powered }`
- `poweredTiles` – which tiles are connected to the grid

## Easy first experiments
1. **Make it easier:** in `config.js` set `START.money` to `500000`.
2. **Stronger sun:** change `SOLAR_PEAK_KW` from `5` to `8`.
3. **Longer days:** lower `GAME_HOURS_PER_SECOND` to `0.25`.
4. **Re-colour a building:** in `rendering.js`, find `drawBuilding` and change the numbers in `shades(215, 55, 32)` for the solar panel (hue, saturation, lightness).
5. **New goal:** in `goals.js` add `{ text: 'Own 3 batteries', done: () => countBuildings('battery') >= 3 }`.

## Slightly bigger projects
- **Wind turbine:** add `wind` to `BUILDINGS` and `TOOLS` in `config.js`, produce power in `simulateElectricity`, draw it in `drawBuilding`.
- **Save game:** store `game` and `tiles` with `localStorage.setItem` and load them in `main.js`.
- **Random events:** in `endOfDay`, sometimes show a toast and change `game.rivalPrice`.
- **Balance:** a panel earns about €11/day but costs €6/day to keep. Tweak `config.js` until it feels fun.

## What was removed (to keep the code small)
Employees (builders and maintenance workers), construction time, wear and repairs,
Office / Break room / Warehouse / Fence / Gate, Research, taxes, and rival ad/smear
campaigns. **Kept:** solar → battery → substation → customers, day/night, the
price-vs-rival system, reputation, goals, and the isometric map.
Buildings are now built instantly. Good future features to add back one by one!
