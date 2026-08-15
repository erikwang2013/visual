// AlgorithmLibrary/DBSCAN3D.js — DBSCAN：密度聚类，ε 邻域 + 核心点扩散，自动发现簇与噪声（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DBSCAN3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const status = panel.addStatus('就绪');

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;

// 10 个样本点：两簇 + 一个孤立点（ε = 1.1，minPts = 3）
const PTS = [[0, 0], [1, 0], [0.5, 0.5], [0, 1], [1, 1], [4, 4], [5, 4], [4.5, 4.5], [4, 5], [7, 1]];
const WX = v => v * 45 + 160, WY = v => 442.5 - v * 45;
const pts = PTS.map((p, i) => new VNode(scene, { radius: 15, x: WX(p[0]), y: WY(p[1]), z: 0, label: String(i), color: DIM, emissive: 0 }));

// 区块标题（对象标签）
new VText(scene, { text: '簇 1', x: 182, y: 470, z: 0, color: GREEN, scale: 0.5 });
new VText(scene, { text: '簇 2', x: 357, y: 288, z: 0, color: BLUE, scale: 0.5 });
new VText(scene, { text: '噪声', x: 475, y: 446, z: 0, color: ROSE, scale: 0.5 });

// 密度可达邻接边（距离 ≤ ε）：簇 1 八条，簇 2 五条
const C1 = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 4], [2, 3], [2, 4], [3, 4]];
const C2 = [[5, 6], [5, 7], [5, 8], [6, 7], [7, 8]];
// 边池：峰值 13 条，池 14，运行期仅改位置/旋转/缩放/显隐
const edgePool = [], edgeFree = [];
for (let i = 0; i < 14; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(400, 4, 4), new THREE.MeshBasicMaterial({ color: DIM }));
  m.visible = false;
  scene.add(m);
  edgePool.push(m);
}
function setEdge(m, i, j) {
  const x1 = WX(PTS[i][0]), y1 = WY(PTS[i][1]), x2 = WX(PTS[j][0]), y2 = WY(PTS[j][1]);
  m.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
  m.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  m.scale.set(Math.hypot(x2 - x1, y2 - y1) / 400, 1, 1);
  m.visible = true;
}
// ε 邻域指示环（半径 = ε × 45）
const epsRing = new VTorus(scene, { radius: 50, color: YELLOW, x: 0, y: 0, z: 0 });
epsRing.mesh.visible = false;

function resetAll() {
  pts.forEach(n => n.setColor(DIM, 0));
  edgePool.forEach(m => (m.visible = false));
  edgeFree.length = 0; edgeFree.push(...edgePool);
  epsRing.mesh.visible = false;
}

function* dbscanGen() {
  yield S(() => { status.textContent = 'DBSCAN 密度聚类：ε = 1.1、minPts = 3，10 个样本点，无需预设簇数即可自动发现簇与噪声'; });
  yield W(900);
  yield S(() => {
    pts[2].setColor(YELLOW, YELLOW);
    epsRing.mesh.visible = true;
    epsRing.moveTo(WX(0.5), WY(0.5), 0, 400);
    status.textContent = '任选一点 (0.5,0.5)（黄，圆环 = ε 邻域）：数半径内邻居 → 4 个 ≥ minPts = 3 → 是核心点，向外扩散';
  });
  yield W(1000);
  yield S(() => {
    for (const i of [0, 1, 2, 3, 4]) pts[i].setColor(GREEN, GREEN);
    for (const [i, j] of C1) { const m = edgeFree.pop(); if (m) setEdge(m, i, j); }
    status.textContent = '核心点的所有密度可达邻居归入簇 1（绿，8 条 ε 内连线），共 5 点 — 簇内任意两点连通';
  });
  yield W(1000);
  yield S(() => {
    pts[7].setColor(YELLOW, YELLOW);
    epsRing.moveTo(WX(4.5), WY(4.5), 0, 400);
    status.textContent = '另一处核心点 (4.5,4.5)：邻域 4 点 ≥ minPts → 独立成簇 2';
  });
  yield W(900);
  yield S(() => {
    for (const i of [5, 6, 7, 8]) pts[i].setColor(BLUE, BLUE);
    for (const [i, j] of C2) { const m = edgeFree.pop(); if (m) setEdge(m, i, j); }
    status.textContent = '簇 2（蓝，5 条连线）共 4 点：两簇间距 > ε，互不相连';
  });
  yield W(1000);
  yield S(() => {
    epsRing.mesh.visible = false;
    pts[9].setColor(ROSE, ROSE);
    status.textContent = '剩余点 (7,1)：ε 邻域内 0 个邻居 → 既不是核心点也不可达 → 噪声（红）';
  });
  yield W(900);
  yield S(() => { status.textContent = 'DBSCAN 演示完成：10 个点聚为 2 簇（簇 1 共 5 点 + 簇 2 共 4 点）+ 噪声 1 点，无需预设簇数；复杂度：O(n²)'; });
  yield W(900);
}

engine.queue(() => dbscanGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
