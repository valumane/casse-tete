import assert from 'node:assert/strict';
import {INITIAL, TARGET, SHAPES, FLOOR, isValid, movePiece, solve, maxTravel} from '../engine.js';

assert.equal(FLOOR.filter(Boolean).length,26,'The irregular board must match the reference.');
assert.equal(isValid(INITIAL),true);
assert.equal(movePiece(INITIAL,0,1,0),null,'Red block cannot leave its starting pocket sideways.');
assert.equal(movePiece(INITIAL,0,0,1),null,'Red block cannot pass through a yellow block.');
assert.equal(movePiece(INITIAL,3,1,0),null,'Blue block cannot pass through its neighbour.');
assert.equal(maxTravel(INITIAL,6,0,1),2);
assert.equal(movePiece(INITIAL,6,0,1,3),null,'A long drag cannot jump over a wall.');
assert.equal(isValid([0,0,...INITIAL.slice(2)]),false);
// Yellow blocks sit above the blue blocks; the arrival zone starts empty.
assert.deepEqual(INITIAL,[0,12,14,24,26,30,32]);
for (let id=0;id<SHAPES.length;id++) {
  const {w,h}=SHAPES[id];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    assert.ok(![38,39,44,45].includes(INITIAL[id]+y*6+x),'The arrival zone must start empty.');
  }
}
const path=solve(INITIAL);
assert.ok(path?.length,'The reference puzzle must be solvable.');
assert.equal(path.length,42,'Known shortest solution in straight-line slides.');
let state=INITIAL.slice();
for(const {id,dx,dy,distance} of path){
  const next=movePiece(state,id,dx,dy,distance);
  assert.ok(next,'Every suggested move must be legal.');
  assert.ok(isValid(next),'Blocks must never overlap or leave the floor.');
  state=next;
}
assert.equal(state[0],TARGET,'The complete solution path must reach the green zone.');
assert.deepEqual(solve(state),[]);
// Re-solve a deliberately detoured position, not just the starting layout.
let detour=movePiece(INITIAL,6,0,1,1);
const recovery=solve(detour);
assert.ok(recovery?.length);
for(const m of recovery){detour=movePiece(detour,m.id,m.dx,m.dy,m.distance);assert.ok(isValid(detour));}
assert.equal(detour[0],TARGET);
console.log(`Puzzle verified: ${SHAPES.length} blocks, 26 floor cells, ${path.length} moves to the green zone; collision and recovery checks passed.`);
