export const ROUND_SECONDS = 180;
export const DESKS = [
  {id:0,x:-4.5,y:0,label:'Flame'}, {id:1,x:-3.2,y:-2.45,label:'Coffee'},
  {id:2,x:0,y:-2.45,label:'Duck'}, {id:3,x:3.2,y:-2.45,label:'Plant'},
  {id:4,x:4.5,y:0,label:'Cloud'}, {id:5,x:3.2,y:2.45,label:'Bun'},
  {id:6,x:0,y:2.45,label:'Rocket'}, {id:7,x:-3.2,y:2.45,label:'Disco'},
];
export const BUMPERS = [{x:-1.65,y:-.72,r:.32},{x:1.65,y:.72,r:.32}];
export const DEPLOY = {x:0,y:0,r:.58};
export type Player = {id:string;name:string;desk:number};
export type Build = {id:number;x:number;y:number;vx:number;vy:number;stamps:number[];held:number|null;sender:number;age:number;flight:number;wait:number;banked:boolean;returningTo:number|null};
export type GameEvent = {id:number;text:string;kind:'join'|'stamp'|'ship'|'bounce'|'info'};
export type Snapshot = {code:string;phase:'playing'|'finished';remaining:number;target:number;shipped:number;rollbacks:number;banks:number;players:Player[];builds:Build[];events:GameEvent[];capacity:number};
export type ClientMessage = {type:'join';code:string;name:string;clientId:string}|{type:'pass';x:number;y:number}|{type:'claim'}|{type:'rematch'}|{type:'ping';signal:'ready'|'full'};
export type ServerMessage = {type:'welcome';clientId:string;desk:number|null}|{type:'state';state:Snapshot}|{type:'error';message:string};
export function trafficFor(humans:number){return Math.min(5,2+Math.floor(Math.max(0,humans-1)/2));}
export function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(a.x-b.x,a.y-b.y);}
