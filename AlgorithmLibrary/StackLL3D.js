// AlgorithmLibrary/StackLL3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { LinkedList3D } from '../3D/modes/LinkedList3D.js';
import { PALETTE } from '../3D/Glow.js';

const MAX = 8;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const ll = new LinkedList3D(scene);
const NODE_X = (i) => -350 + i * 100;
ll.addPointer('Top', 'top', NODE_X(0), 105);
const status = panel.addStatus('');
const state = { order: [], nextId: 0, values: {} };

function push(value) {
  if (state.order.length >= MAX) { status.textContent = '栈已满'; return; }
  const id = state.nextId++;
  status.textContent = '入栈: ' + value;
  // 撤销锚点：整个 push 被撤销时移除新节点
  C(1, () => {}, () => ll.forceDeleteNode(id));
  ll.addNode(id, 0, 190, 0);
  // 现有节点右移一格，新节点从顶部飞入 0 号位
  for (let j = 0; j < state.order.length; j++) ll.moveNode(state.order[j], NODE_X(j + 1), 0, C, 350);
  ll.moveNode(id, NODE_X(0), 0, C, 500);
  ll.setNodeValue(id, value, C);
  ll.highlightNode(id, C);
  if (state.order.length > 0) ll.setNext(id, state.order[0], C);
  state.values[id] = value;
  state.order.unshift(id);
  ll.pointTo('Top', id, C);
  status.textContent = '';
}

function pop() {
  if (state.order.length === 0) { status.textContent = '栈为空'; return; }
  const id = state.order[0];
  status.textContent = '出栈: ' + state.values[id];
  ll.highlightNode(id, C);
  // 头节点飞出到底部，其余节点级联左移
  ll.moveNode(id, 0, -190, C, 600);
  for (let j = 1; j < state.order.length; j++) ll.moveNode(state.order[j], NODE_X(j - 1), 0, C, 350);
  state.order.shift();
  ll.pointTo('Top', state.order.length ? state.order[0] : null, C);
  ll.deleteNode(id, C);
  status.textContent = '';
}

function clear() {
  if (state.order.length === 0) return;
  status.textContent = '清空';
  for (const id of [...state.order]) ll.deleteNode(id, C);
  state.order = [];
  ll.pointTo('Top', null, C);
  status.textContent = '';
}

let pushInput = panel.addInput('输入数字', (v) => { if (v) push(v.trim()); }, 6);
panel.addButton('入栈', () => { if (pushInput.value) push(pushInput.value.trim()); });
panel.addButton('出栈', pop);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
