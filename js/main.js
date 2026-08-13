// js/main.js
import { Game } from './game.js';
import { getMaps } from './maps/generators.js';

const game=new Game();
const maps=getMaps();
let selectedMap=0;

// UI Setup
const mapGrid=document.getElementById('mapGrid');
maps.forEach((m,i)=>{
  const el=document.createElement('div');
  el.className='map-card'+(i===0?' active':'');
  el.innerHTML=`<div class="name">${m.name}</div>`;
  el.onclick=()=>{selectedMap=i;document.querySelectorAll('.map-card').forEach(c=>c.classList.remove('active'));el.classList.add('active');};
  mapGrid.appendChild(el);
});

document.getElementById('deployBtn').onclick=()=>{
  document.getElementById('setup').style.display='none';
  document.getElementById('battle').classList.add('active');
  game.canvas.width=window.innerWidth;game.canvas.height=window.innerHeight;
  game.sound.init();
  game.init(maps[selectedMap],{red:{count:30},blue:{count:30}});
};

document.querySelectorAll('.toggle').forEach(t=>{
  t.onclick=()=>{t.classList.toggle('on');game.cfg[t.dataset.param]=t.classList.contains('on');};
});

// Canvas Controls
game.canvas.addEventListener('mousedown',e=>{game.dragging=true;game.lastDrag={x:e.clientX,y:e.clientY};});
window.addEventListener('mousemove',e=>{if(game.dragging){game.camera.x-=(e.clientX-game.lastDrag.x)/game.camera.zoom;game.camera.y-=(e.clientY-game.lastDrag.y)/game.camera.zoom;game.lastDrag={x:e.clientX,y:e.clientY};}});
window.addEventListener('mouseup',()=>game.dragging=false);
game.canvas.addEventListener('wheel',e=>{e.preventDefault();game.camera.zoom=clamp(game.camera.zoom*(e.deltaY<0?1.1:0.9),0.2,4);},{passive:false});

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

// Loop
let lastT=performance.now();
function loop(t){
  const dt=Math.min(0.05,(t-lastT)/1000);lastT=t;
  if(document.getElementById('battle').classList.contains('active')){
    game.update(dt);game.render();
    document.getElementById('redAlive').textContent=game.soldiers.filter(s=>s.alive&&s.team==='red').length;
    document.getElementById('blueAlive').textContent=game.soldiers.filter(s=>s.alive&&s.team==='blue').length;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
