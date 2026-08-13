// js/core/engine.js
export const rand = (a,b)=>a+Math.random()*(b-a);
export const randInt = (a,b)=>Math.floor(rand(a,b+1));
export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp = (a,b,t)=>a+(b-a)*t;
export const dist = (x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
export const dist2 = (x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1;return dx*dx+dy*dy;};
export const angDiff = (a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d;};

export class Grid {
  constructor(w,h,cs){this.w=w;this.h=h;this.cs=cs;this.cells=new Uint8Array(w*h);this.terrain=new Uint8Array(w*h);this.pixW=w*cs;this.pixH=h*cs;}
  inb(x,y){return x>=0&&y>=0&&x<this.w&&y<this.h;}
  get(x,y){return this.inb(x,y)?this.cells[y*this.w+x]:1;}
  set(x,y,v){if(this.inb(x,y))this.cells[y*this.w+x]=v;}
  worldToCell(x,y){return {x:Math.floor(x/this.cs),y:Math.floor(y/this.cs)};}
  isBlocked(x,y){return this.get(x,y)===1;}
  circleBlocked(x,y,r){
    const cs=this.cs;
    const x0=Math.floor((x-r)/cs),x1=Math.floor((x+r)/cs);
    const y0=Math.floor((y-r)/cs),y1=Math.floor((y+r)/cs);
    for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){
      if(this.get(cx,cy)===1){
        const nx=clamp(x,cx*cs,cx*cs+cs),ny=clamp(y,cy*cs,cy*cs+cs);
        if(dist2(x,y,nx,ny)<r*r)return true;
      }
    }
    return false;
  }
  clearZone(cx,cy,r){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy<=r*r&&this.inb(cx+dx,cy+dy))this.set(cx+dx,cy+dy,0);}}
}

// Thick LOS check to prevent path smoothing through wall cracks
export function hasThickLOS(grid,x0,y0,x1,y1,r){
  const dx=x1-x0,dy=y1-y0;
  const steps=Math.ceil(Math.hypot(dx,dy)/(grid.cs/2));
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    const px=x0+dx*t, py=y0+dy*t;
    if(grid.circleBlocked(px,py,r)) return false;
  }
  return true;
}

class MinHeap{
  constructor(){this.a=[];}
  push(v){const a=this.a;a.push(v);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p][0]>a[i][0]){[a[p],a[i]]=[a[i],a[p]];i=p;}else break;}}
  pop(){const a=this.a;const r=a[0];const e=a.pop();if(a.length){a[0]=e;let i=0;const n=a.length;while(true){let l=i*2+1,r2=i*2+2,m=i;if(l<n&&a[l][0]<a[m][0])m=l;if(r2<n&&a[r2][0]<a[m][0])m=r2;if(m!==i){[a[m],a[i]]=[a[i],a[m]];i=m;}else break;}}return r;}
  get size(){return this.a.length;}
}

export function findPath(grid,sx,sy,ex,ey){
  const cs=grid.cs;
  const sgx=Math.floor(sx/cs),sgy=Math.floor(sy/cs);
  let egx=Math.floor(ex/cs),egy=Math.floor(ey/cs);
  if(!grid.inb(egx,egy)){egx=clamp(egx,0,grid.w-1);egy=clamp(egy,0,grid.h-1);}
  if(grid.get(egx,egy)===1){
    let best=null,bd=Infinity;
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      const nx=egx+dx,ny=egy+dy;
      if(grid.inb(nx,ny)&&grid.get(nx,ny)!==1){const d=dx*dx+dy*dy;if(d<bd){bd=d;best=[nx,ny];}}
    }
    if(best){egx=best[0];egy=best[1];}
  }
  if(sgx===egx&&sgy===egy)return [{x:ex,y:ey}];
  
  const W=grid.w;
  const open=new MinHeap();
  const gScore=new Float32Array(W*grid.h).fill(Infinity);
  const cameFrom=new Int32Array(W*grid.h).fill(-1);
  const closed=new Uint8Array(W*grid.h);
  const startIdx=sgy*W+sgx,endIdx=egy*W+egx;
  gScore[startIdx]=0;
  const heur=(x,y)=>Math.abs(x-egx)+Math.abs(y-egy);
  open.push([heur(sgx,sgy),sgx,sgy,startIdx]);
  
  while(open.size){
    const[,cx,cy,ci]=open.pop();
    if(ci===endIdx){
      const path=[];let cur=endIdx;
      while(cur!==-1){path.unshift({x:(cur%W)*cs+cs/2,y:Math.floor(cur/W)*cs+cs/2});cur=cameFrom[cur];}
      path.push({x:ex,y:ey});
      return smoothPath(grid, path);
    }
    if(closed[ci])continue;
    closed[ci]=1;
    const dirs=[[-1,0,1.4],[1,0,1.4],[0,-1,1.4],[0,1,1.4],[-1,-1,1],[-1,1,1],[1,-1,1],[1,1,1]];
    for(const[ox,oy,cost]of dirs){
      const nx=cx+ox,ny=cy+oy;
      if(!grid.inb(nx,ny))continue;
      const ni=ny*W+nx;
      if(closed[ni]||grid.get(nx,ny)===1)continue;
      if(ox&&oy){if(grid.get(cx+ox,cy)===1||grid.get(cx,cy+ox)===1)continue;}
      const tg=gScore[ci]+cost;
      if(tg<gScore[ni]){gScore[ni]=tg;cameFrom[ni]=ci;open.push([tg+heur(nx,ny),nx,ny,ni]);}
    }
  }
  return null;
}

function smoothPath(grid, path) {
  if (!path || path.length < 3) return path;
  const smoothed = [path[0]];
  let current = 0;
  while (current < path.length - 1) {
    let next = current + 1;
    for (let i = path.length - 1; i > current + 1; i--) {
      // THICK LOS PREVENTS CORNER CUTTING
      if (hasThickLOS(grid, path[current].x, path[current].y, path[i].x, path[i].y, 5.0)) {
        next = i;
        break;
      }
    }
    smoothed.push(path[next]);
    current = next;
  }
  return smoothed;
}

// --- SOUND ENGINE ---
export class SoundEngine {
  constructor(){this.ctx=null;this.enabled=true;}
  init(){if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();}
  playShot(type='rifle'){
    if(!this.enabled||!this.ctx)return;
    const c=this.ctx;
    const o=c.createOscillator(),g=c.createGain();
    o.type='square';
    o.frequency.setValueAtTime(type==='sniper'?120:80,c.currentTime);
    o.frequency.exponentialRampToValueAtTime(30,c.currentTime+0.1);
    g.gain.setValueAtTime(0.1,c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.1);
    o.connect(g);g.connect(c.destination);
    o.start();o.stop(c.currentTime+0.1);
  }
  playExplosion(){
    if(!this.enabled||!this.ctx)return;
    const c=this.ctx;
    const o=c.createOscillator(),g=c.createGain();
    o.type='sawtooth';
    o.frequency.setValueAtTime(60,c.currentTime);
    o.frequency.exponentialRampToValueAtTime(20,c.currentTime+0.4);
    g.gain.setValueAtTime(0.3,c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.4);
    o.connect(g);g.connect(c.destination);
    o.start();o.stop(c.currentTime+0.4);
  }
}
