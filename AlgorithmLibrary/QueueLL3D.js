// AlgorithmLibrary/QueueLL3D.js — 链表队列：Head 出队、Tail 入队 —— 两个指针一出一进，链式无容量限制（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QueueLL3D');

const scene = new Scene3D('scene', { cameraPos: [0, 120, 560], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：链表队列 入队×6 + 出队×3（Head/Tail 双指针）', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 188, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -70, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -155, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const NODE_X = i => -320 + i * 96;
const nodes = [];
const allNodes = new Set();
let edgeMeshes = new Map();
const headLbl = new VText(scene, { text: 'Head →', x: NODE_X(0) - 90, y: 88, z: 0, color: CYAN, scale: 0.55 });
const tailLbl = new VText(scene, { text: 'Tail →', x: NODE_X(-1) + 100, y: -88, z: 0, color: GOLD, scale: 0.55 });
const emptyT = new VText(scene, { text: '空队列', x: 0, y: 0, z: 0, color: PALETTE.textDim, scale: 0.6 });

function newNode(v) {
  const n = { v, mesh: new VNode(scene, { radius: 22, x: 380, y: 150, z: 0, label: String(v), color: BLUE, emissive: BLUE }) };
  allNodes.add(n);
  return n;
}
function relayout() {
  nodes.forEach((n, i) => n.mesh.moveTo(NODE_X(i), 0, 0, 380));
  headLbl.moveTo(nodes.length ? NODE_X(0) - 90 : 0, 88, 0, 380);
  tailLbl.moveTo(nodes.length ? NODE_X(nodes.length - 1) + 100 : 0, -88, 0, 380);
  emptyT.visible = nodes.length === 0;
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
  for (let i = 0; i + 1 < nodes.length; i++) edgeMeshes.set(i, tubeBetween(scene, { x: NODE_X(i), y: 0, z: 0 }, { x: NODE_X(i + 1), y: 0, z: 0 }, { color: PALETTE.edge, opacity: 0.4, radius: 2 }));
}
function setCol(n, c) { n.mesh.setColor(c, c); }
function queueVals() { return nodes.map(n => n.v).join(' → ') || '空'; }

function* enqueue(v) {
  const nn = newNode(v);
  yield S(() => stageT.setText('入队 ' + v + '：新节点在 Tail 端生成（从右侧入场）'));
  yield W(500);
  nodes.push(nn);
  relayout();
  setCol(nn, GOLD);
  yield S(() => stageT.setText('入队完成：' + v + '（金）挂到链尾，Tail 指针右移 —— 队 = ' + queueVals()));
  yield W(550);
  setCol(nn, BLUE);
}

function* dequeue() {
  yield S(() => stageT.setText('出队：取 Head 端节点 ' + nodes[0].v + '（红）'));
  yield W(450);
  const n = nodes[0];
  setCol(n, RED);
  yield W(500);
  n.mesh.remove();
  allNodes.delete(n);
  nodes.shift();
  relayout();
  yield S(() => stageT.setText(n.v + ' 出队，Head 指针右移 —— 队 = ' + queueVals()));
  yield W(500);
}

function* queueGen() {
  yield S(() => { hint.setText('链表队列：Head 出、Tail 入 —— 链式结构无容量上限，双指针 O(1) 两端操作'); stageT.setText('演示：入队 5, 3, 8, 1, 7 → 出队×2 → 入队 4 → 出队（Head/Tail 指针移动）'); });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* enqueue(v);
  yield S(() => { outT.setText('入队×5 完成：队 = ' + queueVals() + '（Head→5, Tail→7）'); status.textContent = '链表队列：队 = ' + queueVals(); });
  yield W(800);
  yield* dequeue();
  yield* dequeue();
  yield* enqueue(4);
  yield* dequeue();
  yield S(() => { hint.setText('复杂度：入队/出队 O(1)（无需移动元素）—— 链表队列在无界场景胜过数组环形缓冲'); outT.setText('应用：消息队列、BFS、打印机任务 —— Head 删除、Tail 追加，单链表即可实现'); });
  yield W(1100);
  yield S(() => { hint.setText('链表队列演示完成：入队 ×6 + 出队 ×3 —— 最终队 = ' + queueVals() + '（8 → 1 → 7 → 4）'); outT.setText(''); });
  yield W(400);
}

function* runQueue() {
  hint.setText('链表队列：Head 出 / Tail 入');
  yield W(400);
  yield* queueGen();
}

panel.addButton('运行演示', () => engine.start(runQueue()));
panel.addButton('清空', () => { engine.clear(); nodes.forEach(n => n.mesh.remove()); nodes.length = 0; allNodes.clear(); edgeMeshes.forEach(m => scene.remove(m)); edgeMeshes = new Map(); relayout(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = Head 端（先出），金 = Tail 端（后进），红 = 出队节点；队头在左，队尾在右）');

scene.start(engine);
