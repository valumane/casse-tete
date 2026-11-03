import {FLOOR, SHAPES, INITIAL, TARGET, DIRECTIONS, isValid, maxTravel, movePiece} from './engine.js';

const $ = s => document.querySelector(s);
const board = $('#board'), pieceLayer = $('#pieces'), win = $('#win');
const storageKey = 'tri-malin-v2';
let state = INITIAL.slice(), history = [], best = null, selected = -1, drag = null;
let winShown = false;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved) {
    best = Number.isInteger(saved.best) && saved.best > 0 ? saved.best : null;
    // Validate the complete move history before restoring a game.
    if (isValid(saved.state) && Array.isArray(saved.history) && saved.history.length < 10000) {
      let previous = INITIAL, valid = true;
      for (const h of [...saved.history, saved.state]) {
        if (!isValid(h)) { valid = false; break; }
        const changed = h.map((p,i) => p !== previous[i] ? i : -1).filter(i => i >= 0);
        if (changed.length) {
          if (changed.length !== 1) { valid = false; break; }
          const id = changed[0], ax = h[id] % 6 - previous[id] % 6, ay = Math.floor(h[id]/6) - Math.floor(previous[id]/6);
          if ((ax && ay) || !movePiece(previous,id,Math.sign(ax),Math.sign(ay),Math.abs(ax || ay))) { valid=false;break; }
        }
        previous=h;
      }
      if (valid) { state = saved.state.slice(); history = saved.history.map(s => s.slice()); }
    }
  }
} catch {}

function save() { try { localStorage.setItem(storageKey, JSON.stringify({state,history,best})); } catch {} }
function tell(text, active = false) { $('#message').textContent = text; $('#message').classList.toggle('active', active); }

