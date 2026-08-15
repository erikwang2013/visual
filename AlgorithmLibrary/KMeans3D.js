// AlgorithmLibrary/KMeans3D.js — K-Means 聚类：分配点到最近质心 → 质心移到簇均值，迭代至收敛（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KMeans3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const status = panel.addStatus('就绪');

const GREEN = 0x4ade80, BLUE = 0x60a5fa, ORANGE = 0xfb923c, GOLD = 0xfcd34d, DIM = 0x334155;
const CCOL = [GREEN, BLUE, ORANGE];

// 12 个样本点：三簇各 4 点（左下 / 右下 / 上方）
const PTS = [
  [110, 140], [145, 180], [180, 150], [150, 115],
  [425, 130], [465, 165], [500, 140], [450, 195],
  [265, 405], [305, 445], [345, 395], [295, 350],
];
const INIT = [[70, 250], [570, 250], [320, 480]];

// 预计算迭代（纯数学，模块级）：分配 → 质心更新，直到质心不再移动
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
    const g = PTS.filter((p, i) => assign[i] === k);
    if (!g.length) return [...c];
    return [g.reduce((s, p) => s + p[0], 0) / g.length, g.reduce((s, p) => s + p[1], 0) / g.length];
  });
  const moved = nxt.some((c, k) => Math.hypot(c[0] - centroids[k][0], c[1] - centroids[k][1]) > 0.01);
  rounds.push({ assign: [...assign], cents: nxt.map(p => [...p]), moved });
  centroids.forEach((c, k) => { c[0] = nxt[k][0]; c[1] = nxt[k][1]; });
  if (!moved) break;
}

const pts = PTS.map(p => new VNode(scene, { radius: 12, x: p[0], y: p[1], z: 0, label: '', color: DIM, emissive: DIM }));
const cents = INIT.map((c, k) => new VNode(scene, { radius: 20, x: c[0], y: c[1], z: 0, label: 'C' + (k + 1), color: GOLD, emissive: GOLD }));
// 归属连线池：峰值 12 条，池 13，运行期仅改位置/旋转/缩放/颜色/显隐
const linkPool = [], linkFree = [];
for (let i = 0; i < 13; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(640, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }));
  m.visible = false;
  scene.add(m);
  linkPool.push(m);
}
function setLink(m, x1, y1, x2, y2, color) {
  m.material.color.setHex(color);
  m.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
  m.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  m.scale.set(Math.hypot(x2 - x1, y2 - y1) / 640, 1, 1);
  m.visible = true;
}
function hideLinks() {
  linkPool.forEach(m => (m.visible = false));
  linkFree.length = 0; linkFree.push(...linkPool);
}
const vFrom = INIT.map(c => new THREE.Vector3(c[0], c[1], 0));
const vTo = INIT.map(c => new THREE.Vector3(c[0], c[1], 0));
const E = p => p * p * (3 - 2 * p);

function resetAll() {
  pts.forEach(n => n.setColor(DIM, DIM));
  cents.forEach((c, k) => { c.mesh.position.set(INIT[k][0], INIT[k][1], 0); c.setColor(GOLD, GOLD); });
  hideLinks();
}

function* kmeansGen() {
  resetAll();
  yield S(() => { status.textContent = 'K-Means：放置 3 个初始质心（金球 C1/C2/C3），交替执行「分配」与「更新」直到质心不再移动'; });
  yield W(900);
  for (let r = 0; r < rounds.length; r++) {
    const round = rounds[r];
    yield S(() => {
      hideLinks();
      for (let i = 0; i < PTS.length; i++) {
        const k = round.assign[i];
        pts[i].setColor(CCOL[k], CCOL[k]);
        const m = linkFree.pop();
        if (m) setLink(m, PTS[i][0], PTS[i][1], round.cents[k][0], round.cents[k][1], CCOL[k]);
      }
      status.textContent = '第 ' + (r + 1) + ' 轮：把每个点分配给距离最近的质心（连线 = 归属）— 12 点暂分为 3 组';
    });
    yield W(1000);
    if (round.moved) {
      yield S(() => { status.textContent = '第 ' + (r + 1) + ' 轮：质心移动到簇内所有点的均值位置（金球下滑）'; });
      yield W(300);
      for (let k = 0; k < 3; k++) { vFrom[k].copy(cents[k].mesh.position); vTo[k].set(round.cents[k][0], round.cents[k][1], 0); }
      yield A(700, p => cents.forEach((c, k) => c.mesh.position.lerpVectors(vFrom[k], vTo[k], E(p))));
      yield W(500);
    } else {
      yield S(() => { status.textContent = '第 ' + (r + 1) + ' 轮：分配结果与上轮相同，质心不再移动 → 收敛'; });
      yield W(900);
    }
  }
  yield S(() => { status.textContent = 'KMeans 演示完成：12 个点经 2 轮迭代聚为 3 簇（各 4 点），质心收敛不再移动（初值敏感）；复杂度：O(k·n·t)'; });
  yield W(900);
}

engine.queue(() => kmeansGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
