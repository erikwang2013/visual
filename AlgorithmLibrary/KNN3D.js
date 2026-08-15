// AlgorithmLibrary/KNN3D.js — K 近邻分类：算距离 → 取最近 k 个 → 多数投票（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KNN3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const status = panel.addStatus('就绪');

const GREEN = 0x4ade80, BLUE = 0x60a5fa, YELLOW = 0xfacc15, RED = 0xf87171;
const K = 3;
const APTS = [[110, 455], [170, 505], [190, 375], [70, 335], [230, 305]];
const BPTS = [[540, 465], [590, 405], [510, 345], [560, 295], [470, 225]];
const Q = [330, 415];
const CLASSES = [
  ...APTS.map(p => ({ cls: 'A', x: p[0], y: p[1] })),
  ...BPTS.map(p => ({ cls: 'B', x: p[0], y: p[1] })),
];
const clsColor = c => (c === 'A' ? GREEN : BLUE);

// 数据点（常驻）与类标签
const pts = CLASSES.map((p, i) => new VNode(scene, { radius: 15, x: p.x, y: p.y, z: 0, label: '', color: clsColor(p.cls), emissive: clsColor(p.cls) }));
const clsT = CLASSES.map((p, i) => new VText(scene, { text: p.cls + ' 类', x: p.x, y: p.y + 30, z: 0, color: clsColor(p.cls), scale: 0.5 }));
// 查询点
const query = new VNode(scene, { radius: 21, x: Q[0], y: Q[1], z: 0, label: '?', color: YELLOW, emissive: YELLOW });
// 距离徽标（预建隐藏）
const distT = CLASSES.map((p, i) => new VText(scene, { text: '', x: p.x, y: p.y - 26, z: 0, color: PALETTE.textDim, scale: 0.5 }));
// 距离连线池：端点固定（查询点→各数据点），峰值 10、池 11
const tubes = [];
for (let i = 0; i <= CLASSES.length; i++) {
  const c = CLASSES[i % CLASSES.length];
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(Q[0], Q[1], 0), new THREE.Vector3(c.x, c.y, 0)]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 1.8, 6, false), new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0.35 }));
  tube.visible = false;
  scene.add(tube);
  tubes.push(tube);
}
const dists = CLASSES.map((p, i) => ({ i, d: Math.hypot(p.x - Q[0], p.y - Q[1]) }));
dists.sort((x, y) => x.d - y.d);

function resetAll() {
  pts.forEach((p, i) => p.setColor(clsColor(CLASSES[i].cls), clsColor(CLASSES[i].cls)));
  tubes.forEach(t => { t.visible = false; t.material.opacity = 0.35; });
  distT.forEach(t => t.setText(''));
  query.setColor(YELLOW, YELLOW);
  query.setText('?');
  query.mesh.scale.setScalar(1);
}

function* runKNN() {
  resetAll();
  query.pulse();
  yield S(() => { status.textContent = 'KNN 分类：待分类点（黄 ?）与 5 个 A 类、5 个 B 类点 —— 算距离 → 取最近 k = ' + K + ' 个 → 多数投票'; });
  yield W(900);
  for (let done = 0; done < dists.length; done++) {
    const d = dists[done], i = d.i;
    const near = done < K;
    yield S(() => {
      tubes[i].visible = true;
      distT[i].setText('d≈' + d.d.toFixed(1));
      if (near) {
        pts[i].setColor(RED, RED);
        status.textContent = '第 ' + (done + 1) + ' 近：' + CLASSES[i].cls + ' 类点，d≈' + d.d.toFixed(1) + ' —— 进入最近 ' + K + ' 个（红）';
      } else {
        status.textContent = '第 ' + (done + 1) + ' 近：' + CLASSES[i].cls + ' 类点，d≈' + d.d.toFixed(1) + ' —— 超出 k = ' + K + '，不参与投票';
      }
    });
    yield A(320, p => { tubes[i].material.opacity = 0.08 + 0.28 * p; });
    yield W(420);
  }
  const top = dists.slice(0, K);
  const vote = top.reduce((m, d) => { m[CLASSES[d.i].cls] = (m[CLASSES[d.i].cls] || 0) + 1; return m; }, {});
  const winner = (vote.A || 0) >= (vote.B || 0) ? 'A' : 'B';
  yield S(() => {
    query.setColor(winner === 'A' ? GREEN : BLUE, winner === 'A' ? GREEN : BLUE);
    query.setText(winner);
    status.textContent = '最近 ' + K + ' 个：A×' + (vote.A || 0) + '、B×' + (vote.B || 0) + ' → 多数投票：待分类点属于 ' + winner + ' 类';
  });
  query.pulse();
  yield W(1000);
  yield S(() => { status.textContent = 'KNN 演示完成：待分类点 → ' + winner + ' 类（最近 ' + K + ' 个 A:' + (vote.A || 0) + '、B:' + (vote.B || 0) + '）；复杂度：预测 O(n·d) 距离 + O(k) 投票，训练 O(1)（惰性学习）'; });
  yield W(1000);
  yield S(() => { pts.forEach((p, i) => p.setColor(clsColor(CLASSES[i].cls), clsColor(CLASSES[i].cls))); });
  yield W(300);
}

engine.queue(() => runKNN());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
