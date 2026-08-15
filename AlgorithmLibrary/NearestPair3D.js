// AlgorithmLibrary/NearestPair3D.js — 最近点对（分治）：左右各找最近，合并时只查中线 δ 带 —— 暴力 O(n²) 被压到 O(n log n)（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('NearestPair3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const status = panel.addStatus('就绪');

const PTS = [[0, 2], [1, 5], [2, 3], [3, 4], [5, 1], [6, 6], [7, 3], [8, 5]];
const SC = 55;
const pos = p => [(p[0] - 4) * SC + 320, -(p[1] - 3.5) * SC + 300];
const E = p => p * p * (3 - 2 * p);
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const f2 = v => Math.round(v * 1000) / 1000;
const left = PTS.slice(0, 4), right = PTS.slice(4);
const pairs = arr => {
  const ps = [];
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) ps.push({ a: arr[i], b: arr[j], d: dist(arr[i], arr[j]) });
  return ps;
};
const pairsL = pairs(left), pairsR = pairs(right);
const bestL = pairsL.reduce((m, p) => p.d < m.d ? p : m);
const bestR = pairsR.reduce((m, p) => p.d < m.d ? p : m);
const DELTA = bestL.d;
const strip = [PTS[3], PTS[4]];
const crossD = dist(strip[0], strip[1]);

// ---- 对象池：节点球 + 连线管（模块级预建，生成器内零分配）----
const nodePool = [], nodeFree = [];
for (let i = 0; i < 14; i++) nodePool.push(new VNode(scene, { radius: 11, x: 0, y: 0, z: 0, label: '·', color: DIM, emissive: DIM }));
const tubePool = [], tubeFree = [];
for (let i = 0; i < 12; i++) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 2, 2, 6, false), new THREE.MeshBasicMaterial({ color: DIM, transparent: true, opacity: 0.5 }));
  tube.visible = false;
  scene.add(tube);
  tubePool.push({ tube, curve });
}
nodeFree.push(...nodePool); tubeFree.push(...tubePool);
function clearAll() {
  nodeFree.length = 0; nodeFree.push(...nodePool);
  tubeFree.length = 0; tubeFree.push(...tubePool);
  nodePool.forEach(v => { v.mesh.visible = false; v.mesh.scale.setScalar(0.01); });
  tubePool.forEach(e => e.tube.visible = false);
}
function addNode(p, color) {
  const vn = nodeFree.pop();
  vn.mesh.position.set(pos(p)[0], pos(p)[1], 0);
  vn.mesh.scale.setScalar(0.01);
  vn.mesh.visible = true;
  vn.setText('(' + p[0] + ',' + p[1] + ')');
  vn.setColor(color, color);
  return vn;
}
function addLine(a, b, color, opacity, radius = 2) {
  const e = tubeFree.pop();
  e.curve.points[0].set(a[0], a[1], 0);
  e.curve.points[1].set(b[0], b[1], 0);
  e.tube.geometry.dispose();
  e.tube.geometry = new THREE.TubeGeometry(e.curve, 2, radius, 6, false);
  e.tube.material.color.setHex(color);
  e.tube.material.opacity = 0;
  e.tube.visible = true;
  return e;
}
function hideLine(e) { e.tube.visible = false; tubeFree.push(e); }
function* popNodes(list) { yield A(380, p => list.forEach(vn => vn.mesh.scale.setScalar(0.01 + 0.99 * E(p)))); }
function* fadeIn(e, opacity) { yield A(380, p => e.tube.material.opacity = opacity * E(p)); }

