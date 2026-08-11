// AlgorithmLibrary/NearestPair3D.js — 最近点对（分治）：左右各找最近，合并时只查中线 δ 带 —— 暴力 O(n²) 被压到 O(n log n)（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('NearestPair3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行演示」开始：最近点对（分治）', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const PTS = [[0, 2], [1, 5], [2, 3], [3, 4], [5, 1], [6, 6], [7, 3], [8, 5]];
const SC = 55;
const pos = p => [(p[0] - 4) * SC, -(p[1] - 3.5) * SC];
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

const extras = [];
function addTemp(o) { extras.push(o); return o; }
function clearExtras() { extras.forEach(o => { try { o.remove(); } catch (e) {} }); extras.length = 0; }
const mkNode = (p, color, label) => addTemp(new VNode(scene, { x: pos(p)[0], y: pos(p)[1], z: 0, radius: 11, label, color, emissive: color }));
const mkLine = (a, b, color, opacity = 0.5, radius = 2) => addTemp(tubeBetween(scene, pos(a), pos(b), { color, opacity, radius }));

new VText(scene, { text: '最近点对（分治）：8 个点找距离最小的点对。竖线 = 分界 x=4；左右各自找最近，合并只查中线附近的 δ 带', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '紫 = 左半，琥珀 = 右半，金 = 各自的最优对；青色 = δ 带（|x−4| < δ 的点才有资格跨半配对）', x: 0, y: -245, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 272, z: 0, color: PALETTE.textGlow, scale: 0.5 });
const outT = new VText(scene, { text: '', x: 0, y: -265, z: 0, color: PALETTE.textGlow, scale: 0.5 });

function resetAll() {
  clearExtras();
  stageT.setText(''); eqT.setText(''); outT.setText('');
}

function* nearestPairGen() {
  resetAll();
  yield S(() => hint.setText('暴力要 C(8,2)=28 次距离计算。分治：一分为二，各自递归，最后合并 —— 数学的美在于「合并很便宜」'));
  yield S(() => {
    PTS.forEach((p, i) => mkNode(p, DIM, `(${p[0]},${p[1]})`));
    addTemp(tubeBetween(scene, [0, 150, 0], [0, -150, 0], { color: CYAN, opacity: 0.35, radius: 2 }));
    addTemp(new VText(scene, { text: '分界线 x = 4', x: 20, y: 150, z: 0, color: CYAN, scale: 0.42 }));
    stageT.setText('全部 8 个点就位，中线把平面劈成左右两半 —— 每个点都是带坐标的小球');
  });
  yield W(600);
  yield S(() => { left.forEach(p => mkNode(p, VIOLET, `(${p[0]},${p[1]})`)); stageT.setText('左半 4 点（紫）：内部暴力找最近 —— 4 个点只需 6 对'); });
  yield W(400);
  for (const [i, p] of pairsL.entries()) {
    yield S(() => { mkLine(p.a, p.b, CYAN, 0.4, 1.6); eqT.setText(`左半 第 ${i + 1} 对：(${p.a.join(',')})−(${p.b.join(',')}) = ${f2(p.d)}`); });
    yield W(250);
    yield S(() => clearExtras());
    yield W(40);
  }
  yield S(() => {
    mkLine(bestL.a, bestL.b, GOLD, 0.7, 2.6);
    eqT.setText(`左半最优：(${bestL.a.join(',')})−(${bestL.b.join(',')}) = ${f2(bestL.d)}`);
    stageT.setText(`左半最近 = ${f2(bestL.d)}（金色连线）—— 紫半 6 对全查完`);
  });
  yield W(500);
  yield S(() => {
    clearExtras();
    right.forEach(p => mkNode(p, AMBER, `(${p[0]},${p[1]})`));
    stageT.setText('右半 4 点（琥珀）：同样的流程再来一遍');
  });
  yield W(400);
  for (const [i, p] of pairsR.entries()) {
    yield S(() => { mkLine(p.a, p.b, CYAN, 0.4, 1.6); eqT.setText(`右半 第 ${i + 1} 对：(${p.a.join(',')})−(${p.b.join(',')}) = ${f2(p.d)}`); });
    yield W(250);
    yield S(() => clearExtras());
    yield W(40);
  }
  yield S(() => {
    mkLine(bestR.a, bestR.b, GOLD, 0.7, 2.6);
    eqT.setText(`右半最优：(${bestR.a.join(',')})−(${bestR.b.join(',')}) = ${f2(bestR.d)}`);
    stageT.setText(`右半最近 = ${f2(bestR.d)}。δ = min(左右) = ${f2(DELTA)} —— 真正的答案要么在半内，要么跨中线`);
  });
  yield W(500);
  yield S(() => {
    clearExtras();
    const d = DELTA * SC;
    addTemp(tubeBetween(scene, [-d, 150, 0], [-d, -150, 0], { color: CYAN, opacity: 0.4, radius: 2 }));
    addTemp(tubeBetween(scene, [d, 150, 0], [d, -150, 0], { color: CYAN, opacity: 0.4, radius: 2 }));
    PTS.forEach((p, i) => mkNode(p, DIM, `(${p[0]},${p[1]})`));
    strip.forEach(p => mkNode(p, CYAN, `(${p[0]},${p[1]})`));
    stageT.setText(`合并：跨半的点对只可能出现在 δ 带内 —— 只有 (3,4) 和 (5,1) 两个点（青色）在带里`);
    hint.setText('为什么只看 δ 带？若跨线点距 < δ，则两点的 x 差必须 < δ —— 再往外的点距离必然 ≥ δ，不用查');
  });
  yield W(600);
  yield S(() => {
    mkLine(strip[0], strip[1], ROSE, 0.65, 2.2);
    eqT.setText(`带内配对：(${strip[0].join(',')})−(${strip[1].join(',')}) = ${f2(crossD)} > δ = ${f2(DELTA)}`);
    stageT.setText(`带内距离 ${f2(crossD)} 大于 δ —— 放弃！跨半候选一个都不比 δ 小`);
  });
  yield W(600);
  yield S(() => {
    clearExtras();
    PTS.forEach((p, i) => mkNode(p, DIM, `(${p[0]},${p[1]})`));
    mkLine(bestL.a, bestL.b, GOLD, 0.8, 3);
    outT.setText(`答案：(${bestL.a.join(',')})−(${bestL.b.join(',')}) = √2 ≈ ${f2(bestL.d)} ✓ —— 递归、合并各一层就锁定了全局最近`);
    status.textContent = `最近点对：(2,3)−(3,4)，距离 √2 ≈ 1.414（分治 3 轮 vs 暴力 28 次距离）`;
    hint.setText('数学保证：δ 带里每侧最多 6 个候选点（抽屉原理）—— 所以合并是 O(n) 而非 O(n²)');
  });
  yield W(600);
  yield S(() => {
    outT.setText('复杂度 T(n) = 2T(n/2) + O(n) → O(n log n)。应用：碰撞检测、聚类、分子结构比对、GPS 最近站点');
    hint.setText('变体：KD 树查最近邻（高维）、delaunay 三角网（带内点 6 个 → 三角剖分 6 邻居上限）');
  });
  yield W(700);
}

panel.addButton('运行演示', () => engine.start(nearestPairGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫/琥珀 = 左右半，金 = 最优对，青 = δ 带与带内点，玫瑰 = 被否的候选）');

scene.start(engine);
