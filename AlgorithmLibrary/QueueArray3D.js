// AlgorithmLibrary/QueueArray3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText, VBox, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QueueArray3D');

const SIZE = 15;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const array = new Array3D(scene, { count: SIZE, startY: -40, w: 46, h: 46, spacing: 50 });
array.create();
const status = panel.addStatus('');
const state = { head: 0, tail: 0, data: new Array(SIZE) };

// head 在上方（箭头向下），tail 在下方（箭头向上），避免空队列时重叠
function makeIndicator(label, color, emissive, boxY, arrowY, arrowDown) {
  const box = new VBox(scene, { w: 46, h: 46, d: 28, x: 0, y: boxY, z: 0, label: '0', color, emissive });
  const text = new VText(scene, { text: label, x: 0, y: boxY + 48, z: 0, color: PALETTE.textGlow, scale: 0.7 });
  const arrow = new VArrow(scene, { x: 0, y: arrowY, z: 0, down: arrowDown });
  return { box, text, arrow };
}
const headInd = makeIndicator('head', PALETTE.blue, PALETTE.blueEmissive, 60, 12, true);
const tailInd = makeIndicator('tail', PALETTE.orange, PALETTE.orangeEmissive, -115, -105, false);

function placeIndicator(ind, x, duration) {
  C(duration, (p) => {
    const bx = ind.box.mesh.position.x, tx = ind.text.sprite.position.x, ax = ind.arrow.group.position.x;
    ind.box.mesh.position.x = bx + (x - bx) * p;
    ind.text.sprite.position.x = tx + (x - tx) * p;
    ind.arrow.group.position.x = ax + (x - ax) * p;
  });
}

function enqueue(value) {
  if ((state.tail + 1) % SIZE === state.head) { status.textContent = '队列已满'; return; }
  status.textContent = '入队: ' + value;
  const x = array.xOf(state.tail);
  array.highlight(state.tail, C, PALETTE.orange);
  placeIndicator(tailInd, x, 400);
  const tmp = new VText(scene, { text: value, x: 0, y: 200, z: 0, color: PALETTE.text, scale: 1 });
  C(450, (p) => {
    tmp.sprite.position.x = 0 + (x - 0) * p;
    tmp.sprite.position.y = 200 + (-40 - 200) * p;
  }, () => { tmp.remove(); });
  state.data[state.tail] = value;
  array.setValue(state.tail, value, C);
  C(60, () => tmp.remove(), () => {});
  state.tail = (state.tail + 1) % SIZE;
  C(150, () => tailInd.box.setText(String(state.tail)));
  array.unhighlight((state.tail + SIZE - 1) % SIZE, C);
  status.textContent = '';
}

function dequeue() {
  if (state.head === state.tail) { status.textContent = '队列为空'; return; }
  const value = state.data[state.head];
  status.textContent = '出队: ' + value;
  const x = array.xOf(state.head);
  array.highlight(state.head, C, PALETTE.blue);
  const tmp = new VText(scene, { text: value, x, y: -40, z: 0, color: PALETTE.text, scale: 1 });
  C(450, (p) => {
    tmp.sprite.position.x = x + (0 - x) * p;
    tmp.sprite.position.y = -40 + (-230 - -40) * p;
  }, () => { tmp.remove(); });
  state.data[state.head] = '';
  array.setValue(state.head, '', C);
  state.head = (state.head + 1) % SIZE;
  placeIndicator(headInd, array.xOf(state.head), 400);
  C(150, () => headInd.box.setText(String(state.head)));
  array.unhighlight((state.head + SIZE - 1) % SIZE, C);
  C(60, () => tmp.remove(), () => {});
  status.textContent = '';
}

function clear() {
  let i = state.head;
  while (i !== state.tail) { array.setValue(i, '', C); state.data[i] = ''; i = (i + 1) % SIZE; }
  state.head = 0; state.tail = 0;
  placeIndicator(headInd, array.xOf(0), 350);
  placeIndicator(tailInd, array.xOf(0), 350);
  C(150, () => { headInd.box.setText('0'); tailInd.box.setText('0'); });
}

let enqueueInput = panel.addInput('输入数字', (v) => { if (v) enqueue(v.trim()); }, 6);
panel.addButton('入队', () => { if (enqueueInput.value) enqueue(enqueueInput.value.trim()); });
panel.addButton('出队', dequeue);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始位置：head/tail 均指向 0 号槽
const initX = array.xOf(0);
headInd.box.mesh.position.x = initX; headInd.text.sprite.position.x = initX; headInd.arrow.group.position.x = initX;
tailInd.box.mesh.position.x = initX; tailInd.text.sprite.position.x = initX; tailInd.arrow.group.position.x = initX;

scene.start(engine);
