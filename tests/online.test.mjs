import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import vm from 'node:vm';
import fs from 'node:fs';
import { OnlineMatch } from '../multiplayer.js';
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../build/chess.min.js', import.meta.url), 'utf8'), context);
const Chess = context.Chess;
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const peers = new Map();
class Connection extends EventEmitter {
  open = false;
  send(data) { queueMicrotask(() => { if (this.open && this.other.open) this.other.emit('data', structuredClone(data)); }); }
  close() { if (!this.open) return; this.open = this.other.open = false; this.emit('close'); this.other.emit('close'); }
}
class Peer extends EventEmitter {
  constructor(id = crypto.randomUUID()) { super(); this.id = id; peers.set(id, this); setTimeout(() => this.emit('open', id), 0); }
  connect(id) {
    const a = new Connection(), b = new Connection(); a.other = b; b.other = a;
    setTimeout(() => { peers.get(id).emit('connection', b); a.open = b.open = true; b.emit('open'); a.emit('open'); }, 0);
    return a;
  }
  destroy() { peers.delete(this.id); this.destroyed = true; }
}
function create(storage = new Map()) {
  return new OnlineMatch({ Chess, peerFactory: async id => new Peer(id), storage: { getItem: key => storage.get(key), setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) } });
}
async function pair() {
  const host = create(), guest = create();
  await host.start('host', '12345678'); await tick();
  await guest.start('guest', '12345678'); await tick(); await tick();
  assert.equal(host.connected, true); assert.equal(guest.connected, true);
  return [host, guest];
}
test('two players: legal moves, turn ownership, invalid move and third player', async () => {
  const [h,g] = await pair(); const extra=create();
  try {
    assert.equal(g.submit({from:'e7',to:'e5'}),false);
    assert.equal(h.submit({from:'e2',to:'e5'}),false);
    assert.equal(h.submit({from:'e2',to:'e4'}),true); await tick();
    assert.equal(g.chess.fen(),h.chess.fen());
    assert.equal(h.submit({from:'d2',to:'d4'}),false);
    assert.equal(g.submit({from:'e7',to:'e5'}),true); await tick();
    assert.equal(g.chess.fen(),h.chess.fen()); assert.equal(h.moves.length,2);
    await extra.start('guest','12345678'); await tick(); await tick();
    assert.equal(extra.connected,false); assert.match(extra.message,/dois jogadores/);
    // A stale request cannot be applied twice.
    g.connection.send({type:'move',id:h.id,ply:0,move:{from:'a7',to:'a6'}}); await tick();
    assert.equal(h.moves.length,2);
  } finally { h.stop();g.stop();extra.stop(); }
});
test('disconnect pauses game, resume restores identical history', async () => {
  const [h,g]=await pair();
  try {
    h.submit({from:'e2',to:'e4'}); await tick();
    g.connection.close(); assert.equal(h.canMove(),false); assert.equal(g.canMove(),false);
    await g.start('guest','12345678',true); await tick(); await tick();
    assert.equal(g.connected,true); assert.equal(g.moves.length,1); assert.equal(g.chess.fen(),h.chess.fen());
    g.submit({from:'e7',to:'e5'});await tick();
    h.stop(false); await h.start('host','12345678',true);await tick();
    await g.start('guest','12345678',true);await tick();await tick();
    assert.equal(h.moves.length,2);assert.equal(h.chess.fen(),g.chess.fen());
  } finally {h.stop();g.stop();}
});
test('special moves: en passant, castling, promotion and checkmate', async () => {
  const [h,g]=await pair();
  try {
    for (const san of ['e4','a6','e5','d5','exd6']) {const c=h.validateHistory(h.moves);const m=c.move(san);(c.turn()==='b'?h:g).submit({from:m.from,to:m.to,promotion:m.promotion||'q'});await tick();}
    assert.equal(h.chess.get('d5'),null);assert.equal(h.chess.get('d6').type,'p');assert.equal(h.chess.fen(),g.chess.fen());
    assert.throws(()=>h.validateHistory([{from:'x1',to:'a2'}]));
    const castle=h.validateHistory(['e4','e5','Nf3','Nc6','Bc4','Nf6','O-O'].map((san,i,all)=>{const c=new Chess();let move;for(const s of all.slice(0,i+1))move=c.move(s);return {from:move.from,to:move.to,promotion:'q'};}));
    assert.equal(castle.get('g1').type,'k');assert.equal(castle.get('f1').type,'r');
    const promo=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');assert.equal(promo.move({from:'a7',to:'a8',promotion:'n'}).promotion,'n');
    const mate=new Chess();for(const san of ['f3','e5','g4','Qh4#'])mate.move(san);assert.equal(mate.in_checkmate(),true);
  } finally {h.stop();g.stop();}
});
for (const [name, sequence, verify] of [
  ['castling', ['e4','e5','Nf3','Nc6','Bc4','Nf6','O-O'], c => {assert.equal(c.get('g1').type,'k');assert.equal(c.get('f1').type,'r');}],
  ['underpromotion', ['a4','h5','a5','h4','a6','h3','axb7','hxg2','bxa8=N'], c => assert.equal(c.get('a8').type,'n')],
  ['checkmate', ['f3','e5','g4','Qh4#'], c => assert.equal(c.in_checkmate(),true)]
]) test('transport synchronizes '+name, async () => {
  const [h,g]=await pair();
  try {
    for(const san of sequence){const c=h.validateHistory(h.moves);const m=c.move(san);assert.ok(m,san);assert.equal((h.chess.turn()==='w'?h:g).submit({from:m.from,to:m.to,promotion:m.promotion||'q'}),true);await tick();}
    verify(h.chess);verify(g.chess);assert.equal(h.chess.fen(),g.chess.fen());
  }finally{h.stop();g.stop();}
});

