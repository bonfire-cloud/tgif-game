import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/server/game.js';
import { DESKS, DEPLOY } from '../src/shared/game.js';
const tick=(r:Room,seconds:number)=>{for(let i=0;i<seconds*120;i++)r.update(1/120);};
function solo(){const room=new Room('ABCDEF');room.join('player-one','Stefan');return room;}
test('solo builds collect three unique desk stamps and can be shipped',()=>{
 const r=solo(),b=r.builds[0];r.spawnClock=-100;assert.equal(b.held,0);
 assert.equal(r.pass('player-one',DESKS[1].x,DESKS[1].y),true);tick(r,3);assert.equal(b.held,0);assert.deepEqual(b.stamps,[0,1]);
 r.pass('player-one',DESKS[7].x,DESKS[7].y);tick(r,4);assert.equal(b.held,0);assert.deepEqual(b.stamps,[0,1,7]);
 r.pass('player-one',DEPLOY.x,DEPLOY.y);tick(r,1);assert.equal(r.shipped,1);assert.ok(!r.builds.includes(b));
});
test('human takeover preserves held build and desk stamp identity',()=>{const r=solo(),b=r.builds[0];r.pass('player-one',DESKS[1].x,DESKS[1].y);tick(r,.6);assert.equal(b.held,1);r.join('second-player','Sara');assert.equal(b.held,1);assert.deepEqual(b.stamps,[0,1]);assert.equal(r.players[1].desk,1);assert.ok(r.pass('second-player',DESKS[2].x,DESKS[2].y));});
test('departure hands held builds to helper and reroutes to remaining humans',()=>{const r=solo();r.spawnClock=-100;r.join('second-player','Sara');const b=r.builds[0];r.pass('player-one',DESKS[1].x,DESKS[1].y);tick(r,.6);r.leave('second-player');tick(r,3);assert.equal(b.held,0);assert.equal(r.players.length,1);});
test('room accepts eight active players and preserves round during joins',()=>{const r=solo();tick(r,5);const time=r.remaining,target=r.target,b=r.builds[0];for(let i=2;i<=8;i++)assert.notEqual(r.join('player-'+i,'Colleague '+i),null);assert.equal(r.join('ninth-player','Visitor'),null);assert.equal(r.players.length,8);assert.equal(r.remaining,time);assert.equal(r.target,target);assert.equal(r.builds[0],b);tick(r,20);assert.equal(r.capacity,5);for(let i=2;i<=8;i++)r.leave('player-'+i);const ids=r.builds.map(b=>b.id);tick(r,20);assert.equal(r.capacity,2);assert.ok(ids.every(id=>r.builds.some(b=>b.id===id)));});
test('room pauses without humans, finishes at 17:00 and rematches coherently',()=>{const r=solo();r.leave('player-one');tick(r,20);assert.equal(r.remaining,180);r.join('player-one','Stefan');tick(r,181);assert.equal(r.phase,'finished');assert.equal(r.remaining,0);assert.equal(r.pass('player-one',0,0),false);assert.equal(r.rematch(),true);assert.equal(r.phase,'playing');assert.equal(r.remaining,180);assert.equal(r.shipped,0);});
test('only identified human can pass and malformed directions are ignored',()=>{const r=solo();assert.equal(r.pass('other-player',0,0),false);assert.equal(r.pass('player-one',NaN,0),false);assert.equal(r.pass('player-one',Infinity,0),false);assert.equal(r.pass('player-one',100,0),false);assert.equal(r.builds[0].held,0);});
test('incomplete build is rejected by deploy and duplicate stamps do not advance it',()=>{const r=solo(),b=r.builds[0];r.pass('player-one',0,0);tick(r,2);assert.equal(r.shipped,0);assert.equal(b.stamps.length,1);r.catch(b,0);assert.equal(b.stamps.length,1);});

test('a solo player can juggle two circulating builds and meet the target',()=>{const r=solo();for(let i=0;i<120*90&&r.shipped<r.target;i++){if(i%24===0){const b=r.held(0);if(b){const target=b.stamps.length>=3?DEPLOY:DESKS[b.stamps.includes(1)?7:1];r.pass('player-one',target.x,target.y);}}r.update(1/120);}assert.ok(r.shipped>=r.target,`Only ${r.shipped} shipped`);assert.equal(r.rollbacks,0);});
