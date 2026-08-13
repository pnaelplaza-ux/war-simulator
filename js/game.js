// js/game.js
import { Grid, SoundEngine, dist, dist2, clamp } from './core/engine.js';
import { Soldier } from './ai/soldier.js';

export class Game {
  constructor(){
    this.canvas=document.getElementById('game');
    this.ctx=this.canvas.getContext('2d');
    this.soldiers=[];this.bullets=[];this.particles=[];this.decals=[];
    this.spatial={map:new Map(),cell:80,clear(){this.map.clear();},set(x,y,o){const k=Math.floor(x/this.cell)+','+Math.floor(y/this.cell);if(!this.map.has(k))this.map.set(k,[]);this.map.get(k).push(o);},query(x,y,r,cb){for(let cx=Math.floor((x-r)/this.cell);cx<=Math.floor((x+r)/this.cell);cx++)for(let cy=Math.floor((y-r)/this.cell);cy<=Math.floor((y+r)/this.cell);cy++){const a=this.map.get(cx+','+cy);if(a)a.forEach(cb);}}};
    this.sound=new SoundEngine();
    this.cfg={tracers:true,sound:true,hostMode:false};
    this.camera={x:0,y:0,zoom:1};this.dragging=false;
  }
  
  init(mapCfg,teamCfg){
    this.grid=new Grid(mapCfg.w,mapCfg.h,14);
    mapCfg.gen(this.grid);
    this.terrainCv=document.createElement('canvas');
    this.terrainCv.width=this.grid.pixW;this.terrainCv.height=this.grid.pixH;
    this.renderTerrain();
    
    this.spawns={red:{x:90,y:this.grid.pixH/2},blue:{x:this.grid.pixW-90,y:this.grid.pixH/2}};
    this.grid.clearZone(Math.floor(this.spawns.red.x/14),Math.floor(this.spawns.red.y/14),6);
    this.grid.clearZone(Math.floor(this.spawns.blue.x/14),Math.floor(this.spawns.blue.y/14),6);
    
    this.soldiers=[];
    if(!this.cfg.hostMode){
      for(let i=0;i<teamCfg.red.count;i++)this.spawn('red');
      for(let i=0;i<teamCfg.blue.count;i++)this.spawn('blue');
    }
    this.camera.x=this.grid.pixW/2;this.camera.y=this.grid.pixH/2;
    this.camera.zoom=clamp(Math.min(this.canvas.width/this.grid.pixW,this.canvas.height/this.grid.pixH),0.3,1.5);
  }
  
  spawn(team){
    const sp=this.spawns[team];
    const a=Math.random()*Math.PI*2,r=dist(0,0,rand(20,80),0);
    const x=sp.x+Math.cos(a)*r, y=sp.y+Math.sin(a)*r;
    if(!this.grid.circleBlocked(x,y,8)) this.soldiers.push(new Soldier(team,x,y,{speed:40},team==='red'?'rifle':'smg'));
    else this.spawn(team);
  }
  
  spawnBullet(s,ang){
    this.bullets.push({x:s.x,y:s.y,vx:Math.cos(ang)*600,vy:Math.sin(ang)*600,dmg:20,team:s.team,trail:[]});
  }
  
  update(dt){
    this.spatial.clear();
    this.soldiers.forEach(s=>{if(s.alive)this.spatial.set(s.x,s.y,s)});
    this.soldiers.forEach(s=>s.update(dt,this));
    
    for(let i=this.bullets.length-1;i>=0;i--){
      const b=this.bullets[i];
      b.trail.push({x:b.x,y:b.y});if(b.trail.length>4)b.trail.shift();
      const nx=b.x+b.vx*dt, ny=b.y+b.vy*dt;
      if(this.grid.isBlocked(Math.floor(nx/14),Math.floor(ny/14))){this.bullets.splice(i,1);continue;}
      let hit=false;
      this.spatial.query(nx,ny,8,o=>{
        if(hit||!o.alive||o.team===b.team)return;
        if(dist2(nx,ny,o.x,o.y)<36){o.health-=b.dmg;if(o.health<=0)o.alive=false;hit=true;}
      });
      if(hit)this.bullets.splice(i,1); else {b.x=nx;b.y=ny;}
    }
  }
  
  renderTerrain(){
    const c=this.terrainCv.getContext('2d'),g=this.grid,cs=14;
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
      const t=g.getT(x,y);
      c.fillStyle=t===1?'#36342a':t===2?'#4a4128':t===4?'#3a352c':'#2a2e1d';
      c.fillRect(x*cs,y*cs,cs,cs);
    }
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
      if(g.get(x,y)===1){
        c.fillStyle='#5a5550';c.fillRect(x*cs,y*cs,cs,cs);
        c.fillStyle='#3a3530';c.fillRect(x*cs,y*cs+cs-2,cs,2);
      } else if(g.get(x,y)===2){c.fillStyle='#5a4a2a';c.fillRect(x*cs,y*cs,cs,cs);}
    }
  }
  
  render(){
    const ctx=this.ctx,W=this.canvas.width,H=this.canvas.height;
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.translate(W/2,H/2);ctx.scale(this.camera.zoom,this.camera.zoom);ctx.translate(-this.camera.x,-this.camera.y);
    ctx.drawImage(this.terrainCv,0,0);
    
    // Bullets
    if(this.cfg.tracers){
      ctx.lineWidth=1.5;
      this.bullets.forEach(b=>{
        ctx.strokeStyle=b.team==='red'?'rgba(232,90,79,0.7)':'rgba(90,175,239,0.7)';
        ctx.beginPath();ctx.moveTo(b.trail[0]?.x||b.x,b.trail[0]?.y||b.y);
        b.trail.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(b.x,b.y);ctx.stroke();
      });
    }
    
    // Soldiers
    this.soldiers.forEach(s=>{
      if(!s.alive)return;
      ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);
      ctx.fillStyle=s.team==='red'?'#c8312b':'#2b7fc8';
      ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#1a1d14';ctx.fillRect(3,-1,8,2);
      if(s.muzzleFlash>0){ctx.fillStyle='#ffeb3b';ctx.fillRect(11,-1,4,2);}
      ctx.restore();
    });
    ctx.restore();
  }
}