test('spectator may join before opponent without occupying a player slot', async () => {
  const h=create(), watcher=create(), g=create();
  try {
    await h.start('host','12345678');await tick();
    await watcher.start('spectator','12345678');await tick();await tick();
    assert.equal(watcher.connected,true);assert.equal(watcher.playersReady,false);
    assert.equal(h.connection,null);assert.equal(h.connected,false);assert.equal(h.spectators.size,1);
    assert.equal(watcher.canMove(),false);
    await g.start('guest','12345678');await tick();await tick();
    assert.equal(g.connected,true);assert.equal(watcher.playersReady,true);assert.equal(h.canMove(),true);
    h.submit({from:'e2',to:'e4'});await tick();
    g.submit({from:'e7',to:'e5'});await tick();
    assert.equal(watcher.moves.length,2);assert.equal(watcher.chess.fen(),h.chess.fen());
  } finally {h.stop();g.stop();watcher.stop();}
});

test('late spectator receives current board; forged moves and role changes cannot affect the game', async () => {
  const [h,g]=await pair();const watcher=create();
  try {
    h.submit({from:'e2',to:'e4'});await tick();g.submit({from:'e7',to:'e5'});await tick();
    await watcher.start('spectator','12345678');await tick();await tick();
    assert.equal(watcher.chess.fen(),h.chess.fen());assert.equal(watcher.moves.length,2);
    assert.equal(watcher.submit({from:'g1',to:'f3'}),false);
    h.submit({from:'g1',to:'f3'});await tick();
    assert.equal(watcher.canMove(),false); // Black's turn must not authorize the spectator.
    watcher.connection.send({type:'move',id:h.id,ply:3,move:{from:'b8',to:'c6'}});
    watcher.connection.send({type:'hello',version:2,role:'guest',token:watcher.token});await tick();
    assert.equal(h.moves.length,3);assert.equal(h.opponent,g.token);
    g.submit({from:'b8',to:'c6'});await tick();
    assert.equal(watcher.chess.fen(),h.chess.fen());
    watcher.stop();await tick();
    assert.equal(h.connected,true);assert.equal(h.spectators.size,0);assert.equal(h.canMove(),true);
  } finally {h.stop();g.stop();watcher.stop();}
});

test('spectators see paused state when player leaves; player and spectators may resume', async () => {
  const [h,g]=await pair();const watcher=create();
  try {
    await watcher.start('spectator','12345678');await tick();await tick();
    h.submit({from:'e2',to:'e4'});await tick();
    g.connection.close();await tick();
    assert.equal(watcher.connected,true);assert.equal(watcher.playersReady,false);assert.equal(h.canMove(),false);
    await g.start('guest','12345678',true);await tick();await tick();
    assert.equal(watcher.playersReady,true);assert.equal(watcher.moves.length,1);
    watcher.connection.close();await tick();
    g.submit({from:'e7',to:'e5'});await tick();
    await watcher.start('spectator','12345678',true);await tick();await tick();
    assert.equal(watcher.chess.fen(),h.chess.fen());assert.equal(watcher.moves.length,2);
    h.stop(false);await tick();assert.equal(watcher.connected,false);
    await h.start('host','12345678',true);await tick();
    await watcher.start('spectator','12345678',true);await tick();await tick();
    assert.equal(watcher.playersReady,false);
    await g.start('guest','12345678',true);await tick();await tick();
    assert.equal(watcher.playersReady,true);assert.equal(watcher.chess.fen(),h.chess.fen());
  } finally {h.stop();g.stop();watcher.stop();}
});

test('spectators receive checkmate without being allowed to play', async () => {
  const [h,g]=await pair();const watcher=create();
  try {
    await watcher.start('spectator','12345678');await tick();await tick();
    for(const san of ['f3','e5','g4','Qh4#']){
      const c=h.validateHistory(h.moves);const m=c.move(san);
      (h.chess.turn()==='w'?h:g).submit({from:m.from,to:m.to,promotion:m.promotion||'q'});await tick();
    }
    assert.equal(watcher.chess.in_checkmate(),true);assert.equal(watcher.canMove(),false);
    assert.equal(watcher.chess.fen(),h.chess.fen());
  } finally {h.stop();g.stop();watcher.stop();}
});

test('eight spectators are independent from the two player slots', async () => {
  const [h,g]=await pair();const viewers=[];
  try {
    for(let i=0;i<9;i++){const w=create();viewers.push(w);await w.start('spectator','12345678');await tick();await tick();}
    assert.equal(h.spectators.size,8);assert.equal(viewers[8].connected,false);
    assert.match(viewers[8].message,/8 espectadores/);assert.equal(g.connected,true);
    h.submit({from:'d2',to:'d4'});await tick();
    for(const w of viewers.slice(0,8))assert.equal(w.chess.fen(),h.chess.fen());
  } finally {h.stop();g.stop();for(const w of viewers)w.stop();}
});
