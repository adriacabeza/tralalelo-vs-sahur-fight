/* ===== CONFIG ===== */
const canvas = document.getElementById("game");
const TILE            = 24;          // px
const COLS            = Math.floor(canvas.width/TILE);
const ROWS            = Math.floor(canvas.height/TILE);
const GRAVITY         = 1;
const JUMP_V          = -30;
const MOVE_V          = 10.5;         // faster movement
const FPS             = 60;
const MAX_POINTS      = 10;          // best of 10 stars
const ACTION_COOLDOWN = 50;         // ms cooldown for build/destroy
const COLLISION_DELTA = 0.05;        // how much to offset the collision box


/* ===== GLOBALS ===== */
const ctx    = canvas.getContext("2d");
const hud    = document.getElementById("hud");

let keys           = {};
let gameOver       = false;
let mousePos       = { x: 0, y: 0 };
let lastActionTime = 0;

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

const world = [...Array(ROWS)].map(() => Array(COLS).fill(0));  // 0 = air, 1 = block
generateTestLevel();

/* ===== ENTITIES ===== */
class Player {
  constructor(id, x, y, color, controls, isUseless=false) {
    this.id       = id;
    this.x        = x;   this.y = y;
    this.vx       = 0;   this.vy = 0;
    this.w        = 1;   this.h  = 1;
    this.color    = color;
    this.controls = controls;
    this.score    = 0;
    this.isJumping = true;
    this.isUseless = isUseless;
  }
  input() {
    const c = this.controls;
    if (keys[c.left])  this.vx = -MOVE_V;
    if (keys[c.right]) this.vx =  MOVE_V;
    if (!keys[c.left] && !keys[c.right]) this.vx = 0;
    if (keys[c.jump] && !this.isJumping) { this.vy = JUMP_V; this.isJumping = true; }
  }

  step() {
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
    }
  }

  render() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x * TILE, this.y * TILE, this.w * TILE, this.h * TILE);
  }
}

const p1      = new Player("A", 2, 10, "gold", { left: "KeyA", right: "KeyD", jump: "KeyW" });
const p2      = new Player("B", 28,10, "cyan", { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp" });
const players = [p1, p2];

/* ===== CORE LOOP ===== */
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
  if (gameOver) return;
  players.forEach(p => { if (!p.isUseless){
    p.input(); p.step(); checkTargets(p);} }
  );
  if (p1.score + p2.score >= MAX_POINTS) {
    gameOver = true;
    const winner = p1.score === p2.score ? "TIE" : (p1.score > p2.score ? "PLAYER A" : "PLAYER B");
    alert(`Match over! ${winner} wins.`);
    saveMatch({ p1: p1.score, p2: p2.score, date: Date.now() });
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#555";
  world.forEach((row, y) => row.forEach((cell, x) => {
    if (cell === 1) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    if (cell === "⭐A" || cell === "⭐B") {
      ctx.fillStyle = cell === "⭐A" ? "gold" : "cyan";
      ctx.fillRect(x * TILE + 6, y * TILE + 6, 12, 12);
      ctx.fillStyle = "#555";
    }
  }));
  players.forEach(p => p.render());
  hud.textContent = `🟡 ${p1.score} – ⭐ ${p2.score}`;
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


/* ===== WORLD HELPERS ===== */
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




function generateTestLevel() {
  const density = 0.1;      // % chance of a block

  // 1) Clear & randomly fill
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      world[y][x] = (Math.random() < density) ? 1 : 0;
    }
  }
  world[ROWS - 1].fill(1);
  const ty = ROWS - 2;
  // helper to find a random empty cell
  function placeStar(symbol) {
    let tx;
    do {
      tx = Math.floor(Math.random() * COLS);
    } while (world[ty][tx] !== 0);
    world[ty][tx] = symbol;
  }

  placeStar("⭐A");
  placeStar("⭐B");
}


/* ===== INPUT: toggle blocks ===== */
canvas.addEventListener("mousedown", e => {
  if (gameOver) return;
  const now = performance.now();
  if (now - lastActionTime < ACTION_COOLDOWN) return;
  lastActionTime = now;
  const rect = canvas.getBoundingClientRect();
  const gx   = Math.floor((e.clientX - rect.left) / TILE);
  const gy   = Math.floor((e.clientY - rect.top)  / TILE);
  if (world[gy] && world[gy][gx] !== undefined && world[gy][gx] !== "⭐A" && world[gy][gx] !== "⭐B") {
    world[gy][gx] = world[gy][gx] === 1 ? 0 : 1;
  }
});

function toggleBlockAtMouse() {
  if (gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const gx   = Math.floor(mousePos.x / TILE);
  const gy   = Math.floor(mousePos.y / TILE);
  if (world[gy] && world[gy][gx] !== undefined) {
    world[gy][gx] = world[gy][gx] === 1 ? 0 : 1;
  }
}

/* ===== TARGET PICKUP ===== */
function checkTargets(player) {
  const gx = Math.floor(player.x), gy = Math.floor(player.y);
  if (world[gy] === undefined) return;
  if (world[gy][gx] === `⭐${player.id}`) {
    player.score++;
    world[gy][gx] = 0;
    let tx, ty;
    do { tx = Math.floor(Math.random() * COLS); ty = Math.floor(Math.random() * ROWS); }
    while (world[ty][tx] !== 0);
    world[ty][tx] = `⭐${player.id}`;
  }
}

/* ===== BACKEND STUBS ===== */
async function saveMatch(result) { console.log("saveMatch()", result); }
async function loadMatch(id)     { console.log("loadMatch()", id); }
