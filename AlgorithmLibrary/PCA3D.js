// AlgorithmLibrary/PCA3D.js — PCA：协方差矩阵特征分解求主成分，样本投影降维（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('PCA3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, VIOLET = 0xa78bfa, ROSE = 0xfb7185, GOLD = 0xfcd34d, YELLOW = 0xfacc15;
const status = panel.addStatus('就绪');

// ---- 样本点池：5 个二维点 + 均值（静态演示体） ----
const PTS = [[1, 2], [2, 1], [3, 4], [4, 3], [5, 6]];
const WX = v => 320 + (v - 3) * 55, WY = v => 380 - (v - 3.2) * 55;
const pts = PTS.map((p, i) => new VNode(scene, { radius: 16, x: WX(p[0]), y: WY(p[1]), z: 0, label: 'p' + i, color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const mean = new VNode(scene, { radius: 20, x: 320, y: 380, z: 0, label: '均值', color: YELLOW, emissive: YELLOW });

// ---- 主轴池：特征向量 e1=(0.619,0.785) λ1=5.67、e2=(-0.785,0.619) λ2=0.53（屏幕方向 y 翻转） ----
const E1 = [0.619, 0.785], E2 = [-0.785, 0.619];
const SC = 55;
const D1 = [E1[0], -E1[1]], D2 = [E2[0], -E2[1]];
const axis1 = new VBox(scene, { w: 400, h: 5, d: 5, x: 320, y: 380, z: 0, label: '', color: BLUE, emissive: BLUE });
axis1.mesh.rotation.z = Math.atan2(D1[1], D1[0]);
axis1.mesh.scale.set(7.2 * SC / 400, 1, 1);
axis1.mesh.visible = false;
const tip1 = { x: 320 + 3.6 * D1[0] * SC, y: 380 + 3.6 * D1[1] * SC };
const arrow1 = new THREE.Mesh(new THREE.ConeGeometry(11, 26, 12), new THREE.MeshBasicMaterial({ color: BLUE }));
arrow1.rotation.z = Math.atan2(D1[0], D1[1]);
arrow1.position.set(tip1.x, tip1.y, 0);
arrow1.visible = false;
scene.add(arrow1);
const axis2 = new VBox(scene, { w: 200, h: 4, d: 4, x: 320, y: 380, z: 0, label: '', color: VIOLET, emissive: VIOLET });
axis2.mesh.rotation.z = Math.atan2(D2[1], D2[0]);
axis2.mesh.scale.set(3.2 * SC / 200, 1, 1);
axis2.mesh.visible = false;
const tip2 = { x: 320 + 1.6 * D2[0] * SC, y: 380 + 1.6 * D2[1] * SC };
const arrow2 = new THREE.Mesh(new THREE.ConeGeometry(9, 20, 12), new THREE.MeshBasicMaterial({ color: VIOLET }));
arrow2.rotation.z = Math.atan2(D2[0], D2[1]);
arrow2.position.set(tip2.x, tip2.y, 0);
arrow2.visible = false;
scene.add(arrow2);
// ---- 投影池：每点投影线（玫瑰）+ 投影点（金），t = (p-μ)·e₁ ----
const T = PTS.map(([x, y]) => (x - 3) * E1[0] + (y - 3.2) * E1[1]);
const projPts = T.map(t => ({ x: 320 + t * E1[0] * SC, y: 380 - t * E1[1] * SC }));
const projLines = [], projDots = [];
for (let i = 0; i < PTS.length; i++) {
  const src = { x: WX(PTS[i][0]), y: WY(PTS[i][1]) };
  const dst = projPts[i];
  const dx = dst.x - src.x, dy = dst.y - src.y;
  const line = new VBox(scene, { w: 200, h: 2, d: 2, x: (src.x + dst.x) / 2, y: (src.y + dst.y) / 2, z: 0, label: '', color: ROSE, emissive: ROSE });
  line.mesh.rotation.z = Math.atan2(dy, dx);
  line.mesh.scale.set(Math.max(Math.hypot(dx, dy) / 200, 0.03), 1, 1);
  line.mesh.visible = false;
  projLines.push(line);
  const dot = new VNode(scene, { radius: 10, x: src.x, y: src.y, z: 0, label: '', color: GOLD, emissive: GOLD });
  dot.mesh.visible = false;
  projDots.push(dot);
}

function resetAll() {
  pts.forEach(n => n.setColor(PALETTE.node, PALETTE.nodeEmissive));
  axis1.mesh.visible = false; axis2.mesh.visible = false;
  arrow1.visible = false; arrow2.visible = false;
  projLines.forEach(l => (l.mesh.visible = false));
  projDots.forEach((d, i) => { d.mesh.position.set(WX(PTS[i][0]), WY(PTS[i][1]), 0); d.mesh.visible = false; });
}

function* runPca() {
  resetAll();
  yield S(() => { status.textContent = 'PCA：主成分分析降维 —— 5 个二维样本（p0..p4），找方差最大的方向作为主成分，把数据投影过去压缩维度'; });
  yield W(800);
  yield S(() => { status.textContent = '样本均值 μ=(3, 3.2)（黄块）；去中心化后协方差矩阵 Σ = [[2.5, 2.5], [2.5, 3.7]]，对角线=各轴方差、非对角线=相关性'; });
  yield W(950);
  yield S(() => {
    axis1.mesh.visible = true; arrow1.visible = true;
    status.textContent = '特征分解：λ₁=5.67 → 特征向量 (0.619, 0.785)（蓝轴=第一主成分，数据最分散的方向）';
  });
  yield W(800);
  yield S(() => {
    axis2.mesh.visible = true; arrow2.visible = true;
    status.textContent = 'λ₂=0.53 → 特征向量 (-0.785, 0.619)（紫轴=第二主成分，与第一主成分正交）；λ₁/(λ₁+λ₂) = 91.5%，只丢 8.5% 方差即可降一维';
  });
  yield W(800);
  yield S(() => {
    for (let i = 0; i < PTS.length; i++) {
      projLines[i].mesh.visible = true;
      projDots[i].mesh.visible = true;
      projDots[i].moveTo(projPts[i].x, projPts[i].y, 0, 700);
    }
    status.textContent = '把每个样本正交投影到第一主成分轴（玫瑰虚线=投影误差，黄点从原位滑到轴上）：一维坐标 t = (p-μ)·e₁';
  });
  yield W(900);
  yield S(() => {
    const order = T.map((t, i) => ({ t, i })).sort((a, b) => a.t - b.t).map(o => 'p' + o.i);
    status.textContent = '降维结果：5 点沿蓝轴按 t 排开 = ' + order.join(' → ') + '（t = ' + T.map(t => t.toFixed(2)).join(', ') + '），二维 → 一维';
  });
  yield W(850);
  yield S(() => { status.textContent = 'PCA 演示完成：特征分解 λ₁=5.67、λ₂=0.53，主成分 1 保留 91.5% 方差，5 点降为一维坐标；复杂度：协方差矩阵 O(n·d²) + 特征分解 O(d³)，d=特征数'; });
  yield W(900);
}

engine.queue(() => runPca());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
