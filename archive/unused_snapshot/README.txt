PORTAL SIEGE TD - SETUP INSTRUCTIONS
===================================

This is a self-contained browser prototype.
You do NOT need to install Node, npm, or any packages.

FASTEST WAY TO RUN IT
---------------------
1. Unzip the folder.
2. Open the folder.
3. Double-click index.html.
4. The game should open in your browser.

If double-clicking does not open it, do this instead:
1. Right-click index.html
2. Choose "Open with"
3. Pick Chrome or Edge

FILES
-----
index.html   -> main page
styles.css   -> styling
js/app.js    -> game logic
README.txt   -> this file

HOW TO PLAY
-----------
SETUP PHASE
1. Place the 2x2 portal on the map.
2. Place 8 player obstacles.
3. Place your Warrior.

GAMEPLAY
- Start the wave with the "Start Next Wave" button.
- Earn JEWEL by killing enemies.
- Hire more heroes from the Hire Hero panel.
- Click a tower to view its stats and abilities.
- Use Upgrade to level that tower.
- Use Move to move that tower one tile.
- Every 7 waves, a relic shop appears.
- Buy one relic or skip it.
- If enemies reach the portal, they damage it.
- If portal HP reaches 0, the run ends.

CONTROLS
--------
- Left click a tile to place objects during setup.
- Left click a tower to select it.
- Left click Move, then click an adjacent tile to move it.
- Click ability buttons on the right panel to cast abilities.
- Click Hire Hero, then click an empty tile to place the hired hero.

WHAT IS INCLUDED
----------------
- 12x8 grid battlefield
- Portal placement
- 3 random obstacles at start
- 8 player-placed obstacles
- Warrior starts alone
- Archer / Wizard / Priest / Pirate can be hired
- Dynamic enemy pathing
- Spawn patterns: Uniform, Lane Pressure, Burst Cluster
- Boss waves every 5 waves
- Mutations every 3 waves (non-boss waves)
- Relic shop every 7 waves
- Tower upgrading and movement
- Manual ability casting

KNOWN LIMITS
------------
This is a prototype, so some things are intentionally simple:
- Art is placeholder UI only
- Balance is first-pass balance, not final
- Enemies are grid-step based rather than fully animated
- Some advanced boss behaviors are simplified

IF YOU WANT TO SHARE OR BACK IT UP
----------------------------------
Keep the main files and folders together when sharing:
- index.html
- styles.css
- js/app.js
- assets/
- portal-trans.png

Do not separate index.html from styles.css, js/app.js, assets/, or portal-trans.png.


Project layout:
- index.html
- styles.css
- js/app.js   (active game logic)
- archive/original-backups/   (older backup snapshots from your folder)
- archive/broken-split/   (the non-working split version preserved for reference)

Open index.html directly in a browser.


ARCHIVE NOTES
-------------
Unused root-level backup snapshots were moved into archive/root-backups/ to reduce clutter.
Nothing was deleted.
