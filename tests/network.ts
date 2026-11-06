import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { DESKS, DEPLOY, type Snapshot, type ServerMessage } from '../src/shared/game.js';
const base=process.env.TEST_URL||'http://localhost:3001';
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn:()=>boolean,timeout=8000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error('Timed out waiting for network state');await sleep(50);}}
class Client {
 ws:WebSocket;state:Snapshot|null=null;desk:number|null|undefined=undefined;id=randomUUID();
 constructor(code:string,name:string){this.ws=new WebSocket(base.replace(/^http/,'ws')+'/ws');this.ws.on('open',()=>this.ws.send(JSON.stringify({type:'join',code,name,clientId:this.id})));this.ws.on('message',raw=>{const m=JSON.parse(raw.toString()) as ServerMessage;if(m.type==='welcome')this.desk=m.desk;if(m.type==='state')this.state=m.state;});}
 pass(x:number,y:number){this.ws.send(JSON.stringify({type:'pass',x,y}));}
 close(){this.ws.close();}
}
const clients:Client[]=[];
try {
 const health=await fetch(base+'/api/health');assert.equal(health.status,200);
 const response=await fetch(base+'/api/rooms',{method:'POST'});assert.equal(response.status,201);const {code}=await response.json() as {code:string};
 const solo=new Client(code,'Solo QA');clients.push(solo);await until(()=>!!solo.state&&solo.desk===0);
 const began=Date.now();let sawTwo=false;while((solo.state?.shipped||0)<2){if(Date.now()-began>30000)throw Error('Solo shipment timed out');const s=solo.state!;if(s.builds.length>=2)sawTwo=true;const b=s.builds.find(b=>b.held===0);if(b){const d=b.stamps.length>=3?DEPLOY:DESKS[b.stamps.includes(1)?7:1];solo.pass(d.x,d.y);}await sleep(180);}
 assert.ok(sawTwo);const before=solo.state!,target=before.target;
 for(let i=1;i<9;i++){const c=new Client(code,'Coworker '+i);clients.push(c);await until(()=>c.desk!==undefined);}
 await until(()=>solo.state?.players.length===8);assert.equal(clients[8].desk,null);assert.equal(solo.state!.target,target);assert.ok(solo.state!.remaining<=before.remaining);assert.ok(solo.state!.shipped>=2);
 clients[1].close();await until(()=>solo.state?.players.length===7);clients[8].ws.send(JSON.stringify({type:'claim'}));await until(()=>clients[8].desk===1);await until(()=>solo.state?.players.length===8);
 for(let i=2;i<9;i++)clients[i].close();await until(()=>solo.state?.players.length===1);
 console.log(JSON.stringify({ok:true,url:base,room:code,soloShipments:solo.state!.shipped,twoBuildsObserved:sawTwo,maxHumans:8,ninthSpectated:true,lateClaim:true,returnedToSolo:true,targetPreserved:true,remaining:Math.round(solo.state!.remaining)},null,2));
} finally {clients.forEach(c=>c.close());}
