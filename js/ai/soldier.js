// js/ai/soldier.js
import { dist, dist2, clamp, lerp, angDiff, hasThickLOS, findPath } from '../core/engine.js';

export class Soldier {
  constructor(team,x,y,profile,weapon){
    this.team=team;this.x=x;this.y=y;this.vx=0;this.vy=0;
    this.angle=team==='red'?0:Math.PI;this.targetAngle=this.angle;
    this.health=100;this.alive=true;this.state='PATROL';this.target=null;
    this.path=null;this.pathIdx=0;this.repathTimer=0;this.ammo=30;this.maxAmmo=30;
    this.weaponType=weapon;this.profile=profile;this.shootRange=300;
    this.muzzleFlash=0;this.lastShot=0;this.stuckTimer=0;this.lastPos={x,y};
  }
  
  update(dt,game){
    if(!this.alive)return;
    this.muzzleFlash=Math.max(0,this.muzzleFlash-dt*15);
    
    // Find Target
    if(!this.target||!this.target.alive) this.target=this.findEnemy(game);
    
    // State Machine
    if(this.ammo<=0) this.state='RELOAD';
    else if(this.target){
      if(hasThickLOS(game.grid,this.x,this.y,this.target.x,this.target.y,5.0)){
        this.state = (dist(this.x,this.y,this.target.x,this.target.y) < this.shootRange) ? 'ENGAGE' : 'ADVANCE';
      } else this.state='ADVANCE';
    } else this.state='PATROL';
    
    this.desiredVx=0;this.desiredVy=0;
    if(this.state==='ADVANCE'||this.state=='PATROL') this.followPath(dt,game);
    
    // FIX: NO SPINNING. Only face movement dir if actually moving and not aiming.
    const speed=Math.hypot(this.vx,this.vy);
    if(this.state==='ENGAGE' && this.target){
      this.targetAngle=Math.atan2(this.target.y-this.y,this.target.x-this.x);
    } else if(speed>5){
      this.targetAngle=Math.atan2(this.vy,this.vx);
    }
    
    // Shooting
    if(this.state==='ENGAGE' && this.target){
      const now=performance.now()/1000;
      if(now-this.lastShot>0.2 && this.ammo>0){
        this.lastShot=now;this.ammo--;this.muzzleFlash=1;
        const ang=this.targetAngle+rand(-0.1,0.1);
        game.spawnBullet(this,ang);
        game.sound.playShot(this.weaponType);
      }
    }
    
    this.applyMovement(dt,game);
  }
  
  findEnemy(game){
    let best=null,bd=400*400;
    game.spatial.query(this.x,this.y,400,s=>{
      if(!s.alive||s.team===this.team)return;
      const d=dist2(this.x,this.y,s.x,s.y);
      if(d<bd && hasThickLOS(game.grid,this.x,this.y,s.x,s.y,5.0)){bd=d;best=s;}
    });
    return best;
  }
  
  followPath(dt,game){
    const t=this.target||{x:game.spawns[this.team==='red'?'blue':'red'].x,y:game.spawns[this.team==='red'?'blue':'red'].y};
    this.repathTimer-=dt;
    if(this.repathTimer<=0||!this.path){this.repathTimer=2.0;this.path=findPath(game.grid,this.x,this.y,t.x,t.y);this.pathIdx=0;}
    if(this.path&&this.pathIdx<this.path.length){
      const np=this.path[this.pathIdx];
      const dx=np.x-this.x,dy=np.y-this.y,d=Math.hypot(dx,dy);
      if(d<16)this.pathIdx++;
      else{this.desiredVx=(dx/d)*this.profile.speed;this.desiredVy=(dy/d)*this.profile.speed;}
    }
  }
  
  applyMovement(dt,game){
    let mag=Math.hypot(this.desiredVx,this.desiredVy);
    let dx=mag>0?this.desiredVx/mag:0, dy=mag>0?this.desiredVy/mag:0;
    
    // Obstacle Avoidance & Sliding
    const checkX=this.x+dx*18, checkY=this.y+dy*18;
    if(game.grid.circleBlocked(checkX,checkY,5)){
      const lDx=-dy,lDy=dx, rDx=dy,rDy=-dx;
      if(!game.grid.circleBlocked(this.x+lDx*18,this.y+lDy*18,5)){dx=lDx;dy=lDy;}
      else if(!game.grid.circleBlocked(this.x+rDx*18,this.y+rDy*18,5)){dx=rDx;dy=rDy;}
      else mag*=0.1;
    }
    
    this.vx=lerp(this.vx,dx*mag,Math.min(1,dt*8));
    this.vy=lerp(this.vy,dy*mag,Math.min(1,dt*8));
    
    // Unstuck Logic
    if(dist(this.x,this.y,this.lastPos.x,this.lastPos.y)<1 && mag>10){
      this.stuckTimer+=dt;
      if(this.stuckTimer>0.3){
        this.path=null;this.stuckTimer=0;
        // Perpendicular escape burst
        this.vx=rand(-40,40);this.vy=rand(-40,40);
      }
    }
    this.lastPos.x=this.x;this.lastPos.y=this.y;
    
    if(!game.grid.circleBlocked(this.x+this.vx*dt,this.y,5))this.x+=this.vx*dt;
    if(!game.grid.circleBlocked(this.x,this.y+this.vy*dt,5))this.y+=this.vy*dt;
    
    // Angle interpolation
    const da=angDiff(this.angle,this.targetAngle);
    this.angle+=da*Math.min(1,dt*12);
  }
}
