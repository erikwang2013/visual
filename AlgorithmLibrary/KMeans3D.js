// AlgorithmLibrary/KMeans3D.js — K-Means 聚类：分配点到最近质心 → 质心移到均值，迭代收敛（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KMeans3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, BLUE = 0x60a5fa, ORANGE = 0xfb923c, DIM = 0x334155, YELLOW = 0xfacc15;
const CCOL = [GREEN, BLUE, ORANGE];
const hint = new VText(scene, { text: '点击「▶ 演示」开始：K-Means 聚类', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

const PTS = [
  [402.5, 419], [435.5, 402.5], [419, 446.5], [457.5, 435.5],
  [221, 424.5], [193.5, 452], [232, 463], [182.5, 397],
  [303.5, 309], [342, 292.5], [270.5, 281.5], [358.5, 331],
];
const INIT = [[155, 507], [485, 507], [320, 232]];

// 预计算迭代：分配 → 质心更新，直到收敛
const centroids = INIT.map(p => [...p]);
const rounds = [];
for (let r = 0; r < 3; r++) {
  const assign = PTS.map(p => {
    let bi = 0, bd = Infinity;
    for (let k = 0; k < 3; k++) {
      const d = Math.hypot(p[0] - centroids[k][0], p[1] - centroids[k][1]);
      if (d < bd) { bd = d; bi = k; }
    }
    return bi;
  });
  const nxt = centroids.map((c, k) => {
    const g = PTS.map((p, i) => ({ p, i })).filter(x => assign[x.i] === k).map(x => x.p);
    if (!g.length) return [...c];
    return [g.reduce((s, p) => s + p[0], 0) / g.length, g.reduce((s, p) => s + p[1], 0) / g.length];
  });
  rounds.push({ assign: [...assign], cents: nxt.map(p => [...p]) });
  const moved = nxt.some((c, k) => Math.hypot(c[0] - centroids[k][0], c[1] - centroids[k][1]) > 0.01);
  centroids.forEach((c, k) => { c[0] = nxt[k][0]; c[1] = nxt[k][1]; });
  if (!moved) break;
}

const pts = PTS.map(p => new VBox(scene, { w: 22, h: 22, d: 22, x: p[0], y: p[1], z: 0, label: '', color: DIM, emissive: DIM }));
const cents = INIT.map((c, k) => new VBox(scene, { w: 48, h: 48, d: 48, x: c[0], y: c[1], z: 0, label: 'C' + (k + 1), color: CCOL[k], emissive: CCOL[k] }));
let tubes = PTS.map(() => tubeBetween(scene, new THREE.Vector3(), new THREE.Vector3(), { color: YELLOW, opacity: 0.25, radius: 1.5 }));
const roundT = new VText(scene, { text: '', x: 700, y: 430, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const legend = new VText(scene, { text: '绿=簇1 蓝=簇2 橙=簇3（连线=归属）', x: 700, y: 340, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });

function dropTubes() {
  tubes.forEach(t => { scene.remove(t); if (t.geometry) t.geometry.dispose(); if (t.material) t.material.dispose(); });
  tubes = [];
}
function resetAll() {
  pts.forEach(p => p.setColor(DIM, DIM));
  cents.forEach((c, k) => { c.mesh.position.set(INIT[k][0], INIT[k][1], 0); c.setColor(CCOL[k], CCOL[k]); });
  dropTubes();
  roundT.setText('');
}

function* kmeansGen() {
  resetAll();
  yield S(() => hint.setText('K-Means：先放置 3 个初始质心，交替执行「分配」与「更新」直至收敛'));
  yield W(500);
  for (let r = 0; r < rounds.length; r++) {
    const round = rounds[r];
    yield S(() => {
      roundT.setText('第 ' + (r + 1) + ' 轮迭代');
      hint.setText('第 ' + (r + 1) + ' 轮：把每个点分配给距离最近的质心');
      dropTubes();
      tubes = PTS.map((p, i) => {
        const k = round.assign[i];
        const t = tubeBetween(scene, new THREE.Vector3(p[0], p[1], 0), new THREE.Vector3(round.cents[k][0], round.cents[k][1], 0), { color: CCOL[k], opacity: 0.25, radius: 1.5 });
        pts[i].setColor(CCOL[k], CCOL[k]);
        return t;
      });
    });
    yield W(750);
    const from = cents.map(c => c.mesh.position.clone());
    const to = round.cents.map(c => new THREE.Vector3(c[0], c[1], 0));
    yield S(() => { hint.setText('第 ' + (r + 1) + ' 轮：质心移动到簇内所有点的均值位置'); });
    yield A(700, p => cents.forEach((c, k) => c.mesh.position.lerpVectors(from[k], to[k], easeInOut(p))));
    yield S(() => {
      dropTubes();
      pts.forEach(p => p.setColor(DIM, DIM));
      cents.forEach((c, k) => c.setColor(CCOL[k], CCOL[k]));
    });
    yield W(350);
  }
  yield S(() => {
    status.textContent = '聚类收敛：' + rounds.length + ' 轮迭代后质心不再移动（初始质心随机，不同初值可能收敛到不同结果）';
    hint.setText('K 需事先给定；应用：图像压缩（像素聚类成 k 种主色）、文档聚类、客户分群');
  });
  yield W(600);
}

engine.queue(() => kmeansGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；圆点=样本，方块=质心，连线=点到质心的归属）');

scene.start(engine);
