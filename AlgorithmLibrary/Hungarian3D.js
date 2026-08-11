// AlgorithmLibrary/Hungarian3D.js — 匈牙利算法（Kuhn 增广）：未匹配点 DFS 找增广路并翻转，二分图最大匹配（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Hungarian3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 700], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：匈牙利算法（Kuhn 增广）', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -265, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const LEFT = 3, RIGHT = 3;
const LX = -300, RX = 300, GAP = 180, Y0 = 180;
const adjL = [[0, 1], [0, 2], [1, 2]];
const nodeView = new Map();   // 'L0' / 'R1' -> VNode
const edgeView = new Map();   // 'u-v' -> tube
let matchR = [], matchL = [];

function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); });
  nodeView.clear(); edgeView.clear();
}
function buildGraph() {
  clearView();
  for (let u = 0; u < LEFT; u++) {
    const vn = new VNode(scene, { radius: 21, x: LX, y: Y0 - u * GAP, z: 0, label: 'L' + u, color: BLUE, emissive: BLUE });
    nodeView.set('L' + u, vn);
  }
  for (let v = 0; v < RIGHT; v++) {
    const vn = new VNode(scene, { radius: 21, x: RX, y: Y0 - v * GAP, z: 0, label: 'R' + v, color: BLUE, emissive: BLUE });
    nodeView.set('R' + v, vn);
  }
  for (let u = 0; u < LEFT; u++) {
    for (const v of adjL[u]) {
      const a = new THREE.Vector3(LX, Y0 - u * GAP, 0), b = new THREE.Vector3(RX, Y0 - v * GAP, 0);
      const m = tube(a, b);
      scene.add(m);
      edgeView.set(u + '-' + v, { tube: m });
    }
  }
}
function setNodeColor(key, c) { nodeView.get(key).setColor(c, c); }
function setEdgeColor(u, v, c, op) { const e = edgeView.get(u + '-' + v); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function refreshMatched() {
  edgeView.forEach((e, key) => {
    const [u, v] = key.split('-').map(Number);
    const isMatched = matchR[v] === u;
    e.tube.material.color.setHex(isMatched ? GREEN : WHITE);
    e.tube.material.opacity = isMatched ? 1 : 0.55;
  });
  nodeView.forEach((v, key) => { if (!key.startsWith('L')) v.setColor(matchR[Number(key.slice(1))] !== -1 ? GREEN : BLUE, matchR[Number(key.slice(1))] !== -1 ? GREEN : BLUE); });
}

function* tryKuhn(u, visitedR) {
  for (const v of adjL[u]) {
    if (visitedR.has(v)) continue;
    visitedR.add(v);
    setEdgeColor(u, v, CYAN, 1);
    setNodeColor('R' + v, ORANGE);
    yield S(() => outT.setText('L' + u + ' 尝试 R' + v + (matchR[v] === -1 ? '（未匹配）' : '（已配给 L' + matchR[v] + '，递归让位）')));
    yield W(300);
    if (matchR[v] === -1 || (yield* tryKuhn(matchR[v], visitedR))) {
      matchR[v] = u; matchL[u] = v;
      refreshMatched();
      setEdgeColor(u, v, GOLD, 1);
      setNodeColor('L' + u, GREEN);
      yield S(() => outT.setText('匹配 L' + u + '-R' + v + '！'));
      yield W(420);
      return true;
    }
    setEdgeColor(u, v, WHITE, 0.4);
    setNodeColor('R' + v, BLUE);
  }
  return false;
}

function* hungarianGen() {
  matchR = Array(RIGHT).fill(-1); matchL = Array(LEFT).fill(-1);
  yield S(() => outT.setText('匈牙利（Kuhn）：对每个未匹配左点，沿「未匹配边-已匹配边」交替路径 DFS 找增广路；找到则整条路径翻转'));
  yield W(650);
  let size = 0;
  for (let u = 0; u < LEFT; u++) {
    if (matchL[u] !== -1) continue;
    yield S(() => outT.setText('——— 为 L' + u + ' 找增广路（交替路径）———'));
    yield W(400);
    setNodeColor('L' + u, ORANGE);
    const ok = yield* tryKuhn(u, new Set());
    if (ok) {
      size++;
      yield S(() => outT.setText('增广成功：当前匹配 ' + size + ' 对'));
    } else {
      setNodeColor('L' + u, RED);
      yield S(() => outT.setText('L' + u + ' 无增广路：保持未匹配'));
      yield W(350);
      setNodeColor('L' + u, BLUE);
    }
    refreshMatched();
    yield W(450);
  }
  const pairs = [];
  for (let v = 0; v < RIGHT; v++) if (matchR[v] !== -1) pairs.push('L' + matchR[v] + '-R' + v);
  yield S(() => outT.setText('最大匹配 ' + size + ' 对：' + pairs.join('、')));
  yield W(550);
  yield S(() => { status.textContent = 'Hungarian 完成：最大匹配 ' + size + '，O(VE)'; });
  yield W(450);
  refreshMatched();
}

function* runHungarian() {
  buildGraph();
  hint.setText('匈牙利算法：增广路翻转，直到无增广路');
  yield W(400);
  yield* hungarianGen();
  yield S(() => { outT.setText(''); hint.setText('Hungarian 完成：Kuhn 增广路算法，O(VE)'); });
}

panel.addButton('运行演示', () => engine.start(runHungarian()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 尝试边，金 = 新匹配，绿 = 已匹配；右列节点绿色 = 已匹配）');

scene.start(engine);
