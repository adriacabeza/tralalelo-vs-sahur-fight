const LOL = `
                                                                        ..=:-=..                                                            
                                                                      .:.-===++.                                                            
                                                                    ..::-===+++  .                                                          
                                                                 ...-::--==++++. .                                                          
                                                                 ..+::-====+++-.                                                            
                                                                 .=:.-===+++++.                                      .  .                   
                                                               .:-:.:-===+++++=                                      .:+=.                  
                                                             ..--:..--===+++++*  .                                 ..-*+.                   
                                                          ..=-::...:--===+++++*. .                                .-+*# .                   
                                                    ...+=--::::::::-----====++*.                                 .:+##.                     
                                            . ...-+==----::::::::---------====++. ...                          ..:+*%.                      
                                        ...====---:::::::::--:------=--======++==+...                         .--**#.                       
                                   ...=+==--:-::::::::::-------================+++++-...                     .=-**#.                        
                                ..++==--::::::::::-----------===============+++++++++++..         ..        .-+**#..                        
                             ..+===---::::------------=-========+=====+++++++++++++++++++.      .=*...    .+:++*#:.                         
                          .:=====--:::::----=-============+=+++++++++++++++++++++++++++++++++++++*****++++==++*#*.                          
                       ..====--=-::-==============++*+++*++++++++++++++++++++++++++++++++++++++++++++=++++++*###.                           
                   ...===--:-====+#%%@##**++=====++++*+*+++++++++++++++++++++++++++++++++*+++--==+***+++++=+*##.                            
                  ..:=-:----=======*%%+**+=+======++*++*+*++++++++++++++++++++++++++*+*******-::=+*=++....****.                             
                . .::::...:.:...::::.:.:..:.::-=+++******+***++++++++++=+++++++**##*--::==+++**=-+*.+..    ..                               
                   ..----------------:::::....:::::::-:----::::-+++:::::::::::-:----===++*##..%+=*# .                                       
                      ...:---===-=----::::----:::-::::--::-:-==-==++*::--:------===++*..##+....=+*#..                                       
                       ....  ..---------------------------=--++-.-=+++-=======++++.........=+==-+*#:.                                       
                               .  ....----------------=--====#*+=:-=+*====+++.....    ....+++=+++++-.                                       
                                          ....@@@@%#*-========**+-:-=+#.           .....+=+++++++*:+..                                      
                                          ..*@@@@@%@@%........ -*=--++*.          ....++++=+++*+:=*.:.                                      
                                        ..@@@%%%%%%%##@.      . ++=-=**:      .....=++====+=+.::+:::..                                      
                                      .-%%%%%*%%**#####*        .+===+*:      . .=++=====+++*:=:::-..                                       
                                  ...#%%%%%%%#**#******#.       .*+-+*#.      ....:++++*-..:.::...                                          
                                 ..%%%%%#%%%#******+:...        .*=-+##.      ....+-..:..:::....                                            
                                 =*#***====+*#.. .            ...+==*##:...          ......                                                 
                                 ..-----==:.               . ..+++==*#@+...                                                                 
                                   .......                 ...+++==++++*:..                                                                 
                                                       .....++++=++++++.++.                                                                 
                                                        ..++=++++++++*:++*:.                                                                
                                                    ...:+++====+:+**..++:::..                                                               
                                                   ..:+++=====++...:=::::::..                                                               
                                                 ..=++===-=+++++:.::::::. .                                                                 
                                              ...+++==-===++++=.:::..                                                                       
                                              ...++=-=+++++-..::::. .                                                                       
                                                .#-.......:::::-.                                                                           
                                                 ...:#.::::.-...
`

document.addEventListener("DOMContentLoaded", () => {
  console.log(LOL);
});


const eventCallback = () => {
  console.error(`Callback not implemented!!!!`);
}

window.eventCallback = eventCallback;

const canvas = document.getElementById("game");

const TILE            = 48;          // px
const COLS            = Math.floor(canvas.width/TILE);
const ROWS            = Math.floor(canvas.height/TILE);
const GRAVITY         = 1;
const JUMP_V          = -20;
const MOVE_V          = 11;         // faster movement
const FPS             = 60;
const MAX_POINTS      = 3;          
const ACTION_COOLDOWN = 50;         // ms cooldown for build/destroy
const COLLISION_DELTA = 0.05;        // how much to offset the collision box
const MAGIC_NUMBER = Math.floor(83 * TILE * Math.PI >> 2) // 83 is a prime number, so it will be hard to find a collision;


const ctx    = canvas.getContext("2d");
const hud    = document.getElementById("hud");

let keys           = {};
let gameOver       = false;
let mousePos       = { x: 0, y: 0 };
let lastActionTime = 0;

const terrainImage = new Image();
terrainImage.src = "terrain.png";
let terrainPattern = null;

