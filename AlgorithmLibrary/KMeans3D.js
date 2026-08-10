// AlgorithmLibrary/KMeans3D.js — K-Means 聚类：分配点到最近质心 → 质心移到均值，迭代收敛
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KMeans3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 720], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, BLUE = 0x60a5fa, ORANGE = 0xfb923c, DIM = 0x334155, YELLOW = 0xfacc15;
const CCOL = [GREEN, BLUE, ORANGE];
const hint = new VText(scene, { text: '点击「运行聚类」开始', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const PTS = [
  [150, 80], [210, 50], [180, 130], [250, 110],
  [-180, 90], [-230, 140], [-160, 160], [-250, 40],
  [-30, -120], [40, -150], [-90, -170], [70, -80],
];
const INIT = [[-300, 240], [300, 240], [0, -260]];

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
const tubes = PTS.map(() => tubeBetween(scene, [0, 0, 0], [0, 0, 0], { color: YELLOW, opacity: 0.25, radius: 1.5 }));
tubes.forEach(t => t.visible = false);
const roundT = new VText(scene, { text: '', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.8 });

function resetAll() {
  engine.clear();
  pts.forEach(p => p.setColor(DIM, DIM));
  cents.forEach((c, k) => { c.moveTo(INIT[k][0], INIT[k][1], 0, 1); });
  tubes.forEach(t => t.visible = false);
  roundT.setText('');
}

function runKMeans() {
  resetAll();
  hint.setText('K-Means：先放置 ' + cents.length + ' 个初始质心，交替执行「分配」与「更新」直至收敛');
  let r = 0;
  const runRound = () => {
    if (r >= rounds.length) {
      status.textContent = '聚类收敛：' + rounds.length + ' 轮迭代后质心不再移动';
      hint.setText('K 需事先给定；初始质心随机，不同初值可能收敛到不同结果');
      return;
    }
    const round = rounds[r]; r++;
    roundT.setText('第 ' + r + ' 轮迭代');
    hint.setText('第 ' + r + ' 轮：把每个点分配给距离最近的质心');
    C(300, () => {
      pts.forEach((p, i) => {
        const k = round.assign[i];
        tubes[i].visible = true;
        const c = cents[k];
        tubes[i].geometry.dispose();
        tubes[i] = tubeBetween(scene, [p.mesh.position.x, p.mesh.position.y, 0], [c.mesh.position.x, c.mesh.position.y, 0], { color: CCOL[k], opacity: 0.25, radius: 1.5 });
        p.setColor(CCOL[k], CCOL[k]);
      });
    });
    C(900, () => {
      hint.setText('第 ' + r + ' 轮：质心移动到簇内所有点的均值位置');
      cents.forEach((c, k) => c.moveTo(round.cents[k][0], round.cents[k][1], 0, 700));
    });
    C(800, () => {
      tubes.forEach(t => t.visible = false);
      pts.forEach(p => p.setColor(DIM, DIM));
      cents.forEach((c, k) => c.setColor(CCOL[k], CCOL[k]));
    });
    C(600, runRound);
  };
  runRound();
}

panel.addButton('运行聚类', runKMeans);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；图像压缩、文档聚类常用 K-Means）');

scene.start(engine);
