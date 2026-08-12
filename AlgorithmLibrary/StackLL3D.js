// AlgorithmLibrary/StackLL3D.js — 链表栈：Top 指针在右端，push 挂右、pop 摘右 —— 单链表天然 LIFO（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('StackLL3D');

const scene = new Scene3D('scene', { cameraPos: [0, 120, 560], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：链表栈 push×6 + pop×4（Top 指针右端滑动）', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 188, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -70, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -155, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const NODE_X = i => -300 + i * 96;
const nodes = [];
const allNodes = new Set();
let edgeMeshes = new Map();
const topLbl = new VText(scene, { text: 'Top →', x: NODE_X(-1) + 110, y: 88, z: 0, color: GOLD, scale: 0.55 });
const emptyT = new VText(scene, { text: '空栈', x: 0, y: 0, z: 0, color: PALETTE.textDim, scale: 0.6 });

function newNode(v) {
  const n = { v, mesh: new VNode(scene, { radius: 22, x: 320, y: 150, z: 0, label: String(v), color: BLUE, emissive: BLUE }) };
  allNodes.add(n);
  return n;
}
function relayout() {
  nodes.forEach((n, i) => n.mesh.moveTo(NODE_X(i), 0, 0, 380));
  topLbl.moveTo(nodes.length ? NODE_X(nodes.length - 1) + 110 : 0, 88, 0, 380);
  emptyT.visible = nodes.length === 0;
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
  for (let i = 0; i + 1 < nodes.length; i++) edgeMeshes.set(i, tubeBetween(scene, { x: NODE_X(i), y: 0, z: 0 }, { x: NODE_X(i + 1), y: 0, z: 0 }, { color: PALETTE.edge, opacity: 0.4, radius: 2 }));
}
function setCol(n, c) { n.mesh.setColor(c, c); }
function stackVals() { return nodes.map(n => n.v).join(' → ') || '空'; }

function* push(v) {
  const nn = newNode(v);
  yield S(() => stageT.setText('push(' + v + ')：新节点在 Top 端生成（从右上方入场）'));
  yield W(500);
  nodes.push(nn);
  relayout();
  setCol(nn, GOLD);
  yield S(() => stageT.setText(v + '（金）挂到链右端，Top 指针右移 —— 栈 = ' + stackVals()));
  yield W(550);
  setCol(nn, BLUE);
}

function* pop() {
  yield S(() => stageT.setText('pop()：摘掉 Top 端节点 ' + nodes[nodes.length - 1].v + '（红）'));
  yield W(450);
  const n = nodes[nodes.length - 1];
  setCol(n, RED);
  yield W(500);
  n.mesh.remove();
  allNodes.delete(n);
  nodes.pop();
  relayout();
  yield S(() => stageT.setText(n.v + ' 弹出，Top 指针左移 —— 栈 = ' + stackVals()));
  yield W(500);
}

function* stackGen() {
  yield S(() => { hint.setText('链表栈：Top 固定在链右端 —— push 挂右、pop 摘右，单链表天然实现 LIFO'); stageT.setText('演示：push 5, 3, 8, 1, 7 → pop×2 → push 4 → pop×2（Top 指针右端滑动）'); });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* push(v);
  yield S(() => { outT.setText('push×5 完成：栈 = ' + stackVals() + '（Top→7）'); status.textContent = '链表栈：栈 = ' + stackVals(); });
  yield W(800);
  yield* pop();
  yield* pop();
  yield* push(4);
  yield* pop();
  yield* pop();
  yield S(() => { hint.setText('复杂度：push/pop O(1) —— 链表栈无容量上限，适合深度不确定的递归模拟'); outT.setText('应用：括号匹配、DFS 模拟、撤销栈 —— 栈底在左端，永不移动'); });
  yield W(1100);
  yield S(() => { hint.setText('链表栈演示完成：push×6 + pop×4 —— 最终栈 = ' + stackVals() + '（5 → 3）'); outT.setText(''); });
  yield W(400);
}

function* runStack() {
  hint.setText('链表栈：Top 在右端');
  yield W(400);
  yield* stackGen();
}

panel.addButton('运行演示', () => engine.start(runStack()));
panel.addButton('清空', () => { engine.clear(); nodes.forEach(n => n.mesh.remove()); nodes.length = 0; allNodes.clear(); edgeMeshes.forEach(m => scene.remove(m)); edgeMeshes = new Map(); relayout(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 刚压入，红 = 待弹出，金 Top 指针在右端；栈底固定左侧）');

scene.start(engine);