terrainImage.onload = () => {
  terrainPattern = ctx.createPattern(terrainImage, "repeat");
};

const player1Image = new Image();
player1Image.src = "player1.png";

const player2Image = new Image();
player2Image.src = "player2.png";

document.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (e.code === "Space") {
    const now = performance.now();
    if (now - lastActionTime < ACTION_COOLDOWN) return;
    lastActionTime = now;
    toggleBlockAtMouse();
  }
});

document.addEventListener("keyup", e => { keys[e.code] = false; });

canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;
});

let world = [...Array(ROWS)].map(() => Array(COLS).fill(0));  // 0 = air, 1 = block
// generateTestLevel();

function getRandomPosition() {
  var x = Math.floor(Math.random() * (COLS - 1));
  var y = Math.floor(Math.random() * (ROWS - 1));
  let count = 0;

  while (!!world[y][x] && count < MAGIC_NUMBER ** 2) {
    x = Math.ceil(Math.random() * (COLS - 1));
    y = Math.ceil(Math.random() * (ROWS - 1));
    count++;
  }

  return { x, y };
}

window.getRandomPosition = getRandomPosition;

function placeStar(symbol) {
  const { x, y } = getRandomPosition();
  world[y][x] = symbol;
}

/* ===== ENTITIES ===== */
class Player {
  constructor(id, me, x, y, name, controls) {
    this.me = me;
    this.id       = id;
    this.x        = x;   this.y = y;
    this.vx       = 0;   this.vy = 0;
    this.w        = 1;   this.h  = 1;
    this.name    = name;
    this.controls = controls;
    this.score    = 0;
    this.isJumping = true;
  }

  input() {
    if (!this.controls) return;

    const c = this.controls;
    if (keys[c.left])  this.vx = -MOVE_V;
    if (keys[c.right]) this.vx =  MOVE_V;
    if (!keys[c.left] && !keys[c.right]) this.vx = 0;
    if (keys[c.jump] && !this.isJumping) { this.vy = JUMP_V; this.isJumping = true; }
  }

  isFuckingDead() {
    return this.y + this.h > ROWS - COLLISION_DELTA;
  }

  step() {
    if (!this.me) return;

    this.move(this.vx / FPS, this.vy / FPS);
  }

  move(dx, dy) {
    const steps = 5; // break into 5 smaller steps to prevent tunneling
    const stepX = dx / steps;
    const stepY = dy / steps;
    this.vy += GRAVITY;

    for (let i = 0; i < steps; i++) {
      // Horizontal movement
      const tryX = this.x + stepX;
      if (!collides(tryX, this.y, this.w, this.h)) {
        this.x = tryX;
      } else {
        this.vx = 0;
      }

      // Vertical movement
      const tryY = this.y + stepY;
      if (!collides(this.x, tryY, this.w, this.h)) {
        this.y = tryY;
      } else {
        this.vy = 0;
        this.isJumping = false;
        if (this.vy > 0) {
          this.y = Math.floor(this.y);
        }
      }
      checkTargets(this);
    }

    if (this.isFuckingDead()) {
      this.score -= 1;
      this.vx = 0; this.vy = 0;
      // random position on respawn
      this.choose_position();

      window.eventCallback(
        "score_diff",
        {
          id: this.me ? 2 : 1,
          diff: -1,
        }
      );
    }

    window.eventCallback(
      "move",
      {
        position: {
          x: this.x,
          y: this.y
        },
      }
    );
  }

  choose_position() {
    const { x, y } = getRandomPosition();

    this.x = x;
    this.y = y;
  }

  render() {
    const delta = 1 + (this.isJumping ? 0.5 : 0);

    if (this.me) {
      ctx.drawImage(player1Image, this.x * TILE, this.y * TILE, this.w * TILE, this.h * TILE * delta);
    } else {
      ctx.drawImage(player2Image, this.x * TILE, this.y * TILE, this.w * TILE, this.h * TILE * delta);
    }
  }
}

const players = [];
let p1, p2;

function setupGame(userId, data, shouldSwap) {
  const {
    players: dPlayers,
    world: dWorld
  } = data;

  for (const p of dPlayers) {
    const isMe = !p.userId || p.userId === userId;

    const pp = new Player(
      p.userId,
      isMe,
      p.position.x,
      p.position.y,
      p.name ?? p.userId,
      isMe ? {
        left: "ArrowLeft",
        right: "ArrowRight",
        jump:  "ArrowUp",
      } : undefined
    );

    players.push(pp);

    if (isMe) {
      p1 = pp;
    } else {
      p2 = pp;
    }
  }

  if (shouldSwap) {
    for (let i = 0; i < world.length; i++) {
      for (let j = 0; j < world[i].length; j++) {
        if (dWorld[i][j] === `⭐1`) {
          dWorld[i][j] = `⭐2`;
        } else if (dWorld[i][j] === `⭐2`) {
          dWorld[i][j] = `⭐1`;
        }
      }
    }
  }

  world = dWorld;
}