$('#floor').innerHTML = '<svg viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden="true"><path d="M7 0H193Q200 0 200 7V200H593Q600 200 600 207V293Q600 300 593 300H400V793Q400 800 393 800H207Q200 800 200 793V600H7Q0 600 0 593V7Q0 0 7 0Z" fill="#dfe2d1" stroke="#c6cdb8" stroke-width="2"/></svg>';
FLOOR.forEach((f, p) => {
  if (!f) return;
  const cell = document.createElement('div');cell.className='floor-cell';
  Object.assign(cell.style,{left:`${p%6/6*100}%`,top:`${Math.floor(p/6)/8*100}%`,width:`${100/6}%`,height:'12.5%'});
  $('#floor').append(cell);
});
const pieceElements = SHAPES.map((shape,id) => {
  const button = document.createElement('button');button.className = `piece ${shape.type}`;button.dataset.id=id;
  button.innerHTML = id === 0 ? '' : `<span class="piece-letter">${shape.label}</span>`;
  button.setAttribute('aria-label',shape.name+', sélectionner et déplacer avec les flèches');
  button.setAttribute('aria-pressed','false');
  button.addEventListener('pointerdown', e => startDrag(e,id));
  button.addEventListener('pointermove', onDrag);
  button.addEventListener('pointerup', endDrag);
  button.addEventListener('pointercancel', cancelDrag);
  button.addEventListener('lostpointercapture', () => { if(drag?.id===id) cancelDrag(); });
  button.addEventListener('focus', () => { if(selected!==id) select(id); });
  button.addEventListener('click', () => select(id));
  pieceLayer.append(button);return button;
});
function select(id) {
  selected=id;
  pieceElements.forEach((el,i)=>{el.classList.toggle('selected',i===id);el.setAttribute('aria-pressed',String(i===id));});
  $('#selected-label').textContent = id < 0 ? 'Sélectionne un bloc pour le déplacer.' : id===0 ? 'Le bloc rouge est sélectionné.' : `Bloc ${SHAPES[id].label} sélectionné.`;
  document.querySelectorAll('[data-dir]').forEach(btn => {
    const {dx,dy}=DIRECTIONS[Number(btn.dataset.dir)];
    btn.disabled=id<0||state[0]===TARGET||maxTravel(state,id,dx,dy)===0;
  });
}
function positionPiece(id) {
  const el=pieceElements[id],p=state[id],shape=SHAPES[id];
  el.style.left=`calc(${p%6/6*100}% + 3px)`;el.style.top=`calc(${Math.floor(p/6)/8*100}% + 2px)`;
  el.style.width=`calc(${shape.w/6*100}% - 6px)`;el.style.height=`calc(${shape.h/8*100}% - 6px)`;
}
function render() {
  pieceElements.forEach((el,id)=>{positionPiece(id);el.classList.toggle('finished',id===0&&state[0]===TARGET);});
  $('#moves').textContent=String(history.length).padStart(2,'0');
  $('#best').textContent=best===null?'—':String(best).padStart(2,'0');
  $('#undo').disabled=!history.length;
  $('.goal').classList.toggle('won',state[0]===TARGET);
  select(selected);
}
function commit(id,dx,dy,distance=1) {
  if(state[0]===TARGET)return false;
  const next=movePiece(state,id,dx,dy,distance);
  if(!next)return false;
  history.push(state.slice());state=next;render();save();
  if(state[0]===TARGET)won();else{tell('Bien vu. Continue à ouvrir le passage.');}
  return true;
}
function startDrag(e,id) {
  if(e.button!==0||drag||!win.hidden||state[0]===TARGET)return;
  select(id);const el=pieceElements[id];el.focus({preventScroll:true});
  const rect=board.getBoundingClientRect();
  drag={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,cell:rect.width/6,axis:null,shift:0,min:0,max:0};
  el.setPointerCapture(e.pointerId);
}
function onDrag(e) {
  if(!drag||e.pointerId!==drag.pointer)return;
  const x=e.clientX-drag.startX,y=e.clientY-drag.startY;
  if(!drag.axis){
    if(Math.hypot(x,y)<6)return;
    drag.axis=Math.abs(x)>=Math.abs(y)?'x':'y';
    drag.min=-maxTravel(state,drag.id,drag.axis==='x'?-1:0,drag.axis==='y'?-1:0);
    drag.max=maxTravel(state,drag.id,drag.axis==='x'?1:0,drag.axis==='y'?1:0);
    pieceElements[drag.id].classList.add('dragging');
  }
  drag.shift=Math.max(drag.min,Math.min(drag.max,(drag.axis==='x'?x:y)/drag.cell));
  const p=state[drag.id],el=pieceElements[drag.id];
  el.style.left=`calc(${(p%6+(drag.axis==='x'?drag.shift:0))/6*100}% + 3px)`;
  el.style.top=`calc(${(Math.floor(p/6)+(drag.axis==='y'?drag.shift:0))/8*100}% + 2px)`;
  e.preventDefault();
}
function endDrag(e) {
  if(!drag||e.pointerId!==drag.pointer)return;
  const d=drag;drag=null;
  const steps=Math.round(Math.abs(d.shift))*Math.sign(d.shift);
  pieceElements[d.id].classList.remove('dragging');
  if(steps)commit(d.id,d.axis==='x'?Math.sign(steps):0,d.axis==='y'?Math.sign(steps):0,Math.abs(steps));
  else{positionPiece(d.id);if(d.axis&&d.min===0&&d.max===0)tell('Ce côté est bloqué. Essaie une autre direction.');}
  if(pieceElements[d.id].hasPointerCapture(e.pointerId))pieceElements[d.id].releasePointerCapture(e.pointerId);
}
function cancelDrag() { if(!drag)return;const id=drag.id;drag=null;pieceElements[id].classList.remove('dragging');positionPiece(id); }
document.addEventListener('keydown',e=>{
  if(!win.hidden){
    if(e.key==='Escape'){closeWin();e.preventDefault();}
    if(e.key==='Tab'){
      const buttons=[...win.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}
      else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}
    }
    return;
  }
  if(drag)return;
  const keyDir={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3}[e.key];
  if(keyDir!==undefined&&selected>=0){e.preventDefault();const {dx,dy}=DIRECTIONS[keyDir];if(!commit(selected,dx,dy))tell('Le passage est bloqué de ce côté.');}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}
  else if(e.key==='Escape'){select(-1);pieceElements.forEach(el=>el.blur());}
});
document.querySelectorAll('[data-dir]').forEach(btn=>btn.addEventListener('click',()=>{if(selected<0||drag)return;const {dx,dy}=DIRECTIONS[Number(btn.dataset.dir)];commit(selected,dx,dy);}));
function undo(){if(!history.length)return;cancelDrag();state=history.pop();winShown=false;win.hidden=true;document.querySelector('main').inert=false;render();save();tell('Un pas en arrière, une nouvelle idée.');}
$('#undo').addEventListener('click',undo);
function reset(){cancelDrag();state=INITIAL.slice();history=[];selected=-1;winShown=false;win.hidden=true;document.querySelector('main').inert=false;render();save();tell('');}
$('#reset').addEventListener('click',reset);
$('#replay').addEventListener('click',()=>{reset();pieceElements[0].focus({preventScroll:true});});

function won(){
  if(winShown)return;winShown=true;
  const record=best===null||history.length<best;
  if(record){best=history.length;$('#best').textContent=String(best).padStart(2,'0');save();}
  $('#win-message').textContent=`Le bloc rouge est dans la zone verte. Tu as fait place nette en ${history.length} coups.`;
  $('#new-record').hidden=!record;tell('Mission accomplie : le bloc rouge est dans la zone verte !',true);
  setTimeout(()=>{if(state[0]!==TARGET||!winShown)return;win.hidden=false;document.querySelector('main').inert=true;$('#replay').focus({preventScroll:true});confetti();},400);
}
function closeWin(){win.hidden=true;document.querySelector('main').inert=false;$('#reset').focus({preventScroll:true});}
$('#view-board').addEventListener('click',closeWin);
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(let i=0;i<30;i++){
    const c=document.createElement('i');c.className='confetti';c.style.left=`${Math.random()*100}%`;c.style.background=['#d8896c','#e5bd65','#8bbfc0','#8fa97b'][i%4];c.style.animationDelay=`${Math.random()*.5}s`;c.style.setProperty('--drift',`${Math.random()*160-80}px`);document.body.append(c);setTimeout(()=>c.remove(),3200);
  }
}
window.addEventListener('resize',cancelDrag);
window.addEventListener('blur',cancelDrag);
render();
if(state[0]===TARGET){winShown=true;tell('Bravo, le plateau est terminé. Tu peux recommencer pour améliorer ton record.',true);}
