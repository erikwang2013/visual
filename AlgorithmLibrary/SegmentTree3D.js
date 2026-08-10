// AlgorithmLibrary/SegmentTree3D.js
// 线段树（区间和）：堆式存储，建树自底向上合并，区间查询 完全/部分/不相交 三类节点，
// 点更新自叶到根重算。节点为发光的 VBox，上浮脉冲表示求和，高亮表示正在访问。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple, land } from '../3D/effects/Fx.js';
applyTheme('SegmentTree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 350, 790], fov: 58 });
const engine = new AnimationEngine({ speed: 1.4 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「建树」构建线段树，再尝试区间查询与点更新', x: 0, y: 318, z: 0, color: PALETTE.textGlow, scale: 0.85 });

const ARR = [5, 3, 8, 1, 9, 4, 7, 2];
const N = ARR.length, TREE = 15;
const boxes = {};
const aux = [];
let built = false;

const isLeaf = (id) => id >= N;
const baseColor = (id) => (isLeaf(id) ? PALETTE.blue : PALETTE.node);
const baseEmissive = (id) => (isLeaf(id) ? PALETTE.blueEmissive : PALETTE.nodeEmissive);

function posOf(id) {
  const depth = Math.floor(Math.log2(id));
  const idxInRow = id - (1 << depth);
  const x = ((idxInRow + 0.5) / (1 << depth) - 0.5) * 560;
  return [x, 215 - depth * 70];
}

function sumOf(id) {
  const t = boxes[id];
  if (!t || t.text === '') return 0;
  return parseInt(t.text, 10) || 0;
}

function spawnTree() {
  for (const o of aux) o.remove();
  aux.length = 0;
  built = false;
  const cells = [[], [], [], []];
  for (let id = 1; id <= TREE; id++) {
    const depth = Math.floor(Math.log2(id));
    const [x, y] = posOf(id);
    const b = new VBox(scene, { w: isLeaf(id) ? 52 : 44, h: isLeaf(id) ? 52 : 44, d: 18, x, y, z: 0, label: isLeaf(id) ? String(ARR[id - N]) : '', color: baseColor(id), emissive: baseEmissive(id) });
    boxes[id] = b;
    aux.push(b);
    land(scene, b.mesh);
    cells[depth].push(id);
  }
  return cells;
}

function flashBox(id) {
  const b = boxes[id];
  let fxDone = false;
  C(280, (p) => {
    if (!fxDone) { fxDone = true; ripple(scene, b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, PALETTE.highlight, 52); }
    b.mesh.material.color.lerpColors(new THREE.Color(baseColor(id)), new THREE.Color(PALETTE.highlight), Math.min(1, p * 4));
  }, () => b.setColor(baseColor(id), baseEmissive(id)));
}

function pulseSum(id) {
  const b = boxes[id];
  const baseY = b.mesh.position.y;
  C(320, (p) => {
    b.mesh.position.y = baseY + 26 * Math.sin(p * Math.PI);
    b.mesh.material.color.lerpColors(new THREE.Color(PALETTE.node), new THREE.Color(PALETTE.green), Math.min(1, p * 4));
  }, () => { b.mesh.position.y = baseY; b.setColor(baseColor(id), baseEmissive(id)); });
}

function buildTree() {
  engine.clear();
  const cells = spawnTree();
  for (let d = 2; d >= 0; d--) {
    for (const id of cells[d]) {
      const lc = id * 2, rc = id * 2 + 1;
      flashBox(lc);
      flashBox(rc);
      C(1, () => hint.setText('合并：节点 ' + lc + ' + 节点 ' + rc + ' 的和填入节点 ' + id), () => {});
      pulseSum(id);
      C(1, () => { boxes[id].setText(String(sumOf(lc) + sumOf(rc))); }, () => { boxes[id].setText(''); });
    }
  }
  built = true;
  C(1, () => {
    status.textContent = '线段树构建完成，根节点 = 数组总和 ' + sumOf(1);
    hint.setText('建树完成：' + N + ' 个叶子，' + (TREE - N - 1) + ' 个内部节点，自底向上合并');
  }, () => {});
}

function runQuery() {
  const l = Math.min(Math.max(parseInt(qLInput.value, 10) || 0, 0), N - 1);
  const r = Math.min(Math.max(parseInt(qRInput.value, 10) || 0, l), N - 1);
  qLInput.value = String(l); qRInput.value = String(r);
  if (!built) { status.textContent = '请先点击「建树」'; return; }
  let total = 0;
  C(1, () => hint.setText('区间查询 [' + l + ',' + r + ']：自根递归，完全覆盖/部分/不相交三类节点'), () => {});
  queryNode(1, 0, N - 1, l, r, (v) => { total += v; });
  C(1, () => {
    status.textContent = '区间 [' + l + ',' + r + '] 的和 = ' + total;
    hint.setText('查询完成：完全覆盖的节点直接取和，总和 ' + total);
  }, () => {});
}

function queryNode(id, lo, hi, ql, qr, acc) {
  if (ql > hi || qr < lo) {
    C(1, () => hint.setText('节点 ' + id + ' [' + lo + ',' + hi + '] 与查询区间不相交，剪枝返回'), () => {});
    return;
  }
  if (ql <= lo && hi <= qr) {
    flashBox(id);
    const v = sumOf(id);
    C(1, () => { hint.setText('节点 ' + id + ' [' + lo + ',' + hi + '] 完全覆盖，取和 ' + v); acc(v); }, () => {});
    return;
  }
  flashBox(id);
  C(1, () => hint.setText('节点 ' + id + ' [' + lo + ',' + hi + '] 部分覆盖，向下递归'), () => {});
  const mid = (lo + hi) >> 1;
  queryNode(id * 2, lo, mid, ql, qr, acc);
  queryNode(id * 2 + 1, mid + 1, hi, ql, qr, acc);
}

function runUpdate() {
  const idx = Math.min(Math.max(parseInt(uIdxInput.value, 10) || 0, 0), N - 1);
  const val = parseInt(uValInput.value, 10) || 0;
  uIdxInput.value = String(idx); uValInput.value = String(val);
  if (!built) { status.textContent = '请先点击「建树」'; return; }
  const old = sumOf(N + idx);
  C(1, () => hint.setText('点更新：arr[' + idx + '] ' + old + ' → ' + val + '，自叶到根重算祖先'), () => {});
  flashBox(N + idx);
  C(1, () => boxes[N + idx].setText(String(val)), () => boxes[N + idx].setText(String(old)));
  for (let id = (N + idx) >> 1; id >= 1; id >>= 1) {
    pulseSum(id);
    C(1, () => { boxes[id].setText(String(sumOf(id * 2) + sumOf(id * 2 + 1))); }, () => { boxes[id].setText(''); });
  }
  C(1, () => {
    status.textContent = 'arr[' + idx + '] = ' + val + ' 已更新';
    hint.setText('更新完成：根节点变为 ' + sumOf(1));
  }, () => {});
}

const qLInput = panel.addInput('查询左', runQuery, 4);
qLInput.value = '2';
const qRInput = panel.addInput('查询右', runQuery, 4);
qRInput.value = '5';
panel.addButton('区间查询', runQuery);
const uIdxInput = panel.addInput('下标', runUpdate, 4);
uIdxInput.value = '3';
const uValInput = panel.addInput('新值', runUpdate, 4);
uValInput.value = '9';
panel.addButton('点更新', runUpdate);
panel.addButton('建树', buildTree);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
