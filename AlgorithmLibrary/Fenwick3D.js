// AlgorithmLibrary/Fenwick3D.js
// 树状数组（Fenwick Tree / BIT）：n=12 随机数组（柱状）+ 下方一排 BIT 节点（VBox），
// i 与 i+lowbit(i) 之间连线。点更新自底向上逐层累加；前缀查询自右向左逐段累加。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Fenwick3D');

const scene = new Scene3D('scene', { cameraPos: [0, 170, 720], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 12;
const status = panel.addStatus('');
const lowbit = (i) => i & -i;

const arr = new Array3D(scene, { type: 'bar', count: N, w: 34, h: 60, spacing: 62, z: 0 });
arr.create();

let arrVals = [];               // arrVals[i] 对应数组下标 i+1
const bitVals = new Array(N + 1).fill(0);
const boxes = [];               // boxes[i] 对应 BIT 下标 i+1
const boxIdxLbl = [];
const barLbl = [];              // 柱顶数值标签
const edgeMap = new Map();      // "i-j" -> 连线
const result = new VText(scene, { text: '前缀和: —', x: 0, y: 300, z: 0, color: PALETTE.yellow, scale: 1 });

function boxX(i) { const half = (N - 1) / 2; return (i - 1 - half) * 62; }

// ---- 模型：由数组重建 BIT ----
function rebuildModel() {
  bitVals.fill(0);
  for (let i = 1; i <= N; i++) {
    let j = i;
    while (j <= N) { bitVals[j] += arrVals[i - 1]; j += lowbit(j); }
  }
}

function clearEdges() {
  for (const m of edgeMap.values()) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  edgeMap.clear();
}

function clearVisuals() {
  for (const b of boxes) b.remove();
  for (const l of boxIdxLbl) l.remove();
  for (const l of barLbl) l.remove();
  boxes.length = 0; boxIdxLbl.length = 0; barLbl.length = 0;
  clearEdges();
}

// ---- 静态渲染（无动画） ----
function buildStatic() {
  for (let i = 1; i <= N; i++) {
    const x = boxX(i);
    const box = new VBox(scene, { w: 46, h: 46, d: 30, x, y: 210, z: 0, label: String(bitVals[i]), color: PALETTE.node, emissive: PALETTE.nodeEmissive });
    boxes.push(box);
    boxIdxLbl.push(new VText(scene, { text: String(i), x, y: 168, z: 0, color: PALETTE.textDim, scale: 0.55 }));
    const j = i + lowbit(i);
    if (j <= N) {
      const m = tubeBetween(scene, new THREE.Vector3(x, 210, 0), new THREE.Vector3(boxX(j), 210, 0), { color: PALETTE.edge, opacity: 0.45, radius: 2.5 });
      edgeMap.set(i + '-' + j, m);
    }
  }
  for (let i = 0; i < N; i++) {
    const h = arrVals[i] * 6;
    barLbl.push(new VText(scene, { text: String(arrVals[i]), x: arr.xOf(i), y: h + 16, z: 0, color: PALETTE.text, scale: 0.6 }));
  }
}

// ---- 高亮 ----
function hlBox(i, c) {
  const box = boxes[i - 1];
  C({ duration: 250, fn: (p) => { box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.node), new THREE.Color(c), p); box.mesh.material.emissive.setHex(PALETTE.highlightEmissive); }, undo: () => { box.mesh.material.color.setHex(PALETTE.node); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); } });
}
function unhlBox(i, c) {
  const box = boxes[i - 1];
  const from = c || PALETTE.highlight;
  C({ duration: 250, fn: (p) => { box.mesh.material.color.lerpColors(new THREE.Color(from), new THREE.Color(PALETTE.node), p); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); }, undo: () => {} });
}
function hlEdge(i, j) {
  const m = edgeMap.get(i + '-' + j);
  if (!m) return;
  C({ duration: 250, fn: () => { m.material.color.setHex(PALETTE.highlight); m.material.opacity = 0.95; }, undo: () => { m.material.color.setHex(PALETTE.edge); m.material.opacity = 0.45; } });
}

