// js/maps/generators.js
import { Grid } from '../core/engine.js';

const MAPS=[
  {id:'villages',name:'Twin Villages',w:90,h:65,gen:genVillages},
  {id:'fortress',name:'Fortress Siege',w:100,h:70,gen:genFortress},
  {id:'downtown',name:'Downtown Grid',w:100,h:70,gen:genDowntown}
];

export function getMaps(){return MAPS;}

function hollowRect(g,x,y,w,h,d){
  for(let i=0;i<w;i++){g.set(x+i,y,1);g.set(x+i,y+h-1,1);}
  for(let j=0;j<h;j++){g.set(x,y+j,1);g.set(x+w-1,y+j,1);}
  const m=Math.floor(w/2),mh=Math.floor(h/2);
  if(d==='b')g.set(x+m,y+h-1,0); else if(d==='t')g.set(x+m,y,0); else if(d==='l')g.set(x,y+mh,0); else if(d==='r')g.set(x+w-1,y+mh,0);
}
function coverRect(g,x,y,w,h){for(let j=0;j<h;j++)for(let i=0;i<w;i++){if(g.get(x+i,y+j)===0)g.set(x+i,y+j,2);}}
function roadH(g,y,w){for(let x=0;x<g.w;x++)for(let dy=-w;dy<=w;dy++)g.setT(x,y+dy,1);}
function roadV(g,x,w){for(let y=0;y<g.h;y++)for(let dx=-w;dx<=w;dx++)g.setT(x+dx,y,1);}

function genHouse(g,x,y,w,h,d){
  hollowRect(g,x,y,w,h,d);
  if(w>6&&h>6){
    for(let i=x+2;i<x+w-2;i++)g.set(i,y+Math.floor(h/2),1);
    g.set(x+Math.floor(w/2),y+Math.floor(h/2),0);
    coverRect(g,x+1,y+1,2,1);
  }
}

function genVillages(grid){
  for(let y=0;y<grid.h;y++)for(let x=0;x<grid.w;x++)grid.setT(x,y,0);
  roadV(grid,Math.floor(grid.w/2),2);
  // Left Village
  genHouse(grid,10,10,12,10,'b'); genHouse(grid,30,15,10,8,'l'); genHouse(grid,15,35,15,12,'t');
  // Right Village
  genHouse(grid,70,10,12,10,'b'); genHouse(grid,55,15,10,8,'r'); genHouse(grid,62,35,15,12,'t');
  // Forests
  for(let x=5;x<20;x++)for(let y=45;y<60;y++)if((x+y)%3===0)grid.set(x,y,2);
  for(let x=75;x<90;x++)for(let y=45;y<60;y++)if((x+y)%3===0)grid.set(x,y,2);
}

function genFortress(grid){
  for(let y=0;y<grid.h;y++)for(let x=0;x<grid.w;x++)grid.setT(x,y,2);
  roadH(grid,Math.floor(grid.h/2),3);
  // Central Fortress
  hollowRect(grid,40,25,20,20,'b');
  hollowRect(grid,45,30,10,10,'t');
  coverRect(grid,42,27,3,3); coverRect(grid,55,27,3,3);
  // Outlying Cover
  for(let i=0;i<10;i++){coverRect(grid,10+i*3,10+i%2*40,2,2);}
  for(let i=0;i<15;i++){coverRect(grid,80+randInt(0,5),randInt(10,60),2,2);}
}

function genDowntown(grid){
  for(let y=0;y<grid.h;y++)for(let x=0;x<grid.w;x++)grid.setT(x,y,4);
  roadH(grid,Math.floor(grid.h*0.33),2);roadH(grid,Math.floor(grid.h*0.66),2);
  roadV(grid,Math.floor(grid.w*0.33),2);roadV(grid,Math.floor(grid.w*0.66),2);
  // Identical Blocks
  const blocks=[[5,5,20,15],[40,5,20,15],[75,5,20,15],[5,45,20,15],[40,45,20,15],[75,45,20,15]];
  blocks.forEach(b=>genHouse(grid,b[0],b[1],b[2],b[3],'b'));
}