function* nearestPairGen() {
  yield S(() => { status.textContent = '暴力需 C(8,2)=28 次距离计算；分治：一分为二、各自递归、最后合并 —— 合并很便宜'; });
  yield W(600);
  const all = [];
  yield S(() => { clearAll(); status.textContent = '全部 8 个点就位（带坐标标签），中线 x=4 把平面劈成左右两半'; });
  PTS.forEach(p => all.push(addNode(p, DIM)));
  const mid = addLine([320, 450, 0], [320, 130, 0], CYAN, 0.35);
  yield* popNodes(all);
  yield* fadeIn(mid, 0.35);
  yield W(450);

  yield S(() => { status.textContent = '左半 4 点（紫）：内部暴力找最近 —— 4 个点只需 6 对'; });
  const ls = [];
  left.forEach(p => ls.push(addNode(p, VIOLET)));
  yield* popNodes(ls);
  yield W(400);
  for (const [i, p] of pairsL.entries()) {
    const ln = addLine(pos(p.a), pos(p.b), CYAN, 0.4, 1.6);
    yield S(() => { status.textContent = '左半第 ' + (i + 1) + ' 对：(' + p.a.join(',') + ')−(' + p.b.join(',') + ') = ' + f2(p.d); });
    yield* fadeIn(ln, 0.4);
    yield W(250);
    hideLine(ln);
    yield W(40);
  }
  const bL = addLine(pos(bestL.a), pos(bestL.b), GOLD, 0.75, 2.6);
  yield S(() => { status.textContent = '左半最优：(' + bestL.a.join(',') + ')−(' + bestL.b.join(',') + ') = ' + f2(bestL.d) + '（金色连线），6 对全查完'; });
  yield* fadeIn(bL, 0.75);
  yield W(500);

  yield S(() => { status.textContent = '右半 4 点（琥珀）：同样流程 —— 6 对逐对排查'; });
  clearAll();
  const rs = [];
  PTS.forEach(p => rs.push(addNode(p, DIM)));
  right.forEach(p => rs.push(addNode(p, AMBER)));
  const mid2 = addLine([320, 450, 0], [320, 130, 0], CYAN, 0.35);
  yield* popNodes(rs);
  yield* fadeIn(mid2, 0.35);
  yield W(400);
  for (const [i, p] of pairsR.entries()) {
    const ln = addLine(pos(p.a), pos(p.b), CYAN, 0.4, 1.6);
    yield S(() => { status.textContent = '右半第 ' + (i + 1) + ' 对：(' + p.a.join(',') + ')−(' + p.b.join(',') + ') = ' + f2(p.d); });
    yield* fadeIn(ln, 0.4);
    yield W(250);
    hideLine(ln);
    yield W(40);
  }
  const bR = addLine(pos(bestR.a), pos(bestR.b), GOLD, 0.75, 2.6);
  yield S(() => { status.textContent = '右半最优：(' + bestR.a.join(',') + ')−(' + bestR.b.join(',') + ') = ' + f2(bestR.d) + '；δ = min(左右) = ' + f2(DELTA); });
  yield* fadeIn(bR, 0.75);
  yield W(500);

  yield S(() => { status.textContent = '合并：跨半点对只可能出现在 δ 带内（|x−4| < δ，青色竖线），只有 (3,4) 和 (5,1) 在带里'; });
  clearAll();
  const band = [];
  PTS.forEach(p => band.push(addNode(p, DIM)));
  const div = addLine([320, 450, 0], [320, 130, 0], CYAN, 0.35);
  const bandL = addLine([320 - DELTA * SC, 450, 0], [320 - DELTA * SC, 130, 0], CYAN, 0.4);
  const bandR = addLine([320 + DELTA * SC, 450, 0], [320 + DELTA * SC, 130, 0], CYAN, 0.4);
  strip.forEach(p => band.push(addNode(p, CYAN)));
  yield* popNodes(band);
  yield* fadeIn(div, 0.35);
  yield* fadeIn(bandL, 0.4);
  yield* fadeIn(bandR, 0.4);
  yield W(600);

  yield S(() => { status.textContent = '带内配对：(' + strip[0].join(',') + ')−(' + strip[1].join(',') + ') = ' + f2(crossD) + ' > δ = ' + f2(DELTA) + ' —— 放弃，跨半候选不比 δ 小'; });
  const cL = addLine(pos(strip[0]), pos(strip[1]), ROSE, 0.65, 2.2);
  yield* fadeIn(cL, 0.65);
  yield W(600);

  yield S(() => { status.textContent = '答案：(' + bestL.a.join(',') + ')−(' + bestL.b.join(',') + ') = √2 ≈ ' + f2(bestL.d) + '（金色）—— 递归、合并各一层锁定全局最近'; });
  clearAll();
  const fin = [];
  PTS.forEach(p => fin.push(addNode(p, DIM)));
  const ans = addLine(pos(bestL.a), pos(bestL.b), GOLD, 0.8, 3);
  yield* popNodes(fin);
  yield* fadeIn(ans, 0.8);
  yield W(600);

  yield S(() => { status.textContent = '最近点对演示完成：8 点分治 3 轮，左右最近均 (2,3)−(3,4) 距离 √2≈1.414，δ 带内配对 (3,4)−(5,1) 被否，全局最近 (2,3)−(3,4) 距离 √2≈1.414；T(n)=2T(n/2)+O(n) → O(n log n)，暴力需 28 次距离'; });
  yield W(900);
}

clearAll();
PTS.forEach(p => addNode(p, DIM));   // 加载即显示演示体，点播放才动画
engine.queue(() => nearestPairGen());
panel.addButton('清空', () => { engine.clear(); clearAll(); PTS.forEach(p => addNode(p, DIM)); status.textContent = ''; });
scene.start(engine);
