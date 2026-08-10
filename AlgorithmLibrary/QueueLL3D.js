// AlgorithmLibrary/QueueLL3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { LinkedList3D } from '../3D/modes/LinkedList3D.js';
import { PALETTE } from '../3D/Glow.js';

const MAX = 8;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const ll = new LinkedList3D(scene);
const NODE_X = (i) => -350 + i * 100;
ll.addPointer('Head', 'head', NODE_X(0), 105);
ll.addPointer('Tail', 'tail', NODE_X(0) + 60, 105);
const status = panel.addStatus('');
const state = { order: [], nextId: 0, values: {} };

// Tail 指针 x：空队列或单节点时与 Head 并排（右移 60），否则落在尾节点上方
const tailX = () => (state.order.length <= 1 ? NODE_X(0) + 60 : NODE_X(state.order.length - 1));

function enqueue(value) {
  if (state.order.length >= MAX) { status.textContent = '队列已满'; return; }
  const id = state.nextId++;
  status.textContent = '入队: ' + value;
  C(1, () => {}, () => ll.forceDeleteNode(id));
  const x = NODE_X(state.order.length);
  ll.addNode(id, x, 190, 0);
  ll.moveNode(id, x, 0, C, 500);
  ll.setNodeValue(id, value, C);
  ll.highlightNode(id, C, PALETTE.orange);
  if (state.order.length > 0) ll.setNext(state.order[state.order.length - 1], id, C);
  state.values[id] = value;
  state.order.push(id);
  ll.movePointer('Tail', tailX(), 105, C);
  ll.pointTo('Tail', id, C);
  if (state.order.length === 1) ll.pointTo('Head', id, C);
  status.textContent = '';
}

function dequeue() {
  if (state.order.length === 0) { status.textContent = '队列为空'; return; }
  const id = state.order[0];
  status.textContent = '出队: ' + state.values[id];
  ll.highlightNode(id, C);
  ll.moveNode(id, 0, -190, C, 600);
  for (let j = 1; j < state.order.length; j++) ll.moveNode(state.order[j], NODE_X(j - 1), 0, C, 350);
  state.order.shift();
  ll.movePointer('Tail', tailX(), 105, C);
  ll.pointTo('Tail', state.order.length ? state.order[state.order.length - 1] : null, C);
  ll.pointTo('Head', state.order.length ? state.order[0] : null, C);
  ll.deleteNode(id, C);
  status.textContent = '';
}

function clear() {
  if (state.order.length === 0) return;
  status.textContent = '清空';
  for (const id of [...state.order]) ll.deleteNode(id, C);
  state.order = [];
  ll.movePointer('Tail', tailX(), 105, C);
  ll.pointTo('Tail', null, C);
  ll.pointTo('Head', null, C);
  status.textContent = '';
}

let enqueueInput = panel.addInput('输入数字', (v) => { if (v) enqueue(v.trim()); }, 6);
panel.addButton('入队', () => { if (enqueueInput.value) enqueue(enqueueInput.value.trim()); });
panel.addButton('出队', dequeue);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