// ---- 值变化 ----
function updateBox(i, val, prev) {
  C({ duration: 300, fn: (p) => { boxes[i - 1].mesh.scale.setScalar(Math.max(1 + 0.15 * Math.sin(p * Math.PI), 0.01)); boxes[i - 1].setText(String(val)); }, undo: () => { boxes[i - 1].mesh.scale.set(1, 1, 1); boxes[i - 1].setText(String(prev)); } });
}
function updateBarLabel(i) {
  const h = arrVals[i] * 6;
  C({ duration: 300, fn: () => { barLbl[i].sprite.position.y = h + 16; barLbl[i].setText(String(arrVals[i])); }, undo: () => {} });
}

// ---- 随机化数组 ----
function randomize() {
  arrVals = Array.from({ length: N }, () => Math.floor(Math.random() * 10) + 2);
  rebuildModel();
  status.textContent = '随机化数组并重建 BIT';
  for (let i = 0; i < N; i++) {
    arr.setValue(i, arrVals[i], C);
    updateBarLabel(i);
    updateBox(i + 1, bitVals[i + 1], bitVals[i + 1]);
  }
  status.textContent = '';
}

// ---- 点更新：自底向上逐层累加 ----
function pointUpdate(raw) {
  let idx = 0, delta = 0;
  const s = String(raw || '').trim();
  let m = s.match(/^(\d+)\s*[,\s，]\s*(-?\d+)$/);
  if (m) { idx = +m[1]; delta = +m[2]; }
  else { idx = 3; delta = 2; status.textContent = '输入格式: 下标 增量（如 3 5），已用默认 3 2 演示'; }
  if (idx < 1 || idx > N) { status.textContent = '下标需在 1~' + N + ' 之间'; return; }
  if (delta === 0) { status.textContent = '增量为 0，无变化'; return; }
  status.textContent = '点更新: bit[' + idx + '] 自底向上累加 ' + delta;
  arr.highlight(idx - 1, C, PALETTE.cyan);
  arr.unhighlight(idx - 1, C);
  hlBox(idx, PALETTE.cyan);
  hlEdge(idx, idx + lowbit(idx));
  unhlBox(idx, PALETTE.cyan);
  let j = idx;
  while (j <= N) {
    const prev = bitVals[j];
    bitVals[j] += delta;
    status.textContent = '更新 bit[' + j + '] += ' + delta;
    hlBox(j, PALETTE.cyan);
    updateBox(j, bitVals[j], prev);
    if (j + lowbit(j) <= N) hlEdge(j, j + lowbit(j));
    unhlBox(j, PALETTE.cyan);
    j += lowbit(j);
  }
  status.textContent = '点更新完成';
}

// ---- 前缀查询：自右向左逐段累加 ----
function prefixQuery(raw) {
  let idx = parseInt(String(raw || '').trim());
  if (isNaN(idx) || idx < 1 || idx > N) { idx = 6; status.textContent = '输入 1~' + N + ' 之间的下标（已用默认 6 演示）'; }
  let sum = 0;
  status.textContent = '前缀查询: 自右向左累加，起点 bit[' + idx + ']';
  let j = idx;
  while (j > 0) {
    const k = j - lowbit(j);
    sum += bitVals[j];
    status.textContent = '累加 bit[' + j + '] = ' + bitVals[j] + '，当前和 ' + sum;
    hlBox(j, PALETTE.yellow);
    if (k >= 1) hlEdge(k, j);
    result.setText('前缀和 sum(1..' + idx + ') = ' + sum);
    unhlBox(j, PALETTE.yellow);
    j = k;
  }
  status.textContent = '';
}

// ---- 清空：停止动画 + 清理对象 + 重建随机初始状态 ----
function clearAll() {
  engine.clear();
  clearVisuals();
  arrVals = Array.from({ length: N }, () => Math.floor(Math.random() * 10) + 2);
  rebuildModel();
  result.setText('前缀和: —');
  buildStatic();
  status.textContent = '已清空';
}

// 控件
let updInput = panel.addInput('点更新: 下标 增量（如 3 5）', (v) => pointUpdate(v), 12);
panel.addButton('随机化数组', randomize);
panel.addButton('点更新', () => pointUpdate(updInput.value));
let qryInput = panel.addInput('前缀查询: 下标（如 6）', (v) => prefixQuery(v), 6);
panel.addButton('前缀查询', () => prefixQuery(qryInput.value));
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始随机数组
clearVisuals();
arrVals = Array.from({ length: N }, () => Math.floor(Math.random() * 10) + 2);
rebuildModel();
buildStatic();

scene.start(engine);
