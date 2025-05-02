/* ===== CONFIG ===== */
const TILE      = 24;           // px
const COLS      = 32;
const ROWS      = 18;
const GRAVITY   = 0.4;
const JUMP_V    = -9;
const MOVE_V    = 3.2;
const FPS       = 60;
const ROUND_SEC = 60;

/* ===== GLOBALS ===== */
const canvas = document.getElementById("game");
const ctx    = canvas.getContext("2d");
const hud    = document.getElementById("hud");

let keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup",   e => keys[e.code] = false);

const world = [...Array(ROWS)].map(()=>Array(COLS).fill(0));      // 0 = air
generateTestLevel();

/* ===== ENTITIES ===== */
class Player {
  constructor(id,x,y,color,controls) {
    this.id=id;
    this.x=x; this.y=y;                     // top‑left, grid coords
    this.vx=0; this.vy=0;
    this.w=1;  this.h=2;
    this.color=color;
    this.controls=controls;
    this.score=0;
    this.onGround=false;
  }
  input() {
    const c=this.controls;
    if(keys[c.left])  this.vx=-MOVE_V;
    if(keys[c.right]) this.vx= MOVE_V;
    if(!keys[c.left] && !keys[c.right]) this.vx=0;
    if(keys[c.jump] && this.onGround) { this.vy=JUMP_V; this.onGround=false; }
  }
  step() {
    this.vy+=GRAVITY;
    this.move(this.vx/ FPS, 0);
    this.move(0, this.vy/ FPS);
  }
  move(dx,dy) {
    const tryX=this.x+dx, tryY=this.y+dy;
    if(!collides(tryX, this.y, this.w, this.h)) this.x=tryX; else this.vx=0;
    if(!collides(this.x, tryY, this.w, this.h)) { this.y=tryY; this.onGround=false; }
    else{
      if(dy>0){ this.onGround=true; this.vy=0; this.y=Math.floor(this.y+dy); }
      if(dy<0){ this.vy=0; this.y=Math.ceil(this.y+dy); }
    }
  }
  render() {
    ctx.fillStyle=this.color;
    ctx.fillRect(this.x*TILE, this.y*TILE, this.w*TILE, this.h*TILE);
  }
}

const p1=new Player("A", 2,10,"gold",   {left:"KeyA",right:"KeyD",jump:"KeyW"});
const p2=new Player("B",28,10,"cyan",   {left:"ArrowLeft",right:"ArrowRight",jump:"ArrowUp"});
const players=[p1,p2];

/* ===== CORE LOOP ===== */
let timer=ROUND_SEC;
let acc   =0, last=performance.now();

function loop(now){
  acc += (now-last)/1000;
  last = now;
  while(acc > 1/FPS) { update(); acc-=1/FPS; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(){
  if(timer<=0) return;
  timer -= 1/FPS;

  players.forEach(p=>{ p.input(); p.step(); checkTargets(p); });

  // simple win condition
  if(timer<=0){
    timer=0;
    const winner = p1.score===p2.score? "TIE": (p1.score>p2.score? "PLAYER A":"PLAYER B");
    alert(`Time's up! ${winner} wins.`);
    saveMatch({p1:p1.score,p2:p2.score,date:Date.now()});
  }
}

function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // blocks
  ctx.fillStyle="#555";
  world.forEach((row,y)=>row.forEach((cell,x)=>{
    if(cell===1) ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
    if(cell==="⭐A"||cell==="⭐B"){
      ctx.fillStyle=cell==="⭐A"?"gold":"cyan";
      ctx.fillRect(x*TILE+6,y*TILE+6,12,12);
      ctx.fillStyle="#555";
    }
  }));
  // players
  players.forEach(p=>p.render());

  hud.textContent = `⏱ ${Math.ceil(timer)} | 🟡 ${p1.score} – ⭐ ${p2.score}`;
}

/* ===== WORLD HELPERS ===== */
function collides(x,y,w,h){
  for(let i=0;i<w;i++){
    for(let j=0;j<h;j++){
      const gx=Math.floor(x+i), gy=Math.floor(y+j);
      if(world[gy] && world[gy][gx]===1) return true;
    }
  }
  return false;
}

function generateTestLevel(){
  // floor
  world[15].fill(1);
  // columns + stars
  world[12][2]=1;world[11][2]=1;world[10][2]=1;
  world[ 9][2]=1;world[ 8][2]=1;
  world[7][2]="⭐A";
  world[12][29]="⭐B";
}

/* ===== MOUSE: build / destroy ===== */
canvas.addEventListener("mousedown",e=>{
  const rect=canvas.getBoundingClientRect();
  const gx=Math.floor((e.clientX-rect.left)/TILE);
  const gy=Math.floor((e.clientY-rect.top) /TILE);
  if(e.shiftKey){
    if(world[gy][gx]===1) world[gy][gx]=0;
  }else{
    if(world[gy][gx]===0) world[gy][gx]=1;
  }
});

/* ===== TARGET PICKUP ===== */
function checkTargets(player){
  const gx=Math.floor(player.x), gy=Math.floor(player.y);
  if(world[gy] && (world[gy][gx]==="⭐"+player.id)){
    player.score++;
    world[gy][gx]=0;
    // spawn a new target randomly
    let tx,ty;
    do{
      tx=Math.floor(Math.random()*COLS);
      ty=Math.floor(Math.random()*ROWS);
    }while(world[ty][tx]!==0);
    world[ty][tx]="⭐"+player.id;
  }
}

/* ===== BACKEND STUBS ===== */
async function saveMatch(result){
  /* Hook me up to your DB. Example:
     await fetch("/api/match",{method:"POST",body:JSON.stringify(result)}); */
  console.log("saveMatch()",result);
}

async function loadMatch(id){
  /* Placeholder for loading historical match */
  console.log("loadMatch()",id);
}