window.setupGame = setupGame;

let acc  = 0, last = performance.now();

function loop(now) {
  acc += (now - last) / 1000;
  last = now;
  while (acc > 1 / FPS) { update(); acc -= 1 / FPS; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update() {
  if (gameOver || players.length === 0) return;

  players.forEach(p => { 
    if (!p.isUseless) {
      p.input(); p.step();
    }
  });

  if (Math.max(p1.score, p2.score) >= MAX_POINTS) {
    gameOver = true;

    const winner = p1.score === p2.score ? "TIE" : (p1.score > p2.score ? p1.name : p2.name);
    alert(`Match over! ${winner} wins.`);

    window.eventCallback(
      "game_over",
      {
        winner,
        players: players.map(p => ({
          userId: p.id,
          name: p.name,
          score: p.score
        }))
      }
    );
  }
}

function render() {
  if (world.length === 0 || players.length === 0) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  world.forEach((row, y) => row.forEach((cell, x) => {
    if (cell === 1){
      // use terrain.png to fill the blocks
      ctx.fillStyle = terrainPattern;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
    if (cell === `⭐1` || cell === `⭐2`) {
      ctx.fillStyle = cell === `⭐1` ? "gold" : "cyan";

      const CARA = TILE / 2;
      ctx.fillRect(x * TILE + CARA / 2, y * TILE + CARA / 2, CARA, CARA)
    }
  }));

  players.forEach(p => p.render());
  hud.textContent = `YOU ${p1.score} - FUCKING SAHUR ${p2.score}`;
}

function getBorders(x, y, w, h) {
    const topLeft= [x, y];
    const topRight= [x + w, y];
    const botLeft= [x, y + h];
    const botRight= [x + w, y + h];
    return { topLeft, topRight, botLeft, botRight };
}

function twoBordersCollide(b1, b2) {
  // Collision assumed if the difference
  // is greater than the accepted delta

  return (
    b1.topLeft[0] < b2.topRight[0] + COLLISION_DELTA &&
    b1.topRight[0] > b2.topLeft[0] + COLLISION_DELTA &&
    b1.topLeft[1] < b2.botLeft[1] + COLLISION_DELTA &&
    b1.botLeft[1] > b2.topLeft[1] + COLLISION_DELTA
  );
}


function collides(x, y, w, h) {
  for (let i = 0; i <= w; i++) {
    for (let j = 0; j <= h; j++) {
      const gx = Math.floor(x + i);
      const gy = Math.floor(y + j);

      let collision = false;

      if (
          gx < 0 || gy < 0 ||
          gx >= COLS || gy >= ROWS ||
          world[gy][gx] === 1
      ) {
        collision = true;
      }

      if (!collision) continue;

      const borders = getBorders(x, y, w, h);
      const wallBorder = getBorders(gx, gy, 1, 1);


      if (!twoBordersCollide(borders, wallBorder) ) continue;
      // If not in borders we are colliding with the block
      return true;
    }
  }
  return false;
}

function makeNoise(seed = 1337) {
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;

  let s = seed >>> 0;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0);

  /* Fisher–Yates shuffle */
  for (let i = 255; i > 0; i--) {
    const j = rand() % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }

  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y) => {
    const g = h & 3;               // 4 gradients
    return ((g & 1) ? -x : x) + ((g & 2) ? -y : y);
  };

  function perlin2(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = p[p[X]     + Y    ];
    const ab = p[p[X]     + Y + 1];
    const ba = p[p[X + 1] + Y    ];
    const bb = p[p[X + 1] + Y + 1];

    const x1 = lerp(grad(aa, xf,     yf    ), grad(ba, xf - 1, yf    ), u);
    const x2 = lerp(grad(ab, xf,     yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v);         // ∈ (-1,1)
  }

  return { perlin2 };
}

function generateTestLevel({
                             octaves   = 10,     // number of stacked noise layers
                             scale     = 0.2,   // broader hills
                             minSky    = 0,   // how much air at the top
                             maxGround = 1,  // how deep the ground can go
                             caveScale = 0.1,   // scale for cave noise
                             caveFreq  = 2,     // how frequent caves appear
                             caveAmp   = 0.01   // cave depth impact
                           } = {}) {
  const noise = makeNoise(Math.random() * 1000 * MAGIC_NUMBER);
  const ground = new Array(COLS);

  const minH = Math.floor(ROWS * minSky);
  const maxH = Math.floor(ROWS * maxGround);

  for (let x = 0; x < COLS; x++) {
    let n = 0, amp = 1, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      n += amp * noise.perlin2(x * scale * freq, 0);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    n /= norm;

    const verticalWarp = noise.perlin2(0, x * scale) * 0.3;

    ground[x] = Math.floor(
        minH + ((n + 1) / 2 + verticalWarp) * (maxH - minH)
    );
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (y >= ground[x]) {
        // Below surface, check for caves
        const caveNoise = noise.perlin2(x * caveScale * caveFreq, y * caveScale * caveFreq);
        world[y][x] = caveNoise > caveAmp ? 1 : 0;
      } else {
        world[y][x] = 0; // air
      }
    }
  }

  placeStar(`⭐1`);
  placeStar(`⭐2`);

  return world;
}

window.generateTestLevel = generateTestLevel;

canvas.addEventListener("mousedown", e => {
  if (gameOver || players.length === 0) return;

  const now = performance.now();

  if (now - lastActionTime < ACTION_COOLDOWN) return;

  lastActionTime = now;

  const rect = canvas.getBoundingClientRect();

  const gx   = Math.floor((e.clientX - rect.left) / TILE);
  const gy   = Math.floor((e.clientY - rect.top)  / TILE);

  if (
    world[gy] 
      && world[gy][gx] !== undefined 
      && world[gy][gx] !== `⭐1`
      && world[gy][gx] !== `⭐2`
  ) {
    const isAir = world[gy][gx] === 0;
    world[gy][gx] = isAir ? 1 : 0;

    window.eventCallback(
      "toggle_block",
      {
        position: {
          x: gx,
          y: gy
        },
        final_state: world[gy][gx]
      }
    );
  }
});

function externalToggleBlock(x, y, finalState) {
  if (gameOver) return;

  const gx   = Math.floor(x);
  const gy   = Math.floor(y);

  if (world[gy] && world[gy][gx] !== undefined) {
    world[gy][gx] = finalState;
  }
}

window.externalToggleBlock = externalToggleBlock;

function externalNewStar(x, y, id) {
  if (gameOver) return;

  const invId = id === 1 ? 2 : 1;

  const gx   = Math.floor(x);
  const gy   = Math.floor(y);

  // Remove the old star
  for (let i = 0; i < world.length; i++) {
    for (let j = 0; j < world[i].length; j++) {
      if (world[i][j] === `⭐${invId}`) {
        world[i][j] = 0;
      }
    }
  }

  if (world[gy] && world[gy][gx] !== undefined) {
    world[gy][gx] = `⭐${invId}`;
  }

  if (players.length > 0) {
    if (invId === 1) {
      p1.score++;
    } else {
      p2.score++;
    }

    hud.textContent = `YOU ${p1.score} - FUCKING SAHUR ${p2.score}`;
  }
}

window.externalNewStar = externalNewStar;

function externalNewScore(id, diff) {
  if (gameOver) return;
  if (players.length === 0) return;

  if (id === 1) {
    p1.score += diff;
  } else if (id === 2) {
    p2.score += diff;
  }

  hud.textContent = `YOU ${p1.score} - FUCKING SAHUR ${p2.score}`;
}

window.newScore = externalNewScore;

function externalEndGame(winner, gamePlayers) {
  if (gameOver) return;
  
  gameOver = true;
  alert(`Match over! ${winner} wins.`);
}

window.endGame = externalEndGame;

function externalPlayerMove(id, x, y) {
  if (gameOver) return;

  const player = players.find(p => p.id === id);

  if (player) {
    player.x = x;
    player.y = y;

    player.render();
  }
}

window.externalPlayerMove = externalPlayerMove;

function toggleBlockAtMouse() {
  if (gameOver) return;

  const rect = canvas.getBoundingClientRect();

  const gx   = Math.floor(mousePos.x / TILE);
  const gy   = Math.floor(mousePos.y / TILE);

  if (
    world[gy] 
    && world[gy][gx] !== undefined
    && world[gy][gx] !== `⭐1`
    && world[gy][gx] !== `⭐2`
  ) {
    const isAir = world[gy][gx] === 0;
    world[gy][gx] = isAir ? 1 : 0;

    window.eventCallback(
      "toggle_block",
      {
        position: {
          x: gx,
          y: gy
        },
        final_state: world[gy][gx]
      }
    );
  }
}

function checkTargets(player) {
  if (gameOver || !player.me) return;
  let idx = player.me ? 1 : 2;

  const gx = Math.floor(player.x);
  const gy = Math.floor(player.y);

  if (world[gy] === undefined) return;

  if (world[gy][gx] === `⭐${idx}`) {
    player.score++;
    world[gy][gx] = 0;

    const { x, y } = getRandomPosition();

    world[y][x] = `⭐${idx}`;

    window.eventCallback(
      "new_star",
      {
        position: {
          x,
          y
        },
        id: idx,
      }
    );
  }
}
